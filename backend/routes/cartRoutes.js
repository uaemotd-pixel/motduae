import express from "express";
import { isAuth } from "../middleware/auth.js";
import {
  CartError,
  addLine,
  clearCart,
  getCart,
  mergeLines,
  removeLine,
  setLineQuantity,
} from "../services/cartService.js";

const router = express.Router();

router.use(isAuth);

function rejectGuest(req, res) {
  if (req.user?.isGuest) {
    res.status(403).json({ message: "Guest carts stay on this device" });
    return true;
  }
  return false;
}

function sendCartError(res, err) {
  if (err instanceof CartError) {
    res.status(err.status).json({ message: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ message: "Internal Server Error" });
}

router.get("/", async (req, res) => {
  if (rejectGuest(req, res)) return;
  try {
    res.json(await getCart(req.user._id));
  } catch (err) {
    sendCartError(res, err);
  }
});

router.post("/items", async (req, res) => {
  if (rejectGuest(req, res)) return;
  try {
    res.json(await addLine(req.user._id, req.body));
  } catch (err) {
    sendCartError(res, err);
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
    sendCartError(res, err);
  }
});

router.delete("/items/:lineId", async (req, res) => {
  if (rejectGuest(req, res)) return;
  try {
    const lineId = decodeURIComponent(req.params.lineId || "");
    res.json(await removeLine(req.user._id, lineId));
  } catch (err) {
    sendCartError(res, err);
  }
});

router.post("/merge", async (req, res) => {
  if (rejectGuest(req, res)) return;
  try {
    res.json(await mergeLines(req.user._id, req.body?.items));
  } catch (err) {
    sendCartError(res, err);
  }
});

router.delete("/", async (req, res) => {
  if (rejectGuest(req, res)) return;
  try {
    res.json(await clearCart(req.user._id));
  } catch (err) {
    sendCartError(res, err);
  }
});

export default router;
