import express from "express";
import expressAsyncHandler from "express-async-handler";
import User from "../models/User.js";
import FaqSupportRequest from "../models/FaqSupportRequest.js";
import { optionalAuth } from "../middleware/auth.js";
import { faqSupportLimiter } from "../middleware/rateLimiter.js";
import { generateFaqSupportReference } from "../services/faqSupport/referenceNumber.js";
import { normalizeEmail } from "../services/emailVerification/emailOccupancy.js";
import { isGuestUser } from "../services/emailVerification/isGuestUser.js";
import { sendFaqSupportReceivedEmail } from "../services/emailService.js";
import { createNotification } from "../services/notificationService.js";
import { getPublicOrderForDamageClaim } from "../services/publicOrderTrackingService.js";
import { normalizePublicOrderId } from "../services/publicOrderId.js";

const faqSupportRouter = express.Router();

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONCERN_MIN = 10;
const CONCERN_MAX = 2000;

const DAMAGE_KINDS = new Set([
  "torn",
  "stained",
  "missing_parts",
  "wrong_item",
  "packaging_damaged",
  "other",
]);

const POST_DELIVERY_STATUSES = new Set([
  "delivered",
  "return_requested",
  "return_approved",
  "return_rejected",
  "refund_processed",
]);

function concernSnippet(concern) {
  const text = String(concern || "").replace(/\s+/g, " ").trim();
  if (text.length <= 120) return text;
  return `${text.slice(0, 119).trimEnd()}…`;
}

function isPostDeliveryStatus(status) {
  return POST_DELIVERY_STATUSES.has(String(status || ""));
}

async function createSupportRequest(payload) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const referenceNumber = generateFaqSupportReference();
    try {
      const doc = await FaqSupportRequest.create({
        ...payload,
        referenceNumber,
      });
      return doc;
    } catch (err) {
      if (err?.code === 11000 && String(err?.message || "").includes("referenceNumber")) {
        continue;
      }
      throw err;
    }
  }
  throw new Error("Failed to mint FAQ support reference");
}

