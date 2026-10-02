"use client";

import { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api/client";
import { resolveMediaUrl } from "@/lib/media";
import { loadLicencePreview, openLicenceFile } from "@/lib/licenceFile";
import { uploadPartnerApplicationFile } from "@/lib/partnerApplication";

type PartnerFileUploadProps = {
  value: string;
  variant: "logo" | "licence";
  onChange: (url: string) => void;
  chooseFileLabel: string;
  uploadingLabel: string;
  uploadFailedLabel: string;
  removeLabel: string;
};

export default function PartnerFileUpload({
  value,
  variant,
  onChange,
  chooseFileLabel,
  uploadingLabel,
  uploadFailedLabel,
  removeLabel,
}: PartnerFileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const accept =
    variant === "licence" ? "image/*,application/pdf" : "image/*";
  const isPdf = value.toLowerCase().includes(".pdf");
  const [licencePreview, setLicencePreview] = useState("");
  const previewSrc =
    variant === "licence"
      ? licencePreview
      : value && !isPdf
        ? resolveMediaUrl(value)
        : "";

  useEffect(() => {
    if (variant !== "licence" || !value || isPdf) {
      setLicencePreview("");
      return;
    }
    let cancelled = false;
    let objectUrl = "";
    loadLicencePreview("/api/partner-applications/licence")
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setLicencePreview(url);
      })
      .catch(() => {
        if (!cancelled) setLicencePreview("");
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [variant, value, isPdf]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (variant === "logo" && !file.type.startsWith("image/")) {
      setUploadError("Please choose an image file.");
      return;
    }
    if (
      variant === "licence" &&
      !file.type.startsWith("image/") &&
      file.type !== "application/pdf"
    ) {
      setUploadError("Please choose an image or PDF.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      const result = await uploadPartnerApplicationFile(file, variant);
      if (!result.url?.trim()) {
        throw new Error("Upload succeeded but no URL was returned.");
      }
      onChange(result.url);
    } catch (err) {
      setUploadError(getApiErrorMessage(err, uploadFailedLabel));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <input
            type="file"
            accept={accept}
            onChange={handleFileUpload}
            disabled={isUploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <button
            type="button"
            disabled={isUploading}
            className="px-4 py-2 border border-black text-[10px] uppercase tracking-[0.16em] sm:tracking-[0.2em] [font-family:var(--font-ui)] hover:bg-black hover:text-white transition disabled:opacity-50 whitespace-nowrap"
          >
            {isUploading ? uploadingLabel : chooseFileLabel}
          </button>
        </div>
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-[11px] uppercase tracking-[0.16em] text-(--color-grey-muted) hover:text-black [font-family:var(--font-ui)]"
          >
            {removeLabel}
          </button>
        ) : null}
      </div>
      {previewSrc ? (
        <img
          src={previewSrc}
          alt=""
          className="h-20 w-20 object-cover border border-(--color-border)"
        />
      ) : null}
      {isPdf && value ? (
        <button
          type="button"
          onClick={() => {
            void openLicenceFile("/api/partner-applications/licence").catch(
              (err) => {
                setUploadError(getApiErrorMessage(err, uploadFailedLabel));
              },
            );
          }}
          className="cursor-pointer border-0 bg-transparent p-0 text-[13px] underline [font-family:var(--font-body)]"
        >
          PDF
        </button>
      ) : null}
      {uploadError ? (
        <p className="text-xs text-red-500">{uploadError}</p>
      ) : null}
    </div>
  );
}
