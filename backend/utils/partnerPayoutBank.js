import mongoose from "mongoose";

export const PAYOUT_BANK_HOLDER_MAX = 80;
export const PAYOUT_BANK_NAME_MAX = 80;
export const UAE_IBAN_LENGTH = 23;

export const PAYOUT_BANK_REQUIRED_PARTNER =
  "Add your account holder name and UAE IBAN on your shop profile before requesting a payout.";

export const PAYOUT_BANK_REQUIRED_ADMIN =
  "This partner has not added a UAE IBAN on their shop profile. Payment cannot be released until bank details are saved.";

export const PAYOUT_BANK_INVALID =
  "Enter the account holder name and a real UAE IBAN (AE + 21 digits with valid check digits). Example: AE070331234567890123456.";

export const payoutBankSchema = new mongoose.Schema(
  {
    accountHolderName: {
      type: String,
      default: "",
      trim: true,
      maxlength: PAYOUT_BANK_HOLDER_MAX,
    },
    iban: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
      maxlength: UAE_IBAN_LENGTH,
    },
    bankName: {
      type: String,
      default: "",
      trim: true,
      maxlength: PAYOUT_BANK_NAME_MAX,
    },
  },
  { _id: false },
);

export function emptyPayoutBank() {
  return { accountHolderName: "", iban: "", bankName: "" };
}

function toAsciiDigits(value) {
  return String(value || "").replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (ch) => {
    const code = ch.charCodeAt(0);
    if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
    return String(code - 0x06f0);
  });
}

export function normalizeIban(value) {
  let iban = toAsciiDigits(value)
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
  if (/^\d{21}$/.test(iban)) iban = `AE${iban}`;
  return iban.slice(0, UAE_IBAN_LENGTH);
}

function ibanMod97(iban) {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let expanded = "";
  for (const ch of rearranged) {
    const code = ch.charCodeAt(0);
    if (code >= 65 && code <= 90) expanded += String(code - 55);
    else expanded += ch;
  }
  let rest = 0;
  for (let i = 0; i < expanded.length; i += 7) {
    rest = Number(String(rest) + expanded.slice(i, i + 7)) % 97;
  }
  return rest === 1;
}

export function getUaeIbanIssue(value) {
  const iban = normalizeIban(value);
  if (!iban) return "empty";
  if (!/^AE\d{21}$/.test(iban)) return "format";
  if (!ibanMod97(iban)) return "checksum";
  return null;
}

export function isValidUaeIban(value) {
  return getUaeIbanIssue(value) === null;
}

export function serializePayoutBank(input) {
  const accountHolderName = String(input?.accountHolderName || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, PAYOUT_BANK_HOLDER_MAX);
  const iban = normalizeIban(input?.iban).slice(0, UAE_IBAN_LENGTH);
  const bankName = String(input?.bankName || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, PAYOUT_BANK_NAME_MAX);
  return { accountHolderName, iban, bankName };
}

export function isPayoutBankComplete(input) {
  const bank = serializePayoutBank(input);
  return bank.accountHolderName.length >= 2 && isValidUaeIban(bank.iban);
}

export function payoutBankTouched(input) {
  const bank = serializePayoutBank(input);
  return Boolean(bank.accountHolderName || bank.iban || bank.bankName);
}

/**
 * Empty is allowed (partner can save the rest of the shop first).
 * Any filled field requires a complete, valid UAE IBAN + holder name.
 */
export function parsePayoutBankInput(input) {
  const bank = serializePayoutBank(input);
  if (!payoutBankTouched(bank)) {
    return { bank: emptyPayoutBank() };
  }
  if (!isPayoutBankComplete(bank)) {
    return { error: PAYOUT_BANK_INVALID };
  }
  return { bank };
}

export function payoutBankForApi(input) {
  if (!isPayoutBankComplete(input)) return emptyPayoutBank();
  return serializePayoutBank(input);
}

/**
 * Shipping has no shop IBAN. Tailor/fabric release and request-approve
 * need a complete UAE IBAN snapshot.
 */
export function resolvePayoutBankForRelease(settlement, partnerKind) {
  if (partnerKind === "shipping") {
    return { ok: true, bank: emptyPayoutBank() };
  }
  if (
    !settlement?.hasPayoutBank ||
    !isPayoutBankComplete(settlement.payoutBank)
  ) {
    return {
      ok: false,
      code: "MISSING_PAYOUT_BANK",
      message: PAYOUT_BANK_REQUIRED_ADMIN,
    };
  }
  return { ok: true, bank: serializePayoutBank(settlement.payoutBank) };
}
