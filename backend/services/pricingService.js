import PlatformSettings from '../models/PlatformSettings.js';
import Design from '../models/Design.js';
import Fabric from '../models/Fabric.js';
import Cut from '../models/Cut.js';
import { cutValueToMeters } from '../utils/fabricUnits.js';
import { FABRIC_SOURCES } from '../models/CustomOrder.js';
import { planCustomOrderParcels } from './parcelPlanService.js';

export class PricingValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PricingValidationError';
  }
}

const roundMoney = (amount) => Number(amount.toFixed(2));

function getDesignMinimumMeters(design) {
  const fromSnapshot = design?.minCutSnapshot?.lengthInMeters;
  if (typeof fromSnapshot === 'number' && fromSnapshot > 0) {
    return fromSnapshot;
  }
  const estimated = design?.estimatedMeters;
  if (typeof estimated === 'number' && estimated > 0) {
    return estimated;
  }
  return 0;
}

function normalizeCutSelectionsInput({ cutId = null, cutIds = null, cutSelections = null }) {
  if (Array.isArray(cutSelections) && cutSelections.length > 0) {
    const merged = new Map();
    for (const entry of cutSelections) {
      const id = entry?.cutId ? String(entry.cutId) : '';
      const qty = Math.floor(Number(entry?.quantity));
      if (!id || !Number.isFinite(qty) || qty <= 0) continue;
      merged.set(id, (merged.get(id) || 0) + qty);
    }
    return Array.from(merged.entries()).map(([id, quantity]) => ({
      cutId: id,
      quantity,
    }));
  }

  if (Array.isArray(cutIds) && cutIds.length > 0) {
    const merged = new Map();
    for (const id of cutIds) {
      const key = String(id);
      merged.set(key, (merged.get(key) || 0) + 1);
    }
    return Array.from(merged.entries()).map(([id, quantity]) => ({
      cutId: id,
      quantity,
    }));
  }

  if (cutId) {
    return [{ cutId: String(cutId), quantity: 1 }];
  }

  return [];
}

/**
 * Cut-based fabrics no longer store pricePerMeter.
 * Cost = sum(selected cut price × quantity). Effective AED/m is derived for display.
 */
export function resolveStorefrontFabricPricing({
  fabric,
  fabricMeters,
  cutId = null,
  cutIds = null,
  cutSelections = null,
}) {
  if (!fabric) {
    return { fabricCost: 0, fabricPricePerMeter: 0 };
  }

  const selections = normalizeCutSelectionsInput({
    cutId,
    cutIds,
    cutSelections,
  });
  const fabricCuts = Array.isArray(fabric.cuts) ? fabric.cuts : [];

  if (selections.length > 0) {
    let fabricCost = 0;

    for (const { cutId: id, quantity } of selections) {
      const fabricCut = fabricCuts.find(
        (entry) => String(entry.cutId) === String(id),
      );
      if (!fabricCut) {
        throw new PricingValidationError(
          `Selected cut is not available on ${fabric.name || 'fabric'}`,
        );
      }
      const unitPrice = Number(fabricCut.price);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new PricingValidationError(
          `Invalid cut price on ${fabric.name || 'fabric'}`,
        );
      }
      fabricCost += unitPrice * quantity;
    }

    fabricCost = roundMoney(fabricCost);
    const meters = Number(fabricMeters) || 0;
    const fabricPricePerMeter =
      meters > 0 ? roundMoney(fabricCost / meters) : 0;

    return { fabricCost, fabricPricePerMeter };
  }

  // Legacy fallback when no cut is selected: use stored pricePerMeter if present.
  const legacyPrice = Number(fabric.pricePerMeter);
  if (Number.isFinite(legacyPrice) && legacyPrice > 0) {
    const meters = Number(fabricMeters) || 0;
    return {
      fabricCost: roundMoney(legacyPrice * meters),
      fabricPricePerMeter: roundMoney(legacyPrice),
    };
  }

  return { fabricCost: 0, fabricPricePerMeter: 0 };
}

