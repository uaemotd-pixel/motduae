"use client";

import { useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api/client";
import { resolveMediaUrl } from "@/lib/media";

type FabricImageUploadSingleProps = {
  multiple?: false;
  value: string;
  onChange: (value: string) => void;
  values?: never;
  onValuesChange?: never;
  maxFiles?: never;
  error?: string;
  uploadEndpoint?: string;
  chooseFileLabel?: string;
  uploadingLabel?: string;
  uploadFailedLabel?: string;
  removeLabel?: string;
};

type FabricImageUploadMultipleProps = {
  multiple: true;
  values: string[];
  onValuesChange: (values: string[]) => void;
  value?: never;
  onChange?: never;
  maxFiles?: number;
  error?: string;
  uploadEndpoint?: string;
  chooseFileLabel?: string;
  uploadingLabel?: string;
  uploadFailedLabel?: string;
  removeLabel?: string;
};

type FabricImageUploadProps =
  | FabricImageUploadSingleProps
  | FabricImageUploadMultipleProps;

export default function FabricImageUpload(props: FabricImageUploadProps) {
  const {
    error,
    uploadEndpoint = "/api/admin/uploads/fabrics",
    chooseFileLabel = "Upload image",
    uploadingLabel = "Uploading...",
    uploadFailedLabel = "Upload failed",
    removeLabel = "Remove",
  } = props;

  const isMultiple = props.multiple === true;
  const maxFiles = isMultiple ? (props.maxFiles ?? 4) : 1;
  const values = isMultiple ? props.values : props.value ? [props.value] : [];
  const remainingSlots = Math.max(0, maxFiles - values.length);

  const [previewErrors, setPreviewErrors] = useState<Record<number, boolean>>(
    {},
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const emitChange = (next: string[]) => {
    if (isMultiple) {
      props.onValuesChange(next.slice(0, maxFiles));
    } else {
      props.onChange(next[0] || "");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0 || remainingSlots <= 0) return;

    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      setUploadError("Please choose image files.");
      return;
    }

    const selected = imageFiles.slice(0, remainingSlots);
    setIsUploading(true);
    setUploadError(null);
    setPreviewErrors({});

    try {
      const uploaded: string[] = [];
      for (const file of selected) {
        const formData = new FormData();
        formData.append("image", file);
        const result = await api.postFormData<{ url?: string }>(
          uploadEndpoint,
          formData,
        );
        const uploadedUrl = result.url?.trim();
        if (!uploadedUrl) {
          throw new Error("Upload succeeded but no image URL was returned.");
        }
        uploaded.push(uploadedUrl);
      }

      if (isMultiple) {
        emitChange([...values, ...uploaded]);
        if (imageFiles.length > remainingSlots) {
          setUploadError(
            `Only ${remainingSlots} more image${remainingSlots === 1 ? "" : "s"} can be added (max ${maxFiles}).`,
          );
        }
      } else {
        emitChange([uploaded[0]]);
      }
    } catch (err) {
      setUploadError(getApiErrorMessage(err, uploadFailedLabel));
    } finally {
      setIsUploading(false);
    }
  };

  const removeAt = (index: number) => {
    const next = values.filter((_, i) => i !== index);
    emitChange(next);
    setPreviewErrors((prev) => {
      const nextErrors: Record<number, boolean> = {};
      Object.entries(prev).forEach(([key, val]) => {
        const i = Number(key);
        if (i < index) nextErrors[i] = val;
        else if (i > index) nextErrors[i - 1] = val;
      });
      return nextErrors;
    });
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <input
            type="file"
            accept="image/*"
            multiple={isMultiple}
            onChange={handleFileUpload}
            disabled={isUploading || remainingSlots <= 0}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <button
            type="button"
            disabled={isUploading || remainingSlots <= 0}
            className="px-3 py-2 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition disabled:opacity-50 hover:cursor-pointer"
          >
            {isUploading
              ? uploadingLabel
              : isMultiple && remainingSlots <= 0
                ? `Max ${maxFiles} images`
                : chooseFileLabel}
          </button>
        </div>
        {isMultiple ? (
          <span className="text-[10px] sm:text-xs text-gray-500">
            {values.length}/{maxFiles} — select multiple at once
          </span>
        ) : (
          values[0] && (
            <button
              type="button"
              onClick={() => emitChange([])}
              className="text-xs text-red-500 hover:underline hover:cursor-pointer"
            >
              {removeLabel}
            </button>
          )
        )}
      </div>

      {!isMultiple && values[0] && (
        <p className="text-xs text-gray-500 break-all">{values[0]}</p>
      )}

      {values.length > 0 && (
        <div
          className={
            isMultiple
              ? "flex flex-wrap gap-3 mt-1"
              : "mt-3"
          }
        >
          {values.map((url, index) => {
            const previewSrc = resolveMediaUrl(url);
            return (
              <div key={`${url}-${index}`} className="relative group">
                {previewSrc && !previewErrors[index] ? (
                  <img
                    src={previewSrc}
                    alt={isMultiple ? `Gallery ${index + 1}` : "preview"}
                    onError={() =>
                      setPreviewErrors((prev) => ({ ...prev, [index]: true }))
                    }
                    className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-md border border-black/10"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-md border border-black/10 bg-gray-50 flex items-center justify-center text-[10px] text-gray-400 px-1 text-center">
                    Preview unavailable
                  </div>
                )}
                {isMultiple && (
                  <button
                    type="button"
                    onClick={() => removeAt(index)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-gray-300 text-[10px] text-red-600 leading-none hover:bg-red-50 hover:cursor-pointer"
                    aria-label={removeLabel}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {(error || uploadError) && (
        <p className="text-xs text-red-500">{error || uploadError}</p>
      )}
    </div>
  );
}
