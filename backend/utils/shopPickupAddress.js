/**
 * Structured shop pickup address helpers for Shipa origins.
 * Shape mirrors customer delivery: fullName, phone, line1, line2, city, emirate.
 */

export function emptyShopPickupAddress() {
  return {
    fullName: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    emirate: "",
  };
}

export function isCompleteShopPickupAddress(address) {
  if (!address || typeof address !== "object") return false;

  const { fullName, phone, line1, city, emirate } = address;
  return Boolean(
    fullName?.trim() &&
      phone?.trim() &&
      line1?.trim() &&
      city?.trim() &&
      emirate?.trim(),
  );
}

export function isEmptyShopPickupAddress(address) {
  if (!address || typeof address !== "object") return true;

  return ["fullName", "phone", "line1", "line2", "city", "emirate"].every(
    (key) => !String(address[key] || "").trim(),
  );
}

export function normalizeShopPickupAddress(address) {
  if (!address || typeof address !== "object") {
    return null;
  }

  const fullName = address.fullName?.trim() || "";
  let phone = address.phone?.trim() || "";
  // Accept +971XXXXXXXXX / 971XXXXXXXXX and store local 9 digits (fabric portal convention)
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("971") && digits.length >= 12) {
    phone = digits.slice(3, 12);
  } else if (/^\d{9}$/.test(digits)) {
    phone = digits;
  }
  const line1 = address.line1?.trim() || "";
  const line2 = address.line2?.trim() || "";
  const city = address.city?.trim() || "";
  const emirate = address.emirate?.trim() || "";

  if (!fullName || !phone || !line1 || !city || !emirate) {
    return null;
  }

  return { fullName, phone, line1, line2, city, emirate };
}

/**
 * Build a shop-shaped pickup address from legacy fabric.storePickupAddress.
 * Used only as a migration fallback when FabricShop.pickupAddress is missing.
 */
export function buildPickupAddressFromFabricStore(fabric) {
  const store = fabric?.storePickupAddress;
  if (!store) return null;

  const line1 = [store.street, store.building]
    .filter((part) => part?.trim())
    .join(", ");

  if (!line1 || !store.city?.trim() || !store.emirate?.trim()) {
    return null;
  }

  return {
    fullName: fabric?.name?.trim() || "",
    phone: store.phone?.trim() || "",
    line1,
    line2: "",
    city: store.city.trim(),
    emirate: store.emirate.trim(),
  };
}

/**
 * Canonical fabric-shop origin: prefer shop.pickupAddress, fall back to fabric store address.
 */
export function resolveFabricShopPickupAddress(shop, fabric = null) {
  const fromShop = normalizeShopPickupAddress(shop?.pickupAddress);
  if (fromShop) return fromShop;

  return buildPickupAddressFromFabricStore(fabric);
}

/**
 * Canonical tailor-shop origin for Shipa create.
 */
export function resolveTailorShopPickupAddress(shop) {
  return normalizeShopPickupAddress(shop?.pickupAddress);
}

/**
 * Listing origin (ready-made or add-on): product pickupAddress wins
 * (MOTD warehouse). Fall back to the linked fabric shop when missing.
 */
export function resolveReadyMadePickupAddress(product, shop = null) {
  const fromProduct = normalizeShopPickupAddress(product?.pickupAddress);
  if (fromProduct) return fromProduct;
  return resolveFabricShopPickupAddress(shop);
}

export const resolveAddonPickupAddress = resolveReadyMadePickupAddress;
