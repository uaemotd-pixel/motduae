"use client";

type StatusType =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "fabric_pickup_scheduled"
  | "at_tailor"
  | "in_production"
  | "ready"
  | "out_for_delivery"
  | string; // allow any other string

type StatusBadgeProps = {
  status: StatusType;
  label?: string;
};

const statusStyles: Record<string, string> = {
  // ---------- Retail order statuses (unchanged) ----------
  pending: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  confirmed: "bg-blue-50 text-blue-700 border border-blue-200",
  shipped: "bg-purple-50 text-purple-700 border border-purple-200",
  delivered: "bg-green-50 text-green-700 border border-green-200",
  cancelled: "bg-red-50 text-red-700 border border-red-200",

  // ---------- Custom order logistics statuses ----------
  fabric_delivered: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  at_tailor: "bg-amber-50 text-amber-700 border border-amber-200",
  in_production: "bg-yellow-100 text-yellow-800 border border-yellow-300", // slightly different from pending
  ready: "bg-teal-50 text-teal-700 border border-teal-200",
  out_for_delivery: "bg-rose-50 text-rose-700 border border-rose-200",
};

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const normalized = status?.toLowerCase?.() || status;

  const style =
    statusStyles[normalized] ||
    "bg-gray-50 text-gray-600 border border-gray-200";

  const display = label || normalized.replace(/_/g, " ");

  return (
    <span
      className={`inline-flex items-center px-3 py-1 text-[11px] md:text-xs font-medium uppercase tracking-wide rounded-full ${style}`}
    >
      {display}
    </span>
  );
}
