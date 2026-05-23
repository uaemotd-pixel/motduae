import mongoose from 'mongoose';
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
  // L-10: admin, tailors, fabric_store partners, PlatformSettings
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

  console.log('Seed scaffold complete (L-10–L-13 will populate data)');
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
