"use client";

import {
  Download,
  ExternalLink,
  FileText,
  Film,
  Music,
} from "lucide-react";
import {
  documentKindLabel,
  formatFileSize,
  isAudioAttachment,
  isPdfAttachment,
  isVideoAttachment,
  isWordAttachment,
} from "@/lib/chat/attachments";

type ChatAttachmentBubbleProps = {
  kind: "image" | "file";
  data: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  onDark?: boolean;
};

function FileTypeIcon({
  mimeType,
  fileName,
  className,
}: {
  mimeType?: string;
  fileName?: string;
  className?: string;
}) {
  if (isVideoAttachment(mimeType, fileName)) {
    return <Film className={className} strokeWidth={1.75} />;
  }
  if (isAudioAttachment(mimeType, fileName)) {
    return <Music className={className} strokeWidth={1.75} />;
  }
  return <FileText className={className} strokeWidth={1.75} />;
}

/** Defense in depth: never navigate to spoofed data:text/html payloads. */
function isSafeImageDataUrl(data: string) {
  return /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(data || "");
}

function isSafeFileDataUrl(data: string) {
  const d = String(data || "");
  return (
    /^data:application\/pdf;base64,/i.test(d) ||
    /^data:application\/msword;base64,/i.test(d) ||
    /^data:application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document;base64,/i.test(
      d,
    ) ||
    /^data:video\/mp4;base64,/i.test(d) ||
    /^data:audio\/(mpeg|mp3);base64,/i.test(d)
  );
}

export default function ChatAttachmentBubble({
  kind,
  data,
  fileName = "file",
  fileSize = 0,
  mimeType,
  onDark = false,
}: ChatAttachmentBubbleProps) {
  if (kind === "image") {
    const safeImage = isSafeImageDataUrl(data);
    const img = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={safeImage ? data : undefined}
        alt={fileName || "Photo"}
        className="max-h-56 max-w-full object-contain"
      />
    );
    if (!safeImage) {
      return (
        <div className="overflow-hidden rounded-lg bg-black/5 px-3 py-6 text-center text-[12px] text-[#667781]">
          Photo unavailable
        </div>
      );
    }
    return (
      <a
        href={data}
        target="_blank"
        rel="noopener noreferrer"
        className="block overflow-hidden rounded-lg hover:cursor-pointer"
      >
        {img}
      </a>
    );
  }

  const canOpen = isSafeFileDataUrl(data);

  const pdf = isPdfAttachment(mimeType, fileName);
  const word = isWordAttachment(mimeType, fileName);
  const typeLabel = documentKindLabel(mimeType, fileName);
  const sizeLabel = formatFileSize(fileSize);
  const meta = onDark ? "text-white/65" : "text-[#667781]";
  const shell = onDark
    ? "bg-white/10 ring-1 ring-white/15"
    : "bg-black/[0.03] ring-1 ring-black/[0.06]";
  const iconWrap = pdf
    ? onDark
      ? "bg-[#E53935]/25 text-[#FFCDD2]"
      : "bg-[#FFEBEE] text-[#C62828]"
    : word
      ? onDark
        ? "bg-[#1565C0]/30 text-[#BBDEFB]"
        : "bg-[#E3F2FD] text-[#1565C0]"
      : onDark
        ? "bg-white/15 text-white"
        : "bg-black/5 text-black";
  const actionBtn = onDark
    ? "text-white/80 hover:bg-white/15 hover:text-white"
    : "text-[#54656F] hover:bg-black/5 hover:text-black";

  return (
    <div
      className={`flex min-w-[200px] max-w-[260px] items-center gap-2 rounded-xl px-2.5 py-2 ${shell}`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconWrap}`}
      >
        <FileTypeIcon
          mimeType={mimeType}
          fileName={fileName}
          className="h-5 w-5"
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate [font-family:var(--font-body)] text-[13.5px] leading-tight">
          {fileName}
        </p>
        <p
          className={`mt-0.5 truncate [font-family:var(--font-ui)] text-[10px] ${meta}`}
        >
          {typeLabel}
          {sizeLabel ? ` · ${sizeLabel}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {canOpen ? (
          <a
            href={data}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open"
            title="Open"
            className={`flex h-8 w-8 items-center justify-center rounded-full transition hover:cursor-pointer ${actionBtn}`}
          >
            <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
          </a>
        ) : null}
        {canOpen ? (
          <a
            href={data}
            download={fileName}
            aria-label="Download"
            title="Download"
            className={`flex h-8 w-8 items-center justify-center rounded-full transition hover:cursor-pointer ${actionBtn}`}
          >
            <Download className="h-4 w-4" strokeWidth={1.75} />
          </a>
        ) : null}
      </div>
    </div>
  );
}
