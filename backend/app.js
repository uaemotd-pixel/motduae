import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { ensureUploadDirs, UPLOADS_ROOT } from "./utils/uploads.js";
import { tryServeUploadFromBlob } from "./utils/imageStorage.js";
import userRouter from "./routes/userRoutes.js";
import readyMadeRoutes from "./routes/readyMadeRoutes.js";
import fabricRoutes from "./routes/fabricRoutes.js";
import tailorRoutes from "./routes/tailorRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import tailorPortalRoutes from "./routes/tailorPortalRoutes.js";
import fabricPortalRoutes from "./routes/fabricPortalRoutes.js";
import {
  isAuth,
  isAdmin,
  isApprovedTailor,
  isApprovedFabricStore,
} from "./middleware/auth.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import customerRouter from "./routes/customerRoutes.js";
import subAdminRouter from "./routes/subAdminRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import notificationRouter from "./routes/notificationRoutes.js";
import customerNotificationRouter from "./routes/customerNotificationRoutes.js";

const app = express();

ensureUploadDirs();

app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  }),
);
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
app.use("/api/tailors", tailorRoutes);
app.use("/api/tailor", isAuth, isApprovedTailor, tailorPortalRoutes);
app.use("/api/fabric", isAuth, isApprovedFabricStore, fabricPortalRoutes);
app.use("/api/orders", orderRoutes);
// Expose order routes under admin namespace as well so admin UI can call
// /api/admin/orders/custom/:id/return-accept and /return-reject
app.use("/api/admin/orders", isAuth, isAdmin, orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", isAuth, isAdmin, adminRouter);
app.use("/api/admin", isAuth, isAdmin, notificationRouter);
app.use("/api/customer", customerRouter);
app.use("/api/customer", customerNotificationRouter);

app.use("/api/subadmins", isAuth, subAdminRouter);
app.use(notFound);
app.use(errorHandler);

export default app;
