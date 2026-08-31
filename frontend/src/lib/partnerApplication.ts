import { api } from "@/lib/api/client";
import { isValidUaePhone, normalizeUaePhone } from "@/lib/uaePhone";

export type PartnerRole = "tailor" | "fabric_store";

export type PartnerSocialLink = {
  name: string;
  url: string;
};

export type PartnerApplication = {
  ownerId: string;
  role: PartnerRole;
  businessName: string;
  businessNameAr: string;
  phone: string;
  city: string;
  location: string;
  about: string;
  aboutAr: string;
  yearsOperating: string;
  logoUrl: string;
  website: string;
  social: PartnerSocialLink[];
  licenceNumber: string;
  licenceFileUrl: string;
  makeTime: string;
  workSetup: string;
  offering: string;
  submittedAt: string | null;
  confirmedAt: string | null;
  requestNumber: string;
  partnerNote: string;
  resubmitCount: number;
  resubmittedAt: string | null;
};

export const YEARS_OPERATING = ["under_1", "1_3", "3_10", "10_plus"] as const;
export const MAKE_TIMES = ["d3_5", "d7", "d10_14", "d21_plus"] as const;
export const WORK_SETUPS = ["home", "workshop", "both"] as const;
export const OFFERINGS = ["retail", "wholesale", "both"] as const;
export const SOCIAL_MAX = 20;

export function emptyPartnerApplication(role: PartnerRole): PartnerApplication {
  return {
    ownerId: "",
    role,
    businessName: "",
    businessNameAr: "",
    phone: "",
    city: "",
    location: "",
    about: "",
    aboutAr: "",
    yearsOperating: "",
    logoUrl: "",
    website: "",
    social: [],
    licenceNumber: "",
    licenceFileUrl: "",
    makeTime: "",
    workSetup: "",
    offering: "",
    submittedAt: null,
    confirmedAt: null,
    requestNumber: "",
    partnerNote: "",
    resubmitCount: 0,
    resubmittedAt: null,
  };
}

export function normalizeSocialLinks(social: unknown): PartnerSocialLink[] {
  if (Array.isArray(social)) {
    return social
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const row = item as { name?: unknown; url?: unknown };
        return {
          name: String(row.name || "").trim(),
          url: String(row.url || "").trim(),
        };
      })
      .filter((row): row is PartnerSocialLink => Boolean(row))
      .slice(0, SOCIAL_MAX);
  }

  if (social && typeof social === "object") {
    const record = social as Record<string, unknown>;
    return (["instagram", "facebook", "tiktok", "other"] as const)
      .map((key) => ({
        name: key,
        url: String(record[key] || "").trim(),
      }))
      .filter((row) => row.url)
      .slice(0, SOCIAL_MAX);
  }

  return [];
}

export function collectRequiredFieldErrors(
  form: PartnerApplication,
  role: PartnerRole,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const requireText = (key: keyof PartnerApplication, message: string) => {
    if (!String(form[key] || "").trim()) errors[key] = message;
  };

  requireText("businessName", "required");
  requireText("businessNameAr", "required");
  if (!isValidUaePhone(normalizeUaePhone(form.phone) || form.phone)) {
    errors.phone = "required";
  }
  requireText("city", "required");
  requireText("location", "required");
  requireText("about", "required");
  requireText("aboutAr", "required");
  if (!YEARS_OPERATING.includes(form.yearsOperating as (typeof YEARS_OPERATING)[number])) {
    errors.yearsOperating = "required";
  }
  if (role === "tailor") {
    if (!MAKE_TIMES.includes(form.makeTime as (typeof MAKE_TIMES)[number])) {
      errors.makeTime = "required";
    }
    if (!WORK_SETUPS.includes(form.workSetup as (typeof WORK_SETUPS)[number])) {
      errors.workSetup = "required";
    }
  }
  if (role === "fabric_store") {
    if (!OFFERINGS.includes(form.offering as (typeof OFFERINGS)[number])) {
      errors.offering = "required";
    }
  }

  form.social.forEach((row, index) => {
    const name = row.name.trim();
    const url = row.url.trim();
    if ((name && !url) || (!name && url)) {
      errors[`social.${index}`] = "required";
    }
  });

  return errors;
}

export function isApplicationComplete(form: PartnerApplication, role: PartnerRole) {
  return Object.keys(collectRequiredFieldErrors(form, role)).length === 0;
}

function hydrateApplication(application: PartnerApplication): PartnerApplication;
function hydrateApplication(
  application: PartnerApplication | null | undefined,
): PartnerApplication | null | undefined;
function hydrateApplication(application: PartnerApplication | null | undefined) {
  if (!application) return application;
  const legacyArea = (application as { area?: string }).area;
  return {
    ...application,
    location: String(application.location || legacyArea || "").trim(),
    social: normalizeSocialLinks(application.social),
    requestNumber: String(application.requestNumber || "").trim(),
    partnerNote: String(application.partnerNote || ""),
    resubmitCount: Number(application.resubmitCount) || 0,
    resubmittedAt: application.resubmittedAt || null,
  };
}

export async function fetchPartnerApplication() {
  const res = await api.get<{ application: PartnerApplication | null }>(
    "/api/users/application",
  );
  return hydrateApplication(res.application);
}

export async function patchPartnerApplication(
  body: Partial<PartnerApplication> & {
    social?: PartnerApplication["social"];
  },
) {
  const res = await api.patch<{ application: PartnerApplication }>(
    "/api/users/application",
    body,
  );
  return hydrateApplication(res.application);
}

export async function submitPartnerApplication() {
  return api.post<{
    ok: boolean;
    application: PartnerApplication;
    applicationSubmittedAt: string;
  }>("/api/users/application/submit", { confirmed: true });
}

export async function uploadPartnerApplicationFile(
  file: File,
  variant: "logo" | "licence",
) {
  const formData = new FormData();
  formData.append("file", file);
  return api.postFormData<{
    url: string;
    variant: string;
    application: PartnerApplication;
  }>(`/api/users/application/uploads?variant=${variant}`, formData);
}
