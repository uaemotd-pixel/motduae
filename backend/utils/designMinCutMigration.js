import mongoose from "mongoose";
import Design from "../models/Design.js";
import Cut from "../models/Cut.js";
import Fabric from "../models/Fabric.js";
import { cutValueToMeters } from "./fabricUnits.js";

/**
 * Ensures that:
 * 1. At least one active Cut exists in the database.
 * 2. Every live design has a valid minCutId and minCutSnapshot embedded.
 * 3. Every active storefront fabric has at least one cut.
 */
export async function ensureDesignsHaveMinCut() {
  try {
    let activeCuts = await Cut.find({ isActive: true }).sort({ value: 1 });

    if (activeCuts.length === 0) {
      console.log("[Migration] No active cuts found in database. Creating default cut...");
      const defaultCut = await Cut.create({
        name: "Standard Cut",
        nameAr: "قصة قياسية",
        value: 3.5,
        unit: "meter",
        isActive: true,
      });
      activeCuts = [defaultCut];
    }

    // Find designs missing minCutId or where minCutId is null
    const designsNeedingCut = await Design.find({
      $or: [{ minCutId: { $exists: false } }, { minCutId: null }],
    });

    if (designsNeedingCut.length > 0) {
      console.log(`[Migration] Backfilling minCutId for ${designsNeedingCut.length} design(s)...`);

      for (const design of designsNeedingCut) {
        // Pick best matching cut by length or default to first
        let bestCut = activeCuts[0];
        if (design.estimatedMeters && design.estimatedMeters > 0) {
          let minDiff = Infinity;
          for (const cut of activeCuts) {
            const cutMeters = cutValueToMeters(cut.value, cut.unit);
            const diff = Math.abs(cutMeters - design.estimatedMeters);
            if (diff < minDiff) {
              minDiff = diff;
              bestCut = cut;
            }
          }
        }

        const lengthInMeters = cutValueToMeters(bestCut.value, bestCut.unit);
        design.minCutId = bestCut._id;
        design.minCutSnapshot = {
          name: bestCut.name,
          nameAr: bestCut.nameAr || "",
          lengthInMeters,
        };
        design.estimatedMeters = lengthInMeters;

        await design.save();
      }
      console.log(`[Migration] Successfully assigned minCutId to ${designsNeedingCut.length} design(s).`);
    }

    // Also populate minCutSnapshot for any designs that have minCutId but missing snapshot details
    const designsNeedingSnapshot = await Design.find({
      minCutId: { $exists: true, $ne: null },
      $or: [
        { minCutSnapshot: { $exists: false } },
        { "minCutSnapshot.name": { $in: ["", null] } },
      ],
    }).populate("minCutId");

    if (designsNeedingSnapshot.length > 0) {
      for (const design of designsNeedingSnapshot) {
        const cut = design.minCutId;
        if (cut && cut.value && cut.unit) {
          const lengthInMeters = cutValueToMeters(cut.value, cut.unit);
          design.minCutSnapshot = {
            name: cut.name,
            nameAr: cut.nameAr || "",
            lengthInMeters,
          };
          design.estimatedMeters = lengthInMeters;
          await design.save();
        }
      }
    }

    // Also ensure active storefront fabrics have at least one cut
    const fabricsNeedingCuts = await Fabric.find({
      $or: [{ cuts: { $exists: false } }, { cuts: { $size: 0 } }],
    });

    if (fabricsNeedingCuts.length > 0) {
      console.log(`[Migration] Backfilling cuts for ${fabricsNeedingCuts.length} fabric(s)...`);
      const defaultCut = activeCuts[0];
      const defaultLength = cutValueToMeters(defaultCut.value, defaultCut.unit);

      for (const fabric of fabricsNeedingCuts) {
        const price = fabric.pricePerMeter ? Math.round(fabric.pricePerMeter * defaultLength) : 350;
        fabric.cuts = [
          {
            cutId: defaultCut._id,
            price,
            stock: 10,
          },
        ];
        await fabric.save();
      }
      console.log(`[Migration] Successfully assigned cuts to ${fabricsNeedingCuts.length} fabric(s).`);
    }
  } catch (error) {
    console.error("[Migration] Error in ensureDesignsHaveMinCut:", error);
  }
}
