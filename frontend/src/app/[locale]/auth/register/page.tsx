// app/[locale]/auth/register/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import RegisterForm from "../../../../components/auth/registerForm"; // adjust import

export default function RegisterPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    // Redirect authenticated users away from registration page
    useEffect(() => {
        if (!isLoading && user) {
            router.replace("/");
        }
    }, [user, isLoading, router]);

    // Show loading spinner while checking auth
    if (isLoading || user) {
        return (
            <div className="h-screen flex items-center justify-center bg-[#FFFDF9]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
                    <p className="text-black/60 text-sm">Redirecting...</p>
                </div>
            </div>
        );
    }

    // Render the registration form only when user is not logged in
    return <RegisterForm />;
}