// app/[locale]/auth/login/page.tsx
"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthContext";
import { getPostLoginPath } from "@/lib/auth/postLoginRedirect";
import LoginForm from "../../../../components/auth/loginForm";

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(getPostLoginPath(user, redirectUrl));
      router.refresh();
    }
  }, [user, isLoading, redirectUrl, router]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#FFFDF9]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-black/60 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#FFFDF9]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-black/60 text-sm">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <LoginForm />;
}
