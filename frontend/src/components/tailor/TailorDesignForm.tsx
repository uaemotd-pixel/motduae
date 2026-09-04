"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { Link, useRouter } from "@/i18n/navigation";
import FormField from "@/components/admin/FormField";
import ImageUpload from "@/components/admin/ImageUpload";
import NumericInput from "@/components/tailor/NumericInput";
import { api, getApiErrorMessage, type ApiError } from "@/lib/api/client";
import { ERROR_TOAST, SUCCESS_TOAST } from "@/lib/tailorPortalToast";
import {
  createTailorDesign,
  designToForm,
  emptyTailorDesignForm,
  fetchDefaultTailoringFee,
  fetchDesignCategories,
  fetchDesignMaterials,
  fetchDesignPatterns,
  fetchDesignSeasons,
  fetchDesignTags,
  fetchTailorDesign,
  isShopMissingError,
  slugifyDesignName,
  updateTailorDesign,
  type DesignCategoryOption,
  type DesignFilterOption,
  type TailorDesignFormData,
} from "@/lib/tailorDesigns";
import AnimatedDropdown from "@/components/shared/AnimatedDropdown";

const INPUT_CLASS =
  "w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none hover:cursor-text text-xs sm:text-sm bg-transparent";

type DropdownOption = { value: string; en: string; ar: string };

function FilterSelectTrigger({
  value,
  placeholder,
  displayValue,
  onClick,
}: {
  value: string;
  placeholder: string;
  displayValue: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full py-1 border-b border-gray-300 focus:border-black text-left bg-transparent text-xs sm:text-sm flex items-center justify-between hover:cursor-pointer transition-colors"
    >
      <span
        className={`truncate pr-2 ${value ? "text-black" : "text-gray-400"}`}
      >
        {displayValue || placeholder}
      </span>
      <span className="text-gray-400 shrink-0">▾</span>
    </button>
  );
}

type BilingualFilterDropdownProps = {
  label: string;
  name: string;
  required?: boolean;
  error?: string;
  value: string;
  options: DropdownOption[];
  loading: boolean;
  loadingText: string;
  emptyText: string;
  placeholder: string;
  clearLabel: string;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSelect: (en: string, ar: string, value: string) => void;
  onClear: () => void;
};

function BilingualFilterDropdown({
  label,
  name,
  required,
  error,
  value,
  options,
  loading,
  loadingText,
  emptyText,
  placeholder,
  clearLabel,
  isOpen,
  onToggle,
  onClose,
  onSelect,
  onClear,
}: BilingualFilterDropdownProps) {
  const selected = options.find((o) => o.value === value);
  const displayValue = selected ? `${selected.en} / ${selected.ar}` : "";

  return (
    <FormField label={label} name={name} required={required} error={error}>
      <AnimatedDropdown
        isOpen={isOpen}
        onClose={onClose}
        trigger={
          <FilterSelectTrigger
            value={value}
            placeholder={loading ? loadingText : placeholder}
            displayValue={displayValue}
            onClick={onToggle}
          />
        }
        dropdownClassName="w-full bg-white rounded-xl shadow-lg border border-gray-200 max-h-60 overflow-y-auto py-1"
        position="bottom-left"
      >
        {loading ? (
          <div className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-500">
            {loadingText}
          </div>
        ) : options.length === 0 ? (
          <div className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-500">
            {emptyText}
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                onClear();
                onClose();
              }}
              className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-left text-xs sm:text-sm text-gray-400 hover:bg-gray-100 hover:cursor-pointer"
            >
              {clearLabel}
            </button>
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onSelect(opt.en, opt.ar, opt.value);
                  onClose();
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
  );
}

type TailorDesignFormProps = {
  designId?: string;
};

type FieldKey = keyof TailorDesignFormData;

