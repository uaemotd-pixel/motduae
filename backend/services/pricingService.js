import PlatformSettings from '../models/PlatformSettings.js';
import Design from '../models/Design.js';
import Fabric from '../models/Fabric.js';
import { FABRIC_SOURCES } from '../models/CustomOrder.js';

export class PricingValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PricingValidationError';
  }
}

const roundMoney = (amount) => Number(amount.toFixed(2));

/**
 * Pure pricing calculator for custom tailoring orders.
 * Formula: designBase + fabricCost + tailoringFee + deliveryFee, then VAT.
 *
 * @param {object} params
 * @param {number} params.designBase - Design.basePrice
 * @param {number} params.tailoringFee - Design.tailoringFee
 * @param {number} params.fabricMeters - Meters of fabric required
 * @param {'storefront'|'self'} params.fabricSource
 * @param {number} [params.fabricPricePerMeter=0] - Fabric.pricePerMeter (storefront only)
 * @param {number} params.deliveryFee - PlatformSettings.defaultDeliveryFee
 * @param {number} [params.vatRate=0.05]
 * @param {string} [params.currency='AED']
 * @returns {object} Pricing snapshot matching CustomOrder.pricing schema
 */
export function calculateCustomOrderPricing({
  designBase,
  tailoringFee,
  fabricMeters,
  fabricSource,
  fabricPricePerMeter = 0,
  deliveryFee,
  vatRate = 0.05,
  currency = 'AED',
}) {
  if (!FABRIC_SOURCES.includes(fabricSource)) {
    throw new PricingValidationError(
      `fabricSource must be one of: ${FABRIC_SOURCES.join(', ')}`
    );
  }

  if (typeof designBase !== 'number' || designBase < 0) {
    throw new PricingValidationError('designBase must be a non-negative number');
  }

  if (typeof tailoringFee !== 'number' || tailoringFee < 0) {
    throw new PricingValidationError('tailoringFee must be a non-negative number');
  }

  if (typeof fabricMeters !== 'number' || fabricMeters <= 0) {
    throw new PricingValidationError('fabricMeters must be greater than 0');
  }

  if (typeof deliveryFee !== 'number' || deliveryFee < 0) {
    throw new PricingValidationError('deliveryFee must be a non-negative number');
  }

  if (typeof vatRate !== 'number' || vatRate < 0 || vatRate > 1) {
    throw new PricingValidationError('vatRate must be between 0 and 1');
  }

  const isStorefront = fabricSource === 'storefront';
  const resolvedFabricPricePerMeter = isStorefront ? fabricPricePerMeter : 0;

  if (isStorefront && (typeof fabricPricePerMeter !== 'number' || fabricPricePerMeter < 0)) {
    throw new PricingValidationError(
      'fabricPricePerMeter is required for storefront fabric source'
    );
  }

  const fabricCost = isStorefront
    ? roundMoney(resolvedFabricPricePerMeter * fabricMeters)
    : 0;

  const subtotal = roundMoney(
    designBase + fabricCost + tailoringFee + deliveryFee
  );
  const vatAmount = roundMoney(subtotal * vatRate);
  const total = roundMoney(subtotal + vatAmount);

  return {
    designBase: roundMoney(designBase),
    fabricMeters: roundMoney(fabricMeters),
    fabricPricePerMeter: roundMoney(resolvedFabricPricePerMeter),
    fabricCost,
    tailoringFee: roundMoney(tailoringFee),
    deliveryFee: roundMoney(deliveryFee),
    subtotal,
    vatRate,
    vatAmount,
    total,
    currency,
  };
}

/**
 * Item-level pricing without delivery fee (used when aggregating multi-item orders).
 */
export function calculateCustomOrderItemPricing({
  designBase,
  tailoringFee,
  fabricMeters,
  fabricSource,
  fabricPricePerMeter = 0,
  vatRate = 0.05,
  currency = 'AED',
}) {
  if (!FABRIC_SOURCES.includes(fabricSource)) {
    throw new PricingValidationError(
      `fabricSource must be one of: ${FABRIC_SOURCES.join(', ')}`
    );
  }

  if (typeof designBase !== 'number' || designBase < 0) {
    throw new PricingValidationError('designBase must be a non-negative number');
  }

  if (typeof tailoringFee !== 'number' || tailoringFee < 0) {
    throw new PricingValidationError('tailoringFee must be a non-negative number');
  }

  if (typeof fabricMeters !== 'number' || fabricMeters <= 0) {
    throw new PricingValidationError('fabricMeters must be greater than 0');
  }

  const isStorefront = fabricSource === 'storefront';
  const resolvedFabricPricePerMeter = isStorefront ? fabricPricePerMeter : 0;

  if (isStorefront && (typeof fabricPricePerMeter !== 'number' || fabricPricePerMeter < 0)) {
    throw new PricingValidationError(
      'fabricPricePerMeter is required for storefront fabric source'
    );
  }

  const fabricCost = isStorefront
    ? roundMoney(resolvedFabricPricePerMeter * fabricMeters)
    : 0;

  const subtotal = roundMoney(designBase + fabricCost + tailoringFee);
  const vatAmount = roundMoney(subtotal * vatRate);
  const total = roundMoney(subtotal + vatAmount);

  return {
    designBase: roundMoney(designBase),
    fabricMeters: roundMoney(fabricMeters),
    fabricPricePerMeter: roundMoney(resolvedFabricPricePerMeter),
    fabricCost,
    tailoringFee: roundMoney(tailoringFee),
    deliveryFee: 0,
    subtotal,
    vatRate,
    vatAmount,
    total,
    currency,
  };
}

/**
 * Aggregate multiple item pricings into a single order total with one delivery fee.
 */
