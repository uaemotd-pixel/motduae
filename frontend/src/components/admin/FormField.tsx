"use client";

import { ReactNode } from "react";

type FormFieldProps = {
    label: string;
    name?: string;
    success?: string;
    error?: string;
    hint?: string;
    required?: boolean;
    children: ReactNode;
};

export default function FormField({
    label,
    name,
    success,
    error,
    hint,
    required,
    children,
}: FormFieldProps) {
    return (
        <div className="w-full space-y-1.5 sm:space-y-2">
            {/* LABEL */}
            <label
                htmlFor={name}
                className="font-label-sm text-[11px] md:text-[12px] text-black/60 uppercase tracking-[0.2em] block"
            >
                {label}
                {required && (
                    <span className="text-red-500 ml-1">*</span>
                )}
            </label>

            {/* INPUT WRAPPER (NO STYLING HERE) */}
            <div className="w-full">
                {children}
            </div>

            {/* HINT */}
            {hint && !error && (
                <p className="text-[11px] sm:text-xs text-black/60">
                    {hint}
                </p>
            )}

            {/* SUCCESS */}
            {success && (
                <p className="text-xs text-green-600">
                    {success}
                </p>
            )}

            {/* ERROR */}
            {error && (
                <p className="text-xs text-red-500">
                    {error}
                </p>
            )}
        </div>
    );
}