export const FABRIC_MATERIALS = [
  "wool",
  "silk",
  "linen",
  "cashmere",
  "cotton",
] as const;
export type FabricMaterial = (typeof FABRIC_MATERIALS)[number];

export const FABRIC_TAGS = [
  "NEW",
  "BESTSELLER",
  "PREMIUM",
  "ARTISANAL",
  "SALE",
  "HERITAGE",
  "SUSTAINABLE",
  "EXCLUSIVE",
  "BREATHABLE",
] as const;
export type FabricTag = (typeof FABRIC_TAGS)[number];

export const FABRIC_TAG_COLORS_VALUES = [
  "bg-primary",
  "bg-[#C8A97E]",
  "bg-[#5B4A3A]",
  "bg-gray-500",
  "bg-red-500",
  "bg-[#8B6B47]",
  "bg-[#9C6B3C]",
  "bg-[#A0522D]",
  "bg-[#2C1810]",
  "bg-[#4A6B5D]",
] as const;
export type FabricTagColor = (typeof FABRIC_TAG_COLORS_VALUES)[number];

const FABRIC_TAG_COLOR_LABELS: Record<string, string> = {
  "bg-primary": "Black",
  "bg-[#C8A97E]": "Gold",
  "bg-[#5B4A3A]": "Brown",
  "bg-gray-500": "Gray",
  "bg-red-500": "Red",
  "bg-[#8B6B47]": "Bronze",
  "bg-[#9C6B3C]": "Copper",
  "bg-[#A0522D]": "Sienna",
  "bg-[#2C1810]": "Espresso",
  "bg-[#4A6B5D]": "Forest",
};

export function getTagSelectOptions(currentValue?: string) {
  const values = new Set<string>(FABRIC_TAGS);
  const trimmed = currentValue?.trim();
  if (trimmed) values.add(trimmed);

  return Array.from(values).map((value) => ({ value, label: value }));
}

export function getTagColorSelectOptions(currentValue?: string) {
  const values = new Set<string>(FABRIC_TAG_COLORS_VALUES);
  const trimmed = currentValue?.trim();
  if (trimmed) values.add(trimmed);

  return Array.from(values).map((value) => ({
    value,
    label: FABRIC_TAG_COLOR_LABELS[value] || value,
  }));
}

export interface PickupAddress {
  emirate: string;
  city: string;
  street?: string;
  building?: string;
  phone?: string;
}

export interface FabricFormData {
  name: string;
  nameAr: string;
  slug: string;
  description: string;
  descriptionAr: string;
  images: string[];
  material: FabricMaterial | "";
  color: string;
  city: string;
  tag: string;
  tagColor: string;
  pricePerMeter: number;
  listedByStore: string;
  pickupAddress: PickupAddress;
  isActive: boolean;
}

export function slugFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isValidObjectId(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value.trim());
}

export function isDataUrl(value: string): boolean {
  return value.trim().toLowerCase().startsWith("data:");
}

export function hasDataUrlImages(images: string[]): boolean {
  return images.some((url) => url.trim() && isDataUrl(url));
}

export function resolveSlug(
  form: Pick<FabricFormData, "name" | "nameAr" | "slug">,
): string {
  const explicit = form.slug.trim();
  if (explicit) return explicit;

  const fromName = slugFromName(form.name);
  if (fromName) return fromName;

  const fromNameAr = slugFromName(form.nameAr);
  if (fromNameAr) return fromNameAr;

  return `fabric-${Date.now()}`;
}

export function defaultFabricForm(): FabricFormData {
  return {
    name: "",
    nameAr: "",
    slug: "",
    description: "",
    descriptionAr: "",
    images: [""],
    material: "",
    color: "",
    city: "",
    tag: "",
    tagColor: "",
    pricePerMeter: 0,
    listedByStore: "",
    pickupAddress: {
      emirate: "",
      city: "",
      street: "",
      building: "",
      phone: "",
    },
    isActive: true,
  };
}