export function aggregateCustomOrderPricing(itemPricings, { deliveryFee, vatRate, currency }) {
  if (!Array.isArray(itemPricings) || itemPricings.length === 0) {
    throw new PricingValidationError('At least one item is required');
  }

  const designBase = roundMoney(
    itemPricings.reduce((sum, item) => sum + item.designBase, 0)
  );
  const fabricCost = roundMoney(
    itemPricings.reduce((sum, item) => sum + item.fabricCost, 0)
  );
  const tailoringFee = roundMoney(
    itemPricings.reduce((sum, item) => sum + item.tailoringFee, 0)
  );
  const fabricMeters = roundMoney(
    itemPricings.reduce((sum, item) => sum + item.fabricMeters, 0)
  );

  const avgFabricPricePerMeter =
    fabricMeters > 0 ? roundMoney(fabricCost / fabricMeters) : 0;

  const subtotal = roundMoney(designBase + fabricCost + tailoringFee + deliveryFee);
  const vatAmount = roundMoney(subtotal * vatRate);
  const total = roundMoney(subtotal + vatAmount);

  return {
    designBase,
    fabricMeters,
    fabricPricePerMeter: avgFabricPricePerMeter,
    fabricCost,
    tailoringFee,
    deliveryFee: roundMoney(deliveryFee),
    subtotal,
    vatRate,
    vatAmount,
    total,
    currency,
    itemCount: itemPricings.length,
  };
}

/**
 * Build pricing from loaded Design/Fabric documents and platform settings.
 */
export function buildCustomOrderPricing({
  design,
  fabric = null,
  fabricSource,
  fabricMeters,
  settings,
}) {
  if (!design) {
    throw new PricingValidationError('design is required');
  }

  if (!settings) {
    throw new PricingValidationError('settings is required');
  }

  if (fabricSource === 'storefront') {
    if (!fabric) {
      throw new PricingValidationError('fabric is required when fabricSource is storefront');
    }
    if (!fabric.isActive) {
      throw new PricingValidationError('fabric is not active');
    }
  }

  if (fabricSource === 'self' && fabric) {
    throw new PricingValidationError('fabric must not be provided when fabricSource is self');
  }

  return calculateCustomOrderPricing({
    designBase: design.basePrice,
    tailoringFee: design.tailoringFee,
    fabricMeters,
    fabricSource,
    fabricPricePerMeter: fabric?.pricePerMeter ?? 0,
    deliveryFee: settings.defaultDeliveryFee,
    vatRate: settings.vatRate,
    currency: settings.currency,
  });
}

/**
 * Load entities from the database and return a pricing snapshot.
 * Used by preview and create-order APIs (B-07, B-08).
 */
export async function getCustomOrderPricing({
  designId,
  fabricId = null,
  fabricSource,
  fabricMeters,
}) {
  const [settings, design] = await Promise.all([
    PlatformSettings.getSettings(),
    Design.findById(designId),
  ]);

  if (!design) {
    throw new PricingValidationError('design not found');
  }

  if (!design.isActive) {
    throw new PricingValidationError('design is not active');
  }

  let fabric = null;

  if (fabricSource === 'storefront') {
    if (!fabricId) {
      throw new PricingValidationError('fabricId is required when fabricSource is storefront');
    }

    fabric = await Fabric.findById(fabricId);

    if (!fabric) {
      throw new PricingValidationError('fabric not found');
    }
  }

  return buildCustomOrderPricing({
    design,
    fabric,
    fabricSource,
    fabricMeters,
    settings,
  });
}

/**
 * Build item-level pricing without delivery fee.
 */
export function buildCustomOrderItemPricing({
  design,
  fabric = null,
  fabricSource,
  fabricMeters,
  settings,
}) {
  if (!design) {
    throw new PricingValidationError('design is required');
  }

  if (!settings) {
    throw new PricingValidationError('settings is required');
  }

  if (fabricSource === 'storefront') {
    if (!fabric) {
      throw new PricingValidationError('fabric is required when fabricSource is storefront');
    }
    if (!fabric.isActive) {
      throw new PricingValidationError('fabric is not active');
    }
  }

  if (fabricSource === 'self' && fabric) {
    throw new PricingValidationError('fabric must not be provided when fabricSource is self');
  }

  return calculateCustomOrderItemPricing({
    designBase: design.basePrice,
    tailoringFee: design.tailoringFee,
    fabricMeters,
    fabricSource,
    fabricPricePerMeter: fabric?.pricePerMeter ?? 0,
    vatRate: settings.vatRate,
    currency: settings.currency,
  });
}

/**
 * Load entities and return aggregated pricing for multiple line items.
 */
export async function getMultiItemCustomOrderPricing({ items, fabricSource }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new PricingValidationError('At least one item is required');
  }

  const settings = await PlatformSettings.getSettings();
  const itemPricings = [];

  for (const item of items) {
    const design = await Design.findById(item.designId);

    if (!design) {
      throw new PricingValidationError('design not found');
    }

    if (!design.isActive) {
      throw new PricingValidationError('design is not active');
    }

    let fabric = null;

    if (fabricSource === 'storefront') {
      if (!item.fabricId) {
        throw new PricingValidationError('fabricId is required when fabricSource is storefront');
      }

      fabric = await Fabric.findById(item.fabricId);

      if (!fabric) {
        throw new PricingValidationError('fabric not found');
      }
    }

    itemPricings.push(
      buildCustomOrderItemPricing({
        design,
        fabric,
        fabricSource,
        fabricMeters: item.fabricMeters,
        settings,
      })
    );
  }

  return {
    pricing: aggregateCustomOrderPricing(itemPricings, {
      deliveryFee: settings.defaultDeliveryFee,
      vatRate: settings.vatRate,
      currency: settings.currency,
    }),
    itemPricings,
  };
}
