import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');
export const READY_MADE_UPLOAD_DIR = path.join(UPLOADS_ROOT, 'ready-made');
export const TAILOR_DESIGN_UPLOAD_DIR = path.join(UPLOADS_ROOT, 'tailor-design');

export function ensureUploadDirs() {
  fs.mkdirSync(READY_MADE_UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(TAILOR_DESIGN_UPLOAD_DIR, { recursive: true });
export const TAILOR_SHOP_UPLOAD_DIR = path.join(UPLOADS_ROOT, 'tailor-shop');

export function ensureUploadDirs() {
  fs.mkdirSync(READY_MADE_UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(TAILOR_SHOP_UPLOAD_DIR, { recursive: true });
}

export function toPublicUploadPath(folder, filename) {
  return `/uploads/${folder}/${filename}`;
}

/** Remove a stored tailor-design upload from disk. */
export function deleteTailorDesignUpload(publicPath) {
  if (!publicPath || typeof publicPath !== 'string') return;

  const normalized = publicPath.trim();
  const prefix = '/uploads/tailor-design/';
/** Remove a previously stored tailor-shop upload from disk (ignores seed /images paths). */
export function deleteTailorShopUpload(publicPath) {
  if (!publicPath || typeof publicPath !== 'string') return;

  const normalized = publicPath.trim();
  const prefix = '/uploads/tailor-shop/';
  if (!normalized.startsWith(prefix)) return;

  const filename = path.basename(normalized);
  if (!filename || filename.includes('..')) return;

  const fullPath = path.join(TAILOR_DESIGN_UPLOAD_DIR, filename);
  const resolved = path.resolve(fullPath);
  const uploadsRoot = path.resolve(TAILOR_DESIGN_UPLOAD_DIR);
  const fullPath = path.join(TAILOR_SHOP_UPLOAD_DIR, filename);
  const resolved = path.resolve(fullPath);
  const uploadsRoot = path.resolve(TAILOR_SHOP_UPLOAD_DIR);

  if (!resolved.startsWith(uploadsRoot)) return;

  try {
    if (fs.existsSync(resolved)) {
      fs.unlinkSync(resolved);
    }
  } catch (err) {
    console.warn(`Failed to delete tailor design upload: ${normalized}`, err);
    console.warn(`Failed to delete tailor shop upload: ${normalized}`, err);
  }
}
