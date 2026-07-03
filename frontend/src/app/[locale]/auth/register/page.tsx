"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { navigateAfterLogin } from "@/lib/auth/postLoginRedirect";
import RegisterForm from "../../../../components/auth/registerForm";

export default function RegisterPage() {
  const { user, isLoading } = useAuth();
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (isLoading || !user || hasRedirected.current) return;
    hasRedirected.current = true;
    navigateAfterLogin(user, null, locale);
  }, [user, isLoading, locale]);

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
