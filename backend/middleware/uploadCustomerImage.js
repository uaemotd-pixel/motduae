// middleware/uploadCustomerImage.js
import multer from "multer";
import sharp from "sharp";
import path from "path";
import { randomBytes } from "crypto";
import { CUSTOMER_UPLOAD_DIR, toPublicUploadPath } from "../utils/uploads.js";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype?.startsWith("image/")) {
      cb(null, true);
      return;
    }
    cb(new Error("Only image files are allowed"));
  },
});

export function uploadCustomerImageMiddleware(req, res, next) {
  upload.single("image")(req, res, (err) => {
    if (!err) {
      next();
      return;
    }

    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ message: "Image must be 5MB or smaller" });
      return;
    }

    res.status(400).json({ message: err.message || "Invalid image upload" });
  });
}

export async function processCustomerImage(file) {
  const filename = `customer-${Date.now()}-${randomBytes(4).toString("hex")}.webp`;
  const outputPath = path.join(CUSTOMER_UPLOAD_DIR, filename);

  await sharp(file.buffer)
    .rotate()
    .resize({
      width: 400, // profile pics need smaller size
      height: 400,
      fit: "cover", // crop to square
      withoutEnlargement: true,
    })
    .webp({ quality: 85 })
    .toFile(outputPath);

  return toPublicUploadPath("customer", filename);
}
