// components/dashboard/CustomerImageUpload.tsx
"use client";

import { useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api/client";
import { resolveMediaUrl } from "@/lib/media";

type CustomerImageUploadProps = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  uploadEndpoint?: string;
  chooseFileLabel?: string;
  uploadingLabel?: string;
  uploadFailedLabel?: string;
  removeLabel?: string;
};

export default function CustomerImageUpload({
  value,
  onChange,
  error,
  uploadEndpoint = "/api/customer/upload-profile-pic", // changed default
  chooseFileLabel = "Upload image",
  uploadingLabel = "Uploading...",
  uploadFailedLabel = "Upload failed",
  removeLabel = "Remove",
}: CustomerImageUploadProps) {
  const [previewError, setPreviewError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose an image file.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setPreviewError(false);

    try {
      const formData = new FormData();
      formData.append("image", file);
      const result = await api.postFormData<{
        success?: boolean;
        url?: string;
      }>(uploadEndpoint, formData);
      const uploadedUrl = result.url?.trim();
      if (!uploadedUrl) {
        throw new Error("Upload succeeded but no image URL was returned.");
      }
      onChange(uploadedUrl);
    } catch (err) {
      setUploadError(getApiErrorMessage(err, uploadFailedLabel));
    } finally {
      setIsUploading(false);
    }
  };

  const previewSrc = value ? resolveMediaUrl(value) : "";

  return (
    <div className="w-full space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <button
            type="button"
            disabled={isUploading}
            className="px-3 py-2 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition disabled:opacity-50"
          >
            {isUploading ? uploadingLabel : chooseFileLabel}
          </button>
        </div>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs text-red-500 hover:underline"
          >
            {removeLabel}
          </button>
        )}
      </div>

      {value && <p className="text-xs text-gray-500 break-all">{value}</p>}

      {previewSrc && !previewError && (
        <div className="mt-3">
          <img
            src={previewSrc}
            alt="preview"
            onError={() => setPreviewError(true)}
            className="w-24 h-24 object-cover rounded-md border border-black/10"
          />
        </div>
      )}

      {(error || uploadError || previewError) && (
        <p className="text-xs text-red-500">
          {error || uploadError || "Could not load image preview"}
        </p>
      )}
    </div>
  );
}
