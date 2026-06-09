"use client";

import { useState } from "react";

type ImageUrlInputProps = {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    error?: string;
};

export default function ImageUrlInput({
    value,
    onChange,
    placeholder = "Enter image URL...",
    error,
}: ImageUrlInputProps) {
    const [previewError, setPreviewError] = useState(false);

    return (
        <div className="w-full space-y-2">
            {/* INPUT */}
            <input
                type="text"
                value={value}
                onChange={(e) => {
                    setPreviewError(false);
                    onChange(e.target.value);
                }}
                placeholder={placeholder}
                className={`w-full h-11 md:h-12 bg-transparent border-b text-[15px] md:text-[16px] font-body-md px-0 transition-all focus:outline-none placeholder:text-black/40 text-black ${error
                    ? "border-red-500 focus:border-red-500"
                    : "border-black/15 focus:border-black"
                    }`}
            />

            {/* PREVIEW */}
            {value && !previewError && (
                <div className="mt-3">
                    <img
                        src={value}
                        alt="preview"
                        onError={() => setPreviewError(true)}
                        className="w-24 h-24 object-cover rounded-md border border-black/10"
                    />
                </div>
            )}

            {/* ERROR (input-level or preview error) */}
            {(error || previewError) && (
                <p className="text-xs text-red-500">
                    {error || "Invalid image URL"}
                </p>
            )}
        </div>
    );
}