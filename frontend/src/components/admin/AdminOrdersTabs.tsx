"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function AdminOrdersTabs() {
  const t = useTranslations("Admin.OrdersCustom");
  const pathname = usePathname();

  const tabClass = (active: boolean) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      active
        ? "border-black text-black"
        : "border-transparent text-gray-500 hover:text-black"
    }`;

  return (
    <div className="flex gap-1 border-b border-gray-200">
      <Link href="/admin/orders/custom" className={tabClass(pathname.includes("/orders/custom"))}>
        {t("tabs.custom")}
      </Link>
      <Link href="/admin/orders/retail" className={tabClass(pathname.includes("/orders/retail"))}>
        {t("tabs.retail")}
      </Link>
    </div>
  );
}
