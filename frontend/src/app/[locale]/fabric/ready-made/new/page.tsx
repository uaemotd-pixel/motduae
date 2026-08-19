"use client";

import { useEffect, useRef, useState, FormEvent, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, getApiErrorMessage } from "@/lib/api/client";
import FormField from "@/components/admin/FormField";
import ImageUpload from "@/components/admin/ImageUpload";
import { getTranslation } from "@/lib/getTranslation";
import {
  defaultReadyMadeForm,
  pickupAddressErrors,
  toApiPayload,
  type ReadyMadeFormData,
} from "@/lib/readyMadeAdmin";
import ReadyMadePickupAddressFields from "@/components/admin/ReadyMadePickupAddressFields";
import { normalizeShopPickupAddress } from "@/lib/fabricShop";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import colors from "@/components/shared/colors";

const COLOR_OPTIONS = colors;

const sanitizeName = (value: string) =>
  value.replace(/[^a-zA-Z\u0600-\u06FF\s\-']/g, "");

export default function NewReadyMadePage() {
  const { user } = useAuth();
  const userName = user?.name || "";
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

  // Dropdown options states
  const [allFabrics, setAllFabrics] = useState<any[]>([]);
  const [tailorShops, setTailorShops] = useState<any[]>([]);
  const [allDesigns, setAllDesigns] = useState<any[]>([]);
  const [dbTags, setDbTags] = useState<
    { name: string; nameAr: string; _id: string }[]
  >([]);
  const [tagsLoading, setTagsLoading] = useState(true);

  // Load dropdown data
  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const [shopRes, fabricsRes, tailorsRes, designsRes, tagsRes] =
          await Promise.all([
            api.get<{ success: boolean; item: any }>("/api/fabric/shop"),
            api.get<{ success: boolean; items: any[] }>("/api/fabric/fabrics"),
            api.get<{ success: boolean; items: any[] }>("/api/tailors"),
            api.get<{ success: boolean; items: any[] }>(
              "/api/tailors/designs/all",
            ),
            api.get<{ name: string; nameAr: string; _id: string }[]>(
              "/api/filters/tags",
            ),
          ]);

        const shopId = shopRes.item?._id || "";
        setFormData((prev) => ({
          ...prev,
          fabricShopId: shopId,
          pickupAddress: prev.pickupAddress.line1
            ? prev.pickupAddress
            : normalizeShopPickupAddress(shopRes.item?.pickupAddress),
        }));

        setAllFabrics(fabricsRes.items || fabricsRes || []);
        setTailorShops(tailorsRes.items || []);
        setAllDesigns(designsRes.items || []);
        if (Array.isArray(tagsRes) && tagsRes.length > 0) {
          setDbTags(tagsRes);
        }
      } catch (err) {
        toast.error("Failed to load store or catalog data for dropdowns");
      } finally {
        setTagsLoading(false);
      }
    };
    loadDropdownData();
  }, []);

  // Close dropdown on outside click
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

  // Tag options - from DB only
  const tagOptionsEn = dbTags.map((t) => ({
    value: t.name,
    label: t.name,
    arLabel: t.nameAr || t.name,
  }));

  const handleChange = (field: keyof ReadyMadeFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNameChange = (
    field: "name" | "nameAr" | "tailorName" | "tailorNameAr",
    value: string,
  ) => {
    const sanitized = sanitizeName(value);
    handleChange(field, sanitized);
  };

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

  const getNumberDisplay = (value: number): string => {
    return value === 0 ? "" : String(value);
  };

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
    if (!formData.fabricShopId) errors.fabricShopId = "Fabric store required";
    if (!formData.fabricId) errors.fabricId = "Fabric required";

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

    Object.assign(errors, pickupAddressErrors(formData.pickupAddress));

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      const errorMessages = Object.values(fieldErrors).filter(Boolean);
      let errorText = "Please check the highlighted fields and try again.";
      if (errorMessages.length > 0) {
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
    (payload as any).ownerName = userName;

    try {
      await api.post("/api/fabric/ready-made", payload);
      toast.success("Product Created Successfully");
      setTimeout(() => {
        router.push("/fabric/ready-made");
      }, 1500);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to create product"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-0">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-light text-black tracking-tight">
          Create Ready-to-Wear
        </h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">
          Add a new ready-made piece to your store inventory
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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
              className="w-full py-1 border-b border-gray-300 focus:border-black outline-none text-start text-xs sm:text-sm hover:cursor-text"
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
              className="w-full py-1 border-b border-gray-300 focus:border-black outline-none text-end text-xs sm:text-sm hover:cursor-text"
            />
          </FormField>

          {/* DESCRIPTION (EN) */}
          <FormField label="Description">
            <textarea
              rows={1}
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Buy our Premium Mukhawar ...."
              className="w-full py-1 border-b border-gray-300 focus:border-black outline-none text-start bg-transparent resize-none overflow-hidden leading-[1.6] text-xs sm:text-sm hover:cursor-text min-h-10"
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = target.scrollHeight + "px";
              }}
            />
          </FormField>

          {/* DESCRIPTION (AR) */}
          <FormField label="Description (AR)">
            <textarea
              rows={1}
              value={formData.descriptionAr}
              onChange={(e) => handleChange("descriptionAr", e.target.value)}
              placeholder="... اشترِ مخورنا الفاخر"
              className="w-full py-1 border-b border-gray-300 focus:border-black outline-none text-end bg-transparent resize-none overflow-hidden leading-[1.6] text-xs sm:text-sm hover:cursor-text min-h-10"
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = target.scrollHeight + "px";
              }}
            />
          </FormField>

          {/* CODE (optional) */}
          <FormField label="Code (OPTIONAL)" name="code">
            <input
              value={formData.code}
              onChange={(e) => handleChange("code", e.target.value)}
              placeholder="0000"
              className="w-full py-1 border-b border-gray-300 focus:border-black outline-none text-xs sm:text-sm hover:cursor-text"
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
              className="w-full py-1 border-b border-gray-300 focus:border-black outline-none text-xs sm:text-sm hover:cursor-text"
            />
          </FormField>

          <ReadyMadePickupAddressFields
            value={formData.pickupAddress}
            onChange={(pickupAddress) =>
              handleChange("pickupAddress", pickupAddress)
            }
            fieldErrors={fieldErrors}
          />

          {/* FABRIC */}
          <FormField
            label="Fabric"
            name="fabricId"
            error={fieldErrors.fabricId}
            required
          >
            <select
              value={formData.fabricId}
              onChange={(e) => handleChange("fabricId", e.target.value)}
              className="w-full py-1 border-b border-gray-300 focus:border-black outline-none bg-transparent hover:cursor-pointer text-xs sm:text-sm"
              disabled={!formData.fabricShopId}
            >
              <option value="">Select Fabric</option>
              {allFabrics.map((f) => (
                <option key={f._id} value={f._id}>
                  {localeParam === "ar" ? f.nameAr || f.name : f.name}
                </option>
              ))}
            </select>
          </FormField>

          {/* TAILOR SHOP */}
          <FormField
            label="Tailor Shop (Optional)"
            name="tailorShopId"
            error={fieldErrors.tailorShopId}
          >
            <select
              value={formData.tailorShopId}
              onChange={(e) => {
                const shopId = e.target.value;
                handleChange("tailorShopId", shopId);
                handleChange("designId", "");
              }}
              className="w-full py-1 border-b border-gray-300 focus:border-black outline-none bg-transparent hover:cursor-pointer text-xs sm:text-sm"
            >
              <option value="">Select Tailor Shop</option>
              {tailorShops.map((shop) => (
                <option key={shop._id} value={shop._id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </FormField>

          {/* DESIGN */}
          <FormField
            label="Design (Optional)"
            name="designId"
            error={fieldErrors.designId}
          >
            <select
              value={formData.designId}
              onChange={(e) => handleChange("designId", e.target.value)}
              className="w-full py-1 border-b border-gray-300 focus:border-black outline-none bg-transparent hover:cursor-pointer text-xs sm:text-sm"
              disabled={!formData.tailorShopId}
            >
              <option value="">Select Design</option>
              {allDesigns
                .filter((d) => {
                  const shopId =
                    typeof d.tailorShopId === "object"
                      ? d.tailorShopId?._id
                      : d.tailorShopId;
                  return shopId === formData.tailorShopId;
                })
                .map((d) => (
                  <option key={d._id} value={d._id}>
                    {localeParam === "ar" ? d.nameAr || d.name : d.name}
                  </option>
                ))}
            </select>
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
              className="w-full py-1 border-b border-gray-300 focus:border-black outline-none text-xs sm:text-sm hover:cursor-text"
            />
          </FormField>

          {/* FABRIC WIDTH – radio buttons */}
          <div>
            <label className="block text-[10px] sm:text-xs uppercase tracking-widest text-gray-500 mb-2">
              Fabric Width
            </label>
            <div className="flex gap-4 sm:gap-6 text-xs sm:text-sm">
              <label className="flex items-center gap-1.5 sm:gap-2 hover:cursor-pointer">
                <input
                  type="radio"
                  name="fabricWidth"
                  value="single"
                  checked={fabricWidth === "single"}
                  onChange={() => setFabricWidth("single")}
                  className="accent-black hover:cursor-pointer w-3.5 h-3.5 sm:w-4 sm:h-4"
                />
                <span className="hover:cursor-pointer">Single Width</span>
              </label>
              <label className="flex items-center gap-1.5 sm:gap-2 hover:cursor-pointer">
                <input
                  type="radio"
                  name="fabricWidth"
                  value="double"
                  checked={fabricWidth === "double"}
                  onChange={() => setFabricWidth("double")}
                  className="accent-black hover:cursor-pointer w-3.5 h-3.5 sm:w-4 sm:h-4"
                />
                <span className="hover:cursor-pointer">Double Width</span>
              </label>
            </div>
          </div>

          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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
                className="w-full py-1 border-b border-gray-300 focus:border-black outline-none text-xs sm:text-sm hover:cursor-text"
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
                className="w-full py-1 border-b border-gray-300 focus:border-black outline-none text-xs sm:text-sm hover:cursor-text"
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
                className="w-full py-1 border-b border-gray-300 focus:border-black outline-none text-xs sm:text-sm hover:cursor-text"
              />
            </FormField>
          </div>

          {/* TAG + Color */}
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <FormField label="Tag (ENG)" name="tag">
              <select
                value={formData.tag}
                onChange={(e) => handleChange("tag", e.target.value)}
                className="w-full py-1 border-b border-gray-300 focus:border-black outline-none text-start bg-transparent text-xs sm:text-sm hover:cursor-pointer"
              >
                <option value="">Select tag</option>
                {tagOptionsEn.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Tag (AR)" name="tagAr">
              <select
                value={formData.tagAr}
                onChange={(e) => handleChange("tagAr", e.target.value)}
                className="w-full py-1 border-b border-gray-300 focus:border-black outline-none text-end bg-transparent text-xs sm:text-sm hover:cursor-pointer"
              >
                <option value="">اختر الوسم</option>
                {tagOptionsEn.map((opt) => (
                  <option key={opt.value} value={opt.arLabel}>
                    {opt.arLabel}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Colors" name="colors" required>
              <div className="relative" ref={colorsDropdownRef}>
                <button
                  type="button"
                  onClick={() => setColorsOpen((prev) => !prev)}
                  className="w-full py-1 border-b border-gray-300 focus:border-black text-left bg-transparent min-h-7 flex items-center hover:cursor-pointer"
                >
                  {formData.colors.length === 0 ? (
                    <span className="text-[10px] sm:text-xs text-black/60 leading-none">
                      Select colors
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1 sm:gap-1.5 items-center">
                      {COLOR_OPTIONS.filter((c) =>
                        formData.colors.includes(c.value),
                      ).map((c) => (
                        <span
                          key={c.value}
                          className="inline-flex items-center justify-center"
                          title={c.en}
                        >
                          <span
                            className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-gray-200 shrink-0"
                            style={{ background: c.hex }}
                          />
                        </span>
                      ))}
                    </div>
                  )}
                </button>

                {colorsOpen && (
                  <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-sm p-1.5 sm:p-3 z-50 max-h-60 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-thumb]:rounded-full">
                    <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2 sm:gap-1">
                      {COLOR_OPTIONS.map((opt) => {
                        const selected = formData.colors.includes(opt.value);
                        return (
                          <label
                            key={opt.value}
                            className="flex items-center gap-1 sm:gap-1.5 cursor-pointer px-1 py-0.5 hover:bg-gray-50 rounded hover:cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleColor(opt.value)}
                              className="accent-black w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 hover:cursor-pointer"
                            />
                            <span className="inline-flex items-center gap-1 sm:gap-1.5 min-w-0">
                              <span
                                className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full border border-gray-200 shrink-0"
                                style={{ background: opt.hex }}
                              />
                              <span className="text-[8px] sm:text-[10px] lg:text-xs truncate hover:cursor-pointer">
                                {localeParam === "ar" ? opt.ar : opt.en}
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

            {/* USER (OWNER) */}
            <FormField label="User" name="ownerName">
              <input
                value={userName}
                disabled
                readOnly
                className="w-full py-1 border-b border-gray-300 focus:border-black outline-none bg-gray-50 text-gray-500 cursor-not-allowed text-start text-xs sm:text-sm"
              />
            </FormField>
          </div>

          {/* IMAGES */}
          <div className="md:col-span-2">
            <div className="mb-2 text-[10px] sm:text-xs uppercase tracking-widest text-gray-500">
              Images (max 5) *
            </div>
            {fieldErrors.images && (
              <p className="text-red-500 text-xs sm:text-sm mb-2">
                {fieldErrors.images}
              </p>
            )}

            {formData.images.map((img, idx) => (
              <div key={idx} className="mb-3">
                <ImageUpload
                  value={img}
                  onChange={(val) => handleImageChange(idx, val)}
                  uploadEndpoint="/api/fabric/uploads/ready-made"
                  chooseFileLabel={`Upload Image ${idx + 1}`}
                  uploadingLabel="Uploading..."
                  uploadFailedLabel="Failed"
                  removeLabel="Remove"
                />
                {formData.images.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="text-[10px] sm:text-xs text-red-500 mt-1 hover:cursor-pointer"
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
                className="text-[10px] sm:text-xs underline hover:cursor-pointer"
              >
                + Add Image
              </button>
            )}
          </div>
        </div>

        {/* SUBMIT */}
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-6 mt-3 border-t border-gray-100 text-sm">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-black text-white rounded-lg hover:cursor-pointer hover:bg-gray-800 transition disabled:opacity-50 text-xs sm:text-sm"
          >
            {loading ? "Saving..." : "Create Product"}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 border border-gray-300 rounded-lg hover:cursor-pointer hover:bg-gray-50 transition text-xs sm:text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
