"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeaderSkeleton } from "@/components/ui/Skeleton";

export default function AdminOrdersIndexPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale || "en";

  useEffect(() => {
    // Automatically route parent link context to the default MVP retail pipeline channel
    router.replace(`/${locale}/admin/orders/custom`);
  }, [router, locale]);

  return (
    <div className="p-6">
      <PageHeaderSkeleton />
    </div>
  );
}