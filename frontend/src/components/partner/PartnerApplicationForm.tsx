"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";
import FormField from "@/components/admin/FormField";
import PartnerFileUpload from "@/components/partner/PartnerFileUpload";
import AnimatedDropdown from "@/components/shared/AnimatedDropdown";
import SocialPlatformIcon from "@/components/shared/SocialPlatformIcon";
import { useAuth, needsEmailVerification } from "@/context/AuthContext";
import { api, getApiErrorMessage, type ApiError } from "@/lib/api/client";
import {
  buildVerifyEmailHref,
  getApiErrorCode,
} from "@/lib/auth/emailVerification";
import { extractDigits, normalizeUaePhone } from "@/lib/uaePhone";
import {
  MAKE_TIMES,
  OFFERINGS,
  SOCIAL_MAX,
  WORK_SETUPS,
  YEARS_OPERATING,
  collectRequiredFieldErrors,
  emptyPartnerApplication,
  fetchPartnerApplication,
  patchPartnerApplication,
  submitPartnerApplication,
  type PartnerApplication,
  type PartnerRole,
  type PartnerSocialLink,
} from "@/lib/partnerApplication";
import {
  SOCIAL_PLATFORMS,
  getSocialPlatform,
  isKnownSocialPlatform,
  isOtherSocialPlatform,
  isValidHttpUrl,
  isValidSocialPlatformUrl,
  normalizeHttpUrl,
  normalizeSocialPlatformName,
} from "@/lib/tailorShop";
import { PartnerRequestNumber } from "@/components/partner/PartnerGateScreen";

const INPUT_CLASS =
  "w-full min-w-0 max-w-full box-border border border-(--color-border) bg-white px-3 sm:px-4 py-2.5 sm:py-3 text-[14px] [font-family:var(--font-body)] text-black focus:border-black focus:outline-none";
const TEXTAREA_CLASS = `${INPUT_CLASS} min-h-[120px] resize-y`;
const SELECT_CLASS = `${INPUT_CLASS} bg-white`;
const ABOUT_MAX = 400;
const PARTNER_NOTE_MAX = 1000;

const TOAST_BASE = {
  duration: 4000,
  style: {
    fontFamily: "var(--font-body)",
    fontSize: "13px",
    letterSpacing: "0.04em",
    borderRadius: "0",
    padding: "14px 18px",
    maxWidth: "360px",
  },
};

type Props = {
  role: PartnerRole;
};

type FieldErrors = Record<string, string>;

function phoneDigits(value: string) {
  let digits = extractDigits(value);
  if (digits.startsWith("971")) digits = digits.slice(3);
  return digits.slice(0, 9);
}

