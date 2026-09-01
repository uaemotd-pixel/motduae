import PartnerApplication from "../../models/PartnerApplication.js";
import User from "../../models/User.js";
import TailorShop from "../../models/TailorShop.js";
import FabricShop from "../../models/FabricShop.js";
import { notifyPartnerApplicationSubmitted } from "../emailVerification/partnerSubmission.js";
import { sendPartnerLifecycleEmail } from "./partnerApplicationMail.js";
import {
  ABOUT_MAX_LENGTH,
  MAKE_TIMES,
  OFFERINGS,
  PARTNER_NOTE_MAX_LENGTH,
  PartnerApplicationError,
  WORK_SETUPS,
  YEARS_OPERATING,
  hasSubmittedApplication,
  isPartnerRole,
  isValidUaePhone,
  normalizeSocialLinks,
  normalizeUaePhone,
  trimText,
  trimUrl,
} from "./policy.js";
import { mintRequestNumber } from "./requestNumber.js";

const PATCH_KEYS = [
  "businessName",
  "businessNameAr",
  "phone",
  "city",
  "location",
  "area",
  "about",
  "aboutAr",
  "yearsOperating",
  "website",
  "licenceNumber",
  "makeTime",
  "workSetup",
  "offering",
];
const MEDIA_CLEAR_KEYS = ["logoUrl", "licenceFileUrl"];

export function toApplicationDto(doc) {
  if (!doc) {
    return null;
  }
  return {
    ownerId: String(doc.ownerId),
    role: doc.role,
    businessName: doc.businessName || "",
    businessNameAr: doc.businessNameAr || "",
    phone: doc.phone || "",
    city: doc.city || "",
    location: doc.location || doc.area || "",
    about: doc.about || "",
    aboutAr: doc.aboutAr || "",
    yearsOperating: doc.yearsOperating || "",
    logoUrl: doc.logoUrl || "",
    website: doc.website || "",
    social: normalizeSocialLinks(doc.social),
    licenceNumber: doc.licenceNumber || "",
    licenceFileUrl: doc.licenceFileUrl || "",
    makeTime: doc.makeTime || "",
    workSetup: doc.workSetup || "",
    offering: doc.offering || "",
    submittedAt: doc.submittedAt || null,
    confirmedAt: doc.confirmedAt || null,
    requestNumber: doc.requestNumber || "",
    partnerNote: doc.partnerNote || "",
    resubmitCount: doc.resubmitCount || 0,
    resubmittedAt: doc.resubmittedAt || null,
  };
}

export function toShopSnapshotDto(shop) {
  if (!shop) {
    return null;
  }
  const pickup = shop.pickupAddress || {};
  return {
    name: shop.name || "",
    nameAr: shop.nameAr || "",
    slug: shop.slug || "",
    description: shop.description || "",
    descriptionAr: shop.descriptionAr || "",
    phone: shop.phone || "",
    city: shop.city || "",
    location: shop.location || "",
    logo: shop.logo || "",
    coverImage: shop.coverImage || "",
    isActive: shop.isActive !== false,
    rating: Number(shop.rating) || 0,
    reviewCount: Number(shop.reviewCount) || 0,
    pickupAddress: {
      fullName: pickup.fullName || "",
      phone: pickup.phone || "",
      line1: pickup.line1 || "",
      line2: pickup.line2 || "",
      city: pickup.city || "",
      emirate: pickup.emirate || "",
    },
    updatedAt: shop.updatedAt || null,
  };
}

export function toAdminApplicationDto(user, doc, shop) {
  return {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      authProvider: user.authProvider,
      emailVerified: user.emailVerified,
      approvalStatus: user.approvalStatus,
      applicationSubmittedAt: user.applicationSubmittedAt || null,
      applicationConfirmedAt: user.applicationConfirmedAt || null,
      requestNumber: user.requestNumber || doc?.requestNumber || "",
      rejectionNote: user.rejectionNote || "",
      approvalNote: user.approvalNote || "",
      createdAt: user.createdAt,
    },
    application: toApplicationDto(doc),
    shop: toShopSnapshotDto(shop),
    legacy: !doc,
  };
}