export function fromApiFabric(
  product: Record<string, unknown>,
): FabricFormData {
  const images =
    Array.isArray(product.images) && product.images.length
      ? (product.images as string[])
      : [""];

  const material =
    typeof product.material === "string" &&
    FABRIC_MATERIALS.includes(product.material as FabricMaterial)
      ? (product.material as FabricMaterial)
      : "";

  const tag = typeof product.tag === "string" ? product.tag : "";
  const tagColor = typeof product.tagColor === "string" ? product.tagColor : "";

  let listedByStore = "";
  if (product.listedByStore) {
    if (
      typeof product.listedByStore === "object" &&
      product.listedByStore !== null &&
      "_id" in product.listedByStore
    ) {
      listedByStore = String((product.listedByStore as { _id: string })._id);
    } else {
      listedByStore = String(product.listedByStore);
    }
  }

  const apiAddress = product.storePickupAddress as
    | Record<string, unknown>
    | undefined;
  const pickupAddress = {
    emirate: typeof apiAddress?.emirate === "string" ? apiAddress.emirate : "",
    city: typeof apiAddress?.city === "string" ? apiAddress.city : "",
    street: typeof apiAddress?.street === "string" ? apiAddress.street : "",
    building:
      typeof apiAddress?.building === "string" ? apiAddress.building : "",
    phone: typeof apiAddress?.phone === "string" ? apiAddress.phone : "",
  };

  return {
    name: typeof product.name === "string" ? product.name : "",
    nameAr: typeof product.nameAr === "string" ? product.nameAr : "",
    slug: typeof product.slug === "string" ? product.slug : "",
    description:
      typeof product.description === "string" ? product.description : "",
    descriptionAr:
      typeof product.descriptionAr === "string" ? product.descriptionAr : "",
    images,
    material,
    color: typeof product.color === "string" ? product.color : "",
    city: typeof product.city === "string" ? product.city : "",
    tag,
    tagColor,
    pricePerMeter:
      typeof product.pricePerMeter === "number" ? product.pricePerMeter : 0,
    listedByStore,
    pickupAddress,
    isActive: typeof product.isActive === "boolean" ? product.isActive : true,
  };
}

export function toFabricApiPayload(
  form: FabricFormData,
  options?: { includeIsActive?: boolean },
): Record<string, unknown> {
  const name = form.name.trim();

  const payload: Record<string, unknown> = {
    name,
    nameAr: form.nameAr.trim() || name,
    slug: resolveSlug(form),
    description: form.description.trim(),
    descriptionAr: form.descriptionAr.trim() || form.description.trim(),
    images: form.images.filter((url) => url.trim() !== "" && !isDataUrl(url)),
    material: form.material,
    color: form.color.trim(),
    city: form.city.trim(),
    tag: form.tag,
    tagColor: form.tagColor,
    pricePerMeter: form.pricePerMeter,
    listedByStore: form.listedByStore.trim(),
    storePickupAddress: {
      emirate: form.pickupAddress.emirate.trim(),
      city: form.pickupAddress.city.trim(),
      street: form.pickupAddress.street?.trim() || "",
      building: form.pickupAddress.building?.trim() || "",
      phone: form.pickupAddress.phone?.trim() || "",
    },
  };

  if (options?.includeIsActive && form.isActive !== undefined) {
    payload.isActive = form.isActive;
  }

  return payload;
}

export function validateFabricForm(
  form: FabricFormData,
  messages: Record<string, string>,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!form.name.trim()) errors.name = messages.name_required;
  if (!form.nameAr.trim()) errors.nameAr = messages.name_ar_required;
  if (!form.description.trim()) errors.description = messages.description_required;
  if (!form.descriptionAr.trim()) {
    errors.descriptionAr = messages.description_ar_required;
  }
  if (!form.material) errors.material = messages.material_required;
  if (!form.color.trim()) errors.color = messages.color_required;
  if (!form.city.trim()) errors.city = messages.city_required;
  if (!form.tag) errors.tag = messages.tag_required;
  if (!form.tagColor) errors.tagColor = messages.tag_color_required;
  if (form.pricePerMeter <= 0) errors.pricePerMeter = messages.price_required;

  if (!form.listedByStore.trim()) {
    errors.listedByStore = messages.store_partner_required;
  } else if (!isValidObjectId(form.listedByStore)) {
    errors.listedByStore = messages.store_partner_invalid;
  }

  if (!form.pickupAddress.emirate.trim()) {
    errors["pickupAddress.emirate"] = messages.emirate_required;
  }
  if (!form.pickupAddress.city.trim()) {
    errors["pickupAddress.city"] = messages.pickup_city_required;
  }

  if (hasDataUrlImages(form.images)) {
    errors.images = messages.image_upload_pending;
  } else if (form.images.length === 0 || form.images.every((url) => !url.trim())) {
    errors.images = messages.images_required;
  } else if (form.images.length > 5) {
    errors.images = messages.images_max;
  }

  return errors;
}
