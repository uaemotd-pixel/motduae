"use client";

import { FileText, Film, Music, RefreshCw, X } from "lucide-react";
import {
  documentKindLabel,
  formatFileSize,
  isAudioAttachment,
  isPdfAttachment,
  isVideoAttachment,
  isWordAttachment,
  type AttachUploadStatus,
  type PreparedChatAttachment,
} from "@/lib/chat/attachments";

type ChatComposerAttachPreviewProps = {
  attachment: PreparedChatAttachment;
  onClear: () => void;
  isAr?: boolean;
  status?: AttachUploadStatus;
  progress?: number | null;
  onRetry?: () => void;
};

function ThumbIcon({
  mimeType,
  fileName,
}: {
  mimeType?: string;
  fileName?: string;
}) {
  if (isVideoAttachment(mimeType, fileName)) {
    return <Film className="h-5 w-5" strokeWidth={1.75} />;
  }
  if (isAudioAttachment(mimeType, fileName)) {
    return <Music className="h-5 w-5" strokeWidth={1.75} />;
  }
  return <FileText className="h-5 w-5" strokeWidth={1.75} />;
}

export default function ChatComposerAttachPreview({
  attachment,
  onClear,
  isAr = false,
  status = "ready",
  progress = null,
  onRetry,
}: ChatComposerAttachPreviewProps) {
  const pdf = isPdfAttachment(attachment.mimeType, attachment.fileName);
  const word = isWordAttachment(attachment.mimeType, attachment.fileName);
  const busy = status === "preparing" || status === "sending";
  const failed = status === "failed";
  const showBar =
    status === "preparing" ||
    status === "sending" ||
    (typeof progress === "number" && progress >= 0 && progress < 100);

  const pct =
    typeof progress === "number"
      ? Math.max(0, Math.min(100, Math.round(progress)))
      : status === "sending"
        ? 100
        : 0;

  const statusLabel = (() => {
    if (status === "preparing") {
      return isAr
        ? pct
          ? `جاري التحضير… ${pct}%`
          : "جاري التحضير…"
        : pct
          ? `Preparing… ${pct}%`
          : "Preparing…";
    }
    if (status === "sending") {
      return isAr ? "جاري الإرسال…" : "Sending…";
    }
    if (status === "failed") {
      return isAr ? "فشل الإرسال" : "Send failed";
    }
    return (
      documentKindLabel(attachment.mimeType, attachment.fileName, isAr) +
      (attachment.fileSize
        ? ` · ${formatFileSize(attachment.fileSize)}`
        : "")
    );
  })();

  const iconWrap = pdf
    ? "bg-[#FFEBEE] text-[#C62828]"
    : word
      ? "bg-[#E3F2FD] text-[#1565C0]"
      : "bg-[#E3F2FD] text-[#1565C0]";

  return (
    <div
      className={`mb-2 overflow-hidden rounded-2xl border bg-white shadow-sm ${
        failed ? "border-[#FFCDD2]" : "border-[#E8E8E4]"
      }`}
    >
      <div className="flex items-center gap-2 px-2 py-1.5">
        {attachment.kind === "image" && attachment.data ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={attachment.data}
            alt={attachment.fileName}
            className="h-12 w-12 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconWrap}`}
          >
            <ThumbIcon
              mimeType={attachment.mimeType}
              fileName={attachment.fileName}
            />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate [font-family:var(--font-body)] text-[13px] text-[#111B21]">
            {attachment.fileName}
          </p>
          <p
            className={`[font-family:var(--font-ui)] text-[10px] ${
              failed ? "text-[#C62828]" : "text-[#667781]"
            }`}
          >
            {statusLabel}
          </p>
        </div>
        {failed && onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            aria-label={isAr ? "إعادة المحاولة" : "Retry"}
            className="flex h-8 items-center gap-1 rounded-full bg-[#FFF5F5] px-2.5 text-[11px] font-medium text-[#C62828] transition hover:bg-[#FFEBEE] hover:cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />
            {isAr ? "إعادة" : "Retry"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onClear}
          disabled={busy}
          aria-label={isAr ? "إزالة المرفق" : "Remove attachment"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#667781] transition hover:bg-black/5 hover:text-black hover:cursor-pointer disabled:opacity-40"
        >
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
      {showBar ? (
        <div className="h-1 w-full bg-[#EFEFEA]">
          <div
            className={`h-full transition-[width] duration-200 ease-out ${
              status === "sending"
                ? "animate-pulse bg-black/70"
                : "bg-black"
            }`}
            style={{
              width:
                status === "sending" && !(typeof progress === "number")
                  ? "100%"
                  : `${pct || (status === "preparing" ? 8 : 0)}%`,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
