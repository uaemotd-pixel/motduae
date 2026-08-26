import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { env } from "./config/env.js";
import { ensureUploadDirs, UPLOADS_ROOT } from "./utils/uploads.js";
import { tryServeUploadFromBlob } from "./utils/imageStorage.js";
import userRouter from "./routes/userRoutes.js";
import readyMadeRoutes from "./routes/readyMadeRoutes.js";
import fabricRoutes from "./routes/fabricRoutes.js";
import addOnRoutes from "./routes/addOnRoutes.js";
import tailorRoutes from "./routes/tailorRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import orderPublicTrackRoutes from "./routes/orderPublicTrackRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import tailorPortalRoutes from "./routes/tailorPortalRoutes.js";
import fabricPortalRoutes from "./routes/fabricPortalRoutes.js";
import {
  isAuth,
  isAdmin,
  isFullAdmin,
  isApprovedTailor,
  isApprovedFabricStore,
  enforceStaffPerm,
} from "./middleware/auth.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import customerRouter from "./routes/customerRoutes.js";
import subAdminRouter from "./routes/subAdminRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import checkoutRoutes from "./routes/checkoutRoutes.js";
import stripeWebhookRoutes from "./routes/stripeWebhookRoutes.js";
import shipaWebhookRoutes from "./routes/shipaWebhookRoutes.js";
import notificationRouter from "./routes/notificationRoutes.js";
import customerNotificationRouter from "./routes/customerNotificationRoutes.js";
import filterRoutes from "./routes/filterRoutes.js";

const app = express();

// Behind Vercel / reverse proxies so req.ip (rate limits, etc.) is correct
app.set("trust proxy", 1);

ensureUploadDirs();

app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  }),
);
app.use(cookieParser());

// Stripe / Shipa webhooks require the raw body for signature verification — mount BEFORE json parser.
app.use("/api/payments/webhook", stripeWebhookRoutes);
app.use("/api/webhooks/shipa", shipaWebhookRoutes);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use("/uploads", async (req, res, next) => {
  const served = await tryServeUploadFromBlob(req, res);
  if (served) return;
  next();
});
app.use("/uploads", express.static(UPLOADS_ROOT));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "motd-backend" });
});

app.use("/api/users", userRouter);
app.use("/api/ready-made", readyMadeRoutes);
app.use("/api/fabrics", fabricRoutes);
app.use("/api/addons", addOnRoutes);
app.use("/api/tailors", tailorRoutes);
app.use("/api/tailor", isAuth, isApprovedTailor, tailorPortalRoutes);
app.use("/api/fabric", isAuth, isApprovedFabricStore, fabricPortalRoutes);
app.use("/api/orders/track", orderPublicTrackRoutes);
app.use("/api/orders", orderRoutes);
// Expose order routes under admin namespace as well so admin UI can call
// /api/admin/orders/custom/:id/return-accept and /return-reject
app.use("/api/admin/orders", isAuth, isAdmin, enforceStaffPerm, orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/admin", isAuth, isAdmin, enforceStaffPerm, adminRouter);
app.use("/api/admin", isAuth, isAdmin, enforceStaffPerm, notificationRouter);
app.use("/api/customer", customerRouter);
app.use("/api/customer", customerNotificationRouter);
app.use("/api/subadmins", isAuth, isFullAdmin, subAdminRouter);
app.use("/api/filters", filterRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
