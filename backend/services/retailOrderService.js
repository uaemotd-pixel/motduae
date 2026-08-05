import ReadyMadeProduct from "../models/ReadyMadeProduct.js";
import AddOn from "../models/AddOn.js";
import Fabric from "../models/Fabric.js";

// Conversion constant: 1 wara (also spelled "wara") = 0.9144 meters
const WARA_TO_METERS = 0.9144;

export async function prepareRetailOrder(orderItems) {
  if (!orderItems || orderItems.length === 0) {
    throw new Error("No order items provided");
  }

  let itemsPrice = 0;
  const finalOrderItems = [];

  for (const item of orderItems) {
    let product = await ReadyMadeProduct.findOne({
      _id: item.productId,
      isActive: true,
    });

    let isAddon = false;
    let isFabric = false;

    if (!product) {
      product = await AddOn.findOne({
        _id: item.productId,
        isActive: true,
      });
      if (product) {
        isAddon = true;
      }
    }

    if (!product) {
      product = await Fabric.findOne({
        _id: item.productId,
        isActive: true,
      });
      if (product) {
        isFabric = true;
      }
    }

    if (!product) {
      throw new Error(`Product not found: ${item.productId}`);
    }

    const quantity = item.quantity || 1;
    // For fabrics, the incoming `item.quantity` may be in customer's preferred unit
    // (meters or wara). If the client included `measurementUnit: 'wara'` on the
    // item, convert to meters for stock checks and pricing calculations.
    let quantityForStockCheck = quantity;
    if (isFabric && item.measurementUnit === "wara") {
      quantityForStockCheck = quantity * WARA_TO_METERS;
    }

    let stock;
    if (isAddon) {
      stock = product.stock;
    } else if (isFabric) {
      stock = product.stockInMeters;
    } else {
      stock = product.availableFabricStock;
    }

    if (stock < quantityForStockCheck) {
      throw new Error(`${product.name} is out of stock`);
    }

    let finalPrice;
    if (isAddon) {
      finalPrice = product.price;
    } else if (isFabric) {
      finalPrice = product.pricePerMeter;
    } else {
      finalPrice = product.finalSellingPriceAED;
    }

    let sizeLabel;
    if (isAddon) {
      sizeLabel = "N/A";
    } else if (isFabric) {
      sizeLabel = "Per Meter";
    } else {
      sizeLabel = product.metersPerFabric;
    }

    finalOrderItems.push({
      productId: product._id,
      name: product.name,
      nameAr: product.nameAr,
      slug: product.slug,
      image: isAddon ? product.thumbnailImage || "" : product.images?.[0] || "",
      size: sizeLabel,
      price: finalPrice,
      quantity,
      // record converted fabric meters when applicable so downstream
      // consumers (and stock deduction) can operate on meters.
      ...(isFabric ? { quantityInMeters: quantityForStockCheck } : {}),
    });

    // For pricing, when fabric and quantity was provided in wara, convert
    // to meters so price = pricePerMeter * meters.
    const pricedQuantity = isFabric ? quantityForStockCheck : quantity;
    itemsPrice += (finalPrice || 0) * pricedQuantity;
  }

  const shippingPrice = 0;
  const vatRate = 0.05;
  const vatAmount = Number((itemsPrice * vatRate).toFixed(2));
  const totalPrice = Number(
    (itemsPrice + shippingPrice + vatAmount).toFixed(2),
  );

  return {
    finalOrderItems,
    itemsPrice,
    shippingPrice,
    vatRate,
    vatAmount,
    totalPrice,
  };
}

export async function deductRetailProductStock(orderItems) {
  for (const item of orderItems) {
    const requestedQty = item.quantity || 1;

    // First try to decrement ready-made availableFabricStock (whole-item counts)
    // using the raw requested quantity (no conversion).
    let updated = await ReadyMadeProduct.findOneAndUpdate(
      { _id: item.productId, availableFabricStock: { $gte: requestedQty } },
      { $inc: { availableFabricStock: -requestedQty } },
      { new: true },
    );

    // If not updated, try AddOn stock (also whole counts)
    if (!updated) {
      updated = await AddOn.findOneAndUpdate(
        { _id: item.productId, stock: { $gte: requestedQty } },
        { $inc: { stock: -requestedQty } },
        { new: true },
      );
    }

    // If still not updated, try Fabric stock (stored in meters).
    if (!updated) {
      // If the client provided a measurement unit (e.g., 'wara'), convert
      // the requested quantity to meters before attempting the decrement.
      let qtyForFabric = requestedQty;
      if (item.measurementUnit === "wara") {
        qtyForFabric = requestedQty * WARA_TO_METERS;
      }

      updated = await Fabric.findOneAndUpdate(
        { _id: item.productId, stockInMeters: { $gte: qtyForFabric } },
        { $inc: { stockInMeters: -qtyForFabric } },
        { new: true },
      );
    }

    if (!updated) {
      throw new Error(`Insufficient stock for product: ${item.productId}`);
    }
  }
}
