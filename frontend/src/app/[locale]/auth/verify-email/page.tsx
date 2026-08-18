"use client";

import { Suspense, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useAuth, needsEmailVerification } from "@/context/AuthContext";
import {
  navigateAfterLogin,
  getPostLoginPath,
} from "@/lib/auth/postLoginRedirect";
import VerifyEmailOtp, {
  type VerifyEmailMode,
} from "@/components/auth/VerifyEmailOtp";
import { AuthSplitSkeleton } from "@/components/ui/Skeleton";

const ACCOUNT_DEFAULT_NEXT = "/account?tab=profile";

function resolveMode(raw: string | null): VerifyEmailMode {
  if (raw === "checkout") return "checkout";
  if (raw === "account") return "account";
  return "signup";
}

function goToNextOrDefault(
  locale: string,
  nextParam: string | null,
  fallback: string,
) {
  const path = nextParam
    ? nextParam.startsWith("/")
      ? nextParam
      : `/${nextParam}`
    : fallback;
  window.location.replace(`/${locale}${path}`);
}

function goToAccount(locale: string, nextParam: string | null) {
  goToNextOrDefault(locale, nextParam, ACCOUNT_DEFAULT_NEXT);
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<AuthSplitSkeleton variant="otp" />}>
      <VerifyEmailPageContent />
    </Suspense>
  );
}

function VerifyEmailPageContent() {
  const { user, isLoading } = useAuth();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || "en";
  const nextParam = searchParams.get("next") || searchParams.get("redirect");
  const mode = resolveMode(searchParams.get("mode"));
  const redirected = useRef(false);
  /** Once OTP UI is shown, keep it mounted through Verified → redirect (don't flash skeleton). */
  const heldVerifyUi = useRef(false);

  if (user && needsEmailVerification(user)) {
    heldVerifyUi.current = true;
  }

  useEffect(() => {
    if (isLoading || redirected.current) return;

    if (!user) {
      redirected.current = true;
      window.location.replace(`/${locale}/auth/login`);
      return;
    }

    // Already verified on entry only — after OTP success, VerifyEmailOtp handles redirect
    if (!needsEmailVerification(user) && !heldVerifyUi.current) {
      redirected.current = true;
      if (mode === "account") {
        goToAccount(locale, nextParam);
        return;
      }
      if (mode === "checkout" && nextParam) {
        goToNextOrDefault(locale, nextParam, "/checkout");
        return;
      }
      navigateAfterLogin(user, nextParam, locale);
    }
  }, [user, isLoading, locale, nextParam, mode]);

  if (isLoading) {
    return <AuthSplitSkeleton variant="otp" />;
  }

  if (!user) {
    return <AuthSplitSkeleton variant="form" />;
  }

  if (heldVerifyUi.current || needsEmailVerification(user)) {
    return (
      <VerifyEmailOtp
        locale={locale}
        mode={mode}
        nextPath={
          mode === "account"
            ? nextParam || ACCOUNT_DEFAULT_NEXT
            : nextParam
              ? getPostLoginPath(user, nextParam)
              : null
        }
        onSkip={() => {
          if (mode === "checkout") {
            if (nextParam) {
              goToNextOrDefault(locale, nextParam, "/checkout");
              return;
            }
            window.history.back();
            return;
          }
          if (mode === "account") {
            goToAccount(locale, nextParam);
            return;
          }
          navigateAfterLogin(user, nextParam, locale);
        }}
        onVerified={() => {
          if (mode === "account") {
            goToAccount(locale, nextParam);
            return;
          }
          if (mode === "checkout") {
            goToNextOrDefault(locale, nextParam, "/checkout");
            return;
          }
          if (nextParam) {
            goToNextOrDefault(locale, nextParam, "/");
            return;
          }
          navigateAfterLogin(user, null, locale);
        }}
      />
    );
  }

  return <AuthSplitSkeleton variant="form" />;
}
