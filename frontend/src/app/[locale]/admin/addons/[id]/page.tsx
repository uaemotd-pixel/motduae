"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, getApiErrorMessage } from "@/lib/api/client";
import FormField from "@/components/admin/FormField";
import ImageUpload from "@/components/admin/ImageUpload";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { FormPageSkeleton } from "@/components/ui/Skeleton";
import ReadyMadePickupAddressFields from "@/components/admin/ReadyMadePickupAddressFields";
import { pickupAddressErrors } from "@/lib/readyMadeAdmin";
import {
  emptyShopPickupAddress,
  normalizeShopPickupAddress,
  type ShopPickupAddress,
} from "@/lib/fabricShop";

interface AddOnFormData {
  name: string;
  nameAr: string;
  slug: string;
  price: number;
  stock: number;
  description: string;
  descriptionAr: string;
  tag: string;
  tagAr: string;
  thumbnailImage: string;
  images: string[];
  isActive: boolean;
  pickupAddress: ShopPickupAddress;
}

export default function AdminEditAddOnPage() {
  const { user } = useAuth();
  const userName = user?.name || "MOTD Admin";
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dbTags, setDbTags] = useState<
    { name: string; nameAr: string; _id: string }[]
  >([]);
  const [tagsLoading, setTagsLoading] = useState(true);

  const [formData, setFormData] = useState<AddOnFormData>({
    name: "",
    nameAr: "",
    slug: "",
    price: 0,
    stock: 0,
    description: "",
    descriptionAr: "",
    tag: "",
    tagAr: "",
    thumbnailImage: "",
    images: [""],
    isActive: true,
    pickupAddress: emptyShopPickupAddress(),
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Fetch tags from DB
  useEffect(() => {
    const fetchTags = async () => {
      try {
        setTagsLoading(true);
        const data =
          await api.get<{ name: string; nameAr: string; _id: string }[]>(
            "/api/filters/tags",
          );
        if (Array.isArray(data)) {
          setDbTags(data);
        }
      } catch {
        // Silently fall back to empty array
      } finally {
        setTagsLoading(false);
      }
    };
    fetchTags();
  }, []);

  useEffect(() => {
    const fetchAddOn = async () => {
      try {
        setLoading(true);
        const data = await api.get<any>(`/api/admin/addons/${id}`);
        if (data) {
          const gallery =
            Array.isArray(data.images) && data.images.length > 0
              ? [...data.images]
              : [""];

          setFormData({
            name: data.name || "",
            nameAr: data.nameAr || "",
            slug: data.slug || "",
            price: data.price || 0,
            stock: data.stock || 0,
            description: data.description || "",
            descriptionAr: data.descriptionAr || "",
            tag: data.tag || "",
            tagAr: data.tagAr || "",
            thumbnailImage: data.thumbnailImage || "",
            images: gallery,
            isActive: data.isActive !== undefined ? data.isActive : true,
            pickupAddress: normalizeShopPickupAddress(data.pickupAddress),
          });
        }
      } catch (err: any) {
        setError(getApiErrorMessage(err, "Failed to load addon details"));
        toast.error(getApiErrorMessage(err, "Failed to load addon details"));
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchAddOn();
  }, [id]);

  const addImageField = () => {
    if (formData.images.length < 5) {
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ""],
      }));
    }
  };

  const removeImageField = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleTextChange = (
    key: keyof AddOnFormData,
    value: string | number | boolean,
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleGalleryImageChange = (index: number, url: string) => {
    setFormData((prev) => {
      const updated = [...prev.images];
      updated[index] = url;
      return { ...prev, images: updated };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.nameAr || !formData.thumbnailImage) {
      toast.error(
        "Please fill in all required fields (Name, Arabic Name, Thumbnail Image)",
      );
      return;
    }
    if (formData.price < 0 || formData.stock < 0) {
      toast.error("Price and Stock must be 0 or greater");
      return;
    }

    const pickupErrors = pickupAddressErrors(formData.pickupAddress);
    if (Object.keys(pickupErrors).length > 0) {
      setFieldErrors(pickupErrors);
      toast.error("Please fill in the pickup address");
      return;
    }
    setFieldErrors({});

    try {
      setSubmitting(true);
      setError(null);

      const cleanGallery = formData.images.filter((img) => img.trim() !== "");

      const payload = {
        ...formData,
        images: cleanGallery,
        ownerName: userName,
      };

      await api.put(`/api/admin/addons/${id}`, payload);
      toast.success("Add-on updated successfully");
      router.push("/admin/addons");
    } catch (err: any) {
      setError(getApiErrorMessage(err, "Failed to update addon"));
      toast.error(getApiErrorMessage(err, "Failed to update addon"));
    } finally {
      setSubmitting(false);
    }
  };

  // Tag options - from DB only
  const tagOptionsEn = dbTags.map((t) => ({
    value: t.name,
    label: t.name,
  }));
  const tagOptionsAr = dbTags.map((t) => ({
    value: t.nameAr || t.name,
    label: t.nameAr || t.name,
  }));

  if (loading) {
    return <FormPageSkeleton fields={8} />;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-0">
      {/* Header */}
      <div>
        <h1 className="[font-family:var(--font-display)] text-xl sm:text-2xl md:text-3xl font-light text-black tracking-tight">
          Edit Add-On Product
        </h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">
          Modify the product listing details.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 bg-white border border-gray-100 rounded-2xl p-4 sm:p-6 shadow-sm"
      >
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* USER (OWNER) */}
          <FormField label="User">
            <input
              type="text"
              disabled
              readOnly
              value={userName}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-gray-500 bg-gray-50 cursor-not-allowed"
            />
          </FormField>

          <FormField label="Product Name (English)" required>
            <input
              type="text"
              required
              placeholder="e.g. Premium Silk Scarf"
              value={formData.name}
              onChange={(e) => handleTextChange("name", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-black focus:outline-none focus:border-black bg-white transition hover:cursor-text"
            />
          </FormField>

          <FormField label="Product Name (Arabic)" required>
            <input
              type="text"
              required
              placeholder="مثال: وشاح حريري ممتاز"
              value={formData.nameAr}
              onChange={(e) => handleTextChange("nameAr", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-black focus:outline-none focus:border-black bg-white transition text-right hover:cursor-text"
              dir="rtl"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Slug">
            <input
              type="text"
              placeholder="e.g. premium-silk-scarf"
              value={formData.slug}
              onChange={(e) => handleTextChange("slug", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-black focus:outline-none focus:border-black bg-white transition hover:cursor-text"
            />
          </FormField>

          <FormField label="Price (AED)" required>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={formData.price}
              onChange={(e) =>
                handleTextChange("price", Number(e.target.value))
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-black focus:outline-none focus:border-black bg-white transition hover:cursor-text"
            />
          </FormField>

          <FormField label="Stock Qty" required>
            <input
              type="number"
              required
              min="0"
              value={formData.stock}
              onChange={(e) =>
                handleTextChange("stock", Number(e.target.value))
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-black focus:outline-none focus:border-black bg-white transition hover:cursor-text"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Description (English)">
            <textarea
              rows={3}
              placeholder="Describe the addon material, styling, etc..."
              value={formData.description}
              onChange={(e) => handleTextChange("description", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-black focus:outline-none focus:border-black bg-white transition hover:cursor-text resize-none"
            />
          </FormField>

          <FormField label="Description (Arabic)">
            <textarea
              rows={3}
              placeholder="اكتب وصفاً للمنتج..."
              value={formData.descriptionAr}
              onChange={(e) =>
                handleTextChange("descriptionAr", e.target.value)
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-black focus:outline-none focus:border-black bg-white transition text-right hover:cursor-text resize-none"
              dir="rtl"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Display Tag (English)">
            <select
              value={formData.tag}
              onChange={(e) => handleTextChange("tag", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-black focus:outline-none focus:border-black bg-white transition hover:cursor-pointer"
            >
              <option value="">Select tag (optional)</option>
              {tagOptionsEn.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Display Tag (Arabic)">
            <select
              value={formData.tagAr}
              onChange={(e) => handleTextChange("tagAr", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-black focus:outline-none focus:border-black bg-white transition text-right hover:cursor-pointer"
              dir="rtl"
            >
              <option value="">اختر الوسم (اختياري)</option>
              {tagOptionsAr.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label="Visible to Customers">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => handleTextChange("isActive", e.target.checked)}
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded text-black border-gray-300 focus:ring-black accent-black hover:cursor-pointer"
            />
            <label
              htmlFor="isActive"
              className="text-xs sm:text-sm text-gray-700 hover:cursor-pointer"
            >
              Active (Visible on public pages and home screen)
            </label>
          </div>
        </FormField>

        {/* Pickup address */}
        <div className="border-t border-gray-100 pt-6">
          <ReadyMadePickupAddressFields
            value={formData.pickupAddress}
            onChange={(pickupAddress) =>
              setFormData((prev) => ({ ...prev, pickupAddress }))
            }
            fieldErrors={fieldErrors}
          />
        </div>

        {/* Thumbnail Image */}
        <div className="border-t border-gray-100 pt-6">
          <FormField label="Thumbnail Image (Required)" required>
            <ImageUpload
              value={formData.thumbnailImage}
              onChange={(url) => handleTextChange("thumbnailImage", url)}
              uploadEndpoint="/api/admin/uploads/addons"
            />
          </FormField>
        </div>

        {/* Gallery Images */}
        <div className="border-t border-gray-100 pt-6 space-y-4">
          <div className="mb-2 flex justify-between items-center">
            <label className="font-label-sm text-[10px] sm:text-[11px] text-black/60 uppercase tracking-[0.2em] block">
              Gallery Images (Optional, max 5)
            </label>
            {formData.images.length < 5 && (
              <button
                type="button"
                onClick={addImageField}
                className="text-[10px] sm:text-xs text-black underline hover:cursor-pointer"
              >
                + Add Image
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {formData.images.map((imgUrl, index) => (
              <div key={index} className="space-y-1">
                <FormField label={`Gallery Image ${index + 1}`}>
                  <ImageUpload
                    value={imgUrl}
                    onChange={(url) => handleGalleryImageChange(index, url)}
                    uploadEndpoint="/api/admin/uploads/addons"
                  />
                </FormField>
                {formData.images.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeImageField(index)}
                    className="text-[10px] sm:text-xs text-red-500 hover:cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 border-t border-gray-100 pt-6">
          <button
            type="button"
            onClick={() => router.push("/admin/addons")}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm text-black bg-white hover:bg-gray-50 hover:cursor-pointer transition"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-black text-white rounded-lg text-xs sm:text-sm hover:bg-gray-800 disabled:opacity-50 hover:cursor-pointer transition"
            disabled={submitting}
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
