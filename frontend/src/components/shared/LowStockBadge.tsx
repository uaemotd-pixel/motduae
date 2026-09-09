import { AlertTriangle } from "lucide-react";

export function LowStockBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-rose-100 text-rose-800 border border-rose-200 whitespace-nowrap">
      <AlertTriangle className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}
