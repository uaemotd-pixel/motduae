export type ChatAttachKind = "image" | "file" | "video" | "audio";

export type PreparedChatAttachment = {
  /** Wire format for chat send (video/audio travel as file). */
  kind: "image" | "file";
  fileName: string;
  mimeType: string;
  fileSize: number;
  data: string;
};

const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const VIDEO_MIME = new Set(["video/mp4"]);

const AUDIO_MIME = new Set(["audio/mpeg", "audio/mp3"]);

const FILE_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const BLOCKED_EXT = new Set([
  "exe",
  "bat",
  "cmd",
  "com",
  "cpl",
  "scr",
  "msi",
  "msp",
  "dll",
  "sys",
  "ps1",
  "psm1",
  "vbs",
  "vbe",
  "js",
  "jse",
  "wsf",
  "wsh",
  "hta",
  "jar",
  "apk",
  "app",
  "dmg",
  "pkg",
  "sh",
  "bash",
  "zsh",
  "php",
  "phtml",
  "asp",
  "aspx",
  "jsp",
  "cgi",
  "pl",
  "py",
  "rb",
  "html",
  "htm",
  "shtml",
  "svg",
  "xml",
  "xhtml",
  "iso",
  "img",
  "bin",
  "reg",
  "lnk",
  "inf",
  "gadget",
  "msc",
  "cab",
]);

const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp"]);
const VIDEO_EXT = new Set(["mp4"]);
const AUDIO_EXT = new Set(["mp3"]);
const FILE_EXT = new Set(["pdf", "doc", "docx"]);

/** Photos: JPG, JPEG, PNG, WebP */
export const IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
/** Documents: PDF and Word only */
export const FILE_ACCEPT =
  ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
/** Gallery video: MP4 HD */
export const VIDEO_ACCEPT = "video/mp4,.mp4";
/** Audio: MP3 only */
export const AUDIO_ACCEPT = "audio/mpeg,audio/mp3,.mp3";

/** Photos — enough for a clear JPG/WebP without chat bloat. */
const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;
/** Documents (PDF / Word) — 1 MB hard cap. */
const MAX_FILE_BYTES = 1 * 1024 * 1024;
/** MP4 HD clips stay short. */
const MAX_VIDEO_BYTES = 5 * 1024 * 1024;
/** MP3 audio — short clips only. */
const MAX_AUDIO_BYTES = 2 * 1024 * 1024;

/** Minimum short-side pixels for gallery HD video (720p). */
const HD_MIN_SHORT_SIDE = 720;

function fileExt(name: string) {
  const parts = name.toLowerCase().split(".");
  if (parts.length < 2) return "";
  return parts[parts.length - 1].replace(/[^a-z0-9]/g, "");
}

function normalizeMime(file: File, ext: string) {
  const raw = (file.type || "").toLowerCase().split(";")[0].trim();
  if (raw) return raw;
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "mp4") return "video/mp4";
  if (ext === "mp3") return "audio/mpeg";
  if (ext === "pdf") return "application/pdf";
  if (ext === "doc") return "application/msword";
  if (ext === "docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return "";
}

export function formatFileSize(bytes: number) {
  if (!bytes || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type AttachValidationError =
  | "blocked"
  | "type"
  | "too_large"
  | "not_hd"
  | "read_failed";

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("read_failed"));
    reader.readAsDataURL(blob);
  });
}

function assertHdVideo(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const done = (ok: boolean) => {
      URL.revokeObjectURL(url);
      resolve(ok);
    };
    video.onloadedmetadata = () => {
      const shortSide = Math.min(video.videoWidth || 0, video.videoHeight || 0);
      done(shortSide >= HD_MIN_SHORT_SIDE);
    };
    video.onerror = () => done(false);
    video.src = url;
  });
}

export async function prepareChatAttachment(
  file: File,
  kind: ChatAttachKind,
): Promise<
  | { ok: true; attachment: PreparedChatAttachment }
  | { ok: false; error: AttachValidationError }
