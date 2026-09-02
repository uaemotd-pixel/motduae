// lib/createFabricAdmin.ts
import { isValidUaePhone, normalizeUaePhone } from "./uaePhone";
import {
  UAE_EMIRATES,
  isValidEmirate,
  normalizeEmirate,
  getEmirateEn,
  getEmirateAr,
} from "@/lib/uaeAddress";
import type { CutUnit } from "@/lib/fabricUnits";

export interface PickupAddress {
  emirate: string;
  city: string;
  street: string;
  building: string;
  phone: string;
}

export interface FabricCutFormEntry {
  cutId: string;
  price: number | string;
  stock: number | string;
  cutName?: string;
  cutNameAr?: string;
  cutValue?: number;
  cutUnit?: CutUnit;
  lengthInMeters?: number;
}

export type FabricVariantFormData = Omit<FabricFormData, "minAge" | "maxAge">;

export interface FabricFormData {
  _id?: string;
  name: string;
  nameAr: string;
  slug: string;
  description: string;
  descriptionAr: string;
  images: string[];
  material: string;
  materialAr: string;
  colors: string[];
  tag: string;
  tagAr: string;
  cuts: FabricCutFormEntry[];
  /** Computed on API for listing/display — not sent on create */
  pricePerMeter?: number;
  stockInMeters?: number;
  minAge: number | null;
  maxAge: number | null;
  listedByStore: string;
  pickupAddress: PickupAddress;
  isActive: boolean;
  variants?: FabricVariantFormData[];
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
    materialAr: "",
    colors: [],
    tag: "",
    tagAr: "",
    cuts: [],
    minAge: null,
    maxAge: null,
    listedByStore: "",
    pickupAddress: {
      emirate: "",
      city: "",
      street: "",
      building: "",
      phone: "",
    },
    isActive: true,
    variants: [],
  };
}

export function createEmptyFabricCutRow(): FabricCutFormEntry {
  return {
    cutId: "",
    price: "",
    stock: "",
  };
}

export function buildDefaultCutsFromCatalog(
  catalog: Array<{
    _id: string;
    name: string;
    nameAr?: string;
    value: number;
    unit: CutUnit;
    lengthInMeters?: number;
    metersEquivalent?: number;
  }>,
): FabricCutFormEntry[] {
  return catalog.map((cut) => ({
    cutId: cut._id,
    price: "",
    stock: 0,
    cutName: cut.name,
    cutNameAr: cut.nameAr,
    cutValue: cut.value,
    cutUnit: cut.unit,
    lengthInMeters: cut.lengthInMeters ?? cut.metersEquivalent,
  }));
}

function slugFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveSlug(form: { name: string; slug: string }): string {
  const slug = form.slug.trim();
  return slug || slugFromName(form.name);
}

function isDataUrl(value: string): boolean {
  return /^data:[^,]+,/.test(value.trim());
}

function isValidObjectId(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value);
}

function mapApiCutEntry(entry: Record<string, unknown>): FabricCutFormEntry | null {
  const cutRef = entry.cut as Record<string, unknown> | undefined;
  const rawCutId = entry.cutId;
  const cutId =
    typeof rawCutId === "object" &&
    rawCutId !== null &&
    "_id" in rawCutId &&
    rawCutId._id
      ? String(rawCutId._id)
      : typeof rawCutId === "string"
        ? rawCutId
        : "";
  if (!cutId) return null;

  return {
    cutId,
    price: Number(entry.price) || "",
    stock: Number(entry.stock) || 0,
    cutName:
      typeof cutRef?.name === "string"
        ? cutRef.name
        : typeof entry.cutName === "string"
          ? entry.cutName
          : undefined,
    cutNameAr:
      typeof cutRef?.nameAr === "string"
        ? cutRef.nameAr
        : typeof entry.cutNameAr === "string"
          ? entry.cutNameAr
          : undefined,
    cutValue:
      typeof cutRef?.value === "number"
        ? cutRef.value
        : typeof entry.cutValue === "number"
          ? entry.cutValue
          : undefined,
    cutUnit:
      cutRef?.unit === "war" || cutRef?.unit === "meter"
        ? cutRef.unit
        : entry.cutUnit === "war" || entry.cutUnit === "meter"
          ? entry.cutUnit
          : undefined,
    lengthInMeters:
      typeof cutRef?.lengthInMeters === "number"
        ? cutRef.lengthInMeters
        : typeof entry.lengthInMeters === "number"
          ? entry.lengthInMeters
          : undefined,
  };
}

export function serializeFabricCuts(cuts: FabricCutFormEntry[]) {
  return cuts
    .map((entry) => ({
      cutId: entry.cutId,
      price: Number(Number(entry.price).toFixed(2)),
      stock: Math.floor(Number(entry.stock) || 0),
    }))
    .filter(
      (entry) =>
        entry.cutId &&
        Number.isFinite(entry.price) &&
        entry.price > 0 &&
        Number.isFinite(entry.stock) &&
        entry.stock >= 0,
    );
}

