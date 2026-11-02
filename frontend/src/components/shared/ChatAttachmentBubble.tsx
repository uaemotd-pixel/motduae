"use client";

import { Download, FileText } from "lucide-react";
import { formatFileSize } from "@/lib/chat/attachments";

type ChatAttachmentBubbleProps = {
  kind: "image" | "file";
  data: string;
  fileName?: string;
  fileSize?: number;
  onDark?: boolean;
};

export default function ChatAttachmentBubble({
  kind,
  data,
  fileName = "file",
  fileSize = 0,
  onDark = false,
}: ChatAttachmentBubbleProps) {
  if (kind === "image") {
    return (
      <a
        href={data}
        target="_blank"
        rel="noopener noreferrer"
        className="block overflow-hidden rounded-lg hover:cursor-pointer"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={data}
          alt={fileName || "Photo"}
          className="max-h-56 max-w-full object-contain"
        />
      </a>
    );
  }

  const meta = onDark ? "text-white/65" : "text-[#667781]";
  const iconWrap = onDark ? "bg-white/15 text-white" : "bg-black/5 text-black";

  return (
    <a
      href={data}
      download={fileName}
      className="flex min-w-[180px] max-w-[240px] items-center gap-2.5 rounded-lg py-1 pe-1 hover:cursor-pointer"
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconWrap}`}
      >
        <FileText className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate [font-family:var(--font-body)] text-[13.5px] leading-tight">
          {fileName}
        </span>
        <span
          className={`mt-0.5 flex items-center gap-1 [font-family:var(--font-ui)] text-[10px] ${meta}`}
        >
          {formatFileSize(fileSize)}
          <Download className="h-3 w-3 opacity-70" strokeWidth={2} />
        </span>
      </span>
    </a>
  );
}
