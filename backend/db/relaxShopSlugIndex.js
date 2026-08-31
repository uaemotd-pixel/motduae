import mongoose from "mongoose";
import TailorShop from "../models/TailorShop.js";
import FabricShop from "../models/FabricShop.js";

const MIGRATION_ID = "d4_shop_slug_optional";

async function relaxSlugIndex(Model) {
  try {
    await Model.collection.dropIndex("slug_1");
  } catch (err) {
    if (err?.code !== 27 && err?.codeName !== "IndexNotFound") {
      console.warn(
        `Could not drop slug_1 on ${Model.collection.name}:`,
        err.message,
      );
    }
  }
  await Model.updateMany({ slug: "" }, { $unset: { slug: 1 } });
  await Model.createIndexes();
}

export async function relaxShopSlugIndex() {
  const col = mongoose.connection.collection("app_migrations");
  const existing = await col.findOne({ _id: MIGRATION_ID });
  if (existing) return;

  await relaxSlugIndex(TailorShop);
  await relaxSlugIndex(FabricShop);

  await col.insertOne({
    _id: MIGRATION_ID,
    ranAt: new Date(),
  });
}
