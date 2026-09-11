"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type MutableRefObject,
} from "react";
import { useTranslations, useLocale } from "next-intl";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import FormField from "@/components/admin/FormField";
import FabricImageUpload from "@/components/admin/FabricImageUpload";
import { FabricCutsEditor } from "@/components/admin/FabricAdminFormFields";
import { getApiErrorMessage, type ApiError } from "@/lib/api/client";
import {
  fetchOwnFabricShop,
  shopPickupToFabricStorePickup,
} from "@/lib/fabricShop";
import { api } from "@/lib/api/client";
import { UAE_EMIRATES } from "@/lib/uaeAddress";
import { type PickupAddress } from "@/lib/createFabricAdmin";
import {
  createEmptyFabricCutRow,
  validateFabricCuts,
  type FabricCutFormEntry,
} from "@/lib/createFabricAdmin";
import {
  createFabricItem,
  fabricToForm,
  emptyFabricForm,
  fetchFabricItem,
  isShopMissingError,
  mapFabricApiErrorToFieldErrors,
  slugifyFabricName,
  updateFabricItem,
  type FabricFormData,
  type FabricVariantFormData,
} from "@/lib/fabricCatalog";
import {
  getUaePhoneInputValue,
  isValidUaePhone,
  normalizeUaePhone,
} from "@/lib/uaePhone";
import colors from "../shared/colors";
import { fetchMotdCommissionPercents, DEFAULT_FABRIC_COMMISSION } from "@/lib/motdCommission";

const INPUT_CLASS =
  "w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none bg-transparent text-xs sm:text-sm";

type FilterOpt = { value: string; en: string; ar: string };

