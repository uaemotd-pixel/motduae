import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import User from "../models/User.js";
import PlatformSettings from "../models/PlatformSettings.js";
import ReadyMadeProduct from "../models/ReadyMadeProduct.js";
import Fabric from "../models/Fabric.js";
import TailorShop from "../models/TailorShop.js";
import FabricShop from "../models/FabricShop.js";
import Design from "../models/Design.js";
import RetailOrder from "../models/RetailOrder.js";
import CustomOrder from "../models/CustomOrder.js";

const MODELS = [
  User,
  PlatformSettings,
  ReadyMadeProduct,
  Fabric,
  FabricShop,
  TailorShop,
  Design,
  RetailOrder,
  CustomOrder,
];

const BCRYPT_ROUNDS = 10;
const SEED_PASSWORD = "MotdSeed123!";

/** Populated by L-10; consumed by L-12/L-13 for foreign-key refs. */
export const seedContext = {
  admin: null,
  approvedTailors: [],
  pendingTailor: null,
  fabricStores: [],
  platformSettings: null,
  readyMadeProducts: [],
  fabrics: [],
  fabricShops: [],
  tailorShops: [],
  designs: [],
};

function hashPassword(password) {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

function maskMongoUri(uri) {
  return uri.replace(/\/\/([^@/]+@)/, "//***@");
}

async function connect() {
  await mongoose.connect(env.mongodbUri);
  console.log(`Connected to MongoDB (${maskMongoUri(env.mongodbUri)})`);
}

async function clearDatabase() {
  for (const model of MODELS) {
    await model.deleteMany({});
  }
  console.log("Cleared all collections");
}

async function seedUsersAndSettings() {
  const password = hashPassword(SEED_PASSWORD);

  const admin = await User.create({
    name: "MOTD Admin",
    email: "admin@motd.test",
    password,
    role: "admin",
  });

  const approvedTailors = await User.insertMany([
    {
      name: "Ayesha Al Riaz",
      email: "ayesha@motd.test",
      password,
      role: "tailor",
      approvalStatus: "approved",
    },
    {
      name: "Asma Al Naeem",
      email: "asma@motd.test",
      password,
      role: "tailor",
      approvalStatus: "approved",
    },
  ]);

  const pendingTailor = await User.create({
    name: "Fatima Al Qasimi",
    email: "fatima@motd.test",
    password,
    role: "tailor",
  });

  const fabricStores = await User.insertMany([
    {
      name: "Hanayan Fabrics",
      email: "hanayan@motd.test",
      password,
      role: "fabric_store",
      isActive: true,
      approvalStatus: "approved",
    },
    {
      name: "Mauzan Textiles",
      email: "mauzan@motd.test",
      password,
      role: "fabric_store",
      isActive: true,
      approvalStatus: "approved",
    },
    {
      name: "Sharjah Heritage Fabrics",
      email: "sharjah@motd.test",
      password,
      role: "fabric_store",
      isActive: true,
      approvalStatus: "approved",
    },
  ]);

  const platformSettings = await PlatformSettings.create({
    defaultDeliveryFee: 35,
    defaultTailoringFee: 150,
    platformFee: 0,
    vatRate: 0.05,
    currency: "AED",
  });

  seedContext.admin = admin;
  seedContext.approvedTailors = approvedTailors;
  seedContext.pendingTailor = pendingTailor;
  seedContext.fabricStores = fabricStores;
  seedContext.platformSettings = platformSettings;

  const adminLoginOk = bcrypt.compareSync(SEED_PASSWORD, admin.password);
  if (!adminLoginOk) {
    throw new Error("Admin password hash verification failed");
  }

  console.log("Seeded users and platform settings (L-10):");
  console.log(`  Admin: ${admin.email} (${admin.role})`);
  console.log(
    `  Approved tailors: ${approvedTailors.map((t) => t.email).join(", ")}`,
  );
  console.log(`  Pending tailor: ${pendingTailor.email}`);
  console.log(
    `  Fabric stores: ${fabricStores.map((s) => s.email).join(", ")}`,
  );
  console.log(
    `  PlatformSettings: delivery AED ${platformSettings.defaultDeliveryFee}, tailoring AED ${platformSettings.defaultTailoringFee}, VAT ${platformSettings.vatRate * 100}%`,
  );
  console.log(`  Test password (all accounts): ${SEED_PASSWORD}`);
}

async function seedFabricShops() {
  const [hanayan, mauzan, sharjahHeritage] = seedContext.fabricStores;
  if (!hanayan || !mauzan || !sharjahHeritage) {
    throw new Error(
      "Fabric store users must be seeded before fabric shops (L-10)",
    );
  }

  const shops = await FabricShop.insertMany([
    {
      name: "Hanayan Fabrics",
      nameAr: "أقمشة حنايان",
      slug: "hanayan-fabrics",
      description: "Premium silk and brocade from the heart of Deira.",
      descriptionAr: "حرير وبrocade فاخر من قلب ديرة.",
      logo: "/images/fab1.png",
      coverImage: "/images/fab1.png",
      location: "Al Rigga Road",
      city: "Dubai",
      phone: "+971 4 234 5678",
      rating: 4.8,
      reviewCount: 156,
      ownerId: hanayan._id,
      isActive: true,
    },
    {
      name: "Mauzan Textiles",
      nameAr: "مؤنس للأقمشة",
      slug: "mauzan-textiles",
      description: "Luxury cashmere and ceremonial fabrics in Abu Dhabi.",
      descriptionAr: "كشمير فاخر وأقمشة احتفالية في أبوظبي.",
      logo: "/images/fab2.png",
      coverImage: "/images/fab2.png",
      location: "Khalifa Street",
      city: "Abu Dhabi",
      phone: "+971 2 345 6789",
      rating: 4.9,
      reviewCount: 98,
      ownerId: mauzan._id,
      isActive: true,
    },
    {
      name: "Sharjah Heritage Fabrics",
      nameAr: "أقمشة تراث الشارقة",
      slug: "sharjah-heritage-fabrics",
      description: "Heritage cotton and linen from Sharjah souq traditions.",
      descriptionAr: "قطن وكتان تراثي من تقاليد سوق الشارقة.",
      logo: "/images/fab3.png",
      coverImage: "/images/fab3.png",
      location: "King Faisal Street",
      city: "Sharjah",
      phone: "+971 6 456 7890",
      rating: 4.7,
      reviewCount: 72,
      ownerId: sharjahHeritage._id,
      isActive: true,
    },
  ]);

  seedContext.fabricShops = shops;

  console.log("Seeded fabric shops:");
  for (const shop of shops) {
    console.log(`  ${shop.slug} — ${shop.name} (${shop.city})`);
  }
}

async function seedReadyMadeProducts() {
  const fabrics = seedContext.fabrics;
  if (!fabrics || fabrics.length < 3) {
    throw new Error("Fabrics must be seeded before ready-made products");
  }

  const [fabric1, fabric2, fabric3] = fabrics;

  const products = await ReadyMadeProduct.insertMany([
    {
      name: "Emirati Silver Kandura",
      nameAr: "كندورة إماراتية فضية",
      slug: "emirati-silver-kandura",
      description:
        "Classic white kandura crafted from premium Egyptian cotton. Perfect for daily wear and formal occasions.",
      descriptionAr:
        "كندورة بيضاء كلاسيكية من قطن مصري فاخر. مثالية للارتداء اليومي والمناسبات الرسمية.",
      thumbnailImage: "/images/fab1.png",
      images: ["/images/fab1.png", "/images/fab2.png", "/images/fab3.png"],
      colors: ["silver", "white"],
      fabricType: "cotton",
      fabricTypeAr: "قطن",
      fabricId: fabric1._id,
      fabricShopId: fabric1.fabricShopId,
      metersPerFabric: 4,
      fabricPriceAED: 400,
      mukhawarPriceAED: 450,
      finalSellingPriceAED: 850,
      availableFabricStock: 5,
      isActive: true,
      tag: "BESTSELLER",
      tagColor: "gold",
    },
    {
      name: "Luxury Orange Abaya",
      nameAr: "عباية برتقالية فاخرة",
      slug: "luxury-orange-abaya",
      description:
        "Elegant black abaya with subtle embroidery details. Made from lightweight crepe fabric.",
      descriptionAr:
        "عباية سوداء أنيقة بتفاصيل تطريز رقيقة. مصنوعة من قماش كريب خفيف الوزن.",
      thumbnailImage: "/images/fab2.png",
      images: ["/images/fab2.png", "/images/fab3.png", "/images/fab4.png"],
      colors: ["red", "black"],
      fabricType: "silk velvet",
      fabricTypeAr: "مخمل حرير",
      fabricId: fabric2._id,
      fabricShopId: fabric2.fabricShopId,
      metersPerFabric: 3.5,
      fabricPriceAED: 600,
      mukhawarPriceAED: 650,
      finalSellingPriceAED: 1250,
      availableFabricStock: 3,
      isActive: true,
      tag: "ARTISANAL",
      tagColor: "gold",
    },
    {
      name: "Royal Blue Bisht",
      nameAr: "بشت أزرق ملكي",
      slug: "royal-blue-bisht",
      description:
        "Ceremonial bisht with gold zari work. Worn for weddings and official ceremonies.",
      descriptionAr:
        "بشت احتفالي بتطريز ذهبي. يُرتدى في الأعراس والمناسبات الرسمية.",
      thumbnailImage: "/images/fab3.png",
      images: ["/images/fab3.png", "/images/fab4.png", "/images/fab5.png"],
      colors: ["blue", "gold"],
      fabricType: "chiffon",
      fabricTypeAr: "شيفون",
      fabricId: fabric3._id,
      fabricShopId: fabric3.fabricShopId,
      metersPerFabric: 3,
      fabricPriceAED: 1900,
      mukhawarPriceAED: 2000,
      finalSellingPriceAED: 3900,
      availableFabricStock: 2,
      isActive: true,
      tag: "PREMIUM",
      tagColor: "black",
    },
  ]);

  seedContext.readyMadeProducts = products;

  console.log("Seeded ready-made products (L-11):");
  for (const product of products) {
    console.log(
      `  ${product.slug} — ${product.name} (AED ${product.finalSellingPriceAED}, stock ${product.availableFabricStock})`,
    );
  }
}

const STORE_PICKUP_ADDRESSES = {
  hanayan: {
    emirate: "Dubai",
    city: "Deira",
    street: "Al Rigga Road",
    building: "Hanayan Fabrics Building, Shop 14",
    phone: "+971 4 234 5678",
  },
  mauzan: {
    emirate: "Abu Dhabi",
    city: "Abu Dhabi",
    street: "Khalifa Street",
    building: "Mauzan Textiles, Ground Floor",
    phone: "+971 2 345 6789",
  },
  sharjah: {
    emirate: "Sharjah",
    city: "Sharjah",
    street: "King Faisal Street",
    building: "Heritage Souq, Unit 45",
    phone: "+971 6 456 7890",
  },
};

async function seedFabrics() {
  const [hanayan, mauzan, sharjahHeritage] = seedContext.fabricStores;
  if (!hanayan || !mauzan || !sharjahHeritage) {
    throw new Error("Fabric store users must be seeded before fabrics (L-10)");
  }
  if (!seedContext.fabricShops?.length) {
    throw new Error("Fabric shops must be seeded before fabrics");
  }

  const shopByOwner = new Map(
    seedContext.fabricShops.map((shop) => [String(shop.ownerId), shop._id]),
  );
  const withShopId = (entry) => ({
    ...entry,
    fabricShopId: shopByOwner.get(String(entry.listedByStore)),
  });

  const fabrics = await Fabric.insertMany(
    [
      {
        name: "Emirati Silk Brocade",
        nameAr: "بrocade حرير إماراتي",
        slug: "emirati-silk-brocade",
        description:
          "Handwoven silk brocade with traditional Emirati patterns.",
        descriptionAr: "بrocade حرير منسوج يدوياً بزخارف إماراتية تقليدية.",
        images: [
          "/images/dress-1.png",
          "/images/dress-2.png",
          "/images/dress-3.png",
        ],
        material: "silk velvet",
        materialAr: "مخمل حرير",
        colors: ["gold", "yellow"],
        city: "Dubai",
        tag: "BESTSELLER",
        tagColor: "bg-primary",
        pricePerMeter: 450,
        listedByStore: hanayan._id,
        storePickupAddress: STORE_PICKUP_ADDRESSES.hanayan,
        isActive: true,
      },
      {
        name: "Abu Dhabi Cashmere",
        nameAr: "كشمير أبوظبي",
        slug: "abu-dhabi-cashmere",
        description: "Premium cashmere blend sourced from local artisans.",
        descriptionAr: "مزيج كشمير فاخر من حرفيين محليين.",
        images: [
          "/images/dress-2.png",
          "/images/dress-3.png",
          "/images/dress-4.png",
        ],
        material: "chiffon",
        materialAr: "شيفون",
        colors: ["camel", "brown"],
        city: "Abu Dhabi",
        tag: "ARTISANAL",
        tagColor: "bg-[#C8A97E]",
        pricePerMeter: 890,
        listedByStore: mauzan._id,
        storePickupAddress: STORE_PICKUP_ADDRESSES.mauzan,
        isActive: true,
      },
      {
        name: "Sharjah Cotton Linen",
        nameAr: "كتان قطني الشارقة",
        slug: "sharjah-cotton-linen",
        description: "Lightweight cotton-linen perfect for summer elegance.",
        descriptionAr: "مزيج قطن وكتان خفيف مثالي لأناقة الصيف.",
        images: [
          "/images/dress-3.png",
          "/images/dress-4.png",
          "/images/dress-5.png",
        ],
        material: "tana linen cotton",
        materialAr: "تانة قطن الكتان",
        colors: ["white", "ivory"],
        city: "Sharjah",
        tag: "BREATHABLE",
        tagColor: "bg-[#5B4A3A]",
        pricePerMeter: 195,
        listedByStore: sharjahHeritage._id,
        storePickupAddress: STORE_PICKUP_ADDRESSES.sharjah,
        isActive: true,
      },
      {
        name: "Ras Al Khaimah Wool",
        nameAr: "صوف رأس الخيمة",
        slug: "ras-al-khaimah-wool",
        description: "Luxurious wool fabric from the northern emirates.",
        descriptionAr: "قماش صوف فاخر من الإمارات الشمالية.",
        images: [
          "/images/dress-4.png",
          "/images/dress-5.png",
          "/images/dress-1.png",
        ],
        material: "silk velvet",
        materialAr: "مخمل حرير",
        colors: ["grey", "black"],
        city: "Ras Al Khaimah",
        tag: "NEW",
        tagColor: "bg-[#8B6F47]",
        pricePerMeter: 325,
        listedByStore: sharjahHeritage._id,
        storePickupAddress: STORE_PICKUP_ADDRESSES.sharjah,
        isActive: true,
      },
      {
        name: "Ajman Heritage Silk",
        nameAr: "حرير تراثي عجمان",
        slug: "ajman-heritage-silk",
        description: "Traditional silk with modern finishing techniques.",
        descriptionAr: "حرير تقليدي بتقنيات تشطيب عصرية.",
        images: [
          "/images/dress-5.png",
          "/images/dress-1.png",
          "/images/dress-2.png",
        ],
        material: "silk velvet",
        materialAr: "مخمل حرير",
        colors: ["ivory", "white"],
        city: "Ajman",
        tag: "HERITAGE",
        tagColor: "bg-[#9C6B3C]",
        pricePerMeter: 580,
        listedByStore: hanayan._id,
        storePickupAddress: STORE_PICKUP_ADDRESSES.hanayan,
        isActive: true,
      },
      {
        name: "Fujairah Pashmina",
        nameAr: "باشمينا الفجيرة",
        slug: "fujairah-pashmina",
        description: "Fine pashmina wool from the eastern region.",
        descriptionAr: "صوف باشمينا ناعم من المنطقة الشرقية.",
        images: [
          "/images/dress-1.png",
          "/images/dress-2.png",
          "/images/dress-3.png",
        ],
        material: "chiffon",
        materialAr: "شيفون",
        colors: ["beige", "brown"],
        city: "Fujairah",
        tag: "EXCLUSIVE",
        tagColor: "bg-[#A0522D]",
        pricePerMeter: 720,
        listedByStore: mauzan._id,
        storePickupAddress: STORE_PICKUP_ADDRESSES.mauzan,
        isActive: true,
      },
      {
        name: "Umm Al Quwain Velvet",
        nameAr: "مخمل أم القيوين",
        slug: "umm-al-quwain-velvet",
        description: "Rich velvet fabric for ceremonial occasions.",
        descriptionAr: "قماش مخملي فاخر للمناسبات الاحتفالية.",
        images: [
          "/images/dress-2.png",
          "/images/dress-3.png",
          "/images/dress-4.png",
        ],
        material: "silk velvet",
        materialAr: "مخمل حرير",
        colors: ["blue", "purple"],
        city: "Umm Al Quwain",
        tag: "PREMIUM",
        tagColor: "bg-[#2C1810]",
        pricePerMeter: 420,
        listedByStore: sharjahHeritage._id,
        storePickupAddress: STORE_PICKUP_ADDRESSES.sharjah,
        isActive: true,
      },
      {
        name: "Desert Sand Linen",
        nameAr: "كتان رمال الصحراء",
        slug: "desert-sand-linen",
        description: "Inspired by the golden dunes of the Empty Quarter.",
        descriptionAr: "مستوحى من الكثبان الذهبية في Rub al Khali.",
        images: [
          "/images/dress-3.png",
          "/images/dress-4.png",
          "/images/dress-5.png",
        ],
        material: "tana linen cotton",
        materialAr: "تانة قطن الكتان",
        colors: ["beige", "sand"],
        city: "Liwa",
        tag: "ARTISANAL",
        tagColor: "bg-[#C8A97E]",
        pricePerMeter: 280,
        listedByStore: mauzan._id,
        storePickupAddress: STORE_PICKUP_ADDRESSES.mauzan,
        isActive: true,
      },
      {
        name: "Pearl Diver's Cotton",
        nameAr: "قطن الغواصين",
        slug: "pearl-divers-cotton",
        description: "Eco-friendly cotton celebrating UAE's pearling heritage.",
        descriptionAr:
          "قطن صديق للبيئة يحتفي بتراث الغوص على اللؤلؤ في الإمارات.",
        images: [
          "/images/dress-4.png",
          "/images/dress-5.png",
          "/images/dress-1.png",
        ],
        material: "tana linen cotton",
        materialAr: "تانة قطن الكتان",
        colors: ["white", "blue"],
        city: "Dubai Creek",
        tag: "SUSTAINABLE",
        tagColor: "bg-[#4A6B5D]",
        pricePerMeter: 165,
        listedByStore: hanayan._id,
        storePickupAddress: STORE_PICKUP_ADDRESSES.hanayan,
        isActive: true,
      },
    ].map(withShopId),
  );

  seedContext.fabrics = fabrics;

  console.log("Seeded fabrics (L-12):");
  for (const fabric of fabrics) {
    const store = seedContext.fabricStores.find((s) =>
      s._id.equals(fabric.listedByStore),
    );
    console.log(
      `  ${fabric.slug} — ${fabric.name} (${fabric.material}, AED ${fabric.pricePerMeter}/m, ${store?.name ?? "unknown store"})`,
    );
  }
}

async function seedTailorShopsAndDesigns() {
  const [ayesha, asma] = seedContext.approvedTailors;
  if (!ayesha || !asma) {
    throw new Error("Approved tailors must be seeded before shops (L-10)");
  }

  const defaultTailoringFee =
    seedContext.platformSettings?.defaultTailoringFee ?? 150;

  const shops = await TailorShop.insertMany([
    {
      name: "Ayesha Al Riaz Atelier",
      nameAr: "أتيليه عائشة الرِياض",
      slug: "ayesha-al-riaz",
      description:
        "Master of traditional Emirati kandura and bespoke suits. Third-generation tailor preserving Dubai's rich textile heritage since 1988.",
      descriptionAr:
        "خبيرة في الكندورة الإماراتية التقليدية والبدلات المفصّلة. خياطة من الجيل الثالث تحفظ تراث دبي النسيجي الغني منذ ١٩٨٨.",
      logo: "/images/tailor-1.png",
      coverImage: "/images/tailor-1.png",
      location: "Al Fahidi Historical District",
      city: "Dubai",
      phone: "+971 4 353 2100",
      rating: 4.9,
      reviewCount: 247,
      ownerId: ayesha._id,
      isActive: true,
    },
    {
      name: "Asma Al Naeem Couture",
      nameAr: "كوتور أسما النعيم",
      slug: "asma-al-naeem",
      description:
        "Official tailor to Abu Dhabi's royal court. Specializing in ceremonial bisht and luxury evening wear with over 40 years of excellence.",
      descriptionAr:
        "خياطة البلاط الملكي في أبوظبي. متخصصة في البشت الاحتفالي وملابس المساء الفاخرة بأكثر من ٤٠ عاماً من التميز.",
      logo: "/images/tailor-2.png",
      coverImage: "/images/tailor-2.png",
      location: "Corniche Road",
      city: "Abu Dhabi",
      phone: "+971 2 678 4500",
      rating: 5.0,
      reviewCount: 189,
      ownerId: asma._id,
      isActive: true,
    },
  ]);

  const [ayeshaShop, asmaShop] = shops;

  const designs = await Design.insertMany([
    {
      tailorShopId: ayeshaShop._id,
      name: "Classic Emirati Kandura",
      nameAr: "كندورة إماراتية كلاسيكية",
      slug: "classic-emirati-kandura",
      description:
        "Traditional white kandura with hand-finished collar and cuff details.",
      descriptionAr: "كندورة بيضاء تقليدية بتشطيب يدوي للياقة والأكمام.",
      images: [
        "/images/dress-1.png",
        "/images/dress-2.png",
        "/images/dress-3.png",
      ],
      category: "hand-embroidered",
      basePrice: 650,
      tailoringFee: defaultTailoringFee,
      estimatedMeters: 3.5,
      estimatedDays: 7,
      isActive: true,
    },
    {
      tailorShopId: ayeshaShop._id,
      name: "Executive Tailored Thob",
      nameAr: "ثوب تنفيذي مفصّل",
      slug: "executive-tailored-thob",
      description:
        "Structured thob cut for formal occasions with premium cotton blend.",
      descriptionAr: "ثوب منظّم للمناسبات الرسمية من مزيج قطن فاخر.",
      images: [
        "/images/dress-2.png",
        "/images/dress-3.png",
        "/images/dress-4.png",
      ],
      category: "beaded",
      basePrice: 720,
      tailoringFee: defaultTailoringFee,
      estimatedMeters: 3.0,
      estimatedDays: 10,
      isActive: true,
    },
    {
      tailorShopId: ayeshaShop._id,
      name: "Heritage Jalabiya",
      nameAr: "جلابية تراثية",
      slug: "heritage-jalabiya",
      description:
        "Flowing jalabiya with subtle embroidery inspired by Gulf heritage.",
      descriptionAr: "جلابية انسيابية بتطريز رقيق مستوحى من تراث الخليج.",
      images: [
        "/images/dress-3.png",
        "/images/dress-4.png",
        "/images/dress-5.png",
      ],
      category: "talli",
      basePrice: 890,
      tailoringFee: defaultTailoringFee + 25,
      estimatedMeters: 4.0,
      estimatedDays: 12,
      isActive: true,
    },
    {
      tailorShopId: ayeshaShop._id,
      name: "Modern Linen Abaya",
      nameAr: "عباية كتان عصرية",
      slug: "modern-linen-abaya",
      description: "Lightweight abaya with clean lines for everyday elegance.",
      descriptionAr: "عباية خفيفة بخطوط نظيفة لأناقة يومية.",
      images: [
        "/images/dress-4.png",
        "/images/dress-5.png",
        "/images/dress-1.png",
      ],
      category: "crystal-embellished",
      basePrice: 780,
      tailoringFee: defaultTailoringFee,
      estimatedMeters: 3.5,
      estimatedDays: 9,
      isActive: true,
    },
    {
      tailorShopId: asmaShop._id,
      name: "Royal Ceremonial Bisht",
      nameAr: "بشت احتفالي ملكي",
      slug: "royal-ceremonial-bisht",
      description:
        "Ceremonial bisht with gold zari threading for weddings and state events.",
      descriptionAr: "بشت احتفالي بتطريز ذهبي للأعراس والمناسبات الرسمية.",
      images: [
        "/images/dress-5.png",
        "/images/dress-1.png",
        "/images/dress-2.png",
      ],
      category: "non-crystal",
      basePrice: 3200,
      tailoringFee: defaultTailoringFee + 100,
      estimatedMeters: 2.5,
      estimatedDays: 21,
      isActive: true,
    },
    {
      tailorShopId: asmaShop._id,
      name: "Court Evening Abaya",
      nameAr: "عباية مسائية للبلاط",
      slug: "court-evening-abaya",
      description:
        "Floor-length abaya with hand-beaded details for formal receptions.",
      descriptionAr: "عباية طويلة بتفاصيل مطرّزة يدوياً للاستقبالات الرسمية.",
      images: [
        "/images/dress-1.png",
        "/images/dress-2.png",
        "/images/dress-3.png",
      ],
      category: "crystal-embellished",
      basePrice: 1450,
      tailoringFee: defaultTailoringFee + 50,
      estimatedMeters: 4.0,
      estimatedDays: 14,
      isActive: true,
    },
    {
      tailorShopId: asmaShop._id,
      name: "Heritage Mukhawar",
      nameAr: "مخاوَر تراثي",
      slug: "heritage-mukhawar",
      description:
        "Traditional mukhawar with layered construction and fine finishing.",
      descriptionAr: "مخاوَر تقليدي بطبقات وتشطيبات دقيقة.",
      images: [
        "/images/dress-2.png",
        "/images/dress-3.png",
        "/images/dress-4.png",
      ],
      category: "khous",
      basePrice: 980,
      tailoringFee: defaultTailoringFee,
      estimatedMeters: 3.5,
      estimatedDays: 10,
      isActive: true,
    },
  ]);

  const pendingShopCount = await TailorShop.countDocuments({
    ownerId: seedContext.pendingTailor?._id,
  });
  if (pendingShopCount !== 0) {
    throw new Error("Pending tailor must not have a shop document");
  }

  seedContext.tailorShops = shops;
  seedContext.designs = designs;

  console.log("Seeded tailor shops and designs (L-13):");
  for (const shop of shops) {
    const owner = seedContext.approvedTailors.find((t) =>
      t._id.equals(shop.ownerId),
    );
    const shopDesigns = designs.filter((d) => d.tailorShopId.equals(shop._id));
    console.log(
      `  ${shop.slug} — ${shop.name} (${owner?.email}, ${shopDesigns.length} designs, rating ${shop.rating})`,
    );
    for (const design of shopDesigns) {
      console.log(
        `    ${design.slug} — ${design.name} (${design.category}, base AED ${design.basePrice}, ${design.estimatedMeters}m)`,
      );
    }
  }
  console.log(
    `  Pending tailor (${seedContext.pendingTailor?.email}): no shop (as expected)`,
  );
}

const EXPECTED_COUNTS = {
  users: 7,
  platformSettings: 1,
  readyMadeProducts: 3,
  fabrics: 9,
  tailorShops: 2,
  designs: 7,
  retailOrders: 0,
  customOrders: 0,
};

async function verifySeed() {
  const counts = {
    users: await User.countDocuments(),
    platformSettings: await PlatformSettings.countDocuments(),
    readyMadeProducts: await ReadyMadeProduct.countDocuments(),
    fabrics: await Fabric.countDocuments(),
    tailorShops: await TailorShop.countDocuments(),
    designs: await Design.countDocuments(),
    retailOrders: await RetailOrder.countDocuments(),
    customOrders: await CustomOrder.countDocuments(),
  };

  for (const [collection, expected] of Object.entries(EXPECTED_COUNTS)) {
    const actual = counts[collection];
    if (actual !== expected) {
      throw new Error(
        `Verify failed: ${collection} expected ${expected}, got ${actual}`,
      );
    }
  }

  const pendingTailor = await User.findOne({
    email: "fatima@motd.test",
    role: "tailor",
    approvalStatus: "pending",
  });
  if (!pendingTailor) {
    throw new Error("Verify failed: pending tailor fatima@motd.test not found");
  }

  const pendingShopCount = await TailorShop.countDocuments({
    ownerId: pendingTailor._id,
  });
  if (pendingShopCount !== 0) {
    throw new Error("Verify failed: pending tailor must not have a shop");
  }

  const approvedTailorCount = await User.countDocuments({
    role: "tailor",
    approvalStatus: "approved",
  });
  if (approvedTailorCount !== 2) {
    throw new Error(
      `Verify failed: expected 2 approved tailors, got ${approvedTailorCount}`,
    );
  }

  const shopsForApproved = await TailorShop.countDocuments({
    ownerId: { $in: seedContext.approvedTailors.map((t) => t._id) },
  });
  if (shopsForApproved !== 2) {
    throw new Error(
      `Verify failed: expected 2 shops for approved tailors, got ${shopsForApproved}`,
    );
  }

  const invalidReadyMade = await ReadyMadeProduct.countDocuments({
    $or: [
      { finalSellingPriceAED: { $lte: 0 } },
      { availableFabricStock: { $lt: 0 } },
    ],
  });
  if (invalidReadyMade !== 0) {
    throw new Error(
      "Verify failed: all ready-made products must have valid finalSellingPriceAED and availableFabricStock",
    );
  }

  if (!bcrypt.compareSync(SEED_PASSWORD, seedContext.admin.password)) {
    throw new Error(
      "Verify failed: admin password hash does not match seed password",
    );
  }

  console.log("Verification passed (L-14):");
  for (const [collection, count] of Object.entries(counts)) {
    console.log(`  ${collection}: ${count}`);
  }
  console.log(
    "  Pending tailor has no shop; 2 approved tailors each have a shop",
  );
  console.log("  Handoff: docs/seed-handoff.md");
}

async function seed() {
  if (env.nodeEnv === "production") {
    throw new Error("Refusing to seed when NODE_ENV=production");
  }

  console.log("Starting database seed...");

  await connect();
  await clearDatabase();

  await seedUsersAndSettings();
  await seedFabricShops();
  await seedFabrics();
  await seedTailorShopsAndDesigns();
  await seedReadyMadeProducts();
  await verifySeed();

  console.log("Seed complete");
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
