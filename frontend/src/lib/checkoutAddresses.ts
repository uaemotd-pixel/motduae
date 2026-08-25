export type ProfileAddress = {
  _id?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  emirate?: string;
  city?: string;
  street?: string;
  building?: string;
  postalCode?: string;
  isDefault?: boolean;
};

export type FamilyMemberAddress = {
  fullName?: string;
  phone?: string;
  emirate?: string;
  city?: string;
  street?: string;
  building?: string;
  postalCode?: string;
};

export type FamilyMember = {
  _id?: string;
  name?: string;
  phone?: string;
  relationship?: string;
  address?: FamilyMemberAddress | null;
};

export type CheckoutAddressOption = {
  id: string;
  source: "profile" | "family";
  group: "profile" | "family";
  label: string;
  fullName: string;
  phone: string;
  emirate: string;
  city: string;
  street: string;
  building: string;
  postalCode: string;
  isDefault?: boolean;
};

const RELATIONSHIP_LABELS_EN: Record<string, string> = {
  wife: "Wife",
  mother: "Mother",
  aunt: "Aunt",
  sister: "Sister",
  daughter: "Daughter",
  friend: "Friend",
  other: "Other",
};

const RELATIONSHIP_LABELS_AR: Record<string, string> = {
  wife: "زوجة",
  mother: "أم",
  aunt: "عمة",
  sister: "أخت",
  daughter: "ابنة",
  friend: "صديقة",
  other: "أخرى",
};

export function hasUsableCheckoutAddress(
  address?: FamilyMemberAddress | ProfileAddress | null,
) {
  if (!address || typeof address !== "object") return false;
  return Boolean(
    String(address.emirate || "").trim() && String(address.city || "").trim(),
  );
}

function relationshipLabel(value: string | undefined, locale: string) {
  if (!value) return "";
  const map = locale === "ar" ? RELATIONSHIP_LABELS_AR : RELATIONSHIP_LABELS_EN;
  return map[value] || value;
}

export function buildCheckoutAddressOptions(
  profile: {
    addresses?: ProfileAddress[];
    savedUsers?: FamilyMember[];
  } | null,
  locale: string = "en",
): CheckoutAddressOption[] {
  if (!profile) return [];

  const options: CheckoutAddressOption[] = [];
  const defaultLabel = locale === "ar" ? "افتراضي" : "Default";

  for (const addr of profile.addresses || []) {
    if (!hasUsableCheckoutAddress(addr)) continue;
    const fullName = String(addr.fullName || "").trim();
    const city = String(addr.city || "").trim();
    options.push({
      id: `profile:${addr._id || options.length}`,
      source: "profile",
      group: "profile",
      label: `${fullName || city} — ${city}${addr.isDefault ? ` (${defaultLabel})` : ""}`,
      fullName,
      phone: String(addr.phone || "").trim(),
      emirate: String(addr.emirate || "").trim(),
      city,
      street: String(addr.street || "").trim(),
      building: String(addr.building || "").trim(),
      postalCode: String(addr.postalCode || "").trim(),
      isDefault: Boolean(addr.isDefault),
    });
  }

  for (const member of profile.savedUsers || []) {
    const addr = member.address;
    if (!hasUsableCheckoutAddress(addr)) continue;
    const fullName = String(addr?.fullName || member.name || "").trim();
    const city = String(addr?.city || "").trim();
    const relation = relationshipLabel(member.relationship, locale);
    const namePart = relation ? `${fullName} (${relation})` : fullName;
    options.push({
      id: `family:${member._id || options.length}`,
      source: "family",
      group: "family",
      label: `${namePart} — ${city}`,
      fullName,
      phone: String(addr?.phone || member.phone || "").trim(),
      emirate: String(addr?.emirate || "").trim(),
      city,
      street: String(addr?.street || "").trim(),
      building: String(addr?.building || "").trim(),
      postalCode: String(addr?.postalCode || "").trim(),
    });
  }

  return options;
}

export function findCheckoutAddressOption(
  options: CheckoutAddressOption[],
  id: string,
) {
  return options.find((option) => option.id === id) || null;
}
