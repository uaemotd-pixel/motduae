"use client";

import { useEffect, useState } from "react";
import FormField from "@/components/admin/FormField";
import {
  DEFAULT_FABRIC_COMMISSION,
  DEFAULT_TAILOR_COMMISSION,
  applyMotdCommission,
  fetchMotdCommissionPercents,
  formatMotdFinalPrice,
} from "@/lib/motdCommission";

const DEFAULT_INPUT_CLASS =
  "w-full py-1 border-b border-gray-300 bg-transparent text-xs sm:text-sm text-black/60 cursor-default";

function useCommissionPercent(
  kind: "fabricStore" | "tailor",
  fallback: number,
) {
  const [percent, setPercent] = useState(fallback);

  useEffect(() => {
    let cancelled = false;
    fetchMotdCommissionPercents().then((rates) => {
      if (!cancelled) setPercent(rates[kind]);
    });
    return () => {
      cancelled = true;
    };
  }, [kind]);

  return percent;
}

export function useFabricStoreCommission() {
  return useCommissionPercent("fabricStore", DEFAULT_FABRIC_COMMISSION);
}

export function useTailorCommission() {
  return useCommissionPercent("tailor", DEFAULT_TAILOR_COMMISSION);
}

function formatAedAmount(amount: number) {
  return `AED ${Number(amount || 0).toLocaleString()}`;
}

/** Your price plus the customer-facing final price for portal listings. */
export function PartnerListingPrice({
  netAmount,
  commissionPercent,
  locale = "en",
  stacked = false,
  className = "",
}: {
  netAmount: number;
  commissionPercent: number;
  locale?: string;
  stacked?: boolean;
  className?: string;
}) {
  const yours = Number(netAmount) || 0;
  const final = applyMotdCommission(yours, commissionPercent);
  const yoursLabel = formatAedAmount(yours);
  const finalPrefix = locale === "ar" ? "النهائي" : "Final";
  const finalLabel = `${finalPrefix} ${formatAedAmount(final)}`;

  if (commissionPercent <= 0) {
    return <span className={className}>{yoursLabel}</span>;
  }

  if (stacked) {
    return (
      <span className={`flex flex-col gap-0.5 leading-tight ${className}`}>
        <span className="text-gray-500">{yoursLabel}</span>
        <span className="text-black font-medium">{finalLabel}</span>
      </span>
    );
  }

  return (
    <span className={className}>
      <span className="text-gray-500">{yoursLabel}</span>
      <span className="mx-1 text-gray-300">·</span>
      <span className="text-black">{finalLabel}</span>
    </span>
  );
}

export default function CommissionFinalPriceField({
  partnerPrice,
  commissionPercent,
  inputClassName = DEFAULT_INPUT_CLASS,
}: {
  partnerPrice: number;
  commissionPercent: number;
  inputClassName?: string;
}) {
  return (
    <FormField
      label="Final price (AED)"
      name="customerFinalPrice"
      hint={
        commissionPercent > 0
          ? `What the customer sees, including ${commissionPercent}% MOTD commission.`
          : undefined
      }
    >
      <input
        id="customerFinalPrice"
        readOnly
        tabIndex={-1}
        value={formatMotdFinalPrice(partnerPrice, commissionPercent)}
        className={inputClassName}
      />
    </FormField>
  );
}
