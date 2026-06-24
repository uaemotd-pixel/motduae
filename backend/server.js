import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { env } from "./config/env.js";
import { ensureUploadDirs, UPLOADS_ROOT } from "./utils/uploads.js";
import userRouter from "./routes/userRoutes.js";
import readyMadeRoutes from "./routes/readyMadeRoutes.js";
import fabricRoutes from "./routes/fabricRoutes.js";
import tailorRoutes from "./routes/tailorRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import tailorPortalRoutes from "./routes/tailorPortalRoutes.js";
import { isAuth, isAdmin, isApprovedTailor } from "./middleware/auth.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import customerRouter from "./routes/customerRoutes.js";

const app = express();

ensureUploadDirs();

mongoose
  .connect(env.mongodbUri)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });

app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use("/uploads", express.static(UPLOADS_ROOT));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "motd-backend" });
});

app.use("/api/users", userRouter);
app.use("/api/ready-made", readyMadeRoutes); // for getting all ready made products
app.use("/api/fabrics", fabricRoutes);
app.use("/api/tailors", tailorRoutes);
app.use("/api/tailor", isAuth, isApprovedTailor, tailorPortalRoutes);
app.use("/api/orders", orderRoutes); // for orders
app.use("/api/admin", isAuth, isAdmin, adminRouter); // admin protected routes
app.use("/api/customer", isAuth, customerRouter);
app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`MOTD API running at http://localhost:${env.port}`);
});
