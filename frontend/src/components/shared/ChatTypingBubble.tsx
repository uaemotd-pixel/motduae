"use client";

/** WhatsApp-style incoming typing indicator bubble with bouncing dots. */
export default function ChatTypingBubble({ label }: { label?: string }) {
  return (
    <div className="flex justify-start">
      <div className="relative rounded-[7.5px] rounded-tl-none border border-[#EBEBE8] bg-[#FFFDF9] px-3.5 py-2.5 shadow-[0_1px_0.5px_rgba(0,0,0,0.13)]">
        <span
          aria-hidden
          className="pointer-events-none absolute top-0 -left-[6px] h-0 w-0 border-y-[6px] border-y-transparent border-r-[6px] border-r-[#FFFDF9]"
        />
        <div className="flex items-center gap-2">
          {label ? (
            <span className="[font-family:var(--font-body)] text-[12px] text-[#8A8A80]">
              {label}
            </span>
          ) : null}
          <span
            className="flex items-center gap-[3px]"
            aria-label={label || "Typing"}
          >
            <span className="h-[7px] w-[7px] animate-bounce rounded-full bg-[#A1A1A1] [animation-delay:0ms] [animation-duration:1s]" />
            <span className="h-[7px] w-[7px] animate-bounce rounded-full bg-[#A1A1A1] [animation-delay:150ms] [animation-duration:1s]" />
            <span className="h-[7px] w-[7px] animate-bounce rounded-full bg-[#A1A1A1] [animation-delay:300ms] [animation-duration:1s]" />
          </span>
        </div>
      </div>
    </div>
  );
}
