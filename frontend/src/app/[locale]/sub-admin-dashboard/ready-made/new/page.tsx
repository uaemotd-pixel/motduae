"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, getApiErrorMessage } from "@/lib/api/client";
import FormField from "@/components/admin/FormField";
import ImageUpload from "@/components/admin/ImageUpload";
import { getTranslation } from "@/lib/getTranslation";
import {
  defaultReadyMadeForm,
  toApiPayload,
  type ReadyMadeFormData,
} from "@/lib/readyMadeAdmin";
import toast from "react-hot-toast";
import PermissionGuard from "@/lib/auth/PermissionGuard";

// react-hot-toast needs a mounted Toaster somewhere in the app;
// success/error messages are fired from here on submit.

// Predefined tag and color options
const TAG_OPTIONS = [
  { value: "new", en: "New", ar: "جديد" },
  { value: "bestseller", en: "Bestseller", ar: "الأكثر مبيعاً" },
  { value: "premium", en: "Premium", ar: "ممتاز" },
  { value: "limited", en: "Limited", ar: "محدود" },
  { value: "exclusive", en: "Exclusive", ar: "حصري" }, // replaced Eid Special
  { value: "trending", en: "Trending", ar: "رائج" },
  { value: "handmade", en: "Handmade", ar: "يدوي" },
];

const COLOR_OPTIONS = [
  { value: "black", en: "Black", ar: "أسود" },
  { value: "white", en: "White", ar: "أبيض" },

  { value: "red", en: "Red", ar: "أحمر" },
  { value: "maroon", en: "Maroon", ar: "خمري" },
  { value: "burgundy", en: "Burgundy", ar: "عنابي" },

  { value: "pink", en: "Pink", ar: "وردي" },
  { value: "hot-pink", en: "Hot Pink", ar: "وردي فاقع" },
  { value: "rose", en: "Rose", ar: "وردي فاتح" },

  { value: "purple", en: "Purple", ar: "بنفسجي" },
  { value: "lavender", en: "Lavender", ar: "لافندر" },

  { value: "blue", en: "Blue", ar: "أزرق" },
  { value: "navy", en: "Navy Blue", ar: "كحلي" },
  { value: "royal-blue", en: "Royal Blue", ar: "أزرق ملكي" },
  { value: "sky-blue", en: "Sky Blue", ar: "أزرق سماوي" },
  { value: "turquoise", en: "Turquoise", ar: "فيروزي" },

  { value: "green", en: "Green", ar: "أخضر" },
  { value: "emerald", en: "Emerald Green", ar: "أخضر زمردي" },
  { value: "olive", en: "Olive Green", ar: "أخضر زيتوني" },
  { value: "mint", en: "Mint Green", ar: "أخضر نعناعي" },

  { value: "yellow", en: "Yellow", ar: "أصفر" },
  { value: "mustard", en: "Mustard", ar: "أصفر خردلي" },

  { value: "orange", en: "Orange", ar: "برتقالي" },
  { value: "peach", en: "Peach", ar: "خوخي" },

  { value: "brown", en: "Brown", ar: "بني" },
  { value: "chocolate", en: "Chocolate Brown", ar: "بني شوكولاتة" },
  { value: "beige", en: "Beige", ar: "بيج" },
  { value: "camel", en: "Camel", ar: "جملي" },

  { value: "grey", en: "Grey", ar: "رمادي" },
  { value: "silver", en: "Silver", ar: "فضي" },

  { value: "gold", en: "Gold", ar: "ذهبي" },
  { value: "champagne", en: "Champagne", ar: "شامبين" },
  { value: "bronze", en: "Bronze", ar: "برونزي" },

  { value: "cream", en: "Cream", ar: "كريمي" },
  { value: "ivory", en: "Ivory", ar: "عاجي" },

  { value: "multi", en: "Multi Color", ar: "متعدد الألوان" },
];

const FABRIC_TYPES = [
  { value: "chiffon", en: "Chiffon", ar: "شيفون" },
  { value: "silk velvet", en: "Silk Velvet", ar: "مخمل حرير" },
  {
    value: "tana linen cotton",
    en: "Tana Linen Cotton",
    ar: "تانة قطن الكتان",
  },
];

