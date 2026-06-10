"use client";

import { useState, FormEvent } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import logoBlack from "../../../public/PNG/Black/MOTD_Wordmark_Black.png";
import * as images from "../../../public/images/ImageIndex";
import { motion } from "framer-motion";
import { getTranslation } from "@/lib/getTranslation";
import { useAuth } from "@/context/AuthContext";
import { getPostLoginPath } from "@/lib/auth/postLoginRedirect";

export default function LoginPage() {
    const params = useParams();
    const localeParam = params.locale as string;
    const t = getTranslation(localeParam);

    const router = useRouter();
    const locale = useLocale();
    const searchParams = useSearchParams();
    const redirectUrl = searchParams.get("redirect");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const { login, isLoading: isAuthLoading } = useAuth();

    if (isAuthLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-[#FFFDF9]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
                    <p className="text-black/60 text-sm">Redirecting...</p>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setIsLoading(true);

        try {
            const loggedInUser = await login(email, password);
            const targetUrl = getPostLoginPath(loggedInUser, redirectUrl);

            setSuccess(t.login.successMessage || "Login successful! Redirecting...");
            router.replace(targetUrl);
        } catch (err: any) {
            setError(err.message || "An error occurred during login.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        console.log("Google login clicked");
    };

    const handleAppleLogin = () => {
        console.log("Apple login clicked");
    };

    return (
        <main className="min-h-screen w-full flex flex-col md:flex-row bg-[#FFFDF9]">
            {/* Left Side - Image Section */}
            <section className="hidden md:sticky md:top-0 md:block md:w-[55%] h-screen overflow-hidden">
                <img
                    src={images.des6.src}
                    alt="Logo"
                    className="w-full"
                />
                <div className="absolute inset-0 bg-linear-to-r from-black/60 via-black/30 to-transparent"></div>
                <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-black/20"></div>

                <div className="absolute top-7.5 left-7.5 z-10 fade-in">
                    <Link href="/" className="shrink-0 flex items-center p-7.5 -m-7.5">
                        <img
                            src="\PNG\White\MOTD_Wordmark_White.png"
                            alt={"logoAlt"}
                            className="h-3 xs:h-[13px] sm:h-3.5 md:h-4 lg:h-4.5 xl:h-5 2xl:h-5.5 3xl:h-[24px] w-auto object-contain"
                        />
                    </Link>
                </div>

                <div className="absolute bottom-7.5 left-7.5 hidden md:block fade-in">
                    <p className="font-label-sm text-[10px] text-white/50 uppercase tracking-[0.3em]">
                        {t.login.imageText}
                    </p>
                </div>
            </section>

            {/* Right Side - Form */}
            <section className="w-full md:w-[45%] h-auto bg-[#FFFDF9] flex flex-col items-center justify-center py-10 px-5 sm:px-8 md:px-12 lg:px-16 xl:px-20">
                <div className="w-full max-w-100 mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                    >
                        <div className="md:hidden flex justify-center mb-6 fade-in">
                            <Image
                                src={logoBlack}
                                alt="MOTD — Mukhawar of the Day"
                                height={32}
                                width={90}
                                className="h-auto w-auto object-contain"
                            />
                        </div>

                        <header className="mb-6 fade-in">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="block w-8 h-px bg-black/20"></span>
                                <span className="font-label-sm text-[11px] md:text-[12px] tracking-[0.3em] text-black/40 uppercase">
                                    {t.login.subTitle}
                                </span>
                            </div>
                            <h2 className="font-headline-lg text-[28px] sm:text-[32px] md:text-[36px] lg:text-[40px] uppercase mb-2 tracking-[-0.01em] text-black">
                                {t.login.title}
                            </h2>
                            <p className="font-body-md text-[14px] sm:text-[15px] md:text-[15px] text-black/50 leading-relaxed">
                                {t.login.description}
                            </p>
                        </header>

                        <form onSubmit={handleSubmit} className="space-y-5 fade-in">
                            <div className="space-y-1.5">
                                <label htmlFor="email" className="font-label-sm text-[11px] md:text-[12px] text-black/60 uppercase tracking-[0.2em] block">
                                    {t.login.emailLabel}
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@example.com"
                                    required
                                    className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body-md rounded-none px-0 transition-all focus:border-black focus:outline-none placeholder:text-black/40 text-black"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <label htmlFor="password" className="font-label-sm text-[11px] md:text-[12px] text-black/60 uppercase tracking-[0.2em] block">
                                        {t.login.passwordLabel}
                                    </label>
                                    <Link
                                        href="/auth/forgetPassword"
                                        className="font-label-sm text-[9px] text-black/40 hover:text-black transition-colors uppercase tracking-[0.15em]"
                                    >
                                        {t.login.forgetPassword}
                                    </Link>
                                </div>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body-md rounded-none px-0 transition-all focus:border-black focus:outline-none placeholder:text-black/40 text-black"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-0 top-1/2 -translate-y-1/2 text-black/40 hover:text-black transition-colors"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? (
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                            </svg>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {success && (
                                <div className="text-green-600 text-sm text-center bg-green-50 p-3 rounded-md border border-green-200">
                                    {success}
                                </div>
                            )}

                            {error && (
                                <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md border border-red-200">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-12 md:h-13 bg-black text-white font-label-sm text-[12px] md:text-[13px] uppercase tracking-[0.25em] hover:bg-black/80 transition-all duration-300 active:scale-[0.98] mt-6 md:mt-7 disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        {t.login.buttonProgressLabel}
                                    </span>
                                ) : (
                                    `${t.login.buttonLabel}`
                                )}
                            </button>

                            <div className="relative py-3 flex items-center">
                                <div className="grow border-t border-black/10"></div>
                                <span className="shrink mx-3 md:mx-4 font-label-sm text-[10px] md:text-[11px] text-black/40 uppercase tracking-[0.2em]">
                                    {t.login.or}
                                </span>
                                <div className="grow border-t border-black/10"></div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 md:gap-4">
                                <button
                                    type="button"
                                    onClick={handleGoogleLogin}
                                    className="h-11 md:h-12 w-full border border-black/15 bg-transparent hover:border-black hover:bg-black transition-all duration-300 group hover:cursor-pointer"
                                >
                                    <span className="flex items-center justify-center gap-2 h-full leading-none">
                                        <Image
                                            src={images.google_icon.src}
                                            alt="Google icon"
                                            width={16}
                                            height={16}
                                            className="block shrink-0 group-hover:invert transition-all duration-300"
                                        />
                                        <span className="text-[10px] md:text-[11px] uppercase tracking-[0.12em] text-black/70 group-hover:text-white leading-none flex items-center">
                                            Google
                                        </span>
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleAppleLogin}
                                    className="h-11 md:h-12 w-full border border-black/15 bg-transparent hover:border-black hover:bg-black transition-all duration-300 group hover:cursor-pointer"
                                >
                                    <span className="flex items-center justify-center gap-2 h-full leading-none">
                                        <Image
                                            src={images.apple_icon.src}
                                            alt="Apple icon"
                                            width={16}
                                            height={16}
                                            className="block shrink-0 group-hover:invert transition-all duration-300"
                                        />
                                        <span className="text-[10px] md:text-[11px] uppercase tracking-[0.12em] text-black/70 group-hover:text-white leading-none flex items-center">
                                            Apple
                                        </span>
                                    </span>
                                </button>
                            </div>
                        </form>

                        <footer className="mt-8 pt-5 border-t border-black/10 text-center fade-in">
                            <p className="font-body-md text-[11px] text-black/50 uppercase tracking-[0.15em]">
                                {t.login.alreadyLabel}
                                <Link href="/auth/register" className="text-black font-medium hover:underline underline-offset-4 ml-2">
                                    {t.login.signupLabel}
                                </Link>
                            </p>
                            <div className="flex justify-center gap-5 md:gap-6 mt-4">
                                <Link href={`/${locale}/privacy`} className="font-label-sm text-[9px] md:text-[10px] text-black/30 uppercase tracking-[0.15em] hover:text-black/60 transition-colors">
                                    {t.login.privacyLabel}
                                </Link>
                                <Link href={`/${locale}/terms`} className="font-label-sm text-[9px] md:text-[10px] text-black/30 uppercase tracking-[0.15em] hover:text-black/60 transition-colors">
                                    {t.login.termsLabel}
                                </Link>
                            </div>
                            <p className="font-label-sm text-[9px] md:text-[10px] text-black/50 mt-4 tracking-widest">
                                {t.login.copyrightLabel}
                            </p>
                        </footer>
                    </motion.div>
                </div>
            </section>
        </main>
    );
}