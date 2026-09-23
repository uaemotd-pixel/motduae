import express from "express";
import { isAuth } from "../middleware/auth.js";
import {
  WishlistError,
  addLine,
  clearWishlist,
  getWishlist,
  mergeLines,
  removeLine,
  setLineQuantity,
} from "../services/wishlistService.js";

const router = express.Router();

router.use(isAuth);

function rejectGuest(req, res) {
  if (req.user?.isGuest) {
    res.status(403).json({ message: "Guest wishlists stay on this device" });
    return true;
  }
  return false;
}

function sendWishlistError(res, err) {
  if (err instanceof WishlistError) {
    res.status(err.status).json({ message: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ message: "Internal Server Error" });
}

router.get("/", async (req, res) => {
  if (rejectGuest(req, res)) return;
  try {
    res.json(await getWishlist(req.user._id));
  } catch (err) {
    sendWishlistError(res, err);
  }
});

router.post("/items", async (req, res) => {
  if (rejectGuest(req, res)) return;
  try {
    res.json(await addLine(req.user._id, req.body));
  } catch (err) {
    sendWishlistError(res, err);
  }
});

router.patch("/items/:lineId", async (req, res) => {
  if (rejectGuest(req, res)) return;
  try {
    const lineId = decodeURIComponent(req.params.lineId || "");
    res.json(
      await setLineQuantity(req.user._id, lineId, req.body?.quantity),
    );
  } catch (err) {
    sendWishlistError(res, err);
  }
});

router.delete("/items/:lineId", async (req, res) => {
  if (rejectGuest(req, res)) return;
  try {
    const lineId = decodeURIComponent(req.params.lineId || "");
    res.json(await removeLine(req.user._id, lineId));
  } catch (err) {
    sendWishlistError(res, err);
  }
});

router.post("/merge", async (req, res) => {
  if (rejectGuest(req, res)) return;
  try {
    res.json(await mergeLines(req.user._id, req.body?.items));
  } catch (err) {
    sendWishlistError(res, err);
  }
});

router.delete("/", async (req, res) => {
  if (rejectGuest(req, res)) return;
  try {
    res.json(await clearWishlist(req.user._id));
  } catch (err) {
    sendWishlistError(res, err);
  }
});

export default router;
