import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { earningIdempotencyKey, requireIdempotencyKey } from "./keys.js";
import { PartnerPayoutError } from "./errors.js";

describe("idempotency keys", () => {
  it("uses a stable earning key per order/partner/component", () => {
    const key = earningIdempotencyKey("ord1", "shop1", "tailor");
    assert.equal(key, "earning:ord1:shop1:tailor");
    assert.equal(earningIdempotencyKey("ord1", "shop1", "tailor"), key);
  });

  it("rejects a missing release Idempotency-Key", () => {
    assert.throws(
      () => requireIdempotencyKey(""),
      (err) =>
        err instanceof PartnerPayoutError &&
        err.code === "MISSING_IDEMPOTENCY_KEY",
    );
  });

  it("accepts a client UUID and treats the same key as the same payout", () => {
    const key = "11111111-2222-3333-4444-555555555555";
    assert.equal(requireIdempotencyKey(key), key);
    assert.equal(requireIdempotencyKey(` ${key} `), key);
  });
});

/**
 * Mongo transaction tests (release / complete / cancel) need a replica set.
 * Atlas is fine. A local standalone mongod cannot run this module.
 */
