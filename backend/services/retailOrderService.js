import ReadyMadeProduct from '../models/ReadyMadeProduct.js';

export async function prepareRetailOrder(orderItems) {
  if (!orderItems || orderItems.length === 0) {
    throw new Error('No order items provided');
  }

  let itemsPrice = 0;
  const finalOrderItems = [];

  for (const item of orderItems) {
    const product = await ReadyMadeProduct.findOne({
      _id: item.productId,
      isActive: true,
    });

    if (!product) {
      throw new Error(`Product not found: ${item.productId}`);
    }

    const quantity = item.quantity || 1;

    if (product.availableFabricStock < quantity) {
      throw new Error(`${product.name} is out of stock`);
    }

    finalOrderItems.push({
      productId: product._id,
      name: product.name,
      nameAr: product.nameAr,
      slug: product.slug,
      image: product.images?.[0] || '',
      size: product.metersPerFabric,
      price: product.finalSellingPriceAED,
      quantity,
    });

    itemsPrice += (product.finalSellingPriceAED || 0) * quantity;
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
    const product = await ReadyMadeProduct.findById(item.productId);
    if (!product) continue;

    const quantity = item.quantity || 1;
    product.availableFabricStock -= quantity;

    if (product.availableFabricStock <= 0) {
      product.availableFabricStock = 0;
      product.isActive = false;
    }

    await product.save();
  }
}
