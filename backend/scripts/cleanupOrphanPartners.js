/**
 * Remove orphan fabric_store test accounts left from manual QA.
 * Also deletes partners whose password was never hashed (plain text).
 *
 * Usage: node backend/scripts/cleanupOrphanPartners.js
 */
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import User from '../models/User.js';

const ORPHAN_EMAIL_PATTERNS = [/^partner-test-\d+@motd\.test$/i];

function isOrphanEmail(email) {
  return ORPHAN_EMAIL_PATTERNS.some((pattern) => pattern.test(email));
}

function looksLikeBcryptHash(password) {
  return typeof password === 'string' && /^\$2[aby]\$\d{2}\$/.test(password);
}

async function main() {
  await mongoose.connect(env.mongodbUri);
  console.log('Connected to MongoDB');

  const partners = await User.find({ role: 'fabric_store' }).select('+password');
  let removed = 0;

  for (const partner of partners) {
    if (isOrphanEmail(partner.email)) {
      await partner.deleteOne();
      removed += 1;
      console.log(`Removed orphan partner: ${partner.email}`);
      continue;
    }

    if (!looksLikeBcryptHash(partner.password)) {
      await partner.deleteOne();
      removed += 1;
      console.log(
        `Removed partner with unhashed password (re-create via admin): ${partner.email}`,
      );
    }
  }

  if (removed === 0) {
    console.log('No orphan or unhashed fabric_store partners found.');
  } else {
    console.log(`Done. Removed ${removed} partner account(s).`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
