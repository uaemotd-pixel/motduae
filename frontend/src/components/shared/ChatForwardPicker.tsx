"use client";

import { X } from "lucide-react";
import ChatAvatar from "@/components/shared/ChatAvatar";

export type ChatForwardTarget = {
  id: string;
  name: string;
  preview?: string;
  status?: string;
  profilePic?: string;
  disabled?: boolean;
};

type ChatForwardPickerProps = {
  open: boolean;
  targets: ChatForwardTarget[];
  forwarding?: boolean;
  onClose: () => void;
  onPick: (sessionId: string) => void;
  title?: string;
  emptyLabel?: string;
};

/** Pick another live inbox thread to forward a message into. */
export default function ChatForwardPicker({
  open,
  targets,
  forwarding = false,
  onClose,
  onPick,
  title = "Forward to…",
  emptyLabel = "No other chats available.",
}: ChatForwardPickerProps) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/30 p-3 backdrop-blur-[1px] sm:items-center sm:p-4">
      <div className="flex max-h-[min(90dvh,28rem)] w-full max-w-sm flex-col overflow-hidden rounded-xl border border-[#E8E8E4] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E8E8E4] px-4 py-3">
          <h3 className="text-[15px] text-black [font-family:var(--font-body)]">
            {title}
          </h3>
          <button
            type="button"
            aria-label="Close"
            disabled={forwarding}
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#667781] transition hover:bg-black/5 hover:cursor-pointer disabled:opacity-40"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {targets.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-[#667781] [font-family:var(--font-body)]">
              {emptyLabel}
            </p>
          ) : (
            <ul className="divide-y divide-[#EFEFEA]">
              {targets.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    disabled={forwarding || t.disabled}
                    onClick={() => onPick(t.id)}
                    className="flex w-full items-center gap-3 px-3.5 py-2.5 text-start transition hover:bg-[#F7F5F0] hover:cursor-pointer disabled:opacity-40 disabled:hover:cursor-not-allowed"
                  >
                    <ChatAvatar
                      name={t.name}
                      src={t.profilePic}
                      size="md"
                      online={t.status === "active"}
                      className="border border-black/40"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] text-black [font-family:var(--font-body)]">
                        {t.name}
                      </span>
                      {t.preview ? (
                        <span className="mt-0.5 block truncate text-[12px] text-[#8A8A80] [font-family:var(--font-body)]">
                          {t.preview}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {forwarding ? (
          <p className="border-t border-[#E8E8E4] px-4 py-2 text-center text-[12px] text-[#667781] [font-family:var(--font-body)]">
            Forwarding…
          </p>
        ) : null}
      </div>
    </div>
  );
}
