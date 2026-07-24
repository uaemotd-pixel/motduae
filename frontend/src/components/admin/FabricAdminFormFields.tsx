"use client";

import { useState, useRef, useEffect } from "react";
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
  const [dbMaterials, setDbMaterials] = useState<
    { name: string; nameAr: string; _id: string }[]
  >([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);

  // Fetch materials from DB for "fabrics" domain
  useEffect(() => {
    let cancelled = false;
    const fetchMaterials = async () => {
      try {
        setMaterialsLoading(true);
        const data = await api.get<
          { name: string; nameAr: string; _id: string }[]
        >("/api/admin/materials?domain=fabrics");
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

  // Tag options – map directly from FABRIC_TAGS
  const tagOptionsEn = FABRIC_TAGS.map((t) => ({
    value: t.value,
    label: t.en,
  }));
  const tagOptionsAr = FABRIC_TAGS.map((t) => ({
    value: t.ar,
    label: t.ar,
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
          <select
            value={formData.material}
            onChange={(e) =>
              onFieldChange("material", e.target.value as FabricMaterialValue)
            }
            className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none cursor-pointer"
          >
            <option value="">Select material</option>
            {materialOptionsEn.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>

        {/* Material (AR) – dropdown with Arabic labels */}
        <FormField
          label="Material (AR)"
          name="materialAr"
          error={fieldErrors.materialAr}
          required
        >
          <select
            value={formData.materialAr}
            onChange={(e) => onFieldChange("materialAr", e.target.value)}
            className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none text-right cursor-pointer"
          >
            <option value="">اختر النوع</option>
            {materialOptionsAr.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
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

            {isColorDropdownOpen && (
              <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-sm p-3 z-50">
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
              </div>
            )}
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
        <select
          value={formData.tag}
          onChange={(e) => onFieldChange("tag", e.target.value)}
          className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none cursor-pointer"
        >
          <option value="">Select tag (optional)</option>
          {tagOptionsEn.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      {/* Tag (AR) – optional dropdown with Arabic labels */}
      <FormField label="Tag (AR)" name="tagAr" error={fieldErrors.tagAr}>
        <select
          value={formData.tagAr}
          onChange={(e) => onFieldChange("tagAr", e.target.value)}
          className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none text-right cursor-pointer"
        >
          <option value="">اختر الوسم (اختياري)</option>
          {tagOptionsAr.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      {/* Fabric Unit, Price, Stock in one row */}
      <div className="md:col-span-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* Fabric Unit */}
          <FormField label="Unit" name="fabricUnit">
            <select
              value={formData.fabricUnit}
              onChange={(e) =>
                handleUnitChange(e.target.value as FabricUnitValue)
              }
              className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none cursor-pointer bg-transparent"
            >
              <option value="meters">Meters</option>
              <option value="wara">Wara</option>
            </select>
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
            <select
              value={formData.pickupAddress.emirate}
              onChange={(e) => onPickupChange("emirate", e.target.value)}
              className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none cursor-pointer"
            >
              <option value="">Select emirate</option>
              {UAE_EMIRATES.map((emirate) => (
                <option key={emirate.value} value={emirate.value}>
                  {emirate.en} / {emirate.ar}
                </option>
              ))}
            </select>
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
    </div>
  );
}
