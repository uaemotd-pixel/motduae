import {
  emptyShopPickupAddress,
  type ShopPickupAddress,
} from "@/lib/fabricShop";

export interface ReadyMadeFormData {
  name: string;
  nameAr: string;
  slug: string;
  code: string;

  description: string;
  descriptionAr: string;

  tag: string;
  tagAr: string;

  colors: string[];

  thumbnailImage: string;
  images: string[];

  fabricType: string;
  fabricTypeAr: string;

  tailorName: string;
  tailorNameAr: string;

  fabricShopId: string;
  fabricId: string;
  tailorShopId: string;
  designId: string;

  pickupAddress: ShopPickupAddress;

  metersPerFabric: number;

  fabricPriceAED: number;
  mukhawarPriceAED: number;
  finalSellingPriceAED: number;

  availableFabricStock: number;

  minAge: number;
  maxAge: number;

  isActive?: boolean;
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
  form: Pick<ReadyMadeFormData, "name" | "nameAr" | "slug">,
): string {
  const explicit = form.slug.trim();
  if (explicit) return explicit;

  const fromName = slugFromName(form.name);
  if (fromName) return fromName;

  const fromNameAr = slugFromName(form.nameAr);
  if (fromNameAr) return fromNameAr;

  return `ready-made-${Date.now()}`;
}

export function pickupAddressErrors(
  address?: ShopPickupAddress | null,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const pickup = address || emptyShopPickupAddress();

  if (!pickup.fullName.trim()) {
    errors["pickupAddress.fullName"] = "Pickup contact name required";
  }
  if (!pickup.phone.trim()) {
    errors["pickupAddress.phone"] = "Pickup phone required";
  } else if (!/^\d{9}$/.test(pickup.phone.trim())) {
    errors["pickupAddress.phone"] = "Pickup phone must be 9 digits";
  }
  if (!pickup.line1.trim()) {
    errors["pickupAddress.line1"] = "Pickup street required";
  }
  if (!pickup.city.trim()) {
    errors["pickupAddress.city"] = "Pickup city required";
  }
  if (!pickup.emirate.trim()) {
    errors["pickupAddress.emirate"] = "Pickup emirate required";
  }

  return errors;
}

function pickupFromApi(product: Record<string, unknown>): ShopPickupAddress {
  const raw = product.pickupAddress;
  if (!raw || typeof raw !== "object") return emptyShopPickupAddress();
  const address = raw as Record<string, unknown>;
  return {
    fullName: typeof address.fullName === "string" ? address.fullName : "",
    phone: typeof address.phone === "string" ? address.phone : "",
    line1: typeof address.line1 === "string" ? address.line1 : "",
    line2: typeof address.line2 === "string" ? address.line2 : "",
    city: typeof address.city === "string" ? address.city : "",
    emirate: typeof address.emirate === "string" ? address.emirate : "",
  };
}

export function defaultReadyMadeForm(): ReadyMadeFormData {
  return {
    name: "",
    nameAr: "",
    slug: "",
    code: "",

    description: "",
    descriptionAr: "",

    tag: "",
    tagAr: "",

    colors: [],

    thumbnailImage: "",
    images: [""],

    fabricType: "",
    fabricTypeAr: "",

    tailorName: "",
    tailorNameAr: "",

    fabricShopId: "",
    fabricId: "",
    tailorShopId: "",
    designId: "",

    pickupAddress: emptyShopPickupAddress(),

    metersPerFabric: 0,

    fabricPriceAED: 0,
    mukhawarPriceAED: 0,
    finalSellingPriceAED: 0,

    availableFabricStock: 0,

    minAge: 0,
    maxAge: 0,

    isActive: true,
  };
}

