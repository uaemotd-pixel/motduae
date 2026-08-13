// lib/createFabricAdmin.ts
import { isValidUaePhone, normalizeUaePhone } from "./uaePhone";
import {
  UAE_EMIRATES,
  isValidEmirate,
  normalizeEmirate,
  getEmirateEn,
  getEmirateAr,
} from "@/lib/uaeAddress";

export interface PickupAddress {
  emirate: string;
  city: string;
  street: string;
  building: string;
  phone: string;
}

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
  pricePerMeter: number | string;
  stockInMeters: number | string;
  listedByStore: string;
  pickupAddress: PickupAddress;
  isActive: boolean;
  variants?: FabricFormData[];
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
    pricePerMeter: 0,
    stockInMeters: 0,
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

function slugFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveSlug(form: FabricFormData): string {
  const slug = form.slug.trim();
  return slug || slugFromName(form.name);
}

function isDataUrl(value: string): boolean {
  return /^data:[^,]+,/.test(value.trim());
}

function isValidObjectId(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value);
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
  const pricePerMeter = Number(product.pricePerMeter) || 0;
  const stockInMeters = Number(product.stockInMeters) || 0;
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
  const variants = rawVariants.map((v: any) => fromApiFabric(v));

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
    pricePerMeter,
    stockInMeters,
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

  // Normalize emirate before sending
  const normalizedEmirate = normalizeEmirate(form.pickupAddress.emirate);

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
    pricePerMeter: Number(Number(form.pricePerMeter).toFixed(2)),
    stockInMeters: Number(Number(form.stockInMeters).toFixed(2)),
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
      pricePerMeter: Number(Number(v.pricePerMeter).toFixed(2)),
      stockInMeters: Number(Number(v.stockInMeters).toFixed(2)),
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

  if (options?.includeIsActive && form.isActive !== undefined) {
    payload.isActive = form.isActive;
  }

  return payload;
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

  const priceVal = Number(form.pricePerMeter);
  if (isNaN(priceVal) || priceVal <= 0) {
    errors.pricePerMeter =
      validation.price_required || "Please enter a valid price";
  }

  const stockVal = Number(form.stockInMeters);
  if (isNaN(stockVal) || stockVal < 0) {
    errors.stockInMeters = "Please enter a valid stock amount";
  }

  // Pickup address validations using uaeAddress utilities
  if (!form.pickupAddress.emirate?.trim()) {
    errors["pickupAddress.emirate"] =
      validation.emirate_required || "Emirate is required";
  } else {
    const normalizedEmirate = normalizeEmirate(form.pickupAddress.emirate);
    if (!isValidEmirate(normalizedEmirate)) {
      errors["pickupAddress.emirate"] = "Valid UAE emirate required";
    } else {
      // Normalize the emirate in form data
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
      // Normalize the phone in form data
      form.pickupAddress.phone = normalizedPhone;
    }
  }

  // Images validation
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
      const vPrice = Number(v.pricePerMeter);
      if (isNaN(vPrice) || vPrice <= 0) {
        errors[`${prefix}.pricePerMeter`] =
          "Please enter a valid price for variant";
      }
      const vStock = Number(v.stockInMeters);
      if (isNaN(vStock) || vStock < 0) {
        errors[`${prefix}.stockInMeters`] =
          "Please enter a valid stock for variant";
      }
      if (!v.images?.some((img) => img.trim())) {
        errors[`${prefix}.images`] =
          "At least one image is required for variant";
      }

      // Validate variant pickup address emirate
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

      // Validate variant pickup address phone
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

// Helper to get emirate display values
export function getEmirateDisplay(emirate: string): string {
  return `${getEmirateEn(emirate)} / ${getEmirateAr(emirate)}`;
}

// Helper to get emirate options for dropdown
export function getEmirateOptions() {
  return UAE_EMIRATES.map((e) => ({
    value: e.value,
    label: `${e.en} / ${e.ar}`,
  }));
}
