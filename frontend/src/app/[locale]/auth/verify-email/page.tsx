"use client";

import { Suspense, useEffect, useRef, useState } from "react";
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
import {
  cancelEmailChangeRequest,
  fetchVerificationStatus,
} from "@/lib/auth/emailVerification";

const ACCOUNT_DEFAULT_NEXT = "/account?tab=profile";

function resolveMode(raw: string | null): VerifyEmailMode {
  if (raw === "checkout") return "checkout";
  if (raw === "account") return "account";
  if (raw === "email-change") return "email-change";
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
  const isEmailChange = mode === "email-change";
  const redirected = useRef(false);
  /** Once OTP UI is shown, keep it mounted through Verified → redirect (don't flash skeleton). */
  const heldVerifyUi = useRef(false);
  const [changeReady, setChangeReady] = useState(false);
  const [changeMasked, setChangeMasked] = useState("");

  if (user && needsEmailVerification(user) && !isEmailChange) {
    heldVerifyUi.current = true;
  }

  useEffect(() => {
    if (isLoading || redirected.current) return;

    if (!user) {
      redirected.current = true;
      window.location.replace(`/${locale}/auth/login`);
      return;
    }

    if (isEmailChange) {
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
  }, [user, isLoading, locale, nextParam, mode, isEmailChange]);

  useEffect(() => {
    if (!isEmailChange || isLoading || !user || redirected.current) return;

    let cancelled = false;
    fetchVerificationStatus()
      .then((status) => {
        if (cancelled || redirected.current) return;
        if (!status.pendingEmail) {
          redirected.current = true;
          goToNextOrDefault(locale, nextParam, ACCOUNT_DEFAULT_NEXT);
          return;
        }
        setChangeMasked(status.pendingEmail);
        setChangeReady(true);
      })
      .catch(() => {
        if (cancelled || redirected.current) return;
        redirected.current = true;
        goToNextOrDefault(locale, nextParam, ACCOUNT_DEFAULT_NEXT);
      });

    return () => {
      cancelled = true;
    };
  }, [isEmailChange, isLoading, user, locale, nextParam]);

  const leaveChangeFlow = (cancelledChange: boolean) => {
    const finish = () => {
      if (nextParam) {
        goToNextOrDefault(locale, nextParam, ACCOUNT_DEFAULT_NEXT);
        return;
      }
      if (user?.role === "tailor") {
        goToNextOrDefault(locale, "/tailor", "/tailor");
        return;
      }
      if (user?.role === "fabric_store") {
        goToNextOrDefault(locale, "/fabric", "/fabric");
        return;
      }
      goToAccount(locale, nextParam);
    };

    if (!cancelledChange) {
      finish();
      return;
    }

    void cancelEmailChangeRequest()
      .catch(() => {})
      .finally(finish);
  };

  if (isLoading) {
    return <AuthSplitSkeleton variant="otp" />;
  }

  if (!user) {
    return <AuthSplitSkeleton variant="form" />;
  }

  if (isEmailChange) {
    if (!changeReady) {
      return <AuthSplitSkeleton variant="otp" />;
    }

    return (
      <VerifyEmailOtp
        locale={locale}
        mode="email-change"
        pendingMaskedEmail={changeMasked}
        nextPath={nextParam || ACCOUNT_DEFAULT_NEXT}
        onSkip={() => leaveChangeFlow(true)}
        onVerified={() => leaveChangeFlow(false)}
      />
    );
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
