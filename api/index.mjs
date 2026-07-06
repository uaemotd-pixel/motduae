import app from "../backend/app.js";
import { connectDB } from "../backend/db/connect.js";

export default async function handler(req, res) {
  const url = req.url || "";

  try {
    if (url.startsWith("/api/health")) {
      try {
        await connectDB();
        return res.status(200).json({
          status: "ok",
          service: "motd-backend",
          db: "connected",
        });
      } catch (dbErr) {
        return res.status(503).json({
          status: "error",
          service: "motd-backend",
          message:
            dbErr instanceof Error ? dbErr.message : "Database unavailable",
        });
      }
    }

    await connectDB();
    return app(req, res);
  } catch (err) {
    console.error("API handler error:", err);

    if (res.headersSent) {
      return;
    }

    return res.status(503).json({
      success: false,
      message:
        err instanceof Error ? err.message : "Service temporarily unavailable",
    });
  }
}
