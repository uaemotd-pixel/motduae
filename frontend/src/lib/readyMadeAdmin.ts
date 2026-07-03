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

  metersPerFabric: number;

  fabricPriceAED: number;
  mukhawarPriceAED: number;
  finalSellingPriceAED: number;

  availableFabricStock: number;

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
    images: [""], // start with one empty image field

    fabricType: "",
    fabricTypeAr: "",

    tailorName: "",
    tailorNameAr: "",

    fabricShopId: "",
    fabricId: "",
    tailorShopId: "",
    designId: "",

    metersPerFabric: 0,

    fabricPriceAED: 0,
    mukhawarPriceAED: 0,
    finalSellingPriceAED: 0,

    availableFabricStock: 0,

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
    images = [""]; // ensure at least one slot
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
        : product.fabricShopId && typeof product.fabricShopId === "object" && "_id" in product.fabricShopId
        ? (product.fabricShopId as { _id: string })._id
        : "",

    fabricId:
      typeof product.fabricId === "string"
        ? product.fabricId
        : product.fabricId && typeof product.fabricId === "object" && "_id" in product.fabricId
        ? (product.fabricId as { _id: string })._id
        : "",

    tailorShopId:
      typeof product.tailorShopId === "string"
        ? product.tailorShopId
        : product.tailorShopId && typeof product.tailorShopId === "object" && "_id" in product.tailorShopId
        ? (product.tailorShopId as { _id: string })._id
        : "",

    designId:
      typeof product.designId === "string"
        ? product.designId
        : product.designId && typeof product.designId === "object" && "_id" in product.designId
        ? (product.designId as { _id: string })._id
        : "",

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

    fabricShopId: form.fabricShopId,
    fabricId: form.fabricId,
    tailorShopId: form.tailorShopId || null,
    designId: form.designId || null,

    metersPerFabric: form.metersPerFabric,

    fabricPriceAED: form.fabricPriceAED,
    mukhawarPriceAED: form.mukhawarPriceAED,
    finalSellingPriceAED: form.finalSellingPriceAED,

    availableFabricStock: form.availableFabricStock,

    isActive: form.isActive,
  };
}
