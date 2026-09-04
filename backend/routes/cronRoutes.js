import express from "express";
import expressAsyncHandler from "express-async-handler";
import { requireCronSecret } from "../middleware/cronAuth.js";
import { CRON_JOBS, listCronJobs, runCronJob } from "../jobs/purgeOldData.js";

const cronRoutes = express.Router();

function isDryRun(req) {
  const query = req.query?.dryRun;
  if (query === "1" || String(query).toLowerCase() === "true") return true;
  const body = req.body?.dryRun;
  return body === true || body === 1 || body === "1" || body === "true";
}

function sendCronJson(res, payload) {
  res.set("Cache-Control", "private, no-store");
  res.json(payload);
}

const listHandler = expressAsyncHandler(async (_req, res) => {
  sendCronJson(res, {
    success: true,
    jobs: listCronJobs(),
  });
});

cronRoutes.get("/", requireCronSecret, listHandler);
cronRoutes.post("/", requireCronSecret, listHandler);

function handleCronJob(jobId) {
  return expressAsyncHandler(async (req, res) => {
    const dryRun = isDryRun(req);
    const summary = await runCronJob(jobId, { dryRun });
    if (!summary) {
      res.status(404).json({ success: false, message: "Unknown cron job" });
      return;
    }
    console.log(`[${jobId}]`, JSON.stringify(summary));
    sendCronJson(res, {
      success: true,
      ...summary,
    });
  });
}

for (const jobId of Object.keys(CRON_JOBS)) {
  const handler = handleCronJob(jobId);
  cronRoutes.get(`/${jobId}`, requireCronSecret, handler);
  cronRoutes.post(`/${jobId}`, requireCronSecret, handler);
}

export default cronRoutes;