faqSupportRouter.post(
  "/requests",
  faqSupportLimiter,
  optionalAuth,
  expressAsyncHandler(async (req, res) => {
    const localeRaw = String(req.body?.locale || "en").toLowerCase();
    const locale = localeRaw === "ar" ? "ar" : "en";
    const categoryRaw = String(req.body?.category || "general").toLowerCase();
    const category =
      categoryRaw === "damage_claim" ? "damage_claim" : "general";

    const concern = String(req.body?.concern || "").trim();
    if (concern.length < CONCERN_MIN || concern.length > CONCERN_MAX) {
      res.status(400).send({
        message:
          category === "damage_claim"
            ? "Please describe the damage (10 to 2000 characters)"
            : "Please describe your concern (10 to 2000 characters)",
      });
      return;
    }

    let name = "";
    let email = "";
    let userId = null;
    let isRegisteredMember = false;
    let isGuestShopper = false;
    let guestSessionId = "";

    if (req.user?._id) {
      const user = await User.findById(req.user._id).select("name email role isGuest");
      if (user && !isGuestUser(user)) {
        name = String(user.name || "").trim();
        email = normalizeEmail(user.email) || "";
        userId = user._id;
        isRegisteredMember = true;
      } else if (user && isGuestUser(user)) {
        isGuestShopper = true;
        userId = user._id;
        guestSessionId = String(req.user.guestSessionId || "").trim();
        // Prefer checkout-verified contact email from the guest JWT when present
        email =
          normalizeEmail(req.user.guestContactEmail) ||
          normalizeEmail(req.body?.email) ||
          "";
        name =
          String(req.body?.name || "").trim().replace(/\s+/g, " ") ||
          String(user.name || "").trim();
      }
    }

    if (!name || !email) {
      name = String(req.body?.name || "").trim().replace(/\s+/g, " ") || name;
      email = normalizeEmail(req.body?.email) || email;
    }

    if (name.length < 2) {
      res.status(400).send({ message: "Name is required (at least 2 characters)" });
      return;
    }

    if (!email || !EMAIL_RX.test(email)) {
      res.status(400).send({ message: "A valid email address is required" });
      return;
    }

    let publicOrderId = "";
    let orderType;
    let damageKind;

    if (category === "damage_claim") {
      damageKind = String(req.body?.damageKind || "").trim().toLowerCase();
      if (!DAMAGE_KINDS.has(damageKind)) {
        res.status(400).send({ message: "Please select the kind of damage" });
        return;
      }

      const claimedOrderType = String(req.body?.orderType || "")
        .trim()
        .toLowerCase();
      if (claimedOrderType !== "custom" && claimedOrderType !== "retail") {
        res.status(400).send({
          message: "Please select whether this is a custom or ready-made order",
        });
        return;
      }

      // Registered: account ownership. Guest / no account: Order ID + checkout email.
      publicOrderId = normalizePublicOrderId(
        req.body?.publicOrderId ?? req.body?.orderId,
      );
      if (!publicOrderId) {
        res.status(400).send({ message: "Order ID is required for a damage claim" });
        return;
      }

      if (!isRegisteredMember && !EMAIL_RX.test(email)) {
        res.status(400).send({
          message:
            "Guest claims need the email from your order confirmation.",
        });
        return;
      }

      const owned = await getPublicOrderForDamageClaim(publicOrderId, {
        userId,
        isGuest: isGuestShopper,
        guestSessionId,
        email,
      });

      if (!owned?.order) {
        res.status(404).json({
          success: false,
          code: isRegisteredMember ? "ORDER_NOT_ON_ACCOUNT" : "ORDER_EMAIL_MISMATCH",
          message: isRegisteredMember
            ? "That Order ID isn't one of your orders. Check the ID and try again."
            : "We couldn't match that Order ID with your details. Use the Order ID and email from your confirmation.",
        });
        return;
      }

      if (!isPostDeliveryStatus(owned.order.status)) {
        res.status(400).json({
          success: false,
          code: "ORDER_NOT_DELIVERED",
          message:
            "A damage claim can only be submitted after the order is marked delivered.",
        });
        return;
      }

      orderType = owned.orderType === "retail" ? "retail" : "custom";
      if (claimedOrderType !== orderType) {
        res.status(400).json({
          success: false,
          code: "ORDER_TYPE_MISMATCH",
          message:
            orderType === "custom"
              ? "This Order ID is a custom order. Please select Custom Mukhawar."
              : "This Order ID is a ready-made order. Please select Ready-made.",
        });
        return;
      }

      publicOrderId =
        normalizePublicOrderId(owned.order.publicOrderId) || publicOrderId;
    }

    // Store account userId only for registered members (not the shared guest seed user)
    const requestUserId = isRegisteredMember ? userId : null;

    const doc = await createSupportRequest({
      name,
      email,
      concern,
      category,
      publicOrderId,
      ...(orderType ? { orderType } : {}),
      ...(damageKind ? { damageKind } : {}),
      userId: requestUserId,
      locale,
      source: "faq_chatbot",
      status: "new",
    });

    try {
      await sendFaqSupportReceivedEmail({
        to: email,
        name,
        referenceNumber: doc.referenceNumber,
        locale,
        userId: requestUserId,
      });
    } catch (err) {
      console.error("Failed to send FAQ support confirmation email:", err);
    }

    try {
      const snippet = concernSnippet(concern);
      const orderHint = publicOrderId ? ` · ${publicOrderId}` : "";
      await createNotification({
        type: "faq_support_received",
        title:
          category === "damage_claim" ? "New damage claim" : "New support query",
        message: `${name} · ${email} · ${doc.referenceNumber}${orderHint}${
          snippet ? ` — ${snippet}` : ""
        }`,
        audience: "admin",
        dedupeKey: `faq_support_received:${doc._id}`,
      });
    } catch (err) {
      console.error("Failed to notify admin of FAQ support request:", err);
    }

    res.status(201).json({
      success: true,
      referenceNumber: doc.referenceNumber,
      category,
    });
  }),
);

export default faqSupportRouter;
