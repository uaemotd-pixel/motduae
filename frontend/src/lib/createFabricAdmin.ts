import {
  WARA_TO_METERS,
  FABRIC_UNITS,
  type FabricUnitValue,
} from "@/lib/fabrics";

export const FABRIC_MATERIALS = [
  { value: "chiffon", en: "Chiffon", ar: "شيفون" },
  { value: "silk velvet", en: "Silk Velvet", ar: "مخمل حرير" },
  {
    value: "tana linen cotton",
    en: "Tana Linen Cotton",
    ar: "تانة قطن الكتان",
  },
] as const;
export type FabricMaterialValue = (typeof FABRIC_MATERIALS)[number]["value"];

export const FABRIC_TAGS = [
  { value: "new", en: "New", ar: "جديد" },
  { value: "bestseller", en: "Bestseller", ar: "الأكثر مبيعاً" },
  { value: "premium", en: "Premium", ar: "ممتاز" },
  { value: "limited", en: "Limited", ar: "محدود" },
  { value: "exclusive", en: "Exclusive", ar: "حصري" }, // replaced Eid Special
  { value: "trending", en: "Trending", ar: "رائج" },
  { value: "handmade", en: "Handmade", ar: "يدوي" },
] as const;
export type FabricTagValue = (typeof FABRIC_TAGS)[number]["value"];

// UAE Emirates (unchanged)
export const UAE_EMIRATES = [
  { value: "abu-dhabi", en: "Abu Dhabi", ar: "أبو ظبي" },
  { value: "dubai", en: "Dubai", ar: "دبي" },
  { value: "sharjah", en: "Sharjah", ar: "الشارقة" },
  { value: "ajman", en: "Ajman", ar: "عجمان" },
  { value: "umm-al-quwain", en: "Umm Al Quwain", ar: "أم القيوين" },
  { value: "ras-al-khaimah", en: "Ras Al Khaimah", ar: "رأس الخيمة" },
  { value: "fujairah", en: "Fujairah", ar: "الفجيرة" },
];

