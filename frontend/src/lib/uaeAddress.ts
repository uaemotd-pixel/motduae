// frontend/lib/uaeAddress.ts
export const UAE_EMIRATES = [
  { value: "Dubai", en: "Dubai", ar: "دبي" },
  { value: "Abu Dhabi", en: "Abu Dhabi", ar: "أبو ظبي" },
  { value: "Sharjah", en: "Sharjah", ar: "الشارقة" },
  { value: "Ajman", en: "Ajman", ar: "عجمان" },
  { value: "Umm Al Quwain", en: "Umm Al Quwain", ar: "أم القيوين" },
  { value: "Ras Al Khaimah", en: "Ras Al Khaimah", ar: "رأس الخيمة" },
  { value: "Fujairah", en: "Fujairah", ar: "الفجيرة" },
] as const;

export type EmirateValue = (typeof UAE_EMIRATES)[number]["value"];

export interface Address {
  fullName: string;
  phone: string;
  emirate: string;
  city: string;
  street: string;
  building: string;
  postalCode: string;
}

export function isValidEmirate(value: string): value is EmirateValue {
  return UAE_EMIRATES.some((e) => e.value === value);
}

export function normalizeEmirate(value: string): EmirateValue | "" {
  if (!value) return "";
  const trimmed = value.trim();
  const found = UAE_EMIRATES.find(
    (e) =>
      e.value.toLowerCase() === trimmed.toLowerCase() ||
      e.en.toLowerCase() === trimmed.toLowerCase() ||
      e.ar === trimmed,
  );
  return found?.value || "";
}

export function getEmirateEn(value: string): string {
  const found = UAE_EMIRATES.find((e) => e.value === value);
  return found?.en || "";
}

export function getEmirateAr(value: string): string {
  const found = UAE_EMIRATES.find((e) => e.value === value);
  return found?.ar || "";
}

export function normalizeAddress(address: Partial<Address>): Partial<Address> {
  if (!address) return {};

  return {
    fullName: address.fullName?.trim() || "",
    phone: address.phone?.trim() || "",
    emirate: normalizeEmirate(address.emirate || ""),
    city: address.city?.trim() || "",
    street: address.street?.trim() || "",
    building: address.building?.trim() || "",
    postalCode: address.postalCode?.trim() || "",
  };
}

export function validateAddress(address: Partial<Address>): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!address.fullName?.trim()) errors.fullName = "Full name required";
  if (!address.phone?.trim()) errors.phone = "Phone required";
  if (!address.emirate || !isValidEmirate(address.emirate))
    errors.emirate = "Valid UAE emirate required";
  if (!address.city?.trim()) errors.city = "City required";
  if (!address.street?.trim()) errors.street = "Street required";
  if (!address.building?.trim()) errors.building = "Building required";

  return { valid: Object.keys(errors).length === 0, errors };
}

export function formatAddressDisplay(address: Address): string {
  const parts = [
    address.fullName,
    address.street,
    address.building,
    `${address.city}, ${getEmirateEn(address.emirate as EmirateValue)}`,
    address.postalCode,
  ].filter(Boolean);
  return parts.join(", ");
}