function BilingualUnderlineDropdown({
  label,
  name,
  required,
  error,
  value,
  options,
  loading,
  placeholder,
  clearLabel,
  isOpen,
  onToggle,
  onClose,
  onSelect,
  onClear,
  dropdownRef,
}: {
  label: string;
  name: string;
  required?: boolean;
  error?: string;
  value: string;
  options: FilterOpt[];
  loading: boolean;
  placeholder: string;
  clearLabel: string;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSelect: (en: string, ar: string) => void;
  onClear: () => void;
  dropdownRef: MutableRefObject<HTMLDivElement | null>;
}) {
  const selected = options.find((o) => o.value === value);

  return (
    <FormField label={label} name={name} required={required} error={error}>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={onToggle}
          className={`${INPUT_CLASS} cursor-pointer text-left flex items-center justify-between gap-2 hover:cursor-pointer`}
        >
          <span className="truncate text-xs sm:text-sm flex items-center gap-2 min-w-0">
            {selected || value ? (
              <>
                <span className="truncate">{selected?.en || value}</span>
                <span className="text-black/40 shrink-0">/</span>
                <span className="truncate">
                  {selected?.ar || value}
                </span>
              </>
            ) : loading ? (
              <span className="text-black/60">Loading...</span>
            ) : (
              <span className="text-black/60">{placeholder}</span>
            )}
          </span>
          <ChevronDown
            size={14}
            className={`shrink-0 text-black/40 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-sm z-50 origin-top overflow-hidden max-h-60 overflow-y-auto"
            >
              {loading ? (
                <div className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-500">
                  Loading...
                </div>
              ) : options.length === 0 ? (
                <div className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-500">
                  No options found
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onClear();
                      onClose();
                    }}
                    className={`w-full text-left px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm hover:bg-neutral-50 transition hover:cursor-pointer ${!value ? "bg-neutral-100 font-medium" : ""}`}
                  >
                    {clearLabel}
                  </button>
                  {options.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onSelect(opt.en, opt.ar);
                        onClose();
                      }}
                      className={`w-full text-left px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm hover:bg-neutral-50 transition hover:cursor-pointer flex items-center gap-2 ${value === opt.value ? "bg-neutral-100 font-medium" : ""}`}
                    >
                      <span className="truncate">{opt.en}</span>
                      <span className="text-black/40 shrink-0">/</span>
                      <span className="truncate">{opt.ar}</span>
                    </button>
                  ))}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </FormField>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="md:col-span-2 space-y-4 sm:space-y-5 pt-2 first:pt-0">
      <div className="flex items-center gap-3">
        <span className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted)">
          {title}
        </span>
        <span className="h-px flex-1 bg-gray-100" />
      </div>
      {children}
    </div>
  );
}

type FabricDesignFormProps = {
  fabricId?: string;
};

type FieldKey = keyof FabricFormData;

type CatalogCut = {
  _id: string;
  name: string;
  nameAr?: string;
  value: number;
  unit: "war" | "meter";
  metersEquivalent?: number;
  lengthInMeters?: number;
};

const TOAST_BASE = {
  duration: 6000,
  style: {
    fontFamily: "var(--font-body)",
    fontSize: "13px",
    letterSpacing: "0.04em",
    borderRadius: "0",
    padding: "14px 18px",
    maxWidth: "360px",
  },
};

const SUCCESS_TOAST = {
  ...TOAST_BASE,
  style: {
    ...TOAST_BASE.style,
    background: "#f0fdf4",
    color: "#166534",
    border: "1px solid #86efac",
  },
  iconTheme: { primary: "#16a34a", secondary: "#ffffff" },
};

const ERROR_TOAST = {
  ...TOAST_BASE,
  style: {
    ...TOAST_BASE.style,
    background: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fca5a5",
  },
  iconTheme: { primary: "#dc2626", secondary: "#ffffff" },
};

export default function FabricDesignForm({ fabricId }: FabricDesignFormProps) {
  const t = useTranslations("FabricPortal.fabrics");
  const locale = useLocale();
  const router = useRouter();
  const isEditMode = Boolean(fabricId);

  const [loading, setLoading] = useState(isEditMode);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [shopMissing, setShopMissing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<string, string>>
  >({});
  const [formData, setFormData] = useState<FabricFormData>(emptyFabricForm());
  const [shopName, setShopName] = useState<string>("");
  const [isColorDropdownOpen, setIsColorDropdownOpen] = useState(false);
  const [openVariantColorDropdown, setOpenVariantColorDropdown] = useState<
    number | null
  >(null);
  const [isMaterialDropdownOpen, setIsMaterialDropdownOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isPatternDropdownOpen, setIsPatternDropdownOpen] = useState(false);
  const [isSeasonDropdownOpen, setIsSeasonDropdownOpen] = useState(false);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [isEmirateDropdownOpen, setIsEmirateDropdownOpen] = useState(false);
  const [dbMaterials, setDbMaterials] = useState<
    { name: string; nameAr: string; _id: string }[]
  >([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [dbCategories, setDbCategories] = useState<
    { name: string; nameAr: string; _id: string }[]
  >([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [dbPatterns, setDbPatterns] = useState<
    { name: string; nameAr: string; _id: string }[]
  >([]);
  const [patternsLoading, setPatternsLoading] = useState(true);
  const [dbSeasons, setDbSeasons] = useState<
    { name: string; nameAr: string; _id: string }[]
  >([]);
  const [seasonsLoading, setSeasonsLoading] = useState(true);
  const [dbTags, setDbTags] = useState<
    { name: string; nameAr: string; _id: string }[]
  >([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [catalogCuts, setCatalogCuts] = useState<CatalogCut[]>([]);
  const [cutsLoading, setCutsLoading] = useState(true);
  const [commissionPercent, setCommissionPercent] = useState(
    DEFAULT_FABRIC_COMMISSION,
  );
  const colorDropdownRef = useRef<HTMLDivElement>(null);
  const materialDropdownRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const patternDropdownRef = useRef<HTMLDivElement>(null);
  const seasonDropdownRef = useRef<HTMLDivElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const emirateDropdownRef = useRef<HTMLDivElement>(null);
  const formActionsRef = useRef<HTMLDivElement>(null);
  const previousImageCountRef = useRef(formData.images.length);

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

  // Fetch materials / categories / patterns / seasons / tags from DB
  useEffect(() => {
    let cancelled = false;
    const fetchFilters = async () => {
      try {
        setMaterialsLoading(true);
        setCategoriesLoading(true);
        setPatternsLoading(true);
        setSeasonsLoading(true);
        setTagsLoading(true);
        const [materials, categories, patterns, seasons, tags] =
          await Promise.all([
            api.get<{ name: string; nameAr: string; _id: string }[]>(
              "/api/filters/materials?domain=fabrics",
            ),
            api.get<{ name: string; nameAr: string; _id: string }[]>(
              "/api/filters/categories?domain=fabrics",
            ),
            api.get<{ name: string; nameAr: string; _id: string }[]>(
              "/api/filters/patterns?domain=fabrics",
            ),
            api.get<{ name: string; nameAr: string; _id: string }[]>(
              "/api/filters/seasons?domain=fabrics",
            ),
            api.get<{ name: string; nameAr: string; _id: string }[]>(
              "/api/filters/tags?domain=fabrics",
            ),
          ]);
        if (cancelled) return;
        if (Array.isArray(materials)) setDbMaterials(materials);
        if (Array.isArray(categories)) setDbCategories(categories);
        if (Array.isArray(patterns)) setDbPatterns(patterns);
        if (Array.isArray(seasons)) setDbSeasons(seasons);
        if (Array.isArray(tags)) setDbTags(tags);
      } catch {
        // keep empty lists
      } finally {
        if (!cancelled) {
          setMaterialsLoading(false);
          setCategoriesLoading(false);
          setPatternsLoading(false);
          setSeasonsLoading(false);
          setTagsLoading(false);
        }
      }
    };
    void fetchFilters();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        colorDropdownRef.current &&
        !colorDropdownRef.current.contains(e.target as Node)
      ) {
        setIsColorDropdownOpen(false);
      }
      if (
        materialDropdownRef.current &&
        !materialDropdownRef.current.contains(e.target as Node)
      ) {
        setIsMaterialDropdownOpen(false);
      }
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(e.target as Node)
      ) {
        setIsCategoryDropdownOpen(false);
      }
      if (
        patternDropdownRef.current &&
        !patternDropdownRef.current.contains(e.target as Node)
      ) {
        setIsPatternDropdownOpen(false);
      }
      if (
        seasonDropdownRef.current &&
        !seasonDropdownRef.current.contains(e.target as Node)
      ) {
        setIsSeasonDropdownOpen(false);
      }
      if (
        tagDropdownRef.current &&
        !tagDropdownRef.current.contains(e.target as Node)
      ) {
        setIsTagDropdownOpen(false);
      }
      if (
        emirateDropdownRef.current &&
        !emirateDropdownRef.current.contains(e.target as Node)
      ) {
        setIsEmirateDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allMaterials = useMemo<FilterOpt[]>(() => {
    const fromDb = dbMaterials.map((m) => ({
      value: m.name,
      en: m.name,
      ar: m.nameAr || m.name,
    }));
    if (
      formData.material &&
      !fromDb.some((x) => x.value === formData.material)
    ) {
      fromDb.unshift({
        value: formData.material,
        en: formData.material,
        ar: formData.materialAr || formData.material,
      });
    }
    return fromDb;
  }, [dbMaterials, formData.material, formData.materialAr]);

  const allCategories = useMemo<FilterOpt[]>(() => {
    const fromDb = dbCategories.map((c) => ({
      value: c.name,
      en: c.name,
      ar: c.nameAr || c.name,
    }));
    if (
      formData.category &&
      !fromDb.some((x) => x.value === formData.category)
    ) {
      fromDb.unshift({
        value: formData.category,
        en: formData.category,
        ar: formData.categoryAr || formData.category,
      });
    }
    return fromDb;
  }, [dbCategories, formData.category, formData.categoryAr]);

  const allPatterns = useMemo<FilterOpt[]>(() => {
    const fromDb = dbPatterns.map((p) => ({
      value: p.name,
      en: p.name,
      ar: p.nameAr || p.name,
    }));
    if (formData.pattern && !fromDb.some((x) => x.value === formData.pattern)) {
      fromDb.unshift({
        value: formData.pattern,
        en: formData.pattern,
        ar: formData.patternAr || formData.pattern,
      });
    }
    return fromDb;
  }, [dbPatterns, formData.pattern, formData.patternAr]);

  const allSeasons = useMemo<FilterOpt[]>(() => {
    const fromDb = dbSeasons.map((s) => ({
      value: s.name,
      en: s.name,
      ar: s.nameAr || s.name,
    }));
    if (formData.season && !fromDb.some((x) => x.value === formData.season)) {
      fromDb.unshift({
        value: formData.season,
        en: formData.season,
        ar: formData.seasonAr || formData.season,
      });
    }
    return fromDb;
  }, [dbSeasons, formData.season, formData.seasonAr]);

  const allTags = useMemo<FilterOpt[]>(() => {
    const fromDb = dbTags.map((t) => ({
      value: t.name,
      en: t.name,
      ar: t.nameAr || t.name,
    }));
    if (formData.tag && !fromDb.some((x) => x.value === formData.tag)) {
      fromDb.unshift({
        value: formData.tag,
        en: formData.tag,
        ar: formData.tagAr || formData.tag,
      });
    }
    return fromDb;
  }, [dbTags, formData.tag, formData.tagAr]);

  useEffect(() => {
    let cancelled = false;
    const fetchCuts = async () => {
      try {
        setCutsLoading(true);
        const data = await api.get<CatalogCut[]>("/api/filters/cuts");
        if (!cancelled && Array.isArray(data)) {
          setCatalogCuts(
            data.map((cut) => ({
              ...cut,
              lengthInMeters: cut.lengthInMeters ?? cut.metersEquivalent,
            })),
          );
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
    let cancelled = false;
    const loadCommission = async () => {
      const rates = await fetchMotdCommissionPercents();
      if (!cancelled) setCommissionPercent(rates.fabricStore);
    };
    void loadCommission();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (cutsLoading) return;
    if (formData.cuts.length === 0) {
      setFormData((prev) => ({
        ...prev,
        cuts: [createEmptyFabricCutRow()],
      }));
    }
  }, [cutsLoading, formData.cuts.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        colorDropdownRef.current &&
        !colorDropdownRef.current.contains(event.target as Node)
      ) {
        setIsColorDropdownOpen(false);
      }
      if (
        emirateDropdownRef.current &&
        !emirateDropdownRef.current.contains(event.target as Node)
      ) {
        setIsEmirateDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadShopAndFabric = async () => {
      if (isEditMode) {
        setLoading(true);
        setLoadError(null);
      }

      try {
        const shop = await fetchOwnFabricShop();
        if (cancelled) return;

        if (shop) {
          setShopName(shop.name);
          if (!isEditMode) {
            setFormData((prev) => ({
              ...prev,
              storePickupAddress: shopPickupToFabricStorePickup(shop),
            }));
          }
        } else {
          setShopMissing(true);
          setLoading(false);
          return;
        }

        if (isEditMode && fabricId) {
          const fabric = await fetchFabricItem(fabricId);
          if (cancelled) return;
          setFormData(fabricToForm(fabric));
        }
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

    loadShopAndFabric();

    return () => {
      cancelled = true;
    };
  }, [fabricId, isEditMode, t]);

  const handleChange = (field: FieldKey, value: unknown) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value } as FabricFormData;

      if (field === "name" && typeof value === "string") {
        next.slug = slugifyFabricName(value);
      }

      if (fieldErrors[field]) {
        setFieldErrors((prevErrors) => ({ ...prevErrors, [field]: undefined }));
      }

      return next;
    });
  };

  const handleVariantChange = (
    index: number,
    field: keyof FabricFormData,
    value: unknown,
  ) => {
    setFormData((prev) => {
      const nextVariants = [...(prev.variants || [])];
      nextVariants[index] = {
        ...nextVariants[index],
        [field]: value,
      } as FabricFormData;

      if (field === "name" && typeof value === "string") {
        nextVariants[index].slug = slugifyFabricName(value);
      }

      return {
        ...prev,
        variants: nextVariants,
      };
    });

    const errorKey = `variants.${index}.${field as string}`;
    if (fieldErrors[errorKey]) {
      setFieldErrors((prev) => ({ ...prev, [errorKey]: undefined }));
    }
  };

  const addVariant = () => {
    setFormData((prev) => ({
      ...prev,
      variants: [
        ...(prev.variants || []),
        {
          name: "",
          nameAr: "",
          slug: "",
          description: "",
          descriptionAr: "",
          images: [""],
          material: prev.material,
          materialAr: prev.materialAr,
          category: prev.category,
          categoryAr: prev.categoryAr,
          pattern: prev.pattern,
          patternAr: prev.patternAr,
          season: prev.season,
          seasonAr: prev.seasonAr,
          colors: [],
          tag: "",
          tagAr: "",
          cuts: [createEmptyFabricCutRow()],
          storePickupAddress: prev.storePickupAddress,
          isActive: true,
        } satisfies FabricVariantFormData,
      ],
    }));
  };

  const removeVariant = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      variants: (prev.variants || []).filter((_, i) => i !== index),
    }));
  };

  const handlePickupChange = (subfield: keyof PickupAddress, value: string) => {
    let nextValue = value;
    if (subfield === "phone") {
      const digits = value.replace(/\D/g, "");
      if (digits.length <= 9) {
        nextValue = normalizeUaePhone(digits);
      } else {
        return;
      }
    }

    setFormData((prev) => ({
      ...prev,
      storePickupAddress: {
        ...prev.storePickupAddress,
        [subfield]: nextValue,
      },
    }));

    const errorKey = `storePickupAddress.${subfield}`;
    if (fieldErrors[errorKey]) {
      setFieldErrors((prev) => ({ ...prev, [errorKey]: undefined }));
    }
  };

  const handleImageChange = (index: number, url: string) => {
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

  const toggleColor = (colorValue: string) => {
    const current = formData.colors || [];
    const newSelected = current.includes(colorValue)
      ? current.filter((c) => c !== colorValue)
      : [...current, colorValue];
    handleChange("colors", newSelected);
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) errors.name = t("validation.nameRequired");
    if (!formData.nameAr.trim()) errors.nameAr = t("validation.nameArRequired");
    if (!formData.images.some((image) => image.trim())) {
      errors.images = t("validation.imagesRequired");
    }
    if (!formData.material?.trim()) {
      errors.material = t("validation.materialRequired");
    }

    validateFabricCuts(formData.cuts || [], errors, "cuts");
    if (!formData.colors || formData.colors.length === 0) {
      errors.colors = t("validation.colorRequired");
    }

    if (!formData.storePickupAddress.emirate) {
      errors["storePickupAddress.emirate"] = "Emirate is required";
    }
    if (!formData.storePickupAddress.city.trim()) {
      errors["storePickupAddress.city"] = "City is required";
    }
    if (!formData.storePickupAddress.street.trim()) {
      errors["storePickupAddress.street"] = "Street is required";
    }
    if (!formData.storePickupAddress.building.trim()) {
      errors["storePickupAddress.building"] = "Building is required";
    }
    if (!formData.storePickupAddress.phone.trim()) {
      errors["storePickupAddress.phone"] = "Phone is required";
    } else if (!isValidUaePhone(formData.storePickupAddress.phone.trim())) {
      errors["storePickupAddress.phone"] =
        "Invalid UAE phone. Must be +971 followed by 9 digits";
    }

    if (formData.variants && formData.variants.length > 0) {
      formData.variants.forEach((v, i) => {
        const prefix = `variants.${i}`;
        if (!v.name.trim())
          errors[`${prefix}.name`] = t("validation.nameRequired");
        if (!v.nameAr.trim())
          errors[`${prefix}.nameAr`] = t("validation.nameArRequired");
        if (!v.images.some((img) => img.trim())) {
          errors[`${prefix}.images`] = t("validation.imagesRequired");
        }
        validateFabricCuts(v.cuts || [], errors, `${prefix}.cuts`);
        if (!v.colors || v.colors.length === 0) {
          errors[`${prefix}.colors`] = t("validation.colorRequired");
        }
      });
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);

    try {
      if (isEditMode && fabricId) {
        await updateFabricItem(fabricId, formData);
        toast.success(t("successUpdated"), SUCCESS_TOAST);
      } else {
        await createFabricItem(formData);
        toast.success(t("successCreated"), SUCCESS_TOAST);
      }
      router.push("/fabric/fabrics");
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
      const nextFieldErrors = mapFabricApiErrorToFieldErrors(message);
      if (Object.keys(nextFieldErrors).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...nextFieldErrors }));
      }
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
          href="/fabric/fabrics"
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
          href="/fabric/shop"
          className="inline-block px-8 py-3 bg-black text-white text-[10px] tracking-[0.22em] uppercase hover:bg-[#2A2A28] transition [font-family:var(--font-ui)]"
        >
          {t("shopRequiredCta")}
        </Link>
      </div>
    );
  }

  const selectedColors = formData.colors || [];

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
      <div className="mb-8">
        <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.28em] text-(--color-grey-muted) mb-3">
          {t("eyebrow")}
        </p>
        <h1 className="[font-family:var(--font-display)] text-[28px] sm:text-[32px] md:text-[36px] text-black mb-3 font-normal">
          {isEditMode ? t("editTitle") : t("createTitle")}
        </h1>
        <p className="[font-family:var(--font-body)] text-xs sm:text-sm text-(--color-grey-muted)">
          {isEditMode ? t("editDescription") : t("createDescription")}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-200 p-4 sm:p-6 md:p-8 space-y-8 sm:space-y-10"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <FormSection title={t("sections.identity")}>
            <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-6">
              <FormField
                label="NAME (EN)"
                name="name"
                error={fieldErrors.name}
                required
              >
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className={`${INPUT_CLASS} hover:cursor-text`}
                  placeholder="Silk Fabric"
                />
              </FormField>

              <FormField
                label="NAME (AR)"
                name="nameAr"
                error={fieldErrors.nameAr}
                required
              >
                <input
                  type="text"
                  value={formData.nameAr}
                  onChange={(e) => handleChange("nameAr", e.target.value)}
                  className={`${INPUT_CLASS} text-right hover:cursor-text`}
                  placeholder="قماش حرير"
                  dir="rtl"
                />
              </FormField>

              <FormField
                label="DESCRIPTION (EN)"
                name="description"
                error={fieldErrors.description}
              >
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  className={`${INPUT_CLASS} hover:cursor-text`}
                  placeholder="Enter description (EN)"
                />
              </FormField>

              <FormField
                label="DESCRIPTION (AR)"
                name="descriptionAr"
                error={fieldErrors.descriptionAr}
              >
                <input
                  type="text"
                  value={formData.descriptionAr}
                  onChange={(e) =>
                    handleChange("descriptionAr", e.target.value)
                  }
                  className={`${INPUT_CLASS} text-right hover:cursor-text`}
                  placeholder="...وصف القماش"
                  dir="rtl"
                />
              </FormField>
            </div>
          </FormSection>

          <FormSection title={t("sections.tags")}>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-4 sm:gap-5 items-start">
              <BilingualUnderlineDropdown
                label="MATERIAL (EN / AR)"
                name="material"
                required
                error={fieldErrors.material || fieldErrors.materialAr}
                value={formData.material}
                options={allMaterials}
                loading={materialsLoading}
                placeholder="Select material (EN / AR)"
                clearLabel="Select material (EN / AR)"
                isOpen={isMaterialDropdownOpen}
                onToggle={() => {
                  setIsMaterialDropdownOpen((prev) => !prev);
                  setIsCategoryDropdownOpen(false);
                  setIsPatternDropdownOpen(false);
                  setIsSeasonDropdownOpen(false);
                  setIsTagDropdownOpen(false);
                }}
                onClose={() => setIsMaterialDropdownOpen(false)}
                onSelect={(en, ar) => {
                  handleChange("material", en);
                  handleChange("materialAr", ar);
                }}
                onClear={() => {
                  handleChange("material", "");
                  handleChange("materialAr", "");
                }}
                dropdownRef={materialDropdownRef}
              />

              <BilingualUnderlineDropdown
                label="CATEGORY (EN / AR)"
                name="category"
                error={fieldErrors.category || fieldErrors.categoryAr}
                value={formData.category}
                options={allCategories}
                loading={categoriesLoading}
                placeholder="Select category (optional)"
                clearLabel="Select category (optional)"
                isOpen={isCategoryDropdownOpen}
                onToggle={() => {
                  setIsCategoryDropdownOpen((prev) => !prev);
                  setIsMaterialDropdownOpen(false);
                  setIsPatternDropdownOpen(false);
                  setIsSeasonDropdownOpen(false);
                  setIsTagDropdownOpen(false);
                }}
                onClose={() => setIsCategoryDropdownOpen(false)}
                onSelect={(en, ar) => {
                  handleChange("category", en);
                  handleChange("categoryAr", ar);
                }}
                onClear={() => {
                  handleChange("category", "");
                  handleChange("categoryAr", "");
                }}
                dropdownRef={categoryDropdownRef}
              />

              <BilingualUnderlineDropdown
                label="PATTERN (EN / AR)"
                name="pattern"
                error={fieldErrors.pattern || fieldErrors.patternAr}
                value={formData.pattern}
                options={allPatterns}
                loading={patternsLoading}
                placeholder="Select pattern (optional)"
                clearLabel="Select pattern (optional)"
                isOpen={isPatternDropdownOpen}
                onToggle={() => {
                  setIsPatternDropdownOpen((prev) => !prev);
                  setIsMaterialDropdownOpen(false);
                  setIsCategoryDropdownOpen(false);
                  setIsSeasonDropdownOpen(false);
                  setIsTagDropdownOpen(false);
                }}
                onClose={() => setIsPatternDropdownOpen(false)}
                onSelect={(en, ar) => {
                  handleChange("pattern", en);
                  handleChange("patternAr", ar);
                }}
                onClear={() => {
                  handleChange("pattern", "");
                  handleChange("patternAr", "");
                }}
                dropdownRef={patternDropdownRef}
              />

              <BilingualUnderlineDropdown
                label="SEASON (EN / AR)"
                name="season"
                error={fieldErrors.season || fieldErrors.seasonAr}
                value={formData.season}
                options={allSeasons}
                loading={seasonsLoading}
                placeholder="Select season (optional)"
                clearLabel="Select season (optional)"
                isOpen={isSeasonDropdownOpen}
                onToggle={() => {
                  setIsSeasonDropdownOpen((prev) => !prev);
                  setIsMaterialDropdownOpen(false);
                  setIsCategoryDropdownOpen(false);
                  setIsPatternDropdownOpen(false);
                  setIsTagDropdownOpen(false);
                }}
                onClose={() => setIsSeasonDropdownOpen(false)}
                onSelect={(en, ar) => {
                  handleChange("season", en);
                  handleChange("seasonAr", ar);
                }}
                onClear={() => {
                  handleChange("season", "");
                  handleChange("seasonAr", "");
                }}
                dropdownRef={seasonDropdownRef}
              />

              <BilingualUnderlineDropdown
                label="TAG (EN / AR)"
                name="tag"
                error={fieldErrors.tag}
                value={formData.tag}
                options={allTags}
                loading={tagsLoading}
                placeholder="Select tag (optional)"
                clearLabel="Select tag (optional)"
                isOpen={isTagDropdownOpen}
                onToggle={() => {
                  setIsTagDropdownOpen((prev) => !prev);
                  setIsMaterialDropdownOpen(false);
                  setIsCategoryDropdownOpen(false);
                  setIsPatternDropdownOpen(false);
                  setIsSeasonDropdownOpen(false);
                }}
                onClose={() => setIsTagDropdownOpen(false)}
                onSelect={(en, ar) => {
                  handleChange("tag", en);
                  handleChange("tagAr", ar);
                }}
                onClear={() => {
                  handleChange("tag", "");
                  handleChange("tagAr", "");
                }}
                dropdownRef={tagDropdownRef}
              />

              <FormField
                label="COLORS"
                name="colors"
                error={fieldErrors.colors}
                required
              >
                <div className="relative" ref={colorDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsColorDropdownOpen((prev) => !prev)}
                    className="w-full py-1 border-b border-gray-300 focus:border-black text-left bg-transparent min-h-7 flex items-center justify-between gap-2 hover:cursor-pointer"
                  >
                    {selectedColors.length === 0 ? (
                      <span className="text-[10px] sm:text-xs text-black/60 leading-none">
                        Select colors
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1 sm:gap-1.5 items-center">
                        {colors
                          .filter((c) => selectedColors.includes(c.value))
                          .map((c) => (
                            <span
                              key={c.value}
                              className="inline-flex items-center justify-center"
                              title={`${c.en} / ${c.ar}`}
                            >
                              <span
                                className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-gray-200 shrink-0"
                                style={{ backgroundColor: c.hex }}
                              />
                            </span>
                          ))}
                      </div>
                    )}
                    <ChevronDown
                      size={14}
                      className={`shrink-0 text-black/40 transition-transform duration-200 ${isColorDropdownOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  <AnimatePresence>
                    {isColorDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-sm p-1.5 sm:p-3 z-50 origin-top max-h-60 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-thumb]:rounded-full"
                      >
                        <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2 sm:gap-1">
                          {colors.map((opt) => {
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
                                    style={{ backgroundColor: opt.hex }}
                                  />
                                  <span className="inline-flex items-center gap-1 text-[8px] sm:text-[10px] lg:text-xs min-w-0 hover:cursor-pointer">
                                    <span className="truncate">{opt.en}</span>
                                    <span className="text-gray-400 shrink-0">
                                      /
                                    </span>
                                    <span className="truncate">{opt.ar}</span>
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
          </FormSection>

          <FormSection title={t("sections.pricing")}>
            {commissionPercent > 0 && (
              <p className="text-xs text-gray-500 -mt-1">
                {t("fields.finalPriceHint", { percent: commissionPercent })}
              </p>
            )}
            <FabricCutsEditor
              cuts={formData.cuts}
              catalogCuts={catalogCuts}
              errorPrefix="cuts"
              fieldErrors={fieldErrors as Record<string, string>}
              loading={cutsLoading}
              commissionPercent={commissionPercent}
              priceLabel={t("fields.yourPrice")}
              finalPriceLabel={t("fields.finalPrice")}
              onChange={(cuts: FabricCutFormEntry[]) =>
                handleChange("cuts", cuts)
              }
            />
          </FormSection>

          <FormSection title="Store pickup address">
            <div className="grid grid-cols-2 gap-x-3 gap-y-4">
              {/* EMIRATE */}
              <FormField
                label="EMIRATE"
                name="storePickupAddress.emirate"
                error={fieldErrors["storePickupAddress.emirate"]}
                required
              >
                <div className="relative" ref={emirateDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsEmirateDropdownOpen((prev) => !prev)}
                    className={`${INPUT_CLASS} cursor-pointer text-left flex items-center justify-between gap-2 hover:cursor-pointer`}
                  >
                    <span className="truncate text-xs sm:text-sm">
                      {formData.storePickupAddress.emirate ? (
                        (() => {
                          const found = UAE_EMIRATES.find(
                            (e) =>
                              e.value === formData.storePickupAddress.emirate,
                          );
                          return found
                            ? `${found.en} / ${found.ar}`
                            : formData.storePickupAddress.emirate;
                        })()
                      ) : (
                        <span className="text-black/60">Select emirate</span>
                      )}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`shrink-0 text-black/40 transition-transform duration-200 ${isEmirateDropdownOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  <AnimatePresence>
                    {isEmirateDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-sm z-50 origin-top overflow-hidden max-h-60 overflow-y-auto"
                      >
                        {UAE_EMIRATES.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              handlePickupChange("emirate", opt.value);
                              setIsEmirateDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm hover:bg-neutral-50 transition hover:cursor-pointer ${formData.storePickupAddress.emirate === opt.value ? "bg-neutral-100 font-medium" : ""}`}
                          >
                            {opt.en} / {opt.ar}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </FormField>

              {/* CITY */}
              <FormField
                label="CITY"
                name="storePickupAddress.city"
                error={fieldErrors["storePickupAddress.city"]}
                required
              >
                <input
                  type="text"
                  value={formData.storePickupAddress.city}
                  onChange={(e) => handlePickupChange("city", e.target.value)}
                  className={`${INPUT_CLASS} hover:cursor-text`}
                  placeholder="e.g., Deira"
                />
              </FormField>

              {/* STREET */}
              <FormField
                label="STREET"
                name="storePickupAddress.street"
                error={fieldErrors["storePickupAddress.street"]}
                required
              >
                <input
                  type="text"
                  value={formData.storePickupAddress.street}
                  onChange={(e) => handlePickupChange("street", e.target.value)}
                  className={`${INPUT_CLASS} hover:cursor-text`}
                  placeholder="e.g., Al Maktoum Street"
                />
              </FormField>

              {/* BUILDING */}
              <FormField
                label="BUILDING"
                name="storePickupAddress.building"
                error={fieldErrors["storePickupAddress.building"]}
                required
              >
                <input
                  type="text"
                  value={formData.storePickupAddress.building}
                  onChange={(e) =>
                    handlePickupChange("building", e.target.value)
                  }
                  className={`${INPUT_CLASS} hover:cursor-text`}
                  placeholder="e.g., Al Fattan Tower"
                />
              </FormField>

              <FormField
                label="PHONE"
                name="storePickupAddress.phone"
                error={fieldErrors["storePickupAddress.phone"]}
                required
              >
                <div className="flex items-center border-b border-gray-300 focus-within:border-black bg-transparent">
                  <span className="inline-flex items-center px-3 py-1 bg-neutral-50 text-neutral-400 text-xs sm:text-[14px] [font-family:var(--font-ui)] select-none border-r border-gray-200">
                    +971
                  </span>
                  <input
                    type="text"
                    value={getUaePhoneInputValue(formData.storePickupAddress.phone)}
                    onChange={(e) => {
                      handlePickupChange("phone", e.target.value);
                    }}
                    className="w-full py-1 pl-3 bg-transparent text-xs sm:text-[14px] focus:outline-none hover:cursor-text"
                    placeholder="123456777"
                    maxLength={9}
                  />
                </div>
              </FormField>
            </div>
          </FormSection>

          <FormSection title={t("sections.images")}>
            <div className="mb-2 flex justify-between items-center">
              <span className="font-label-sm text-[10px] sm:text-[11px] text-black/60 uppercase tracking-[0.2em]">
                IMAGES (MAX 5) <span className="text-red-500 ml-1">*</span>
              </span>
              {formData.images.length < 5 && (
                <button
                  type="button"
                  onClick={addImageField}
                  className="text-[10px] sm:text-xs text-black underline hover:text-neutral-700 transition font-medium hover:cursor-pointer"
                >
                  + Add Image
                </button>
              )}
            </div>
            {fieldErrors.images && (
              <p className="text-[10px] sm:text-xs text-red-500 mb-2">
                {fieldErrors.images}
              </p>
            )}
            {formData.images.map((url, idx) => (
              <div
                key={idx}
                className="mb-4 last:mb-0"
              >
                <FabricImageUpload
                  value={url}
                  onChange={(val) => handleImageChange(idx, val)}
                  chooseFileLabel="Upload Image"
                  uploadingLabel="Uploading..."
                  uploadFailedLabel="Upload failed"
                  removeLabel="Remove"
                  uploadEndpoint="/api/fabric/uploads/fabric-image"
                />
                {formData.images.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeImageField(idx)}
                    className="text-[10px] sm:text-xs text-red-500 mt-2 hover:underline block hover:cursor-pointer"
                  >
                    Remove from list
                  </button>
                )}
              </div>
            ))}

            <FormField label="ACTIVE STATUS" name="isActive">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => handleChange("isActive", e.target.checked)}
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 accent-black hover:cursor-pointer"
                />
                <label
                  htmlFor="isActive"
                  className="text-xs sm:text-sm text-gray-700 hover:cursor-pointer"
                >
                  Product is active (visible to customers)
                </label>
              </div>
            </FormField>
          </FormSection>
        </div>

        {/* VARIATIONS SECTION */}
        <div className="pt-6 sm:pt-8 mt-6 sm:mt-8 border-t border-gray-200 space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-[12px] sm:text-[14px] font-bold text-black tracking-wider uppercase [font-family:var(--font-ui)]">
                {locale === "ar"
                  ? "خيارات الأقمشة البديلة"
                  : "Fabric Variations"}
              </h3>
              <p className="text-gray-500 text-[10px] sm:text-xs mt-1">
                {locale === "ar"
                  ? "أضف ألواناً أو نقوشاً بديلة لهذا القماش"
                  : "Add different variations of this fabric (e.g., other colorways, weights, etc.)"}
              </p>
            </div>
            <button
              type="button"
              onClick={addVariant}
              className="px-3 sm:px-4 py-1.5 sm:py-2 border border-black text-[10px] sm:text-[11px] uppercase tracking-wider hover:bg-black hover:text-white transition font-medium hover:cursor-pointer"
            >
              + {locale === "ar" ? "إضافة خيار بديل" : "Add Variant"}
            </button>
          </div>

          {formData.variants && formData.variants.length > 0 && (
            <div className="space-y-6 sm:space-y-8">
              {formData.variants.map((variant, index) => {
                const prefix = `variants.${index}`;
                return (
                  <div
                    key={index}
                    className="p-4 sm:p-6 border border-gray-200 bg-[#FAF9F5] space-y-4 sm:space-y-6 relative rounded-none"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-gray-200 gap-2">
                      <span className="font-label-sm text-[10px] sm:text-[11px] text-black/60 uppercase tracking-widest font-semibold">
                        {locale === "ar"
                          ? `الخيار البديل #${index + 1}`
                          : `Variant #${index + 1}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeVariant(index)}
                        className="text-[10px] sm:text-xs text-red-600 hover:underline font-medium hover:cursor-pointer"
                      >
                        {locale === "ar" ? "حذف هذا الخيار" : "Remove Variant"}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-6">
                      {/* VARIANT NAME (EN) */}
                      <FormField
                        label="Name (EN)"
                        name={`${prefix}.name`}
                        error={fieldErrors[`${prefix}.name`]}
                        required
                      >
                        <input
                          type="text"
                          value={variant.name}
                          onChange={(e) =>
                            handleVariantChange(index, "name", e.target.value)
                          }
                          className={`${INPUT_CLASS} hover:cursor-text`}
                          placeholder="e.g. Red Silk"
                        />
                      </FormField>

                      {/* VARIANT NAME (AR) */}
                      <FormField
                        label="Name (AR)"
                        name={`${prefix}.nameAr`}
                        error={fieldErrors[`${prefix}.nameAr`]}
                        required
                      >
                        <input
                          type="text"
                          value={variant.nameAr}
                          onChange={(e) =>
                            handleVariantChange(index, "nameAr", e.target.value)
                          }
                          className={`${INPUT_CLASS} text-right hover:cursor-text`}
                          placeholder="مثال: حرير أحمر"
                          dir="rtl"
                        />
                      </FormField>

                      {/* VARIANT CATEGORY */}
                      <FormField
                        label="Category"
                        name={`${prefix}.category`}
                        error={fieldErrors[`${prefix}.category`]}
                      >
                        <select
                          value={variant.category || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleVariantChange(index, "category", val);
                            const found = dbCategories.find(
                              (c) => c.name === val,
                            );
                            handleVariantChange(
                              index,
                              "categoryAr",
                              found?.nameAr || "",
                            );
                          }}
                          className={`${INPUT_CLASS} hover:cursor-pointer`}
                        >
                          <option value="">Select category</option>
                          {dbCategories.map((c) => (
                            <option key={c._id} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </FormField>

                      {/* VARIANT PATTERN */}
                      <FormField
                        label="Pattern"
                        name={`${prefix}.pattern`}
                        error={fieldErrors[`${prefix}.pattern`]}
                      >
                        <select
                          value={variant.pattern || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleVariantChange(index, "pattern", val);
                            const found = dbPatterns.find(
                              (p) => p.name === val,
                            );
                            handleVariantChange(
                              index,
                              "patternAr",
                              found?.nameAr || "",
                            );
                          }}
                          className={`${INPUT_CLASS} hover:cursor-pointer`}
                        >
                          <option value="">Select pattern</option>
                          {dbPatterns.map((p) => (
                            <option key={p._id} value={p.name}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </FormField>

                      {/* VARIANT SEASON */}
                      <FormField
                        label="Season"
                        name={`${prefix}.season`}
                        error={fieldErrors[`${prefix}.season`]}
                      >
                        <select
                          value={variant.season || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleVariantChange(index, "season", val);
                            const found = dbSeasons.find(
                              (s) => s.name === val,
                            );
                            handleVariantChange(
                              index,
                              "seasonAr",
                              found?.nameAr || "",
                            );
                          }}
                          className={`${INPUT_CLASS} hover:cursor-pointer`}
                        >
                          <option value="">Select season</option>
                          {dbSeasons.map((s) => (
                            <option key={s._id} value={s.name}>
                              {s.name}
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
                              onClick={() =>
                                setOpenVariantColorDropdown((prev) =>
                                  prev === index ? null : index,
                                )
                              }
                              className="w-full py-1 border-b border-gray-300 focus:border-black text-left bg-transparent min-h-7 flex items-center justify-between gap-2 hover:cursor-pointer"
                            >
                              {!variant.colors ||
                              variant.colors.length === 0 ? (
                                <span className="text-[10px] sm:text-xs text-black/60 leading-none">
                                  Select colors
                                </span>
                              ) : (
                                <div className="flex flex-wrap gap-1 sm:gap-1.5 items-center">
                                  {colors
                                    .filter((c) =>
                                      variant.colors?.includes(c.value),
                                    )
                                    .map((c) => (
                                      <span
                                        key={c.value}
                                        className="inline-flex items-center justify-center"
                                        title={c.en}
                                      >
                                        <span
                                          className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-gray-200 shrink-0"
                                          style={{ backgroundColor: c.hex }}
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
                                  transition={{
                                    duration: 0.15,
                                    ease: "easeOut",
                                  }}
                                  className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-sm p-1.5 sm:p-3 z-50 origin-top max-h-60 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-thumb]:rounded-full"
                                >
                                  <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2 sm:gap-1">
                                    {colors.map((opt) => {
                                      const isSelected =
                                        variant.colors?.includes(opt.value);
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
                                                currentColors.includes(
                                                  opt.value,
                                                )
                                                  ? currentColors.filter(
                                                      (col) =>
                                                        col !== opt.value,
                                                    )
                                                  : [
                                                      ...currentColors,
                                                      opt.value,
                                                    ];
                                              handleVariantChange(
                                                index,
                                                "colors",
                                                nextColors,
                                              );
                                            }}
                                            className="accent-black w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 hover:cursor-pointer"
                                          />
                                          <span className="inline-flex items-center gap-1 sm:gap-1.5 min-w-0">
                                            <span
                                              className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full border border-gray-200 shrink-0"
                                              style={{
                                                backgroundColor: opt.hex,
                                              }}
                                            />
                                            <span className="text-[8px] sm:text-[10px] lg:text-xs truncate hover:cursor-pointer">
                                              {locale === "ar"
                                                ? opt.ar
                                                : opt.en}
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
                          fieldErrors={fieldErrors as Record<string, string>}
                          loading={cutsLoading}
                          showTitle={false}
                          commissionPercent={commissionPercent}
                          priceLabel={t("fields.yourPrice")}
                          finalPriceLabel={t("fields.finalPrice")}
                          onChange={(cuts: FabricCutFormEntry[]) =>
                            handleVariantChange(index, "cuts", cuts)
                          }
                        />
                      </div>

                      {/* VARIANT ACTIVE STATUS */}
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
                              handleVariantChange(
                                index,
                                "isActive",
                                e.target.checked,
                              );
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

                      {/* VARIANT IMAGES */}
                      <div className="md:col-span-2 space-y-2">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                          <span className="font-label-sm text-[10px] text-black/60 uppercase tracking-widest font-semibold">
                            Images (Max 5)
                          </span>
                          {variant.images.length < 5 && (
                            <button
                              type="button"
                              onClick={() => {
                                const nextImages = [...variant.images, ""];
                                handleVariantChange(
                                  index,
                                  "images",
                                  nextImages,
                                );
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
                                const nextImages = [...variant.images];
                                nextImages[imgIdx] = val;
                                handleVariantChange(
                                  index,
                                  "images",
                                  nextImages,
                                );
                              }}
                              chooseFileLabel="Upload Image"
                              uploadingLabel="Uploading..."
                              uploadFailedLabel="Upload failed"
                              removeLabel="Remove"
                              uploadEndpoint="/api/fabric/uploads/fabric-image"
                            />
                            {variant.images.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const nextImages = variant.images.filter(
                                    (_, i) => i !== imgIdx,
                                  );
                                  handleVariantChange(
                                    index,
                                    "images",
                                    nextImages,
                                  );
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

        {/* SUBMIT BUTTONS */}
        <div
          ref={formActionsRef}
          className="pt-6 mt-4 border-t border-gray-100"
        >
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => router.push("/fabric/fabrics")}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm text-black bg-white hover:bg-gray-50 transition hover:cursor-pointer"
              disabled={submitting}
            >
              {locale === "ar" ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-black text-white rounded-lg text-xs sm:text-sm hover:bg-gray-800 transition disabled:opacity-50 hover:cursor-pointer"
            >
              {submitting
                ? locale === "ar"
                  ? "جاري الحفظ..."
                  : "Saving..."
                : isEditMode
                  ? locale === "ar"
                    ? "تحديث"
                    : "Update"
                  : locale === "ar"
                    ? "إنشاء"
                    : "Create"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
