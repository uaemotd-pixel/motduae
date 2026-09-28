import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isStoreRetailItem,
  toFabricPortalRetailOrderView,
} from "./fabricPortalCustomOrderScope.js";

const shopA = "aaaaaaaaaaaaaaaaaaaaaaaa";
const shopB = "bbbbbbbbbbbbbbbbbbbbbbbb";
const fabricId = "111111111111111111111111";
const readyId = "222222222222222222222222";
const addonId = "333333333333333333333333";
const motdReadyId = "444444444444444444444444";

function mixedCartOrder() {
  return {
    _id: "ord-mixed-1",
    createdAt: "2026-09-25T00:00:00.000Z",
    orderItems: [
      {
        productId: fabricId,
        kind: "fabric",
        name: "Silk",
        price: 100,
        quantity: 1,
        fabricShopId: shopA,
      },
      {
        productId: readyId,
        kind: "readyMade",
        name: "Abaya",
        price: 200,
        quantity: 1,
        fabricShopId: shopA,
      },
      {
        productId: addonId,
        kind: "addon",
        name: "Buttons",
        price: 30,
        quantity: 1,
        fabricShopId: shopB,
      },
      {
        productId: motdReadyId,
        kind: "readyMade",
        name: "MOTD piece",
        price: 50,
        quantity: 1,
        fabricShopId: null,
        motdOwned: true,
      },
    ],
    itemsPrice: 380,
    shippingPrice: 60,
    parcelCount: 2,
    perParcelFee: 30,
    totalPrice: 440,
    deliveryBreakdown: [
      {
        key: "a",
        fee: 30,
        billable: true,
        fabricShopId: shopA,
        from: { id: shopA },
      },
      {
        key: "b",
        fee: 30,
        billable: true,
        fabricShopId: shopB,
        from: { id: shopB },
      },
    ],
    shipments: [
      { type: "retail_to_customer", fabricShopId: shopA, from: { id: shopA } },
      { type: "retail_to_customer", fabricShopId: shopB, from: { id: shopB } },
    ],
    fabricStores: [
      { _id: shopA, name: "Store A" },
      { _id: shopB, name: "Store B" },
    ],
  };
}

function ctxA() {
  return {
    shopIdStr: shopA,
    storeFabricIdSet: new Set([fabricId]),
    storeProductIdSet: new Set([readyId]),
    storeAddonIdSet: new Set(),
  };
}

function ctxB() {
  return {
    shopIdStr: shopB,
    storeFabricIdSet: new Set(),
    storeProductIdSet: new Set(),
    storeAddonIdSet: new Set([addonId]),
  };
}

describe("isStoreRetailItem", () => {
  it("matches hydrated productId objects against catalog sets", () => {
    const item = {
      productId: { _id: fabricId, name: "Silk" },
      kind: "fabric",
      fabricShopId: { _id: shopB, name: "Other" },
    };
    assert.equal(isStoreRetailItem(item, ctxA()), true);
  });

  it("falls back to fabricShopId when catalog ids are missing", () => {
    const item = {
      productId: "999999999999999999999999",
      kind: "addon",
      fabricShopId: shopB,
    };
    assert.equal(isStoreRetailItem(item, ctxB()), true);
    assert.equal(isStoreRetailItem(item, ctxA()), false);
  });

  it("does not treat MOTD-owned lines with a null shop as this store", () => {
    const item = {
      productId: motdReadyId,
      kind: "readyMade",
      fabricShopId: null,
      motdOwned: true,
    };
    assert.equal(isStoreRetailItem(item, ctxA()), false);
    assert.equal(isStoreRetailItem(item, ctxB()), false);
  });
});

describe("toFabricPortalRetailOrderView", () => {
  it("scopes a mixed cart to store A fabric and ready-made only", () => {
    const view = toFabricPortalRetailOrderView(mixedCartOrder(), ctxA());
    assert.ok(view);
    assert.deepEqual(
      view.orderItems.map((item) => item.name),
      ["Silk", "Abaya"],
    );
    assert.equal(view.storeScope.itemsGross, 300);
    assert.equal(view.storeScope.shippingGross, 30);
    assert.equal(view.storeScope.gross, 330);
    assert.equal(view.totalPrice, 330);
    assert.equal(view.shippingPrice, 30);
    assert.equal(view.parcelCount, 1);
    assert.equal(view.shipments.length, 1);
    assert.equal(view.shipments[0].fabricShopId, shopA);
    assert.equal(view.deliveryBreakdown.length, 1);
    assert.equal(view.deliveryBreakdown[0].fabricShopId, shopA);
    assert.deepEqual(
      view.fabricStores.map((shop) => String(shop._id)),
      [shopA],
    );
  });

  it("scopes the same cart to store B add-on only", () => {
    const view = toFabricPortalRetailOrderView(mixedCartOrder(), ctxB());
    assert.ok(view);
    assert.deepEqual(
      view.orderItems.map((item) => item.name),
      ["Buttons"],
    );
    assert.equal(view.storeScope.itemsGross, 30);
    assert.equal(view.storeScope.shippingGross, 30);
    assert.equal(view.storeScope.gross, 60);
    assert.equal(view.shipments.length, 1);
    assert.equal(view.shipments[0].fabricShopId, shopB);
    assert.equal(view.deliveryBreakdown.length, 1);
    assert.equal(view.deliveryBreakdown[0].fabricShopId, shopB);
  });

  it("returns null when no lines belong to the store", () => {
    const view = toFabricPortalRetailOrderView(mixedCartOrder(), {
      shopIdStr: "cccccccccccccccccccccccc",
      storeFabricIdSet: new Set(),
      storeProductIdSet: new Set(),
      storeAddonIdSet: new Set(),
    });
    assert.equal(view, null);
  });

  it("keeps a line whose productId was hydrated to an object", () => {
    const order = mixedCartOrder();
    order.orderItems[0].productId = { _id: fabricId, name: "Silk" };
    const view = toFabricPortalRetailOrderView(order, ctxA());
    assert.ok(view);
    assert.equal(view.orderItems[0].name, "Silk");
  });
});
