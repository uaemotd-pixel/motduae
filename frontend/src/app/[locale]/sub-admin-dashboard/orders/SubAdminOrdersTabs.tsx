"use client";

import { Link, usePathname } from "@/i18n/navigation";

export default function SubAdminOrdersTabs() {
  const pathname = usePathname();

  const tabClass = (active: boolean) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      active
        ? "border-black text-black"
        : "border-transparent text-gray-500 hover:text-black"
    }`;

  return (
    <div className="flex gap-1 border-b border-gray-200">
      <Link
        href="/sub-admin-dashboard/orders/custom"
        className={tabClass(pathname.includes("/orders/custom"))}
      >
        Custom Orders
      </Link>
      <Link
        href="/sub-admin-dashboard/orders/retail"
        className={tabClass(pathname.includes("/orders/retail"))}
      >
        Retail Orders
      </Link>
    </div>
  );
}