// Color options (unchanged)
export const COLOR_OPTIONS = [
  { value: "aqua", en: "Aqua", ar: "أزرق مائي" },
  { value: "aquamarine", en: "Aquamarine", ar: "أزرق بحري" },
  { value: "beige", en: "Beige", ar: "بيج" },
  { value: "bisque", en: "Bisque", ar: "بسكويتي" },
  { value: "black", en: "Black", ar: "أسود" },
  { value: "blue", en: "Blue", ar: "أزرق" },
  { value: "blueviolet", en: "Blue Violet", ar: "بنفسجي مزرق" },
  { value: "brown", en: "Brown", ar: "بني" },
  { value: "burlywood", en: "Burlywood", ar: "بني فاتح" },
  { value: "cadetblue", en: "Cadet Blue", ar: "أزرق كاديت" },
  { value: "chocolate", en: "Chocolate", ar: "شوكولاتة" },
  { value: "coral", en: "Coral", ar: "مرجاني" },
  { value: "cornflowerblue", en: "Cornflower Blue", ar: "أزرق ردة الذرة" },
  { value: "cornsilk", en: "Cornsilk", ar: "حرير الذرة" },
  { value: "crimson", en: "Crimson", ar: "قرمزي" },
  { value: "cyan", en: "Cyan", ar: "سيان" },
  { value: "darkblue", en: "Dark Blue", ar: "أزرق غامق" },
  { value: "darkcyan", en: "Dark Cyan", ar: "سيان غامق" },
  { value: "darkgoldenrod", en: "Dark Goldenrod", ar: "ذهبي غامق" },
  { value: "darkgray", en: "Dark Gray", ar: "رمادي غامق" },
  { value: "darkgreen", en: "Dark Green", ar: "أخضر غامق" },
  { value: "darkkhaki", en: "Dark Khaki", ar: "كاكي غامق" },
  { value: "darkmagenta", en: "Dark Magenta", ar: "أرجواني غامق" },
  { value: "darkorchid", en: "Dark Orchid", ar: "أوركيد غامق" },
  { value: "darkred", en: "Dark Red", ar: "أحمر غامق" },
  { value: "darksalmon", en: "Dark Salmon", ar: "سلمون غامق" },
  { value: "darkseagreen", en: "Dark Sea Green", ar: "أخضر بحري غامق" },
  { value: "darkslateblue", en: "Dark Slate Blue", ar: "أزرق أردوازي غامق" },
  { value: "darkslategray", en: "Dark Slate Gray", ar: "رمادي أردوازي غامق" },
  { value: "darkturquoise", en: "Dark Turquoise", ar: "فيروزي غامق" },
  { value: "darkviolet", en: "Dark Violet", ar: "بنفسجي غامق" },
  { value: "deeppink", en: "Deep Pink", ar: "وردي غامق" },
  { value: "deepskyblue", en: "Deep Sky Blue", ar: "أزرق سماوي غامق" },
  { value: "dimgray", en: "Dim Gray", ar: "رمادي خافت" },
  { value: "dodgerblue", en: "Dodger Blue", ar: "أزرق دودجر" },
  { value: "firebrick", en: "Firebrick", ar: "أحمر طوب" },
  { value: "fuchsia", en: "Fuchsia", ar: "فوشيا" },
  { value: "gainsboro", en: "Gainsboro", ar: "رمادي فاتح" },
  { value: "gold", en: "Gold", ar: "ذهبي" },
  { value: "goldenrod", en: "Goldenrod", ar: "ذهبي محمر" },
  { value: "gray", en: "Gray", ar: "رمادي" },
  { value: "green", en: "Green", ar: "أخضر" },
  { value: "greenyellow", en: "Green Yellow", ar: "أصفر مخضر" },
  { value: "grey", en: "Grey", ar: "رمادي" },
  { value: "hotpink", en: "Hot Pink", ar: "وردي ساخن" },
  { value: "indianred", en: "Indian Red", ar: "أحمر هندي" },
  { value: "indigo", en: "Indigo", ar: "نيلي" },
  { value: "ivory", en: "Ivory", ar: "عاجي" },
  { value: "khaki", en: "Khaki", ar: "كاكي" },
  { value: "lavender", en: "Lavender", ar: "لافندر" },
  { value: "lightblue", en: "Light Blue", ar: "أزرق فاتح" },
  { value: "lightgray", en: "Light Gray", ar: "رمادي فاتح" },
  { value: "lightgreen", en: "Light Green", ar: "أخضر فاتح" },
  { value: "lightpink", en: "Light Pink", ar: "وردي فاتح" },
  { value: "lightsalmon", en: "Light Salmon", ar: "سلمون فاتح" },
  { value: "lightseagreen", en: "Light Sea Green", ar: "أخضر بحري فاتح" },
  { value: "lightskyblue", en: "Light Sky Blue", ar: "أزرق سماوي فاتح" },
  { value: "lightslategray", en: "Light Slate Gray", ar: "رمادي أردوازي فاتح" },
  { value: "lightsteelblue", en: "Light Steel Blue", ar: "أزرق فولاذي فاتح" },
  { value: "maroon", en: "Maroon", ar: "كستنائي" },
  { value: "mediumblue", en: "Medium Blue", ar: "أزرق متوسط" },
  { value: "mediumpurple", en: "Medium Purple", ar: "بنفسجي متوسط" },
  { value: "mediumseagreen", en: "Medium Sea Green", ar: "أخضر بحري متوسط" },
  {
    value: "mediumslateblue",
    en: "Medium Slate Blue",
    ar: "أزرق أردوازي متوسط",
  },
  { value: "mediumturquoise", en: "Medium Turquoise", ar: "فيروزي متوسط" },
  {
    value: "mediumvioletred",
    en: "Medium Violet Red",
    ar: "أحمر بنفسجي متوسط",
  },
  { value: "midnightblue", en: "Midnight Blue", ar: "أزرق منتصف الليل" },
  { value: "moccasin", en: "Moccasin", ar: "موكاسين" },
  { value: "navy", en: "Navy Blue", ar: "كحلي" },
  { value: "olive", en: "Olive", ar: "زيتوني" },
  { value: "olivedrab", en: "Olive Drab", ar: "زيتوني باهت" },
  { value: "orange", en: "Orange", ar: "برتقالي" },
  { value: "orchid", en: "Orchid", ar: "أوركيد" },
  { value: "palegoldenrod", en: "Pale Goldenrod", ar: "ذهبي باهت" },
  { value: "palegreen", en: "Pale Green", ar: "أخضر باهت" },
  { value: "paleturquoise", en: "Pale Turquoise", ar: "فيروزي باهت" },
  { value: "palevioletred", en: "Pale Violet Red", ar: "أحمر بنفسجي باهت" },
  { value: "peachpuff", en: "Peach Puff", ar: "خوخي" },
  { value: "pink", en: "Pink", ar: "وردي" },
  { value: "plum", en: "Plum", ar: "برقوقي" },
  { value: "powderblue", en: "Powder Blue", ar: "أزرق بودرة" },
  { value: "purple", en: "Purple", ar: "بنفسجي" },
  { value: "rebeccapurple", en: "Rebecca Purple", ar: "بنفسجي ريبيكا" },
  { value: "red", en: "Red", ar: "أحمر" },
  { value: "rosybrown", en: "Rosy Brown", ar: "بني وردي" },
  { value: "royalblue", en: "Royal Blue", ar: "أزرق ملكي" },
  { value: "saddlebrown", en: "Saddle Brown", ar: "بني السرج" },
  { value: "salmon", en: "Salmon", ar: "سلمون" },
  { value: "sandybrown", en: "Sandy Brown", ar: "بني رملي" },
  { value: "seagreen", en: "Sea Green", ar: "أخضر بحري" },
  { value: "silver", en: "Silver", ar: "فضي" },
  { value: "skyblue", en: "Sky Blue", ar: "أزرق سماوي" },
  { value: "slateblue", en: "Slate Blue", ar: "أزرق أردوازي" },
  { value: "slategray", en: "Slate Gray", ar: "رمادي أردوازي" },
  { value: "steelblue", en: "Steel Blue", ar: "أزرق فولاذي" },
  { value: "tan", en: "Tan", ar: "سمراء" },
  { value: "teal", en: "Teal", ar: "بطي" },
  { value: "thistle", en: "Thistle", ar: "شوكي" },
  { value: "tomato", en: "Tomato", ar: "طماطمي" },
  { value: "turquoise", en: "Turquoise", ar: "فيروزي" },
  { value: "violet", en: "Violet", ar: "بنفسجي" },
  { value: "wheat", en: "Wheat", ar: "قمحي" },
  { value: "white", en: "White", ar: "أبيض" },
  { value: "yellow", en: "Yellow", ar: "أصفر" },
  { value: "yellowgreen", en: "Yellow Green", ar: "أصفر مخضر" },
];

