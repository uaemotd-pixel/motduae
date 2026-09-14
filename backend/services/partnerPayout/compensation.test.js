import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  shouldWritePayoutVoidCredit,
  shouldCloseStalePayoutRequest,
} from "./compensation.js";

describe("payout void credit", () => {
  it("writes a void credit only when a payout debit already exists", () => {
    assert.equal(shouldWritePayoutVoidCredit(null), false);
    assert.equal(shouldWritePayoutVoidCredit(undefined), false);
    assert.equal(shouldWritePayoutVoidCredit(false), false);
    assert.equal(
      shouldWritePayoutVoidCredit({ idempotencyKey: "ledger:payout:abc" }),
      true,
    );
  });
});

describe("stale payout-request close", () => {
  it("does not close a ticket after a partial 4000 of 5870 pay", () => {
    const remainingAfterPartial = 5870 - 4000;
    assert.equal(remainingAfterPartial, 1870);
    assert.equal(shouldCloseStalePayoutRequest(1870), false);
  });

  it("closes a ticket only when ready-to-pay is already 0", () => {
    assert.equal(shouldCloseStalePayoutRequest(0), true);
    assert.equal(shouldCloseStalePayoutRequest(""), true);
    assert.equal(shouldCloseStalePayoutRequest(1), false);
  });
});
