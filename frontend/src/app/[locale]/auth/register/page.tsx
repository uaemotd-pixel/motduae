"use client";

import { Suspense, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { navigateAfterLogin } from "@/lib/auth/postLoginRedirect";
import RegisterForm from "../../../../components/auth/registerForm";

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FFFDF9]">
          <div className="w-8 h-8 border-2 border-black/20 border-t-black rounded-full animate-spin" />
        </div>
      }
    >
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
    navigateAfterLogin(user, redirectUrl, locale);
  }, [user, isLoading, redirectUrl, locale]);

  // if (isLoading || user) {
  //   return (
  //     <div className="h-screen flex items-center justify-center bg-[#FFFDF9]">
  //       <div className="text-center">
  //         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
  //         <p className="text-black/60 text-sm">Redirecting...</p>
  //       </div>
  //     </div>
  //   );
  // }

  return <RegisterForm />;
}