export function fromApiFabric(
  product: Record<string, unknown>,
): FabricFormData {
  const defaultForm = defaultFabricForm();

  const name = typeof product.name === "string" ? product.name : "";
  const nameAr = typeof product.nameAr === "string" ? product.nameAr : "";
  const slug = typeof product.slug === "string" ? product.slug : "";
  const description =
    typeof product.description === "string" ? product.description : "";
  const descriptionAr =
    typeof product.descriptionAr === "string" ? product.descriptionAr : "";
  const images = Array.isArray(product.images)
    ? product.images.filter((img): img is string => typeof img === "string")
    : defaultForm.images;
  const material = typeof product.material === "string" ? product.material : "";
  const materialAr =
    typeof product.materialAr === "string" ? product.materialAr : "";
  const colors = Array.isArray(product.colors)
    ? product.colors.filter(
        (color): color is string => typeof color === "string",
      )
    : defaultForm.colors;
  const tag = typeof product.tag === "string" ? product.tag : "";
  const tagAr = typeof product.tagAr === "string" ? product.tagAr : "";
  const cuts = Array.isArray(product.cuts)
    ? product.cuts
        .map((entry) =>
          mapApiCutEntry(entry as Record<string, unknown>),
        )
        .filter((entry): entry is FabricCutFormEntry => entry !== null)
    : defaultForm.cuts;
  const minAge =
    product.minAge !== undefined && product.minAge !== null
      ? Number(product.minAge)
      : null;
  const maxAge =
    product.maxAge !== undefined && product.maxAge !== null
      ? Number(product.maxAge)
      : null;
  const listedByStore =
    typeof product.listedByStore === "string" ? product.listedByStore : "";

  const pickupAddress = (() => {
    const source =
      typeof (product as any).storePickupAddress === "object" &&
      (product as any).storePickupAddress !== null
        ? (product as any).storePickupAddress
        : (product as any).pickupAddress;

    return typeof source === "object" && source !== null
      ? {
          emirate: typeof source.emirate === "string" ? source.emirate : "",
          city: typeof source.city === "string" ? source.city : "",
          street: typeof source.street === "string" ? source.street : "",
          building: typeof source.building === "string" ? source.building : "",
          phone:
            typeof source.phone === "string"
              ? normalizeUaePhone(source.phone)
              : "",
        }
      : defaultForm.pickupAddress;
  })();

  const isActive =
    typeof product.isActive === "boolean"
      ? product.isActive
      : defaultForm.isActive;

  const rawVariants = Array.isArray(product.variants) ? product.variants : [];
  const variants = rawVariants.map((v: any) => {
    const base = fromApiFabric(v);
    const { minAge: _, maxAge: __, ...variantWithoutAge } = base;
    return variantWithoutAge;
  });

  return {
    _id: typeof product._id === "string" ? product._id : undefined,
    name,
    nameAr,
    slug,
    description,
    descriptionAr,
    images,
    material,
    materialAr,
    colors,
    tag,
    tagAr,
    cuts,
    pricePerMeter:
      typeof product.pricePerMeter === "number"
        ? product.pricePerMeter
        : undefined,
    stockInMeters:
      typeof product.stockInMeters === "number"
        ? product.stockInMeters
        : undefined,
    minAge,
    maxAge,
    listedByStore,
    pickupAddress,
    isActive,
    variants,
  };
}

