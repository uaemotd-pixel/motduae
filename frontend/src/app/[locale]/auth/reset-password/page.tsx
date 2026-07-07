"use client";

import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import { Suspense } from "react";

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen w-full bg-[#FFFDF9] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Suspense
          fallback={
            <p className="text-center text-black/50 text-sm">Loading…</p>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
