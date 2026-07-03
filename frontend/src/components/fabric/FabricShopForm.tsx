"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { Link } from "@/i18n/navigation";
import FormField from "@/components/admin/FormField";
import { getApiErrorMessage, type ApiError } from "@/lib/api/client";
import {
    SLUG_PATTERN,
    createFabricShop,
    emptyFabricShopForm,
    fetchOwnFabricShop,
    slugifyShopName,
    fabricShopToForm,
    updateFabricShop,
    type FabricShopFormData,
    type FabricShopProfile,
} from "@/lib/fabricShop";

const INPUT_CLASS =
    "w-full border border-(--color-border) bg-white px-4 py-3 text-[14px] [font-family:var(--font-body)] text-black focus:border-black focus:outline-none";
const TEXTAREA_CLASS = `${INPUT_CLASS} min-h-[120px] resize-y`;

type FieldKey = keyof FabricShopFormData;

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

export default function FabricShopForm() {
    const t = useTranslations("FabricPortal.shop");
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
    const [formData, setFormData] = useState<FabricShopFormData>(emptyFabricShopForm());
    const [shop, setShop] = useState<FabricShopProfile | null>(null);
    const [slugTouched, setSlugTouched] = useState(false);

    const isCreateMode = shop === null;

    useEffect(() => {
        let cancelled = false;

        const loadShop = async () => {
            setLoading(true);
            setLoadError(null);

            try {
                const existingShop = await fetchOwnFabricShop();
                if (cancelled) return;

                if (existingShop) {
                    setShop(existingShop);
                    setFormData(fabricShopToForm(existingShop));
                    setSlugTouched(true);
                } else {
                    setShop(null);
                    setFormData(emptyFabricShopForm());
                    setSlugTouched(false);
                }
            } catch (err: unknown) {
                if (!cancelled) {
                    const message = getApiErrorMessage(err, t("errors.loadFailed"));
                    setLoadError(message);
                    toast.error(message, ERROR_TOAST);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadShop();

        return () => {
            cancelled = true;
        };
    }, [t]);

    const handleChange = (field: FieldKey, value: string) => {
        let val = value;
        if (field === "phone") {
            val = value.replace(/\D/g, "").slice(0, 9);
        }

        setFormData((prev) => {
            const next = { ...prev, [field]: val };

            if (field === "name" && isCreateMode && !slugTouched) {
                next.slug = slugifyShopName(val);
            }

            return next;
        });

        if (field === "slug") {
            setSlugTouched(true);
        }

        if (fieldErrors[field]) {
            setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
        }
    };

    const validate = (): boolean => {
        const errors: Partial<Record<FieldKey, string>> = {};
        const payload = formData;

        if (!payload.name.trim()) errors.name = t("validation.nameRequired");
        if (!payload.nameAr.trim()) errors.nameAr = t("validation.nameArRequired");
        if (!payload.slug.trim()) {
            errors.slug = t("validation.slugRequired");
        } else if (!SLUG_PATTERN.test(payload.slug.trim().toLowerCase())) {
            errors.slug = t("validation.slugInvalid");
        }
        if (!payload.phone.trim()) {
            errors.phone = t("validation.phoneRequired");
        } else if (!/^\d{9}$/.test(payload.phone.trim())) {
            errors.phone = t("validation.phoneInvalid");
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };



    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);

        try {
            const savedShop = isCreateMode
                ? await createFabricShop(formData)
                : await updateFabricShop(formData);

            setShop(savedShop);
            setFormData(fabricShopToForm(savedShop));
            setSlugTouched(true);
            toast.success(
                isCreateMode ? t("successCreated") : t("successUpdated"),
                SUCCESS_TOAST,
            );
        } catch (err: unknown) {
            const status = (err as ApiError).status;
            const message =
                status === 409
                    ? getApiErrorMessage(err, t("errors.conflict"))
                    : getApiErrorMessage(
                          err,
                          isCreateMode ? t("errors.createFailed") : t("errors.updateFailed"),
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
                <p className="[font-family:var(--font-body)] text-[14px] text-red-700">{loadError}</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl">
            <div className="mb-8">
                <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.28em] text-(--color-grey-muted) mb-3">
                    {t("eyebrow")}
                </p>
                <h1 className="[font-family:var(--font-display)] text-[32px] sm:text-[36px] text-black mb-3">
                    {isCreateMode ? t("createTitle") : t("editTitle")}
                </h1>
                <p className="[font-family:var(--font-body)] text-[14px] leading-relaxed text-(--color-grey-muted)">
                    {isCreateMode ? t("createDescription") : t("editDescription")}
                </p>
            </div>

            <form
                onSubmit={handleSubmit}
                className="border border-(--color-border) bg-white p-6 sm:p-8 space-y-8"
            >
                <section className="space-y-5">
                    <h2 className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black">
                        {t("sections.identity")}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <FormField
                            label={t("fields.name")}
                            name="name"
                            error={fieldErrors.name}
                            required
                        >
                            <input
                                id="name"
                                value={formData.name}
                                onChange={(e) => handleChange("name", e.target.value)}
                                placeholder={t("placeholders.name")}
                                className={INPUT_CLASS}
                                required
                            />
                        </FormField>

                        <FormField
                            label={t("fields.nameAr")}
                            name="nameAr"
                            error={fieldErrors.nameAr}
                            required
                        >
                            <input
                                id="nameAr"
                                value={formData.nameAr}
                                onChange={(e) => handleChange("nameAr", e.target.value)}
                                placeholder={t("placeholders.nameAr")}
                                className={`${INPUT_CLASS} text-right`}
                                dir="rtl"
                                required
                            />
                        </FormField>
                    </div>

                    <FormField
                        label={t("fields.slug")}
                        name="slug"
                        error={fieldErrors.slug}
                        hint={t("hints.slug")}
                        required
                    >
                        <div className="flex">
                            <span className="inline-flex items-center px-4 border border-r-0 border-(--color-border) bg-neutral-50 text-neutral-400 text-xs [font-family:var(--font-ui)]">
                                /partners/
                            </span>
                            <input
                                id="slug"
                                value={formData.slug}
                                onChange={(e) => handleChange("slug", e.target.value)}
                                placeholder={t("placeholders.slug")}
                                className={INPUT_CLASS}
                                required
                            />
                        </div>
                    </FormField>
                </section>

                <hr className="border-(--color-border)" />

                <section className="space-y-5">
                    <h2 className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black">
                        {t("sections.about")}
                    </h2>

                    <FormField
                        label={t("fields.description")}
                        name="description"
                        error={fieldErrors.description}
                    >
                        <textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => handleChange("description", e.target.value)}
                            placeholder={t("placeholders.description")}
                            className={TEXTAREA_CLASS}
                        />
                    </FormField>

                    <FormField
                        label={t("fields.descriptionAr")}
                        name="descriptionAr"
                        error={fieldErrors.descriptionAr}
                    >
                        <textarea
                            id="descriptionAr"
                            value={formData.descriptionAr}
                            onChange={(e) => handleChange("descriptionAr", e.target.value)}
                            placeholder={t("placeholders.descriptionAr")}
                            className={`${TEXTAREA_CLASS} text-right`}
                            dir="rtl"
                        />
                    </FormField>
                </section>


                <hr className="border-(--color-border)" />

                <section className="space-y-5">
                    <h2 className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black">
                        {t("sections.contact")}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <FormField
                            label={t("fields.city")}
                            name="city"
                            error={fieldErrors.city}
                        >
                            <input
                                id="city"
                                value={formData.city}
                                onChange={(e) => handleChange("city", e.target.value)}
                                placeholder={t("placeholders.city")}
                                className={INPUT_CLASS}
                            />
                        </FormField>

                        <FormField
                            label={t("fields.location")}
                            name="location"
                            error={fieldErrors.location}
                        >
                            <input
                                id="location"
                                value={formData.location}
                                onChange={(e) => handleChange("location", e.target.value)}
                                placeholder={t("placeholders.location")}
                                className={INPUT_CLASS}
                            />
                        </FormField>

                        <FormField
                            label={t("fields.phone")}
                            name="phone"
                            error={fieldErrors.phone}
                            required
                        >
                            <div className="flex items-center border border-(--color-border) bg-transparent focus-within:border-black rounded-sm">
                                <span className="inline-flex items-center px-4 bg-neutral-50 text-neutral-400 text-xs [font-family:var(--font-ui)] select-none border-r border-(--color-border) py-1.5">
                                    +971
                                </span>
                                <input
                                    id="phone"
                                    value={formData.phone}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if ((val === "" || /^\d*$/.test(val)) && val.length <= 9) {
                                            handleChange("phone", val);
                                        }
                                    }}
                                    placeholder="123456777"
                                    className="w-full py-1 pl-3 bg-transparent text-[14px] focus:outline-none"
                                    type="text"
                                    required
                                />
                            </div>
                        </FormField>
                    </div>
                </section>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-(--color-border)">
                    <Link
                        href="/fabric"
                        className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-neutral-400 hover:text-black transition"
                    >
                        &larr; {t("backToDashboard")}
                    </Link>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full sm:w-auto bg-black text-white px-8 py-3 text-[11px] uppercase tracking-[0.24em] font-semibold hover:bg-neutral-800 transition disabled:opacity-50 hover:cursor-pointer"
                    >
                        {submitting ? t("saving") : isCreateMode ? t("createCta") : t("saveCta")}
                    </button>
                </div>
            </form>
        </div>
    );
}
