// app/[locale]/fabric/shop/page.tsx
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import FormField from "@/components/admin/FormField";
import ImageUpload from "@/components/admin/ImageUpload";
import AnimatedDropdown from "@/components/shared/AnimatedDropdown";
import SocialPlatformIcon from "@/components/shared/SocialPlatformIcon";
import { getApiErrorMessage, type ApiError } from "@/lib/api/client";
import { UAE_EMIRATES, getEmirateEn, getEmirateAr } from "@/lib/uaeAddress";
import {
  createFabricShop,
  emptyFabricShopForm,
  fetchOwnFabricShop,
  slugifyShopName,
  fabricShopToForm,
  updateFabricShop,
  SOCIAL_MAX,
  SOCIAL_PLATFORMS,
  getSocialPlatform,
  isKnownSocialPlatform,
  isOtherSocialPlatform,
  isValidHttpUrl,
  isValidSocialPlatformUrl,
  normalizeHttpUrl,
  type FabricShopFormData,
  type FabricShopProfile,
  type FabricShopSocialLink,
  type ShopPickupAddress,
} from "@/lib/fabricShop";
import { resolveMediaUrl } from "@/lib/media";
import { formatPartnerExperience } from "@/lib/partnerExperience";
import { PartnerRequestNumber } from "@/components/partner/PartnerGateScreen";
import { OFFERINGS } from "@/lib/partnerApplication";
import {
  isValidUaePhone,
  normalizeUaePhone,
  extractDigits,
} from "@/lib/uaePhone";

const INPUT_CLASS =
  "w-full border border-(--color-border) bg-white px-4 py-3 text-[14px] [font-family:var(--font-body)] text-black focus:border-black focus:outline-none";
const TEXTAREA_CLASS = `${INPUT_CLASS} min-h-[120px] resize-y`;
const READONLY_INPUT_CLASS = `${INPUT_CLASS} cursor-not-allowed bg-gray-50 text-(--color-grey-muted)`;

const APPLICATION_FORM_KEYS = [
  "licenceNumber",
  "licenceFileUrl",
  "experience",
  "yearsOperating",
  "offering",
  "partnerNote",
  "requestNumber",
] as const;

type FieldKey =
  | keyof Omit<
      FabricShopFormData,
      "pickupAddress" | "social" | (typeof APPLICATION_FORM_KEYS)[number]
    >
  | `pickupAddress.${keyof ShopPickupAddress}`
  | `social.${number}.name`
  | `social.${number}.url`;

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

