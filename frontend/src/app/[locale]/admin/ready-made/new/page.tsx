"use client";

import { useEffect, useRef, useState, FormEvent, useMemo } from "react";
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
import { useAuth } from "@/context/AuthContext";
import colors from "@/components/shared/colors";
import AnimatedDropdown from "@/components/shared/AnimatedDropdown";

const COLOR_OPTIONS = colors;

const sanitizeName = (value: string) =>
  value.replace(/[^a-zA-Z0-9\u0600-\u06FF\s\-']/g, "");

export default function NewReadyMadePage() {
  const { user } = useAuth();
  const userName = user?.name || "MOTD Admin";
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

  // Dropdown states
  const [fabricShopOpen, setFabricShopOpen] = useState(false);
  const [fabricOpen, setFabricOpen] = useState(false);
  const [tailorShopOpen, setTailorShopOpen] = useState(false);
  const [designOpen, setDesignOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [colorsOpen, setColorsOpen] = useState(false);

  const [fabricShops, setFabricShops] = useState<any[]>([]);
  const [allFabrics, setAllFabrics] = useState<any[]>([]);
  const [tailorShops, setTailorShops] = useState<any[]>([]);
  const [allDesigns, setAllDesigns] = useState<any[]>([]);
  const [allTags, setAllTags] = useState<any[]>([]);

  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const [shopsRes, fabricsRes, tailorsRes, designsRes, tagsRes] =
          await Promise.all([
            api.get<any>("/api/admin/fabric-shops"),
            api.get<any>("/api/admin/fabrics"),
            api.get<any>("/api/admin/tailors"),
            api.get<any[]>("/api/admin/designs"),
            api.get<any[]>("/api/admin/tags"),
          ]);
        setFabricShops(shopsRes.items || []);
        setAllFabrics(fabricsRes?.items || []);
        setTailorShops(tailorsRes.items || []);
        setAllDesigns(designsRes || []);
        if (Array.isArray(tagsRes) && tagsRes.length > 0) {
          setAllTags(
            tagsRes.map((t: any) => ({
              value: t.name,
              en: t.name,
              ar: t.nameAr || t.name,
            })),
          );
        }
      } catch (err) {
        toast.error("Failed to load store or catalog data for dropdowns");
      }
    };
    loadDropdownData();
  }, []);

  const filteredFabrics = useMemo(() => {
    if (!formData.fabricShopId) return [];
    return allFabrics.filter((f) => {
      const shopId =
        typeof f.fabricShopId === "object" &&
        f.fabricShopId !== null &&
        "_id" in f.fabricShopId
          ? (f.fabricShopId as any)._id
          : f.fabricShopId;
      return shopId === formData.fabricShopId;
    });
  }, [allFabrics, formData.fabricShopId]);

  const filteredDesigns = useMemo(() => {
    if (!formData.tailorShopId) return [];
    return allDesigns.filter((d) => {
      const shopId =
        typeof d.tailorShopId === "object"
          ? d.tailorShopId?._id
          : d.tailorShopId;
      return shopId === formData.tailorShopId;
    });
  }, [allDesigns, formData.tailorShopId]);

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

  // Custom dropdown trigger for select fields
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
          {t.adminDashboard.title}
        </h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">
          {t.adminDashboard.subtitle}
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
              className="w-full py-1 border-b border-gray-300 focus:border-black outline-none text-start hover:cursor-text text-xs sm:text-sm"
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
              className="w-full py-1 border-b border-gray-300 focus:border-black outline-none text-end hover:cursor-text text-xs sm:text-sm"
            />
          </FormField>

          {/* DESCRIPTION (EN) */}
          <FormField label="Description">
            <textarea
              rows={1}
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Buy our Premium Mukhawar ...."
              className="w-full py-1 border-b border-gray-300 focus:border-black outline-none text-start bg-transparent resize-none overflow-hidden leading-[1.6] hover:cursor-text text-xs sm:text-sm min-h-10"
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
              className="w-full py-1 border-b border-gray-300 focus:border-black outline-none text-end bg-transparent resize-none overflow-hidden leading-[1.6] hover:cursor-text text-xs sm:text-sm min-h-10"
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = target.scrollHeight + "px";
              }}
            />
          </FormField>

          {/* CODE, STOCK, MIN AGE, MAX AGE - in one row */}
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <FormField label="Code (OPTIONAL)" name="code">
              <input
                value={formData.code}
                onChange={(e) => handleChange("code", e.target.value)}
                placeholder="0000"
                className="w-full py-1 border-b border-gray-300 focus:border-black outline-none hover:cursor-text text-xs sm:text-sm"
              />
            </FormField>

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
                className="w-full py-1 border-b border-gray-300 focus:border-black outline-none hover:cursor-text text-xs sm:text-sm"
              />
            </FormField>

            <FormField label="Min Age">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                placeholder="0"
                value={getNumberDisplay(formData.minAge)}
                onChange={(e) => handleNumberChange("minAge", e.target.value)}
                className="w-full py-1 border-b border-gray-300 focus:border-black outline-none hover:cursor-text text-xs sm:text-sm"
              />
            </FormField>

            <FormField label="Max Age">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                placeholder="0"
                value={getNumberDisplay(formData.maxAge)}
                onChange={(e) => handleNumberChange("maxAge", e.target.value)}
                className="w-full py-1 border-b border-gray-300 focus:border-black outline-none hover:cursor-text text-xs sm:text-sm"
              />
            </FormField>
          </div>

          {/* FABRIC STORE */}
          <FormField
            label="Fabric Store"
            name="fabricShopId"
            error={fieldErrors.fabricShopId}
            required
          >
            <AnimatedDropdown
              isOpen={fabricShopOpen}
              onClose={() => setFabricShopOpen(false)}
              trigger={
                <SelectTrigger
                  value={formData.fabricShopId}
                  placeholder="Select Fabric Store"
                  displayValue={
                    fabricShops.find((s) => s._id === formData.fabricShopId)
                      ?.name || ""
                  }
                  onClick={() => setFabricShopOpen(!fabricShopOpen)}
                />
              }
              dropdownClassName="w-full bg-white rounded-xl shadow-lg border border-gray-200 max-h-60 overflow-y-auto py-1"
              position="bottom-left"
            >
              <button
                type="button"
                onClick={() => {
                  handleChange("fabricShopId", "");
                  handleChange("fabricId", "");
                  setFabricShopOpen(false);
                }}
                className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-left text-xs sm:text-sm hover:bg-gray-100 hover:cursor-pointer"
              >
                Select Fabric Store
              </button>
              {fabricShops.map((shop) => (
                <button
                  key={shop._id}
                  type="button"
                  onClick={() => {
                    handleChange("fabricShopId", shop._id);
                    handleChange("fabricId", "");
                    setFabricShopOpen(false);
                  }}
                  className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-left text-xs sm:text-sm hover:bg-gray-100 hover:cursor-pointer"
                >
                  {shop.name}
                </button>
              ))}
            </AnimatedDropdown>
          </FormField>

          {/* FABRIC */}
          <FormField
            label="Fabric"
            name="fabricId"
            error={fieldErrors.fabricId}
            required
          >
            <AnimatedDropdown
              isOpen={fabricOpen}
              onClose={() => setFabricOpen(false)}
              trigger={
                <SelectTrigger
                  value={formData.fabricId}
                  placeholder="Select Fabric"
                  displayValue={
                    filteredFabrics.find((f) => f._id === formData.fabricId)
                      ?.name || ""
                  }
                  onClick={() => setFabricOpen(!fabricOpen)}
                />
              }
              dropdownClassName="w-full bg-white rounded-xl shadow-lg border border-gray-200 max-h-60 overflow-y-auto py-1"
              position="bottom-left"
            >
              <button
                type="button"
                onClick={() => {
                  handleChange("fabricId", "");
                  setFabricOpen(false);
                }}
                className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-left text-xs sm:text-sm hover:bg-gray-100 hover:cursor-pointer"
              >
                Select Fabric
              </button>
              {filteredFabrics.map((f) => (
                <button
                  key={f._id}
                  type="button"
                  onClick={() => {
                    handleChange("fabricId", f._id);
                    setFabricOpen(false);
                  }}
                  className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-left text-xs sm:text-sm hover:bg-gray-100 hover:cursor-pointer"
                >
                  {localeParam === "ar" ? f.nameAr || f.name : f.name}
                </button>
              ))}
            </AnimatedDropdown>
          </FormField>

          {/* TAILOR SHOP */}
          <FormField
            label="Tailor Shop"
            name="tailorShopId"
            error={fieldErrors.tailorShopId}
          >
            <AnimatedDropdown
              isOpen={tailorShopOpen}
              onClose={() => setTailorShopOpen(false)}
              trigger={
                <SelectTrigger
                  value={formData.tailorShopId}
                  placeholder="Select Tailor Shop"
                  displayValue={
                    tailorShops.find((s) => s._id === formData.tailorShopId)
                      ?.name || ""
                  }
                  onClick={() => setTailorShopOpen(!tailorShopOpen)}
                />
              }
              dropdownClassName="w-full bg-white rounded-xl shadow-lg border border-gray-200 max-h-60 overflow-y-auto py-1"
              position="bottom-left"
            >
              <button
                type="button"
                onClick={() => {
                  handleChange("tailorShopId", "");
                  handleChange("designId", "");
                  setTailorShopOpen(false);
                }}
                className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-left text-xs sm:text-sm hover:bg-gray-100 hover:cursor-pointer"
              >
                Select Tailor Shop
              </button>
              {tailorShops.map((shop) => (
                <button
                  key={shop._id}
                  type="button"
                  onClick={() => {
                    handleChange("tailorShopId", shop._id);
                    handleChange("designId", "");
                    setTailorShopOpen(false);
                  }}
                  className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-left text-xs sm:text-sm hover:bg-gray-100 hover:cursor-pointer"
                >
                  {shop.name}
                </button>
              ))}
            </AnimatedDropdown>
          </FormField>

          {/* DESIGN */}
          <FormField
            label="Design"
            name="designId"
            error={fieldErrors.designId}
          >
            <AnimatedDropdown
              isOpen={designOpen}
              onClose={() => setDesignOpen(false)}
              trigger={
                <SelectTrigger
                  value={formData.designId}
                  placeholder="Select Design"
                  displayValue={
                    filteredDesigns.find((d) => d._id === formData.designId)
                      ?.name || ""
                  }
                  onClick={() => setDesignOpen(!designOpen)}
                />
              }
              dropdownClassName="w-full bg-white rounded-xl shadow-lg border border-gray-200 max-h-60 overflow-y-auto py-1"
              position="bottom-left"
            >
              <button
                type="button"
                onClick={() => {
                  handleChange("designId", "");
                  setDesignOpen(false);
                }}
                className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-left text-xs sm:text-sm hover:bg-gray-100 hover:cursor-pointer"
              >
                Select Design
              </button>
              {filteredDesigns.map((d) => (
                <button
                  key={d._id}
                  type="button"
                  onClick={() => {
                    handleChange("designId", d._id);
                    setDesignOpen(false);
                  }}
                  className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-left text-xs sm:text-sm hover:bg-gray-100 hover:cursor-pointer"
                >
                  {localeParam === "ar" ? d.nameAr || d.name : d.name}
                </button>
              ))}
            </AnimatedDropdown>
          </FormField>

