"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import {
  formatIbanDisplay,
  isPayoutBankComplete,
  type PayoutBankDetails,
} from "@/lib/partnerPayoutBank";

function BankCell({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`min-w-0 rounded-lg border border-(--dash-border) bg-(--dash-bg) px-3 py-2 ${className || ""}`}
    >
      <p className="text-[10px] uppercase tracking-[0.16em] text-(--dash-muted)">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-medium text-(--dash-ink)" title={value}>
        {value}
      </p>
    </div>
  );
}

export default function PayoutBankCard({
  bank,
  hasPayoutBank,
  missingLabel = "No UAE IBAN on shop profile. Release is blocked until the partner saves bank details.",
}: {
  bank?: PayoutBankDetails | null;
  hasPayoutBank?: boolean;
  missingLabel?: string;
}) {
  const [copied, setCopied] = useState(false);
  const ready =
    hasPayoutBank ?? isPayoutBankComplete(bank || undefined);
  const iban = formatIbanDisplay(bank?.iban || "");

  const copyIban = async () => {
    const raw = String(bank?.iban || "").trim();
    if (!raw || !navigator?.clipboard) return;
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-w-0 rounded-lg border border-(--dash-border) bg-(--dash-bg) px-3 py-2">
        <p className="text-[10px] uppercase tracking-[0.16em] text-(--dash-muted)">
          Bank details
        </p>
        <p className="mt-1 text-sm text-(--dash-ink)">{missingLabel}</p>
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch">
      {bank?.accountHolderName ? (
        <BankCell
          className="sm:min-w-[10rem] sm:flex-1"
          label="Account holder"
          value={bank.accountHolderName}
        />
      ) : null}
      {bank?.bankName ? (
        <BankCell
          className="sm:min-w-[10rem] sm:flex-1"
          label="Bank"
          value={bank.bankName}
        />
      ) : null}
      {iban ? (
        <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-(--dash-border) bg-(--dash-bg) px-3 py-2 sm:min-w-[13rem] sm:flex-[1.35]">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.16em] text-(--dash-muted)">
              IBAN
            </p>
            <p
              className="mt-1 break-all text-sm font-medium uppercase tracking-[0.04em] text-(--dash-ink) sm:truncate sm:break-normal"
              title={iban}
            >
              {iban}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void copyIban()}
            className="inline-flex shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-(--dash-border) bg-white px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-(--dash-muted) hover:text-(--dash-ink)"
          >
            {copied ? (
              <Check className="h-3 w-3" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
