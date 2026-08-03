"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import FormField from "@/components/admin/FormField";
import FabricImageUpload from "@/components/admin/FabricImageUpload";
import StorePartnerPicker from "@/components/admin/StorePartnerPicker";
import {
  FABRIC_MATERIALS,
  FabricFormData,
  FabricMaterialValue,
  FABRIC_TAGS,
  PickupAddress,
  UAE_EMIRATES,
  COLOR_OPTIONS,
} from "@/lib/createFabricAdmin";
import { FabricUnitValue, WARA_TO_METERS } from "@/lib/fabrics";
import { api } from "@/lib/api/client";

const dropdownVariants = {
  hidden: { opacity: 0, y: -6, scaleY: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scaleY: 1,
    transition: { duration: 0.15, ease: "easeOut" as const },
  },
  exit: {
    opacity: 0,
    y: -4,
    scaleY: 0.95,
    transition: { duration: 0.1, ease: "easeIn" as const },
  },
};

type FabricAdminFormFieldsProps = {
  formData: FabricFormData;
  fieldErrors: Record<string, string>;
  onFieldChange: (field: keyof FabricFormData, value: unknown) => void;
  onPickupChange: (subfield: keyof PickupAddress, value: string) => void;
  onImageChange: (index: number, url: string) => void;
  onAddImage: () => void;
  onRemoveImage: (index: number) => void;
};

