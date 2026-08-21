import RetailOrder from "../models/RetailOrder.js";
import CustomOrder from "../models/CustomOrder.js";
import {
  formatCustomOrderListItem,
  formatCustomerShipments,
  formatPublicAddress,
  formatRetailOrderListItem,
  formatStatusHistory,
} from "./orderCustomerFormat.js";
import { getCustomerPieceProgress } from "./shipmentService.js";
import { isPublicTrackingToken } from "./publicTrackingToken.js";

const CUSTOM_POPULATE = [
  { path: "tailorShopId", select: "name nameAr slug" },
  { path: "items.tailorShopId", select: "name nameAr slug" },
  { path: "designId", select: "images" },
  { path: "fabricId", select: "images" },
  { path: "items.designId", select: "images" },
  { path: "items.fabricId", select: "images" },
];

const RETAIL_POPULATE = {
  path: "orderItems.productId",
  select:
    "name nameAr thumbnailImage fabricType fabricTypeAr fabricId designId",
  populate: [
    { path: "fabricId", select: "name nameAr images slug" },
    { path: "designId", select: "name nameAr images slug" },
  ],
};

function formatPublicCustomOrder(order) {
  const listItem = formatCustomOrderListItem(order);
  const items = (listItem.items || []).map((item) => {
    const piece = getCustomerPieceProgress(order, item.tailorShop?._id);
    return {
      ...item,
      tailorStatus: piece.tailorStatus,
      awaitingRestOfOrder: piece.awaitingRestOfOrder,
    };
  });

  return {
    ...listItem,
    items,
    statusHistory: formatStatusHistory(order.statusHistory),
    shipments: formatCustomerShipments(order.shipments),
    hasReturnItems:
      Array.isArray(order.returnItems) && order.returnItems.length > 0,
    deliveryAddress: formatPublicAddress(order.customerDeliveryAddress),
  };
}

function formatPublicRetailOrder(order) {
  return {
    ...formatRetailOrderListItem(order),
    deliveryAddress: formatPublicAddress(order.shippingAddress),
  };
}

export async function getPublicOrderByTrackingToken(token) {
  if (!isPublicTrackingToken(token)) {
    return null;
  }

  const custom = await CustomOrder.findOne({ publicTrackingToken: token })
    .select(
      "createdAt status fabricSource designId fabricId designSnapshot fabricSnapshot fabricMeters pricing tailorShopId items addons statusHistory shipments returnItems customerDeliveryAddress",
    )
    .populate(CUSTOM_POPULATE);

  if (custom) {
    return {
      orderType: "custom",
      order: formatPublicCustomOrder(custom),
    };
  }

  const retail = await RetailOrder.findOne({ publicTrackingToken: token })
    .select(
      "createdAt status totalPrice currency orderItems itemsPrice shippingPrice vatAmount vatRate statusHistory shipments shippingAddress",
    )
    .populate(RETAIL_POPULATE);

  if (retail) {
    return {
      orderType: "retail",
      order: formatPublicRetailOrder(retail),
    };
  }

  return null;
}
