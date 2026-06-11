"use client";

import { useState } from "react";

type ImageUploadProps = {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    error?: string;
};

export default function ImageUpload({
    value,
    onChange,
    placeholder = "Enter image URL or upload file...",
    error,
}: ImageUploadProps) {
    const [previewError, setPreviewError] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith("image/")) {
            alert("Please upload an image file");
            return;
        }

        setIsUploading(true);

        // For now, convert to data URL (client-side preview)
        // In production, replace with actual Cloudinary upload (P-07)
        const reader = new FileReader();
        reader.onloadend = () => {
            onChange(reader.result as string);
            setIsUploading(false);
        };
        reader.onerror = () => {
            alert("Failed to read file");
            setIsUploading(false);
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="w-full space-y-2">
            {/* URL input + file upload row */}
            <div className="flex flex-col sm:flex-row gap-2">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => {
                        setPreviewError(false);
                        onChange(e.target.value);
                    }}
                    placeholder={placeholder}
                    className={`flex-1 h-11 md:h-12 bg-transparent border-b text-[15px] md:text-[16px] font-body-md px-0 transition-all focus:outline-none placeholder:text-black/40 text-black ${error ? "border-red-500 focus:border-red-500" : "border-black/15 focus:border-black"
                        }`}
                />
                <div className="relative">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={isUploading}
                    />
                    <button
                        type="button"
                        disabled={isUploading}
                        className="px-3 py-2 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition"
                    >
                        {isUploading ? "Uploading..." : "Upload file"}
                    </button>
                </div>
            </div>

            {/* Preview */}
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

            {/* Error messages */}
            {(error || previewError) && (
                <p className="text-xs text-red-500">
                    {error || "Invalid image URL"}
                </p>
            )}
        </div>
    );
}