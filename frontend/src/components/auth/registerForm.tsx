"use client";

import { useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import { getTranslation } from "@/lib/getTranslation";
import { useAuth } from "@/context/AuthContext";
import logoBlack from "../../../public/PNG/Black/MOTD_Wordmark_Black.png";
import * as images from "../../../public/images/ImageIndex";

export default function RegisterForm() {
    const params = useParams();
    const localeParam = params.locale as string;
    const t = getTranslation(localeParam);

    const router = useRouter();
    const locale = useLocale();
    const { register } = useAuth();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (password !== confirmPassword) {
            setError(t.signup.passwordMismatch || "Passwords do not match.");
            return;
        }

        if (phone.length !== 9) {
            setError(t.signup.phoneInvalid || "Contact number must be exactly 9 digits.");
            return;
        }

        setIsLoading(true);

        try {
            await register(name, email, password, phone);
            setSuccess(t.signup.successMessage || "Account created! Redirecting...");

            // Keep loading true, wait 2.5 seconds before redirect
            setTimeout(() => {
                router.replace(`/${locale}`);
                router.refresh();
            }, 2500);
        } catch (err: any) {
            setError(err.message || "An error occurred during registration.");
            setIsLoading(false); // only stop loading on error
        }
    };

    const handleGoogleSignUp = () => console.log("Google sign up clicked");
    const handleAppleSignUp = () => console.log("Apple sign up clicked");

    return (
        <main className="min-h-screen w-full flex flex-col md:flex-row bg-[#FFFDF9]">
            {/* Left Side - Image Section (same as your original) */}
            <section className="hidden md:sticky md:top-0 md:block md:w-[55%] h-screen overflow-hidden">
                <img src={images.des7.src} alt="Register" className="w-full" />
                <div className="absolute inset-0 bg-linear-to-r from-black/60 via-black/30 to-transparent"></div>
                <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-black/20"></div>
                <div className="absolute top-7.5 left-7.5 z-10 fade-in">
                    <Link href="/" className="shrink-0 flex items-center p-7.5 -m-7.5">
                        <img
                            src="\PNG\White\MOTD_Wordmark_White.png"
                            alt="logoAlt"
                            className="h-3 xs:h-[13px] sm:h-3.5 md:h-4 lg:h-4.5 xl:h-5 2xl:h-5.5 3xl:h-[24px] w-auto object-contain"
                        />
                    </Link>
                </div>
                <div className="absolute bottom-7.5 left-7.5 hidden md:block fade-in">
                    <p className="font-label-sm text-[11px] md:text-[12px] text-white/50 uppercase tracking-[0.3em]">
                        {t.signup.imageText}
                    </p>
                </div>
            </section>

            {/* Right Side - Sign Up Form */}
            <section className="w-full md:w-[45%] bg-[#FFFDF9] h-auto flex flex-col justify-center items-center py-10 px-5 sm:px-8 md:px-12 lg:px-16 xl:px-20">
                <div className="w-full max-w-100 mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                    >
                        {/* Mobile logo */}
                        <div className="md:hidden flex justify-center mb-10 fade-in">
                            <Image
                                src={logoBlack}
                                alt="MOTD — Mukhawar of the Day"
                                height={35}
                                width={100}
                                className="h-auto w-auto object-contain"
                            />
                        </div>

                        {/* Header */}
                        <header className="mb-10 md:mb-12 fade-in md:mt-6 lg:mt-8">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="block w-8 h-px bg-black/20"></span>
                                <span className="font-label-sm text-[11px] md:text-[12px] tracking-[0.3em] text-black/40 uppercase">
                                    {t.signup.subTitle}
                                </span>
                            </div>
                            <h2 className="font-headline-lg text-[32px] sm:text-[36px] md:text-[40px] lg:text-[44px] uppercase mb-3 tracking-[-0.01em] text-black">
                                {t.signup.title}
                            </h2>
                            <p className="font-body-md text-[14px] sm:text-[15px] md:text-[15px] text-black/50 leading-relaxed">
                                {t.signup.description}
                            </p>
                        </header>

                        <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6 fade-in">
                            {/* Name */}
                            <div className="space-y-2">
                                <label htmlFor="name" className="font-label-sm text-[11px] md:text-[12px] text-black/60 uppercase tracking-[0.2em] block">
                                    {t.signup.nameLabel || "Full Name"}
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="your Full Name"
                                    required
                                    className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body-md rounded-none px-0 transition-all focus:border-black focus:outline-none placeholder:text-black/40 text-black"
                                />
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <label htmlFor="email" className="font-label-sm text-[11px] md:text-[12px] text-black/60 uppercase tracking-[0.2em] block">
                                    {t.signup.emailLabel}
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@example.com"
                                    required
                                    className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body-md rounded-none px-0 transition-all focus:border-black focus:outline-none placeholder:text-black/40 text-black"
                                    style={{ direction: locale === 'ar' ? 'rtl' : 'ltr' }}
                                />
                            </div>

                            {/* Contact Number */}
                            <div className="space-y-2">
                                <label htmlFor="phone" className="font-label-sm text-[11px] md:text-[12px] text-black/60 uppercase tracking-[0.2em] block">
                                    {t.signup.phoneLabel || "Contact Number"}
                                </label>
                                <input
                                    id="phone"
                                    type="text"
                                    value={phone}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, "");
                                        if (val.length <= 9) {
                                            setPhone(val);
                                        }
                                    }}
                                    placeholder="501234567"
                                    required
                                    className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body-md rounded-none px-0 transition-all focus:border-black focus:outline-none placeholder:text-black/40 text-black"
                                    style={{ direction: 'ltr' }}
                                />
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <label htmlFor="password" className="font-label-sm text-[11px] md:text-[12px] text-black/60 uppercase tracking-[0.2em] block">
                                    {t.signup.passwordLabel}
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body-md rounded-none px-0 pr-10 transition-all focus:border-black focus:outline-none text-black"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-0 top-1/2 -translate-y-1/2 text-black/40 hover:text-black transition-colors"
                                        tabIndex={-1}
                                    >
                                        {/* eye icon same as before */}
                                        {showPassword ? (
                                            /* eye-off SVG */
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-eye-off">
                                                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5 0-9.27-3-11-8 1.02-2.4 2.86-4.35 5.12-5.56" />
                                                <path d="M1 1l22 22" />
                                            </svg>
                                        ) : (
                                            /* eye SVG */
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-eye">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                <circle cx="12" cy="12" r="3" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div className="space-y-2">
                                <label htmlFor="confirmPassword" className="font-label-sm text-[11px] md:text-[12px] text-black/60 uppercase tracking-[0.2em] block">
                                    {t.signup.confirmPasswordLabel}
                                </label>
                                <div className="relative">
                                    <input
                                        id="confirmPassword"
                                        type={showPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body-md rounded-none px-0 pr-10 transition-all focus:border-black focus:outline-none text-black"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-0 top-1/2 -translate-y-1/2 text-black/40 hover:text-black transition-colors"
                                        tabIndex={-1}
                                    >
                                        {/* same eye icons */}
                                    </button>
                                </div>
                            </div>

                            <p className="font-label-sm text-[11px] md:text-[12px] text-black/30 tracking-widest -mt-1">
                                {t.signup.passwordInstruction}
                            </p>

                            {error && <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md border border-red-200">{error}</div>}
                            {success && <div className="text-green-600 text-sm text-center bg-green-50 p-3 rounded-md border border-green-200">{success}</div>}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-12 md:h-13 bg-black text-white font-label-sm text-[12px] md:text-[13px] uppercase tracking-[0.25em] hover:bg-black/80 transition-all duration-300 active:scale-[0.98] mt-6 md:mt-7 disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        {t.signup.buttonProgressLabel}
                                    </span>
                                ) : (
                                    t.signup.buttonLabel
                                )}
                            </button>

                            {/* Divider & social buttons – same as your original */}
                            <div className="relative py-3 flex items-center">
                                <div className="grow border-t border-black/10"></div>
                                <span className="shrink mx-3 md:mx-4 font-label-sm text-[10px] md:text-[11px] text-black/40 uppercase tracking-[0.2em]">
                                    {t.signup.or}
                                </span>
                                <div className="grow border-t border-black/10"></div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 md:gap-4">
                                <button
                                    type="button"
                                    onClick={handleGoogleSignUp}
                                    className="h-11 md:h-12 w-full border border-black/15 bg-transparent hover:border-black hover:bg-black transition-all duration-300 group hover:cursor-pointer"
                                >
                                    <span className="flex items-center justify-center gap-2 h-full leading-none">
                                        <Image src={images.google_icon.src} alt="Google icon" width={16} height={16} className="block shrink-0 group-hover:invert transition-all duration-300" />
                                        <span className="text-[10px] md:text-[11px] uppercase tracking-[0.12em] text-black/70 group-hover:text-white leading-none flex items-center">Google</span>
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAppleSignUp}
                                    className="h-11 md:h-12 w-full border border-black/15 bg-transparent hover:border-black hover:bg-black transition-all duration-300 group hover:cursor-pointer"
                                >
                                    <span className="flex items-center justify-center gap-2 h-full leading-none">
                                        <Image src={images.apple_icon.src} alt="Apple icon" width={16} height={16} className="block shrink-0 group-hover:invert transition-all duration-300" />
                                        <span className="text-[10px] md:text-[11px] uppercase tracking-[0.12em] text-black/70 group-hover:text-white leading-none flex items-center">Apple</span>
                                    </span>
                                </button>
                            </div>
                        </form>

                        <footer className="mt-10 md:mt-12 pt-6 border-t border-black/10 text-center fade-in">
                            <p className="font-body-md text-[12px] md:text-[13px] text-black/50 uppercase tracking-[0.15em]">
                                {t.signup.alreadyLabel}
                                <Link href="/auth/login" className="text-black font-medium hover:underline underline-offset-4 ml-2">
                                    {t.signup.signInLabel}
                                </Link>
                            </p>
                            <div className="flex justify-center gap-5 md:gap-6 mt-4">
                                <Link href={`/${locale}/privacy`} className="font-label-sm text-[9px] md:text-[10px] text-black/30 uppercase tracking-[0.15em] hover:text-black/60 transition-colors">
                                    {t.signup.privacyLabel}
                                </Link>
                                <Link href={`/${locale}/terms`} className="font-label-sm text-[9px] md:text-[10px] text-black/30 uppercase tracking-[0.15em] hover:text-black/60 transition-colors">
                                    {t.signup.termsLabel}
                                </Link>
                            </div>
                            <p className="font-label-sm text-[9px] md:text-[10px] text-black/20 mt-4 tracking-widest">
                                {t.signup.copyrightLabel}
                            </p>
                        </footer>
                    </motion.div>
                </div>
            </section>
        </main>
    );
}