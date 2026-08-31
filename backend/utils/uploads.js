import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const UPLOAD_FOLDERS = [
  "ready-made",
  "tailor-design",
  "tailor-shop",
  "fabrics",
  "customer",
  "addons",
  "partner-application",
];

/** Local dev uses backend/uploads; Vercel without Blob uses /tmp (ephemeral). */
const UPLOADS_BASE = process.env.VERCEL
  ? path.join(os.tmpdir(), "motd-uploads")
  : path.join(__dirname, "..", "uploads");

export const UPLOADS_ROOT = UPLOADS_BASE;
export const READY_MADE_UPLOAD_DIR = path.join(UPLOADS_ROOT, "ready-made");
export const TAILOR_DESIGN_UPLOAD_DIR = path.join(
  UPLOADS_ROOT,
  "tailor-design",
);
export const TAILOR_SHOP_UPLOAD_DIR = path.join(UPLOADS_ROOT, "tailor-shop");
export const FABRIC_UPLOAD_DIR = path.join(UPLOADS_ROOT, "fabrics");
export const CUSTOMER_UPLOAD_DIR = path.join(UPLOADS_ROOT, "customer");
export const ADDONS_UPLOAD_DIR = path.join(UPLOADS_ROOT, "addons");
export const PARTNER_APPLICATION_UPLOAD_DIR = path.join(
  UPLOADS_ROOT,
  "partner-application",
);

export function isBlobStorageEnabled() {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return true;
  }

  // Vercel-linked Blob stores use OIDC + BLOB_STORE_ID (no read/write token env).
  return Boolean(process.env.VERCEL && process.env.BLOB_STORE_ID);
}

export function assertUploadStorageReady() {
  if (process.env.VERCEL && !isBlobStorageEnabled()) {
    throw new Error(
      "Upload storage is not configured. Link a Vercel Blob store to this project.",
    );
  }
}

export function getLocalUploadPath(folder, filename) {
  if (!UPLOAD_FOLDERS.includes(folder)) {
    throw new Error(`Invalid upload folder: ${folder}`);
  }

  const safeName = path.basename(filename);
  if (!safeName || safeName.includes("..")) {
    throw new Error("Invalid upload filename");
  }

  return path.join(UPLOADS_ROOT, folder, safeName);
}

export function ensureUploadDirs() {
  if (isBlobStorageEnabled()) {
    return;
  }

  fs.mkdirSync(READY_MADE_UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(TAILOR_DESIGN_UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(TAILOR_SHOP_UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(FABRIC_UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(CUSTOMER_UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(ADDONS_UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(PARTNER_APPLICATION_UPLOAD_DIR, { recursive: true });
}

export function toPublicUploadPath(folder, filename) {
  return `/uploads/${folder}/${filename}`;
}

export async function deleteTailorDesignUpload(publicPath) {
  return deleteStoredUploadByPrefix(publicPath, "/uploads/tailor-design/");
}

export async function deleteTailorShopUpload(publicPath) {
  return deleteStoredUploadByPrefix(publicPath, "/uploads/tailor-shop/");
}

async function deleteStoredUploadByPrefix(publicPath, prefix) {
  if (!publicPath || typeof publicPath !== "string") return;
  if (!publicPath.startsWith(prefix)) return;

  const { deleteStoredUpload } = await import("./imageStorage.js");
  await deleteStoredUpload(publicPath);
}
