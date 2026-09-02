import { env } from "./config/env.js";
import { connectDB } from "./db/connect.js";
import app from "./app.js";
import { ensureDesignsHaveMinCut } from "./utils/designMinCutMigration.js";

connectDB()
  .then(async () => {
    await ensureDesignsHaveMinCut();
    app.listen(env.port, () => {
      console.log(`MOTD API running at http://localhost:${env.port}`);
    });
  })
  .catch(() => {
    process.exit(1);
  });
