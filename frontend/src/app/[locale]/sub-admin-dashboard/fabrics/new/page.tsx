"use client";

import { useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, getApiErrorMessage } from "@/lib/api/client";
import FabricAdminFormFields from "@/components/admin/FabricAdminFormFields";
import { getTranslation } from "@/lib/getTranslation";
import {
  defaultFabricForm,
  FabricFormData,
  PickupAddress,
  toFabricApiPayload,
  validateFabricForm,
} from "@/lib/createFabricAdmin";
import PermissionGuard from "@/lib/auth/PermissionGuard";

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
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
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
      router.push("/admin/fabrics");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t.adminFabrics.errors.create_failed));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PermissionGuard requiredPerm="fabrics">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-light text-black tracking-tight">
            {t.adminFabrics.create.title}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {t.adminFabrics.create.subtitle}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
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

          <div className="flex gap-3 pt-6 mt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
            >
              {loading
                ? t.adminFabrics.create.submitting
                : t.adminFabrics.create.submit}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              {t.adminFabrics.form.cancel_button}
            </button>
          </div>
        </form>
      </div>
    </PermissionGuard>
  );
}
