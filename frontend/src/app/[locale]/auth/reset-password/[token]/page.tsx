"use client";

import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import { AuthSplitSkeleton } from "@/components/ui/Skeleton";
import { Suspense } from "react";

export default function ResetPasswordTokenPage() {
  return (
    <Suspense fallback={<AuthSplitSkeleton variant="form" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
