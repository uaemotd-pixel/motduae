import TailorShop from "../../models/TailorShop.js";
import FabricShop from "../../models/FabricShop.js";
import PartnerApplication from "../../models/PartnerApplication.js";
import { ensureUniqueSlug } from "../../utils/uniqueSlug.js";
import { normalizeUaePhone, trimText } from "./policy.js";

function shopModelForRole(role) {
  if (role === "tailor") return TailorShop;
  if (role === "fabric_store") return FabricShop;
  return null;
}

export function shopFieldsFromApplication(doc) {
  const name = trimText(doc.businessName);
  const nameAr = trimText(doc.businessNameAr) || name;
  return {
    name,
    nameAr,
    description: trimText(doc.about),
    descriptionAr: trimText(doc.aboutAr),
    logo: trimText(doc.logoUrl),
    location: trimText(doc.location || doc.area),
    city: trimText(doc.city),
    phone: normalizeUaePhone(doc.phone) || trimText(doc.phone),
  };
}

export async function seedShopFromApplication(user) {
  const Model = shopModelForRole(user?.role);
  if (!Model) return null;

  const doc = await PartnerApplication.findOne({ ownerId: user._id });
  if (!doc) return null;

  const fields = shopFieldsFromApplication(doc);
  if (!fields.name || !fields.nameAr) return null;

  const existing = await Model.findOne({ ownerId: user._id });
  if (existing) {
    return existing;
  }

  const slug = await ensureUniqueSlug(Model, fields.name, {
    fallback: "shop",
  });

  return Model.create({
    ...fields,
    slug,
    ownerId: user._id,
    isActive: true,
  });
}