{/* LENGTH + PRICES - in one row */}
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <FormField
              label="Fabric length"
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
                className="w-full py-1 border-b border-gray-300 focus:border-black outline-none hover:cursor-text text-xs sm:text-sm"
              />
            </FormField>

            <FormField
              label="Fabric Price"
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
                className="w-full py-1 border-b border-gray-300 focus:border-black outline-none hover:cursor-text text-xs sm:text-sm"
              />
            </FormField>

            <FormField
              label="Mukhawar Price"
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
                className="w-full py-1 border-b border-gray-300 focus:border-black outline-none hover:cursor-text text-xs sm:text-sm"
              />
            </FormField>

            <FormField
              label="Final Price"
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
                className="w-full py-1 border-b border-gray-300 focus:border-black outline-none hover:cursor-text text-xs sm:text-sm"
              />
            </FormField>
          </div>

          {/* TAG (ENG + AR) + Color + User in one row */}
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {/* TAG ENG + AR */}
            <FormField label="Tag (ENG / AR)" name="tag">
              <AnimatedDropdown
                isOpen={tagOpen}
                onClose={() => setTagOpen(false)}
                trigger={(() => {
                  const selected = allTags.find(
                    (t) => t.value === formData.tag,
                  );
                  const hasValue = !!formData.tag;
                  return (
                    <button
                      type="button"
                      onClick={() => setTagOpen(!tagOpen)}
                      className="w-full py-1 border-b border-gray-300 focus:border-black text-left bg-transparent text-xs sm:text-[14px] flex items-center justify-between hover:cursor-pointer"
                    >
                      {hasValue ? (
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="text-black truncate">
                            {selected?.en || formData.tag}
                          </span>
                          <span className="text-gray-500 shrink-0">/</span>
                          <span className="text-black truncate">
                            {selected?.ar || formData.tagAr}
                          </span>
                        </span>
                      ) : (
                        <span className="text-gray-400">
                          Select tag (ENG / AR)
                        </span>
                      )}
                      <span className="text-gray-400">▾</span>
                    </button>
                  );
                })()}
                dropdownClassName="w-full bg-white rounded-xl shadow-lg border border-gray-200 max-h-60 overflow-y-auto py-1"
                position="bottom-left"
              >
                <button
                  type="button"
                  onClick={() => {
                    handleChange("tag", "");
                    handleChange("tagAr", "");
                    setTagOpen(false);
                  }}
                  className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-left text-xs sm:text-sm hover:bg-gray-100 hover:cursor-pointer"
                >
                  Select tag (ENG / AR)
                </button>
                {allTags.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      handleChange("tag", opt.value);
                      handleChange("tagAr", opt.ar);
                      setTagOpen(false);
                    }}
                    className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-left text-xs sm:text-sm hover:bg-gray-100 hover:cursor-pointer flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{opt.en}</span>
                    <span className="text-gray-500 shrink-0">/</span>
                    <span className="truncate">{opt.ar}</span>
                  </button>
                ))}
              </AnimatedDropdown>
            </FormField>

            {/* COLORS */}
            <FormField label="Colors" name="colors" required>
              <AnimatedDropdown
                isOpen={colorsOpen}
                onClose={() => setColorsOpen(false)}
                trigger={
                  <button
                    type="button"
                    onClick={() => setColorsOpen(!colorsOpen)}
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
                            title={localeParam === "ar" ? c.ar : c.en}
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
                          <span className="inline-flex items-center gap-1 text-[8px] sm:text-[10px] lg:text-xs min-w-0 hover:cursor-pointer">
                            <span className="truncate">{opt.en}</span>
                            <span className="text-gray-400 shrink-0">/</span>
                            <span className="truncate">{opt.ar}</span>
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </AnimatedDropdown>
            </FormField>

            {/* USER */}
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
                  value={img || ""}
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
        <div className="flex flex-col-reverse sm:flex-row-reverse gap-2 sm:gap-3 pt-6 mt-3 border-t border-gray-100">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-black text-white rounded-lg hover:cursor-pointer hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading ? "Saving..." : "Create Product"}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 border border-gray-300 rounded-lg hover:cursor-pointer hover:bg-gray-50 transition text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
