import jwt from "jsonwebtoken";
import { env } from "./config/env.js";
import { connectDB } from "./db/connect.js";
import { generateToken } from "./middleware/auth.js";
import User from "./models/User.js";
import mongoose from "mongoose";
import { clientErrorMessage } from "./middleware/errorHandler.js";

const base = "http://127.0.0.1:5000";
const results = [];
const record = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
};

async function api(path, { method = "GET", body, cookie } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

const upload = await api("/api/customer/uploads/customer", { method: "POST" });
record("signed-out upload refused", upload.status === 401, `status ${upload.status}`);

const ready = await api("/api/ready-made?limit=10000");
const addons = await api("/api/addons?limit=10000");
record(
  "ready-made page capped at 48",
  ready.status === 200 && Number(ready.json?.limit) === 48 && (ready.json?.items?.length || 0) <= 48,
  `limit ${ready.json?.limit} count ${ready.json?.items?.length}`,
);
record(
  "add-on page capped at 48",
  addons.status === 200 && Number(addons.json?.limit) === 48 && (addons.json?.items?.length || 0) <= 48,
  `limit ${addons.json?.limit} count ${addons.json?.items?.length}`,
);

const preview = await api("/api/checkout/preview", {
  method: "POST",
  body: {
    items: Array.from({ length: 31 }, () => ({ productId: "x", quantity: 1 })),
  },
});
record(
  "checkout preview rejects 31 lines",
  preview.status === 400 &&
    String(preview.json?.error || "").includes("at most 30"),
  `status ${preview.status}`,
);

await connectDB();
const buyer = await User.findOne({
  emailVerified: true,
  isActive: { $ne: false },
  role: { $in: ["customer", "admin"] },
}).select("_id name email role isAdmin");
const cookie = buyer ? `motd_auth=${generateToken(buyer)}` : "";
const retail = await api("/api/orders/retail", {
  method: "POST",
  cookie,
  body: {
    orderItems: Array.from({ length: 31 }, () => ({
      productId: "000000000000000000000001",
      quantity: 1,
      size: "M",
    })),
    shippingAddress: {
      fullName: "A",
      phone: "500000000",
      emirate: "Dubai",
      city: "Dubai",
    },
  },
});
record(
  "retail order rejects 31 lines",
  retail.status === 400 &&
    String(retail.json?.message || "").includes("at most 30"),
  `status ${retail.status} ${retail.json?.message || ""}`,
);

const email = `phase2-${Date.now()}@motd.test`;
const created = await api("/api/users/signup", {
  method: "POST",
  body: {
    name: "Phase2 Check",
    email,
    password: "Phase2pass1!",
    phone: "501234567",
  },
});
record("new signup still creates an account", created.status === 200, `status ${created.status}`);

const taken = await api("/api/users/signup", {
  method: "POST",
  body: {
    name: "Phase2 Check",
    email,
    password: "Phase2pass1!",
    phone: "501234567",
  },
});
const takenText = JSON.stringify(taken.json || {});
record(
  "existing signup does not reveal the email",
  taken.status === 400 &&
    !takenText.toLowerCase().includes("already") &&
    !takenText.includes(email),
  `status ${taken.status}`,
);

const admin = await User.findOne({ role: "admin", isActive: { $ne: false } }).select(
  "_id name email role isAdmin",
);
if (admin) {
  const adminCookie = `motd_auth=${generateToken(admin)}`;
  const partner = await api("/api/admin/create-partners", {
    method: "POST",
    cookie: adminCookie,
    body: { name: "A", email, password: "Phase2pass1", shopName: "Phase2 Shop" },
  });
  record(
    "admin create-partner still says the user exists",
    partner.status === 400 && partner.json?.message === "User already exists",
    `status ${partner.status}`,
  );
} else {
  record("admin create-partner still says the user exists", false, "no admin");
}

const phone = await api("/api/users/signup", {
  method: "POST",
  body: {
    name: "Phase2 Check",
    email: `phase2-phone-${Date.now()}@motd.test`,
    password: "Phase2pass1!",
    phone: "12",
  },
});
record(
  "bad phone stays specific",
  phone.status === 400 && String(phone.json?.message || "").includes("9 digits"),
  `status ${phone.status}`,
);

process.env.NODE_ENV = "production";
const hidden = clientErrorMessage(new Error("E11000 duplicate key"), 500);
const shown = clientErrorMessage(
  Object.assign(new Error("Contact number must be exactly 9 digits"), { status: 400 }),
  400,
);
record("production 500 hides the database text", hidden === "Something went wrong" && !hidden.includes("E11000"));
record(
  "a 400 message is kept",
  shown.includes("9 digits"),
);

if (created.status === 200) {
  await User.deleteOne({ email });
  const Customer = (await import("./models/customer.js")).default;
  const user = await User.findOne({ email });
  if (user) await Customer.deleteOne({ userId: user._id });
  await User.deleteOne({ email });
}

if (mongoose.connection.readyState === 1) await mongoose.disconnect();
const failed = results.filter((item) => !item.ok);
console.log(failed.length ? `FAILED ${failed.length}` : `ALL PASS ${results.length}`);
process.exit(failed.length ? 1 : 0);
