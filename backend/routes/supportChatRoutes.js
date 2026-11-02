import express from "express";
import { isAuth, optionalAuth } from "../middleware/auth.js";
import { staffOnlineCount } from "../realtime/socketServer.js";
import { findOpenSessionForCustomer } from "../realtime/chatSessions.js";
import {
  customerCanChatWithFabricStore,
  listDealtWithFabricStores,
} from "../services/customerFabricStoreDeals.js";

const supportChatRouter = express.Router();

supportChatRouter.get("/availability", (_req, res) => {
  res.json({ agentsOnline: staffOnlineCount() });
});

/**
 * Returns the caller's open live-chat thread (waiting/active/ended), if any.
 * Query: kind=support|fabric, fabricStoreOwnerId= (required for fabric)
 */
supportChatRouter.get("/active-session", optionalAuth, async (req, res) => {
  try {
    const userId = req.user?._id ? String(req.user._id) : "";
    if (!userId) {
      res.json({ session: null });
      return;
    }
    const kind =
      String(req.query.kind || "support").trim() === "fabric"
        ? "fabric"
        : "support";
    const fabricStoreOwnerId = String(
      req.query.fabricStoreOwnerId || "",
    ).trim();
    const session = await findOpenSessionForCustomer(userId, {
      sessionKind: kind,
      fabricStoreOwnerId: kind === "fabric" ? fabricStoreOwnerId : null,
    });
    res.json({ session });
  } catch (err) {
    console.error("active-session failed:", err);
    res.status(500).json({ session: null, error: "server_error" });
  }
});

/**
 * Fabric stores this customer has ordered from (eligible for store chat).
 */
supportChatRouter.get("/fabric-stores", isAuth, async (req, res) => {
  try {
    if (req.user?.isGuest) {
      res.status(403).json({ stores: [], error: "login_required" });
      return;
    }
    const userId = req.user?._id ? String(req.user._id) : "";
    if (!userId) {
      res.status(401).json({ stores: [], error: "unauthorized" });
      return;
    }
    const stores = await listDealtWithFabricStores(userId);
    res.json({ stores });
  } catch (err) {
    console.error("fabric-stores list failed:", err);
    res.status(500).json({ stores: [], error: "server_error" });
  }
});

supportChatRouter.get(
  "/fabric-stores/:ownerId/can-chat",
  isAuth,
  async (req, res) => {
    try {
      const userId = req.user?._id ? String(req.user._id) : "";
      const ownerId = String(req.params.ownerId || "").trim();
      if (!userId || !ownerId) {
        res.json({ allowed: false });
        return;
      }
      if (req.user?.isGuest) {
        res.json({ allowed: false });
        return;
      }
      const allowed = await customerCanChatWithFabricStore(userId, ownerId);
      res.json({ allowed });
    } catch (err) {
      console.error("fabric can-chat failed:", err);
      res.status(500).json({ allowed: false, error: "server_error" });
    }
  },
);

export default supportChatRouter;
