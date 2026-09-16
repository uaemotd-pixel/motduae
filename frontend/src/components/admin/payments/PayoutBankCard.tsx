"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import {
  formatIbanDisplay,
  isPayoutBankComplete,
  type PayoutBankDetails,
} from "@/lib/partnerPayoutBank";

function BankRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-(--dash-border) bg-(--dash-bg) px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.16em] text-(--dash-muted)">
        {label}
      </p>
      <p className="mt-1 break-all text-sm font-medium text-(--dash-ink)">
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
      <div className="w-full min-w-0 max-w-[min(100%,calc(100vw-2rem))] rounded-lg border border-(--dash-border) bg-(--dash-bg) px-3 py-2">
        <p className="text-[10px] uppercase tracking-[0.16em] text-(--dash-muted)">
          Bank details
        </p>
        <p className="mt-1 text-sm text-(--dash-ink)">{missingLabel}</p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-[min(100%,calc(100vw-2rem))] space-y-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {bank?.accountHolderName ? (
          <BankRow label="Account holder" value={bank.accountHolderName} />
        ) : null}
        {bank?.bankName ? <BankRow label="Bank" value={bank.bankName} /> : null}
      </div>
      {iban ? (
        <div className="flex flex-col gap-2 rounded-lg border border-(--dash-border) bg-(--dash-bg) px-3 py-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.16em] text-(--dash-muted)">
              IBAN
            </p>
            <p className="mt-1 break-all text-sm font-medium uppercase tracking-[0.04em] text-(--dash-ink)">
              {iban}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void copyIban()}
            className="inline-flex w-full shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-(--dash-border) bg-white px-2 py-1.5 text-[10px] uppercase tracking-[0.14em] text-(--dash-muted) hover:text-(--dash-ink) sm:w-auto sm:py-1"
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
