"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { Link } from "@/i18n/navigation";
import FormField from "@/components/admin/FormField";
import ImageUpload from "@/components/admin/ImageUpload";
import { getApiErrorMessage, type ApiError } from "@/lib/api/client";
import {
    SLUG_PATTERN,
    createTailorShop,
    emptyTailorShopForm,
    fetchOwnTailorShop,
    slugifyShopName,
    tailorShopToForm,
    updateTailorShop,
    type TailorShopFormData,
    type TailorShopProfile,
} from "@/lib/tailorShop";

const INPUT_CLASS =
    "w-full border border-(--color-border) bg-white px-4 py-3 text-[14px] [font-family:var(--font-body)] text-black focus:border-black focus:outline-none";
const TEXTAREA_CLASS = `${INPUT_CLASS} min-h-[120px] resize-y`;

type FieldKey = keyof TailorShopFormData;

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

export default function TailorShopForm() {
    const t = useTranslations("TailorPortal.shop");
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
    const [formData, setFormData] = useState<TailorShopFormData>(emptyTailorShopForm());
    const [shop, setShop] = useState<TailorShopProfile | null>(null);
    const [slugTouched, setSlugTouched] = useState(false);

    const isCreateMode = shop === null;

    useEffect(() => {
        let cancelled = false;

        const loadShop = async () => {
            setLoading(true);
            setLoadError(null);

            try {
                const existingShop = await fetchOwnTailorShop();
                if (cancelled) return;

                if (existingShop) {
                    setShop(existingShop);
                    setFormData(tailorShopToForm(existingShop));
                    setSlugTouched(true);
                } else {
                    setShop(null);
                    setFormData(emptyTailorShopForm());
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

    const handleImageChange = async (field: "logo" | "coverImage", url: string) => {
        const nextForm = { ...formData, [field]: url };
        setFormData(nextForm);
        if (fieldErrors[field]) {
            setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
        }

        if (!shop) return;

        setSubmitting(true);

        try {
            const savedShop = await updateTailorShop(nextForm);
            setShop(savedShop);
            setFormData(tailorShopToForm(savedShop));
            toast.success(
                url.trim() ? t("imageSaved") : t("imageRemoved"),
                SUCCESS_TOAST,
            );
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, t("errors.updateFailed")), ERROR_TOAST);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);

        try {
            const savedShop = isCreateMode
                ? await createTailorShop(formData)
                : await updateTailorShop(formData);

            setShop(savedShop);
            setFormData(tailorShopToForm(savedShop));
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
                {!isCreateMode && shop?.slug && (
                    <Link
                        href={`/tailors/${shop.slug}`}
                        className="inline-block mt-4 [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-black underline underline-offset-4 hover:text-(--color-grey-muted) transition"
                    >
                        {t("viewPublicProfile")}
                    </Link>
                )}
            </div>

            {!isCreateMode && shop && (
                <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="border border-(--color-border) bg-white p-4">
                        <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-(--color-grey-muted) mb-1">
                            {t("meta.rating")}
                        </p>
                        <p className="[font-family:var(--font-display)] text-[20px] text-black">
                            {Number(shop.rating ?? 0).toFixed(1)}
                        </p>
                    </div>
                    <div className="border border-(--color-border) bg-white p-4">
                        <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-(--color-grey-muted) mb-1">
                            {t("meta.reviews")}
                        </p>
                        <p className="[font-family:var(--font-display)] text-[20px] text-black">
                            {shop.reviewCount ?? 0}
                        </p>
                    </div>
                    <div className="border border-(--color-border) bg-white p-4">
                        <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-(--color-grey-muted) mb-1">
                            {t("meta.status")}
                        </p>
                        <p className="[font-family:var(--font-display)] text-[20px] text-black">
                            {shop.isActive ? t("meta.active") : t("meta.inactive")}
                        </p>
                    </div>
                </div>
            )}

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
                            required
                            error={fieldErrors.name}
                        >
                            <input
                                id="name"
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleChange("name", e.target.value)}
                                placeholder={t("placeholders.name")}
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
                                placeholder={t("placeholders.nameAr")}
                                dir="rtl"
                                className={INPUT_CLASS}
                            />
                        </FormField>
                    </div>

                    <FormField
                        label={t("fields.slug")}
                        name="slug"
                        required
                        hint={t("hints.slug")}
                        error={fieldErrors.slug}
                    >
                        <input
                            id="slug"
                            type="text"
                            value={formData.slug}
                            onChange={(e) => handleChange("slug", e.target.value)}
                            placeholder={t("placeholders.slug")}
                            className={INPUT_CLASS}
                        />
                    </FormField>
                </section>

                <section className="space-y-5">
                    <h2 className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black">
                        {t("sections.about")}
                    </h2>

                    <FormField label={t("fields.description")} name="description">
                        <textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => handleChange("description", e.target.value)}
                            placeholder={t("placeholders.description")}
                            className={TEXTAREA_CLASS}
                        />
                    </FormField>

                    <FormField label={t("fields.descriptionAr")} name="descriptionAr">
                        <textarea
                            id="descriptionAr"
                            value={formData.descriptionAr}
                            onChange={(e) => handleChange("descriptionAr", e.target.value)}
                            placeholder={t("placeholders.descriptionAr")}
                            dir="rtl"
                            className={TEXTAREA_CLASS}
                        />
                    </FormField>
                </section>

                <section className="space-y-5">
                    <h2 className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black">
                        {t("sections.media")}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <FormField
                            label={t("fields.logo")}
                            name="logo"
                            hint={t("hints.logoUpload")}
                        >
                            <ImageUpload
                                value={formData.logo}
                                onChange={(url) => handleImageChange("logo", url)}
                                uploadEndpoint="/api/tailor/uploads/shop-image?variant=logo"
                                chooseFileLabel={t("upload.chooseFile")}
                                uploadingLabel={t("upload.uploading")}
                                uploadFailedLabel={t("upload.failed")}
                                removeLabel={t("upload.remove")}
                            />
                        </FormField>

                        <FormField
                            label={t("fields.coverImage")}
                            name="coverImage"
                            hint={t("hints.coverUpload")}
                        >
                            <ImageUpload
                                value={formData.coverImage}
                                onChange={(url) => handleImageChange("coverImage", url)}
                                uploadEndpoint="/api/tailor/uploads/shop-image?variant=cover"
                                chooseFileLabel={t("upload.chooseFile")}
                                uploadingLabel={t("upload.uploading")}
                                uploadFailedLabel={t("upload.failed")}
                                removeLabel={t("upload.remove")}
                            />
                        </FormField>
                    </div>
                </section>

                <section className="space-y-5">
                    <h2 className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black">
                        {t("sections.contact")}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <FormField label={t("fields.city")} name="city">
                            <input
                                id="city"
                                type="text"
                                value={formData.city}
                                onChange={(e) => handleChange("city", e.target.value)}
                                placeholder={t("placeholders.city")}
                                className={INPUT_CLASS}
                            />
                        </FormField>

                        <FormField label={t("fields.location")} name="location">
                            <input
                                id="location"
                                type="text"
                                value={formData.location}
                                onChange={(e) => handleChange("location", e.target.value)}
                                placeholder={t("placeholders.location")}
                                className={INPUT_CLASS}
                            />
                        </FormField>
                    </div>

                    <FormField
                        label={t("fields.phone")}
                        name="phone"
                        required
                        error={fieldErrors.phone}
                    >
                        <input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => handleChange("phone", e.target.value)}
                            placeholder={t("placeholders.phone")}
                            className={INPUT_CLASS}
                        />
                    </FormField>
                </section>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="px-8 py-3 bg-black text-white text-[10px] tracking-[0.22em] uppercase hover:bg-[#2A2A28] transition disabled:opacity-50 [font-family:var(--font-ui)]"
                    >
                        {submitting
                            ? t("saving")
                            : isCreateMode
                              ? t("createCta")
                              : t("saveCta")}
                    </button>
                    <Link
                        href="/tailor"
                        className="text-center px-8 py-3 border border-black text-black text-[10px] tracking-[0.22em] uppercase hover:bg-black hover:text-white transition [font-family:var(--font-ui)]"
                    >
                        {t("backToDashboard")}
                    </Link>
                </div>
            </form>
        </div>
    );
}
