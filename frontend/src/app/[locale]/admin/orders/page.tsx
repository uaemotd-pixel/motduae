"use client";

import { useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { PageHeaderSkeleton } from "@/components/ui/Skeleton";
import { safeClientNavigate } from "@/lib/safeClientNavigate";

export default function AdminOrdersIndexPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || "en";

  useEffect(() => {
    const type = searchParams.get("type");
    const orderId = searchParams.get("orderId");
    const channel = type === "retail" ? "retail" : "custom";
    const qs = orderId ? `?orderId=${encodeURIComponent(orderId)}` : "";
    safeClientNavigate(`/${locale}/admin/orders/${channel}${qs}`, {
      locale,
      replace: true,
    });
  }, [locale, searchParams]);

  return (
    <div className="p-6">
      <PageHeaderSkeleton />
    </div>
  );
}