export default function PartnerApplicationForm({ role }: Props) {
  const t = useTranslations("PartnerApply");
  const params = useParams();
  const locale = params.locale === "ar" ? "ar" : "en";
  const { user, applyUserResponse } = useAuth();
  const applyPath = role === "fabric_store" ? "/fabric/apply" : "/tailor/apply";

  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<PartnerApplication>(
    emptyPartnerApplication(role),
  );
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [socialPlatformOpenIndex, setSocialPlatformOpenIndex] = useState<
    number | null
  >(null);
  const [otherSocialRows, setOtherSocialRows] = useState<Set<number>>(
    () => new Set(),
  );

  const requiredErrors = useMemo(
    () => collectRequiredFieldErrors(form, role),
    [form, role],
  );
  const hasOpenOtherRow = useMemo(
    () =>
      [...otherSocialRows].some((index) => {
        const row = form.social[index];
        if (!row) return false;
        const name = row.name.trim();
        return !name || name.toLowerCase() === "other" || !row.url.trim();
      }),
    [form.social, otherSocialRows],
  );
  const fieldsComplete =
    Object.keys(requiredErrors).length === 0 && !hasOpenOtherRow;
  const canSubmit = fieldsComplete && confirmed && !saving && !submitting;

  useEffect(() => {
    let cancelled = false;
    fetchPartnerApplication()
      .then((application) => {
        if (!cancelled && application) {
          setForm(application);
          setOtherSocialRows(
            new Set(
              application.social
                .map((row, i) =>
                  row.name.trim() && !isKnownSocialPlatform(row.name) ? i : -1,
                )
                .filter((i) => i >= 0),
            ),
          );
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(getApiErrorMessage(err, t("loadError")), TOAST_BASE);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    if (loading || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("draft") !== "1") return;
    toast.success(t("draftReadyToSubmit"), TOAST_BASE);
    params.delete("draft");
    const query = params.toString();
    const next = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", next);
  }, [loading, t]);

  const setField = <K extends keyof PartnerApplication>(
    key: K,
    value: PartnerApplication[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const showRequired = (key: string) => {
    const value = fieldErrors[key];
    if (!value) return undefined;
    if (value === "required") return t("requiredField");
    if (value === "duplicate") return t("validation.socialPlatformDuplicate");
    if (value === "invalid") {
      if (key === "website") return t("validation.websiteInvalid");
      if (key.endsWith(".url")) return t("validation.socialUrlInvalid");
      return t("validation.socialPlatformInvalid");
    }
    return value;
  };

  const clearSocialFieldErrors = (index: number) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[`social.${index}`];
      delete next[`social.${index}.name`];
      delete next[`social.${index}.url`];
      return next;
    });
  };

  const handleSocialChange = (
    index: number,
    field: keyof PartnerSocialLink,
    value: string,
  ) => {
    setForm((prev) => {
      const next = [...prev.social];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, social: next };
    });
    clearSocialFieldErrors(index);
  };

  const addSocialLink = () => {
    setForm((prev) => {
      if (prev.social.length >= SOCIAL_MAX) return prev;
      const used = new Set(
        prev.social.map((row) => row.name.trim().toLowerCase()).filter(Boolean),
      );
      const nextPlatform =
        SOCIAL_PLATFORMS.find(
          (p) =>
            p.value !== "Other" && !used.has(p.value.toLowerCase()),
        )?.value || "";
      return {
        ...prev,
        social: [...prev.social, { name: nextPlatform, url: "" }],
      };
    });
  };

  const removeSocialLink = (index: number) => {
    setForm((prev) => ({
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
    clearSocialFieldErrors(index);
  };

  const payloadFromForm = () => ({
    businessName: form.businessName,
    businessNameAr: form.businessNameAr,
    phone: normalizeUaePhone(form.phone) || form.phone,
    city: form.city,
    location: form.location,
    about: form.about,
    aboutAr: form.aboutAr,
    yearsOperating: form.yearsOperating,
    logoUrl: form.logoUrl.trim() ? undefined : "",
    website: form.website.trim()
      ? normalizeHttpUrl(form.website.trim())
      : "",
    social: form.social
      .map((link) => ({
        name: normalizeSocialPlatformName(link.name),
        url: link.url.trim() ? normalizeHttpUrl(link.url.trim()) : "",
      }))
      .filter(
        (link) =>
          link.name &&
          link.url &&
          link.name.trim().toLowerCase() !== "other",
      ),
    licenceNumber: form.licenceNumber,
    licenceFileUrl: form.licenceFileUrl.trim() ? undefined : "",
    makeTime: form.makeTime,
    workSetup: form.workSetup,
    offering: form.offering,
    partnerNote: form.partnerNote,
  });

  const validateOnlineFields = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (form.website.trim() && !isValidHttpUrl(form.website)) {
      errors.website = t("validation.websiteInvalid");
    }

    const usedPlatforms = new Set<string>();
    form.social.forEach((row, index) => {
      const name = row.name.trim();
      const url = row.url.trim();
      const nameKey = `social.${index}.name`;
      const urlKey = `social.${index}.url`;
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

    return errors;
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      const saved = await patchPartnerApplication(payloadFromForm());
      if (saved) setForm(saved);
      toast.success(t("saved"), TOAST_BASE);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("loadError")), TOAST_BASE);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errors = {
      ...collectRequiredFieldErrors(form, role),
      ...validateOnlineFields(),
    };
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error(t("incomplete"), TOAST_BASE);
      return;
    }
    if (!confirmed) {
      setFieldErrors((prev) => ({ ...prev, confirmed: t("confirmRequired") }));
      return;
    }
    const verifyHref = buildVerifyEmailHref({
      locale,
      mode: "partner-submit",
      next: `${applyPath}?draft=1`,
    });

    if (needsEmailVerification(user)) {
      setSubmitting(true);
      setFieldErrors({});
      try {
        const saved = await patchPartnerApplication(payloadFromForm());
        if (saved) setForm(saved);
        window.location.assign(verifyHref);
      } catch (err) {
        toast.error(getApiErrorMessage(err, t("loadError")), TOAST_BASE);
        setSubmitting(false);
      }
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    try {
      await patchPartnerApplication(payloadFromForm());
      await submitPartnerApplication();
      const profile = await api.get<Parameters<typeof applyUserResponse>[0]>(
        "/api/users/profile",
      );
      applyUserResponse(profile);
    } catch (err) {
      const code = getApiErrorCode(err);
      if (code === "EMAIL_NOT_VERIFIED") {
        window.location.assign(verifyHref);
        return;
      }
      const data = (err as ApiError)?.data as
        | { errors?: FieldErrors; message?: string }
        | undefined;
      if (data?.errors) {
        setFieldErrors(data.errors);
        toast.error(t("incomplete"), TOAST_BASE);
      } else {
        toast.error(getApiErrorMessage(err, t("submitError")), TOAST_BASE);
      }
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <p className="[font-family:var(--font-body)] text-[14px] text-(--color-grey-muted)">
        …
      </p>
    );
  }

  return (
    <div className="w-full min-w-0">
      <div className="mb-6 sm:mb-8">
        <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.28em] text-(--color-grey-muted) mb-3">
          {t("eyebrow")}
        </p>
        <h1 className="[font-family:var(--font-display)] text-[26px] sm:text-[32px] lg:text-[36px] text-black mb-3 wrap-break-word">
          {role === "fabric_store" ? t("fabricTitle") : t("tailorTitle")}
        </h1>
        <p className="[font-family:var(--font-body)] text-[14px] leading-relaxed text-(--color-grey-muted) mb-4">
          {t("description")}
        </p>
        <PartnerRequestNumber
          label={t("requestNumberLabel")}
          value={form.requestNumber}
          className="mb-0"
        />
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="w-full min-w-0 border border-(--color-border) bg-white p-4 sm:p-6 lg:p-8 space-y-8 sm:space-y-10"
      >
        <section className="space-y-5 min-w-0">
          <h2 className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.16em] sm:tracking-[0.24em] text-black">
            {t("sections.identity")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 min-w-0">
            <FormField
              label={t("fields.businessName")}
              name="businessName"
              required
              error={showRequired("businessName")}
            >
              <input
                id="businessName"
                value={form.businessName}
                onChange={(e) => setField("businessName", e.target.value)}
                placeholder={t("placeholders.businessName")}
                className={INPUT_CLASS}
              />
            </FormField>
            <FormField
              label={t("fields.businessNameAr")}
              name="businessNameAr"
              required
              error={showRequired("businessNameAr")}
            >
              <input
                id="businessNameAr"
                dir="rtl"
                value={form.businessNameAr}
                onChange={(e) => setField("businessNameAr", e.target.value)}
                placeholder={t("placeholders.businessNameAr")}
                className={INPUT_CLASS}
              />
            </FormField>
          </div>
          <FormField
            label={t("fields.phone")}
            name="phone"
            required
            hint={t("phoneHint")}
            error={showRequired("phone")}
          >
            <div className="relative flex items-center min-w-0">
              <span className="absolute left-3 sm:left-4 text-gray-500 font-mono text-[13px] sm:text-[14px] select-none">
                +971
              </span>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                value={phoneDigits(form.phone)}
                onChange={(e) =>
                  setField("phone", normalizeUaePhone(phoneDigits(e.target.value)))
                }
                placeholder="50 123 4567"
                maxLength={9}
                className={`${INPUT_CLASS} pl-14 sm:pl-16 font-mono`}
              />
            </div>
          </FormField>
        </section>

        <section className="space-y-5 min-w-0">
          <h2 className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.16em] sm:tracking-[0.24em] text-black">
            {t("sections.location")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 min-w-0">
            <FormField
              label={t("fields.city")}
              name="city"
              required
              error={showRequired("city")}
            >
              <input
                id="city"
                type="text"
                value={form.city}
                onChange={(e) => setField("city", e.target.value)}
                placeholder={t("placeholders.city")}
                className={INPUT_CLASS}
              />
            </FormField>
            <FormField
              label={t("fields.location")}
              name="location"
              required
              error={showRequired("location")}
            >
              <input
                id="location"
                type="text"
                value={form.location}
                onChange={(e) => setField("location", e.target.value)}
                placeholder={t("placeholders.location")}
                className={INPUT_CLASS}
              />
            </FormField>
          </div>
        </section>

        <section className="space-y-5 min-w-0">
          <h2 className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.16em] sm:tracking-[0.24em] text-black">
            {t("sections.about")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 min-w-0">
            <FormField
              label={t("fields.about")}
              name="about"
              required
              hint={`${form.about.length}/${ABOUT_MAX} · ${t("aboutHint")}`}
              error={showRequired("about")}
            >
              <textarea
                id="about"
                value={form.about}
                maxLength={ABOUT_MAX}
                onChange={(e) => setField("about", e.target.value)}
                placeholder={t("placeholders.about")}
                className={TEXTAREA_CLASS}
              />
            </FormField>
            <FormField
              label={t("fields.aboutAr")}
              name="aboutAr"
              required
              hint={`${form.aboutAr.length}/${ABOUT_MAX}`}
              error={showRequired("aboutAr")}
            >
              <textarea
                id="aboutAr"
                dir="rtl"
                value={form.aboutAr}
                maxLength={ABOUT_MAX}
                onChange={(e) => setField("aboutAr", e.target.value)}
                placeholder={t("placeholders.aboutAr")}
                className={TEXTAREA_CLASS}
              />
            </FormField>
          </div>
        </section>

        <section className="space-y-5 min-w-0">
          <h2 className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.16em] sm:tracking-[0.24em] text-black">
            {t("sections.operations")}
          </h2>
          <FormField
            label={t("fields.yearsOperating")}
            name="yearsOperating"
            required
            error={showRequired("yearsOperating")}
          >
            <select
              id="yearsOperating"
              value={form.yearsOperating}
              onChange={(e) => setField("yearsOperating", e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">{t("placeholders.select")}</option>
              {YEARS_OPERATING.map((value) => (
                <option key={value} value={value}>
                  {t(`years.${value}`)}
                </option>
              ))}
            </select>
          </FormField>
          {role === "tailor" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 min-w-0">
              <FormField
                label={t("fields.makeTime")}
                name="makeTime"
                required
                error={showRequired("makeTime")}
              >
                <select
                  id="makeTime"
                  value={form.makeTime}
                  onChange={(e) => setField("makeTime", e.target.value)}
                  className={SELECT_CLASS}
                >
                  <option value="">{t("placeholders.select")}</option>
                  {MAKE_TIMES.map((value) => (
                    <option key={value} value={value}>
                      {t(`makeTime.${value}`)}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField
                label={t("fields.workSetup")}
                name="workSetup"
                required
                error={showRequired("workSetup")}
              >
                <select
                  id="workSetup"
                  value={form.workSetup}
                  onChange={(e) => setField("workSetup", e.target.value)}
                  className={SELECT_CLASS}
                >
                  <option value="">{t("placeholders.select")}</option>
                  {WORK_SETUPS.map((value) => (
                    <option key={value} value={value}>
                      {t(`workSetup.${value}`)}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          ) : (
            <FormField
              label={t("fields.offering")}
              name="offering"
              required
              error={showRequired("offering")}
            >
              <select
                id="offering"
                value={form.offering}
                onChange={(e) => setField("offering", e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">{t("placeholders.select")}</option>
                {OFFERINGS.map((value) => (
                  <option key={value} value={value}>
                    {t(`offering.${value}`)}
                  </option>
                ))}
              </select>
            </FormField>
          )}
        </section>

        <section className="space-y-5 min-w-0">
          <h2 className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.16em] sm:tracking-[0.24em] text-black">
            {t("sections.media")}
          </h2>
          <FormField
            label={`${t("fields.logo")} (${t("optional")})`}
            name="logo"
            hint={t("upload.logoHint")}
          >
            <PartnerFileUpload
              variant="logo"
              value={form.logoUrl}
              onChange={(url) => setField("logoUrl", url)}
              chooseFileLabel={t("upload.chooseFile")}
              uploadingLabel={t("upload.uploading")}
              uploadFailedLabel={t("upload.failed")}
              removeLabel={t("upload.remove")}
            />
          </FormField>
        </section>

        <section className="space-y-5 min-w-0">
          <h2 className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.16em] sm:tracking-[0.24em] text-black">
            {t("sections.online")}
          </h2>
          <FormField
            label={`${t("fields.website")} (${t("optional")})`}
            name="website"
            error={fieldErrors.website}
          >
            <input
              id="website"
              type="url"
              value={form.website}
              onChange={(e) => setField("website", e.target.value)}
              onBlur={(e) => {
                const value = e.target.value.trim();
                if (value && isValidHttpUrl(value)) {
                  setField("website", normalizeHttpUrl(value));
                }
              }}
              placeholder={t("placeholders.website")}
              className={INPUT_CLASS}
            />
          </FormField>
          <div className="space-y-4">
            {form.social.map((row, index) => {
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
                form.social
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
                            : showRequired(`social.${index}.name`) ||
                              showRequired(`social.${index}`)
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
                              aria-expanded={
                                socialPlatformOpenIndex === index
                              }
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
                            showRequired(`social.${index}.name`) ||
                            showRequired(`social.${index}`)
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
                            showRequired(`social.${index}.url`) ||
                            showRequired(`social.${index}`)
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
                        error={
                          showRequired(`social.${index}.url`) ||
                          showRequired(`social.${index}`)
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
            {form.social.length < SOCIAL_MAX ? (
              <button
                type="button"
                onClick={addSocialLink}
                className="w-full sm:w-auto px-4 py-2.5 border border-black text-black text-[10px] tracking-[0.18em] uppercase [font-family:var(--font-ui)] hover:bg-black hover:text-white transition"
              >
                {t("addSocial")}
              </button>
            ) : null}
          </div>
        </section>

        <section className="space-y-5 min-w-0">
          <h2 className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.16em] sm:tracking-[0.24em] text-black">
            {t("sections.licence")}
          </h2>
          <FormField
            label={`${t("fields.licenceNumber")} (${t("optional")})`}
            name="licenceNumber"
          >
            <input
              id="licenceNumber"
              value={form.licenceNumber}
              onChange={(e) => setField("licenceNumber", e.target.value)}
              className={INPUT_CLASS}
            />
          </FormField>
          <FormField
            label={`${t("fields.licenceFile")} (${t("optional")})`}
            name="licenceFile"
            hint={t("upload.licenceHint")}
          >
            <PartnerFileUpload
              variant="licence"
              value={form.licenceFileUrl}
              onChange={(url) => setField("licenceFileUrl", url)}
              chooseFileLabel={t("upload.chooseFile")}
              uploadingLabel={t("upload.uploading")}
              uploadFailedLabel={t("upload.failed")}
              removeLabel={t("upload.remove")}
            />
          </FormField>
        </section>

        <section className="space-y-5 min-w-0">
          <h2 className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.16em] sm:tracking-[0.24em] text-black">
            {t("sections.comments")}
          </h2>
          <FormField
            label={`${t("fields.partnerNote")} (${t("optional")})`}
            name="partnerNote"
            hint={t("partnerNoteHint")}
          >
            <textarea
              id="partnerNote"
              value={form.partnerNote}
              onChange={(e) =>
                setField("partnerNote", e.target.value.slice(0, PARTNER_NOTE_MAX))
              }
              placeholder={t("placeholders.partnerNote")}
              maxLength={PARTNER_NOTE_MAX}
              className={TEXTAREA_CLASS}
            />
          </FormField>
        </section>

        <label className="flex items-start gap-3 [font-family:var(--font-body)] text-[14px] text-black">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => {
              setConfirmed(e.target.checked);
              setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.confirmed;
                return next;
              });
            }}
            className="mt-1 shrink-0"
          />
          <span>{t("confirmLabel")}</span>
        </label>
        {fieldErrors.confirmed ? (
          <p className="text-xs text-red-500">{fieldErrors.confirmed}</p>
        ) : null}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => void saveDraft()}
            disabled={saving || submitting}
            className="w-full sm:w-auto whitespace-nowrap px-8 py-3 border border-black text-black text-[10px] tracking-[0.22em] uppercase hover:bg-black hover:text-white transition [font-family:var(--font-ui)] disabled:opacity-50"
          >
            {saving ? t("saving") : t("saveDraft")}
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full sm:w-auto whitespace-nowrap px-8 py-3 bg-black text-white text-[10px] tracking-[0.22em] uppercase hover:bg-[#2A2A28] transition [font-family:var(--font-ui)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting
              ? t("submitting")
              : form.requestNumber
                ? t("resubmit")
                : t("submit")}
          </button>
        </div>
        {!canSubmit && !submitting ? (
          <p className="[font-family:var(--font-body)] text-[12px] text-(--color-grey-muted)">
            {t("submitNeedsFields")}
          </p>
        ) : null}
      </form>
    </div>
  );
}
