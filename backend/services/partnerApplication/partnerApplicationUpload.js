import multer from "multer";
import { randomBytes } from "crypto";
import { processAndStoreImage, saveRawUpload } from "../../utils/imageStorage.js";
import { PartnerApplicationError } from "./policy.js";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const FOLDER = "partner-application";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const variant = String(_req.query?.variant || "logo");
    if (variant === "licence") {
      if (
        file.mimetype?.startsWith("image/") ||
        file.mimetype === "application/pdf"
      ) {
        cb(null, true);
        return;
      }
      cb(new Error("Licence must be an image or PDF"));
      return;
    }
    if (file.mimetype?.startsWith("image/")) {
      cb(null, true);
      return;
    }
    cb(new Error("Only image files are allowed"));
  },
});

export function uploadPartnerApplicationFileMiddleware(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (!err) {
      next();
      return;
    }
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).send({
        code: "UPLOAD_TOO_LARGE",
        message: "File must be 5MB or smaller",
      });
      return;
    }
    res.status(400).send({
      code: "UPLOAD_INVALID",
      message: err.message || "Invalid upload",
    });
  });
}

export async function storePartnerApplicationFile(file, variant) {
  if (!file?.buffer) {
    throw new PartnerApplicationError(
      "UPLOAD_INVALID",
      "A file is required",
      400,
    );
  }

  if (variant === "licence" && file.mimetype === "application/pdf") {
    const filename = `licence-${Date.now()}-${randomBytes(4).toString("hex")}.pdf`;
    const url = await saveRawUpload(
      FOLDER,
      filename,
      file.buffer,
      "application/pdf",
    );
    return { url, variant };
  }

  const url = await processAndStoreImage(file, {
    folder: FOLDER,
    filenamePrefix: variant === "licence" ? "licence" : "logo",
    resize: {
      width: 1200,
      height: 1200,
      fit: "inside",
      withoutEnlargement: true,
    },
  });
  return { url, variant };
}
