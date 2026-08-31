"use client";

import { Link } from "@/i18n/navigation";

export const partnerBtnPrimary =
  "inline-flex w-full items-center justify-center px-8 py-3 bg-black text-white text-[10px] tracking-[0.22em] uppercase whitespace-nowrap [font-family:var(--font-ui)] hover:bg-[#2A2A28] transition";

export const partnerBtnOutline =
  "inline-flex w-full items-center justify-center px-8 py-3 border border-black text-black text-[10px] tracking-[0.22em] uppercase whitespace-nowrap [font-family:var(--font-ui)] hover:bg-black hover:text-white transition";

export function PartnerRequestNumber({
  label,
  value,
  className = "mb-6",
}: {
  label: string;
  value?: string | null;
  className?: string;
}) {
  if (!value) return null;
  return (
    <div
      className={`text-left border border-(--color-border) bg-white px-4 py-3 ${className}`}
    >
      <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-(--color-grey-muted) mb-1">
        {label}
      </p>
      <p className="[font-family:var(--font-body)] text-[14px] leading-relaxed text-black">
        {value}
      </p>
    </div>
  );
}

type Action = {
  label: string;
  href?: string;
  mailto?: string;
  onClick?: () => void;
  variant: "primary" | "outline";
};

type PartnerGateScreenProps = {
  eyebrow: string;
  title: string;
  description: string;
  requestNumber?: string | null;
  requestNumberLabel?: string;
  noteLabel?: string;
  note?: string | null;
  footerText?: string;
  statusLine?: string;
  actions: Action[];
  logoutLabel: string;
  onLogout: () => void;
  logoutAsButton?: boolean;
};

export default function PartnerGateScreen({
  eyebrow,
  title,
  description,
  requestNumber,
  requestNumberLabel,
  noteLabel,
  note,
  footerText,
  statusLine,
  actions,
  logoutLabel,
  onLogout,
  logoutAsButton = false,
}: PartnerGateScreenProps) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full text-center border border-(--color-border) bg-white p-8 sm:p-10">
        <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.28em] text-(--color-grey-muted) mb-4">
          {eyebrow}
        </p>
        <h1 className="[font-family:var(--font-display)] text-[28px] sm:text-[32px] text-black mb-4">
          {title}
        </h1>
        <p className="[font-family:var(--font-body)] text-[14px] leading-relaxed text-(--color-grey-muted) mb-6">
          {description}
        </p>
        {requestNumberLabel ? (
          <PartnerRequestNumber
            label={requestNumberLabel}
            value={requestNumber}
          />
        ) : null}
        {note ? (
          <div className="text-left border border-(--color-border) bg-white p-4 mb-6">
            {noteLabel ? (
              <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-(--color-grey-muted) mb-2">
                {noteLabel}
              </p>
            ) : null}
            <p className="[font-family:var(--font-body)] text-[14px] leading-relaxed text-black whitespace-pre-wrap">
              {note}
            </p>
          </div>
        ) : null}
        {footerText ? (
          <p className="[font-family:var(--font-body)] text-[14px] leading-relaxed text-black mb-8">
            {footerText}
          </p>
        ) : null}
        {statusLine ? (
          <p className="[font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.2em] text-black mb-8">
            {statusLine}
          </p>
        ) : null}
        <div className="flex flex-col gap-3">
          {actions.map((action) => {
            const className =
              action.variant === "primary"
                ? partnerBtnPrimary
                : partnerBtnOutline;
            if (action.href) {
              return (
                <Link key={action.label} href={action.href} className={className}>
                  {action.label}
                </Link>
              );
            }
            if (action.mailto) {
              return (
                <a
                  key={action.label}
                  href={action.mailto}
                  rel="noopener noreferrer"
                  className={className}
                >
                  {action.label}
                </a>
              );
            }
            return (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className={className}
              >
                {action.label}
              </button>
            );
          })}
          {logoutAsButton ? null : (
            <button
              type="button"
              onClick={onLogout}
              className="mt-2 [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.22em] text-(--color-grey-muted) hover:text-black transition"
            >
              {logoutLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
