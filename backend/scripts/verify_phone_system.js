import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { toUaePhoneDigits, isValidUaePhone, normalizeUaePhone, formatPhoneDisplay } from "../utils/uaePhone.js";

console.log("--- Testing UAE Phone Utility Functions ---");
const testCases = [
  { input: "+971501234567", expectedDigits: "501234567", valid: true },
  { input: "0501234567", expectedDigits: "501234567", valid: true },
  { input: "501234567", expectedDigits: "501234567", valid: true },
  { input: "+971 50 123 4567", expectedDigits: "501234567", valid: true },
  { input: "23456789", expectedDigits: "23456789", valid: false }, // 8 digits
  { input: "+97123456789", expectedDigits: "23456789", valid: false }, // 8 digits
  { input: "501234567890", expectedDigits: "501234567", valid: true }, // truncated to 9
];

for (const tc of testCases) {
  const digits = toUaePhoneDigits(tc.input);
  const valid = isValidUaePhone(tc.input);
  const formatted = formatPhoneDisplay(tc.input);
  console.log(`Input: "${tc.input}" -> digits: "${digits}" (valid: ${valid}) -> formatted: "${formatted}"`);
  if (digits !== tc.expectedDigits || valid !== tc.valid) {
    console.error(`FAILED test case for ${tc.input}`);
    process.exit(1);
  }
}

console.log("\n--- Checking Database Records in MongoDB ---");
const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/motd";
await mongoose.connect(uri);
const db = mongoose.connection.db;

const collections = ["users", "fabricshop", "fabrics", "tailorshops", "customer"];
let anyInvalid = false;
for (const colName of collections) {
  const col = db.collection(colName);
  const docs = await col.find({}).toArray();
  let invalidCount = 0;
  for (const doc of docs) {
    const phones = [];
    if (doc.phone) phones.push({ field: "phone", val: doc.phone });
    if (doc.pickupAddress?.phone) phones.push({ field: "pickupAddress.phone", val: doc.pickupAddress.phone });
    if (doc.storePickupAddress?.phone) phones.push({ field: "storePickupAddress.phone", val: doc.storePickupAddress.phone });
    if (doc.shippingAddress?.phone) phones.push({ field: "shippingAddress.phone", val: doc.shippingAddress.phone });

    for (const p of phones) {
      if (!/^\d{9}$/.test(p.val)) {
        console.warn(`[${colName}] doc _id: ${doc._id}, ${p.field}: "${p.val}" is NOT exactly 9 digits!`);
        invalidCount++;
        anyInvalid = true;
      }
    }
  }
  console.log(`[${colName}] Checked ${docs.length} documents. Non-9-digit phones found: ${invalidCount}`);
}

await mongoose.disconnect();
if (!anyInvalid) {
  console.log("\nSUCCESS: All database records have exactly 9 digits and all utilities work as expected!");
} else {
  console.error("\nWARNING: Some records in the DB do not have 9 digits.");
}