export interface PickupAddress {
  emirate: string;
  city: string;
  street: string;
  building: string;
  phone: string;
}

export interface FabricFormData {
  name: string;
  nameAr: string;
  slug: string;
  description: string;
  descriptionAr: string;
  images: string[];
  material: FabricMaterialValue | "";
  materialAr: string; // stores Arabic label
  colors: string[];
  tag: string; // stores English value
  tagAr: string; // stores Arabic label
  fabricUnit: FabricUnitValue; // NEW
  pricePerUnit: number | string;
  pricePerMeter: number | string;
  stockInMeters: number | string;
  listedByStore: string;
  pickupAddress: PickupAddress;
  isActive: boolean;
}

// ... helper functions (slugFromName, etc.) remain unchanged ...

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
    fabricUnit: "meters",
    pricePerUnit: 0,
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
  };
}

export function fromApiFabric(
  product: Record<string, unknown>,
): FabricFormData {
  const defaultForm = defaultFabricForm();

  let material: FabricMaterialValue | "" = "";
  if (typeof product.material === "string") {
    const found = FABRIC_MATERIALS.find((m) => m.value === product.material);
    if (found) material = found.value;
  }

  const materialAr =
    typeof product.materialAr === "string" ? product.materialAr : "";
  const tag = typeof product.tag === "string" ? product.tag : "";
  const tagAr = typeof product.tagAr === "string" ? product.tagAr : "";
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
  const colors = Array.isArray(product.colors)
    ? product.colors.filter(
        (color): color is string => typeof color === "string",
      )
    : defaultForm.colors;
  const pricePerMeter = Number(product.pricePerMeter); // Always meters
  const stockInMeters = Number(product.stockInMeters); // Always meters
  const fabricUnit = (product.fabricUnit as FabricUnitValue) || "meters";
  const listedByStore =
    typeof product.listedByStore === "string" ? product.listedByStore : "";
  // Convert for display
  let pricePerUnit = pricePerMeter;
  if (fabricUnit === "wara") {
    pricePerUnit = pricePerMeter / WARA_TO_METERS; // meters → wara
  }

  const pickupAddress = (() => {
    // Backend stores these under `storePickupAddress`.
    const source =
      typeof (product as any).storePickupAddress === "object" &&
      (product as any).storePickupAddress !== null
        ? (product as any).storePickupAddress
        : (product as any).pickupAddress; // backward-compat if older docs used `pickupAddress`

    return typeof source === "object" && source !== null
      ? {
          emirate: typeof source.emirate === "string" ? source.emirate : "",
          city: typeof source.city === "string" ? source.city : "",
          street: typeof source.street === "string" ? source.street : "",
          building: typeof source.building === "string" ? source.building : "",
          phone: typeof source.phone === "string" ? source.phone : "",
        }
      : defaultForm.pickupAddress;
  })();
  const isActive =
    typeof product.isActive === "boolean"
      ? product.isActive
      : defaultForm.isActive;

  return {
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
    fabricUnit, // NEW
    pricePerUnit, // NEW
    pricePerMeter,
    stockInMeters,
    listedByStore,
    pickupAddress,
    isActive,
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

export function toFabricApiPayload(
  form: FabricFormData,
  options?: { includeIsActive?: boolean },
): Record<string, unknown> {
  const name = form.name.trim();

  // normalize numeric value
  const pricePerMeter =
    form.fabricUnit === "wara"
      ? Number(form.pricePerUnit) * WARA_TO_METERS // wara → meters
      : Number(form.pricePerUnit); // already meters

  const stockInMeters = Number(form.stockInMeters);

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
    fabricUnit: form.fabricUnit, // NEW - store unit for display
    pricePerMeter: Number(pricePerMeter.toFixed(2)), // Store in meters
    stockInMeters: Number(stockInMeters.toFixed(2)), // Store in meters
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

function isValidObjectId(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value);
}

export function validateFabricForm(
  form: FabricFormData,
  validation:
    | {
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
      }
    | {
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
  // ... required validations ...
  if (!form.material) {
    errors.material = "Material (EN) is required";
  }
  if (!form.materialAr) {
    errors.materialAr = "Material Type (AR) is required";
  }
  if (!form.listedByStore.trim()) {
    errors.listedByStore = "Store partner is required";
  } else if (
    form.listedByStore !== "MOTD" &&
    !isValidObjectId(form.listedByStore)
  ) {
    errors.listedByStore = "Invalid store partner ID";
  }

  const priceVal = Number(form.pricePerUnit); // <-- Use pricePerUnit
  if (isNaN(priceVal) || priceVal <= 0) {
    errors.pricePerUnit = "Please enter a valid price"; // <-- Use pricePerUnit
  }

  const stockVal = Number(form.stockInMeters);
  if (isNaN(stockVal) || stockVal < 0) {
    errors.stockInMeters = "Please enter a valid stock amount";
  }

  // Pickup address validations
  if (!form.pickupAddress.emirate?.trim()) {
    errors["pickupAddress.emirate"] = "Emirate is required";
  }
  if (!form.pickupAddress.city?.trim()) {
    errors["pickupAddress.city"] = "City is required";
  }
  if (!form.pickupAddress.street?.trim()) {
    errors["pickupAddress.street"] = "Street is required";
  }
  if (!form.pickupAddress.building?.trim()) {
    errors["pickupAddress.building"] = "Building is required";
  }
  if (!form.pickupAddress.phone?.trim()) {
    errors["pickupAddress.phone"] = "Phone is required";
  } else if (!/^\d{9}$/.test(form.pickupAddress.phone.trim())) {
    errors["pickupAddress.phone"] = "Phone number must be exactly 9 digits";
  }

  return errors;
}
