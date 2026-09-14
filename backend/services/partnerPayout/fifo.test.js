import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { previewFifo, buildEarningDraftsFromOrder } from "./split.js";
import { PartnerPayoutError } from "./errors.js";
import { SHIPPING_PARTNER_ID } from "./constants.js";
import { applyMotdCommission } from "../../utils/motdCommission.js";

describe("previewFifo", () => {
  const earnings = [
    {
      _id: "e1",
      orderId: "ord-101",
      orderType: "custom",
      partnerId: "shop-1",
      remainingFils: 1500,
      commissionPercent: 12,
      grossFils: 1705,
      commissionFils: 205,
      availableAt: "2026-01-01T00:00:00.000Z",
    },
    {
      _id: "e2",
      orderId: "ord-102",
      orderType: "custom",
      partnerId: "shop-1",
      remainingFils: 2000,
      commissionPercent: 12,
      grossFils: 2273,
      commissionFils: 273,
      availableAt: "2026-01-02T00:00:00.000Z",
    },
    {
      _id: "e3",
      orderId: "ord-103",
      orderType: "custom",
      partnerId: "shop-1",
      remainingFils: 2370,
      commissionPercent: 13,
      grossFils: 2724,
      commissionFils: 354,
      availableAt: "2026-01-03T00:00:00.000Z",
    },
  ];

  it("FIFO-fills 5870 remaining with a 4000 budget into three lines", () => {
    const result = previewFifo(earnings, 4000);
    assert.equal(result.amountFils, 4000);
    assert.equal(result.availableFils, 5870);
    assert.equal(result.lines.length, 3);
    assert.deepEqual(
      result.lines.map((line) => [
        line.orderId,
        line.amountFils,
        line.remainingAfterFils,
        line.commissionPercent,
      ]),
      [
        ["ord-101", 1500, 0, 12],
        ["ord-102", 2000, 0, 12],
        ["ord-103", 500, 1870, 13],
      ],
    );
  });

  it("rejects an over-budget payout", () => {
    assert.throws(
      () => previewFifo(earnings, 5871),
      (err) => err instanceof PartnerPayoutError && err.code === "OVER_BUDGET",
    );
  });

  it("rejects a zero or negative budget", () => {
    assert.throws(
      () => previewFifo(earnings, 0),
      (err) => err instanceof PartnerPayoutError && err.code === "INVALID_AMOUNT",
    );
  });
});

describe("buildEarningDraftsFromOrder buckets", () => {
  const tailorShopId = "aaaaaaaaaaaaaaaaaaaaaaaa";
  const fabricShopId = "bbbbbbbbbbbbbbbbbbbbbbbb";
  const catalogs = {
    tailorShopsById: new Map([
      [tailorShopId, { _id: tailorShopId, name: "Atelier One" }],
    ]),
    shopsById: new Map([
      [fabricShopId, { _id: fabricShopId, name: "Cloth House" }],
    ]),
    shopsByOwnerId: new Map(),
    fabricsById: new Map(),
  };
  const percents = { tailor: 12, fabric: 15 };

  it("creates pending earnings until the order is delivered", () => {
    const drafts = buildEarningDraftsFromOrder({
      order: {
        _id: "cccccccccccccccccccccccc",
        status: "in_production",
        tailorShopId,
        fabricStoreId: fabricShopId,
        fabricSource: "storefront",
        pricing: {
          designBase: 200,
          tailoringFee: 150,
          fabricCost: 100,
          deliveryFee: 25,
        },
      },
      orderType: "custom",
      percents,
      catalogs,
    });

    const tailor = drafts.find((row) => row.partnerKind === "tailor");
    const fabric = drafts.find((row) => row.partnerKind === "fabric");
    const shipping = drafts.find((row) => row.partnerKind === "shipping");

    assert.equal(tailor.status, "pending");
    assert.equal(tailor.netFils, 31250);
    assert.equal(fabric.status, "pending");
    assert.equal(fabric.netFils, 8696);
    assert.equal(shipping.partnerId, SHIPPING_PARTNER_ID);
    assert.equal(shipping.commissionPercent, 0);
    assert.equal(shipping.netFils, 2500);
    assert.equal(shipping.status, "pending");
  });

  it("creates available earnings when the order is already delivered", () => {
    const drafts = buildEarningDraftsFromOrder({
      order: {
        _id: "cccccccccccccccccccccccc",
        status: "delivered",
        deliveredAt: "2026-04-01T00:00:00.000Z",
        tailorShopId,
        pricing: { designBase: 200, tailoringFee: 150, deliveryFee: 0 },
      },
      orderType: "custom",
      percents,
      catalogs,
    });
    assert.ok(drafts.every((row) => row.status === "available"));
    assert.ok(drafts.every((row) => row.availableAt instanceof Date));
  });

  it("skips customer-supplied fabric and net-zero rows", () => {
    const drafts = buildEarningDraftsFromOrder({
      order: {
        _id: "cccccccccccccccccccccccc",
        status: "confirmed",
        fabricSource: "self",
        tailorShopId,
        fabricStoreId: fabricShopId,
        pricing: {
          designBase: 0,
          tailoringFee: 0,
          fabricCost: 400,
          deliveryFee: 0,
        },
      },
      orderType: "custom",
      percents,
      catalogs,
    });
    assert.equal(drafts.length, 0);
  });

  it("pays partner net when the order snapshot is already customer-gross", () => {
    const drafts = buildEarningDraftsFromOrder({
      order: {
        _id: "cccccccccccccccccccccccc",
        status: "in_production",
        tailorShopId,
        fabricStoreId: fabricShopId,
        fabricSource: "storefront",
        pricing: {
          designBase: applyMotdCommission(350, 12),
          tailoringFee: 0,
          fabricCost: applyMotdCommission(100, 15),
          deliveryFee: 25,
        },
      },
      orderType: "custom",
      percents,
      catalogs,
    });
    const tailor = drafts.find((row) => row.partnerKind === "tailor");
    const fabric = drafts.find((row) => row.partnerKind === "fabric");
    assert.equal(tailor.netFils, 35000);
    assert.equal(fabric.netFils, 10000);
  });
});