> {
  const fileName = (file.name || "file")
    .replace(/[\\/:*?"<>|]/g, "_")
    .slice(0, 120);
  const ext = fileExt(fileName);
  if (!ext || BLOCKED_EXT.has(ext)) {
    return { ok: false, error: "blocked" };
  }

  const mimeType = normalizeMime(file, ext);
  const maxBytes =
    kind === "image"
      ? MAX_IMAGE_BYTES
      : kind === "video"
        ? MAX_VIDEO_BYTES
        : kind === "audio"
          ? MAX_AUDIO_BYTES
          : MAX_FILE_BYTES;

  if (file.size > maxBytes) {
    return { ok: false, error: "too_large" };
  }

  if (kind === "image") {
    if (!IMAGE_EXT.has(ext) || !IMAGE_MIME.has(mimeType)) {
      return { ok: false, error: "type" };
    }
  } else if (kind === "video") {
    if (!VIDEO_EXT.has(ext) || !VIDEO_MIME.has(mimeType)) {
      return { ok: false, error: "type" };
    }
    const isHd = await assertHdVideo(file);
    if (!isHd) return { ok: false, error: "not_hd" };
  } else if (kind === "audio") {
    if (!AUDIO_EXT.has(ext) || !AUDIO_MIME.has(mimeType)) {
      return { ok: false, error: "type" };
    }
  } else {
    if (!FILE_EXT.has(ext) || !FILE_MIME.has(mimeType)) {
      return { ok: false, error: "type" };
    }
  }

  try {
    const data = await blobToDataUrl(file);
    if (!data.startsWith("data:")) {
      return { ok: false, error: "read_failed" };
    }
    if (kind === "image" && !data.startsWith("data:image/")) {
      return { ok: false, error: "type" };
    }
    if (kind === "video" && !data.startsWith("data:video/")) {
      return { ok: false, error: "type" };
    }
    if (kind === "audio" && !data.startsWith("data:audio/")) {
      return { ok: false, error: "type" };
    }
    const wireKind: "image" | "file" =
      kind === "image" ? "image" : "file";
    return {
      ok: true,
      attachment: {
        kind: wireKind,
        fileName,
        mimeType:
          mimeType ||
          (kind === "video"
            ? "video/mp4"
            : kind === "audio"
              ? "audio/mpeg"
              : "application/octet-stream"),
        fileSize: file.size,
        data,
      },
    };
  } catch {
    return { ok: false, error: "read_failed" };
  }
}

export type AttachErrorContext = {
  kind?: ChatAttachKind;
  /** Original or sanitized file name — used to mention the rejected extension. */
  fileName?: string;
};

function rejectedExtLabel(fileName?: string) {
  const ext = fileExt(fileName || "");
  return ext ? `.${ext}` : "";
}

export function attachmentErrorMessage(
  error: AttachValidationError,
  isAr: boolean,
  context: AttachErrorContext = {},
) {
  const kind = context.kind;
  const rejected = rejectedExtLabel(context.fileName);

  if (isAr) {
    if (error === "blocked") {
      return rejected
        ? `الملف ${rejected} محظور لأسباب أمنية. يُرجى اختيار صيغة مدعومة.`
        : "هذا النوع من الملفات محظور لأسباب أمنية. يُرجى اختيار صيغة مدعومة.";
    }
    if (error === "too_large") {
      if (kind === "image") return "هذه الصورة كبيرة جداً. الحد الأقصى 1.5 ميغابايت.";
      if (kind === "video") return "هذا الفيديو كبير جداً. الحد الأقصى 5 ميغابايت.";
      if (kind === "audio") return "ملف الصوت كبير جداً. الحد الأقصى 2 ميغابايت.";
      return "هذا المستند كبير جداً. الحد الأقصى 1 ميغابايت.";
    }
    if (error === "not_hd") {
      return "جودة هذا الفيديو أقل من HD. يُرجى رفع فيديو MP4 بدقة 720 بكسل أو أعلى.";
    }
    if (error === "type") {
      if (kind === "image") {
        return rejected
          ? `صيغة ${rejected} غير مدعومة للصور. المسموح: JPG، JPEG، PNG، أو WebP.`
          : "صيغة الصورة غير مدعومة. المسموح: JPG، JPEG، PNG، أو WebP.";
      }
      if (kind === "video") {
        return rejected
          ? `صيغة ${rejected} غير مدعومة للفيديو. يُرجى رفع ملف MP4 فقط.`
          : "صيغة الفيديو غير مدعومة. يُرجى رفع ملف MP4 فقط.";
      }
      if (kind === "audio") {
        return rejected
          ? `صيغة ${rejected} غير مدعومة للصوت. يُرجى رفع ملف MP3 فقط.`
          : "صيغة الصوت غير مدعومة. يُرجى رفع ملف MP3 فقط.";
      }
      return rejected
        ? `صيغة ${rejected} غير مدعومة للمستندات. المسموح: PDF أو Word ‏(.pdf، .doc، .docx).`
        : "صيغة المستند غير مدعومة. المسموح: PDF أو Word ‏(.pdf، .doc، .docx).";
    }
    return "تعذر قراءة الملف. يُرجى المحاولة بملف آخر.";
  }

  if (error === "blocked") {
    return rejected
      ? `${rejected} files are blocked for security reasons. Please choose a supported format.`
      : "This file type is blocked for security reasons. Please choose a supported format.";
  }
  if (error === "too_large") {
    if (kind === "image") return "This photo is too large. Maximum size is 1.5 MB.";
    if (kind === "video") return "This video is too large. Maximum size is 5 MB.";
    if (kind === "audio") return "This audio file is too large. Maximum size is 2 MB.";
    return "This document is too large. Maximum size is 1 MB.";
  }
  if (error === "not_hd") {
    return "This video is below HD quality. Please upload an MP4 that is 720p or higher.";
  }
  if (error === "type") {
    if (kind === "image") {
      return rejected
        ? `${rejected} is not supported for photos. Please use JPG, JPEG, PNG, or WebP.`
        : "This photo format is not supported. Please use JPG, JPEG, PNG, or WebP.";
    }
    if (kind === "video") {
      return rejected
        ? `${rejected} is not supported for video. Please upload an MP4 file only.`
        : "This video format is not supported. Please upload an MP4 file only.";
    }
    if (kind === "audio") {
      return rejected
        ? `${rejected} is not supported for audio. Please upload an MP3 file only.`
        : "This audio format is not supported. Please upload an MP3 file only.";
    }
    return rejected
      ? `${rejected} is not supported for documents. Please upload a PDF or Word file (.pdf, .doc, .docx).`
      : "This document format is not supported. Please upload a PDF or Word file (.pdf, .doc, .docx).";
  }
  return "Could not read that file. Please try a different one.";
}