export function toFabricApiPayload(
  form: FabricFormData,
  options?: { includeIsActive?: boolean },
): Record<string, unknown> {
  const name = form.name.trim();
  const normalizedEmirate = normalizeEmirate(form.pickupAddress.emirate);
  const serializedCuts = serializeFabricCuts(form.cuts || []);

  const payload: Record<string, unknown> = {
    name,
    nameAr: form.nameAr.trim() || name,
    slug: resolveSlug(form),
    description: form.description.trim(),
    descriptionAr: form.descriptionAr.trim() || form.description.trim(),
    images: form.images.filter((url) => url.trim() !== "" && !isDataUrl(url)),
    material: form.material,
    materialAr: form.materialAr.trim(),
    colors: form.colors,
    tag: form.tag,
    tagAr: form.tagAr.trim(),
    cuts: serializedCuts,
    listedByStore: form.listedByStore.trim(),
    storePickupAddress: {
      emirate: normalizedEmirate,
      city: form.pickupAddress.city.trim(),
      street: form.pickupAddress.street?.trim() || "",
      building: form.pickupAddress.building?.trim() || "",
      phone: normalizeUaePhone(form.pickupAddress.phone?.trim() || ""),
    },
    variants: form.variants?.map((v) => ({
      _id: v._id,
      name: v.name.trim(),
      nameAr: v.nameAr.trim(),
      slug: resolveSlug(v),
      description: v.description.trim(),
      descriptionAr: v.descriptionAr.trim() || v.description.trim(),
      images: v.images.filter((url) => url.trim() !== "" && !isDataUrl(url)),
      material: v.material,
      materialAr: v.materialAr.trim(),
      colors: v.colors,
      tag: v.tag,
      tagAr: v.tagAr.trim(),
      cuts: serializeFabricCuts(v.cuts || []),
      isActive: v.isActive,
      storePickupAddress: v.pickupAddress
        ? {
            emirate: normalizeEmirate(v.pickupAddress.emirate),
            city: v.pickupAddress.city?.trim() || "",
            street: v.pickupAddress.street?.trim() || "",
            building: v.pickupAddress.building?.trim() || "",
            phone: normalizeUaePhone(v.pickupAddress.phone?.trim() || ""),
          }
        : undefined,
    })),
  };

  if (form.minAge !== null && form.minAge !== undefined) {
    payload.minAge = Number(form.minAge);
  }
  if (form.maxAge !== null && form.maxAge !== undefined) {
    payload.maxAge = Number(form.maxAge);
  }

  if (options?.includeIsActive && form.isActive !== undefined) {
    payload.isActive = form.isActive;
  }

  return payload;
}

export function mapApiCutsArray(cuts: unknown): FabricCutFormEntry[] {
  if (!Array.isArray(cuts)) return [];
  return cuts
    .map((entry) => mapApiCutEntry(entry as Record<string, unknown>))
    .filter((entry): entry is FabricCutFormEntry => entry !== null);
}

export function validateFabricCuts(
  cuts: FabricCutFormEntry[],
  errors: Record<string, string>,
  prefix = "cuts",
) {
  const validCuts = cuts.filter((entry) => {
    const price = Number(entry.price);
    return entry.cutId && Number.isFinite(price) && price > 0;
  });

  if (validCuts.length === 0) {
    errors[prefix] = "At least one cut with a valid price is required";
    return;
  }

  cuts.forEach((entry, index) => {
    const price = Number(entry.price);
    const stock = Number(entry.stock);
    const rowPrefix = `${prefix}.${index}`;

    if (!entry.cutId) {
      errors[`${rowPrefix}.cutId`] = "Cut is required";
    }

    if (entry.price !== "" && entry.price !== undefined) {
      if (!Number.isFinite(price) || price <= 0) {
        errors[`${rowPrefix}.price`] = "Enter a valid price greater than 0";
      }
    }

    if (entry.stock !== "" && entry.stock !== undefined) {
      if (!Number.isFinite(stock) || stock < 0) {
        errors[`${rowPrefix}.stock`] = "Stock must be 0 or greater";
      }
    }
  });
}

