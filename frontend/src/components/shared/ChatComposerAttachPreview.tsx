"use client";

import { FileText, X } from "lucide-react";
import { formatFileSize, type PreparedChatAttachment } from "@/lib/chat/attachments";

type ChatComposerAttachPreviewProps = {
  attachment: PreparedChatAttachment;
  onClear: () => void;
  isAr?: boolean;
};

export default function ChatComposerAttachPreview({
  attachment,
  onClear,
  isAr = false,
}: ChatComposerAttachPreviewProps) {
  return (
    <div className="mb-2 flex items-center gap-2 rounded-2xl border border-[#E8E8E4] bg-white px-2 py-1.5 shadow-sm">
      {attachment.kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={attachment.data}
          alt={attachment.fileName}
          className="h-12 w-12 shrink-0 rounded-xl object-cover"
        />
      ) : (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#E3F2FD] text-[#1565C0]">
          <FileText className="h-5 w-5" strokeWidth={1.75} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate [font-family:var(--font-body)] text-[13px] text-[#111B21]">
          {attachment.fileName}
        </p>
        <p className="[font-family:var(--font-ui)] text-[10px] text-[#667781]">
          {attachment.kind === "image"
            ? isAr
              ? "صورة"
              : "Image"
            : isAr
              ? "مستند"
              : "Document"}
          {attachment.fileSize
            ? ` · ${formatFileSize(attachment.fileSize)}`
            : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={onClear}
        aria-label={isAr ? "إزالة المرفق" : "Remove attachment"}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#667781] transition hover:bg-black/5 hover:text-black hover:cursor-pointer"
      >
        <X className="h-4 w-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}
