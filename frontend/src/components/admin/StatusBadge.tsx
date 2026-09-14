"use client";

import { Tag, type TagVariant } from "@/components/ui/Tag";

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
  | string;

type StatusBadgeProps = {
  status: StatusType;
  label?: string;
};

const statusVariant: Record<string, TagVariant> = {
  pending: "warning",
  confirmed: "info",
  shipped: "accent",
  delivered: "success",
  cancelled: "danger",
  fabric_delivered: "accent",
  at_tailor: "warning",
  in_production: "warning",
  ready: "success",
  out_for_delivery: "danger",
};

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const normalized = status?.toLowerCase?.() || status;
  const display = label || String(normalized).replace(/_/g, " ");
  const variant = statusVariant[normalized] ?? "muted";

  return (
    <Tag size="md" variant={variant}>
      {display}
    </Tag>
  );
}
