import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isShopProfileComplete } from "./shopReady.js";
import {
  emptyPayoutBank,
  isPayoutBankComplete,
  isValidUaeIban,
  normalizeIban,
  parsePayoutBankInput,
  PAYOUT_BANK_INVALID,
  PAYOUT_BANK_REQUIRED_ADMIN,
  payoutBankForApi,
  payoutBankTouched,
  resolvePayoutBankForRelease,
  serializePayoutBank,
} from "./partnerPayoutBank.js";

const VALID_IBAN = "AE070331234567890123456";
const VALID_IBAN_SPACED = "ae07 0331 2345 6789 0123 456";
const BAD_CHECKSUM = "AE000000000000000000000";
const COMPLETE = {
  accountHolderName: "Fabri Muazun",
  iban: VALID_IBAN,
  bankName: "Emirates NBD",
};

describe("UAE IBAN", () => {
  it("accepts a known-valid AE IBAN and strips spaces/case", () => {
    assert.equal(isValidUaeIban(VALID_IBAN), true);
    assert.equal(isValidUaeIban(VALID_IBAN_SPACED), true);
    assert.equal(normalizeIban(VALID_IBAN_SPACED), VALID_IBAN);
  });

  it("rejects wrong country, length, letters in digits, and bad checksum", () => {
    assert.equal(isValidUaeIban(""), false);
    assert.equal(isValidUaeIban("GB82WEST12345698765432"), false);
    assert.equal(isValidUaeIban("AE07033123456789012345"), false);
    assert.equal(isValidUaeIban("AE0703312345678901234567"), false);
    assert.equal(isValidUaeIban("AE07O331234567890123456"), false);
    assert.equal(isValidUaeIban(BAD_CHECKSUM), false);
  });
});

describe("parsePayoutBankInput (shop save)", () => {
  it("allows a fully empty bank so catalog/pickup can save first", () => {
    assert.deepEqual(parsePayoutBankInput(undefined), {
      bank: emptyPayoutBank(),
    });
    assert.deepEqual(parsePayoutBankInput({}), { bank: emptyPayoutBank() });
    assert.deepEqual(
      parsePayoutBankInput({
        accountHolderName: "  ",
        iban: "",
        bankName: "",
      }),
      { bank: emptyPayoutBank() },
    );
  });

  it("rejects any partial fill: holder only, IBAN only, bank name only", () => {
    assert.deepEqual(
      parsePayoutBankInput({ accountHolderName: "Fabri Muazun" }),
      { error: PAYOUT_BANK_INVALID },
    );
    assert.deepEqual(parsePayoutBankInput({ iban: VALID_IBAN }), {
      error: PAYOUT_BANK_INVALID,
    });
    assert.deepEqual(parsePayoutBankInput({ bankName: "Emirates NBD" }), {
      error: PAYOUT_BANK_INVALID,
    });
  });

  it("rejects holder + invalid IBAN, and a 1-character holder", () => {
    assert.deepEqual(
      parsePayoutBankInput({
        accountHolderName: "Fabri Muazun",
        iban: BAD_CHECKSUM,
      }),
      { error: PAYOUT_BANK_INVALID },
    );
    assert.deepEqual(
      parsePayoutBankInput({
        accountHolderName: "A",
        iban: VALID_IBAN,
      }),
      { error: PAYOUT_BANK_INVALID },
    );
  });

  it("accepts holder + valid IBAN without bank name, and normalizes input", () => {
    const parsed = parsePayoutBankInput({
      accountHolderName: "  Fabri   Muazun  ",
      iban: VALID_IBAN_SPACED,
      bankName: "",
    });
    assert.deepEqual(parsed.bank, {
      accountHolderName: "Fabri Muazun",
      iban: VALID_IBAN,
      bankName: "",
    });
    assert.equal(isPayoutBankComplete(parsed.bank), true);
  });

  it("accepts optional bank name when holder + IBAN are valid", () => {
    const parsed = parsePayoutBankInput(COMPLETE);
    assert.deepEqual(parsed.bank, serializePayoutBank(COMPLETE));
  });
});

describe("payoutBankForApi / touched / complete", () => {
  it("hides incomplete bank from API payloads", () => {
    assert.deepEqual(
      payoutBankForApi({ accountHolderName: "Fabri Muazun" }),
      emptyPayoutBank(),
    );
    assert.deepEqual(payoutBankForApi(COMPLETE), serializePayoutBank(COMPLETE));
  });

  it("treats any filled field as touched", () => {
    assert.equal(payoutBankTouched({}), false);
    assert.equal(payoutBankTouched({ bankName: "ENBD" }), true);
    assert.equal(payoutBankTouched(COMPLETE), true);
  });
});

describe("resolvePayoutBankForRelease (admin release / approve)", () => {
  it("does not require IBAN for shipping", () => {
    const resolved = resolvePayoutBankForRelease(
      { hasPayoutBank: false, payoutBank: emptyPayoutBank() },
      "shipping",
    );
    assert.equal(resolved.ok, true);
    assert.deepEqual(resolved.bank, emptyPayoutBank());
  });

  it("blocks tailor and fabric without a complete IBAN", () => {
    for (const kind of ["tailor", "fabric"]) {
      const missing = resolvePayoutBankForRelease(
        { hasPayoutBank: false, payoutBank: emptyPayoutBank() },
        kind,
      );
      assert.equal(missing.ok, false);
      assert.equal(missing.code, "MISSING_PAYOUT_BANK");
      assert.equal(missing.message, PAYOUT_BANK_REQUIRED_ADMIN);

      const flagOnly = resolvePayoutBankForRelease(
        { hasPayoutBank: true, payoutBank: { accountHolderName: "X" } },
        kind,
      );
      assert.equal(flagOnly.ok, false);
    }
  });

  it("snapshots holder + IBAN + bank name when complete", () => {
    const resolved = resolvePayoutBankForRelease(
      { hasPayoutBank: true, payoutBank: COMPLETE },
      "fabric",
    );
    assert.equal(resolved.ok, true);
    assert.equal(resolved.bank.accountHolderName, "Fabri Muazun");
    assert.equal(resolved.bank.iban, VALID_IBAN);
    assert.equal(resolved.bank.bankName, "Emirates NBD");
  });
});

describe("shop catalog completeness stays independent of IBAN", () => {
  it("isShopProfileComplete does not require payoutBank", () => {
    const shop = {
      name: "Mauzan Textiles",
      nameAr: "موزان",
      slug: "mauzan-textiles",
      phone: "+971501234567",
      pickupAddress: {
        fullName: "Mauzan",
        phone: "501234567",
        line1: "Warehouse 1",
        city: "Dubai",
        emirate: "dubai",
      },
    };
    assert.equal(isShopProfileComplete(shop), true);
    assert.equal(isShopProfileComplete({ ...shop, payoutBank: COMPLETE }), true);
    assert.equal(
      isShopProfileComplete({ ...shop, payoutBank: emptyPayoutBank() }),
      true,
    );
  });
});
