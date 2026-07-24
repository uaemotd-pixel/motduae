import ReadyMadeProduct from '../models/ReadyMadeProduct.js';
import AddOn from '../models/AddOn.js';
import Fabric from '../models/Fabric.js';

export async function prepareRetailOrder(orderItems) {
  if (!orderItems || orderItems.length === 0) {
    throw new Error('No order items provided');
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
    let stock;
    if (isAddon) {
      stock = product.stock;
    } else if (isFabric) {
      stock = product.stockInMeters;
    } else {
      stock = product.availableFabricStock;
    }

    if (stock < quantity) {
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
      sizeLabel = 'N/A';
    } else if (isFabric) {
      sizeLabel = 'Per Meter';
    } else {
      sizeLabel = product.metersPerFabric;
    }

    finalOrderItems.push({
      productId: product._id,
      name: product.name,
      nameAr: product.nameAr,
      slug: product.slug,
      image: isAddon ? (product.thumbnailImage || '') : (product.images?.[0] || ''),
      size: sizeLabel,
      price: finalPrice,
      quantity,
    });

    itemsPrice += (finalPrice || 0) * quantity;
  }

  const shippingPrice = 0;
  const vatRate = 0.05;
  const vatAmount = Number((itemsPrice * vatRate).toFixed(2));
  const totalPrice = Number((itemsPrice + shippingPrice + vatAmount).toFixed(2));

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
    const quantity = item.quantity || 1;

    // Try updating ReadyMadeProduct first
    let updated = await ReadyMadeProduct.findOneAndUpdate(
      { _id: item.productId, availableFabricStock: { $gte: quantity } },
      { $inc: { availableFabricStock: -quantity } },
      { new: true },
    );

    // If not updated, try updating AddOn
    if (!updated) {
      updated = await AddOn.findOneAndUpdate(
        { _id: item.productId, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { new: true },
      );
    }

    // If not updated, try updating Fabric
    if (!updated) {
      updated = await Fabric.findOneAndUpdate(
        { _id: item.productId, stockInMeters: { $gte: quantity } },
        { $inc: { stockInMeters: -quantity } },
        { new: true },
      );
    }

    if (!updated) {
      throw new Error(`Insufficient stock for product: ${item.productId}`);
    }
  }
}
