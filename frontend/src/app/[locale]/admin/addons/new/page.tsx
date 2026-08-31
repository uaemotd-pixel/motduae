"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { api, getApiErrorMessage } from "@/lib/api/client";
import FormField from "@/components/admin/FormField";
import ImageUpload from "@/components/admin/ImageUpload";
import toast from "react-hot-toast";
import ReadyMadePickupAddressFields from "@/components/admin/ReadyMadePickupAddressFields";
import { pickupAddressErrors } from "@/lib/readyMadeAdmin";
import {
  emptyShopPickupAddress,
  type ShopPickupAddress,
} from "@/lib/fabricShop";
import AnimatedDropdown from "@/components/shared/AnimatedDropdown";
import colors from "@/components/shared/colors";

const COLOR_OPTIONS = colors;

interface AddOnFormData {
  name: string;
  nameAr: string;
  price: number;
  stock: number;
  description: string;
  descriptionAr: string;
  material: string;
  materialAr: string;
  design: string;
  designAr: string;
  season: string;
  seasonAr: string;
  tag: string;
  tagAr: string;
  colors: string[];
  images: string[];
  pickupAddress: ShopPickupAddress;
}

type FilterItem = { name: string; nameAr: string; _id: string };

export default function AdminNewAddOnPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [dbMaterials, setDbMaterials] = useState<FilterItem[]>([]);
  const [dbDesigns, setDbDesigns] = useState<FilterItem[]>([]);
  const [dbSeasons, setDbSeasons] = useState<FilterItem[]>([]);
  const [dbTags, setDbTags] = useState<FilterItem[]>([]);

  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [designsLoading, setDesignsLoading] = useState(true);
  const [seasonsLoading, setSeasonsLoading] = useState(true);
  const [tagsLoading, setTagsLoading] = useState(true);

  const [openMaterial, setOpenMaterial] = useState(false);
  const [openDesign, setOpenDesign] = useState(false);
  const [openSeason, setOpenSeason] = useState(false);
  const [openTag, setOpenTag] = useState(false);
  const [openColors, setOpenColors] = useState(false);

  const [formData, setFormData] = useState<AddOnFormData>({
    name: "",
    nameAr: "",
    price: 0,
    stock: 0,
    description: "",
    descriptionAr: "",
    material: "",
    materialAr: "",
    design: "",
    designAr: "",
    season: "",
    seasonAr: "",
    tag: "",
    tagAr: "",
    colors: [],
    images: [""],
    pickupAddress: emptyShopPickupAddress(),
  });

  useEffect(() => {
    let cancelled = false;

    const fetchMaterials = async () => {
      try {
        setMaterialsLoading(true);
        const data = await api.get<FilterItem[]>("/api/filters/materials");
        if (!cancelled && Array.isArray(data)) setDbMaterials(data);
      } catch {
        // fall back to empty
      } finally {
        if (!cancelled) setMaterialsLoading(false);
      }
    };

    const fetchDesigns = async () => {
      try {
        setDesignsLoading(true);
        const data = await api.get<FilterItem[]>("/api/filters/patterns");
        if (!cancelled && Array.isArray(data)) setDbDesigns(data);
      } catch {
        // fall back to empty
      } finally {
        if (!cancelled) setDesignsLoading(false);
      }
    };

    const fetchSeasons = async () => {
      try {
        setSeasonsLoading(true);
        const data = await api.get<FilterItem[]>("/api/filters/seasons");
        if (!cancelled && Array.isArray(data)) setDbSeasons(data);
      } catch {
        // fall back to empty
      } finally {
        if (!cancelled) setSeasonsLoading(false);
      }
    };

    const fetchTags = async () => {
      try {
        setTagsLoading(true);
        const data = await api.get<FilterItem[]>("/api/filters/tags");
        if (!cancelled && Array.isArray(data)) setDbTags(data);
      } catch {
        // fall back to empty
      } finally {
        if (!cancelled) setTagsLoading(false);
      }
    };

    void fetchMaterials();
    void fetchDesigns();
    void fetchSeasons();
    void fetchTags();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (field: keyof AddOnFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleNumberChange = (field: "price" | "stock", value: string) => {
    if (value === "") {
      handleChange(field, 0);
      return;
    }
    const num = Number(value);
    if (!Number.isNaN(num) && num >= 0) {
      handleChange(field, num);
    }
  };

  const getNumberDisplay = (value: number): string =>
    value === 0 ? "" : String(value);

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

  const toggleColor = (colorValue: string) => {
    const current = formData.colors;
    const updated = current.includes(colorValue)
      ? current.filter((c) => c !== colorValue)
      : [...current, colorValue];
    handleChange("colors", updated);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.nameAr) {
      toast.error("Please fill in all required fields (Name, Arabic Name)");
      return;
    }

    const cleanImages = formData.images.filter((img) => img.trim() !== "");
    if (cleanImages.length === 0) {
      toast.error("At least one image is required");
      setFieldErrors((prev) => ({
        ...prev,
        images: "At least one image is required",
      }));
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

      const payload = {
        ...formData,
        images: cleanImages,
      };

      await api.post("/api/admin/addons", payload);
      toast.success("Add-on created successfully");
      router.push("/admin/addons");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to create addon"));
      toast.error(getApiErrorMessage(err, "Failed to create addon"));
    } finally {
      setSubmitting(false);
    }
  };

  const materialOptions = dbMaterials.map((m) => ({
    value: m.name,
    en: m.name,
    ar: m.nameAr || m.name,
  }));

  const designOptions = dbDesigns.map((d) => ({
    value: d.name,
    en: d.name,
    ar: d.nameAr || d.name,
  }));

  const seasonOptions = dbSeasons.map((s) => ({
    value: s.name,
    en: s.name,
    ar: s.nameAr || s.name,
  }));

  const tagOptions = dbTags.map((t) => ({
    value: t.name,
    en: t.name,
    ar: t.nameAr || t.name,
  }));

  const SelectTrigger = ({
    value,
    placeholder,
    displayValue,
    onClick,
  }: {
    value: string;
    placeholder: string;
    displayValue: string;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className="w-full py-1 border-b border-gray-300 focus:border-black text-left bg-transparent text-xs sm:text-[14px] flex items-center justify-between hover:cursor-pointer"
    >
      <span className={value ? "text-black" : "text-gray-400"}>
        {displayValue || placeholder}
      </span>
      <span className="text-gray-400">▾</span>
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-0">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-light text-black tracking-tight">
          New Add-On Product
        </h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">
          Create an accessory or addon product listing.
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <FormField
            label="Name (EN)"
            name="name"
            required
            error={fieldErrors.name}
          >
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none hover:cursor-text text-xs sm:text-sm"
              placeholder="Premium Silk Scarf"
            />
          </FormField>

          <FormField
            label="Name (AR)"
            name="nameAr"
            required
            error={fieldErrors.nameAr}
          >
            <input
              type="text"
              value={formData.nameAr}
              onChange={(e) => handleChange("nameAr", e.target.value)}
              className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none text-right hover:cursor-text text-xs sm:text-sm"
              placeholder="وشاح حريري ممتاز"
            />
          </FormField>

          <FormField
            label="Description (EN)"
            name="description"
            error={fieldErrors.description}
          >
            <input
              type="text"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none hover:cursor-text text-xs sm:text-sm"
              placeholder="Describe the addon material, styling, etc..."
            />
          </FormField>

          <FormField
            label="Description (AR)"
            name="descriptionAr"
            error={fieldErrors.descriptionAr}
          >
            <input
              type="text"
              value={formData.descriptionAr}
              onChange={(e) => handleChange("descriptionAr", e.target.value)}
              className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none text-right hover:cursor-text text-xs sm:text-sm"
              placeholder="اكتب وصفاً للمنتج..."
            />
          </FormField>

          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <FormField
              label="Material (ENG / AR)"
              name="material"
              error={fieldErrors.material}
            >
              <AnimatedDropdown
                isOpen={openMaterial}
                onClose={() => setOpenMaterial(false)}
                trigger={
                  <SelectTrigger
                    value={formData.material}
                    placeholder={
                      materialsLoading ? "Loading..." : "Select material"
                    }
                    displayValue={(() => {
                      const opt = materialOptions.find(
                        (o) => o.value === formData.material,
                      );
                      if (!opt) return "";
                      return `${opt.en} / ${opt.ar}`;
                    })()}
                    onClick={() => setOpenMaterial(!openMaterial)}
                  />
                }
                dropdownClassName="w-full bg-white rounded-xl shadow-lg border border-gray-200 max-h-60 overflow-y-auto py-1"
                position="bottom-left"
              >
                {materialsLoading ? (
                  <div className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-500">
                    Loading materials...
                  </div>
                ) : materialOptions.length === 0 ? (
                  <div className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-500">
                    No materials found
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        handleChange("material", "");
                        handleChange("materialAr", "");
                        setOpenMaterial(false);
                      }}
                      className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-left text-xs sm:text-sm hover:bg-gray-100 hover:cursor-pointer"
                    >
                      Select material
                    </button>
                    {materialOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          handleChange("material", opt.en);
                          handleChange("materialAr", opt.ar);
                          setOpenMaterial(false);
                        }}
                        className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-left text-xs sm:text-sm hover:bg-gray-100 hover:cursor-pointer"
                      >
                        <span>{opt.en} / </span>
                        <span>{opt.ar}</span>
                      </button>
                    ))}
                  </>
                )}
              </AnimatedDropdown>
            </FormField>

            <FormField
              label="Design (ENG / AR)"
              name="design"
              error={fieldErrors.design}
            >
              <AnimatedDropdown
                isOpen={openDesign}
                onClose={() => setOpenDesign(false)}
                trigger={
                  <SelectTrigger
                    value={formData.design}
                    placeholder={
                      designsLoading ? "Loading..." : "Select design"
                    }
                    displayValue={(() => {
                      const opt = designOptions.find(
                        (o) => o.value === formData.design,
                      );
                      if (!opt) return "";
                      return `${opt.en} / ${opt.ar}`;
                    })()}
                    onClick={() => setOpenDesign(!openDesign)}
                  />
                }
                dropdownClassName="w-full bg-white rounded-xl shadow-lg border border-gray-200 max-h-60 overflow-y-auto py-1"
                position="bottom-left"
              >
                {designsLoading ? (
                  <div className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-500">
                    Loading designs...
                  </div>
                ) : designOptions.length === 0 ? (
                  <div className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-500">
                    No designs found
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        handleChange("design", "");
                        handleChange("designAr", "");
                        setOpenDesign(false);
                      }}
                      className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-left text-xs sm:text-sm hover:bg-gray-100 hover:cursor-pointer"
                    >
                      Select design
                    </button>
                    {designOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          handleChange("design", opt.en);
                          handleChange("designAr", opt.ar);
                          setOpenDesign(false);
                        }}
                        className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-left text-xs sm:text-sm hover:bg-gray-100 hover:cursor-pointer"
                      >
                        <span>{opt.en} / </span>
                        <span>{opt.ar}</span>
                      </button>
                    ))}
                  </>
                )}
              </AnimatedDropdown>
            </FormField>

            <FormField
              label="Season (ENG / AR)"
              name="season"
              error={fieldErrors.season}
            >
              <AnimatedDropdown
                isOpen={openSeason}
                onClose={() => setOpenSeason(false)}
                trigger={
                  <SelectTrigger
                    value={formData.season}
                    placeholder={
                      seasonsLoading ? "Loading..." : "Select season"
                    }
                    displayValue={(() => {
                      const opt = seasonOptions.find(
                        (o) => o.value === formData.season,
                      );
                      if (!opt) return "";
                      return `${opt.en} / ${opt.ar}`;
                    })()}
                    onClick={() => setOpenSeason(!openSeason)}
                  />
                }
                dropdownClassName="w-full bg-white rounded-xl shadow-lg border border-gray-200 max-h-60 overflow-y-auto py-1"
                position="bottom-left"
              >
                {seasonsLoading ? (
                  <div className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-500">
                    Loading seasons...
                  </div>
                ) : seasonOptions.length === 0 ? (
                  <div className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-500">
                    No seasons found
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        handleChange("season", "");
                        handleChange("seasonAr", "");
                        setOpenSeason(false);
                      }}
                      className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-left text-xs sm:text-sm hover:bg-gray-100 hover:cursor-pointer"
                    >
                      Select season
                    </button>
                    {seasonOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          handleChange("season", opt.en);
                          handleChange("seasonAr", opt.ar);
                          setOpenSeason(false);
                        }}
                        className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-left text-xs sm:text-sm hover:bg-gray-100 hover:cursor-pointer"
                      >
                        <span>{opt.en} / </span>
                        <span>{opt.ar}</span>
                      </button>
                    ))}
                  </>
                )}
              </AnimatedDropdown>
            </FormField>

            <FormField label="Tag (ENG / AR)" name="tag" error={fieldErrors.tag}>
              <AnimatedDropdown
                isOpen={openTag}
                onClose={() => setOpenTag(false)}
                trigger={
                  <SelectTrigger
                    value={formData.tag}
                    placeholder={
                      tagsLoading ? "Loading..." : "Select tag (optional)"
                    }
                    displayValue={(() => {
                      const opt = tagOptions.find(
                        (o) => o.value === formData.tag,
                      );
                      if (!opt) return "";
                      return `${opt.en} / ${opt.ar}`;
                    })()}
                    onClick={() => setOpenTag(!openTag)}
                  />
                }
                dropdownClassName="w-full bg-white rounded-xl shadow-lg border border-gray-200 max-h-60 overflow-y-auto py-1"
                position="bottom-left"
              >
                {tagsLoading ? (
                  <div className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-500">
                    Loading tags...
                  </div>
                ) : tagOptions.length === 0 ? (
                  <div className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-500">
                    No tags found
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        handleChange("tag", "");
                        handleChange("tagAr", "");
                        setOpenTag(false);
                      }}
                      className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-left text-xs sm:text-sm hover:bg-gray-100 hover:cursor-pointer"
                    >
                      Select tag (optional)
                    </button>
                    {tagOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          handleChange("tag", opt.en);
                          handleChange("tagAr", opt.ar);
                          setOpenTag(false);
                        }}
                        className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-left text-xs sm:text-sm hover:bg-gray-100 hover:cursor-pointer"
                      >
                        <span>{opt.en} / </span>
                        <span>{opt.ar}</span>
                      </button>
                    ))}
                  </>
                )}
              </AnimatedDropdown>
            </FormField>
          </div>

          <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            <FormField
              label="Price (AED)"
              name="price"
              required
              error={fieldErrors.price}
            >
              <input
                type="number"
                step="0.01"
                min="0"
                value={getNumberDisplay(formData.price)}
                onChange={(e) => handleNumberChange("price", e.target.value)}
                className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none hover:cursor-text text-xs sm:text-sm"
                placeholder="85"
              />
            </FormField>

            <FormField
              label="Stock Qty"
              name="stock"
              required
              error={fieldErrors.stock}
            >
              <input
                type="number"
                min="0"
                value={getNumberDisplay(formData.stock)}
                onChange={(e) => handleNumberChange("stock", e.target.value)}
                className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none hover:cursor-text text-xs sm:text-sm"
                placeholder="40"
              />
            </FormField>

            <FormField
              label="Colors"
              name="colors"
              error={fieldErrors.colors}
            >
              <AnimatedDropdown
                isOpen={openColors}
                onClose={() => setOpenColors(false)}
                trigger={
                  <button
                    type="button"
                    onClick={() => setOpenColors(!openColors)}
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
                }
                dropdownClassName="w-full bg-white rounded-xl shadow-lg border border-gray-200 p-1.5 sm:p-3 max-h-60 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-thumb]:rounded-full"
                position="bottom-left"
              >
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
                            {opt.en} / {opt.ar}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </AnimatedDropdown>
            </FormField>
          </div>

          <div className="md:col-span-2">
            <ReadyMadePickupAddressFields
              value={formData.pickupAddress}
              onChange={(pickupAddress) =>
                handleChange("pickupAddress", pickupAddress)
              }
              fieldErrors={fieldErrors}
            />
          </div>

          <div className="md:col-span-2">
            <div className="mb-2 flex justify-between items-center">
              <span className="font-label-sm text-[10px] sm:text-[11px] text-black/60 uppercase tracking-[0.2em]">
                Images (max 5) *
              </span>
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
            {fieldErrors.images && (
              <p className="text-red-500 text-xs sm:text-sm mb-2">
                {fieldErrors.images}
              </p>
            )}
            {formData.images.map((url, idx) => (
              <div key={idx} className="mb-4">
                <ImageUpload
                  value={url}
                  onChange={(val) => handleImageChange(idx, val)}
                  chooseFileLabel="Upload Image"
                  uploadingLabel="Uploading..."
                  uploadFailedLabel="Upload failed"
                  removeLabel="Remove"
                  uploadEndpoint="/api/admin/uploads/addons"
                />
                {formData.images.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeImageField(idx)}
                    className="text-[10px] sm:text-xs text-red-500 mt-1 hover:cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row-reverse gap-2 sm:gap-3 pt-6 mt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50 hover:cursor-pointer text-sm"
          >
            {submitting ? "Creating..." : "Create Add-On"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition hover:cursor-pointer text-sm"
            disabled={submitting}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
