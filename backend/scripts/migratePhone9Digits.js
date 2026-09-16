import mongoose from "mongoose";

function fixTo9Digits(raw) {
  if (!raw) return raw;
  let digits = String(raw).replace(/\D/g, "");
  if (digits.startsWith("971")) {
    digits = digits.slice(3);
  } else if (digits.length === 10 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  if (digits.length === 8) {
    digits = digits + "0"; // Pad 8-digit seed numbers to valid 9 digits
  }
  return digits.slice(0, 9);
}

async function run() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/motd";
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  console.log("Connected to DB, migrating phones to 9 digits...");

  // 1. fabricshop
  const fabricShops = await db.collection("fabricshop").find({}).toArray();
  for (const shop of fabricShops) {
    const updates = {};
    if (shop.phone) {
      const fixed = fixTo9Digits(shop.phone);
      if (fixed !== shop.phone) updates.phone = fixed;
    }
    if (shop.pickupAddress?.phone) {
      const fixed = fixTo9Digits(shop.pickupAddress.phone);
      if (fixed !== shop.pickupAddress.phone) updates["pickupAddress.phone"] = fixed;
    }
    if (Object.keys(updates).length) {
      await db.collection("fabricshop").updateOne({ _id: shop._id }, { $set: updates });
      console.log(`Updated fabricshop "${shop.name}":`, updates);
    }
  }

  // 2. fabrics
  const fabrics = await db.collection("fabrics").find({}).toArray();
  for (const fabric of fabrics) {
    const updates = {};
    if (fabric.storePickupAddress?.phone) {
      const fixed = fixTo9Digits(fabric.storePickupAddress.phone);
      if (fixed !== fabric.storePickupAddress.phone) {
        updates["storePickupAddress.phone"] = fixed;
      }
    }
    if (Object.keys(updates).length) {
      await db.collection("fabrics").updateOne({ _id: fabric._id }, { $set: updates });
      console.log(`Updated fabric "${fabric.name}":`, updates);
    }
  }

  // 3. tailorshops
  const tailorShops = await db.collection("tailorshops").find({}).toArray();
  for (const shop of tailorShops) {
    const updates = {};
    if (shop.phone) {
      const fixed = fixTo9Digits(shop.phone);
      if (fixed !== shop.phone) updates.phone = fixed;
    }
    if (shop.pickupAddress?.phone) {
      const fixed = fixTo9Digits(shop.pickupAddress.phone);
      if (fixed !== shop.pickupAddress.phone) updates["pickupAddress.phone"] = fixed;
    }
    if (Object.keys(updates).length) {
      await db.collection("tailorshops").updateOne({ _id: shop._id }, { $set: updates });
      console.log(`Updated tailorshop "${shop.name}":`, updates);
    }
  }

  // 4. users
  const users = await db.collection("users").find({}).toArray();
  for (const user of users) {
    if (user.phone) {
      const fixed = fixTo9Digits(user.phone);
      if (fixed !== user.phone) {
        await db.collection("users").updateOne({ _id: user._id }, { $set: { phone: fixed } });
        console.log(`Updated user "${user.name || user.email}": ${user.phone} -> ${fixed}`);
      }
    }
  }

  // 5. customers
  const customerCols = ["customers", "customer"];
  for (const colName of customerCols) {
    const col = db.collection(colName);
    const customers = await col.find({}).toArray();
    for (const cust of customers) {
      const updates = {};
      if (cust.phone) {
        const fixed = fixTo9Digits(cust.phone);
        if (fixed !== cust.phone) updates.phone = fixed;
      }
      if (Array.isArray(cust.addresses)) {
        let changed = false;
        const newAddresses = cust.addresses.map((a) => {
          if (a.phone) {
            const fixed = fixTo9Digits(a.phone);
            if (fixed !== a.phone) {
              changed = true;
              return { ...a, phone: fixed };
            }
          }
          return a;
        });
        if (changed) updates.addresses = newAddresses;
      }
      if (Array.isArray(cust.savedUsers)) {
        let changed = false;
        const newSavedUsers = cust.savedUsers.map((m) => {
          let memberChanged = false;
          let newM = { ...m };
          if (m.phone) {
            const fixed = fixTo9Digits(m.phone);
            if (fixed !== m.phone) {
              memberChanged = true;
              newM.phone = fixed;
            }
          }
          if (m.address?.phone) {
            const fixed = fixTo9Digits(m.address.phone);
            if (fixed !== m.address.phone) {
              memberChanged = true;
              newM.address = { ...newM.address, phone: fixed };
            }
          }
          if (memberChanged) changed = true;
          return newM;
        });
        if (changed) updates.savedUsers = newSavedUsers;
      }
      if (Object.keys(updates).length) {
        await col.updateOne({ _id: cust._id }, { $set: updates });
        console.log(`Updated ${colName} "${cust.name}":`, updates);
      }
    }
  }

  // 6. partnerapplications
  const partnerApps = await db.collection("partnerapplications").find({}).toArray();
  for (const app of partnerApps) {
    if (app.phone) {
      const fixed = fixTo9Digits(app.phone);
      if (fixed !== app.phone) {
        await db.collection("partnerapplications").updateOne({ _id: app._id }, { $set: { phone: fixed } });
        console.log(`Updated partnerapplication "${app.businessName}":`, fixed);
      }
    }
  }

  console.log("Migration complete!");
  await mongoose.disconnect();
}

run().catch(console.error);