export function fromApiProduct(
  product: Record<string, unknown>,
): ReadyMadeFormData {
  let images: string[] = [];
  if (Array.isArray(product.images) && product.images.length) {
    images = product.images as string[];
  } else {
    images = [""];
  }

  return {
    name: typeof product.name === "string" ? product.name : "",
    nameAr: typeof product.nameAr === "string" ? product.nameAr : "",
    slug: typeof product.slug === "string" ? product.slug : "",
    code: typeof product.code === "string" ? product.code : "",

    description:
      typeof product.description === "string" ? product.description : "",
    descriptionAr:
      typeof product.descriptionAr === "string" ? product.descriptionAr : "",

    tag: typeof product.tag === "string" ? product.tag : "",
    tagAr: typeof product.tagAr === "string" ? product.tagAr : "",

    colors: Array.isArray(product.colors) ? (product.colors as string[]) : [],

    thumbnailImage:
      typeof product.thumbnailImage === "string" ? product.thumbnailImage : "",
    images,

    fabricType:
      typeof product.fabricType === "string" ? product.fabricType : "",
    fabricTypeAr:
      typeof product.fabricTypeAr === "string" ? product.fabricTypeAr : "",

    tailorName:
      typeof product.tailorName === "string" ? product.tailorName : "",
    tailorNameAr:
      typeof product.tailorNameAr === "string" ? product.tailorNameAr : "",

    fabricShopId:
      typeof product.fabricShopId === "string"
        ? product.fabricShopId
        : product.fabricShopId &&
            typeof product.fabricShopId === "object" &&
            "_id" in product.fabricShopId
          ? (product.fabricShopId as { _id: string })._id
          : "",

    fabricId:
      typeof product.fabricId === "string"
        ? product.fabricId
        : product.fabricId &&
            typeof product.fabricId === "object" &&
            "_id" in product.fabricId
          ? (product.fabricId as { _id: string })._id
          : "",

    tailorShopId:
      typeof product.tailorShopId === "string"
        ? product.tailorShopId
        : product.tailorShopId &&
            typeof product.tailorShopId === "object" &&
            "_id" in product.tailorShopId
          ? (product.tailorShopId as { _id: string })._id
          : "",

    designId:
      typeof product.designId === "string"
        ? product.designId
        : product.designId &&
            typeof product.designId === "object" &&
            "_id" in product.designId
          ? (product.designId as { _id: string })._id
          : "",

    pickupAddress: pickupFromApi(product),

    metersPerFabric:
      typeof product.metersPerFabric === "number" ? product.metersPerFabric : 0,

    fabricPriceAED:
      typeof product.fabricPriceAED === "number" ? product.fabricPriceAED : 0,
    mukhawarPriceAED:
      typeof product.mukhawarPriceAED === "number"
        ? product.mukhawarPriceAED
        : 0,
    finalSellingPriceAED:
      typeof product.finalSellingPriceAED === "number"
        ? product.finalSellingPriceAED
        : 0,

    availableFabricStock:
      typeof product.availableFabricStock === "number"
        ? product.availableFabricStock
        : 0,

    minAge: typeof product.minAge === "number" ? product.minAge : 0,
    maxAge: typeof product.maxAge === "number" ? product.maxAge : 0,

    isActive: typeof product.isActive === "boolean" ? product.isActive : true,
  };
}

export function toApiPayload(form: ReadyMadeFormData): Record<string, unknown> {
  return {
    name: form.name.trim(),
    nameAr: form.nameAr.trim(),

    code: form.code.trim(),

    slug: resolveSlug(form),

    description: form.description.trim(),
    descriptionAr: form.descriptionAr.trim(),

    tag: form.tag.trim(),
    tagAr: form.tagAr.trim(),

    colors: form.colors,

    thumbnailImage: form.thumbnailImage,

    images: form.images.filter((img) => img.trim() !== ""),

    fabricType: form.fabricType,
    fabricTypeAr: form.fabricTypeAr,

    tailorName: form.tailorName,
    tailorNameAr: form.tailorNameAr,

    fabricShopId: form.fabricShopId || null,
    fabricId: form.fabricId || null,
    tailorShopId: form.tailorShopId || null,
    designId: form.designId || null,

    pickupAddress: form.pickupAddress,

    metersPerFabric: form.metersPerFabric,

    fabricPriceAED: form.fabricPriceAED,
    mukhawarPriceAED: form.mukhawarPriceAED,
    finalSellingPriceAED: form.finalSellingPriceAED,

    availableFabricStock: form.availableFabricStock,

    minAge: form.minAge,
    maxAge: form.maxAge,

    isActive: form.isActive,
  };
}
