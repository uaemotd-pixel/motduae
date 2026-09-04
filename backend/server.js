import { env } from "./config/env.js";
import { connectDB } from "./db/connect.js";
import app from "./app.js";
import { ensureDesignsHaveMinCut } from "./utils/designMinCutMigration.js";
import { startOldDataPurgeScheduler } from "./jobs/purgeOldData.js";

connectDB()
  .then(async () => {
    await ensureDesignsHaveMinCut();
    app.listen(env.port, () => {
      console.log(`MOTD API running at http://localhost:${env.port}`);
      if (env.nodeEnv === "production" && !env.cronSecret) {
        console.error(
          "CRON_SECRET is required in production. Vercel Cron will 503 until it is set.",
        );
      }
      startOldDataPurgeScheduler();
    });
  })
  .catch(() => {
    process.exit(1);
  });
