import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computePartnerExperience,
  parseExactExperience,
} from "./partnerExperience.js";
import {
  applyPatch,
  applySubmitMutation,
  collectSubmitErrors,
} from "../services/partnerApplication/partnerApplicationService.js";

const SUBMITTED = new Date("2026-01-15T00:00:00Z");

function tailorUser() {
  return { role: "tailor" };
}

function readyDoc(extra = {}) {
  return {
    businessName: "Atelier",
    businessNameAr: "أتيليه",
    phone: "501234567",
    city: "Dubai",
    location: "Al Fahidi",
    about: "Bespoke tailoring",
    aboutAr: "خياطة",
    makeTime: "d7",
    workSetup: "workshop",
    requestNumber: "RQ1",
    ...extra,
  };
}

describe("exact partner experience", () => {
  it("rejects a year outside 0 to 80 and months outside 0 to 11", () => {
    assert.equal(parseExactExperience("", 0), null);
    assert.equal(parseExactExperience(81, 0), null);
    assert.equal(parseExactExperience(-1, 0), null);
    assert.equal(parseExactExperience(7, 12), null);
    assert.equal(parseExactExperience(7.5, 0), null);
    assert.deepEqual(parseExactExperience(7, 0), {
      years: 7,
      months: 0,
      totalMonths: 84,
    });
  });

  it("shows the entered 7 years, not the 3–10 year window", () => {
    const doc = readyDoc();
    const owner = { approvalStatus: "pending", applicationSubmittedAt: null };
    applyPatch(doc, { experienceYears: 7, experienceMonths: 0 });
    assert.equal(collectSubmitErrors(tailorUser(), doc).experienceYears, undefined);
    applySubmitMutation(owner, doc, SUBMITTED, "RQ1");

    const shown = computePartnerExperience(doc, SUBMITTED);
    assert.equal(shown.years, 7);
    assert.equal(shown.months, 0);
    assert.equal(doc.experienceBaselineMonths, 84);
  });

  it("adds one month, then rolls into the next year", () => {
    const doc = readyDoc();
    const owner = { approvalStatus: "pending", applicationSubmittedAt: null };
    applyPatch(doc, { experienceYears: 7, experienceMonths: 0 });
    applySubmitMutation(owner, doc, SUBMITTED, "RQ1");

    const nextMonth = computePartnerExperience(
      doc,
      new Date("2026-02-15T00:00:00Z"),
    );
    assert.equal(nextMonth.years, 7);
    assert.equal(nextMonth.months, 1);

    const nextYear = computePartnerExperience(
      doc,
      new Date("2027-01-15T00:00:00Z"),
    );
    assert.equal(nextYear.years, 8);
    assert.equal(nextYear.months, 0);
  });

  it("keeps under one year at zero until a full month passes", () => {
    const doc = readyDoc();
    const owner = { approvalStatus: "pending", applicationSubmittedAt: null };
    applyPatch(doc, { experienceYears: 0, experienceMonths: 0 });
    applySubmitMutation(owner, doc, SUBMITTED, "RQ1");

    const sameDay = computePartnerExperience(doc, SUBMITTED);
    assert.equal(sameDay.years, 0);
    assert.equal(sameDay.months, 0);

    const later = computePartnerExperience(
      doc,
      new Date("2026-02-15T00:00:00Z"),
    );
    assert.equal(later.years, 0);
    assert.equal(later.months, 1);
  });

  it("starts from entered months when the partner has no full year", () => {
    const doc = readyDoc();
    const owner = { approvalStatus: "pending", applicationSubmittedAt: null };
    applyPatch(doc, { experienceYears: 0, experienceMonths: 7 });
    applySubmitMutation(owner, doc, SUBMITTED, "RQ1");

    const later = computePartnerExperience(
      doc,
      new Date("2026-03-15T00:00:00Z"),
    );
    assert.equal(later.years, 0);
    assert.equal(later.months, 9);
  });

  it("restarts the clock when a resubmit changes the entered years", () => {
    const doc = readyDoc();
    const owner = {
      approvalStatus: "rejected",
      applicationSubmittedAt: SUBMITTED,
    };
    applyPatch(doc, { experienceYears: 7, experienceMonths: 0 });
    applySubmitMutation(owner, doc, SUBMITTED, "RQ1");

    const revisedAt = new Date("2026-07-15T00:00:00Z");
    applyPatch(doc, { experienceYears: 8, experienceMonths: 0 });
    applySubmitMutation(owner, doc, revisedAt, "RQ1");

    const shown = computePartnerExperience(doc, revisedAt);
    assert.equal(shown.years, 8);
    assert.equal(shown.months, 0);
    assert.equal(doc.experienceAnchorAt, revisedAt);
  });

  it("keeps a legacy range application on the bottom of that range", () => {
    const shown = computePartnerExperience(
      {
        yearsOperating: "3_10",
        experienceBaselineMonths: 36,
        experienceAnchorAt: SUBMITTED,
      },
      SUBMITTED,
    );
    assert.equal(shown.years, 3);
    assert.equal(shown.months, 0);
  });

  it("requires years before submit", () => {
    const errors = collectSubmitErrors(tailorUser(), readyDoc());
    assert.equal(errors.experienceYears, "Years of experience is required");
  });
});