export function validateFabricForm(
  form: FabricFormData,
  validation: {
    name_required: string;
    name_ar_required: string;
    description_required: string;
    description_ar_required: string;
    material_required: string;
    color_required: string;
    city_required: string;
    tag_required: string;
    tag_color_required: string;
    price_required: string;
    store_partner_required: string;
    store_partner_invalid: string;
    emirate_required: string;
    pickup_city_required: string;
    images_required: string;
    images_max: string;
    image_upload_pending: string;
  },
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!form.name.trim()) {
    errors.name = validation.name_required || "Name (EN) is required";
  }
  if (!form.nameAr.trim()) {
    errors.nameAr = validation.name_ar_required || "Name (AR) is required";
  }
  if (!form.material) {
    errors.material =
      validation.material_required || "Material (EN) is required";
  }
  if (!form.materialAr.trim()) {
    errors.materialAr = "Material (AR) is required";
  }
  if (!form.colors || form.colors.length === 0) {
    errors.color =
      validation.color_required || "At least one color is required";
  }
  if (!form.listedByStore.trim()) {
    errors.listedByStore =
      validation.store_partner_required || "Store partner is required";
  } else if (
    form.listedByStore !== "MOTD" &&
    !isValidObjectId(form.listedByStore)
  ) {
    errors.listedByStore =
      validation.store_partner_invalid || "Invalid store partner ID";
  }

  validateFabricCuts(form.cuts || [], errors, "cuts");

  Object.assign(errors, getFabricAgeFieldErrors(form));

  if (!form.pickupAddress.emirate?.trim()) {
    errors["pickupAddress.emirate"] =
      validation.emirate_required || "Emirate is required";
  } else {
    const normalizedEmirate = normalizeEmirate(form.pickupAddress.emirate);
    if (!isValidEmirate(normalizedEmirate)) {
      errors["pickupAddress.emirate"] = "Valid UAE emirate required";
    } else {
      form.pickupAddress.emirate = normalizedEmirate;
    }
  }

  if (!form.pickupAddress.city?.trim()) {
    errors["pickupAddress.city"] =
      validation.pickup_city_required || "City is required";
  }
  if (!form.pickupAddress.street?.trim()) {
    errors["pickupAddress.street"] = "Street is required";
  }
  if (!form.pickupAddress.building?.trim()) {
    errors["pickupAddress.building"] = "Building is required";
  }
  if (!form.pickupAddress.phone?.trim()) {
    errors["pickupAddress.phone"] = "Phone number is required";
  } else {
    const normalizedPhone = normalizeUaePhone(form.pickupAddress.phone.trim());
    if (!isValidUaePhone(normalizedPhone)) {
      errors["pickupAddress.phone"] =
        "Invalid UAE phone. Must be +971 followed by 9 digits";
    } else {
      form.pickupAddress.phone = normalizedPhone;
    }
  }

  const hasImage = form.images.some((img) => img.trim() !== "");
  if (!hasImage) {
    errors.images =
      validation.images_required || "At least one image is required";
  }

  if (Array.isArray(form.variants) && form.variants.length > 0) {
    form.variants.forEach((v, i) => {
      const prefix = `variants.${i}`;
      if (!v.name?.trim()) {
        errors[`${prefix}.name`] = "Name (EN) is required for variant";
      }
      if (!v.nameAr?.trim()) {
        errors[`${prefix}.nameAr`] = "Name (AR) is required for variant";
      }
      if (!v.slug?.trim()) {
        errors[`${prefix}.slug`] = "Slug is required for variant";
      } else if (
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v.slug.trim().toLowerCase())
      ) {
        errors[`${prefix}.slug`] = "Slug is invalid for variant";
      }
      if (!v.material) {
        errors[`${prefix}.material`] = "Material (EN) is required for variant";
      }
      if (!v.materialAr?.trim()) {
        errors[`${prefix}.materialAr`] =
          "Material (AR) is required for variant";
      }
      validateFabricCuts(v.cuts || [], errors, `${prefix}.cuts`);

      if (!v.images?.some((img) => img.trim())) {
        errors[`${prefix}.images`] =
          "At least one image is required for variant";
      }

      if (v.pickupAddress?.emirate) {
        const normalizedVariantEmirate = normalizeEmirate(
          v.pickupAddress.emirate,
        );
        if (!isValidEmirate(normalizedVariantEmirate)) {
          errors[`${prefix}.pickupAddress.emirate`] =
            "Valid UAE emirate required for variant";
        } else {
          v.pickupAddress.emirate = normalizedVariantEmirate;
        }
      }

      if (v.pickupAddress?.phone) {
        const normalizedVariantPhone = normalizeUaePhone(
          v.pickupAddress.phone.trim(),
        );
        if (!isValidUaePhone(normalizedVariantPhone)) {
          errors[`${prefix}.pickupAddress.phone`] =
            "Invalid UAE phone for variant. Must be +971 followed by 9 digits";
        } else {
          v.pickupAddress.phone = normalizedVariantPhone;
        }
      }
    });
  }

  return errors;
}

export function getFabricAgeFieldErrors(
  form: Pick<FabricFormData, "minAge" | "maxAge">,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const minAge = form.minAge;
  const maxAge = form.maxAge;

  if (minAge != null && (isNaN(minAge) || minAge < 0)) {
    errors.minAge = "Min age must be a positive number";
  }
  if (maxAge != null && (isNaN(maxAge) || maxAge < 0)) {
    errors.maxAge = "Max age must be a positive number";
  }
  if (minAge != null && maxAge != null && minAge > maxAge) {
    errors.minAge = "Min age cannot exceed max age";
    errors.maxAge = "Max age cannot be smaller than min age";
  }

  return errors;
}

export function mapFabricApiErrorToFieldErrors(
  message: string,
): Record<string, string> {
  const trimmedMessage = message.trim();

  if (
    trimmedMessage === "Max age must be greater than or equal to min age" ||
    trimmedMessage === "Max age cannot be smaller than min age" ||
    trimmedMessage === "Min age cannot exceed max age"
  ) {
    return {
      minAge: "Min age cannot exceed max age",
      maxAge: "Max age cannot be smaller than min age",
    };
  }

  if (trimmedMessage.includes("cut")) {
    return { cuts: trimmedMessage };
  }

  return {};
}

export function getEmirateDisplay(emirate: string): string {
  return `${getEmirateEn(emirate)} / ${getEmirateAr(emirate)}`;
}

export function getEmirateOptions() {
  return UAE_EMIRATES.map((e) => ({
    value: e.value,
    label: `${e.en} / ${e.ar}`,
  }));
}
