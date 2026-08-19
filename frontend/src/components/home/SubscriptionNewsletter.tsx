"use client";

import { useState, FormEvent } from "react";
import { useTranslations } from "next-intl";
import { api, getApiErrorMessage } from "@/lib/api/client";

interface SubscriptionNewsletterProps {
    onSubscribe?: (email: string) => void;
}

export function SubscriptionNewsletter({ onSubscribe }: SubscriptionNewsletterProps) {
    const t = useTranslations("newsletter");
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "alreadySubscribed" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!email) return;

        setStatus("loading");
        setErrorMessage("");

        try {
            if (onSubscribe) {
                onSubscribe(email);
            }
            
            const response = await api.post<{ success: boolean; alreadySubscribed?: boolean; message?: string }>(
                "/api/users/newsletter/subscribe",
                { email }
            );

            if (response.alreadySubscribed) {
                setStatus("alreadySubscribed");
            } else {
                setStatus("success");
                setEmail("");
            }
        } catch (err: any) {
            console.error("Newsletter subscription error:", err);
            const msg = getApiErrorMessage(err, "");
            if (msg) {
                setErrorMessage(msg);
            }
            setStatus("error");
        }
    };

    return (
        <div className="bg-(--bg-page) flex flex-col justify-center p-6 xs:p-8 sm:p-10 md:p-12 lg:p-16 border border-(--color-border)">
            <span className="[font-family:var(--font-ui)] text-[10px] xs:text-[9px] sm:text-[10px] md:text-[11px] lg:text-[12px] uppercase tracking-[0.35em] text-(--color-grey-muted) mb-3 xs:mb-4 sm:mb-5 block">
                {t("eyebrow")}
            </span>

            <h3 className="[font-family:var(--font-display)] text-[32px] xs:text-[32px] sm:text-[36px] md:text-[40px] lg:text-[44px] xl:text-[48px] 2xl:text-[52px] font-normal tracking-[-0.02em] text-black mb-4 xs:mb-5 sm:mb-6 md:mb-7 lg:mb-8 leading-[1.1]">
                {t("title")}
            </h3>

            <p className="[font-family:var(--font-body)] text-[14px] xs:text-[12px] sm:text-[13px] md:text-[14px] lg:text-[15px] xl:text-[16px] leading-[1.6] xs:leading-[1.7] sm:leading-[1.8] text-(--color-grey-muted) mb-8 xs:mb-9 sm:mb-10 md:mb-11 lg:mb-12 font-normal">
                {t("description")}
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5 xs:gap-6">
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("placeholder")}
                    required
                    disabled={status === "loading"}
                    className="[font-family:var(--font-ui)] text-[10px] xs:text-[11px] sm:text-[12px] md:text-[13px] lg:text-[14px] uppercase tracking-[0.2em] bg-transparent border-b border-(--color-border) py-3 xs:py-3.5 sm:py-4 px-2 placeholder:text-(--color-grey-muted)/40 focus:outline-none focus:border-black transition-colors font-normal disabled:opacity-50"
                />

                <button
                    type="submit"
                    disabled={status === "loading"}
                    className="[font-family:var(--font-body)] text-[12px] xs:text-[10px] sm:text-[11px] md:text-[12px] lg:text-[13px] uppercase tracking-[0.35em] bg-black text-white py-3.5 xs:py-4 sm:py-4.5 md:py-5 mt-4 xs:mt-5 sm:mt-6 hover:bg-(--color-grey-muted) hover:text-white transition-all duration-300 font-normal disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {status === "loading" ? (
                        <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                        t("subscribe")
                    )}
                </button>
            </form>

            {status === "success" && (
                <p className="mt-4 text-[12px] sm:text-[13px] text-emerald-600 font-medium tracking-[0.05em] uppercase [font-family:var(--font-ui)] transition-all duration-300">
                    {t("success")}
                </p>
            )}

            {status === "alreadySubscribed" && (
                <p className="mt-4 text-[12px] sm:text-[13px] text-amber-600 font-medium tracking-[0.05em] uppercase [font-family:var(--font-ui)] transition-all duration-300">
                    {t("alreadySubscribed")}
                </p>
            )}

            {status === "error" && (
                <p className="mt-4 text-[12px] sm:text-[13px] text-rose-600 font-medium tracking-[0.05em] uppercase [font-family:var(--font-ui)] transition-all duration-300">
                    {errorMessage || t("error")}
                </p>
            )}
        </div>
    );
}