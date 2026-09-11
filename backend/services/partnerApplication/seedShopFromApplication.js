import TailorShop from "../../models/TailorShop.js";
import FabricShop from "../../models/FabricShop.js";
import PartnerApplication from "../../models/PartnerApplication.js";
import { ensureUniqueSlug } from "../../utils/uniqueSlug.js";
import {
  normalizeSocialLinks,
  normalizeUaePhone,
  trimText,
} from "./policy.js";

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
    website: trimText(doc.website),
    social: normalizeSocialLinks(doc.social),
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

  const payload = {
    name: fields.name,
    nameAr: fields.nameAr,
    description: fields.description,
    descriptionAr: fields.descriptionAr,
    logo: fields.logo,
    location: fields.location,
    city: fields.city,
    phone: fields.phone,
    website: fields.website,
    social: fields.social,
    slug,
    ownerId: user._id,
    isActive: true,
  };

  return Model.create(payload);
}
