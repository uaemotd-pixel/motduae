"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { Link, useRouter } from "@/i18n/navigation";
import FormField from "@/components/admin/FormField";
import ImageUpload from "@/components/admin/ImageUpload";
import NumericInput from "@/components/tailor/NumericInput";
import { getApiErrorMessage, type ApiError } from "@/lib/api/client";
import { ERROR_TOAST, SUCCESS_TOAST } from "@/lib/tailorPortalToast";
import {
  DESIGN_CATEGORIES,
  SLUG_PATTERN,
  createTailorDesign,
  designToForm,
  emptyTailorDesignForm,
  fetchTailorDesign,
  isShopMissingError,
  slugifyDesignName,
  updateTailorDesign,
  type TailorDesignFormData,
} from "@/lib/tailorDesigns";

// Styling aligned with CreateReadyMadeForm
const INPUT_CLASS =
  "w-full py-1 border-b border-gray-300 focus:border-black outline-none bg-transparent";
const TEXTAREA_CLASS =
  "w-full py-1 border-b border-gray-300 focus:border-black outline-none bg-transparent resize-none overflow-hidden";

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
  const [slugTouched, setSlugTouched] = useState(false);
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
    if (!designId) return;

    let cancelled = false;

    const loadDesign = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const design = await fetchTailorDesign(designId);
        if (cancelled) return;
        setFormData(designToForm(design));
        setSlugTouched(true);
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

      if (
        field === "name" &&
        !isEditMode &&
        !slugTouched &&
        typeof value === "string"
      ) {
        next.slug = slugifyDesignName(value);
      }

      return next;
    });

    if (field === "slug") setSlugTouched(true);

    if (fieldErrors[field as string]) {
      setFieldErrors((prev) => ({ ...prev, [field as string]: undefined }));
    }
  };

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
    if (!formData.slug.trim()) {
      errors.slug = t("validation.slugRequired");
    } else if (!SLUG_PATTERN.test(formData.slug.trim().toLowerCase())) {
      errors.slug = t("validation.slugInvalid");
    }
    if (!formData.images.some((image) => image.trim())) {
      errors.images = t("validation.imagesRequired");
    }

    if (
      formData.ageMin < 0 ||
      formData.ageMax > 150 ||
      formData.ageMin > formData.ageMax
    ) {
      errors.ageRange = t("validation.ageRangeInvalid");
    }

    if (!Number.isFinite(formData.basePrice) || formData.basePrice < 0) {
      errors.basePrice = t("validation.basePriceInvalid");
    }
    if (!Number.isFinite(formData.tailoringFee) || formData.tailoringFee < 0) {
      errors.tailoringFee = t("validation.tailoringFeeInvalid");
    }
    if (
      !Number.isFinite(formData.estimatedMeters) ||
      formData.estimatedMeters <= 0
    ) {
      errors.estimatedMeters = t("validation.estimatedMetersInvalid");
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
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="mb-8">
        <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.28em] text-(--color-grey-muted) mb-3">
          {t("eyebrow")}
        </p>
        <h1 className="[font-family:var(--font-display)] text-[32px] sm:text-[36px] text-black mb-3">
          {isEditMode ? t("editTitle") : t("createTitle")}
        </h1>
        <p className="[font-family:var(--font-body)] text-[14px] text-(--color-grey-muted)">
          {isEditMode ? t("editDescription") : t("createDescription")}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-8"
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
              className={INPUT_CLASS}
            />
          </FormField>

          <div className="grid grid-cols-3 gap-5">
            <FormField label={t("fields.category")} name="category" required>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => handleChange("category", e.target.value)}
                className={INPUT_CLASS}
              >
                {DESIGN_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {t(`categories.${category}`)}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Min Age" name="ageMin" required>
              <input
                id="ageMin"
                type="number"
                min={0}
                max={120}
                value={formData.ageMin}
                onChange={(e) =>
                  handleChange("ageMin", parseInt(e.target.value) || 0)
                }
                className={INPUT_CLASS}
              />
            </FormField>

            <FormField label="Max Age" name="ageMax" required>
              <input
                id="ageMax"
                type="number"
                min={0}
                max={120}
                value={formData.ageMax}
                onChange={(e) =>
                  handleChange("ageMax", parseInt(e.target.value) || 0)
                }
                className={INPUT_CLASS}
              />
            </FormField>
          </div>
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
              className={TEXTAREA_CLASS}
              rows={2}
            />
          </FormField>

          <FormField label={t("fields.descriptionAr")} name="descriptionAr">
            <textarea
              id="descriptionAr"
              value={formData.descriptionAr}
              onChange={(e) => handleChange("descriptionAr", e.target.value)}
              dir="rtl"
              className={TEXTAREA_CLASS}
              rows={2}
            />
          </FormField>
        </section>

        <section className="space-y-5">
          <h2 className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black">
            {t("sections.pricing")}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField
              label={t("fields.basePrice")}
              name="basePrice"
              required
              error={fieldErrors.basePrice}
            >
              <NumericInput
                id="basePrice"
                min={0}
                step={1}
                value={formData.basePrice}
                onChange={(value) => handleChange("basePrice", value)}
                className={INPUT_CLASS}
              />
            </FormField>

            <FormField
              label={t("fields.tailoringFee")}
              name="tailoringFee"
              required
              error={fieldErrors.tailoringFee}
            >
              <NumericInput
                id="tailoringFee"
                min={0}
                step={1}
                value={formData.tailoringFee}
                onChange={(value) => handleChange("tailoringFee", value)}
                className={INPUT_CLASS}
              />
            </FormField>

            <FormField
              label={t("fields.estimatedMeters")}
              name="estimatedMeters"
              required
              error={fieldErrors.estimatedMeters}
            >
              <input
                id="estimatedMeters"
                type="number"
                min="0.1"
                step="0.1"
                value={formData.estimatedMeters}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  handleChange("estimatedMeters", isNaN(val) ? 0 : val);
                }}
                className={INPUT_CLASS}
              />
            </FormField>

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
                value={formData.estimatedDays}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  handleChange("estimatedDays", isNaN(val) ? 0 : val);
                }}
                className={INPUT_CLASS}
              />
            </FormField>
          </div>
        </section>

        <section className="space-y-5">
          <h2 className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black">
            {t("sections.images")}
          </h2>

          {fieldErrors.images && (
            <p className="text-xs text-red-500">{fieldErrors.images}</p>
          )}

          <div className="space-y-4">
            {formData.images.map((image, index) => (
              <div key={index} className="border border-(--color-border) p-4">
                <FormField
                  label={t("fields.image", { number: index + 1 })}
                  name={`image-${index}`}
                >
                  <ImageUpload
                    value={image}
                    onChange={(url) => handleImageChange(index, url)}
                    uploadEndpoint="/api/tailor/uploads/design-image"
                    chooseFileLabel={t("upload.chooseFile")}
                    uploadingLabel={t("upload.uploading")}
                    uploadFailedLabel={t("upload.failed")}
                    removeLabel={t("upload.remove")}
                  />
                </FormField>
              </div>
            ))}
          </div>

          {formData.images.length < 5 && (
            <button
              type="button"
              onClick={addImageField}
              className="text-[10px] uppercase tracking-[0.2em] text-black border-b border-black pb-0.5 [font-family:var(--font-ui)]"
            >
              {t("addImage")}
            </button>
          )}
        </section>

        <section>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => handleChange("isActive", e.target.checked)}
              className="w-4 h-4 accent-black"
            />
            <span className="[font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.18em] text-black">
              {t("fields.isActive")}
            </span>
          </label>
        </section>

        <div
          ref={formActionsRef}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2"
        >
          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-3 bg-black text-white text-[10px] tracking-[0.22em] uppercase hover:bg-[#2A2A28] transition disabled:opacity-50 [font-family:var(--font-ui)]"
          >
            {submitting
              ? t("saving")
              : isEditMode
                ? t("saveCta")
                : t("createCta")}
          </button>
          <Link
            href="/tailor/designs"
            className="text-center px-8 py-3 border border-black text-black text-[10px] tracking-[0.22em] uppercase hover:bg-black hover:text-white transition [font-family:var(--font-ui)]"
          >
            {t("cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
}
