"use client";

import { useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { api, getApiErrorMessage } from "@/lib/api/client";
import FabricAdminFormFields from "@/components/admin/FabricAdminFormFields";
import { getTranslation } from "@/lib/getTranslation";
import {
  defaultFabricForm,
  FabricFormData,
  getFabricAgeFieldErrors,
  mapFabricApiErrorToFieldErrors,
  PickupAddress,
  toFabricApiPayload,
  validateFabricForm,
} from "@/lib/createFabricAdmin";

export default function NewFabricPage() {
  const router = useRouter();
  const params = useParams();
  const localeParam = params.locale as string;
  const t = getTranslation(localeParam);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<FabricFormData>(defaultFabricForm());

  const handleChange = (field: keyof FabricFormData, value: unknown) => {
    setFormData((prev) => {
      const nextFormData = { ...prev, [field]: value };

      if (field === "minAge" || field === "maxAge") {
        const ageErrors = getFabricAgeFieldErrors(nextFormData);
        setFieldErrors((prevErrors) => {
          const nextErrors = { ...prevErrors };

          delete nextErrors.minAge;
          delete nextErrors.maxAge;

          return { ...nextErrors, ...ageErrors };
        });
      } else if (fieldErrors[field]) {
        setFieldErrors((prevErrors) => ({ ...prevErrors, [field]: "" }));
      }

      return nextFormData;
    });
  };

  const handlePickupAddressChange = (
    subfield: keyof PickupAddress,
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      pickupAddress: { ...prev.pickupAddress, [subfield]: value },
    }));
    const key = `pickupAddress.${subfield}`;
    if (fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleImageChange = (index: number, url: string) => {
    const newImages = [...formData.images];
    newImages[index] = url;
    handleChange("images", newImages);
  };

  const addImageField = () => {
    if (formData.images.length < 5) {
      handleChange("images", [...formData.images, ""]);
    }
  };

  const removeImageField = (index: number) => {
    handleChange(
      "images",
      formData.images.filter((_, i) => i !== index),
    );
  };

  const validate = (): boolean => {
    const errors = validateFabricForm(formData, t.adminFabrics.validation);
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setError(null);
    setLoading(true);
    try {
      const payload = toFabricApiPayload(formData, { includeIsActive: true });
      await api.post("/api/admin/fabrics", payload);
      toast.success("Fabric created successfully");
      router.push("/admin/fabrics");
    } catch (err: unknown) {
      const message = getApiErrorMessage(
        err,
        t.adminFabrics.errors.create_failed,
      );
      const nextFieldErrors = mapFabricApiErrorToFieldErrors(message);
      if (Object.keys(nextFieldErrors).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...nextFieldErrors }));
      }
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-0">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-light text-black tracking-tight">
          {t.adminFabrics.create.title}
        </h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">
          {t.adminFabrics.create.subtitle}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs sm:text-sm">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6"
      >
        <FabricAdminFormFields
          formData={formData}
          fieldErrors={fieldErrors}
          onFieldChange={handleChange}
          onPickupChange={handlePickupAddressChange}
          onImageChange={handleImageChange}
          onAddImage={addImageField}
          onRemoveImage={removeImageField}
        />

        <div className="flex flex-col-reverse sm:flex-row-reverse gap-2 sm:gap-3 pt-6 mt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50 hover:cursor-pointer text-sm"
          >
            {loading
              ? t.adminFabrics.create.submitting
              : t.adminFabrics.create.submit}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition hover:cursor-pointer text-sm"
          >
            {t.adminFabrics.form.cancel_button}
          </button>
        </div>
      </form>
    </div>
  );
}
