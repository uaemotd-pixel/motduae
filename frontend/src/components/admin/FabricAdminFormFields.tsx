// components/admin/FabricAdminFormFields.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import FormField from "@/components/admin/FormField";
import FabricImageUpload from "@/components/admin/FabricImageUpload";
import StorePartnerPicker from "@/components/admin/StorePartnerPicker";
import AnimatedDropdown from "@/components/shared/AnimatedDropdown";
import colors from "@/components/shared/colors";
import {
  FabricFormData,
  FabricVariantFormData,
  FabricCutFormEntry,
  PickupAddress,
  createEmptyFabricCutRow,
} from "@/lib/createFabricAdmin";
import { api } from "@/lib/api/client";
import { formatCutLabel } from "@/lib/fabricUnits";
import {
  isValidUaePhone,
  normalizeUaePhone,
  extractDigits,
} from "@/lib/uaePhone";
import {
  UAE_EMIRATES,
  isValidEmirate,
  normalizeEmirate,
  getEmirateEn,
  getEmirateAr,
} from "@/lib/uaeAddress";

const COLOR_OPTIONS = colors;

interface CatalogCut {
  _id: string;
  name: string;
  nameAr?: string;
  value: number;
  unit: "war" | "meter";
  metersEquivalent?: number;
  lengthInMeters?: number;
  isActive?: boolean;
}