export function assertPartnerSession(user) {
  if (!user || !isPartnerRole(user.role)) {
    throw new PartnerApplicationError(
      "NOT_A_PARTNER",
      "Only tailor and fabric store accounts can use this",
      403,
    );
  }
}

export function assertNotSubmitted(user, application) {
  if (user?.approvalStatus === "rejected") {
    return;
  }
  if (hasSubmittedApplication(user) || application?.submittedAt) {
    throw new PartnerApplicationError(
      "APPLICATION_ALREADY_SUBMITTED",
      "This application has already been submitted",
      409,
    );
  }
}

export function applySubmitMutation(owner, doc, now, mintedNumber) {
  if (!doc.requestNumber) {
    doc.requestNumber = mintedNumber;
  }
  owner.requestNumber = doc.requestNumber;
  doc.submittedAt = now;
  doc.confirmedAt = now;
  if (owner.approvalStatus === "rejected") {
    doc.resubmitCount = (Number(doc.resubmitCount) || 0) + 1;
    doc.resubmittedAt = now;
    owner.approvalStatus = "pending";
  }
  owner.applicationSubmittedAt = now;
  owner.applicationConfirmedAt = now;
}

export async function getOrCreateDraft(user) {
  assertPartnerSession(user);
  let doc = await PartnerApplication.findOne({ ownerId: user._id });
  if (doc) {
    return doc;
  }
  doc = await PartnerApplication.create({
    ownerId: user._id,
    role: user.role,
    social: [],
  });
  return doc;
}

export function applyPatch(doc, body = {}) {
  for (const key of PATCH_KEYS) {
    if (body[key] === undefined) continue;
    if (key === "phone") {
      const normalized = normalizeUaePhone(body.phone);
      doc.phone = normalized || trimText(body.phone);
      continue;
    }
    if (key === "location" || key === "area") {
      doc.location = trimText(body.location ?? body.area);
      doc.area = doc.location;
      continue;
    }
    if (key === "about" || key === "aboutAr") {
      doc[key] = trimText(body[key], ABOUT_MAX_LENGTH);
      continue;
    }
    if (key === "website") {
      doc.website = trimUrl(body.website);
      continue;
    }
    if (key === "yearsOperating") {
      const value = String(body.yearsOperating || "").trim();
      doc.yearsOperating = YEARS_OPERATING.includes(value) ? value : "";
      continue;
    }
    if (key === "makeTime") {
      const value = String(body.makeTime || "").trim();
      doc.makeTime = MAKE_TIMES.includes(value) ? value : "";
      continue;
    }
    if (key === "workSetup") {
      const value = String(body.workSetup || "").trim();
      doc.workSetup = WORK_SETUPS.includes(value) ? value : "";
      continue;
    }
    if (key === "offering") {
      const value = String(body.offering || "").trim();
      doc.offering = OFFERINGS.includes(value) ? value : "";
      continue;
    }
    doc[key] = trimText(body[key]);
  }

  for (const key of MEDIA_CLEAR_KEYS) {
    if (body[key] === undefined) continue;
    if (body[key] === "" || body[key] == null) {
      doc[key] = "";
    }
  }

  if (body.social !== undefined) {
    doc.social = normalizeSocialLinks(body.social);
  }

  if (body.partnerNote !== undefined) {
    doc.partnerNote = trimText(body.partnerNote, PARTNER_NOTE_MAX_LENGTH);
  }
}