export default function FabricAdminFormFields({
  formData,
  fieldErrors,
  onFieldChange,
  onPickupChange,
  onImageChange,
  onAddImage,
  onRemoveImage,
}: FabricAdminFormFieldsProps) {
  const [isColorDropdownOpen, setIsColorDropdownOpen] = useState(false);
  const colorDropdownRef = useRef<HTMLDivElement>(null);
  const [openVariantColorDropdown, setOpenVariantColorDropdown] = useState<number | null>(null);
  const [dbMaterials, setDbMaterials] = useState<
    { name: string; nameAr: string; _id: string }[]
  >([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [dbTags, setDbTags] = useState<
    { name: string; nameAr: string; _id: string }[]
  >([]);
  const [tagsLoading, setTagsLoading] = useState(true);

  // Dropdown open states for animated dropdowns
  const [openMaterialEn, setOpenMaterialEn] = useState(false);
  const [openMaterialAr, setOpenMaterialAr] = useState(false);
  const [openTagEn, setOpenTagEn] = useState(false);
  const [openTagAr, setOpenTagAr] = useState(false);
  const [openEmirate, setOpenEmirate] = useState(false);
  const [openUnit, setOpenUnit] = useState(false);

  // Dropdown refs
  const materialEnRef = useRef<HTMLDivElement>(null);
  const materialArRef = useRef<HTMLDivElement>(null);
  const tagEnRef = useRef<HTMLDivElement>(null);
  const tagArRef = useRef<HTMLDivElement>(null);
  const emirateRef = useRef<HTMLDivElement>(null);
  const unitRef = useRef<HTMLDivElement>(null);

  // Fetch materials from DB
  useEffect(() => {
    let cancelled = false;
    const fetchMaterials = async () => {
      try {
        setMaterialsLoading(true);
        const data = await api.get<
          { name: string; nameAr: string; _id: string }[]
        >("/api/filters/materials");
        if (!cancelled) {
          setDbMaterials(Array.isArray(data) ? data : []);
        }
      } catch {
        // Silently fall back to FABRIC_MATERIALS
      } finally {
        if (!cancelled) setMaterialsLoading(false);
      }
    };
    fetchMaterials();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch tags from DB
  useEffect(() => {
    let cancelled = false;
    const fetchTags = async () => {
      try {
        setTagsLoading(true);
        const data =
          await api.get<{ name: string; nameAr: string; _id: string }[]>(
            "/api/filters/tags",
          );
        if (!cancelled) {
          setDbTags(Array.isArray(data) ? data : []);
        }
      } catch {
        // Silently fall back to FABRIC_TAGS
      } finally {
        if (!cancelled) setTagsLoading(false);
      }
    };
    fetchTags();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedColors = Array.isArray(formData.colors) ? formData.colors : [];

  const toggleColor = (colorValue: string) => {
    const current = Array.isArray(formData.colors) ? formData.colors : [];
    const newSelected = current.includes(colorValue)
      ? current.filter((c) => c !== colorValue)
      : [...current, colorValue];
    onFieldChange("colors", newSelected);
  };

  const handleUnitChange = (newUnit: FabricUnitValue) => {
    // Convert stock when switching units
    const currentStock = Number(formData.stockInMeters);
    if (currentStock > 0) {
      let convertedStock: number;
      if (newUnit === "wara") {
        // Convert meters to wara
        convertedStock = currentStock / WARA_TO_METERS;
      } else {
        // Convert wara to meters
        convertedStock = currentStock * WARA_TO_METERS;
      }
      onFieldChange("stockInMeters", Number(convertedStock.toFixed(2)));
    }
    onFieldChange("fabricUnit", newUnit);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    // Allow empty string
    if (val === "") {
      onFieldChange("pricePerUnit", val);
      return;
    }

    // Allow: 9.87, 9.8, 9, .87, 9. (typing in progress)
    // Disallow: 9..87, 9.8.7, 9.87. (multiple decimals)
    if (/^\d*\.?\d*$/.test(val)) {
      onFieldChange("pricePerUnit", val);
    }
  };

  const handleStockChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    // Allow empty string
    if (val === "") {
      onFieldChange("stockInMeters", val);
      return;
    }

    // Allow only valid decimal numbers (single decimal point, digits only)
    if (/^\d*\.?\d+$/.test(val) || /^\d+\.?\d*$/.test(val)) {
      const num = Number(val);
      if (!isNaN(num) && num >= 0) {
        onFieldChange("stockInMeters", val);
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        colorDropdownRef.current &&
        !colorDropdownRef.current.contains(event.target as Node)
      ) {
        setIsColorDropdownOpen(false);
      }
      if (
        materialEnRef.current &&
        !materialEnRef.current.contains(event.target as Node)
      ) {
        setOpenMaterialEn(false);
      }
      if (
        materialArRef.current &&
        !materialArRef.current.contains(event.target as Node)
      ) {
        setOpenMaterialAr(false);
      }
      if (
        tagEnRef.current &&
        !tagEnRef.current.contains(event.target as Node)
      ) {
        setOpenTagEn(false);
      }
      if (
        tagArRef.current &&
        !tagArRef.current.contains(event.target as Node)
      ) {
        setOpenTagAr(false);
      }
      if (
        emirateRef.current &&
        !emirateRef.current.contains(event.target as Node)
      ) {
        setOpenEmirate(false);
      }
      if (unitRef.current && !unitRef.current.contains(event.target as Node)) {
        setOpenUnit(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Material options – use DB materials if loaded, fall back to FABRIC_MATERIALS
  const materialOptionsEn = (
    dbMaterials.length > 0 ? dbMaterials : FABRIC_MATERIALS
  ).map((m) => ({
    value:
      "name" in m ? m.name : (m as (typeof FABRIC_MATERIALS)[number]).value,
    label: "name" in m ? m.name : (m as (typeof FABRIC_MATERIALS)[number]).en,
  }));
  const materialOptionsAr = (
    dbMaterials.length > 0 ? dbMaterials : FABRIC_MATERIALS
  ).map((m) => ({
    value:
      "nameAr" in m ? m.nameAr! : (m as (typeof FABRIC_MATERIALS)[number]).ar,
    label:
      "nameAr" in m ? m.nameAr! : (m as (typeof FABRIC_MATERIALS)[number]).ar,
  }));

  // Tag options – use DB tags if loaded, fall back to FABRIC_TAGS
  const tagOptionsEn = (dbTags.length > 0 ? dbTags : FABRIC_TAGS).map((t) => ({
    value: "name" in t ? t.name : (t as (typeof FABRIC_TAGS)[number]).value,
    label: "name" in t ? t.name : (t as (typeof FABRIC_TAGS)[number]).en,
  }));
  const tagOptionsAr = (dbTags.length > 0 ? dbTags : FABRIC_TAGS).map((t) => ({
    value: "nameAr" in t ? t.nameAr! : (t as (typeof FABRIC_TAGS)[number]).ar,
    label: "nameAr" in t ? t.nameAr! : (t as (typeof FABRIC_TAGS)[number]).ar,
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Name (EN) */}
      <FormField
        label="Name (EN)"
        name="name"
        required
        error={fieldErrors.name}
      >
        <input
          type="text"
          value={formData.name}
          onChange={(e) => onFieldChange("name", e.target.value)}
          className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none"
          placeholder="Silk Fabric"
        />
      </FormField>

      {/* Name (AR) */}
      <FormField
        label="Name (AR)"
        name="nameAr"
        required
        error={fieldErrors.nameAr}
      >
        <input
          type="text"
          value={formData.nameAr}
          onChange={(e) => onFieldChange("nameAr", e.target.value)}
          className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none text-right"
          placeholder="قماش حرير"
        />
      </FormField>

      {/* Description (EN) – optional */}
      <FormField
        label="Description (EN)"
        name="description"
        error={fieldErrors.description}
      >
        <input
          type="text"
          value={formData.description}
          onChange={(e) => onFieldChange("description", e.target.value)}
          className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none"
          placeholder="Describe the fabric..."
        />
      </FormField>

      {/* Description (AR) – optional */}
      <FormField
        label="Description (AR)"
        name="descriptionAr"
        error={fieldErrors.descriptionAr}
      >
        <input
          type="text"
          value={formData.descriptionAr}
          onChange={(e) => onFieldChange("descriptionAr", e.target.value)}
          className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none text-right"
          placeholder="وصف القماش..."
        />
      </FormField>

      {/* Row for Material (EN), Material (AR), Colors */}
      <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Material (EN) */}
        <FormField
          label="Material (EN)"
          name="material"
          required
          error={fieldErrors.material}
        >
          <div className="relative" ref={materialEnRef}>
            <button
              type="button"
              onClick={() => setOpenMaterialEn((prev) => !prev)}
              className="w-full py-1 border-b border-gray-300 focus:border-black text-left bg-transparent min-h-7 flex items-center justify-between"
            >
              <span
                className={`text-xs ${formData.material ? "text-black" : "text-black/60"}`}
              >
                {formData.material
                  ? materialOptionsEn.find((o) => o.value === formData.material)
                      ?.label || formData.material
                  : "Select material"}
              </span>
              <svg
                className={`w-3 h-3 transition-transform ${openMaterialEn ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <AnimatePresence>
              {openMaterialEn && (
                <motion.div
                  key="material-en-dropdown"
                  variants={dropdownVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-sm z-50 max-h-44 overflow-auto origin-top"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onFieldChange("material", "" as FabricMaterialValue);
                      setOpenMaterialEn(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${!formData.material ? "bg-gray-50 font-medium" : ""}`}
                  >
                    Select material
                  </button>
                  {materialOptionsEn.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onFieldChange(
                          "material",
                          opt.value as FabricMaterialValue,
                        );
                        setOpenMaterialEn(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${formData.material === opt.value ? "bg-gray-50 font-medium" : ""}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </FormField>

        {/* Material (AR) – dropdown with Arabic labels */}
        <FormField
          label="Material (AR)"
          name="materialAr"
          error={fieldErrors.materialAr}
          required
        >
          <div className="relative" ref={materialArRef}>
            <button
              type="button"
              onClick={() => setOpenMaterialAr((prev) => !prev)}
              className="w-full py-1 border-b border-gray-300 focus:border-black text-right bg-transparent min-h-7 flex items-center justify-between flex-row-reverse"
            >
              <svg
                className={`w-3 h-3 transition-transform shrink-0 ${openMaterialAr ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
              <span
                className={`text-xs ${formData.materialAr ? "text-black" : "text-black/60"}`}
              >
                {formData.materialAr
                  ? materialOptionsAr.find(
                      (o) => o.value === formData.materialAr,
                    )?.label || formData.materialAr
                  : "اختر النوع"}
              </span>
            </button>
            <AnimatePresence>
              {openMaterialAr && (
                <motion.div
                  key="material-ar-dropdown"
                  variants={dropdownVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-sm z-50 max-h-44 overflow-auto origin-top"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onFieldChange("materialAr", "");
                      setOpenMaterialAr(false);
                    }}
                    className={`w-full text-right px-3 py-2 text-xs hover:bg-gray-50 ${!formData.materialAr ? "bg-gray-50 font-medium" : ""}`}
                  >
                    اختر النوع
                  </button>
                  {materialOptionsAr.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onFieldChange("materialAr", opt.value);
                        setOpenMaterialAr(false);
                      }}
                      className={`w-full text-right px-3 py-2 text-xs hover:bg-gray-50 ${formData.materialAr === opt.value ? "bg-gray-50 font-medium" : ""}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </FormField>

        {/* Colors */}
        <FormField
          label="Colors"
          name="colors"
          required
          error={fieldErrors.color}
        >
          <div className="relative" ref={colorDropdownRef}>
            <button
              type="button"
              onClick={() => setIsColorDropdownOpen((prev) => !prev)}
              className="w-full py-1 border-b border-gray-300 focus:border-black text-left bg-transparent min-h-7 flex items-center"
            >
              {selectedColors.length === 0 ? (
                <span className="text-xs text-black/60 leading-none">
                  Select colors
                </span>
              ) : (
                <div className="flex flex-wrap gap-2 items-center">
                  {COLOR_OPTIONS.filter((c) =>
                    selectedColors.includes(c.value),
                  ).map((c) => (
                    <span
                      key={c.value}
                      className="inline-flex items-center justify-center"
                      title={c.en}
                    >
                      <span
                        className="w-5 h-5 rounded-full border border-gray-200"
                        style={{ backgroundColor: c.value }}
                      />
                    </span>
                  ))}
                </div>
              )}
            </button>

            <AnimatePresence>
              {isColorDropdownOpen && (
                <motion.div
                  key="color-dropdown"
                  variants={dropdownVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-sm p-3 z-50 origin-top"
                >
                  <div className="max-h-44 overflow-auto flex flex-col gap-2">
                    {COLOR_OPTIONS.map((opt) => {
                      const selected = selectedColors.includes(opt.value);
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
                              style={{ backgroundColor: opt.value }}
                            />
                            <span className="text-xs">
                              {opt.en} / {opt.ar}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </FormField>
      </div>

      {/* Store Partner */}
      <div className="md:col-span-2">
        <StorePartnerPicker
          value={formData.listedByStore}
          onChange={(partnerId) => onFieldChange("listedByStore", partnerId)}
          error={fieldErrors.listedByStore}
          label="Store Partner"
          placeholder="Select store partner"
          loadingLabel="Loading..."
          emptyLabel="No partners found"
          required
        />
      </div>

      {/* Tag (EN) – optional dropdown */}
      <FormField label="Tag (EN)" name="tag" error={fieldErrors.tag}>
        <div className="relative" ref={tagEnRef}>
          <button
            type="button"
            onClick={() => setOpenTagEn((prev) => !prev)}
            className="w-full py-1 border-b border-gray-300 focus:border-black text-left bg-transparent min-h-7 flex items-center justify-between"
          >
            <span
              className={`text-xs ${formData.tag ? "text-black" : "text-black/60"}`}
            >
              {formData.tag
                ? tagOptionsEn.find((o) => o.value === formData.tag)?.label ||
                  formData.tag
                : "Select tag (optional)"}
            </span>
            <svg
              className={`w-3 h-3 transition-transform ${openTagEn ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          <AnimatePresence>
            {openTagEn && (
              <motion.div
                key="tag-en-dropdown"
                variants={dropdownVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-sm z-50 max-h-44 overflow-auto origin-top"
              >
                <button
                  type="button"
                  onClick={() => {
                    onFieldChange("tag", "");
                    setOpenTagEn(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${!formData.tag ? "bg-gray-50 font-medium" : ""}`}
                >
                  Select tag (optional)
                </button>
                {tagOptionsEn.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onFieldChange("tag", opt.value);
                      setOpenTagEn(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${formData.tag === opt.value ? "bg-gray-50 font-medium" : ""}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </FormField>

      {/* Tag (AR) – optional dropdown with Arabic labels */}
      <FormField label="Tag (AR)" name="tagAr" error={fieldErrors.tagAr}>
        <div className="relative" ref={tagArRef}>
          <button
            type="button"
            onClick={() => setOpenTagAr((prev) => !prev)}
            className="w-full py-1 border-b border-gray-300 focus:border-black text-right bg-transparent min-h-7 flex items-center justify-between flex-row-reverse"
          >
            <svg
              className={`w-3 h-3 transition-transform shrink-0 ${openTagAr ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
            <span
              className={`text-xs ${formData.tagAr ? "text-black" : "text-black/60"}`}
            >
              {formData.tagAr
                ? tagOptionsAr.find((o) => o.value === formData.tagAr)?.label ||
                  formData.tagAr
                : "اختر الوسم (اختياري)"}
            </span>
          </button>
          <AnimatePresence>
            {openTagAr && (
              <motion.div
                key="tag-ar-dropdown"
                variants={dropdownVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-sm z-50 max-h-44 overflow-auto origin-top"
              >
                <button
                  type="button"
                  onClick={() => {
                    onFieldChange("tagAr", "");
                    setOpenTagAr(false);
                  }}
                  className={`w-full text-right px-3 py-2 text-xs hover:bg-gray-50 ${!formData.tagAr ? "bg-gray-50 font-medium" : ""}`}
                >
                  اختر الوسم (اختياري)
                </button>
                {tagOptionsAr.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onFieldChange("tagAr", opt.value);
                      setOpenTagAr(false);
                    }}
                    className={`w-full text-right px-3 py-2 text-xs hover:bg-gray-50 ${formData.tagAr === opt.value ? "bg-gray-50 font-medium" : ""}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </FormField>

      {/* Fabric Unit, Price, Stock in one row */}
      <div className="md:col-span-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* Fabric Unit */}
          <FormField label="Unit" name="fabricUnit">
            <div className="relative" ref={unitRef}>
              <button
                type="button"
                onClick={() => setOpenUnit((prev) => !prev)}
                className="w-full py-1 border-b border-gray-300 focus:border-black text-left bg-transparent min-h-7 flex items-center justify-between"
              >
                <span className="text-xs">
                  {formData.fabricUnit === "meters" ? "Meters" : "Wara"}
                </span>
                <svg
                  className={`w-3 h-3 transition-transform ${openUnit ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <AnimatePresence>
                {openUnit && (
                  <motion.div
                    key="unit-dropdown"
                    variants={dropdownVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-sm z-50 origin-top"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        handleUnitChange("meters" as FabricUnitValue);
                        setOpenUnit(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${formData.fabricUnit === "meters" ? "bg-gray-50 font-medium" : ""}`}
                    >
                      Meters
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleUnitChange("wara" as FabricUnitValue);
                        setOpenUnit(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${formData.fabricUnit === "wara" ? "bg-gray-50 font-medium" : ""}`}
                    >
                      Wara
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </FormField>

          {/* Price Per Unit */}
          <FormField
            label="Price Per (meter / wara)"
            name="pricePerUnit"
            required
            error={fieldErrors.pricePerUnit}
          >
            <div>
              <input
                type="text"
                inputMode="decimal"
                value={formData.pricePerUnit}
                onChange={handlePriceChange}
                className={`w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none ${
                  fieldErrors.pricePerUnit ? "border-red-500" : ""
                }`}
                placeholder="150.00"
              />
              {fieldErrors.pricePerUnit && (
                <p className="mt-1 text-sm text-red-500">
                  {fieldErrors.pricePerUnit}
                </p>
              )}
            </div>
          </FormField>

          {/* Stock */}
          <FormField
            label="Stock"
            name="stockInMeters"
            required
            error={fieldErrors.stockInMeters}
          >
            <div>
              <input
                type="text"
                step={0.1}
                min={0}
                inputMode="decimal"
                value={formData.stockInMeters}
                onChange={handleStockChange}
                className={`w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none ${
                  fieldErrors.stockInMeters ? "border-red-500" : ""
                }`}
                placeholder="100.00"
              />
              {fieldErrors.stockInMeters && (
                <p className="mt-1 text-sm text-red-500">
                  {fieldErrors.stockInMeters}
                </p>
              )}
            </div>
          </FormField>
        </div>
      </div>

      {/* Pickup Address */}
      <div className="md:col-span-2">
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Store Pickup Address
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Emirate"
            name="pickupAddress.emirate"
            required
            error={fieldErrors["pickupAddress.emirate"]}
          >
            <div className="relative" ref={emirateRef}>
              <button
                type="button"
                onClick={() => setOpenEmirate((prev) => !prev)}
                className="w-full py-1 border-b border-gray-300 focus:border-black text-left bg-transparent min-h-7 flex items-center justify-between"
              >
                <span
                  className={`text-xs ${formData.pickupAddress.emirate ? "text-black" : "text-black/60"}`}
                >
                  {formData.pickupAddress.emirate
                    ? UAE_EMIRATES.find(
                        (e) => e.value === formData.pickupAddress.emirate,
                      )?.en +
                      " / " +
                      UAE_EMIRATES.find(
                        (e) => e.value === formData.pickupAddress.emirate,
                      )?.ar
                    : "Select emirate"}
                </span>
                <svg
                  className={`w-3 h-3 transition-transform ${openEmirate ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <AnimatePresence>
                {openEmirate && (
                  <motion.div
                    key="emirate-dropdown"
                    variants={dropdownVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-sm z-50 max-h-44 overflow-auto origin-top"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onPickupChange("emirate", "");
                        setOpenEmirate(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${!formData.pickupAddress.emirate ? "bg-gray-50 font-medium" : ""}`}
                    >
                      Select emirate
                    </button>
                    {UAE_EMIRATES.map((emirate) => (
                      <button
                        key={emirate.value}
                        type="button"
                        onClick={() => {
                          onPickupChange("emirate", emirate.value);
                          setOpenEmirate(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${formData.pickupAddress.emirate === emirate.value ? "bg-gray-50 font-medium" : ""}`}
                      >
                        {emirate.en} / {emirate.ar}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </FormField>
          <FormField
            label="City"
            name="pickupAddress.city"
            required
            error={fieldErrors["pickupAddress.city"]}
          >
            <input
              type="text"
              value={formData.pickupAddress.city}
              onChange={(e) => onPickupChange("city", e.target.value)}
              className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none"
              placeholder="e.g., Deira"
            />
          </FormField>
          <FormField label="Street" name="pickupAddress.street" required>
            <input
              type="text"
              value={formData.pickupAddress.street}
              onChange={(e) => onPickupChange("street", e.target.value)}
              className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none"
              placeholder="e.g., Al Maktoum Street"
            />
          </FormField>
          <FormField label="Building" name="pickupAddress.building" required>
            <input
              type="text"
              value={formData.pickupAddress.building}
              onChange={(e) => onPickupChange("building", e.target.value)}
              className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none"
              placeholder="e.g., Al Fattan Tower"
            />
          </FormField>
          <FormField
            label="Phone"
            name="pickupAddress.phone"
            error={fieldErrors["pickupAddress.phone"]}
            required
          >
            <div className="flex items-center border-b border-gray-300 focus-within:border-black bg-transparent">
              <span className="inline-flex items-center px-3 py-1 bg-neutral-50 text-neutral-400 text-[14px] [font-family:var(--font-ui)] select-none border-r border-gray-200">
                +971
              </span>
              <input
                type="text"
                value={formData.pickupAddress.phone}
                onChange={(e) => {
                  const val = e.target.value;
                  if ((val === "" || /^\d*$/.test(val)) && val.length <= 9) {
                    onPickupChange("phone", val);
                  }
                }}
                className="w-full py-1 pl-3 bg-transparent text-[14px] focus:outline-none"
                placeholder="123456777"
              />
            </div>
          </FormField>
        </div>
      </div>

      {/* Images */}
      <div className="md:col-span-2">
        <div className="mb-2 flex justify-between items-center">
          <span className="font-label-sm text-[11px] text-black/60 uppercase tracking-[0.2em]">
            Images (max 5) *
          </span>
          {formData.images.length < 5 && (
            <button
              type="button"
              onClick={onAddImage}
              className="text-xs text-black underline"
            >
              + Add Image
            </button>
          )}
        </div>
        {formData.images.map((url, idx) => (
          <div key={idx} className="mb-4">
            <FabricImageUpload
              value={url}
              onChange={(val) => onImageChange(idx, val)}
              chooseFileLabel="Upload Image"
              uploadingLabel="Uploading..."
              uploadFailedLabel="Upload failed"
              removeLabel="Remove"
              error={
                fieldErrors.images && idx === 0 ? fieldErrors.images : undefined
              }
            />
            {formData.images.length > 1 && (
              <button
                type="button"
                onClick={() => onRemoveImage(idx)}
                className="text-xs text-red-500 mt-1"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Active Status */}
      <div className="md:col-span-2">
        <FormField label="Active Status" name="isActive">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => onFieldChange("isActive", e.target.checked)}
              className="w-4 h-4 cursor-pointer"
            />
            <label
              htmlFor="isActive"
              className="text-sm text-gray-700 cursor-pointer"
            >
              Product is active (visible to customers)
            </label>
          </div>
        </FormField>
      </div>

      {/* Variations Section */}
      <div className="md:col-span-2 pt-6 mt-6 border-t border-gray-200 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-semibold text-black tracking-wider uppercase">
              Fabric Variations
            </h3>
            <p className="text-gray-500 text-xs mt-1">
              Add different variations of this fabric (e.g., other colors, stock levels)
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onFieldChange("variants", [
                ...(formData.variants || []),
                {
                  name: "",
                  nameAr: "",
                  slug: "",
                  description: formData.description || "",
                  descriptionAr: formData.descriptionAr || "",
                  images: [""],
                  material: formData.material,
                  materialAr: formData.materialAr,
                  colors: [],
                  tag: "",
                  tagAr: "",
                  fabricUnit: formData.fabricUnit || "meters",
                  pricePerUnit: formData.pricePerUnit || 0,
                  pricePerMeter: formData.pricePerMeter || 0,
                  stockInMeters: 0,
                  listedByStore: formData.listedByStore || "",
                  pickupAddress: formData.pickupAddress || { emirate: "", city: "", street: "", building: "", phone: "" },
                  isActive: true,
                },
              ]);
            }}
            className="px-4 py-2 border border-black text-xs uppercase tracking-wider hover:bg-black hover:text-white transition font-medium cursor-pointer"
          >
            + Add Variant
          </button>
        </div>

        {formData.variants && formData.variants.length > 0 && (
          <div className="space-y-6">
            {formData.variants.map((variant, index) => {
              const prefix = `variants.${index}`;
              return (
                <div
                  key={index}
                  className="p-6 border border-gray-200 bg-[#FAF9F5] space-y-6 relative rounded-none animate-fadeIn"
                >
                  <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                    <span className="font-label-sm text-xs text-black/60 uppercase tracking-widest font-semibold">
                      Variant #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onFieldChange(
                          "variants",
                          (formData.variants || []).filter((_, i) => i !== index),
                        );
                      }}
                      className="text-xs text-red-600 hover:underline font-medium cursor-pointer"
                    >
                      Remove Variant
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      label="Name (EN)"
                      name={`${prefix}.name`}
                      error={fieldErrors[`${prefix}.name`]}
                      required
                    >
                      <input
                        type="text"
                        value={variant.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          const nextVariants = [...(formData.variants || [])];
                          nextVariants[index] = { ...nextVariants[index], name: val };
                          if (!nextVariants[index].slug) {
                            const slugBase = val
                              .toLowerCase()
                              .replace(/[^a-z0-9\s-]/g, "")
                              .replace(/\s+/g, "-")
                              .replace(/-+/g, "-")
                              .replace(/^-+|-+$/g, "");
                            nextVariants[index].slug = slugBase;
                          }
                          onFieldChange("variants", nextVariants);
                        }}
                        className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none bg-transparent text-xs"
                        placeholder="e.g. Red Silk"
                      />
                    </FormField>

                    <FormField
                      label="Name (AR)"
                      name={`${prefix}.nameAr`}
                      error={fieldErrors[`${prefix}.nameAr`]}
                      required
                    >
                      <input
                        type="text"
                        value={variant.nameAr}
                        onChange={(e) => {
                          const nextVariants = [...(formData.variants || [])];
                          nextVariants[index] = { ...nextVariants[index], nameAr: e.target.value };
                          onFieldChange("variants", nextVariants);
                        }}
                        className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none bg-transparent text-right text-xs"
                        placeholder="مثال: حرير أحمر"
                        dir="rtl"
                      />
                    </FormField>

                    <FormField
                      label="Slug"
                      name={`${prefix}.slug`}
                      error={fieldErrors[`${prefix}.slug`]}
                      required
                    >
                      <input
                        type="text"
                        value={variant.slug}
                        onChange={(e) => {
                          const nextVariants = [...(formData.variants || [])];
                          nextVariants[index] = { ...nextVariants[index], slug: e.target.value };
                          onFieldChange("variants", nextVariants);
                        }}
                        className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none bg-transparent text-xs"
                        placeholder="e.g. red-silk"
                      />
                    </FormField>

                    {/* VARIANT MATERIAL */}
                    <FormField
                      label="Material"
                      name={`${prefix}.material`}
                      error={fieldErrors[`${prefix}.material`]}
                      required
                    >
                      <select
                        value={variant.material}
                        onChange={(e) => {
                          const val = e.target.value;
                          const nextVariants = [...(formData.variants || [])];
                          const found = (dbMaterials.length > 0 ? dbMaterials : FABRIC_MATERIALS).find(
                            (m) => ("value" in m ? m.value === val : m.name === val)
                          );
                          const nameAr = found ? ("nameAr" in found ? found.nameAr : (found as any).ar) : "";
                          nextVariants[index] = {
                            ...nextVariants[index],
                            material: val as FabricMaterialValue | "",
                            materialAr: nameAr || "",
                          };
                          onFieldChange("variants", nextVariants);
                        }}
                        className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none bg-transparent text-xs"
                      >
                        <option value="">Select material</option>
                        {(dbMaterials.length > 0
                          ? dbMaterials.map(m => ({ value: m.name, label: m.name }))
                          : FABRIC_MATERIALS.map(m => ({ value: m.value, label: m.en }))
                        ).map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </FormField>

                    {/* VARIANT COLORS */}
                    <div className="md:col-span-2">
                      <FormField
                        label="Colors"
                        name={`${prefix}.colors`}
                        error={fieldErrors[`${prefix}.colors`]}
                        required
                      >
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenVariantColorDropdown(prev => prev === index ? null : index)}
                            className="w-full py-1 border-b border-gray-300 focus:border-black text-left bg-transparent min-h-7 flex items-center justify-between gap-2 cursor-pointer"
                          >
                            {!variant.colors || variant.colors.length === 0 ? (
                              <span className="text-xs text-black/60 leading-none">
                                Select colors
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-2 items-center">
                                {COLOR_OPTIONS.filter((c) =>
                                  variant.colors?.includes(c.value),
                                ).map((c) => (
                                  <span
                                    key={c.value}
                                    className="inline-flex items-center justify-center"
                                    title={c.en}
                                  >
                                    <span
                                      className="w-5 h-5 rounded-full border border-gray-200"
                                      style={{ backgroundColor: c.value }}
                                    />
                                  </span>
                                ))}
                              </div>
                            )}
                            <ChevronDown
                              size={14}
                              className={`shrink-0 text-black/40 transition-transform duration-200 ${
                                openVariantColorDropdown === index ? "rotate-180" : ""
                              }`}
                            />
                          </button>

                          <AnimatePresence>
                            {openVariantColorDropdown === index && (
                              <motion.div
                                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                                transition={{ duration: 0.15, ease: "easeOut" }}
                                className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-sm p-3 z-50 origin-top"
                              >
                                <div className="max-h-44 overflow-auto flex flex-col gap-2">
                                  {COLOR_OPTIONS.map((opt) => {
                                    const isSelected = variant.colors?.includes(opt.value);
                                    return (
                                      <label
                                        key={opt.value}
                                        className="flex items-center gap-2 cursor-pointer"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => {
                                            const currentColors = variant.colors || [];
                                            const nextColors = currentColors.includes(opt.value)
                                              ? currentColors.filter((col) => col !== opt.value)
                                              : [...currentColors, opt.value];
                                            const nextVariants = [...(formData.variants || [])];
                                            nextVariants[index] = { ...nextVariants[index], colors: nextColors };
                                            onFieldChange("variants", nextVariants);
                                          }}
                                          className="accent-black"
                                        />
                                        <span className="inline-flex items-center gap-2">
                                          <span
                                            className="w-4 h-4 rounded-full border border-gray-200"
                                            style={{ backgroundColor: opt.value }}
                                          />
                                          <span className="text-xs">
                                            {opt.en} / {opt.ar}
                                          </span>
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </FormField>
                    </div>

                    <FormField
                      label="Price Per Meter (AED)"
                      name={`${prefix}.pricePerMeter`}
                      error={fieldErrors[`${prefix}.pricePerMeter`]}
                      required
                    >
                      <input
                        type="text"
                        inputMode="decimal"
                        value={variant.pricePerMeter === 0 ? "" : variant.pricePerMeter}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "" || /^\d*\.?\d*$/.test(val)) {
                            const nextVariants = [...(formData.variants || [])];
                            nextVariants[index] = {
                              ...nextVariants[index],
                              pricePerMeter: val,
                              pricePerUnit: val,
                            };
                            onFieldChange("variants", nextVariants);
                          }
                        }}
                        className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none bg-transparent text-xs"
                        placeholder="0.00"
                      />
                    </FormField>

                    <FormField
                      label="Stock in Meters"
                      name={`${prefix}.stockInMeters`}
                      error={fieldErrors[`${prefix}.stockInMeters`]}
                      required
                    >
                      <input
                        type="text"
                        inputMode="numeric"
                        value={variant.stockInMeters === 0 ? "" : variant.stockInMeters}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "" || /^\d*$/.test(val)) {
                            const nextVariants = [...(formData.variants || [])];
                            nextVariants[index] = { ...nextVariants[index], stockInMeters: val };
                            onFieldChange("variants", nextVariants);
                          }
                        }}
                        className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none bg-transparent text-xs"
                        placeholder="e.g. 50"
                      />
                    </FormField>

                    <FormField label="Active Status" name={`${prefix}.isActive`}>
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="checkbox"
                          id={`${prefix}.isActive`}
                          checked={variant.isActive}
                          onChange={(e) => {
                            const nextVariants = [...(formData.variants || [])];
                            nextVariants[index] = { ...nextVariants[index], isActive: e.target.checked };
                            onFieldChange("variants", nextVariants);
                          }}
                          className="w-4 h-4 cursor-pointer"
                        />
                        <label
                          htmlFor={`${prefix}.isActive`}
                          className="text-xs text-gray-700 cursor-pointer"
                        >
                          Active (visible to customers)
                        </label>
                      </div>
                    </FormField>

                    <div className="md:col-span-2 space-y-2">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-label-sm text-[10px] text-black/60 uppercase tracking-widest font-semibold">
                          Images (Max 5)
                        </span>
                        {variant.images.length < 5 && (
                          <button
                            type="button"
                            onClick={() => {
                              const nextVariants = [...(formData.variants || [])];
                              nextVariants[index] = {
                                ...nextVariants[index],
                                images: [...nextVariants[index].images, ""],
                              };
                              onFieldChange("variants", nextVariants);
                            }}
                            className="text-xs text-black underline hover:text-neutral-700 font-medium"
                          >
                            + Add Image
                          </button>
                        )}
                      </div>
                      {fieldErrors[`${prefix}.images`] && (
                        <p className="text-xs text-red-500 mb-2">{fieldErrors[`${prefix}.images`]}</p>
                      )}
                      {variant.images.map((imgUrl, imgIdx) => (
                        <div key={imgIdx} className="p-4 border border-gray-100 bg-white rounded-none space-y-2">
                          <FabricImageUpload
                            value={imgUrl}
                            onChange={(val) => {
                              const nextVariants = [...(formData.variants || [])];
                              const nextImgs = [...nextVariants[index].images];
                              nextImgs[imgIdx] = val;
                              nextVariants[index] = { ...nextVariants[index], images: nextImgs };
                              onFieldChange("variants", nextVariants);
                            }}
                            chooseFileLabel="Upload Image"
                            uploadingLabel="Uploading..."
                            uploadFailedLabel="Upload failed"
                            removeLabel="Remove"
                          />
                          {variant.images.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const nextVariants = [...(formData.variants || [])];
                                const nextImgs = nextVariants[index].images.filter((_, i) => i !== imgIdx);
                                nextVariants[index] = { ...nextVariants[index], images: nextImgs };
                                onFieldChange("variants", nextVariants);
                              }}
                              className="text-[10px] text-red-500 hover:underline block mt-2"
                            >
                              Remove image from list
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
