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
  readyMadeProducts: [],
  fabrics: [],
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
  const products = await ReadyMadeProduct.insertMany([
    {
      name: 'Emirati Silver Kandura',
      nameAr: 'كندورة إماراتية فضية',
      slug: 'emirati-silver-kandura',
      description:
        'Classic white kandura crafted from premium Egyptian cotton. Perfect for daily wear and formal occasions.',
      descriptionAr:
        'كندura بيضاء كلاسيكية من قطن مصري فاخر. مثالية للارتداء اليومي والمناسبات الرسمية.',
      images: ['/images/fab-1.png'],
      price: 850,
      size: '54',
      style: 'kandura',
      city: 'Dubai',
      tag: 'BESTSELLER',
      tagColor: 'bg-primary',
      returnReason: 'size_issue',
      condition: 'excellent',
      countInStock: 1,
    },
    {
      name: 'Luxury Orange Abaya',
      nameAr: 'عباية برتقالية فاخرة',
      slug: 'luxury-orange-abaya',
      description:
        'Elegant black abaya with subtle embroidery details. Made from lightweight crepe fabric.',
      descriptionAr:
        'عباية سوداء أنيقة بتفاصيل تطريز رقيقة. مصنوعة من قماش كريب خفيف الوزن.',
      images: ['/images/fab-2.png'],
      price: 1250,
      size: 'M',
      style: 'abaya',
      city: 'Abu Dhabi',
      tag: 'ARTISANAL',
      tagColor: 'bg-[#C8A97E]',
      returnReason: 'size_issue',
      condition: 'like_new',
      countInStock: 1,
    },
    {
      name: 'Royal Blue Bisht',
      nameAr: 'بشت أزرق ملكي',
      slug: 'royal-blue-bisht',
      description:
        'Ceremonial bisht with gold zari work. Worn for weddings and official ceremonies.',
      descriptionAr:
        'بشت احتفالي بتطريز ذهبي. يُرتدى في الأعراس والمناسبات الرسمية.',
      images: ['/images/fab-3.png'],
      price: 3900,
      size: '56',
      style: 'bisht',
      city: 'Sharjah',
      tag: 'PREMIUM',
      tagColor: 'bg-[#5B4A3A]',
      returnReason: 'size_issue',
      condition: 'excellent',
      countInStock: 1,
    },
  ]);

  seedContext.readyMadeProducts = products;

  console.log('Seeded ready-made products (L-11):');
  for (const product of products) {
    console.log(
      `  ${product.slug} — ${product.name} (${product.style}, size ${product.size}, AED ${product.price}, stock ${product.countInStock})`
    );
  }
}

const STORE_PICKUP_ADDRESSES = {
  hanayan: {
    emirate: 'Dubai',
    city: 'Deira',
    street: 'Al Rigga Road',
    building: 'Hanayan Fabrics Building, Shop 14',
    phone: '+971 4 234 5678',
  },
  mauzan: {
    emirate: 'Abu Dhabi',
    city: 'Abu Dhabi',
    street: 'Khalifa Street',
    building: 'Mauzan Textiles, Ground Floor',
    phone: '+971 2 345 6789',
  },
  sharjah: {
    emirate: 'Sharjah',
    city: 'Sharjah',
    street: 'King Faisal Street',
    building: 'Heritage Souq, Unit 45',
    phone: '+971 6 456 7890',
  },
};

