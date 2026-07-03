"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function AdminOrdersIndexPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale || "en";

  useEffect(() => {
    // Automatically route parent link context to the default MVP retail pipeline channel
    router.replace(`/${locale}/admin/orders/custom`);
  }, [router, locale]);

  return (
    <div className="p-6 space-y-4">
      <div className="animate-pulse space-y-2">
        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
        <div className="h-4 bg-gray-100 rounded w-1/3"></div>
      </div>
    </div>
  );
}