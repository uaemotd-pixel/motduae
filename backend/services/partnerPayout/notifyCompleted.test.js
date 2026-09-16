import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EMAIL_EVENTS } from "../email/emailEvents.js";
import { partnerPayoutCompletedTemplate } from "../email/templates/partnerPayoutCompleted.js";
import {
  PAYOUT_COMPLETED_ORDER_LIMIT,
  buildPayoutCompletedMailPayload,
  formatAedDisplay,
  formatOrderLinesForMail,
  logPayoutNotifySkip,
  paidToName,
  payoutCompletedBellDedupeKey,
  payoutCompletedEmailDedupeKey,
  payoutCompletedPortalUrl,
  shouldNotifyPayoutCompleted,
  shortOrderId,
} from "./notifyCompleted.js";

const PAYOUT_WITH_BANK = {
  partnerKind: "tailor",
  amountAed: 1250,
  bankRef: "TRX-991",
  completedAt: new Date(Date.UTC(2026, 8, 16, 12, 0, 0)),
  payeeName: "Shop display name",
  payoutBank: {
    accountHolderName: "Fabri Muazun",
    iban: "AE070331234567890123456",
    bankName: "Emirates NBD",
  },
  lines: [
    { orderId: "abc123def456", amountAed: 320 },
    { orderId: "zzz999aaa888", amount: 930 },
  ],
};

describe("payout completed notify helpers", () => {
  it("notifies tailor and fabric only, not shipping", () => {
    assert.equal(shouldNotifyPayoutCompleted("tailor"), true);
    assert.equal(shouldNotifyPayoutCompleted("fabric"), true);
    assert.equal(shouldNotifyPayoutCompleted("shipping"), false);
    assert.equal(shouldNotifyPayoutCompleted("other"), false);
  });

  it("builds portal URLs by partner kind", () => {
    assert.equal(
      payoutCompletedPortalUrl("https://motd.example/", "tailor"),
      "https://motd.example/en/tailor",
    );
    assert.equal(
      payoutCompletedPortalUrl("https://motd.example", "fabric"),
      "https://motd.example/en/fabric",
    );
  });

  it("shortens order ids and formats 15+ overflow", () => {
    assert.equal(shortOrderId("abc123def456"), "DEF456");
    const many = Array.from({ length: 17 }, (_, i) => ({
      orderId: `order-${String(i).padStart(4, "0")}`,
      amountAed: 10,
    }));
    const formatted = formatOrderLinesForMail(many);
    assert.equal(formatted.rows.length, PAYOUT_COMPLETED_ORDER_LIMIT);
    assert.equal(formatted.moreCount, 2);
  });

  it("prefers account holder name and never puts IBAN on the mail payload", () => {
    assert.equal(paidToName(PAYOUT_WITH_BANK), "Fabri Muazun");
    assert.equal(
      paidToName({ payeeName: "Shop only" }),
      "Shop only",
    );

    const payload = buildPayoutCompletedMailPayload({
      payout: PAYOUT_WITH_BANK,
      recipient: { name: "Ali" },
      origin: "https://motd.example",
    });

    assert.equal(payload.name, "Ali");
    assert.equal(payload.bankRef, "TRX-991");
    assert.equal(payload.paidTo, "Fabri Muazun");
    assert.equal(payload.amountLabel, formatAedDisplay(1250));
    assert.equal(payload.portalUrl, "https://motd.example/en/tailor");
    assert.equal(payload.orderLines.length, 2);
    assert.equal(payload.moreCount, 0);
    assert.equal(Object.hasOwn(payload, "iban"), false);
    assert.equal(JSON.stringify(payload).includes("AE070331234567890123456"), false);
    assert.equal(JSON.stringify(payload).includes("iban"), false);
  });

  it("uses payout-id email and bell dedupe keys", () => {
    const payoutId = "64b1c2d3e4f5060708090a0b";
    assert.equal(
      payoutCompletedEmailDedupeKey(payoutId),
      `email:${EMAIL_EVENTS.PARTNER_PAYOUT_COMPLETED}:${payoutId}`,
    );
    assert.equal(
      payoutCompletedBellDedupeKey("fabric", payoutId),
      `fabric:payout_completed:${payoutId}`,
    );
  });

  it("renders locked copy without IBAN", () => {
    const payload = buildPayoutCompletedMailPayload({
      payout: PAYOUT_WITH_BANK,
      recipient: { name: "Ali" },
      origin: "https://motd.example",
    });
    const rendered = partnerPayoutCompletedTemplate(payload);
    assert.match(rendered.subject, /Payout Released from MOTD · AED /);
    assert.match(rendered.text, /MOTD has sent a payout to your account/);
    assert.match(rendered.text, /Transfer number: TRX-991/);
    assert.match(rendered.text, /Paid to: Fabri Muazun/);
    assert.match(rendered.text, /1–2 business days/);
    assert.match(rendered.text, /Open your dashboard/);
    assert.match(rendered.html, /Open your dashboard/);
    assert.match(rendered.html, /<table role="presentation"/);
    assert.match(rendered.html, />Order</);
    assert.match(rendered.html, />Amount</);
    assert.match(rendered.html, /#DEF456/);
    assert.equal(rendered.html.includes("<ul"), false);
    assert.equal(rendered.html.includes("<li"), false);
    assert.equal(rendered.text.includes("AE070331234567890123456"), false);
    assert.equal(rendered.html.includes("AE070331234567890123456"), false);
  });

  it("logs skip reasons without email or IBAN", () => {
    const warnings = [];
    const original = console.warn;
    console.warn = (...args) => warnings.push(args.map(String).join(" "));
    try {
      logPayoutNotifySkip("partner_kind_skipped", {
        payoutId: "p1",
        partnerKind: "shipping",
        partnerId: "ship-1",
        iban: "AE070331234567890123456",
        email: "owner@example.com",
      });
      logPayoutNotifySkip("missing_owner", {
        payoutId: "p2",
        partnerKind: "tailor",
        partnerId: "shop-9",
      });
      logPayoutNotifySkip("missing_email", {
        payoutId: "p3",
        partnerKind: "fabric",
        ownerId: "user-22",
      });
    } finally {
      console.warn = original;
    }

    assert.match(warnings[0], /skip partner_kind_skipped/);
    assert.match(warnings[0], /partnerKind=shipping/);
    assert.match(warnings[1], /skip missing_owner/);
    assert.match(warnings[2], /skip missing_email/);
    assert.match(warnings[2], /ownerId=user-22/);
    const joined = warnings.join("\n");
    assert.equal(joined.includes("AE070331234567890123456"), false);
    assert.equal(joined.includes("owner@example.com"), false);
    assert.equal(joined.includes("iban="), false);
    assert.equal(joined.includes("email="), false);
  });
});
