import express from "express";
import expressAsyncHandler from "express-async-handler";
import { isAuth } from "../middleware/auth.js";
import { requireEmailVerified } from "../middleware/requireEmailVerified.js";
import {
  attachUpload,
  assertPartnerCanMutateApplication,
  getApplicationForUser,
  patchDraft,
  submitApplication,
} from "../services/partnerApplication/partnerApplicationService.js";
import {
  PartnerApplicationError,
} from "../services/partnerApplication/policy.js";
import {
  storePartnerApplicationFile,
  uploadPartnerApplicationFileMiddleware,
} from "../services/partnerApplication/partnerApplicationUpload.js";

const partnerApplicationRouter = express.Router();

function sendApplicationError(res, error) {
  if (error instanceof PartnerApplicationError) {
    res.status(error.status).send({
      code: error.code,
      message: error.message,
      ...error.extra,
    });
    return true;
  }
  return false;
}

partnerApplicationRouter.get(
  "/",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    try {
      const application = await getApplicationForUser(req.user);
      res.json({ application });
    } catch (error) {
      if (sendApplicationError(res, error)) return;
      throw error;
    }
  }),
);

partnerApplicationRouter.patch(
  "/",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    try {
      const application = await patchDraft(req.user, req.body || {});
      res.json({ application });
    } catch (error) {
      if (sendApplicationError(res, error)) return;
      throw error;
    }
  }),
);

partnerApplicationRouter.post(
  "/submit",
  isAuth,
  requireEmailVerified,
  expressAsyncHandler(async (req, res) => {
    const confirmed = Boolean(req.body?.confirmed);
    if (!confirmed) {
      res.status(400).send({
        code: "APPLICATION_NOT_CONFIRMED",
        message: "Confirm that the information is accurate before submitting",
      });
      return;
    }
    try {
      const result = await submitApplication(req.user);
      res.json({
        ok: true,
        application: result.application,
        applicationSubmittedAt: result.applicationSubmittedAt,
      });
    } catch (error) {
      if (sendApplicationError(res, error)) return;
      throw error;
    }
  }),
);

partnerApplicationRouter.post(
  "/uploads",
  isAuth,
  uploadPartnerApplicationFileMiddleware,
  expressAsyncHandler(async (req, res) => {
    const variant = req.query.variant === "licence" ? "licence" : "logo";
    try {
      await assertPartnerCanMutateApplication(req.user);
      const stored = await storePartnerApplicationFile(req.file, variant);
      const application = await attachUpload(req.user, variant, stored.url);
      res.json({ url: stored.url, variant, application });
    } catch (error) {
      if (sendApplicationError(res, error)) return;
      throw error;
    }
  }),
);

export default partnerApplicationRouter;
