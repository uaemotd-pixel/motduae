"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import FormField from "@/components/admin/FormField";
import FabricImageUpload from "@/components/admin/FabricImageUpload";
import { getApiErrorMessage, type ApiError } from "@/lib/api/client";
import { fetchOwnFabricShop, shopPickupToFabricStorePickup } from "@/lib/fabricShop";
import { api } from "@/lib/api/client";
import { UAE_EMIRATES, type PickupAddress } from "@/lib/createFabricAdmin";
import {
  SLUG_PATTERN,
  createFabricItem,
  fabricToForm,
  emptyFabricForm,
  fetchFabricItem,
  isShopMissingError,
  slugifyFabricName,
  updateFabricItem,
  type FabricFormData,
} from "@/lib/fabricCatalog";
import colors from "../shared/colors";

const INPUT_CLASS =
  "w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none bg-transparent text-xs sm:text-sm";

type FabricDesignFormProps = {
  fabricId?: string;
};

type FieldKey = keyof FabricFormData;

const TOAST_BASE = {
  position: "top-right" as const,
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
  const [slugTouched, setSlugTouched] = useState(false);
  const [shopName, setShopName] = useState<string>("");
  const [isColorDropdownOpen, setIsColorDropdownOpen] = useState(false);
  const [openVariantColorDropdown, setOpenVariantColorDropdown] = useState<
    number | null
  >(null);
  const [isMaterialDropdownOpen, setIsMaterialDropdownOpen] = useState(false);
  const [isMaterialArDropdownOpen, setIsMaterialArDropdownOpen] =
    useState(false);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [isTagArDropdownOpen, setIsTagArDropdownOpen] = useState(false);
  const [isEmirateDropdownOpen, setIsEmirateDropdownOpen] = useState(false);
  const [dbMaterials, setDbMaterials] = useState<
    { name: string; nameAr: string; _id: string }[]
  >([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [dbTags, setDbTags] = useState<
    { name: string; nameAr: string; _id: string }[]
  >([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const colorDropdownRef = useRef<HTMLDivElement>(null);
  const materialDropdownRef = useRef<HTMLDivElement>(null);
  const materialArDropdownRef = useRef<HTMLDivElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const tagArDropdownRef = useRef<HTMLDivElement>(null);
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

  // Fetch materials from DB
  useEffect(() => {
    let cancelled = false;
    const fetchMaterials = async () => {
      try {
        setMaterialsLoading(true);
        const data = await api.get<
          { name: string; nameAr: string; _id: string }[]
        >("/api/filters/materials");
        if (!cancelled && Array.isArray(data) && data.length > 0) {
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
    const handleClickOutside = (event: MouseEvent) => {
      if (
        colorDropdownRef.current &&
        !colorDropdownRef.current.contains(event.target as Node)
      ) {
        setIsColorDropdownOpen(false);
      }
      if (
        materialDropdownRef.current &&
        !materialDropdownRef.current.contains(event.target as Node)
      ) {
        setIsMaterialDropdownOpen(false);
      }
      if (
        materialArDropdownRef.current &&
        !materialArDropdownRef.current.contains(event.target as Node)
      ) {
        setIsMaterialArDropdownOpen(false);
      }
      if (
        tagDropdownRef.current &&
        !tagDropdownRef.current.contains(event.target as Node)
      ) {
        setIsTagDropdownOpen(false);
      }
      if (
        tagArDropdownRef.current &&
        !tagArDropdownRef.current.contains(event.target as Node)
      ) {
        setIsTagArDropdownOpen(false);
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
          setSlugTouched(true);
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

      if (
        field === "name" &&
        !isEditMode &&
        !slugTouched &&
        typeof value === "string"
      ) {
        next.slug = slugifyFabricName(value);
      }

      return next;
    });

    if (field === "slug") setSlugTouched(true);
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

      if (
        field === "name" &&
        !nextVariants[index].slug &&
        typeof value === "string"
      ) {
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
          colors: [],
          tag: "",
          tagAr: "",
          pricePerMeter: prev.pricePerMeter,
          stockInMeters: 0,
          storePickupAddress: prev.storePickupAddress,
          isActive: true,
        },
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
    setFormData((prev) => ({
      ...prev,
      storePickupAddress: {
        ...prev.storePickupAddress,
        [subfield]: value,
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
    if (!formData.slug.trim()) {
      errors.slug = t("validation.slugRequired");
    } else if (!SLUG_PATTERN.test(formData.slug.trim().toLowerCase())) {
      errors.slug = t("validation.slugInvalid");
    }
    if (!formData.images.some((image) => image.trim())) {
      errors.images = t("validation.imagesRequired");
    }

    if (!formData.material) {
      errors.material = "Material (EN) is required";
    }
    if (!formData.materialAr) {
      errors.materialAr = "Material (AR) is required";
    }

    const priceNum = Number(formData.pricePerMeter);
    if (isNaN(priceNum) || priceNum <= 0) {
      errors.pricePerMeter = t("validation.pricePerMeterInvalid");
    }
    const stockNum = Number(formData.stockInMeters);
    if (isNaN(stockNum) || stockNum < 0) {
      errors.stockInMeters = t("validation.stockInMetersInvalid");
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
    } else if (!/^\d{9}$/.test(formData.storePickupAddress.phone.trim())) {
      errors["storePickupAddress.phone"] =
        "Phone number must be exactly 9 digits";
    }

    if (formData.variants && formData.variants.length > 0) {
      formData.variants.forEach((v, i) => {
        const prefix = `variants.${i}`;
        if (!v.name.trim())
          errors[`${prefix}.name`] = t("validation.nameRequired");
        if (!v.nameAr.trim())
          errors[`${prefix}.nameAr`] = t("validation.nameArRequired");
        if (!v.slug.trim()) {
          errors[`${prefix}.slug`] = t("validation.slugRequired");
        } else if (!SLUG_PATTERN.test(v.slug.trim().toLowerCase())) {
          errors[`${prefix}.slug`] = t("validation.slugInvalid");
        }
        if (!v.images.some((img) => img.trim())) {
          errors[`${prefix}.images`] = t("validation.imagesRequired");
        }
        const pNum = Number(v.pricePerMeter);
        if (isNaN(pNum) || pNum <= 0) {
          errors[`${prefix}.pricePerMeter`] = t(
            "validation.pricePerMeterInvalid",
          );
        }
        const sNum = Number(v.stockInMeters);
        if (isNaN(sNum) || sNum < 0) {
          errors[`${prefix}.stockInMeters`] = t(
            "validation.stockInMetersInvalid",
          );
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

  // Material options - from DB only
  const materialOptionsEn = dbMaterials.map((m) => ({
    value: m.name,
    label: m.name,
  }));
  const materialOptionsAr = dbMaterials.map((m) => ({
    value: m.nameAr || m.name,
    label: m.nameAr || m.name,
  }));

  // Tag options - from DB only
  const tagOptionsEn = dbTags.map((t) => ({
    value: t.name,
    label: t.name,
  }));
  const tagOptionsAr = dbTags.map((t) => ({
    value: t.nameAr || t.name,
    label: t.nameAr || t.name,
  }));

  const selectedColors = formData.colors || [];

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-0">
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
        className="bg-white border border-gray-200 p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* NAME (EN) */}
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

          {/* NAME (AR) */}
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

          {/* DESCRIPTION (EN) */}
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
              placeholder="fhyfhy"
            />
          </FormField>

          {/* DESCRIPTION (AR) */}
          <FormField
            label="DESCRIPTION (AR)"
            name="descriptionAr"
            error={fieldErrors.descriptionAr}
          >
            <input
              type="text"
              value={formData.descriptionAr}
              onChange={(e) => handleChange("descriptionAr", e.target.value)}
              className={`${INPUT_CLASS} text-right hover:cursor-text`}
              placeholder="...وصف القماش"
              dir="rtl"
            />
          </FormField>

          {/* Row for Material (EN), Material (AR), Colors */}
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* MATERIAL (EN) - from DB */}
            <FormField
              label="MATERIAL (EN)"
              name="material"
              error={fieldErrors.material}
              required
            >
              <div className="relative" ref={materialDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsMaterialDropdownOpen((prev) => !prev)}
                  className={`${INPUT_CLASS} cursor-pointer text-left flex items-center justify-between gap-2 hover:cursor-pointer`}
                >
                  <span className="truncate text-xs sm:text-sm">
                    {formData.material ? (
                      materialOptionsEn.find(
                        (m) => m.value === formData.material,
                      )?.label
                    ) : materialsLoading ? (
                      <span className="text-black/60">Loading...</span>
                    ) : (
                      <span className="text-black/60">Select material</span>
                    )}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`shrink-0 text-black/40 transition-transform duration-200 ${isMaterialDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <AnimatePresence>
                  {isMaterialDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-sm z-50 origin-top overflow-hidden max-h-60 overflow-y-auto"
                    >
                      {materialsLoading ? (
                        <div className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-500">
                          Loading materials...
                        </div>
                      ) : materialOptionsEn.length === 0 ? (
                        <div className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-500">
                          No materials found
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              handleChange("material", "");
                              setIsMaterialDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm hover:bg-neutral-50 transition hover:cursor-pointer ${!formData.material ? "bg-neutral-100 font-medium" : ""}`}
                          >
                            Select material
                          </button>
                          {materialOptionsEn.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                handleChange("material", opt.value);
                                setIsMaterialDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm hover:bg-neutral-50 transition hover:cursor-pointer ${formData.material === opt.value ? "bg-neutral-100 font-medium" : ""}`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </FormField>

            {/* MATERIAL (AR) - from DB */}
            <FormField
              label="MATERIAL (AR)"
              name="materialAr"
              error={fieldErrors.materialAr}
              required
            >
              <div className="relative" ref={materialArDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsMaterialArDropdownOpen((prev) => !prev)}
                  className={`${INPUT_CLASS} cursor-pointer text-right flex items-center justify-between gap-2 hover:cursor-pointer`}
                  dir="rtl"
                >
                  <span className="truncate text-xs sm:text-sm">
                    {formData.materialAr ? (
                      materialOptionsAr.find(
                        (m) => m.value === formData.materialAr,
                      )?.label
                    ) : materialsLoading ? (
                      <span className="text-black/60">جاري التحميل...</span>
                    ) : (
                      <span className="text-black/60">اختر النوع</span>
                    )}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`shrink-0 text-black/40 transition-transform duration-200 ${isMaterialArDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <AnimatePresence>
                  {isMaterialArDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-sm z-50 origin-top overflow-hidden max-h-60 overflow-y-auto"
                      dir="rtl"
                    >
                      {materialsLoading ? (
                        <div className="px-3 sm:px-4 py-1.5 sm:py-2 text-right text-xs sm:text-sm text-gray-500">
                          جاري التحميل...
                        </div>
                      ) : materialOptionsAr.length === 0 ? (
                        <div className="px-3 sm:px-4 py-1.5 sm:py-2 text-right text-xs sm:text-sm text-gray-500">
                          لا توجد مواد
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              handleChange("materialAr", "");
                              setIsMaterialArDropdownOpen(false);
                            }}
                            className={`w-full text-right px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm hover:bg-neutral-50 transition hover:cursor-pointer ${!formData.materialAr ? "bg-neutral-100 font-medium" : ""}`}
                          >
                            اختر النوع
                          </button>
                          {materialOptionsAr.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                handleChange("materialAr", opt.value);
                                setIsMaterialArDropdownOpen(false);
                              }}
                              className={`w-full text-right px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm hover:bg-neutral-50 transition hover:cursor-pointer ${formData.materialAr === opt.value ? "bg-neutral-100 font-medium" : ""}`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </FormField>

            {/* COLORS */}
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
                                <span className="text-[8px] sm:text-[10px] lg:text-xs truncate hover:cursor-pointer">
                                  {locale === "ar" ? opt.ar : opt.en}
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

          {/* TAG (EN) - from DB */}
          <FormField label="TAG (EN)" name="tag" error={fieldErrors.tag}>
            <div className="relative" ref={tagDropdownRef}>
              <button
                type="button"
                onClick={() => setIsTagDropdownOpen((prev) => !prev)}
                className={`${INPUT_CLASS} cursor-pointer text-left flex items-center justify-between gap-2 hover:cursor-pointer`}
              >
                <span className="truncate text-xs sm:text-sm">
                  {formData.tag ? (
                    tagOptionsEn.find((m) => m.value === formData.tag)?.label
                  ) : tagsLoading ? (
                    <span className="text-black/60">Loading...</span>
                  ) : (
                    <span className="text-black/60">Select tag (optional)</span>
                  )}
                </span>
                <ChevronDown
                  size={14}
                  className={`shrink-0 text-black/40 transition-transform duration-200 ${isTagDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>
              <AnimatePresence>
                {isTagDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-sm z-50 origin-top overflow-hidden max-h-60 overflow-y-auto"
                  >
                    {tagsLoading ? (
                      <div className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-500">
                        Loading tags...
                      </div>
                    ) : tagOptionsEn.length === 0 ? (
                      <div className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-500">
                        No tags found
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            handleChange("tag", "");
                            setIsTagDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm hover:bg-neutral-50 transition hover:cursor-pointer ${!formData.tag ? "bg-neutral-100 font-medium" : ""}`}
                        >
                          Select tag (optional)
                        </button>
                        {tagOptionsEn.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              handleChange("tag", opt.value);
                              setIsTagDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm hover:bg-neutral-50 transition hover:cursor-pointer ${formData.tag === opt.value ? "bg-neutral-100 font-medium" : ""}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </FormField>

          {/* TAG (AR) - from DB */}
          <FormField label="TAG (AR)" name="tagAr" error={fieldErrors.tagAr}>
            <div className="relative" ref={tagArDropdownRef}>
              <button
                type="button"
                onClick={() => setIsTagArDropdownOpen((prev) => !prev)}
                className={`${INPUT_CLASS} cursor-pointer text-right flex items-center justify-between gap-2 hover:cursor-pointer`}
                dir="rtl"
              >
                <span className="truncate text-xs sm:text-sm">
                  {formData.tagAr ? (
                    tagOptionsAr.find((m) => m.value === formData.tagAr)?.label
                  ) : tagsLoading ? (
                    <span className="text-black/60">جاري التحميل...</span>
                  ) : (
                    <span className="text-black/60">اختر الوسم (اختياري)</span>
                  )}
                </span>
                <ChevronDown
                  size={14}
                  className={`shrink-0 text-black/40 transition-transform duration-200 ${isTagArDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>
              <AnimatePresence>
                {isTagArDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-sm z-50 origin-top overflow-hidden max-h-60 overflow-y-auto"
                    dir="rtl"
                  >
                    {tagsLoading ? (
                      <div className="px-3 sm:px-4 py-1.5 sm:py-2 text-right text-xs sm:text-sm text-gray-500">
                        جاري التحميل...
                      </div>
                    ) : tagOptionsAr.length === 0 ? (
                      <div className="px-3 sm:px-4 py-1.5 sm:py-2 text-right text-xs sm:text-sm text-gray-500">
                        لا توجد وسوم
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            handleChange("tagAr", "");
                            setIsTagArDropdownOpen(false);
                          }}
                          className={`w-full text-right px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm hover:bg-neutral-50 transition hover:cursor-pointer ${!formData.tagAr ? "bg-neutral-100 font-medium" : ""}`}
                        >
                          اختر الوسم (اختياري)
                        </button>
                        {tagOptionsAr.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              handleChange("tagAr", opt.value);
                              setIsTagArDropdownOpen(false);
                            }}
                            className={`w-full text-right px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm hover:bg-neutral-50 transition hover:cursor-pointer ${formData.tagAr === opt.value ? "bg-neutral-100 font-medium" : ""}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </FormField>

          {/* PRICE PER METER (AED) */}
          <FormField
            label="PRICE PER METER (AED)"
            name="pricePerMeter"
            error={fieldErrors.pricePerMeter}
            required
          >
            <input
              type="text"
              inputMode="decimal"
              value={formData.pricePerMeter === 0 ? "" : formData.pricePerMeter}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || /^\d*\.?\d*$/.test(val)) {
                  handleChange("pricePerMeter", val);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  const current = Number(formData.pricePerMeter) || 0;
                  const next = parseFloat((current + 0.01).toFixed(2));
                  handleChange("pricePerMeter", next);
                } else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  const current = Number(formData.pricePerMeter) || 0;
                  const next = Math.max(0, current - 0.01);
                  handleChange("pricePerMeter", parseFloat(next.toFixed(2)));
                }
              }}
              className={`${INPUT_CLASS} hover:cursor-text`}
              placeholder="0.00"
            />
          </FormField>

          {/* STOCK IN METERS */}
          <FormField
            label="STOCK IN METERS"
            name="stockInMeters"
            error={fieldErrors.stockInMeters}
            required
          >
            <input
              type="text"
              inputMode="numeric"
              value={formData.stockInMeters === 0 ? "" : formData.stockInMeters}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || /^\d*$/.test(val)) {
                  handleChange("stockInMeters", val);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  const current = Number(formData.stockInMeters) || 0;
                  handleChange("stockInMeters", current + 1);
                } else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  const current = Number(formData.stockInMeters) || 0;
                  const next = Math.max(0, current - 1);
                  handleChange("stockInMeters", next);
                }
              }}
              className={`${INPUT_CLASS} hover:cursor-text`}
              placeholder="e.g., 100"
            />
          </FormField>

          {/* Store Pickup Address */}
          <div className="md:col-span-2">
            <h3 className="text-[11px] sm:text-xs font-medium text-gray-700 mb-3 uppercase tracking-wider [font-family:var(--font-ui)]">
              Store Pickup Address
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    value={formData.storePickupAddress.phone}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (
                        (val === "" || /^\d*$/.test(val)) &&
                        val.length <= 9
                      ) {
                        handlePickupChange("phone", val);
                      }
                    }}
                    className="w-full py-1 pl-3 bg-transparent text-xs sm:text-[14px] focus:outline-none hover:cursor-text"
                    placeholder="123456777"
                  />
                </div>
              </FormField>
            </div>
          </div>

          {/* IMAGES (MAX 5) */}
          <div className="md:col-span-2">
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
                className="mb-4 p-3 sm:p-4 border border-gray-100 rounded-lg"
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
          </div>

          {/* ACTIVE STATUS */}
          <div className="md:col-span-2">
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
          </div>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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

                      {/* VARIANT SLUG */}
                      <FormField
                        label="Slug"
                        name={`${prefix}.slug`}
                        error={fieldErrors[`${prefix}.slug`]}
                        required
                      >
                        <input
                          type="text"
                          value={variant.slug}
                          onChange={(e) =>
                            handleVariantChange(index, "slug", e.target.value)
                          }
                          className={`${INPUT_CLASS} hover:cursor-text`}
                          placeholder="e.g. red-silk"
                        />
                      </FormField>

                      {/* VARIANT MATERIAL - from DB */}
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
                            handleVariantChange(index, "material", val);
                            const found = dbMaterials.find(
                              (m) => m.name === val,
                            );
                            if (found) {
                              handleVariantChange(
                                index,
                                "materialAr",
                                found.nameAr || "",
                              );
                            }
                          }}
                          className={`${INPUT_CLASS} hover:cursor-pointer`}
                        >
                          <option value="">Select material</option>
                          {dbMaterials.map((m) => (
                            <option key={m._id} value={m.name}>
                              {m.name}
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

                      {/* VARIANT PRICE */}
                      <FormField
                        label="Price Per Meter (AED)"
                        name={`${prefix}.pricePerMeter`}
                        error={fieldErrors[`${prefix}.pricePerMeter`]}
                        required
                      >
                        <input
                          type="text"
                          inputMode="decimal"
                          value={
                            variant.pricePerMeter === 0
                              ? ""
                              : variant.pricePerMeter
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || /^\d*\.?\d*$/.test(val)) {
                              handleVariantChange(index, "pricePerMeter", val);
                            }
                          }}
                          className={`${INPUT_CLASS} hover:cursor-text`}
                          placeholder="0.00"
                        />
                      </FormField>

                      {/* VARIANT STOCK */}
                      <FormField
                        label="Stock in Meters"
                        name={`${prefix}.stockInMeters`}
                        error={fieldErrors[`${prefix}.stockInMeters`]}
                        required
                      >
                        <input
                          type="text"
                          inputMode="numeric"
                          value={
                            variant.stockInMeters === 0
                              ? ""
                              : variant.stockInMeters
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || /^\d*$/.test(val)) {
                              handleVariantChange(index, "stockInMeters", val);
                            }
                          }}
                          className={`${INPUT_CLASS} hover:cursor-text`}
                          placeholder="e.g. 50"
                        />
                      </FormField>

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