async function seedFabrics() {
  const [hanayan, mauzan, sharjahHeritage] = seedContext.fabricStores;
  if (!hanayan || !mauzan || !sharjahHeritage) {
    throw new Error('Fabric store users must be seeded before fabrics (L-10)');
  }

  const fabrics = await Fabric.insertMany([
    {
      name: 'Emirati Silk Brocade',
      nameAr: 'بrocade حرير إماراتي',
      slug: 'emirati-silk-brocade',
      description:
        'Handwoven silk brocade with traditional Emirati patterns.',
      descriptionAr: 'بrocade حرير منسوج يدوياً بزخارف إماراتية تقليدية.',
      images: ['/images/dress-1.png'],
      material: 'silk',
      color: 'Gold',
      city: 'Dubai',
      tag: 'BESTSELLER',
      tagColor: 'bg-primary',
      pricePerMeter: 450,
      listedByStore: hanayan._id,
      storePickupAddress: STORE_PICKUP_ADDRESSES.hanayan,
      isActive: true,
    },
    {
      name: 'Abu Dhabi Cashmere',
      nameAr: 'كشمير أبوظبي',
      slug: 'abu-dhabi-cashmere',
      description: 'Premium cashmere blend sourced from local artisans.',
      descriptionAr: 'مزيج كشمير فاخر من حرفيين محليين.',
      images: ['/images/dress-2.png'],
      material: 'cashmere',
      color: 'Camel',
      city: 'Abu Dhabi',
      tag: 'ARTISANAL',
      tagColor: 'bg-[#C8A97E]',
      pricePerMeter: 890,
      listedByStore: mauzan._id,
      storePickupAddress: STORE_PICKUP_ADDRESSES.mauzan,
      isActive: true,
    },
    {
      name: 'Sharjah Cotton Linen',
      nameAr: 'كتان قطني الشارقة',
      slug: 'sharjah-cotton-linen',
      description: 'Lightweight cotton-linen perfect for summer elegance.',
      descriptionAr: 'مزيج قطن وكتان خفيف مثالي لأناقة الصيف.',
      images: ['/images/dress-3.png'],
      material: 'linen',
      color: 'Natural',
      city: 'Sharjah',
      tag: 'BREATHABLE',
      tagColor: 'bg-[#5B4A3A]',
      pricePerMeter: 195,
      listedByStore: sharjahHeritage._id,
      storePickupAddress: STORE_PICKUP_ADDRESSES.sharjah,
      isActive: true,
    },
    {
      name: 'Ras Al Khaimah Wool',
      nameAr: 'صوف رأس الخيمة',
      slug: 'ras-al-khaimah-wool',
      description: 'Luxurious wool fabric from the northern emirates.',
      descriptionAr: 'قماش صوف فاخر من الإمارات الشمالية.',
      images: ['/images/dress-4.png'],
      material: 'wool',
      color: 'Charcoal',
      city: 'Ras Al Khaimah',
      tag: 'NEW',
      tagColor: 'bg-[#8B6F47]',
      pricePerMeter: 325,
      listedByStore: sharjahHeritage._id,
      storePickupAddress: STORE_PICKUP_ADDRESSES.sharjah,
      isActive: true,
    },
    {
      name: 'Ajman Heritage Silk',
      nameAr: 'حرير تراثي عجمان',
      slug: 'ajman-heritage-silk',
      description: 'Traditional silk with modern finishing techniques.',
      descriptionAr: 'حرير تقليدي بتقنيات تشطيب عصرية.',
      images: ['/images/dress-5.png'],
      material: 'silk',
      color: 'Ivory',
      city: 'Ajman',
      tag: 'HERITAGE',
      tagColor: 'bg-[#9C6B3C]',
      pricePerMeter: 580,
      listedByStore: hanayan._id,
      storePickupAddress: STORE_PICKUP_ADDRESSES.hanayan,
      isActive: true,
    },
    {
      name: 'Fujairah Pashmina',
      nameAr: 'باشمينا الفجيرة',
      slug: 'fujairah-pashmina',
      description: 'Fine pashmina wool from the eastern region.',
      descriptionAr: 'صوف باشمينا ناعم من المنطقة الشرقية.',
      images: ['/images/dress-1.png'],
      material: 'cashmere',
      color: 'Sand',
      city: 'Fujairah',
      tag: 'EXCLUSIVE',
      tagColor: 'bg-[#A0522D]',
      pricePerMeter: 720,
      listedByStore: mauzan._id,
      storePickupAddress: STORE_PICKUP_ADDRESSES.mauzan,
      isActive: true,
    },
    {
      name: 'Umm Al Quwain Velvet',
      nameAr: 'مخمل أم القيوين',
      slug: 'umm-al-quwain-velvet',
      description: 'Rich velvet fabric for ceremonial occasions.',
      descriptionAr: 'قماش مخملي فاخر للمناسبات الاحتفالية.',
      images: ['/images/dress-2.png'],
      material: 'wool',
      color: 'Midnight',
      city: 'Umm Al Quwain',
      tag: 'PREMIUM',
      tagColor: 'bg-[#2C1810]',
      pricePerMeter: 420,
      listedByStore: sharjahHeritage._id,
      storePickupAddress: STORE_PICKUP_ADDRESSES.sharjah,
      isActive: true,
    },
    {
      name: 'Desert Sand Linen',
      nameAr: 'كتان رمال الصحراء',
      slug: 'desert-sand-linen',
      description: 'Inspired by the golden dunes of the Empty Quarter.',
      descriptionAr: 'مستوحى من الكثبان الذهبية في Rub al Khali.',
      images: ['/images/dress-3.png'],
      material: 'linen',
      color: 'Desert Sand',
      city: 'Liwa',
      tag: 'ARTISANAL',
      tagColor: 'bg-[#C8A97E]',
      pricePerMeter: 280,
      listedByStore: mauzan._id,
      storePickupAddress: STORE_PICKUP_ADDRESSES.mauzan,
      isActive: true,
    },
    {
      name: "Pearl Diver's Cotton",
      nameAr: 'قطن الغواصين',
      slug: 'pearl-divers-cotton',
      description:
        "Eco-friendly cotton celebrating UAE's pearling heritage.",
      descriptionAr: 'قطن صديق للبيئة يحتفي بتراث الغوص على اللؤلؤ في الإمارات.',
      images: ['/images/dress-4.png'],
      material: 'cotton',
      color: 'Pearl White',
      city: 'Dubai Creek',
      tag: 'SUSTAINABLE',
      tagColor: 'bg-[#4A6B5D]',
      pricePerMeter: 165,
      listedByStore: hanayan._id,
      storePickupAddress: STORE_PICKUP_ADDRESSES.hanayan,
      isActive: true,
    },
  ]);

  seedContext.fabrics = fabrics;

  console.log('Seeded fabrics (L-12):');
  for (const fabric of fabrics) {
    const store = seedContext.fabricStores.find(
      (s) => s._id.equals(fabric.listedByStore)
    );
    console.log(
      `  ${fabric.slug} — ${fabric.name} (${fabric.material}, AED ${fabric.pricePerMeter}/m, ${store?.name ?? 'unknown store'})`
    );
  }
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

  console.log('Seed complete (L-13 still pending tailor shop/design data)');
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
