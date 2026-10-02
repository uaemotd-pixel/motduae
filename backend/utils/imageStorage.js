import fs from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';
import sharp from 'sharp';
import {
  getLocalUploadPath,
  isBlobStorageEnabled,
  assertUploadStorageReady,
  toPublicUploadPath,
} from './uploads.js';

function getBlobAuthOptions() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  return token ? { token } : {};
}

async function loadBlobSdk() {
  return import('@vercel/blob');
}

function toBlobPath(folder, filename) {
  return `${folder}/${filename}`;
}

function publicPathToBlobPath(publicPath) {
  if (!publicPath?.startsWith('/uploads/')) {
    return null;
  }

  const blobPath = publicPath.slice('/uploads/'.length);
  if (!blobPath || blobPath.includes('..')) {
    return null;
  }

  return blobPath;
}

export async function saveImageBuffer(folder, filename, buffer) {
  const publicPath = toPublicUploadPath(folder, filename);

  if (isBlobStorageEnabled()) {
    const { put } = await loadBlobSdk();
    await put(toBlobPath(folder, filename), buffer, {
      access: 'private',
      contentType: 'image/webp',
      addRandomSuffix: false,
      ...getBlobAuthOptions(),
    });
    return publicPath;
  }

  assertUploadStorageReady();

  const localPath = getLocalUploadPath(folder, filename);
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await fs.writeFile(localPath, buffer);
  return publicPath;
}

export async function processAndStoreImage(
  file,
  { folder, filenamePrefix, resize, webpQuality = 82 },
) {
  const filename = `${filenamePrefix}-${Date.now()}-${randomBytes(4).toString('hex')}.webp`;
  const buffer = await sharp(file.buffer)
    .rotate()
    .resize(resize)
    .webp({ quality: webpQuality })
    .toBuffer();

  return saveImageBuffer(folder, filename, buffer);
}

export async function saveRawUpload(
  folder,
  filename,
  buffer,
  contentType = "application/octet-stream",
) {
  const publicPath = toPublicUploadPath(folder, filename);

  if (isBlobStorageEnabled()) {
    const { put } = await loadBlobSdk();
    await put(toBlobPath(folder, filename), buffer, {
      access: "private",
      contentType,
      addRandomSuffix: false,
      ...getBlobAuthOptions(),
    });
    return publicPath;
  }

  assertUploadStorageReady();

  const localPath = getLocalUploadPath(folder, filename);
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await fs.writeFile(localPath, buffer);
  return publicPath;
}

export async function deleteStoredUpload(publicPath) {
  const blobPath = publicPathToBlobPath(publicPath);
  if (!blobPath) {
    return;
  }

  if (isBlobStorageEnabled()) {
    try {
      const { del } = await loadBlobSdk();
      await del(blobPath, getBlobAuthOptions());
    } catch (err) {
      console.warn(`Failed to delete blob upload: ${blobPath}`, err.message);
    }
    return;
  }

  const localPath = getLocalUploadPath(
    blobPath.split('/')[0],
    blobPath.split('/').slice(1).join('/'),
  );

  try {
    await fs.unlink(localPath);
  } catch (err) {
    if (err?.code !== 'ENOENT') {
      console.warn(`Failed to delete local upload: ${localPath}`, err.message);
    }
  }
}

export function isPrivateLicenceUpload(uploadPath) {
  const normalized = String(uploadPath || "")
    .replace(/^\/uploads\//, "")
    .replace(/^\/+/, "");
  return (
    normalized.startsWith("partner-application/licence-") &&
    !normalized.includes("..")
  );
}

function licenceContentType(blobPath) {
  if (blobPath.endsWith(".pdf")) return "application/pdf";
  if (blobPath.endsWith(".webp")) return "image/webp";
  if (blobPath.endsWith(".png")) return "image/png";
  if (blobPath.endsWith(".jpg") || blobPath.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

export async function streamPrivateLicence(res, publicPath) {
  if (!isPrivateLicenceUpload(publicPath)) {
    res.status(404).send({ message: "Not Found" });
    return;
  }

  const blobPath = publicPathToBlobPath(
    String(publicPath).startsWith("/uploads/")
      ? publicPath
      : `/uploads/${String(publicPath).replace(/^\/+/, "")}`,
  );
  if (!blobPath) {
    res.status(404).send({ message: "Not Found" });
    return;
  }

  const sendFileHeaders = () => {
    res.setHeader("Content-Type", licenceContentType(blobPath));
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Cache-Control", "private, no-store");
  };

  if (isBlobStorageEnabled()) {
    try {
      const { get } = await loadBlobSdk();
      const result = await get(blobPath, {
        access: "private",
        ...getBlobAuthOptions(),
      });
      if (result?.statusCode !== 200 || !result?.stream) {
        res.status(404).send({ message: "Not Found" });
        return;
      }
      sendFileHeaders();
      if (typeof result.stream.pipe === "function") {
        result.stream.pipe(res);
        return;
      }
      const reader = result.stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
    } catch (err) {
      if (err?.statusCode !== 404) {
        console.warn(`Licence serve failed for ${blobPath}:`, err.message);
      }
      if (!res.headersSent) {
        res.status(404).send({ message: "Not Found" });
      }
    }
    return;
  }

  const [folder, ...rest] = blobPath.split("/");
  let localPath;
  try {
    localPath = getLocalUploadPath(folder, rest.join("/"));
    await fs.access(localPath);
  } catch {
    res.status(404).send({ message: "Not Found" });
    return;
  }

  const { createReadStream } = await import("fs");
  sendFileHeaders();
  createReadStream(localPath).pipe(res);
}

export async function tryServeUploadFromBlob(req, res) {
  if (isPrivateLicenceUpload(req.path)) {
    return false;
  }

  if (!isBlobStorageEnabled() || req.method !== 'GET') {
    return false;
  }

  const blobPath = req.path.replace(/^\//, '');
  if (!blobPath || blobPath.includes('..')) {
    return false;
  }

  try {
    const { get } = await loadBlobSdk();
    const result = await get(blobPath, {
      access: 'private',
      ...getBlobAuthOptions(),
    });

    if (result?.statusCode !== 200 || !result?.stream) {
      return false;
    }

    res.setHeader(
      'Content-Type',
      result.blob?.contentType || 'image/webp',
    );
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    if (typeof result.stream.pipe === 'function') {
      result.stream.pipe(res);
      return true;
    }

    const reader = result.stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
    return true;
  } catch (err) {
    if (err?.statusCode !== 404) {
      console.warn(`Blob serve failed for ${blobPath}:`, err.message);
    }
    return false;
  }
}
