"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { api, getApiErrorMessage } from "@/lib/api/client";
import FabricAdminFormFields from "@/components/admin/FabricAdminFormFields";
import { getTranslation } from "@/lib/getTranslation";
import {
  defaultFabricForm,
  FabricFormData,
  fromApiFabric,
  PickupAddress,
  toFabricApiPayload,
  validateFabricForm,
} from "@/lib/createFabricAdmin";
import PermissionGuard from "@/lib/auth/PermissionGuard";

export default function EditFabricPage() {
  const router = useRouter();
  const params = useParams();
  const localeParam = params.locale as string;
  const id = params.id as string;
  const t = getTranslation(localeParam);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<FabricFormData | null>(null);

  useEffect(() => {
    const labels = getTranslation(localeParam);

    const fetchData = async () => {
      try {
        setLoading(true);
        let fabric: Record<string, unknown> | undefined;

        try {
          fabric = await api.get<Record<string, unknown>>(
            `/api/admin/fabrics/${id}`,
          );
        } catch (directErr: unknown) {
          const status =
            directErr && typeof directErr === "object" && "status" in directErr
              ? (directErr as { status: number }).status
              : undefined;

          if (status === 404) {
            const allItems =
              await api.get<Record<string, unknown>[]>("/api/admin/fabrics");
            fabric = allItems.find((item) => item._id === id);
          } else {
            throw directErr;
          }
        }

        if (!fabric) {
          setError(labels.adminFabrics.edit.not_found);
          return;
        }

        setFormData(fromApiFabric(fabric));
        console.log("Fabric API response:", fabric);
        console.log("Parsed formData:", fromApiFabric(fabric));
      } catch (err: unknown) {
        setError(
          getApiErrorMessage(err, labels.adminFabrics.errors.load_failed),
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, localeParam]);

  const handleChange = (field: keyof FabricFormData, value: unknown) => {
    if (!formData) return;
    setFormData((prev) => (prev ? { ...prev, [field]: value } : null));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handlePickupAddressChange = (
    subfield: keyof PickupAddress,
    value: string,
  ) => {
    if (!formData) return;
    setFormData((prev) => ({
      ...prev!,
      pickupAddress: { ...prev!.pickupAddress, [subfield]: value },
    }));
    const key = `pickupAddress.${subfield}`;
    if (fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleImageChange = (index: number, url: string) => {
    if (!formData) return;
    const newImages = [...formData.images];
    newImages[index] = url;
    handleChange("images", newImages);
  };

  const addImageField = () => {
    if (formData && formData.images.length < 5) {
      handleChange("images", [...formData.images, ""]);
    }
  };

  const removeImageField = (index: number) => {
    if (!formData) return;
    handleChange(
      "images",
      formData.images.filter((_, i) => i !== index),
    );
  };

  const validate = (): boolean => {
    if (!formData) return false;
    const errors = validateFabricForm(formData, t.adminFabrics.validation);
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData || !validate()) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = toFabricApiPayload(formData, { includeIsActive: true });
      await api.put(`/api/admin/fabrics/${id}`, payload);
      router.push("/admin/fabrics");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t.adminFabrics.errors.update_failed));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-10">{t.adminFabrics.edit.loading}</div>
    );
  }

  if (error && !formData) {
    return (
      <div className="text-center text-red-600 bg-red-50 p-6 rounded-lg max-w-md mx-auto">
        <p>{error}</p>
        <button
          onClick={() => router.push("/admin/fabrics")}
          className="mt-4 px-4 py-2 bg-black text-white rounded-lg"
        >
          {t.adminFabrics.edit.back_to_list}
        </button>
      </div>
    );
  }

  if (!formData) return null;

  return (
    <PermissionGuard requiredPerm="fabrics">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-light text-black tracking-tight">
            {t.adminFabrics.edit.title}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {t.adminFabrics.edit.subtitle}
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
              disabled={submitting}
              className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
            >
              {submitting
                ? t.adminFabrics.edit.submitting
                : t.adminFabrics.edit.submit}
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
