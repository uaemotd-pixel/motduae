// app/[locale]/auth/login/page.tsx
"use client";

import { useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { navigateAfterLogin } from "@/lib/auth/postLoginRedirect";
import LoginForm from "../../../../components/auth/loginForm";
import * as images from "../../../../../public/images/ImageIndex";
import BrandLoader from "@/components/shared/BrandLoader";

export default function LoginPage() {
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

  // if (isLoading) {
  //   return <BrandLoader />;
  // }

  // if (user) {
  //   return <BrandLoader />;
  // }

  return <LoginForm />;
}