/**
 * Ensure selected fabric length (and optional cut / cuts) meets the design minimum.
 */
export async function validateCustomOrderItemFabric({
  design,
  fabric = null,
  fabricSource,
  fabricMeters,
  cutId = null,
  cutIds = null,
  cutSelections = null,
}) {
  if (!design) {
    throw new PricingValidationError('design is required');
  }

  const minimumMeters = getDesignMinimumMeters(design);

  /** @type {{ cutId: string, quantity: number }[]} */
  let resolvedSelections = [];

  if (Array.isArray(cutSelections) && cutSelections.length > 0) {
    const merged = new Map();
    for (const entry of cutSelections) {
      const id = entry?.cutId ? String(entry.cutId) : '';
      const qty = Math.floor(Number(entry?.quantity));
      if (!id || !Number.isFinite(qty) || qty <= 0) continue;
      merged.set(id, (merged.get(id) || 0) + qty);
    }
    resolvedSelections = Array.from(merged.entries()).map(([cutId, quantity]) => ({
      cutId,
      quantity,
    }));
  } else if (Array.isArray(cutIds) && cutIds.length > 0) {
    const merged = new Map();
    for (const id of cutIds) {
      const key = String(id);
      merged.set(key, (merged.get(key) || 0) + 1);
    }
    resolvedSelections = Array.from(merged.entries()).map(([cutId, quantity]) => ({
      cutId,
      quantity,
    }));
  } else if (cutId) {
    resolvedSelections = [{ cutId: String(cutId), quantity: 1 }];
  }

  let selectedMeters = fabricMeters;

  if (resolvedSelections.length > 0) {
    let totalMeters = 0;

    for (const { cutId: id, quantity } of resolvedSelections) {
      const cut = await Cut.findById(id);
      if (!cut || !cut.isActive) {
        throw new PricingValidationError('cut not found or is inactive');
      }
      totalMeters += cutValueToMeters(cut.value, cut.unit) * quantity;

      if (fabricSource === 'storefront' && fabric) {
        const fabricCut = (fabric.cuts || []).find(
          (entry) => String(entry.cutId) === String(id),
        );
        if (!fabricCut) {
          throw new PricingValidationError(
            `Selected cut is not available on ${fabric.name}`,
          );
        }
        const stock = Math.floor(Number(fabricCut.stock) || 0);
        if (stock < quantity) {
          throw new PricingValidationError(
            `${fabric.name} — insufficient stock for the selected cut (need ${quantity}, have ${stock})`,
          );
        }
      }
    }

    selectedMeters = Number(totalMeters.toFixed(2));

    if (
      typeof fabricMeters === 'number' &&
      Math.abs(fabricMeters - selectedMeters) > 0.02
    ) {
      throw new PricingValidationError(
        'fabricMeters does not match the selected cut(s)',
      );
    }
  }

  if (typeof selectedMeters !== 'number' || selectedMeters <= 0) {
    throw new PricingValidationError('fabricMeters must be greater than 0');
  }

  if (minimumMeters > 0 && selectedMeters + 0.009 < minimumMeters) {
    throw new PricingValidationError(
      `Selected fabric length (${selectedMeters}m) is less than required for this design (${minimumMeters}m)`,
    );
  }

  if (
    fabricSource === 'storefront' &&
    Array.isArray(fabric?.cuts) &&
    fabric.cuts.length > 0 &&
    resolvedSelections.length === 0
  ) {
    throw new PricingValidationError(
      'cutId is required when purchasing storefront fabric by cut',
    );
  }
}

/**
 * Split a fabric-store line into gross, MOTD commission, and net store payout.
 * `commissionPercent` is 0–100 (e.g. 15 = 15%).
 */
export function splitMotdCommission(grossAmount, commissionPercent = 15) {
  const gross = roundMoney(Math.max(0, Number(grossAmount) || 0));
  const percent = Math.min(100, Math.max(0, Number(commissionPercent) || 0));
  const commission = roundMoney((gross * percent) / 100);
  const net = roundMoney(gross - commission);
  return { gross, commission, net, percent };
}