export default function FabricShopForm() {
  const t = useTranslations("FabricPortal.shop");
  const tApply = useTranslations("PartnerApply");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<FieldKey, string>>
  >({});
  const [formData, setFormData] = useState<FabricShopFormData>(
    emptyFabricShopForm(),
  );
  const [shop, setShop] = useState<FabricShopProfile | null>(null);
  const [emirateOpen, setEmirateOpen] = useState(false);
  const [socialPlatformOpenIndex, setSocialPlatformOpenIndex] = useState<
    number | null
  >(null);
  const [otherSocialRows, setOtherSocialRows] = useState<Set<number>>(
    () => new Set(),
  );

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
          const form = fabricShopToForm(existingShop);
          if (form.phone) {
            form.phone = normalizeUaePhone(form.phone);
          }
          setFormData(form);
          setOtherSocialRows(
            new Set(
              form.social
                .map((row, i) =>
                  row.name.trim() && !isKnownSocialPlatform(row.name) ? i : -1,
                )
                .filter((i) => i >= 0),
            ),
          );
        } else {
          setShop(null);
          setFormData(emptyFabricShopForm());
          setOtherSocialRows(new Set());
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

  const handleChange = (
    field: keyof Omit<
      FabricShopFormData,
      "pickupAddress" | "social" | (typeof APPLICATION_FORM_KEYS)[number]
    >,
    value: string,
  ) => {
    let val = value;
    if (field === "phone") {
      const digits = extractDigits(value);
      if (digits.length <= 9) {
        val = digits;
      } else {
        return;
      }
    }

    setFormData((prev) => {
      const next = { ...prev, [field]: val };

      if (field === "name") {
        next.slug = slugifyShopName(val);
      }

      return next;
    });

    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handlePickupChange = (field: keyof ShopPickupAddress, value: string) => {
    let nextValue = value;
    if (field === "phone") {
      let digits = extractDigits(value);
      if (digits.startsWith("971")) {
        digits = digits.slice(3);
      }
      nextValue = digits.slice(0, 9);
    }

    setFormData((prev) => ({
      ...prev,
      pickupAddress: {
        ...prev.pickupAddress,
        [field]: nextValue,
      },
    }));

    const key = `pickupAddress.${field}` as FieldKey;
    if (fieldErrors[key]) {
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const handleSocialChange = (
    index: number,
    field: keyof FabricShopSocialLink,
    value: string,
  ) => {
    setFormData((prev) => {
      const next = [...prev.social];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, social: next };
    });

    const nameKey = `social.${index}.name` as FieldKey;
    const urlKey = `social.${index}.url` as FieldKey;
    if (fieldErrors[nameKey] || fieldErrors[urlKey]) {
      setFieldErrors((prev) => ({
        ...prev,
        [nameKey]: undefined,
        [urlKey]: undefined,
      }));
    }
  };

  const addSocialLink = () => {
    setFormData((prev) => {
      if (prev.social.length >= SOCIAL_MAX) return prev;
      const used = new Set(
        prev.social.map((row) => row.name.trim().toLowerCase()).filter(Boolean),
      );
      const nextPlatform =
        SOCIAL_PLATFORMS.find((p) => !used.has(p.value.toLowerCase()))?.value ||
        "";
      return {
        ...prev,
        social: [...prev.social, { name: nextPlatform, url: "" }],
      };
    });
  };

  const removeSocialLink = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      social: prev.social.filter((_, i) => i !== index),
    }));
    setOtherSocialRows((prev) => {
      const next = new Set<number>();
      prev.forEach((i) => {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      });
      return next;
    });
    if (socialPlatformOpenIndex === index) {
      setSocialPlatformOpenIndex(null);
    } else if (
      socialPlatformOpenIndex !== null &&
      socialPlatformOpenIndex > index
    ) {
      setSocialPlatformOpenIndex(socialPlatformOpenIndex - 1);
    }
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[`social.${index}.name` as FieldKey];
      delete next[`social.${index}.url` as FieldKey];
      return next;
    });
  };

  const validate = (): boolean => {
    const errors: Partial<Record<FieldKey, string>> = {};
    const payload = formData;

    if (!payload.name.trim()) errors.name = t("validation.nameRequired");
    if (!payload.nameAr.trim()) errors.nameAr = t("validation.nameArRequired");
    if (!payload.phone.trim()) {
      errors.phone = t("validation.phoneRequired");
    } else {
      const normalizedPhone = normalizeUaePhone(payload.phone.trim());
      if (!isValidUaePhone(normalizedPhone)) {
        errors.phone = t("validation.phoneInvalid");
      }
    }

    if (payload.website.trim() && !isValidHttpUrl(payload.website)) {
      errors.website = t("validation.websiteInvalid");
    }

    const usedPlatforms = new Set<string>();
    payload.social.forEach((row, index) => {
      const name = row.name.trim();
      const url = row.url.trim();
      const nameKey = `social.${index}.name` as FieldKey;
      const urlKey = `social.${index}.url` as FieldKey;
      const isOtherRow =
        otherSocialRows.has(index) ||
        isOtherSocialPlatform(name) ||
        name.toLowerCase() === "other";

      if (!name && !url && !otherSocialRows.has(index)) return;

      if (isOtherRow) {
        if (!name || name.toLowerCase() === "other") {
          errors[nameKey] = t("validation.socialOtherNameRequired");
        } else {
          const key = name.toLowerCase();
          if (usedPlatforms.has(key)) {
            errors[nameKey] = t("validation.socialPlatformDuplicate");
          } else {
            usedPlatforms.add(key);
          }
        }
      } else if (!name) {
        errors[nameKey] = t("validation.socialPlatformRequired");
      } else if (!isKnownSocialPlatform(name)) {
        errors[nameKey] = t("validation.socialPlatformInvalid");
      } else {
        const key = name.toLowerCase();
        if (usedPlatforms.has(key)) {
          errors[nameKey] = t("validation.socialPlatformDuplicate");
        } else {
          usedPlatforms.add(key);
        }
      }

      if (!url) {
        errors[urlKey] = t("validation.socialUrlRequired");
      } else if (!isValidSocialPlatformUrl(name, url)) {
        errors[urlKey] = t("validation.socialUrlInvalid");
      }
    });

    if (!payload.pickupAddress.fullName.trim()) {
      errors["pickupAddress.fullName"] = t("validation.pickupFullNameRequired");
    }
    if (!payload.pickupAddress.phone.trim()) {
      errors["pickupAddress.phone"] = t("validation.pickupPhoneRequired");
    } else if (!/^\d{9}$/.test(payload.pickupAddress.phone.trim())) {
      errors["pickupAddress.phone"] = t("validation.pickupPhoneInvalid");
    }
    if (!payload.pickupAddress.line1.trim()) {
      errors["pickupAddress.line1"] = t("validation.pickupLine1Required");
    }
    if (!payload.pickupAddress.city.trim()) {
      errors["pickupAddress.city"] = t("validation.pickupCityRequired");
    }
    if (!payload.pickupAddress.emirate.trim()) {
      errors["pickupAddress.emirate"] = t("validation.pickupEmirateRequired");
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const getPhoneDisplayValue = (phone: string): string => {
    if (!phone) return "";
    const digits = extractDigits(phone);
    if (digits.startsWith("971")) {
      return digits.slice(3);
    }
    return digits.slice(0, 9);
  };

  const handleImageChange = async (
    field: "logo" | "coverImage",
    url: string,
  ) => {
    const nextForm = { ...formData, [field]: url };
    setFormData(nextForm);
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    if (!shop) return;

    setSubmitting(true);

    try {
      const payload = {
        ...nextForm,
        phone: normalizeUaePhone(nextForm.phone),
      };
      const savedShop = await updateFabricShop(payload);
      setShop(savedShop);
      const form = fabricShopToForm(savedShop);
      if (form.phone) {
        form.phone = normalizeUaePhone(form.phone);
      }
      setFormData(form);
      toast.success(
        url.trim() ? t("imageSaved") : t("imageRemoved"),
        SUCCESS_TOAST,
      );
    } catch (err: unknown) {
      toast.error(
        getApiErrorMessage(err, t("errors.updateFailed")),
        ERROR_TOAST,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        phone: normalizeUaePhone(formData.phone),
      };

      const savedShop = isCreateMode
        ? await createFabricShop(payload)
        : await updateFabricShop(payload);

      setShop(savedShop);
      const form = fabricShopToForm(savedShop);
      if (form.phone) {
        form.phone = normalizeUaePhone(form.phone);
      }
      setFormData(form);
      setOtherSocialRows(
        new Set(
          form.social
            .map((row, i) =>
              row.name.trim() && !isKnownSocialPlatform(row.name) ? i : -1,
            )
            .filter((i) => i >= 0),
        ),
      );
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
              isCreateMode
                ? t("errors.createFailed")
                : t("errors.updateFailed"),
            );
      toast.error(message, ERROR_TOAST);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-5xl border border-(--color-border) bg-white p-8">
        <p className="[font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em] text-(--color-grey-muted)">
          {t("loading")}
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="w-full max-w-5xl border border-red-200 bg-red-50 p-8">
        <p className="[font-family:var(--font-body)] text-[14px] text-red-700">
          {loadError}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl">
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
        <PartnerRequestNumber
          label={t("requestNumberLabel")}
          value={formData.requestNumber}
          emptyFallback="—"
          className="mt-4 mb-0"
        />
        {!isCreateMode && shop?.slug && (
          <Link
            href={`/brands/${shop.slug}`}
            className="inline-block mt-4 [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-black underline underline-offset-4 hover:text-(--color-grey-muted) transition"
          >
            {t("viewPublicProfile")}
          </Link>
        )}
      </div>

      {!isCreateMode && shop && (
        <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
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
        className="border border-(--color-border) bg-white p-4 sm:p-8 space-y-6 sm:space-y-8"
      >
        <section className="space-y-5">
          <h2 className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black">
            {t("sections.identity")}
          </h2>

          <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-5">
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
            {t("sections.media")}
          </h2>

          <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-5">
            <FormField
              label={t("fields.logo")}
              name="logo"
              hint={t("hints.logoUpload")}
            >
              <ImageUpload
                value={formData.logo}
                onChange={(url) => handleImageChange("logo", url)}
                uploadEndpoint="/api/fabric/uploads/shop-image?variant=logo"
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
                uploadEndpoint="/api/fabric/uploads/shop-image?variant=cover"
                chooseFileLabel={t("upload.chooseFile")}
                uploadingLabel={t("upload.uploading")}
                uploadFailedLabel={t("upload.failed")}
                removeLabel={t("upload.remove")}
              />
            </FormField>
          </div>
        </section>

        <hr className="border-(--color-border)" />

        <section className="space-y-5">
          <h2 className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black">
            {t("sections.contact")}
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-4 sm:gap-5">
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
                  value={getPhoneDisplayValue(formData.phone)}
                  onChange={(e) => {
                    handleChange("phone", e.target.value);
                  }}
                  placeholder="123456777"
                  className="w-full py-1 pl-3 bg-transparent text-[14px] focus:outline-none"
                  type="tel"
                  inputMode="numeric"
                  maxLength={9}
                  required
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Enter 9 digits after +971
              </p>
            </FormField>
          </div>
        </section>

        <hr className="border-(--color-border)" />

        <section className="space-y-5">
          <h2 className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black">
            {t("sections.online")}
          </h2>

          <FormField
            label={t("fields.website")}
            name="website"
            error={fieldErrors.website}
          >
            <input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => handleChange("website", e.target.value)}
              onBlur={(e) => {
                const value = e.target.value.trim();
                if (value && isValidHttpUrl(value)) {
                  handleChange("website", normalizeHttpUrl(value));
                }
              }}
              placeholder={t("placeholders.website")}
              className={INPUT_CLASS}
            />
          </FormField>

          <div className="space-y-4">
            {formData.social.map((row, index) => {
              const knownPlatform = isKnownSocialPlatform(row.name)
                ? getSocialPlatform(row.name)
                : null;
              const isOtherRow =
                otherSocialRows.has(index) ||
                (!!row.name.trim() && !knownPlatform);
              const selectedPlatform = isOtherRow
                ? getSocialPlatform("Other")
                : knownPlatform;
              const usedPlatforms = new Set(
                formData.social
                  .map((item, i) => {
                    if (i === index) return "";
                    if (!isKnownSocialPlatform(item.name)) return "";
                    return item.name.trim().toLowerCase();
                  })
                  .filter(Boolean),
              );

              return (
                <div
                  key={`social-${index}`}
                  className="flex items-start gap-2 sm:gap-3"
                >
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <FormField
                        label={t("fields.socialName")}
                        name={`social-name-${index}`}
                        error={
                          isOtherRow
                            ? undefined
                            : fieldErrors[`social.${index}.name` as FieldKey]
                        }
                      >
                        <AnimatedDropdown
                          isOpen={socialPlatformOpenIndex === index}
                          onClose={() => setSocialPlatformOpenIndex(null)}
                          position="bottom-left"
                          className="w-full"
                          dropdownClassName="w-full left-0 right-0 bg-white border border-(--color-border) shadow-lg max-h-60 overflow-y-auto"
                          trigger={
                            <button
                              type="button"
                              id={`social-name-${index}`}
                              aria-haspopup="listbox"
                              aria-expanded={socialPlatformOpenIndex === index}
                              onClick={() =>
                                setSocialPlatformOpenIndex((prev) =>
                                  prev === index ? null : index,
                                )
                              }
                              className={`${INPUT_CLASS} flex items-center justify-between gap-3 hover:cursor-pointer`}
                            >
                              <span className="flex min-w-0 items-center gap-3">
                                {selectedPlatform ? (
                                  <>
                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-(--color-border) text-black">
                                      <SocialPlatformIcon
                                        platform={selectedPlatform.value}
                                        className="w-3.5 h-3.5 fill-current"
                                      />
                                    </span>
                                    <span className="truncate text-black">
                                      {selectedPlatform.value === "Other"
                                        ? t("platforms.other")
                                        : selectedPlatform.value}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-gray-400">
                                    {t("placeholders.selectPlatform")}
                                  </span>
                                )}
                              </span>
                              <span className="shrink-0 text-gray-400">▾</span>
                            </button>
                          }
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setOtherSocialRows((prev) => {
                                const next = new Set(prev);
                                next.delete(index);
                                return next;
                              });
                              handleSocialChange(index, "name", "");
                              setSocialPlatformOpenIndex(null);
                            }}
                            className="w-full px-4 py-2.5 text-left text-[13px] text-gray-400 hover:bg-gray-50 hover:cursor-pointer [font-family:var(--font-body)]"
                          >
                            {t("placeholders.selectPlatform")}
                          </button>
                          {SOCIAL_PLATFORMS.map((platform) => {
                            const isUsed =
                              platform.value !== "Other" &&
                              usedPlatforms.has(platform.value.toLowerCase());
                            const isSelected =
                              selectedPlatform?.value === platform.value;

                            return (
                              <button
                                key={platform.value}
                                type="button"
                                disabled={isUsed}
                                onClick={() => {
                                  if (isUsed) return;
                                  if (platform.value === "Other") {
                                    setOtherSocialRows((prev) =>
                                      new Set(prev).add(index),
                                    );
                                    handleSocialChange(index, "name", "");
                                  } else {
                                    setOtherSocialRows((prev) => {
                                      const next = new Set(prev);
                                      next.delete(index);
                                      return next;
                                    });
                                    handleSocialChange(
                                      index,
                                      "name",
                                      platform.value,
                                    );
                                  }
                                  setSocialPlatformOpenIndex(null);
                                }}
                                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] [font-family:var(--font-body)] ${
                                  isUsed
                                    ? "cursor-not-allowed text-gray-300"
                                    : "hover:bg-gray-50 hover:cursor-pointer text-black"
                                } ${isSelected ? "bg-gray-50" : ""}`}
                              >
                                <span
                                  className={`flex size-8 shrink-0 items-center justify-center rounded-full border ${
                                    isUsed
                                      ? "border-gray-200 text-gray-300"
                                      : "border-(--color-border) text-black"
                                  }`}
                                >
                                  <SocialPlatformIcon
                                    platform={platform.value}
                                    className="w-3.5 h-3.5 fill-current"
                                  />
                                </span>
                                <span>
                                  {platform.value === "Other"
                                    ? t("platforms.other")
                                    : platform.value}
                                </span>
                              </button>
                            );
                          })}
                        </AnimatedDropdown>
                      </FormField>
                      {isOtherRow ? (
                        <FormField
                          label={t("fields.socialCustomName")}
                          name={`social-custom-name-${index}`}
                          required
                          error={
                            fieldErrors[`social.${index}.name` as FieldKey]
                          }
                        >
                          <input
                            id={`social-custom-name-${index}`}
                            type="text"
                            value={
                              row.name.trim().toLowerCase() === "other"
                                ? ""
                                : row.name
                            }
                            onChange={(e) =>
                              handleSocialChange(index, "name", e.target.value)
                            }
                            placeholder={t("placeholders.socialCustomName")}
                            className={INPUT_CLASS}
                          />
                        </FormField>
                      ) : (
                        <FormField
                          label={t("fields.socialUrl")}
                          name={`social-url-${index}`}
                          error={
                            fieldErrors[`social.${index}.url` as FieldKey]
                          }
                        >
                          <input
                            id={`social-url-${index}`}
                            type="url"
                            value={row.url}
                            onChange={(e) =>
                              handleSocialChange(index, "url", e.target.value)
                            }
                            onBlur={(e) => {
                              const value = e.target.value.trim();
                              if (value && isValidHttpUrl(value)) {
                                handleSocialChange(
                                  index,
                                  "url",
                                  normalizeHttpUrl(value),
                                );
                              }
                            }}
                            placeholder={
                              selectedPlatform?.placeholder ||
                              t("placeholders.website")
                            }
                            className={INPUT_CLASS}
                          />
                        </FormField>
                      )}
                    </div>

                    {isOtherRow ? (
                      <FormField
                        label={t("fields.socialUrl")}
                        name={`social-url-${index}`}
                        required
                        error={fieldErrors[`social.${index}.url` as FieldKey]}
                      >
                        <input
                          id={`social-url-${index}`}
                          type="url"
                          value={row.url}
                          onChange={(e) =>
                            handleSocialChange(index, "url", e.target.value)
                          }
                          onBlur={(e) => {
                            const value = e.target.value.trim();
                            if (value && isValidHttpUrl(value)) {
                              handleSocialChange(
                                index,
                                "url",
                                normalizeHttpUrl(value),
                              );
                            }
                          }}
                          placeholder={t("placeholders.website")}
                          className={INPUT_CLASS}
                        />
                      </FormField>
                    ) : null}
                  </div>
                  <div className="shrink-0 space-y-1.5 sm:space-y-2">
                    <span
                      className="block text-[11px] md:text-[12px] uppercase tracking-[0.2em] invisible select-none"
                      aria-hidden
                    >
                      &nbsp;
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSocialLink(index)}
                      className="flex h-11.5 w-11 items-center justify-center text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 hover:cursor-pointer"
                      aria-label={t("removeSocial")}
                      title={t("removeSocial")}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              );
            })}

            {formData.social.length < SOCIAL_MAX ? (
              <button
                type="button"
                onClick={addSocialLink}
                className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.18em] text-black underline underline-offset-4 hover:text-(--color-grey-muted)"
              >
                {t("addSocial")}
              </button>
            ) : null}
          </div>
        </section>

        <>
          <hr className="border-(--color-border)" />
          <section className="space-y-5">
            <h2 className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black">
              {t("sections.operations")}
            </h2>
            <p className="[font-family:var(--font-body)] text-[13px] text-(--color-grey-muted)">
              {t("hints.applicationReadonly")}
            </p>

            <FormField label={t("fields.experience")} name="experience">
              <input
                id="experience"
                type="text"
                value={
                  formData.experience
                    ? formatPartnerExperience(formData.experience, {
                        year: t("experience.year"),
                        years: t("experience.years"),
                        month: t("experience.month"),
                        months: t("experience.months"),
                      })
                    : "—"
                }
                readOnly
                disabled
                className={READONLY_INPUT_CLASS}
              />
            </FormField>

            <FormField label={t("fields.offering")} name="offering">
              <input
                id="offering"
                type="text"
                value={
                  (OFFERINGS as readonly string[]).includes(formData.offering)
                    ? tApply(
                        `offering.${formData.offering as (typeof OFFERINGS)[number]}`,
                      )
                    : formData.offering || "—"
                }
                readOnly
                disabled
                className={READONLY_INPUT_CLASS}
              />
            </FormField>
          </section>
        </>

        <>
          <hr className="border-(--color-border)" />
          <section className="space-y-5">
            <h2 className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black">
              {t("sections.licence")}
            </h2>
            <p className="[font-family:var(--font-body)] text-[13px] text-(--color-grey-muted)">
              {t("hints.licenceReadonly")}
            </p>

            <FormField label={t("fields.licenceNumber")} name="licenceNumber">
              <input
                id="licenceNumber"
                type="text"
                value={formData.licenceNumber || "—"}
                readOnly
                disabled
                className={READONLY_INPUT_CLASS}
              />
            </FormField>

            <FormField label={t("fields.licenceFile")} name="licenceFile">
              {formData.licenceFileUrl ? (
                <a
                  href={resolveMediaUrl(formData.licenceFileUrl) || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex [font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.16em] text-black underline underline-offset-4 hover:text-(--color-grey-muted)"
                >
                  {t("viewLicenceFile")}
                </a>
              ) : (
                <p className="[font-family:var(--font-body)] text-[13px] text-(--color-grey-muted)">
                  {t("noLicenceFile")}
                </p>
              )}
            </FormField>
          </section>
        </>

        <>
          <hr className="border-(--color-border)" />
          <section className="space-y-5">
            <h2 className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black">
              {t("sections.comments")}
            </h2>
            <p className="[font-family:var(--font-body)] text-[13px] text-(--color-grey-muted)">
              {t("hints.applicationReadonly")}
            </p>
            <FormField label={t("fields.partnerNote")} name="partnerNote">
              <textarea
                id="partnerNote"
                value={formData.partnerNote || "—"}
                readOnly
                disabled
                rows={4}
                className={`${TEXTAREA_CLASS} cursor-not-allowed bg-gray-50 text-(--color-grey-muted)`}
              />
            </FormField>
          </section>
        </>

        <hr className="border-(--color-border)" />

        <section className="space-y-5">
          <h2 className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black">
            {t("sections.pickupAddress")}
          </h2>
          <p className="[font-family:var(--font-body)] text-[13px] text-(--color-grey-muted)">
            {t("hints.pickupAddress")}
          </p>

          <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-5">
            <FormField
              label={t("fields.pickupFullName")}
              name="pickupFullName"
              required
              error={fieldErrors["pickupAddress.fullName"]}
            >
              <input
                id="pickupFullName"
                type="text"
                value={formData.pickupAddress.fullName || ""}
                onChange={(e) => handlePickupChange("fullName", e.target.value)}
                placeholder={t("placeholders.pickupFullName")}
                className={INPUT_CLASS}
              />
            </FormField>

            <FormField
              label={t("fields.pickupPhone")}
              name="pickupPhone"
              required
              error={fieldErrors["pickupAddress.phone"]}
            >
              <div className="flex items-center border border-(--color-border) bg-transparent focus-within:border-black rounded-sm">
                <span className="inline-flex items-center px-4 bg-neutral-50 text-neutral-400 text-xs [font-family:var(--font-ui)] select-none border-r border-(--color-border) py-1.5">
                  +971
                </span>
                <input
                  id="pickupPhone"
                  type="tel"
                  inputMode="numeric"
                  value={formData.pickupAddress.phone}
                  onChange={(e) => handlePickupChange("phone", e.target.value)}
                  placeholder="501234567"
                  maxLength={9}
                  className="w-full py-1 pl-3 bg-transparent text-[14px] focus:outline-none font-mono"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Enter 9 digits after +971
              </p>
            </FormField>

            <FormField
              label={t("fields.pickupEmirate")}
              name="pickupEmirate"
              required
              error={fieldErrors["pickupAddress.emirate"]}
            >
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setEmirateOpen((prev) => !prev)}
                  className={`${INPUT_CLASS} flex items-center justify-between hover:cursor-pointer`}
                >
                  <span
                    className={
                      formData.pickupAddress.emirate
                        ? "text-black"
                        : "text-gray-400"
                    }
                  >
                    {formData.pickupAddress.emirate
                      ? `${getEmirateEn(formData.pickupAddress.emirate)} / ${getEmirateAr(formData.pickupAddress.emirate)}`
                      : t("placeholders.selectEmirate")}
                  </span>
                  <span className="text-gray-400">▾</span>
                </button>
                {emirateOpen && (
                  <div className="absolute left-0 right-0 z-50 mt-1 bg-white border border-(--color-border) shadow-lg max-h-60 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        handlePickupChange("emirate", "");
                        setEmirateOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-[13px] hover:bg-gray-50 hover:cursor-pointer text-gray-400 [font-family:var(--font-body)]"
                    >
                      {t("placeholders.selectEmirate")}
                    </button>
                    {UAE_EMIRATES.map((emirate) => (
                      <button
                        key={emirate.value}
                        type="button"
                        onClick={() => {
                          handlePickupChange("emirate", emirate.value);
                          setEmirateOpen(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-[13px] hover:bg-gray-50 hover:cursor-pointer flex items-center gap-2 [font-family:var(--font-body)]"
                      >
                        <span>{emirate.en}</span>
                        <span className="text-gray-400 shrink-0">/</span>
                        <span>{emirate.ar}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </FormField>

            <FormField
              label={t("fields.pickupCity")}
              name="pickupCity"
              required
              error={fieldErrors["pickupAddress.city"]}
            >
              <input
                id="pickupCity"
                type="text"
                value={formData.pickupAddress.city}
                onChange={(e) => handlePickupChange("city", e.target.value)}
                placeholder={t("placeholders.pickupCity")}
                className={INPUT_CLASS}
              />
            </FormField>

            <FormField
              label={t("fields.pickupLine1")}
              name="pickupLine1"
              required
              error={fieldErrors["pickupAddress.line1"]}
            >
              <input
                id="pickupLine1"
                type="text"
                value={formData.pickupAddress.line1}
                onChange={(e) => handlePickupChange("line1", e.target.value)}
                placeholder={t("placeholders.pickupLine1")}
                className={INPUT_CLASS}
              />
            </FormField>

            <FormField
              label={t("fields.pickupLine2")}
              name="pickupLine2"
              error={fieldErrors["pickupAddress.line2"]}
            >
              <input
                id="pickupLine2"
                type="text"
                value={formData.pickupAddress.line2}
                onChange={(e) => handlePickupChange("line2", e.target.value)}
                placeholder={t("placeholders.pickupLine2")}
                className={INPUT_CLASS}
              />
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
            {submitting
              ? t("saving")
              : isCreateMode
                ? t("createCta")
                : t("saveCta")}
          </button>
        </div>
      </form>
    </div>
  );
}
