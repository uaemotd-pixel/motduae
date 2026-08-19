"use client";

import { getTranslation } from "@/lib/getTranslation";
import ChangeEmailForm from "@/components/auth/ChangeEmailForm";

type PartnerChangeEmailCardProps = {
  locale: string;
  nextPath: string;
  currentEmail?: string;
  onCancel: () => void;
};

export default function PartnerChangeEmailCard({
  locale,
  nextPath,
  currentEmail,
  onCancel,
}: PartnerChangeEmailCardProps) {
  const t = getTranslation(locale).verifyEmail;

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.28em] text-(--color-grey-muted) mb-3">
          {t.changeEmailHeading}
        </p>
        <h1 className="[font-family:var(--font-display)] text-[32px] sm:text-[36px] text-black mb-3">
          {t.changeTitle}
        </h1>
        <p className="[font-family:var(--font-body)] text-[14px] leading-relaxed text-(--color-grey-muted)">
          {t.changeEmailHint}
        </p>
        {currentEmail ? (
          <p className="mt-2 [font-family:var(--font-body)] text-[14px] text-black">
            {currentEmail}
          </p>
        ) : null}
      </div>

      <div className="border border-(--color-border) bg-white p-6 sm:p-8">
        <ChangeEmailForm
          locale={locale}
          nextPath={nextPath}
          variant="portal"
          onCancel={onCancel}
        />
      </div>
    </div>
  );
}
