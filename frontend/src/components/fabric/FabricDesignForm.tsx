"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import FormField from "@/components/admin/FormField";
import FabricImageUpload from "@/components/admin/FabricImageUpload";
import { getApiErrorMessage, type ApiError } from "@/lib/api/client";
import { fetchOwnFabricShop } from "@/lib/fabricShop";
import {
  FABRIC_MATERIALS,
  FABRIC_TAGS,
  UAE_EMIRATES,
  COLOR_OPTIONS,
  type PickupAddress,
} from "@/lib/createFabricAdmin";
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

const INPUT_CLASS =
  "w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none bg-transparent text-[14px]";

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
  const [isMaterialDropdownOpen, setIsMaterialDropdownOpen] = useState(false);
  const [isMaterialArDropdownOpen, setIsMaterialArDropdownOpen] =
    useState(false);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [isTagArDropdownOpen, setIsTagArDropdownOpen] = useState(false);
  const [isEmirateDropdownOpen, setIsEmirateDropdownOpen] = useState(false);
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

    if (fieldErrors[field as string]) {
      setFieldErrors((prev) => ({ ...prev, [field as string]: undefined }));
    }
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

  const selectedColors = formData.colors || [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="mb-8">
        <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.28em] text-(--color-grey-muted) mb-3">
          {t("eyebrow")}
        </p>
        <h1 className="[font-family:var(--font-display)] text-[32px] sm:text-[36px] text-black mb-3 font-normal">
          {isEditMode ? t("editTitle") : t("createTitle")}
        </h1>
        <p className="[font-family:var(--font-body)] text-[14px] text-(--color-grey-muted)">
          {isEditMode ? t("editDescription") : t("createDescription")}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-200 p-8 space-y-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              className={INPUT_CLASS}
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
              className={`${INPUT_CLASS} text-right`}
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
              className={INPUT_CLASS}
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
              className={`${INPUT_CLASS} text-right`}
              placeholder="...وصف القماش"
              dir="rtl"
            />
          </FormField>

          {/* Row for Material (EN), Material (AR), Colors */}
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* MATERIAL (EN) */}
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
                  className={`${INPUT_CLASS} cursor-pointer text-left flex items-center justify-between gap-2`}
                >
                  <span className="truncate">
                    {formData.material ? (
                      FABRIC_MATERIALS.find(
                        (m) => m.value === formData.material,
                      )?.en
                    ) : (
                      <span className="text-xs text-black/60">
                        Select material
                      </span>
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
                      className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-sm z-50 origin-top overflow-hidden"
                    >
                      <div className="max-h-44 overflow-auto">
                        {FABRIC_MATERIALS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              handleChange("material", opt.value);
                              setIsMaterialDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-[13px] hover:bg-neutral-50 transition ${formData.material === opt.value ? "bg-neutral-100 font-medium" : ""}`}
                          >
                            {opt.en}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </FormField>

            {/* MATERIAL (AR) */}
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
                  className={`${INPUT_CLASS} cursor-pointer text-right flex items-center justify-between gap-2`}
                  dir="rtl"
                >
                  <span className="truncate">
                    {formData.materialAr ? (
                      FABRIC_MATERIALS.find((m) => m.ar === formData.materialAr)
                        ?.ar
                    ) : (
                      <span className="text-xs text-black/60">اختر النوع</span>
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
                      className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-sm z-50 origin-top overflow-hidden"
                      dir="rtl"
                    >
                      <div className="max-h-44 overflow-auto">
                        {FABRIC_MATERIALS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              handleChange("materialAr", opt.ar);
                              setIsMaterialArDropdownOpen(false);
                            }}
                            className={`w-full text-right px-3 py-2 text-[13px] hover:bg-neutral-50 transition ${formData.materialAr === opt.ar ? "bg-neutral-100 font-medium" : ""}`}
                          >
                            {opt.ar}
                          </button>
                        ))}
                      </div>
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
                  className="w-full py-1 border-b border-gray-300 focus:border-black text-left bg-transparent min-h-7 flex items-center justify-between gap-2 cursor-pointer"
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

          {/* TAG (EN) */}
          <FormField label="TAG (EN)" name="tag" error={fieldErrors.tag}>
            <div className="relative" ref={tagDropdownRef}>
              <button
                type="button"
                onClick={() => setIsTagDropdownOpen((prev) => !prev)}
                className={`${INPUT_CLASS} cursor-pointer text-left flex items-center justify-between gap-2`}
              >
                <span className="truncate">
                  {formData.tag ? (
                    FABRIC_TAGS.find((m) => m.value === formData.tag)?.en
                  ) : (
                    <span className="text-xs text-black/60">
                      Select tag (optional)
                    </span>
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
                    className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-sm z-50 origin-top overflow-hidden"
                  >
                    <div className="max-h-44 overflow-auto">
                      {FABRIC_TAGS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            handleChange("tag", opt.value);
                            setIsTagDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-[13px] hover:bg-neutral-50 transition ${formData.tag === opt.value ? "bg-neutral-100 font-medium" : ""}`}
                        >
                          {opt.en}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </FormField>

          {/* TAG (AR) */}
          <FormField label="TAG (AR)" name="tagAr" error={fieldErrors.tagAr}>
            <div className="relative" ref={tagArDropdownRef}>
              <button
                type="button"
                onClick={() => setIsTagArDropdownOpen((prev) => !prev)}
                className={`${INPUT_CLASS} cursor-pointer text-right flex items-center justify-between gap-2`}
                dir="rtl"
              >
                <span className="truncate">
                  {formData.tagAr ? (
                    FABRIC_TAGS.find((m) => m.ar === formData.tagAr)?.ar
                  ) : (
                    <span className="text-xs text-black/60">
                      اختر الوسم (اختياري)
                    </span>
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
                    className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-sm z-50 origin-top overflow-hidden"
                    dir="rtl"
                  >
                    <div className="max-h-44 overflow-auto">
                      {FABRIC_TAGS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            handleChange("tagAr", opt.ar);
                            setIsTagArDropdownOpen(false);
                          }}
                          className={`w-full text-right px-3 py-2 text-[13px] hover:bg-neutral-50 transition ${formData.tagAr === opt.ar ? "bg-neutral-100 font-medium" : ""}`}
                        >
                          {opt.ar}
                        </button>
                      ))}
                    </div>
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
              className={INPUT_CLASS}
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
              className={INPUT_CLASS}
              placeholder="e.g., 100"
            />
          </FormField>

          {/* Store Pickup Address */}
          <div className="md:col-span-2">
            <h3 className="text-sm font-medium text-gray-700 mb-3 uppercase tracking-wider text-[11px] [font-family:var(--font-ui)]">
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
                    className={`${INPUT_CLASS} cursor-pointer text-left flex items-center justify-between gap-2`}
                  >
                    <span className="truncate">
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
                        <span className="text-xs text-black/60">
                          Select emirate
                        </span>
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
                        className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-sm z-50 origin-top overflow-hidden"
                      >
                        <div className="max-h-44 overflow-auto">
                          {UAE_EMIRATES.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                handlePickupChange("emirate", opt.value);
                                setIsEmirateDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-[13px] hover:bg-neutral-50 transition ${formData.storePickupAddress.emirate === opt.value ? "bg-neutral-100 font-medium" : ""}`}
                            >
                              {opt.en} / {opt.ar}
                            </button>
                          ))}
                        </div>
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
                  className={INPUT_CLASS}
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
                  className={INPUT_CLASS}
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
                  className={INPUT_CLASS}
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
                  <span className="inline-flex items-center px-3 py-1 bg-neutral-50 text-neutral-400 text-[14px] [font-family:var(--font-ui)] select-none border-r border-gray-200">
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
                    className="w-full py-1 pl-3 bg-transparent text-[14px] focus:outline-none"
                    placeholder="123456777"
                  />
                </div>
              </FormField>
            </div>
          </div>

          {/* IMAGES (MAX 5) */}
          <div className="md:col-span-2">
            <div className="mb-2 flex justify-between items-center">
              <span className="font-label-sm text-[11px] text-black/60 uppercase tracking-[0.2em]">
                IMAGES (MAX 5) <span className="text-red-500 ml-1">*</span>
              </span>
              {formData.images.length < 5 && (
                <button
                  type="button"
                  onClick={addImageField}
                  className="text-xs text-black underline hover:text-neutral-700 transition font-medium"
                >
                  + Add Image
                </button>
              )}
            </div>
            {fieldErrors.images && (
              <p className="text-xs text-red-500 mb-2">{fieldErrors.images}</p>
            )}
            {formData.images.map((url, idx) => (
              <div
                key={idx}
                className="mb-4 p-4 border border-gray-100 rounded-lg"
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
                    className="text-xs text-red-500 mt-2 hover:underline block"
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
                  className="w-4 h-4 accent-black cursor-pointer"
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

        <div
          ref={formActionsRef}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4 border-t border-gray-100"
        >
          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-3 bg-black text-white text-[11px] tracking-[0.22em] uppercase hover:bg-neutral-800 transition disabled:opacity-50 font-semibold cursor-pointer"
          >
            {submitting
              ? t("saving")
              : isEditMode
                ? t("saveCta")
                : t("createCta")}
          </button>
          <Link
            href="/fabric/fabrics"
            className="text-center px-8 py-3 border border-black text-black text-[11px] tracking-[0.22em] uppercase hover:bg-black hover:text-white transition font-semibold cursor-pointer"
          >
            {t("cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
}
