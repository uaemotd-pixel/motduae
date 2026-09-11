"use client";

import { useEffect, useState } from "react";
import FormField from "@/components/admin/FormField";
import {
  DEFAULT_FABRIC_COMMISSION,
  fetchMotdCommissionPercents,
  formatMotdFinalPrice,
} from "@/lib/motdCommission";

const DEFAULT_INPUT_CLASS =
  "w-full py-1 border-b border-gray-300 bg-transparent text-xs sm:text-sm text-black/60 cursor-default";

export function useFabricStoreCommission() {
  const [percent, setPercent] = useState(DEFAULT_FABRIC_COMMISSION);

  useEffect(() => {
    let cancelled = false;
    fetchMotdCommissionPercents().then((rates) => {
      if (!cancelled) setPercent(rates.fabricStore);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return percent;
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
