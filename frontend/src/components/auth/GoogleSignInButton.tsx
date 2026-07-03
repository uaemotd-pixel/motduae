"use client";

import { useState } from "react";
import Image from "next/image";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import * as images from "../../../public/images/ImageIndex";
import { isGoogleAuthConfigured } from "./AuthGoogleProvider";

type GoogleSignInButtonProps = {
  onSuccess: (credential: string) => Promise<void>;
  disabled?: boolean;
  label?: string;
  onError?: (message: string) => void;
};

export default function GoogleSignInButton({
  onSuccess,
  disabled = false,
  label = "Google",
  onError,
}: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const configured = isGoogleAuthConfigured();

  const handleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) {
      onError?.("Google sign-in did not return a credential");
      return;
    }

    setIsLoading(true);
    try {
      await onSuccess(response.credential);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Google sign-in failed";
      onError?.(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!configured) {
    return (
      <button
        type="button"
        disabled
        title="Set NEXT_PUBLIC_GOOGLE_CLIENT_ID in frontend/.env.local"
        className="h-11 md:h-12 w-full border border-black/15 bg-transparent opacity-50 cursor-not-allowed"
      >
        <span className="flex items-center justify-center gap-2 h-full leading-none">
          <Image
            src={images.google_icon.src}
            alt="Google icon"
            width={16}
            height={16}
            className="block shrink-0"
          />
          <span className="text-[10px] md:text-[11px] uppercase tracking-[0.12em] text-black/70 leading-none flex items-center">
            {label}
          </span>
        </span>
      </button>
    );
  }

  return (
    <div className="relative h-11 md:h-12 w-full">
      <div
        className={`h-full w-full border border-black/15 bg-transparent transition-all duration-300 ${
          disabled || isLoading ? "opacity-50" : "group hover:border-black hover:bg-black"
        }`}
        aria-hidden="true"
      >
        <span className="flex items-center justify-center gap-2 h-full leading-none pointer-events-none">
          <Image
            src={images.google_icon.src}
            alt=""
            width={16}
            height={16}
            className={`block shrink-0 ${disabled || isLoading ? "" : "group-hover:invert transition-all duration-300"}`}
          />
          <span
            className={`text-[10px] md:text-[11px] uppercase tracking-[0.12em] leading-none flex items-center ${
              disabled || isLoading
                ? "text-black/70"
                : "text-black/70 group-hover:text-white transition-all duration-300"
            }`}
          >
            {isLoading ? "Signing in..." : label}
          </span>
        </span>
      </div>

      {!disabled && !isLoading && (
        <div className="absolute inset-0 opacity-[0.01] overflow-hidden cursor-pointer">
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => onError?.("Google sign-in was cancelled or failed")}
            theme="outline"
            size="large"
            text="continue_with"
            shape="rectangular"
            width="400"
          />
        </div>
      )}
    </div>
  );
}