export function FabricCutsEditor({
  cuts,
  catalogCuts,
  errorPrefix,
  fieldErrors,
  onChange,
  loading,
  showTitle = true,
}: {
  cuts: FabricCutFormEntry[];
  catalogCuts: CatalogCut[];
  errorPrefix: string;
  fieldErrors: Record<string, string>;
  onChange: (cuts: FabricCutFormEntry[]) => void;
  loading?: boolean;
  showTitle?: boolean;
}) {
  const rows =
    cuts.length > 0 ? cuts : [createEmptyFabricCutRow()];

  const updateRows = (next: FabricCutFormEntry[]) => {
    onChange(next.length > 0 ? next : [createEmptyFabricCutRow()]);
  };

  const updateField = (
    index: number,
    field: "price" | "stock",
    value: string,
  ) => {
    const next = [...rows];
    next[index] = { ...next[index], [field]: value };
    updateRows(next);
  };

  const selectCut = (index: number, cutId: string) => {
    const catalog = catalogCuts.find((c) => c._id === cutId);
    const next = [...rows];
    next[index] = {
      ...next[index],
      cutId,
      cutName: catalog?.name,
      cutNameAr: catalog?.nameAr,
      cutValue: catalog?.value,
      cutUnit: catalog?.unit,
      lengthInMeters: catalog?.lengthInMeters ?? catalog?.metersEquivalent,
    };
    updateRows(next);
  };

  const addCutRow = () => {
    updateRows([...rows, createEmptyFabricCutRow()]);
  };

  const removeCutRow = (index: number) => {
    if (rows.length <= 1) return;
    updateRows(rows.filter((_, i) => i !== index));
  };

  const usedCutIds = new Set(
    rows.map((row) => row.cutId).filter((id) => id && id.trim() !== ""),
  );

  const canAddMore =
    catalogCuts.length > 0 &&
    rows.length < catalogCuts.length &&
    catalogCuts.some((cut) => !usedCutIds.has(cut._id));

  if (loading) {
    return (
      <p className="text-xs text-gray-500 py-2">Loading cuts catalog...</p>
    );
  }

  if (catalogCuts.length === 0) {
    return (
      <p className="text-xs text-amber-700 py-2">
        No active cuts found. Create cuts in Settings → Cuts first.
      </p>
    );
  }

  const rowInputClass =
    "w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none hover:cursor-text text-xs sm:text-sm bg-transparent";

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        {showTitle ? (
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Cuts — Price & Stock
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Select cut, set price per piece and stock.
            </p>
          </div>
        ) : (
          <div />
        )}
        {canAddMore && (
          <button
            type="button"
            onClick={addCutRow}
            className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-700 hover:text-black border-b border-transparent hover:border-black pb-0.5 transition-colors shrink-0 hover:cursor-pointer"
          >
            Add More Cuts
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {fieldErrors[errorPrefix] && (
        <p className="text-xs text-red-600">{fieldErrors[errorPrefix]}</p>
      )}

      <div className="space-y-4">
        <AnimatePresence initial={false}>
          {rows.map((entry, index) => {
            const rowPrefix = `${errorPrefix}.${index}`;
            const availableCuts = catalogCuts.filter(
              (cut) =>
                cut._id === entry.cutId || !usedCutIds.has(cut._id),
            );

            return (
              <motion.div
                key={`${errorPrefix}-cut-${index}`}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4"
              >
                <div className="flex-1 min-w-0">
                  <label
                    className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1"
                  >
                    Select cut
                  </label>
                  <div className="relative">
                    <select
                      value={entry.cutId}
                      onChange={(e) => selectCut(index, e.target.value)}
                      className={`${rowInputClass} appearance-none pr-7`}
                    >
                      <option value="">Choose a cut...</option>
                      {availableCuts.map((cut) => (
                        <option key={cut._id} value={cut._id}>
                          {cut.name} · {formatCutLabel(cut.value, cut.unit)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                    />
                  </div>
                  {fieldErrors[`${rowPrefix}.cutId`] && (
                    <p className="text-[10px] text-red-600 mt-1">
                      {fieldErrors[`${rowPrefix}.cutId`]}
                    </p>
                  )}
                </div>

                <div className="w-full sm:w-28 shrink-0">
                  <label
                    className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1"
                  >
                    Price (AED)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={entry.price}
                    onChange={(e) =>
                      updateField(index, "price", e.target.value)
                    }
                    placeholder="450"
                    className={rowInputClass}
                  />
                  {fieldErrors[`${rowPrefix}.price`] && (
                    <p className="text-[10px] text-red-600 mt-1">
                      {fieldErrors[`${rowPrefix}.price`]}
                    </p>
                  )}
                </div>

                <div className="w-full sm:w-28 shrink-0">
                  <label
                    className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1"
                  >
                    Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={entry.stock}
                    onChange={(e) =>
                      updateField(index, "stock", e.target.value)
                    }
                    placeholder="25"
                    className={rowInputClass}
                  />
                  {fieldErrors[`${rowPrefix}.stock`] && (
                    <p className="text-[10px] text-red-600 mt-1">
                      {fieldErrors[`${rowPrefix}.stock`]}
                    </p>
                  )}
                </div>

                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCutRow(index)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors shrink-0 self-end hover:cursor-pointer"
                    aria-label="Remove cut"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

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
  const [openVariantColorDropdown, setOpenVariantColorDropdown] = useState<
    number | null
  >(null);
  const [dbMaterials, setDbMaterials] = useState<
    { name: string; nameAr: string; _id: string }[]
  >([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [dbTags, setDbTags] = useState<
    { name: string; nameAr: string; _id: string }[]
  >([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [catalogCuts, setCatalogCuts] = useState<CatalogCut[]>([]);
  const [cutsLoading, setCutsLoading] = useState(true);

  const [openMaterial, setOpenMaterial] = useState(false);
  const [openTag, setOpenTag] = useState(false);
  const [openEmirate, setOpenEmirate] = useState(false);
  const [openColors, setOpenColors] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchMaterials = async () => {
      try {
        setMaterialsLoading(true);
        const data = await api.get<
          { name: string; nameAr: string; _id: string }[]
        >("/api/filters/materials");
        if (!cancelled && Array.isArray(data)) {
          setDbMaterials(data);
        }
      } catch {
        // Silently fall back to empty array
      } finally {
        if (!cancelled) setMaterialsLoading(false);
      }
    };
    fetchMaterials();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchTags = async () => {
      try {
        setTagsLoading(true);
        const data =
          await api.get<{ name: string; nameAr: string; _id: string }[]>(
            "/api/filters/tags",
          );
        if (!cancelled && Array.isArray(data)) {
          setDbTags(data);
        }
      } catch {
        // Silently fall back to empty array
      } finally {
        if (!cancelled) setTagsLoading(false);
      }
    };
    fetchTags();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchCuts = async () => {
      try {
        setCutsLoading(true);
        const data = await api.get<CatalogCut[]>("/api/admin/cuts");
        if (!cancelled && Array.isArray(data)) {
          const activeCuts = data.filter((cut) => cut.isActive !== false);
          setCatalogCuts(activeCuts);
        }
      } catch {
        if (!cancelled) setCatalogCuts([]);
      } finally {
        if (!cancelled) setCutsLoading(false);
      }
    };
    void fetchCuts();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (cutsLoading) return;
    if (formData.cuts.length > 0) return;
    onFieldChange("cuts", [createEmptyFabricCutRow()]);
  }, [cutsLoading, formData.cuts.length, onFieldChange]);

  const selectedColors = Array.isArray(formData.colors) ? formData.colors : [];

  const toggleColor = (colorValue: string) => {
    const current = Array.isArray(formData.colors) ? formData.colors : [];
    const newSelected = current.includes(colorValue)
      ? current.filter((c) => c !== colorValue)
      : [...current, colorValue];
    onFieldChange("colors", newSelected);
  };

  const handlePhoneChange = (field: string, value: string) => {
    const digits = extractDigits(value);
    if (digits.length <= 9) {
      const normalized = normalizeUaePhone(digits);
      if (field === "pickupAddress.phone") {
        onPickupChange("phone", normalized);
      } else {
        const parts = field.split(".");
        const variantIndex = parseInt(parts[1]);
        const subfield = parts[2];
        if (subfield === "phone") {
          const nextVariants = [...(formData.variants || [])];
          nextVariants[variantIndex] = {
            ...nextVariants[variantIndex],
            pickupAddress: {
              ...nextVariants[variantIndex].pickupAddress,
              phone: normalized,
            },
          };
          onFieldChange("variants", nextVariants);
        }
      }
    }
  };

  const getPhoneDisplayValue = (phone: string): string => {
    if (!phone) return "";
    const digits = extractDigits(phone);
    if (digits.startsWith("971")) {
      return digits.slice(3);
    }
    return digits.slice(0, 9);
  };

  const materialOptions = dbMaterials.map((m) => ({
    value: m.name,
    en: m.name,
    ar: m.nameAr || m.name,
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
          onChange={(e) => onFieldChange("name", e.target.value)}
          className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none hover:cursor-text text-xs sm:text-sm"
          placeholder="Silk Fabric"
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
          onChange={(e) => onFieldChange("nameAr", e.target.value)}
          className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none text-right hover:cursor-text text-xs sm:text-sm"
          placeholder="قماش حرير"
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
          onChange={(e) => onFieldChange("description", e.target.value)}
          className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none hover:cursor-text text-xs sm:text-sm"
          placeholder="Describe the fabric..."
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
          onChange={(e) => onFieldChange("descriptionAr", e.target.value)}
          className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none text-right hover:cursor-text text-xs sm:text-sm"
          placeholder="وصف القماش..."
        />
      </FormField>

      <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <FormField
          label="Material (ENG / AR)"
          name="material"
          required
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
                    onFieldChange("material", "");
                    onFieldChange("materialAr", "");
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
                      onFieldChange("material", opt.en);
                      onFieldChange("materialAr", opt.ar);
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
                  const opt = tagOptions.find((o) => o.value === formData.tag);
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
                    onFieldChange("tag", "");
                    onFieldChange("tagAr", "");
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
                      onFieldChange("tag", opt.en);
                      onFieldChange("tagAr", opt.ar);
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

        <FormField
          label="Colors"
          name="colors"
          required
          error={fieldErrors.color}
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
                {selectedColors.length === 0 ? (
                  <span className="text-[10px] sm:text-xs text-black/60 leading-none">
                    Select colors
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-1 sm:gap-1.5 items-center">
                    {COLOR_OPTIONS.filter((c) =>
                      selectedColors.includes(c.value),
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
                const selected = selectedColors.includes(opt.value);
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

      {/* Cuts pricing & stock */}
      <div className="md:col-span-2">
        <FabricCutsEditor
          cuts={formData.cuts}
          catalogCuts={catalogCuts}
          errorPrefix="cuts"
          fieldErrors={fieldErrors}
          loading={cutsLoading}
          onChange={(cuts) => onFieldChange("cuts", cuts)}
        />
      </div>

      <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-2 gap-4 sm:gap-6">
        <FormField
          label="Min Age (years)"
          name="minAge"
          error={fieldErrors.minAge}
        >
          <input
            type="number"
            min="0"
            max="150"
            value={formData.minAge ?? ""}
            onChange={(e) =>
              onFieldChange(
                "minAge",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
            className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none hover:cursor-text text-xs sm:text-sm"
            placeholder="0"
          />
        </FormField>

        <FormField
          label="Max Age (years)"
          name="maxAge"
          error={fieldErrors.maxAge}
        >
          <input
            type="number"
            min="0"
            max="150"
            value={formData.maxAge ?? ""}
            onChange={(e) =>
              onFieldChange(
                "maxAge",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
            className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none hover:cursor-text text-xs sm:text-sm"
            placeholder="150"
          />
        </FormField>
      </div>

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

      <div className="md:col-span-2">
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Store Pickup Address
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <FormField
            label="Emirate"
            name="pickupAddress.emirate"
            required
            error={fieldErrors["pickupAddress.emirate"]}
          >
            <AnimatedDropdown
              isOpen={openEmirate}
              onClose={() => setOpenEmirate(false)}
              trigger={
                <SelectTrigger
                  value={formData.pickupAddress.emirate}
                  placeholder="Select emirate"
                  displayValue={
                    formData.pickupAddress.emirate
                      ? `${getEmirateEn(formData.pickupAddress.emirate)} / ${getEmirateAr(formData.pickupAddress.emirate)}`
                      : ""
                  }
                  onClick={() => setOpenEmirate(!openEmirate)}
                />
              }
              dropdownClassName="w-full bg-white rounded-xl shadow-lg border border-gray-200 max-h-60 overflow-y-auto py-1"
              position="bottom-left"
            >
              <button
                type="button"
                onClick={() => {
                  onPickupChange("emirate", "");
                  setOpenEmirate(false);
                }}
                className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-left text-xs sm:text-sm hover:bg-gray-100 hover:cursor-pointer"
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
                  className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-left text-xs sm:text-sm hover:bg-gray-100 hover:cursor-pointer"
                >
                  {emirate.en} / {emirate.ar}
                </button>
              ))}
            </AnimatedDropdown>
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
              className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none hover:cursor-text text-xs sm:text-sm"
              placeholder="e.g., Deira"
            />
          </FormField>

          <FormField label="Street" name="pickupAddress.street" required>
            <input
              type="text"
              value={formData.pickupAddress.street}
              onChange={(e) => onPickupChange("street", e.target.value)}
              className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none hover:cursor-text text-xs sm:text-sm"
              placeholder="e.g., Al Maktoum Street"
            />
          </FormField>

          <FormField label="Building" name="pickupAddress.building" required>
            <input
              type="text"
              value={formData.pickupAddress.building}
              onChange={(e) => onPickupChange("building", e.target.value)}
              className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none hover:cursor-text text-xs sm:text-sm"
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
              <span className="inline-flex items-center px-3 py-1 bg-neutral-50 text-neutral-400 text-xs sm:text-[14px] select-none border-r border-gray-200">
                +971
              </span>
              <input
                type="text"
                value={getPhoneDisplayValue(formData.pickupAddress.phone)}
                onChange={(e) => {
                  handlePhoneChange("pickupAddress.phone", e.target.value);
                }}
                className="w-full py-1 pl-3 bg-transparent text-xs sm:text-[14px] focus:outline-none hover:cursor-text"
                placeholder="123456777"
                maxLength={9}
              />
            </div>
          </FormField>
        </div>
      </div>

      <div className="md:col-span-2">
        <div className="mb-2 flex justify-between items-center">
          <span className="font-label-sm text-[10px] sm:text-[11px] text-black/60 uppercase tracking-[0.2em]">
            Images (max 5) *
          </span>
          {formData.images.length < 5 && (
            <button
              type="button"
              onClick={onAddImage}
              className="text-[10px] sm:text-xs text-black underline hover:cursor-pointer"
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
                className="text-[10px] sm:text-xs text-red-500 mt-1 hover:cursor-pointer"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="md:col-span-2">
        <FormField label="Active Status" name="isActive">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => onFieldChange("isActive", e.target.checked)}
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 hover:cursor-pointer"
            />
            <label
              htmlFor="isActive"
              className="text-xs sm:text-sm text-gray-700 hover:cursor-pointer"
            >
              Product is active (visible to customers)
            </label>
          </div>
        </FormField>
      </div>

      <div className="md:col-span-2 pt-6 mt-6 border-t border-gray-200 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-sm font-semibold text-black tracking-wider uppercase">
              Fabric Variations
            </h3>
            <p className="text-gray-500 text-xs mt-1">
              Add different variations of this fabric (e.g., other colors, stock
              levels)
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
                  cuts: [createEmptyFabricCutRow()],
                  listedByStore: formData.listedByStore || "",
                  pickupAddress: formData.pickupAddress || {
                    emirate: "",
                    city: "",
                    street: "",
                    building: "",
                    phone: "",
                  },
                  isActive: true,
                } satisfies FabricVariantFormData,
              ]);
            }}
            className="px-3 sm:px-4 py-1.5 sm:py-2 border border-black text-xs uppercase tracking-wider hover:bg-black hover:text-white transition font-medium hover:cursor-pointer"
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
                  className="p-4 sm:p-6 border border-gray-200 bg-[#FAF9F5] space-y-6 relative rounded-none animate-fadeIn"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-gray-200 gap-2">
                    <span className="font-label-sm text-xs text-black/60 uppercase tracking-widest font-semibold">
                      Variant #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onFieldChange(
                          "variants",
                          (formData.variants || []).filter(
                            (_, i) => i !== index,
                          ),
                        );
                      }}
                      className="text-xs text-red-600 hover:underline font-medium hover:cursor-pointer"
                    >
                      Remove Variant
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
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
                          nextVariants[index] = {
                            ...nextVariants[index],
                            name: val,
                          };
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
                        className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none bg-transparent text-xs sm:text-sm hover:cursor-text"
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
                          nextVariants[index] = {
                            ...nextVariants[index],
                            nameAr: e.target.value,
                          };
                          onFieldChange("variants", nextVariants);
                        }}
                        className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none bg-transparent text-right text-xs sm:text-sm hover:cursor-text"
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
                          nextVariants[index] = {
                            ...nextVariants[index],
                            slug: e.target.value,
                          };
                          onFieldChange("variants", nextVariants);
                        }}
                        className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none bg-transparent text-xs sm:text-sm hover:cursor-text"
                        placeholder="e.g. red-silk"
                      />
                    </FormField>

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
                          const found = dbMaterials.find(
                            (m) => m.name === val || m.nameAr === val,
                          );
                          const nameAr = found ? found.nameAr : "";
                          nextVariants[index] = {
                            ...nextVariants[index],
                            material: val,
                            materialAr: nameAr || "",
                          };
                          onFieldChange("variants", nextVariants);
                        }}
                        className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none bg-transparent text-xs sm:text-sm hover:cursor-pointer"
                      >
                        <option value="">Select material</option>
                        {dbMaterials.map((m) => (
                          <option key={m._id} value={m.name}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </FormField>

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
                            onClick={() =>
                              setOpenVariantColorDropdown((prev) =>
                                prev === index ? null : index,
                              )
                            }
                            className="w-full py-1 border-b border-gray-300 focus:border-black text-left bg-transparent min-h-7 flex items-center justify-between gap-2 hover:cursor-pointer"
                          >
                            {!variant.colors || variant.colors.length === 0 ? (
                              <span className="text-[10px] sm:text-xs text-black/60 leading-none">
                                Select colors
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1 sm:gap-1.5 items-center">
                                {COLOR_OPTIONS.filter((c) =>
                                  variant.colors?.includes(c.value),
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
                            <ChevronDown
                              size={14}
                              className={`shrink-0 text-black/40 transition-transform duration-200 ${
                                openVariantColorDropdown === index
                                  ? "rotate-180"
                                  : ""
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
                                className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-sm p-1.5 sm:p-3 z-50 origin-top max-h-60 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-thumb]:rounded-full"
                              >
                                <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2 sm:gap-1">
                                  {COLOR_OPTIONS.map((opt) => {
                                    const isSelected = variant.colors?.includes(
                                      opt.value,
                                    );
                                    return (
                                      <label
                                        key={opt.value}
                                        className="flex items-center gap-1 sm:gap-1.5 cursor-pointer px-1 py-0.5 hover:bg-gray-50 rounded hover:cursor-pointer"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => {
                                            const currentColors =
                                              variant.colors || [];
                                            const nextColors =
                                              currentColors.includes(opt.value)
                                                ? currentColors.filter(
                                                    (col) => col !== opt.value,
                                                  )
                                                : [...currentColors, opt.value];
                                            const nextVariants = [
                                              ...(formData.variants || []),
                                            ];
                                            nextVariants[index] = {
                                              ...nextVariants[index],
                                              colors: nextColors,
                                            };
                                            onFieldChange(
                                              "variants",
                                              nextVariants,
                                            );
                                          }}
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
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </FormField>
                    </div>

                    <div className="md:col-span-2">
                      <FabricCutsEditor
                        cuts={variant.cuts || []}
                        catalogCuts={catalogCuts}
                        errorPrefix={`${prefix}.cuts`}
                        fieldErrors={fieldErrors}
                        loading={cutsLoading}
                        showTitle={false}
                        onChange={(cuts) => {
                          const nextVariants = [...(formData.variants || [])];
                          nextVariants[index] = {
                            ...nextVariants[index],
                            cuts,
                          };
                          onFieldChange("variants", nextVariants);
                        }}
                      />
                    </div>

                    <FormField
                      label="Active Status"
                      name={`${prefix}.isActive`}
                    >
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="checkbox"
                          id={`${prefix}.isActive`}
                          checked={variant.isActive}
                          onChange={(e) => {
                            const nextVariants = [...(formData.variants || [])];
                            nextVariants[index] = {
                              ...nextVariants[index],
                              isActive: e.target.checked,
                            };
                            onFieldChange("variants", nextVariants);
                          }}
                          className="w-3.5 h-3.5 sm:w-4 sm:h-4 hover:cursor-pointer"
                        />
                        <label
                          htmlFor={`${prefix}.isActive`}
                          className="text-[10px] sm:text-xs text-gray-700 hover:cursor-pointer"
                        >
                          Active (visible to customers)
                        </label>
                      </div>
                    </FormField>

                    <div className="md:col-span-2 space-y-2">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                        <span className="font-label-sm text-[10px] text-black/60 uppercase tracking-widest font-semibold">
                          Images (Max 5)
                        </span>
                        {variant.images.length < 5 && (
                          <button
                            type="button"
                            onClick={() => {
                              const nextVariants = [
                                ...(formData.variants || []),
                              ];
                              nextVariants[index] = {
                                ...nextVariants[index],
                                images: [...nextVariants[index].images, ""],
                              };
                              onFieldChange("variants", nextVariants);
                            }}
                            className="text-[10px] sm:text-xs text-black underline hover:text-neutral-700 font-medium hover:cursor-pointer"
                          >
                            + Add Image
                          </button>
                        )}
                      </div>
                      {fieldErrors[`${prefix}.images`] && (
                        <p className="text-[10px] sm:text-xs text-red-500 mb-2">
                          {fieldErrors[`${prefix}.images`]}
                        </p>
                      )}
                      {variant.images.map((imgUrl, imgIdx) => (
                        <div
                          key={imgIdx}
                          className="p-3 sm:p-4 border border-gray-100 bg-white rounded-none space-y-2"
                        >
                          <FabricImageUpload
                            value={imgUrl}
                            onChange={(val) => {
                              const nextVariants = [
                                ...(formData.variants || []),
                              ];
                              const nextImgs = [...nextVariants[index].images];
                              nextImgs[imgIdx] = val;
                              nextVariants[index] = {
                                ...nextVariants[index],
                                images: nextImgs,
                              };
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
                                const nextVariants = [
                                  ...(formData.variants || []),
                                ];
                                const nextImgs = nextVariants[
                                  index
                                ].images.filter((_, i) => i !== imgIdx);
                                nextVariants[index] = {
                                  ...nextVariants[index],
                                  images: nextImgs,
                                };
                                onFieldChange("variants", nextVariants);
                              }}
                              className="text-[10px] sm:text-xs text-red-500 hover:underline hover:cursor-pointer"
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
