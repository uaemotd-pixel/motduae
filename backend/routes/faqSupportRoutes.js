import express from "express";
import expressAsyncHandler from "express-async-handler";
import User from "../models/User.js";
import FaqSupportRequest from "../models/FaqSupportRequest.js";
import { optionalAuth } from "../middleware/auth.js";
import { faqSupportLimiter } from "../middleware/rateLimiter.js";
import { generateFaqSupportReference } from "../services/faqSupport/referenceNumber.js";
import { normalizeEmail } from "../services/emailVerification/emailOccupancy.js";
import { isGuestUser } from "../services/emailVerification/isGuestUser.js";

const faqSupportRouter = express.Router();

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      userId,
      locale,
      source: "faq_chatbot",
      status: "new",
    });

    res.status(201).json({
      success: true,
      referenceNumber: doc.referenceNumber,
    });
  }),
);

export default faqSupportRouter;
