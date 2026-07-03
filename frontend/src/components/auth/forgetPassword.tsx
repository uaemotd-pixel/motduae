"use client";

import { useState, FormEvent } from "react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import logoBlack from "../../../public/PNG/Black/MOTD_Wordmark_Black.png";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const [error, setError] = useState("");
    const { forgotPassword } = useAuth();

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            await forgotPassword(email);
            setIsSubmitted(true);
        } catch (err: unknown) {
            const message =
                err && typeof err === "object" && "message" in err
                    ? String((err as { message: string }).message)
                    : "Failed to send reset email.";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen w-full bg-[#FFFDF9] relative">

            {/* Desktop Logo (top-left only) */}
            <div className="hidden md:block absolute p-7.5 z-10 fade-in">
                <Link href="/" className="shrink-0 flex items-center p-7.5 -m-7.5">
                    <img
                        src="/PNG/Black/MOTD_Wordmark_Black.png"
                        alt="logoAlt"
                        className="h-3 xs:h-[13px] sm:h-3.5 md:h-4 lg:h-4.5 xl:h-5 2xl:h-5.5 3xl:h-[24px] w-auto object-contain"
                    />
                </Link>
            </div>

            {/* Mobile Logo (center top only) */}
            <div className="md:hidden flex p-7.5 fade-in">
                <Link href="/" className="shrink-0 flex items-center p-7.5 -m-7.5">
                    <img
                        src="/PNG/Black/MOTD_Wordmark_Black.png"
                        alt="logoAlt"
                        className="h-3 xs:h-[13px] sm:h-3.5 md:h-4 lg:h-4.5 xl:h-5 2xl:h-5.5 3xl:h-[24px] w-auto object-contain"
                    />
                </Link>
            </div>

            {/* Main Container */}
            <div className="min-h-screen w-full flex items-center justify-center px-6 sm:px-8 md:px-12 lg:px-16 pt-10 md:pt-0">

                <div className="w-full max-w-120 mx-auto py-12 md:py-20 lg:py-24">

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                    >

                        {!isSubmitted ? (
                            <>
                                {/* Header */}
                                <header className="mb-10 md:mb-12 fade-in">

                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="block w-8 h-px bg-black/20"></span>
                                        <span className="font-label-sm text-[11px] md:text-[12px] tracking-[0.3em] text-black/40 uppercase">
                                            NEED HELP?
                                        </span>
                                    </div>

                                    <h2 className="font-headline-lg text-[28px] sm:text-[32px] md:text-[38px] lg:text-[44px] uppercase mb-3 tracking-[-0.01em] text-black">
                                        FORGOT PASSWORD
                                    </h2>

                                    <p className="font-body-md text-[14px] sm:text-[15px] md:text-[16px] text-black/50 leading-relaxed">
                                        Enter your registered email address and we’ll send you a link to reset your password.
                                    </p>
                                </header>

                                {/* Form */}
                                <form onSubmit={handleSubmit} className="space-y-6 md:space-y-7 fade-in">

                                    {/* Email */}
                                    <div className="space-y-2">
                                        <label
                                            htmlFor="email"
                                            className="font-label-sm text-[11px] md:text-[12px] text-black/60 uppercase tracking-[0.2em] block"
                                        >
                                            EMAIL ADDRESS
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

                                    {error && (
                                        <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md border border-red-200">
                                            {error}
                                        </div>
                                    )}

                                    {/* Button */}
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full h-12 md:h-13 bg-black text-white font-label-sm text-[12px] md:text-[13px] uppercase tracking-[0.25em] hover:bg-black/80 transition-all duration-300 active:scale-[0.98] mt-6 md:mt-7 disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
                                    >
                                        {isLoading ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <svg
                                                    className="animate-spin h-4 w-4 text-white"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                >
                                                    <circle
                                                        className="opacity-25"
                                                        cx="12"
                                                        cy="12"
                                                        r="10"
                                                        stroke="currentColor"
                                                        strokeWidth="4"
                                                    />
                                                    <path
                                                        className="opacity-75"
                                                        fill="currentColor"
                                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                    />
                                                </svg>
                                                SENDING...
                                            </span>
                                        ) : (
                                            "SEND RESET LINK"
                                        )}
                                    </button>
                                </form>

                                {/* Back */}
                                <footer className="mt-8 md:mt-10 pt-6 border-t border-black/10 text-center fade-in">
                                    <p className="font-body-md text-[12px] md:text-[13px] text-black/50 uppercase tracking-[0.15em]">
                                        Remember your password?
                                        <Link
                                            href="/auth/login"
                                            className="text-black font-medium hover:underline underline-offset-4 ml-2"
                                        >
                                            BACK TO SIGN IN
                                        </Link>
                                    </p>
                                </footer>
                            </>
                        ) : (
                            /* Success State */
                            <div className="fade-in">

                                <header className="mb-10 md:mb-12">

                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="block w-8 h-px bg-green-500/40"></span>
                                        <span className="font-label-sm text-[11px] md:text-[12px] tracking-[0.3em] text-green-600/70 uppercase">
                                            CHECK YOUR INBOX
                                        </span>
                                    </div>

                                    <h2 className="font-headline-lg text-[32px] sm:text-[36px] md:text-[42px] lg:text-[48px] uppercase mb-3 tracking-[-0.01em] text-black">
                                        EMAIL SENT
                                    </h2>

                                    <p className="text-black/50">
                                        We’ve sent a reset link to:
                                    </p>

                                    <p className="font-medium text-black mt-2 break-all">
                                        {email}
                                    </p>

                                    <p className="text-black/50 mt-4">
                                        Please check your email and follow the instructions.
                                    </p>
                                </header>

                                <div className="space-y-4">

                                    <Link
                                        href="/auth/login"
                                        className="w-full h-12 md:h-13 bg-black text-white font-label-sm text-[12px] md:text-[13px] uppercase tracking-[0.25em] hover:bg-black/80 transition-all duration-300 active:scale-[0.98] flex items-center justify-center"
                                    >
                                        BACK TO SIGN IN
                                    </Link>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsSubmitted(false);
                                            setEmail("");
                                        }}
                                        className="w-full h-11 md:h-12 bg-transparent border border-black/15 text-black font-label-sm text-[11px] md:text-[12px] uppercase tracking-[0.25em] hover:border-black hover:bg-black hover:text-white transition-all duration-300"
                                    >
                                        TRY DIFFERENT EMAIL
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>

                    {/* Footer */}
                    <div className="mt-12 pt-6 border-t border-black/10 text-center">
                        <div className="flex justify-center gap-6">
                            <Link
                                href="/privacy"
                                className="text-[10px] text-black/30 uppercase tracking-[0.15em] hover:text-black/60"
                            >
                                Privacy
                            </Link>
                            <Link
                                href="/terms"
                                className="text-[10px] text-black/30 uppercase tracking-[0.15em] hover:text-black/60"
                            >
                                Terms
                            </Link>
                        </div>

                        <p className="text-[10px] text-black/20 mt-4 tracking-widest">
                            © 2024 MOTD BESPOKE • UAE
                        </p>
                    </div>

                </div>
            </div>

            {/* Animation */}
            <style jsx>{`
                .fade-in {
                    animation: fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                    opacity: 0;
                }

                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(8px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </main>
    );
}