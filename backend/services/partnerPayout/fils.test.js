import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyMotdCommission } from "../../utils/motdCommission.js";
import {
  roundFils,
  filsToAed,
  splitCommissionFils,
  isDuplicateKeyError,
} from "../../utils/fils.js";

describe("fils helpers", () => {
  it("rounds AED to integer fils", () => {
    assert.equal(roundFils(350), 35000);
    assert.equal(roundFils(12.345), 1235);
    assert.equal(roundFils(0), 0);
    assert.equal(filsToAed(35000), 350);
    assert.equal(filsToAed(1235), 12.35);
  });

  it("splits commission in fils without rewriting mixed percents", () => {
    const at12 = splitCommissionFils(350, 12);
    assert.deepEqual(at12, {
      grossFils: 35000,
      commissionFils: 3750,
      netFils: 31250,
      percent: 12,
    });

    const at13 = splitCommissionFils(350, 13);
    assert.deepEqual(at13, {
      grossFils: 35000,
      commissionFils: 4027,
      netFils: 30973,
      percent: 13,
    });

    const tenAt12 = 10 * at12.netFils;
    const thirteenAt13 = 13 * at13.netFils;
    assert.equal(tenAt12 + thirteenAt13, 31250 * 10 + 30973 * 13);
    assert.equal(filsToAed(tenAt12 + thirteenAt13), 7151.49);
  });

  it("freezes partner net from customer-gross catalog prices", () => {
    const tailorGross = applyMotdCommission(350, 12);
    const tailor = splitCommissionFils(tailorGross, 12);
    assert.equal(tailorGross, 392);
    assert.equal(tailor.netFils, 35000);

    const fabricGross = applyMotdCommission(100, 15);
    const fabric = splitCommissionFils(fabricGross, 15);
    assert.equal(fabricGross, 115);
    assert.equal(fabric.netFils, 10000);
  });

  it("treats Mongo E11000 as a duplicate-key success signal", () => {
    assert.equal(isDuplicateKeyError({ code: 11000 }), true);
    assert.equal(isDuplicateKeyError({ code: 11001 }), true);
    assert.equal(isDuplicateKeyError({ code: 1 }), false);
    assert.equal(isDuplicateKeyError(null), false);
  });
});
