import express from "express";
import { optionalAuth } from "../middleware/auth.js";
import { staffOnlineCount } from "../realtime/socketServer.js";
import { findOpenSessionForCustomer } from "../realtime/chatSessions.js";

const supportChatRouter = express.Router();

supportChatRouter.get("/availability", (_req, res) => {
  res.json({ agentsOnline: staffOnlineCount() });
});

/**
 * Returns the caller's open live-chat thread (waiting/active), if any.
 * Used by the FAQ chatbot to auto-resume without redoing topics.
 */
supportChatRouter.get("/active-session", optionalAuth, async (req, res) => {
  try {
    const userId = req.user?._id ? String(req.user._id) : "";
    if (!userId) {
      res.json({ session: null });
      return;
    }
    const session = await findOpenSessionForCustomer(userId);
    res.json({ session });
  } catch (err) {
    console.error("active-session failed:", err);
    res.status(500).json({ session: null, error: "server_error" });
  }
});

export default supportChatRouter;
