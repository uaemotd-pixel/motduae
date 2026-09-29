import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { filsToAed } from "../../utils/fils.js";
import {
  foldPayoutTotals,
  allocateOrderPayout,
  payoutFromSettlement,
  payoutWindowStatus,
} from "./portalDisplay.js";

describe("foldPayoutTotals", () => {
  const batches = [
    {
      _id: "p-processing",
      status: "processing",
      amountFils: 100000,
      currency: "AED",
      releasedAt: "2026-09-01T00:00:00.000Z",
      note: "",
    },
    {
      _id: "p-completed",
      status: "completed",
      amountFils: 40000,
      currency: "AED",
      releasedAt: "2026-08-01T00:00:00.000Z",
      note: "",
    },
  ];
  const lines = [
    {
      payoutId: "p-processing",
      orderId: "ord-1",
      orderType: "custom",
      amountFils: 100000,
    },
    {
      payoutId: "p-completed",
      orderId: "ord-2",
      orderType: "custom",
      amountFils: 40000,
    },
  ];

  it("puts processing lines in processingByOrderId, not paidByOrderId", () => {
    const result = foldPayoutTotals(batches, lines, filsToAed);
    assert.equal(result.paidByOrderId.get("ord-1"), undefined);
    assert.equal(result.processingByOrderId.get("ord-1"), 1000);
    assert.equal(result.paidByOrderId.get("ord-2"), 400);
    assert.equal(result.processingByOrderId.get("ord-2"), undefined);
    assert.equal(result.paidTotal, 400);
    assert.equal(result.releases[0].status, "processing");
    assert.equal(result.releases[1].status, "completed");
  });

  it("splits slices when the same order appears on both batch types", () => {
    const mixedLines = [
      {
        payoutId: "p-completed",
        orderId: "ord-1",
        orderType: "custom",
        amountFils: 40000,
      },
      {
        payoutId: "p-processing",
        orderId: "ord-1",
        orderType: "custom",
        amountFils: 60000,
      },
    ];
    const result = foldPayoutTotals(batches, mixedLines, filsToAed);
    assert.equal(result.paidByOrderId.get("ord-1"), 400);
    assert.equal(result.processingByOrderId.get("ord-1"), 600);
  });
});

describe("allocateOrderPayout", () => {
  it("treats a full processing cover as processing, not paid", () => {
    const result = allocateOrderPayout({
      net: 1000,
      paid: 0,
      processing: 1000,
    });
    assert.deepEqual(result, {
      paid: 0,
      processing: 1000,
      pending: 0,
      paymentStatus: "processing",
    });
  });

  it("treats a full completed cover as paid", () => {
    const result = allocateOrderPayout({
      net: 1000,
      paid: 1000,
      processing: 0,
    });
    assert.deepEqual(result, {
      paid: 1000,
      processing: 0,
      pending: 0,
      paymentStatus: "paid",
    });
  });

  it("marks mixed completed and processing as partially paid", () => {
    const result = allocateOrderPayout({
      net: 1000,
      paid: 400,
      processing: 600,
    });
    assert.deepEqual(result, {
      paid: 400,
      processing: 600,
      pending: 0,
      paymentStatus: "partially_paid",
    });
  });

  it("clamps paid plus processing so they never exceed net", () => {
    const result = allocateOrderPayout({
      net: 1000,
      paid: 800,
      processing: 500,
    });
    assert.equal(result.paid, 800);
    assert.equal(result.processing, 200);
    assert.equal(result.pending, 0);
    assert.equal(result.paid + result.processing, 1000);
    assert.equal(result.paymentStatus, "partially_paid");
  });

  it("leaves untouched net as pending payment", () => {
    const result = allocateOrderPayout({ net: 1000, paid: 0, processing: 0 });
    assert.equal(result.paymentStatus, "pending_payment");
    assert.equal(result.pending, 1000);
  });
});

describe("payoutFromSettlement and window status", () => {
  it("reads completed and processing maps separately", () => {
    const settlement = {
      paidByOrderId: new Map([["ord-1", 400]]),
      processingByOrderId: new Map([["ord-1", 600]]),
    };
    const result = payoutFromSettlement("ord-1", 1000, settlement);
    assert.equal(result.paid, 400);
    assert.equal(result.processing, 600);
    assert.equal(result.paymentStatus, "partially_paid");
  });

  it("does not mark a processing-only window as approved", () => {
    assert.equal(
      payoutWindowStatus({ net: 1000, pending: 0, processing: 1000 }),
      "processing",
    );
    assert.equal(
      payoutWindowStatus({ net: 1000, pending: 0, processing: 0 }),
      "approved",
    );
    assert.equal(
      payoutWindowStatus({ net: 1000, pending: 200, processing: 800 }),
      "pending",
    );
  });
});
