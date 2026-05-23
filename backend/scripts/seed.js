import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import User from '../models/User.js';
import PlatformSettings from '../models/PlatformSettings.js';
import ReadyMadeProduct from '../models/ReadyMadeProduct.js';
import Fabric from '../models/Fabric.js';
import TailorShop from '../models/TailorShop.js';
import Design from '../models/Design.js';
import RetailOrder from '../models/RetailOrder.js';
import CustomOrder from '../models/CustomOrder.js';

const MODELS = [
  User,
  PlatformSettings,
  ReadyMadeProduct,
  Fabric,
  TailorShop,
  Design,
  RetailOrder,
  CustomOrder,
];

const BCRYPT_ROUNDS = 10;
const SEED_PASSWORD = 'MotdSeed123!';

/** Populated by L-10; consumed by L-12/L-13 for foreign-key refs. */
export const seedContext = {
  admin: null,
  approvedTailors: [],
  pendingTailor: null,
  fabricStores: [],
  platformSettings: null,
};

function hashPassword(password) {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

function maskMongoUri(uri) {
  return uri.replace(/\/\/([^@/]+@)/, '//***@');
}

async function connect() {
  await mongoose.connect(env.mongodbUri);
  console.log(`Connected to MongoDB (${maskMongoUri(env.mongodbUri)})`);
}

async function clearDatabase() {
  for (const model of MODELS) {
    await model.deleteMany({});
  }
  console.log('Cleared all collections');
}

async function seedUsersAndSettings() {
  const password = hashPassword(SEED_PASSWORD);

  const admin = await User.create({
    name: 'MOTD Admin',
    email: 'admin@motd.test',
    password,
    role: 'admin',
  });

  const approvedTailors = await User.insertMany([
    {
      name: 'Ayesha Al Riaz',
      email: 'ayesha@motd.test',
      password,
      role: 'tailor',
      approvalStatus: 'approved',
    },
    {
      name: 'Asma Al Naeem',
      email: 'asma@motd.test',
      password,
      role: 'tailor',
      approvalStatus: 'approved',
    },
  ]);

  const pendingTailor = await User.create({
    name: 'Fatima Al Qasimi',
    email: 'fatima@motd.test',
    password,
    role: 'tailor',
  });

  const fabricStores = await User.insertMany([
    {
      name: 'Hanayan Fabrics',
      email: 'hanayan@motd.test',
      password,
      role: 'fabric_store',
    },
    {
      name: 'Mauzan Textiles',
      email: 'mauzan@motd.test',
      password,
      role: 'fabric_store',
    },
    {
      name: 'Sharjah Heritage Fabrics',
      email: 'sharjah@motd.test',
      password,
      role: 'fabric_store',
    },
  ]);

  const platformSettings = await PlatformSettings.create({
    defaultDeliveryFee: 35,
    defaultTailoringFee: 150,
    platformFee: 0,
    vatRate: 0.05,
    currency: 'AED',
  });

  seedContext.admin = admin;
  seedContext.approvedTailors = approvedTailors;
  seedContext.pendingTailor = pendingTailor;
  seedContext.fabricStores = fabricStores;
  seedContext.platformSettings = platformSettings;

  const adminLoginOk = bcrypt.compareSync(SEED_PASSWORD, admin.password);
  if (!adminLoginOk) {
    throw new Error('Admin password hash verification failed');
  }

  console.log('Seeded users and platform settings (L-10):');
  console.log(`  Admin: ${admin.email} (${admin.role})`);
  console.log(
    `  Approved tailors: ${approvedTailors.map((t) => t.email).join(', ')}`
  );
  console.log(`  Pending tailor: ${pendingTailor.email}`);
  console.log(`  Fabric stores: ${fabricStores.map((s) => s.email).join(', ')}`);
  console.log(
    `  PlatformSettings: delivery AED ${platformSettings.defaultDeliveryFee}, tailoring AED ${platformSettings.defaultTailoringFee}, VAT ${platformSettings.vatRate * 100}%`
  );
  console.log(`  Test password (all accounts): ${SEED_PASSWORD}`);
}

async function seedReadyMadeProducts() {
  // L-11: 2–3 ready-made items
}

async function seedFabrics() {
  // L-12: ~9 fabrics with store attribution
}

async function seedTailorShopsAndDesigns() {
  // L-13: approved tailor shops + designs; pending tailor has no shop
}

async function seed() {
  if (env.nodeEnv === 'production') {
    throw new Error('Refusing to seed when NODE_ENV=production');
  }

  console.log('Starting database seed...');

  await connect();
  await clearDatabase();

  await seedUsersAndSettings();
  await seedReadyMadeProducts();
  await seedFabrics();
  await seedTailorShopsAndDesigns();

  console.log('Seed complete (L-11–L-13 still pending product/shop data)');
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
