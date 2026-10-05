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

const faqSupportRouter = express.Router();

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONCERN_MIN = 10;
const CONCERN_MAX = 2000;

function concernSnippet(concern) {
  const text = String(concern || "").replace(/\s+/g, " ").trim();
  if (text.length <= 120) return text;
  return `${text.slice(0, 119).trimEnd()}…`;
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

    const concern = String(req.body?.concern || "").trim();
    if (concern.length < CONCERN_MIN || concern.length > CONCERN_MAX) {
      res.status(400).send({
        message: "Please describe your concern (10 to 2000 characters)",
      });
      return;
    }

    let name = "";
    let email = "";
    let userId = null;

    if (req.user?._id) {
      const user = await User.findById(req.user._id).select("name email role isGuest");
      if (user && !isGuestUser(user)) {
        name = String(user.name || "").trim();
        email = normalizeEmail(user.email) || "";
        userId = user._id;
      }
    }

    if (!name || !email) {
      name = String(req.body?.name || "").trim().replace(/\s+/g, " ");
      email = normalizeEmail(req.body?.email) || "";
    }

    if (name.length < 2) {
      res.status(400).send({ message: "Name is required (at least 2 characters)" });
      return;
    }

    if (!email || !EMAIL_RX.test(email)) {
      res.status(400).send({ message: "A valid email address is required" });
      return;
    }

    const doc = await createSupportRequest({
      name,
      email,
      concern,
      userId,
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
        userId,
      });
    } catch (err) {
      console.error("Failed to send FAQ support confirmation email:", err);
    }

    try {
      const snippet = concernSnippet(concern);
      await createNotification({
        type: "faq_support_received",
        title: "New support query",
        message: `${name} · ${email} · ${doc.referenceNumber}${snippet ? ` — ${snippet}` : ""}`,
        audience: "admin",
        dedupeKey: `faq_support_received:${doc._id}`,
      });
    } catch (err) {
      console.error("Failed to notify admin of FAQ support request:", err);
    }

    res.status(201).json({
      success: true,
      referenceNumber: doc.referenceNumber,
    });
  }),
);

export default faqSupportRouter;
