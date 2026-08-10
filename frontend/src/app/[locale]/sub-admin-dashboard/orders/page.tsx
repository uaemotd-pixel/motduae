"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import PermissionGuard from "@/lib/auth/PermissionGuard";
import { PageHeaderSkeleton } from "@/components/ui/Skeleton";

export default function AdminOrdersIndexPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale || "en";

  useEffect(() => {
    // Automatically route parent link context to the default MVP retail pipeline channel
    router.replace(`/${locale}/sub-admin-dashboard/orders/custom`);
  }, [router, locale]);

  return (
    <PermissionGuard requiredPerm="orders">
      <div className="p-6">
        <PageHeaderSkeleton />
      </div>
    </PermissionGuard>
  );
}
