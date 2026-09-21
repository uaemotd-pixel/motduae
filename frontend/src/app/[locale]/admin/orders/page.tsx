"use client";

import { useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { PageHeaderSkeleton } from "@/components/ui/Skeleton";

export default function AdminOrdersIndexPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params?.locale || "en";

  useEffect(() => {
    const type = searchParams.get("type");
    const orderId = searchParams.get("orderId");
    const channel = type === "retail" ? "retail" : "custom";
    const qs = orderId ? `?orderId=${encodeURIComponent(orderId)}` : "";
    router.replace(`/${locale}/admin/orders/${channel}${qs}`);
  }, [router, locale, searchParams]);

  return (
    <div className="p-6">
      <PageHeaderSkeleton />
    </div>
  );
}