export default function TailorDesignForm({ designId }: TailorDesignFormProps) {
  const t = useTranslations("TailorPortal.designs");
  const router = useRouter();
  const isEditMode = Boolean(designId);

  const [loading, setLoading] = useState(isEditMode);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [shopMissing, setShopMissing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<string, string>>
  >({});
  const [formData, setFormData] = useState<TailorDesignFormData>(
    emptyTailorDesignForm(),
  );
  const [categoryOptions, setCategoryOptions] = useState<
    DesignCategoryOption[]
  >([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [materialOptions, setMaterialOptions] = useState<DesignFilterOption[]>(
    [],
  );
  const [patternOptions, setPatternOptions] = useState<DesignFilterOption[]>(
    [],
  );
  const [seasonOptions, setSeasonOptions] = useState<DesignFilterOption[]>([]);
  const [tagOptions, setTagOptions] = useState<DesignFilterOption[]>([]);
  const [cutOptions, setCutOptions] = useState<
    {
      _id: string;
      name: string;
      nameAr?: string;
      value: number;
      unit: string;
      isActive?: boolean;
      metersEquivalent?: number;
      lengthInMeters?: number;
    }[]
  >([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [patternsLoading, setPatternsLoading] = useState(true);
  const [seasonsLoading, setSeasonsLoading] = useState(true);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [cutsLoading, setCutsLoading] = useState(true);
  const [openCategory, setOpenCategory] = useState(false);
  const [openMaterial, setOpenMaterial] = useState(false);
  const [openPattern, setOpenPattern] = useState(false);
  const [openSeason, setOpenSeason] = useState(false);
  const [openTag, setOpenTag] = useState(false);
  const [openMinCut, setOpenMinCut] = useState(false);
  const formActionsRef = useRef<HTMLDivElement>(null);
  const previousImageCountRef = useRef(formData.images.length);

  const handleNumberChange = (
    field: "basePrice" | "tailoringFee" | "estimatedDays",
    value: string,
  ) => {
    if (value === "") {
      handleChange(field, 0);
      return;
    }
    const num =
      field === "estimatedDays" ? parseInt(value, 10) : parseFloat(value);
    if (!Number.isNaN(num) && num >= 0) {
      handleChange(field, num);
    }
  };

  const getNumberDisplay = (value: number): string =>
    value === 0 ? "" : String(value);

  useEffect(() => {
    // Fetch design categories + default tailoring fee from platform settings
    let cancelled = false;
    const load = async () => {
      try {
        const [cats, defaultTailoringFee] = await Promise.all([
          fetchDesignCategories(),
          isEditMode ? Promise.resolve(null) : fetchDefaultTailoringFee(),
        ]);
        if (cancelled) return;
        setCategoryOptions(cats);
        setFormData((prev) => {
          let next = prev;
          if (prev.category === "" && cats.length > 0) {
            next = { ...next, category: cats[0].name };
          }
          if (
            !isEditMode &&
            defaultTailoringFee !== null &&
            Number.isFinite(defaultTailoringFee)
          ) {
            next = { ...next, tailoringFee: defaultTailoringFee };
          }
          return next;
        });
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isEditMode]);

  useEffect(() => {
    let cancelled = false;

    const loadFilters = async () => {
      try {
        const [materials, patterns, seasons, tags, cuts] = await Promise.all([
          fetchDesignMaterials(),
          fetchDesignPatterns(),
          fetchDesignSeasons(),
          fetchDesignTags(),
          api.get<any[]>("/api/filters/cuts").catch(() => []),
        ]);
        if (cancelled) return;
        setMaterialOptions(materials);
        setPatternOptions(patterns);
        setSeasonOptions(seasons);
        setTagOptions(tags);
        const activeCuts = Array.isArray(cuts)
          ? cuts.filter((c) => c.isActive !== false)
          : [];
        setCutOptions(activeCuts);
      } catch {
        // fall back to empty lists
      } finally {
        if (!cancelled) {
          setMaterialsLoading(false);
          setPatternsLoading(false);
          setSeasonsLoading(false);
          setTagsLoading(false);
          setCutsLoading(false);
        }
      }
    };

    void loadFilters();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (formData.images.length > previousImageCountRef.current) {
      requestAnimationFrame(() => {
        formActionsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      });
    }
    previousImageCountRef.current = formData.images.length;
  }, [formData.images.length]);

  useEffect(() => {
    if (!designId) return;

    let cancelled = false;

    const loadDesign = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const design = await fetchTailorDesign(designId);
        if (cancelled) return;
        setFormData(designToForm(design));
      } catch (err: unknown) {
        if (!cancelled) {
          const message = getApiErrorMessage(err, t("errors.loadFailed"));
          setLoadError(message);
          toast.error(message, ERROR_TOAST);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadDesign();

    return () => {
      cancelled = true;
    };
  }, [designId, t]);

  const handleChange = (
    field: FieldKey,
    value: string | number | boolean | string[],
  ) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value } as TailorDesignFormData;

      if (field === "name" && typeof value === "string") {
        next.slug = slugifyDesignName(value);
      }

      return next;
    });

    if (fieldErrors[field as string]) {
      setFieldErrors((prev) => ({ ...prev, [field as string]: undefined }));
    }
  };

  const handleBilingualSelect = (
    enField: keyof TailorDesignFormData,
    arField: keyof TailorDesignFormData,
    en: string,
    ar: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [enField]: en,
      [arField]: ar,
    }));
    if (fieldErrors[enField as string]) {
      setFieldErrors((prev) => ({ ...prev, [enField as string]: undefined }));
    }
  };

  const clearBilingualSelect = (
    enField: keyof TailorDesignFormData,
    arField: keyof TailorDesignFormData,
  ) => {
    handleBilingualSelect(enField, arField, "", "");
  };

  const toDropdownOptions = (items: DesignFilterOption[]) =>
    items.map((item) => ({
      value: item.name,
      en: item.name,
      ar: item.nameAr || item.name,
    }));

  const materialDropdownOptions = toDropdownOptions(materialOptions);
  const patternDropdownOptions = toDropdownOptions(patternOptions);
  const seasonDropdownOptions = toDropdownOptions(seasonOptions);
  const tagDropdownOptions = toDropdownOptions(tagOptions);
  const categoryDropdownOptions = categoryOptions.map((cat) => ({
    value: cat.name,
    en: cat.name,
    ar: cat.nameAr || cat.name,
  }));
  const cutDropdownOptions: DropdownOption[] = useMemo(
    () =>
      cutOptions.map((cut) => {
        const meters = cut.metersEquivalent ?? cut.lengthInMeters ?? cut.value;
        const unitLabelEn = cut.unit === "war" ? "war" : "m";
        const unitLabelAr = cut.unit === "war" ? "وار" : "متر";
        const enLabel = `${cut.name} (${cut.value} ${unitLabelEn} ≈ ${meters}m)`;
        const arLabel = `${cut.nameAr || cut.name} (${cut.value} ${unitLabelAr} ≈ ${meters}م)`;
        return {
          value: cut._id,
          en: enLabel,
          ar: arLabel,
        };
      }),
    [cutOptions],
  );

  const filterLoadingText = t("filters.loading");
  const filterEmptyText = t("filters.empty");

  const handleImageChange = (index: number, url: string) => {
    if (!url.trim() && formData.images.length > 1) {
      removeImageField(index);
      return;
    }

    const images = [...formData.images];
    images[index] = url;
    handleChange("images", images);
  };

  const addImageField = () => {
    if (formData.images.length < 5) {
      handleChange("images", [...formData.images, ""]);
    }
  };

  const removeImageField = (index: number) => {
    const images = formData.images.filter((_, i) => i !== index);
    handleChange("images", images.length ? images : [""]);
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) errors.name = t("validation.nameRequired");
    if (!formData.nameAr.trim()) errors.nameAr = t("validation.nameArRequired");
    if (!formData.images.some((image) => image.trim())) {
      errors.images = t("validation.imagesRequired");
    }

    if (!Number.isFinite(formData.basePrice) || formData.basePrice < 0) {
      errors.basePrice = t("validation.priceInvalid");
    }
    if (!formData.minCutId || !formData.minCutId.trim()) {
      errors.minCutId = t("validation.minCutRequired");
    }
    if (
      !Number.isFinite(formData.estimatedDays) ||
      formData.estimatedDays < 1
    ) {
      errors.estimatedDays = t("validation.estimatedDaysInvalid");
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);

    try {
      if (isEditMode && designId) {
        await updateTailorDesign(designId, formData);
        toast.success(t("successUpdated"), SUCCESS_TOAST);
      } else {
        await createTailorDesign(formData);
        toast.success(t("successCreated"), SUCCESS_TOAST);
      }
      router.push("/tailor/designs");
    } catch (err: unknown) {
      if (!isEditMode && isShopMissingError(err)) {
        setShopMissing(true);
      }

      const status = (err as ApiError).status;
      const message =
        status === 409
          ? getApiErrorMessage(err, t("errors.conflict"))
          : getApiErrorMessage(
              err,
              isEditMode ? t("errors.updateFailed") : t("errors.createFailed"),
            );
      toast.error(message, ERROR_TOAST);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl border border-(--color-border) bg-white p-8">
        <p className="[font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em] text-(--color-grey-muted)">
          {t("loading")}
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-3xl border border-red-200 bg-red-50 p-8">
        <p className="[font-family:var(--font-body)] text-[14px] text-red-700 mb-4">
          {loadError}
        </p>
        <Link
          href="/tailor/designs"
          className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-black underline"
        >
          {t("backToList")}
        </Link>
      </div>
    );
  }

  if (shopMissing) {
    return (
      <div className="max-w-2xl border border-(--color-border) bg-white p-8">
        <h1 className="[font-family:var(--font-display)] text-[28px] text-black mb-3">
          {t("shopRequiredTitle")}
        </h1>
        <p className="[font-family:var(--font-body)] text-[14px] text-(--color-grey-muted) mb-6">
          {t("shopRequiredDescription")}
        </p>
        <Link
          href="/tailor/shop"
          className="inline-block px-8 py-3 bg-black text-white text-[10px] tracking-[0.22em] uppercase hover:bg-[#2A2A28] transition [font-family:var(--font-ui)]"
        >
          {t("shopRequiredCta")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-0">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-light text-black tracking-tight">
          {isEditMode ? t("editTitle") : t("createTitle")}
        </h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">
          {isEditMode ? t("editDescription") : t("createDescription")}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <FormField
            label={t("fields.name")}
            name="name"
            required
            error={fieldErrors.name}
          >
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className={INPUT_CLASS}
            />
          </FormField>

          <FormField
            label={t("fields.nameAr")}
            name="nameAr"
            required
            error={fieldErrors.nameAr}
          >
            <input
              id="nameAr"
              type="text"
              value={formData.nameAr}
              onChange={(e) => handleChange("nameAr", e.target.value)}
              dir="rtl"
              className={`${INPUT_CLASS} text-right`}
            />
          </FormField>

          <FormField
            label={t("fields.description")}
            name="description"
            error={fieldErrors.description}
          >
            <input
              id="description"
              type="text"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              className={INPUT_CLASS}
            />
          </FormField>

          <FormField
            label={t("fields.descriptionAr")}
            name="descriptionAr"
            error={fieldErrors.descriptionAr}
          >
            <input
              id="descriptionAr"
              type="text"
              value={formData.descriptionAr}
              onChange={(e) => handleChange("descriptionAr", e.target.value)}
              dir="rtl"
              className={`${INPUT_CLASS} text-right`}
            />
          </FormField>

          <div className="md:col-span-2 rounded-xl space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              <BilingualFilterDropdown
                label={t("fields.category")}
                name="category"
                required
                error={fieldErrors.category}
                value={formData.category}
                options={categoryDropdownOptions}
                loading={categoriesLoading}
                loadingText={filterLoadingText}
                emptyText={filterEmptyText}
                placeholder={t("filters.selectCategory")}
                clearLabel={t("filters.selectCategory")}
                isOpen={openCategory}
                onToggle={() => setOpenCategory(!openCategory)}
                onClose={() => setOpenCategory(false)}
                onSelect={(en) => handleChange("category", en)}
                onClear={() => handleChange("category", "")}
              />
              <BilingualFilterDropdown
                label={t("fields.material")}
                name="material"
                error={fieldErrors.material}
                value={formData.material}
                options={materialDropdownOptions}
                loading={materialsLoading}
                loadingText={filterLoadingText}
                emptyText={filterEmptyText}
                placeholder={t("filters.selectMaterial")}
                clearLabel={t("filters.selectMaterial")}
                isOpen={openMaterial}
                onToggle={() => setOpenMaterial(!openMaterial)}
                onClose={() => setOpenMaterial(false)}
                onSelect={(en, ar) =>
                  handleBilingualSelect("material", "materialAr", en, ar)
                }
                onClear={() => clearBilingualSelect("material", "materialAr")}
              />
              <BilingualFilterDropdown
                label={t("fields.pattern")}
                name="pattern"
                error={fieldErrors.pattern}
                value={formData.pattern}
                options={patternDropdownOptions}
                loading={patternsLoading}
                loadingText={filterLoadingText}
                emptyText={filterEmptyText}
                placeholder={t("filters.selectPattern")}
                clearLabel={t("filters.selectPattern")}
                isOpen={openPattern}
                onToggle={() => setOpenPattern(!openPattern)}
                onClose={() => setOpenPattern(false)}
                onSelect={(en, ar) =>
                  handleBilingualSelect("pattern", "patternAr", en, ar)
                }
                onClear={() => clearBilingualSelect("pattern", "patternAr")}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <BilingualFilterDropdown
                label={t("fields.season")}
                name="season"
                error={fieldErrors.season}
                value={formData.season}
                options={seasonDropdownOptions}
                loading={seasonsLoading}
                loadingText={filterLoadingText}
                emptyText={filterEmptyText}
                placeholder={t("filters.selectSeason")}
                clearLabel={t("filters.selectSeason")}
                isOpen={openSeason}
                onToggle={() => setOpenSeason(!openSeason)}
                onClose={() => setOpenSeason(false)}
                onSelect={(en, ar) =>
                  handleBilingualSelect("season", "seasonAr", en, ar)
                }
                onClear={() => clearBilingualSelect("season", "seasonAr")}
              />
              <BilingualFilterDropdown
                label={t("fields.tag")}
                name="tag"
                error={fieldErrors.tag}
                value={formData.tag}
                options={tagDropdownOptions}
                loading={tagsLoading}
                loadingText={filterLoadingText}
                emptyText={filterEmptyText}
                placeholder={t("filters.selectTag")}
                clearLabel={t("filters.selectTag")}
                isOpen={openTag}
                onToggle={() => setOpenTag(!openTag)}
                onClose={() => setOpenTag(false)}
                onSelect={(en, ar) =>
                  handleBilingualSelect("tag", "tagAr", en, ar)
                }
                onClear={() => clearBilingualSelect("tag", "tagAr")}
              />
            </div>
          </div>

          <div className="md:col-span-2 space-y-4 sm:space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <FormField
                label={t("fields.price")}
                name="basePrice"
                required
                error={fieldErrors.basePrice}
              >
                <NumericInput
                  id="basePrice"
                  min={0}
                  step={1}
                  value={formData.basePrice}
                  onChange={(value) => {
                    handleChange("basePrice", value);
                  }}
                  className={INPUT_CLASS}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <BilingualFilterDropdown
                label={t("fields.minCut")}
                name="minCutId"
                required
                error={fieldErrors.minCutId}
                value={formData.minCutId}
                options={cutDropdownOptions}
                loading={cutsLoading}
                loadingText={filterLoadingText}
                emptyText={filterEmptyText}
                placeholder={t("filters.selectMinCut")}
                clearLabel={t("filters.selectMinCut")}
                isOpen={openMinCut}
                onToggle={() => setOpenMinCut(!openMinCut)}
                onClose={() => setOpenMinCut(false)}
                onSelect={(en, ar, val) => {
                  const selectedCut = cutOptions.find((c) => c._id === val);
                  const meters = selectedCut
                    ? (selectedCut.metersEquivalent ??
                      selectedCut.lengthInMeters ??
                      selectedCut.value)
                    : undefined;
                  setFormData((prev) => ({
                    ...prev,
                    minCutId: val,
                    ...(meters ? { estimatedMeters: meters } : {}),
                  }));
                  if (fieldErrors.minCutId) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      minCutId: undefined,
                    }));
                  }
                }}
                onClear={() => {
                  setFormData((prev) => ({ ...prev, minCutId: "" }));
                }}
              />

              <FormField
                label={t("fields.estimatedDays")}
                name="estimatedDays"
                required
                error={fieldErrors.estimatedDays}
              >
                <input
                  id="estimatedDays"
                  type="number"
                  min="1"
                  step="1"
                  value={getNumberDisplay(formData.estimatedDays)}
                  onChange={(e) =>
                    handleNumberChange("estimatedDays", e.target.value)
                  }
                  className={INPUT_CLASS}
                />
              </FormField>
            </div>
          </div>

          <div className="md:col-span-2">
            <FormField label={t("fields.isActive")}>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => handleChange("isActive", e.target.checked)}
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded text-black border-gray-300 focus:ring-black accent-black hover:cursor-pointer"
                />
                <label
                  htmlFor="isActive"
                  className="text-xs sm:text-sm text-gray-700 hover:cursor-pointer"
                >
                  {t("fields.isActive")}
                </label>
              </div>
            </FormField>
          </div>

          <div className="md:col-span-2">
            <div className="mb-2 flex justify-between items-center">
              <span className="font-label-sm text-[10px] sm:text-[11px] text-black/60 uppercase tracking-[0.2em]">
                {t("sections.images")} (max 5) *
              </span>
              {formData.images.length < 5 && (
                <button
                  type="button"
                  onClick={addImageField}
                  className="text-[10px] sm:text-xs text-black underline hover:cursor-pointer"
                >
                  {t("addImage")}
                </button>
              )}
            </div>
            {fieldErrors.images && (
              <p className="text-red-500 text-xs sm:text-sm mb-2">
                {fieldErrors.images}
              </p>
            )}
            {formData.images.map((image, index) => (
              <div key={index} className="mb-4">
                <ImageUpload
                  value={image}
                  onChange={(url) => handleImageChange(index, url)}
                  uploadEndpoint="/api/tailor/uploads/design-image"
                  chooseFileLabel={t("upload.chooseFile")}
                  uploadingLabel={t("upload.uploading")}
                  uploadFailedLabel={t("upload.failed")}
                  removeLabel={t("upload.remove")}
                />
                {formData.images.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeImageField(index)}
                    className="text-[10px] sm:text-xs text-red-500 mt-1 hover:cursor-pointer"
                  >
                    {t("removeImage")}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div
          ref={formActionsRef}
          className="flex flex-col-reverse sm:flex-row-reverse gap-2 sm:gap-3 pt-6 mt-4 border-t border-gray-100"
        >
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50 hover:cursor-pointer text-sm"
          >
            {submitting
              ? t("saving")
              : isEditMode
                ? t("saveCta")
                : t("createCta")}
          </button>
          <Link
            href="/tailor/designs"
            className="w-full sm:w-auto px-4 sm:px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition hover:cursor-pointer text-sm text-center"
          >
            {t("cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
}
