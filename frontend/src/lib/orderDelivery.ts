export type OrderDeliveryAddress = {
  fullName?: string;
  phone?: string;
  street?: string;
  building?: string;
  line1?: string;
  line2?: string;
  city?: string;
  emirate?: string;
  postalCode?: string;
};

export function getOrderDeliveryAddress(
  order: {
    shippingAddress?: OrderDeliveryAddress | null;
    customerDeliveryAddress?: OrderDeliveryAddress | null;
  } | null
    | undefined,
): OrderDeliveryAddress | null {
  if (!order) return null;
  const address = order.shippingAddress || order.customerDeliveryAddress;
  if (!address || typeof address !== "object") return null;
  return address;
}

export function getOrderRecipientName(
  order: {
    shippingAddress?: OrderDeliveryAddress | null;
    customerDeliveryAddress?: OrderDeliveryAddress | null;
  } | null
    | undefined,
  accountName?: string,
  fallback = "",
) {
  const address = getOrderDeliveryAddress(order);
  const recipient = String(address?.fullName || "").trim();
  return recipient || String(accountName || "").trim() || fallback;
}

export function formatOrderDeliveryLines(address?: OrderDeliveryAddress | null) {
  if (!address) return [];
  const street = String(address.street || address.line1 || "").trim();
  const building = String(address.building || address.line2 || "").trim();
  const cityEmirate = [address.city, address.emirate]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
  const postal = String(address.postalCode || "").trim();
  return [street, building, cityEmirate, postal].filter(Boolean);
}