/**
 * Apply add-on costs onto an existing custom-order pricing snapshot.
 * `pricing.subtotal` already includes deliveryFee, so do NOT add delivery again.
 */
export function applyAddonsToCustomOrderPricing(pricing, addonsCost = 0) {
  const addons = Number(addonsCost) || 0;
  const subtotal = roundMoney(pricing.subtotal + addons);
  const vatAmount = roundMoney(subtotal * pricing.vatRate);
  const total = roundMoney(subtotal + vatAmount);

  return {
    ...pricing,
    subtotal,
    vatAmount,
    total,
  };
}

export function getPerParcelDeliveryFee(settings) {
  const fee =
    settings?.perParcelDeliveryFee ?? settings?.defaultDeliveryFee ?? 30;
  return typeof fee === 'number' && fee >= 0 ? fee : 30;
}

export function resolveDeliveryFee(defaultDeliveryFee, deliveryType = 'delivery') {
  if (deliveryType === 'pickup') {
    throw new PricingValidationError(
      'Pickup is not supported; delivery is required',
    );
  }

  return defaultDeliveryFee;
}

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
  fabricCost: fabricCostOverride = null,
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

  const fabricCost = !isStorefront
    ? 0
    : typeof fabricCostOverride === 'number'
      ? roundMoney(fabricCostOverride)
      : roundMoney(resolvedFabricPricePerMeter * fabricMeters);

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
  fabricCost: fabricCostOverride = null,
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

  const fabricCost = !isStorefront
    ? 0
    : typeof fabricCostOverride === 'number'
      ? roundMoney(fabricCostOverride)
      : roundMoney(resolvedFabricPricePerMeter * fabricMeters);

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
 * Aggregate multiple item pricings into a single order total with parcel-based delivery.
 */
export function aggregateCustomOrderPricing(
  itemPricings,
  {
    deliveryFee,
    vatRate,
    currency,
    parcelCount = 0,
    deliveryBreakdown = [],
    perParcelFee = null,
  },
) {
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
    parcelCount,
    perParcelFee:
      typeof perParcelFee === 'number' ? roundMoney(perParcelFee) : undefined,
    deliveryBreakdown,
    subtotal,
    vatRate,
    vatAmount,
    total,
    currency,
    itemCount: itemPricings.length,
  };
}

/**
 * Attach parcel-plan delivery fields onto a pricing snapshot.
 */
function withDeliveryPlan(pricing, plan) {
  return {
    ...pricing,
    deliveryFee: roundMoney(plan.deliveryFee),
    parcelCount: plan.parcelCount,
    perParcelFee: roundMoney(plan.perParcelFee),
    deliveryBreakdown: plan.breakdown,
  };
}

/**
 * Build pricing from loaded Design/Fabric documents and platform settings.
 * Delivery fee comes from the parcel plan (caller should pass planDeliveryFee).
 */
