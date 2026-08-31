import mongoose from "mongoose";

export const REQUEST_NUMBER_PAD = 5;

export function requestNumberPrefix(role) {
  return role === "fabric_store" ? "MOTD-FS-" : "MOTD-TA-";
}

export function counterIdForRole(role) {
  return role === "fabric_store"
    ? "partner_request_FS"
    : "partner_request_TA";
}

export function formatRequestNumber(role, seq) {
  const n = Number(seq);
  const padded = String(Number.isFinite(n) ? n : 0).padStart(
    REQUEST_NUMBER_PAD,
    "0",
  );
  return `${requestNumberPrefix(role)}${padded}`;
}

function seqFromFindOneAndUpdate(result) {
  if (result == null) return 0;
  if (typeof result.seq === "number") return result.seq;
  if (result.value && typeof result.value.seq === "number") {
    return result.value.seq;
  }
  return 0;
}

export async function mintRequestNumber(role, collection) {
  const col =
    collection || mongoose.connection.collection("app_counters");
  const result = await col.findOneAndUpdate(
    { _id: counterIdForRole(role) },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  const seq = seqFromFindOneAndUpdate(result);
  if (!seq) {
    throw new Error("Failed to mint partner request number");
  }
  return formatRequestNumber(role, seq);
}

export function escapeRegex(term) {
  return String(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function partnerUserSearchOr(search) {
  const term = String(search || "").trim();
  if (!term) return null;
  const rx = { $regex: escapeRegex(term), $options: "i" };
  return {
    $or: [
      { name: rx },
      { email: rx },
      { requestNumber: rx },
    ],
  };
}
