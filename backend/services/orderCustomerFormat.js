import { isBillableShipmentType } from "../models/schemas/shipmentSchemas.js";

export function formatTailorShopSummary(tailorShop) {
  if (!tailorShop) return null;

  const id = tailorShop._id ?? tailorShop;
  if (!id) return null;

  return {
    _id: String(id),
    name: tailorShop.name || "",
    nameAr: tailorShop.nameAr || "",
    slug: tailorShop.slug || "",
  };
}

export function formatDesignSummary(snapshot, designIdDoc) {
  if (!snapshot) return null;

  return {
    name: snapshot.name,
    nameAr: snapshot.nameAr || "",
    slug: snapshot.slug || "",
    category: snapshot.category || "",
    images: (designIdDoc && designIdDoc.images) || [],
    minCutSnapshot: snapshot.minCutSnapshot || null,
    estimatedMeters: snapshot.estimatedMeters || null,
  };
}

export function formatFabricSummary(snapshot, fabricIdDoc) {
  if (!snapshot) return null;

  return {
    name: snapshot.name,
    nameAr: snapshot.nameAr || "",
    material: snapshot.material || "",
    images: (fabricIdDoc && fabricIdDoc.images) || [],
  };
}

export function formatCustomOrderLineItems(order) {
  if (Array.isArray(order.items) && order.items.length > 0) {
    return order.items.map((item) => ({
      design: formatDesignSummary(item.designSnapshot, item.designId),
      fabric: formatFabricSummary(item.fabricSnapshot, item.fabricId),
      fabricMeters: item.fabricMeters,
      tailorShop: formatTailorShopSummary(item.tailorShopId),
      leftoverMeters: item.leftoverMeters || 0,
      selectedCuts: item.selectedCuts || [],
    }));
  }

  if (!order.designSnapshot) return [];

  return [
    {
      design: formatDesignSummary(order.designSnapshot, order.designId),
      fabric: formatFabricSummary(order.fabricSnapshot, order.fabricId),
      fabricMeters: order.fabricMeters,
      tailorShop: formatTailorShopSummary(order.tailorShopId),
      leftoverMeters: order.leftoverMeters || 0,
      selectedCuts: order.selectedCuts || [],
    },
  ];
}

export function formatCustomOrderListItem(order) {
  const items = formatCustomOrderLineItems(order);
  const primaryItem = items[0] ?? null;

  return {
    id: order._id,
    date: order.createdAt,
    status: order.status,
    fabricSource: order.fabricSource,
    total: order.pricing?.total,
    currency: order.pricing?.currency,
    itemCount: items.length,
    items,
    design: primaryItem?.design ?? null,
    tailorShop:
      primaryItem?.tailorShop ?? formatTailorShopSummary(order.tailorShopId),
    addons: order.addons || [],
    pricing: order.pricing || null,
    leftoverMeters: order.leftoverMeters ?? primaryItem?.leftoverMeters ?? 0,
    selectedCuts: order.selectedCuts || primaryItem?.selectedCuts || [],
  };
}

export function formatCustomerShipments(shipments = []) {
  return shipments
    .filter((shipment) => {
      const billable =
        typeof shipment.billable === "boolean"
          ? shipment.billable
          : isBillableShipmentType(shipment.type);
      return billable;
    })
    .map((shipment) => ({
      parcelKey: shipment.parcelKey,
      type: shipment.type,
      label: shipment.label,
      status: shipment.status,
      awb: shipment.awb,
      trackingUrl: shipment.trackingUrl,
      billable: true,
    }));
}

export function formatStatusHistory(statusHistory = []) {
  return statusHistory.map((entry) => ({
    status: entry.status,
    note: entry.note,
    changedAt: entry.changedAt,
  }));
}

export function formatRetailOrderItems(orderItems = []) {
  return orderItems.map((item) => {
    const product = item.productId || {};
    const fabric = product.fabricId || {};
    const design = product.designId || {};

    let fabricName = fabric.name || product.fabricType || "";
    let fabricNameAr = fabric.nameAr || product.fabricTypeAr || "";
    let fabricImage = fabric.images?.[0] || "";
    let fabricSlug = fabric.slug || "";

    let designName = design.name || product.name || "";
    let designNameAr = design.nameAr || product.nameAr || "";
    let designImage = design.images?.[0] || product.thumbnailImage || "";
    let designSlug = design.slug || "";

    if (item.size === "Per Meter" || item.kind === "fabric") {
      fabricName = item.name;
      fabricNameAr = item.nameAr || "";
      fabricImage = item.image || "";
      fabricSlug = item.slug || "";
      designName = "";
      designNameAr = "";
      designImage = "";
      designSlug = "";
    } else if (item.size === "N/A") {
      fabricName = "";
      fabricNameAr = "";
      fabricImage = "";
      fabricSlug = "";
      designName = "";
      designNameAr = "";
      designImage = "";
      designSlug = "";
    }

    return {
      name: item.name,
      nameAr: item.nameAr,
      image: item.image,
      size: item.size,
      price: item.price,
      quantity: item.quantity,
      fabricName,
      fabricNameAr,
      fabricImage,
      fabricSlug,
      designName,
      designNameAr,
      designImage,
      designSlug,
    };
  });
}

export function formatRetailOrderListItem(order) {
  return {
    id: order._id,
    date: order.createdAt,
    status: order.status,
    totalPrice: order.totalPrice,
    currency: order.currency,
    itemsPrice: order.itemsPrice,
    shippingPrice: order.shippingPrice,
    vatAmount: order.vatAmount,
    vatRate: order.vatRate,
    items: formatRetailOrderItems(order.orderItems),
    statusHistory: formatStatusHistory(order.statusHistory),
    shipments: formatCustomerShipments(order.shipments),
  };
}

export function formatPublicAddress(address) {
  if (!address || typeof address !== "object") return null;
  const src = typeof address.toObject === "function" ? address.toObject() : address;
  const line1 = String(src.line1 || src.street || "").trim();
  const line2 = String(src.line2 || src.building || "").trim();
  const city = String(src.city || "").trim();
  const emirate = String(src.emirate || "").trim();
  if (!line1 && !city && !emirate) return null;

  return {
    fullName: String(src.fullName || "").trim(),
    line1,
    line2,
    city,
    emirate,
    postalCode: String(src.postalCode || "").trim(),
  };
}