// Helper: sanitize name fields (allow letters, spaces, hyphens, apostrophes)
const sanitizeName = (value: string) =>
  value.replace(/[^a-zA-Z\u0600-\u06FF\s\-']/g, "");

export default function NewReadyMadePage() {
  const colorsDetailsRef = useRef<HTMLElement | null>(null);
  const router = useRouter();
  const params = useParams();
  const localeParam = params.locale as string;
  const t = getTranslation(localeParam);

  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<ReadyMadeFormData>(
    defaultReadyMadeForm(),
  );
  const [fabricWidth, setFabricWidth] = useState<"single" | "double">("single");
  const [colorsOpen, setColorsOpen] = useState(false);
  const colorsDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        colorsDropdownRef.current &&
        !colorsDropdownRef.current.contains(event.target as Node)
      ) {
        setColorsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleChange = (field: keyof ReadyMadeFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Sanitized handlers for name fields
  const handleNameChange = (
    field: "name" | "nameAr" | "tailorName" | "tailorNameAr",
    value: string,
  ) => {
    const sanitized = sanitizeName(value);
    handleChange(field, sanitized);
  };

  // Number handler – allows empty (shows as empty), sets to 0 when empty, else parse non‑negative
  const handleNumberChange = (
    field: keyof ReadyMadeFormData,
    value: string,
  ) => {
    if (value === "") {
      handleChange(field, 0);
    } else {
      const num = Number(value);
      if (!isNaN(num) && num >= 0) {
        handleChange(field, num);
      }
    }
  };

  // Helper to get display value (empty when 0)
  const getNumberDisplay = (value: number): string => {
    return value === 0 ? "" : String(value);
  };

  // Image handlers – max 5, initially one field
  const addImage = () => {
    if (formData.images.length < 5) {
      handleChange("images", [...formData.images, ""]);
    }
  };

  const removeImage = (index: number) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    handleChange("images", newImages);
  };

  const handleImageChange = (index: number, url: string) => {
    const newImages = [...formData.images];
    newImages[index] = url;
    handleChange("images", newImages);
  };

  // Color checkboxes – toggle
  const toggleColor = (colorValue: string) => {
    const current = formData.colors;
    const index = current.indexOf(colorValue);
    const updated =
      index === -1
        ? [...current, colorValue]
        : current.filter((c) => c !== colorValue);
    handleChange("colors", updated);
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) errors.name = "Name required";
    if (!formData.fabricType.trim()) errors.fabricType = "Fabric type required";

    const hasImage = formData.images.some((img) => img.trim() !== "");
    if (!hasImage) errors.images = "At least one image is required";

    if (formData.metersPerFabric <= 0)
      errors.metersPerFabric = "Meters must be greater than 0";
    if (formData.fabricPriceAED < 0)
      errors.fabricPriceAED = "Price cannot be negative";
    if (formData.mukhawarPriceAED < 0)
      errors.mukhawarPriceAED = "Price cannot be negative";
    if (formData.finalSellingPriceAED < 0)
      errors.finalSellingPriceAED = "Price cannot be negative";
    if (formData.availableFabricStock < 0)
      errors.availableFabricStock = "Stock cannot be negative";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  useEffect(() => {
    const onDocMouseDown = (ev: MouseEvent) => {
      const el = colorsDetailsRef.current;
      if (!el) return;
      const target = ev.target as Node | null;
      if (!target) return;
      if (!el.contains(target)) {
        const detailsEl = el.closest("details") as HTMLDetailsElement | null;
        if (detailsEl) detailsEl.open = false;
      }
    };

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    console.log("Create Product Button Clicked");

    if (!validate()) {
      // Build a friendly, human‑readable message
      const errorMessages = Object.values(fieldErrors).filter(Boolean);
      let errorText = "Please check the highlighted fields and try again.";
      if (errorMessages.length > 0) {
        // Show a concise summary
        errorText = `Please fix: ${errorMessages.join("; ")}.`;
      }
      toast.error(errorText);
      return;
    }

    setLoading(true);

    const firstImage = formData.images.find((img) => img.trim() !== "") || "";
    const payload = toApiPayload({
      ...formData,
      thumbnailImage: firstImage,
    });
    (payload as any).fabricWidth = fabricWidth;

    try {
      await api.post("/api/admin/ready-made", payload);
      toast.success("Product Created Successfully");
      setTimeout(() => {
        router.push("/admin/ready-made");
      }, 3000);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to create product"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PermissionGuard requiredPerm="readyMade">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-light text-black tracking-tight">
            {t.adminDashboard.title}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {t.adminDashboard.subtitle}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* NAME */}
            <FormField
              label="Name (ENG)"
              name="name"
              required
              error={fieldErrors.name}
            >
              <input
                value={formData.name}
                onChange={(e) => handleNameChange("name", e.target.value)}
                placeholder="Chiffon Silk Mukhawar"
                className="w-full py-1 border-b border-gray-300 focus:border-black outline-none text-start"
              />
            </FormField>

            {/* NAME AR */}
            <FormField
              label="Name (AR)"
              name="nameAr"
              required
              error={fieldErrors.name}
            >
              <input
                value={formData.nameAr}
                onChange={(e) => handleNameChange("nameAr", e.target.value)}
                placeholder="مخاوير شيفون حرير"
                className="w-full py-1 border-b border-gray-300 focus:border-black outline-none text-end"
              />
            </FormField>

            {/* DESCRIPTION (EN) */}
            <FormField label="Description">
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Buy our Premium Mukhawar ...."
                className="w-full py-1 border-b border-gray-300 focus:border-black outline-none text-start bg-transparent resize-none overflow-hidden leading-[1.6]"
              />
            </FormField>

            {/* DESCRIPTION (AR) */}
            <FormField label="Description (AR)">
              <textarea
                rows={2}
                value={formData.descriptionAr}
                onChange={(e) => handleChange("descriptionAr", e.target.value)}
                placeholder="... اشترِ مخورنا الفاخر"
                className="w-full py-1 border-b border-gray-300 focus:border-black outline-none text-end bg-transparent resize-none overflow-hidden leading-[1.6]"
              />
            </FormField>

            {/* CODE (optional) */}
            <FormField label="Code (OPTIONAL)" name="code">
              <input
                value={formData.code}
                onChange={(e) => handleChange("code", e.target.value)}
                placeholder="0000"
                className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
              />
            </FormField>

            {/* STOCK */}
            <FormField
              label="Available Stock"
              error={fieldErrors.availableFabricStock}
              required
            >
              <input
                type="number"
                min="0"
                step="1"
                placeholder="05"
                value={getNumberDisplay(formData.availableFabricStock)}
                onChange={(e) =>
                  handleNumberChange("availableFabricStock", e.target.value)
                }
                className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
              />
            </FormField>

            {/* FABRIC TYPE */}
            <FormField label="Fabric Type (ENG)" name="fabricType" required>
              <select
                value={formData.fabricType}
                onChange={(e) => handleChange("fabricType", e.target.value)}
                className="w-full py-1 border-b border-gray-300 focus:border-black outline-none bg-transparent"
              >
                <option value="">Select Fabric Type</option>
                {FABRIC_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.en}
                  </option>
                ))}
              </select>
            </FormField>

            {/* FABRIC TYPE AR */}
            <FormField label="Fabric Type (AR)" name="fabricTypeAr" required>
              <select
                value={formData.fabricTypeAr}
                onChange={(e) => handleChange("fabricTypeAr", e.target.value)}
                className="w-full py-1 border-b border-gray-300 focus:border-black outline-none bg-transparent text-right"
              >
                <option value="">اختر نوع القماش</option>
                {FABRIC_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.ar}
                  </option>
                ))}
              </select>
            </FormField>

            {/* TAILOR NAME */}
            <FormField label="Tailor Name (ENG)" name="tailorName">
              <input
                value={formData.tailorName}
                onChange={(e) => handleNameChange("tailorName", e.target.value)}
                placeholder="Zahra Bint Qasim"
                className="w-full py-1 border-b border-gray-300 focus:border-black outline-none text-start"
              />
            </FormField>

            {/* TAILOR NAME AR */}
            <FormField label="Tailor Name (AR)" name="tailorNameAr">
              <input
                value={formData.tailorNameAr}
                onChange={(e) =>
                  handleNameChange("tailorNameAr", e.target.value)
                }
                placeholder="زهرة بنت قاسم"
                className="w-full py-1 border-b border-gray-300 focus:border-black outline-none text-end"
              />
            </FormField>

            {/* METERS */}
            <FormField
              label="Fabric length (in meters)"
              error={fieldErrors.metersPerFabric}
              required
            >
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="3.5"
                value={getNumberDisplay(formData.metersPerFabric)}
                onChange={(e) => {
                  if (e.target.value === "") {
                    handleChange("metersPerFabric", 0);
                  } else {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val >= 0) {
                      handleChange("metersPerFabric", val);
                    }
                  }
                }}
                className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
              />
            </FormField>

            {/* FABRIC WIDTH – radio buttons */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
                Fabric Width
              </label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="fabricWidth"
                    value="single"
                    checked={fabricWidth === "single"}
                    onChange={() => setFabricWidth("single")}
                    className="accent-black"
                  />
                  Single Width
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="fabricWidth"
                    value="double"
                    checked={fabricWidth === "double"}
                    onChange={() => setFabricWidth("double")}
                    className="accent-black"
                  />
                  Double Width
                </label>
              </div>
            </div>

            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                label="Fabric Price AED"
                error={fieldErrors.fabricPriceAED}
              >
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="450"
                  value={getNumberDisplay(formData.fabricPriceAED)}
                  onChange={(e) =>
                    handleNumberChange("fabricPriceAED", e.target.value)
                  }
                  className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
                />
              </FormField>

              <FormField
                label="Mukhawar Price AED"
                error={fieldErrors.mukhawarPriceAED}
              >
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="650"
                  value={getNumberDisplay(formData.mukhawarPriceAED)}
                  onChange={(e) =>
                    handleNumberChange("mukhawarPriceAED", e.target.value)
                  }
                  className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
                />
              </FormField>

              <FormField
                label="Final Selling Price AED"
                error={fieldErrors.finalSellingPriceAED}
                required
              >
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="1250"
                  value={getNumberDisplay(formData.finalSellingPriceAED)}
                  onChange={(e) =>
                    handleNumberChange("finalSellingPriceAED", e.target.value)
                  }
                  className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
                />
              </FormField>
            </div>

            {/* TAG + Color in one line (md+) */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="Tag (ENG)" name="tag">
                <select
                  value={formData.tag}
                  onChange={(e) => handleChange("tag", e.target.value)}
                  className="w-full py-1 border-b border-gray-300 focus:border-black outline-none text-start bg-transparent"
                >
                  <option value="">Select tag</option>
                  {TAG_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.en}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Tag (AR)" name="tagAr">
                <select
                  value={formData.tagAr}
                  onChange={(e) => handleChange("tagAr", e.target.value)}
                  className="w-full py-1 border-b border-gray-300 focus:border-black outline-none text-end bg-transparent"
                >
                  <option value="">اختر الوسم</option>
                  {TAG_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.ar}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Colors" name="colors" required>
                <div className="relative" ref={colorsDropdownRef}>
                  {/* Select field */}
                  <button
                    type="button"
                    onClick={() => setColorsOpen((prev) => !prev)}
                    className="w-full py-1 border-b border-gray-300 focus:border-black text-left bg-transparent min-h-7 flex items-center"
                  >
                    {formData.colors.length === 0 ? (
                      <span className="text-xs text-black/60 leading-none">
                        Select colors
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-2 items-center">
                        {COLOR_OPTIONS.filter((c) =>
                          formData.colors.includes(c.value),
                        ).map((c) => (
                          <span
                            key={c.value}
                            className="inline-flex items-center justify-center"
                            title={c.en}
                          >
                            <span
                              className="w-5 h-5 rounded-full border border-gray-200"
                              style={{ background: c.value }}
                            />
                          </span>
                        ))}
                      </div>
                    )}
                  </button>

                  {/* Dropdown */}
                  {colorsOpen && (
                    <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-sm p-3 z-50">
                      <div className="max-h-44 overflow-auto flex flex-col gap-2">
                        {COLOR_OPTIONS.map((opt) => {
                          const selected = formData.colors.includes(opt.value);

                          return (
                            <label
                              key={opt.value}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleColor(opt.value)}
                                className="accent-black"
                              />

                              <span className="inline-flex items-center gap-2">
                                <span
                                  className="w-4 h-4 rounded-full border border-gray-200"
                                  style={{ background: opt.value }}
                                />
                                <span className="text-xs">
                                  {opt.en} / {opt.ar}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </FormField>
            </div>

            {/* IMAGES – starts with one field, max 5 */}
            <div className="md:col-span-2">
              <div className="mb-2 text-xs uppercase tracking-widest text-gray-500">
                Images (max 5) *
              </div>
              {fieldErrors.images && (
                <p className="text-red-500 text-sm mb-2">
                  {fieldErrors.images}
                </p>
              )}

              {formData.images.map((img, idx) => (
                <div key={idx} className="mb-3">
                  <ImageUpload
                    value={img}
                    onChange={(val) => handleImageChange(idx, val)}
                    chooseFileLabel={`Upload Image ${idx + 1}`}
                    uploadingLabel="Uploading..."
                    uploadFailedLabel="Failed"
                    removeLabel="Remove"
                  />
                  {formData.images.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="text-xs text-red-500 mt-1"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}

              {formData.images.length < 5 && (
                <button
                  type="button"
                  onClick={addImage}
                  className="text-xs underline"
                >
                  + Add Image
                </button>
              )}
            </div>
          </div>

          {/* SUBMIT */}
          <div className="flex gap-3 pt-6 mt-3 border-t border-gray-100">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-black text-white rounded-lg hover:cursor-pointer"
            >
              {loading ? "Saving..." : "Create Product"}
            </button>

            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </PermissionGuard>
  );
}
