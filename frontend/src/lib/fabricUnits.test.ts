import assert from "node:assert/strict";
import test from "node:test";
import {
  cutValueToMeters as backendMeters,
  metersToWar as backendWar,
} from "../../../backend/utils/fabricUnits.js";
import {
  cutValueToMeters,
  formatCatalogCutLabels,
  formatCutEquivalentClause,
  metersToWar,
} from "./fabricUnits.ts";

const samples = [
  { value: 5, unit: "war" as const },
  { value: 3.5, unit: "meter" as const },
  { value: 5, unit: "meter" as const },
];

test("frontend conversion matches the server", () => {
  for (const sample of samples) {
    assert.equal(
      cutValueToMeters(sample.value, sample.unit),
      backendMeters(sample.value, sample.unit),
    );
    const meters = backendMeters(sample.value, sample.unit);
    assert.equal(metersToWar(meters), backendWar(meters));
  }
});

test("war cuts show meters and meter cuts show war, in both languages", () => {
  assert.deepEqual(formatCatalogCutLabels({
    name: "cut 2",
    nameAr: "قطعة 2",
    value: 5,
    unit: "war",
  }), {
    en: "cut 2 (5 war ≈ 4.57m)",
    ar: "قطعة 2 (5 وار ≈ 4.57م)",
  });

  assert.deepEqual(formatCatalogCutLabels({
    name: "Standard Cut",
    nameAr: "قصة قياسية",
    value: 3.5,
    unit: "meter",
  }), {
    en: "Standard Cut (3.5 m ≈ 3.83 war)",
    ar: "قصة قياسية (3.5 م ≈ 3.83 وار)",
  });

  assert.equal(
    formatCutEquivalentClause({ value: 5, unit: "meter" }, "en"),
    "5 m ≈ 5.47 war",
  );
  assert.equal(
    formatCutEquivalentClause({ value: 5, unit: "meter" }, "ar"),
    "5 م ≈ 5.47 وار",
  );
  assert.equal(
    formatCutEquivalentClause({ value: 5, unit: "war" }, "ar"),
    "5 وار ≈ 4.57م",
  );
});
