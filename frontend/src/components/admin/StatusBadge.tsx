"use client";

type StatusType =
    | "pending"
    | "confirmed"
    | "shipped"
    | "delivered"
    | "cancelled"
    | string;

type StatusBadgeProps = {
    status: StatusType;
};

const statusStyles: Record<string, string> = {
    pending:
        "bg-yellow-50 text-yellow-700 border border-yellow-200",
    confirmed:
        "bg-blue-50 text-blue-700 border border-blue-200",
    shipped:
        "bg-purple-50 text-purple-700 border border-purple-200",
    delivered:
        "bg-green-50 text-green-700 border border-green-200",
    cancelled:
        "bg-red-50 text-red-700 border border-red-200",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
    const normalized = status?.toLowerCase?.() || status;

    const style =
        statusStyles[normalized] ||
        "bg-gray-50 text-gray-600 border border-gray-200";

    return (
        <span
            className={`inline-flex items-center px-3 py-1 text-[11px] md:text-xs font-medium uppercase tracking-wide rounded-full ${style}`}
        >
            {normalized}
        </span>
    );
}