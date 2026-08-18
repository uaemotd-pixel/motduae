"use client";

import { useState } from "react";
import { Loader2, Package } from "lucide-react";
import { api, getApiErrorMessage } from "@/lib/api/client";
import toast from "react-hot-toast";

const TOAST_BASE = {
  position: "top-right" as const,
  duration: 6000,
  style: {
    fontFamily: "var(--font-body)",
    fontSize: "13px",
    letterSpacing: "0.04em",
    borderRadius: "0",
    padding: "14px 18px",
    maxWidth: "360px",
  },
};

const SUCCESS_TOAST = {
  ...TOAST_BASE,
  style: {
    ...TOAST_BASE.style,
    background: "#f0fdf4",
    color: "#166534",
    border: "1px solid #86efac",
  },
  iconTheme: { primary: "#16a34a", secondary: "#ffffff" },
};

const ERROR_TOAST = {
  ...TOAST_BASE,
  style: {
    ...TOAST_BASE.style,
    background: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fca5a5",
  },
  iconTheme: { primary: "#dc2626", secondary: "#ffffff" },
};

const PACK_HIDDEN_STATUSES = new Set([
  "cancelled",
  "delivered",
  "return_requested",
  "return_approved",
  "return_rejected",
  "refund_processed",
]);

export type PackReadiness = {
  packable: boolean;
  canPack?: boolean;
  alreadyPacked?: boolean;
  reason?: string | null;
};

export type PackButtonCopy = {
  pack: string;
  packing: string;
  packed: string;
  success: string;
  error: string;
};

type PackOrderResponse = {
  message?: string;
  order?: unknown;
  packedAt?: string | null;
  packReadiness?: PackReadiness;
};

type Props = {
  kind: "custom" | "retail";
  orderId: string;
  status?: string;
  packedAt?: string | null;
  packReadiness?: PackReadiness | null;
  disabled?: boolean;
  copy: PackButtonCopy;
  onPacked?: (payload: PackOrderResponse) => void;
};

export default function AdminPackOrderButton({
  kind,
  orderId,
  status,
  packedAt,
  packReadiness,
  disabled = false,
  copy,
  onPacked,
}: Props) {
  const [packing, setPacking] = useState(false);

  if (status && PACK_HIDDEN_STATUSES.has(status)) {
    return null;
  }

  const alreadyPacked = Boolean(packedAt || packReadiness?.alreadyPacked);
  const canPack =
    packReadiness?.canPack ??
    (Boolean(packReadiness?.packable) && !alreadyPacked);
  const reason = packReadiness?.reason || undefined;

  const handlePack = async () => {
    if (!canPack || packing || disabled) return;

    setPacking(true);
    try {
      const result = await api.post<PackOrderResponse>(
        `/api/admin/orders/${kind}/${orderId}/pack`,
      );
      toast.success(result.message || copy.success, SUCCESS_TOAST);
      onPacked?.(result);
    } catch (err: unknown) {
      const apiData = (err as { data?: { packReadiness?: PackReadiness } })
        ?.data;
      const readinessReason = apiData?.packReadiness?.reason;
      toast.error(
        readinessReason || getApiErrorMessage(err, copy.error),
        ERROR_TOAST,
      );
    } finally {
      setPacking(false);
    }
  };

  if (alreadyPacked && !canPack) {
    return (
      <span
        className="inline-flex items-center justify-center gap-1 min-w-35 px-3 py-2 rounded-lg text-xs font-medium border border-teal-200 bg-teal-50 text-teal-800"
        title={packedAt ? `${copy.packed} ${packedAt}` : copy.packed}
      >
        <Package className="w-3.5 h-3.5" />
        {copy.packed}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handlePack}
      disabled={!canPack || packing || disabled}
      title={!canPack ? reason : undefined}
      className="bg-teal-700 text-white px-3 py-2 rounded-lg text-xs flex items-center justify-center gap-1 min-w-35 disabled:opacity-50 hover:cursor-pointer hover:bg-teal-800 transition font-medium"
    >
      {packing ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
      ) : (
        <Package className="w-3.5 h-3.5" />
      )}
      {packing ? copy.packing : copy.pack}
    </button>
  );
}