export function collectSubmitErrors(user, doc) {
  const errors = {};
  const requireText = (key, label) => {
    if (!trimText(doc[key])) {
      errors[key] = `${label} is required`;
    }
  };

  requireText("businessName", "Business name");
  requireText("businessNameAr", "Business name (Arabic)");
  if (!isValidUaePhone(doc.phone)) {
    errors.phone = "A valid UAE phone (+971 and 9 digits) is required";
  }
  requireText("city", "City");
  if (!trimText(doc.location || doc.area)) {
    errors.location = "Address / area is required";
  }
  requireText("about", "About");
  requireText("aboutAr", "About (Arabic)");
  if (!YEARS_OPERATING.includes(doc.yearsOperating)) {
    errors.yearsOperating = "Years operating is required";
  }

  if (user.role === "tailor") {
    if (!MAKE_TIMES.includes(doc.makeTime)) {
      errors.makeTime = "Typical make time is required";
    }
    if (!WORK_SETUPS.includes(doc.workSetup)) {
      errors.workSetup = "Work setup is required";
    }
  }

  if (user.role === "fabric_store") {
    if (!OFFERINGS.includes(doc.offering)) {
      errors.offering = "Typical offering is required";
    }
  }

  return errors;
}

export async function getApplicationForUser(user) {
  assertPartnerSession(user);
  const doc = await PartnerApplication.findOne({ ownerId: user._id });
  return doc ? toApplicationDto(doc) : null;
}

export async function assertPartnerCanMutateApplication(user) {
  assertPartnerSession(user);
  const owner = await User.findById(user._id);
  if (!owner) {
    throw new PartnerApplicationError("NOT_FOUND", "User not found", 404);
  }
  const doc = await PartnerApplication.findOne({ ownerId: owner._id });
  assertNotSubmitted(owner, doc);
  return { owner, doc };
}

export async function patchDraft(user, body) {
  await assertPartnerCanMutateApplication(user);
  const doc = await getOrCreateDraft(user);
  applyPatch(doc, body);
  await doc.save();
  return toApplicationDto(doc);
}

export async function attachUpload(user, variant, url) {
  assertPartnerSession(user);
  const doc = await getOrCreateDraft(user);
  assertNotSubmitted(user, doc);
  if (variant === "licence") {
    doc.licenceFileUrl = url;
  } else {
    doc.logoUrl = url;
  }
  await doc.save();
  return toApplicationDto(doc);
}

export async function submitApplication(user) {
  assertPartnerSession(user);
  const owner = await User.findById(user._id);
  if (!owner) {
    throw new PartnerApplicationError(
      "NOT_A_PARTNER",
      "Account not found",
      404,
    );
  }
  const doc = await getOrCreateDraft(owner);
  assertNotSubmitted(owner, doc);

  const errors = collectSubmitErrors(owner, doc);
  if (Object.keys(errors).length > 0) {
    throw new PartnerApplicationError(
      "APPLICATION_INCOMPLETE",
      "Please complete the required fields",
      400,
      { errors },
    );
  }

  const isResubmit = owner.approvalStatus === "rejected";
  const now = new Date();
  let mintedNumber;
  if (!doc.requestNumber) {
    mintedNumber = await mintRequestNumber(owner.role);
  }
  applySubmitMutation(owner, doc, now, mintedNumber);
  await doc.save();
  await owner.save();

  await notifyPartnerApplicationSubmitted(owner, {
    resubmitted: isResubmit,
    resubmitCount: Number(doc.resubmitCount) || 0,
  });
  await sendPartnerLifecycleEmail(owner, isResubmit ? "resubmitted" : "submitted", {
    resubmitCount: Number(doc.resubmitCount) || 0,
  });

  return {
    application: toApplicationDto(doc),
    applicationSubmittedAt: owner.applicationSubmittedAt,
  };
}

export async function getAdminApplication(userId, expectedRole) {
  const owner = await User.findById(userId).select(
    "-password -resetPasswordToken -emailVerificationOTPHash",
  );
  if (!owner || owner.role !== expectedRole) {
    throw new PartnerApplicationError(
      "APPLICATION_NOT_FOUND",
      "Partner not found",
      404,
    );
  }
  const [doc, shop] = await Promise.all([
    PartnerApplication.findOne({ ownerId: owner._id }),
    (expectedRole === "fabric_store" ? FabricShop : TailorShop).findOne({
      ownerId: owner._id,
    }),
  ]);
  return toAdminApplicationDto(owner, doc, shop);
}
