"use client";

import { Suspense, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useAuth, needsEmailVerification } from "@/context/AuthContext";
import { navigateAfterLogin } from "@/lib/auth/postLoginRedirect";
import RegisterForm from "../../../../components/auth/registerForm";
import { AuthSplitSkeleton } from "@/components/ui/Skeleton";

export default function RegisterPage() {
  return (
    <Suspense fallback={<AuthSplitSkeleton variant="form" />}>
      <RegisterPageContent />
    </Suspense>
  );
}

function RegisterPageContent() {
  const { user, isLoading } = useAuth();
  const params = useParams();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");
  const locale = (params.locale as string) || "en";
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (isLoading || !user || hasRedirected.current) return;
    hasRedirected.current = true;

    if (needsEmailVerification(user)) {
      const qs = redirectUrl
        ? `?next=${encodeURIComponent(redirectUrl)}`
        : "";
      window.location.replace(`/${locale}/auth/verify-email${qs}`);
      return;
    }

    navigateAfterLogin(user, redirectUrl, locale);
  }, [user, isLoading, redirectUrl, locale]);

  return <RegisterForm />;
}
