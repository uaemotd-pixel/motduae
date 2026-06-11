"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { type ApiError } from "@/lib/api/client";
import logoBlack from "../../../public/PNG/Black/MOTD_Wordmark_Black.png";
import * as images from "../../../public/images/ImageIndex";

export default function TailorRegisterForm() {
    const t = useTranslations("TailorRegister");
    const { registerTailor } = useAuth();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError(t("passwordMismatch"));
            return;
        }

        setIsLoading(true);

        try {
            await registerTailor(name, email, password);
            setSubmitted(true);
        } catch (err: unknown) {
            const message =
                (err as ApiError)?.message ||
                (err instanceof Error ? err.message : "Registration failed");
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen w-full flex flex-col md:flex-row bg-[#FFFDF9]">
            <section className="hidden md:sticky md:top-0 md:block md:w-[55%] h-screen overflow-hidden relative">
                <img
                    src={images.sub1.src}
                    alt=""
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-r from-black/60 via-black/30 to-transparent" />
                <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-black/20" />
                <div className="absolute top-7.5 left-7.5 z-10">
                    <Link href="/" className="shrink-0 flex items-center p-7.5 -m-7.5">
                        <img
                            src="/PNG/White/MOTD_Wordmark_White.png"
                            alt="MOTD"
                            className="h-3 xs:h-[13px] sm:h-3.5 md:h-4 lg:h-4.5 xl:h-5 w-auto object-contain"
                        />
                    </Link>
                </div>
                <div className="absolute bottom-7.5 left-7.5 hidden md:block z-10">
                    <p className="font-label-sm text-[11px] md:text-[12px] text-white/50 uppercase tracking-[0.3em]">
                        {t("imageCaption")}
                    </p>
                </div>
            </section>

            <section className="w-full md:w-[45%] bg-[#FFFDF9] h-auto flex flex-col justify-center items-center py-10 px-5 sm:px-8 md:px-12 lg:px-16 xl:px-20">
                <div className="w-full max-w-100 mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                    >
                        <div className="md:hidden flex justify-center mb-10">
                            <Image
                                src={logoBlack}
                                alt="MOTD — Mukhawar of the Day"
                                height={35}
                                width={100}
                                className="h-auto w-auto object-contain"
                            />
                        </div>

                        {submitted ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 mx-auto mb-6 bg-[#F0EBE3] rounded-full flex items-center justify-center">
                                    <svg
                                        className="w-8 h-8 text-black"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                </div>
                                <h2 className="[font-family:var(--font-display)] text-[28px] sm:text-[32px] text-black mb-4">
                                    {t("successTitle")}
                                </h2>
                                <p className="[font-family:var(--font-body)] text-[14px] text-(--color-grey-muted) leading-relaxed mb-4 max-w-sm mx-auto">
                                    {t("successMessage")}
                                </p>
                                <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-black mb-8">
                                    {t("successStatus")}
                                </p>
                                <Link
                                    href="/"
                                    className="inline-block px-8 py-3 bg-black text-white text-[10px] tracking-[0.22em] uppercase hover:bg-[#2A2A28] transition [font-family:var(--font-ui)]"
                                >
                                    {t("goHome")}
                                </Link>
                            </div>
                        ) : (
                            <>
                                <header className="mb-10 md:mb-12 md:mt-6 lg:mt-8">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="block w-8 h-px bg-black/20" />
                                        <span className="font-label-sm text-[11px] md:text-[12px] tracking-[0.3em] text-black/40 uppercase">
                                            {t("eyebrow")}
                                        </span>
                                    </div>
                                    <h1 className="font-headline-lg text-[32px] sm:text-[36px] md:text-[40px] uppercase mb-3 tracking-[-0.01em] text-black">
                                        {t("title")}
                                    </h1>
                                    <p className="font-body-md text-[14px] sm:text-[15px] text-black/50 leading-relaxed">
                                        {t("description")}
                                    </p>
                                </header>

                                <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
                                    <div className="space-y-2">
                                        <label
                                            htmlFor="tailor-name"
                                            className="font-label-sm text-[11px] md:text-[12px] text-black/60 uppercase tracking-[0.2em] block"
                                        >
                                            {t("nameLabel")}
                                        </label>
                                        <input
                                            id="tailor-name"
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder={t("namePlaceholder")}
                                            required
                                            className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body-md rounded-none px-0 transition-all focus:border-black focus:outline-none placeholder:text-black/40 text-black"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label
                                            htmlFor="tailor-email"
                                            className="font-label-sm text-[11px] md:text-[12px] text-black/60 uppercase tracking-[0.2em] block"
                                        >
                                            {t("emailLabel")}
                                        </label>
                                        <input
                                            id="tailor-email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder={t("emailPlaceholder")}
                                            required
                                            className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body-md rounded-none px-0 transition-all focus:border-black focus:outline-none placeholder:text-black/40 text-black"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label
                                            htmlFor="tailor-password"
                                            className="font-label-sm text-[11px] md:text-[12px] text-black/60 uppercase tracking-[0.2em] block"
                                        >
                                            {t("passwordLabel")}
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="tailor-password"
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                minLength={8}
                                                className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body-md rounded-none px-0 pr-10 transition-all focus:border-black focus:outline-none text-black"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-0 top-1/2 -translate-y-1/2 text-black/40 hover:text-black transition-colors"
                                                tabIndex={-1}
                                                aria-label="Toggle password visibility"
                                            >
                                                {showPassword ? "Hide" : "Show"}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label
                                            htmlFor="tailor-confirm-password"
                                            className="font-label-sm text-[11px] md:text-[12px] text-black/60 uppercase tracking-[0.2em] block"
                                        >
                                            {t("confirmPasswordLabel")}
                                        </label>
                                        <input
                                            id="tailor-confirm-password"
                                            type={showPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            minLength={8}
                                            className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body-md rounded-none px-0 transition-all focus:border-black focus:outline-none text-black"
                                        />
                                    </div>

                                    <p className="font-label-sm text-[11px] md:text-[12px] text-black/30 tracking-widest">
                                        {t("passwordHint")}
                                    </p>

                                    <p className="[font-family:var(--font-body)] text-[13px] text-(--color-grey-muted) leading-relaxed border border-(--color-border) bg-[#FDFAF5] p-4">
                                        {t("approvalNote")}
                                    </p>

                                    {error && (
                                        <div className="text-red-600 text-sm text-center bg-red-50 p-3 border border-red-200">
                                            {error}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full h-12 md:h-13 bg-black text-white font-label-sm text-[12px] md:text-[13px] uppercase tracking-[0.25em] hover:bg-black/80 transition-all duration-300 active:scale-[0.98] mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? t("submitting") : t("submit")}
                                    </button>
                                </form>

                                <footer className="mt-10 md:mt-12 pt-6 border-t border-black/10 text-center">
                                    <p className="font-body-md text-[12px] md:text-[13px] text-black/50 uppercase tracking-[0.15em]">
                                        {t("alreadyHaveAccount")}{" "}
                                        <Link
                                            href="/auth/login"
                                            className="text-black font-medium hover:underline underline-offset-4"
                                        >
                                            {t("signIn")}
                                        </Link>
                                    </p>
                                    <p className="font-body-md text-[12px] text-black/40 mt-4">
                                        <Link
                                            href="/auth/register"
                                            className="hover:text-black transition-colors"
                                        >
                                            {t("customerRegister")}
                                        </Link>
                                    </p>
                                </footer>
                            </>
                        )}
                    </motion.div>
                </div>
            </section>
        </main>
    );
}