export function buildCustomOrderPricing({
  design,
  fabric = null,
  fabricSource,
  fabricMeters,
  settings,
  deliveryType = 'delivery',
  deliveryFee = null,
  parcelPlan = null,
  cutId = null,
  cutIds = null,
  cutSelections = null,
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

  const calculatedDesignBase = design.priceType === 'per_meter'
    ? roundMoney(design.basePrice * fabricMeters)
    : design.basePrice;

  // Reject pickup; resolve fee from explicit plan or legacy single-parcel fallback
  resolveDeliveryFee(0, deliveryType);
  const resolvedDeliveryFee =
    typeof deliveryFee === 'number'
      ? deliveryFee
      : parcelPlan?.deliveryFee ?? getPerParcelDeliveryFee(settings);

  const fabricPricing =
    fabricSource === 'storefront'
      ? resolveStorefrontFabricPricing({
          fabric,
          fabricMeters,
          cutId,
          cutIds,
          cutSelections,
        })
      : { fabricCost: 0, fabricPricePerMeter: 0 };

  const pricing = calculateCustomOrderPricing({
    designBase: calculatedDesignBase,
    tailoringFee: design.tailoringFee,
    fabricMeters,
    fabricSource,
    fabricPricePerMeter: fabricPricing.fabricPricePerMeter,
    fabricCost: fabricPricing.fabricCost,
    deliveryFee: resolvedDeliveryFee,
    vatRate: settings.vatRate,
    currency: settings.currency,
  });

  if (parcelPlan) {
    return withDeliveryPlan(pricing, parcelPlan);
  }

  return {
    ...pricing,
    parcelCount: 1,
    perParcelFee: getPerParcelDeliveryFee(settings),
    deliveryBreakdown: [],
  };
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
  cutId = null,
  cutIds = null,
  cutSelections = null,
  deliveryType = 'delivery',
  addonIds = [],
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

  await validateCustomOrderItemFabric({
    design,
    fabric,
    fabricSource,
    fabricMeters,
    cutId,
    cutIds,
    cutSelections,
  });

  const parcelPlan = await planCustomOrderParcels({
    fabricSource,
    items: [{ designId, fabricId, fabricMeters }],
    addonIds,
    perParcelFee: getPerParcelDeliveryFee(settings),
  });

  resolveDeliveryFee(parcelPlan.deliveryFee, deliveryType);

  return buildCustomOrderPricing({
    design,
    fabric,
    fabricSource,
    fabricMeters,
    settings,
    deliveryType,
    deliveryFee: parcelPlan.deliveryFee,
    parcelPlan,
    cutId,
    cutIds,
    cutSelections,
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
  cutId = null,
  cutIds = null,
  cutSelections = null,
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

  const calculatedDesignBase = design.priceType === 'per_meter'
    ? roundMoney(design.basePrice * fabricMeters)
    : design.basePrice;

  const fabricPricing =
    fabricSource === 'storefront'
      ? resolveStorefrontFabricPricing({
          fabric,
          fabricMeters,
          cutId,
          cutIds,
          cutSelections,
        })
      : { fabricCost: 0, fabricPricePerMeter: 0 };

  return calculateCustomOrderItemPricing({
    designBase: calculatedDesignBase,
    tailoringFee: design.tailoringFee,
    fabricMeters,
    fabricSource,
    fabricPricePerMeter: fabricPricing.fabricPricePerMeter,
    fabricCost: fabricPricing.fabricCost,
    vatRate: settings.vatRate,
    currency: settings.currency,
  });
}

/**
 * Load entities and return aggregated pricing for multiple line items.
 * Delivery fee = parcel plan (unique routes × per-parcel rate), including addon parcels.
 */
export async function getMultiItemCustomOrderPricing({
  items,
  fabricSource,
  deliveryType = 'delivery',
  addonIds = [],
}) {
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

    await validateCustomOrderItemFabric({
      design,
      fabric,
      fabricSource,
      fabricMeters: item.fabricMeters,
      cutId: item.cutId ?? null,
      cutIds: item.cutIds ?? null,
      cutSelections: item.cutSelections ?? null,
    });

    itemPricings.push(
      buildCustomOrderItemPricing({
        design,
        fabric,
        fabricSource,
        fabricMeters: item.fabricMeters,
        settings,
        cutId: item.cutId ?? null,
        cutIds: item.cutIds ?? null,
        cutSelections: item.cutSelections ?? null,
      })
    );
  }

  const parcelPlan = await planCustomOrderParcels({
    fabricSource,
    items,
    addonIds,
    perParcelFee: getPerParcelDeliveryFee(settings),
  });

  const deliveryFee = resolveDeliveryFee(parcelPlan.deliveryFee, deliveryType);

  return {
    pricing: aggregateCustomOrderPricing(itemPricings, {
      deliveryFee,
      vatRate: settings.vatRate,
      currency: settings.currency,
      parcelCount: parcelPlan.parcelCount,
      deliveryBreakdown: parcelPlan.breakdown,
      perParcelFee: parcelPlan.perParcelFee,
    }),
    itemPricings,
    parcelPlan,
  };
}
