/** Mock homepage data extracted from Design/index.html (demo; replace with API later). */

export type CarouselProduct = {
  title: string;
  location: string;
  price: string;
  img: string;
  tag: string;
  tagColor: string;
  desc: string;
};

/** Style category for ready-made filter chips (Design/index.html `data-filter`). */
export type ReadyMadeStyle =
  | "kandura"
  | "abaya"
  | "bisht"
  | "mukhawar"
  | "jalabiya"
  | "kaftan";

export type ReadyMadeProduct = CarouselProduct & {
  style: ReadyMadeStyle;
};

export type TailorCard = {
  name: string;
  location: string;
  rating: number;
  price: string;
  availability: string;
  image: string;
  tags: string[];
};

export type BoutiqueStore = {
  title: string;
  city: string;
  photo: string;
  details: string;
  bgTone: string;
  edgeTone: string;
};

export type EliteCategory = {
  slug: string;
  number: string;
  image: string;
};

/** Featured banner slide (Design/index.html `banner_data`). */
export type BannerSlide = {
  id: number;
  src: string;
  alt: string;
  title: string;
};

function publicImage(path: string): string {
  return path.replace(/^\.\/images\//, "/images/");
}

/** Featured banners carousel (Design/index.html `banner_data`, 6 slides). */
export const bannerData: BannerSlide[] = [
  {
    id: 1,
    src: publicImage("./images/ban-1.png"),
    alt: "Luxury Collection",
    title: "The Master's Touch",
  },
  {
    id: 2,
    src: publicImage("./images/ban-4.png"),
    alt: "Heritage Collection",
    title: "Rare & Exquisite",
  },
  {
    id: 3,
    src: publicImage("./images/ban-3.png"),
    alt: "Premium Fabrics",
    title: "Timeless Elegance",
  },
  {
    id: 4,
    src: publicImage("./images/ban-2.png"),
    alt: "Bespoke Tailoring",
    title: "Made to Measure",
  },
  {
    id: 5,
    src: publicImage("./images/ban-2.png"),
    alt: "Evening Collection",
    title: "Evening Elegance",
  },
  {
    id: 6,
    src: publicImage("./images/ban-3.png"),
    alt: "New Arrivals",
    title: "New Collection",
  },
];

/** Elite Collections grid (Design/index.html category section). */
export const eliteCategories: EliteCategory[] = [
  { slug: "abaya", number: "01", image: publicImage("./images/cat-1.png") },
  { slug: "jalabiya", number: "02", image: publicImage("./images/cat-2.png") },
  { slug: "kandura", number: "03", image: publicImage("./images/cat-3.png") },
  { slug: "mukhawar", number: "04", image: publicImage("./images/hero-image.png") },
  { slug: "kaftan", number: "05", image: publicImage("./images/cat-4.png") },
  { slug: "thob", number: "06", image: publicImage("./images/cat-6.png") },
];

/** Ready-made carousel (Design/index.html `collectionItems`). */
export const readyMadeItems: ReadyMadeProduct[] = [
  {
    title: "Emirati Silver Kandura",
    location: "DUBAI, UAE",
    price: "AED 850",
    img: publicImage("./images/fab-1.png"),
    tag: "BESTSELLER",
    tagColor: "bg-primary",
    desc: "Classic white kandura crafted from premium Egyptian cotton. Perfect for daily wear and formal occasions.",
    style: "kandura",
  },
  {
    title: "Luxury Orange Abaya",
    location: "ABU DHABI, UAE",
    price: "AED 1,250",
    img: publicImage("./images/fab-2.png"),
    tag: "ARTISANAL",
    tagColor: "bg-[#C8A97E]",
    desc: "Elegant black abaya with subtle embroidery details. Made from lightweight crepe fabric.",
    style: "abaya",
  },
  {
    title: "Royal Blue Bisht",
    location: "SHARJAH, UAE",
    price: "AED 3,900",
    img: publicImage("./images/fab-3.png"),
    tag: "PREMIUM",
    tagColor: "bg-[#5B4A3A]",
    desc: "Ceremonial bisht with gold zari work. Worn for weddings and official ceremonies.",
    style: "bisht",
  },
  {
    title: "Embroidered Jalabiya",
    location: "DUBAI, UAE",
    price: "AED 1,890",
    img: publicImage("./images/fab-4.png"),
    tag: "NEW",
    tagColor: "bg-[#8B6F47]",
    desc: "Beautifully embroidered jalabiya in midnight blue. Perfect for evening gatherings.",
    style: "jalabiya",
  },
  {
    title: "Summer Caftan",
    location: "RAS AL KHAIMAH, UAE",
    price: "AED 1,450",
    img: publicImage("./images/fab-5.png"),
    tag: "BREATHABLE",
    tagColor: "bg-[#9C6B3C]",
    desc: "Lightweight caftan in soft pastel tones. Ideal for beach and resort wear.",
    style: "kaftan",
  },
  {
    title: "Special Mukhawar",
    location: "DUBAI, UAE",
    price: "AED 2,500",
    img: publicImage("./images/fab-6.png"),
    tag: "EXCLUSIVE",
    tagColor: "bg-[#A0522D]",
    desc: "Modern tailored suit in navy blue. Made from Italian wool blend fabric.",
    style: "mukhawar",
  },
];

/** Alias matching Design/index.html variable name. */
export const collectionItems = readyMadeItems;

export type ReadyMadeFilter = "all" | "kandura" | "abaya" | "bisht";

/** Filter ready-made products by style chip (matches Design/index.html filter chips). */
export function filterReadyMadeItems(
  items: ReadyMadeProduct[],
  filter: ReadyMadeFilter,
): ReadyMadeProduct[] {
  if (filter === "all") return items;
  if (filter === "kandura") return items.filter((item) => item.style === "kandura");
  if (filter === "abaya") return items.filter((item) => item.style === "abaya");
  return items.filter((item) => item.style === "bisht" || item.style === "mukhawar");
}

/** Material type for fabric filter chips (Design/index.html `data-fabric-filter`). */
export type FabricMaterial = "wool" | "silk" | "linen" | "cashmere" | "cotton";

export type FabricProduct = CarouselProduct & {
  material: FabricMaterial;
};

export type FabricFilter = "all" | "wool" | "silk" | "linen" | "cashmere";

/** Fabric storefront carousel (Design/index.html `fabricsCollection`). */
export const fabricsCollection: FabricProduct[] = [
  {
    title: "Emirati Silk Brocade",
    location: "DUBAI, UAE",
    price: "AED 450/m",
    img: publicImage("./images/dress-1.png"),
    tag: "BESTSELLER",
    tagColor: "bg-primary",
    desc: "Handwoven silk brocade with traditional Emirati patterns.",
    material: "silk",
  },
  {
    title: "Abu Dhabi Cashmere",
    location: "ABU DHABI, UAE",
    price: "AED 890/m",
    img: publicImage("./images/dress-2.png"),
    tag: "ARTISANAL",
    tagColor: "bg-[#C8A97E]",
    desc: "Premium cashmere blend sourced from local artisans.",
    material: "cashmere",
  },
  {
    title: "Sharjah Cotton Linen",
    location: "SHARJAH, UAE",
    price: "AED 195/m",
    img: publicImage("./images/dress-3.png"),
    tag: "BREATHABLE",
    tagColor: "bg-[#5B4A3A]",
    desc: "Lightweight cotton-linen perfect for summer elegance.",
    material: "linen",
  },
  {
    title: "Ras Al Khaimah Wool",
    location: "RAK, UAE",
    price: "AED 325/m",
    img: publicImage("./images/dress-4.png"),
    tag: "NEW",
    tagColor: "bg-[#8B6F47]",
    desc: "Luxurious wool fabric from the northern emirates.",
    material: "wool",
  },
  {
    title: "Ajman Heritage Silk",
    location: "AJMAN, UAE",
    price: "AED 580/m",
    img: publicImage("./images/dress-5.png"),
    tag: "HERITAGE",
    tagColor: "bg-[#9C6B3C]",
    desc: "Traditional silk with modern finishing techniques.",
    material: "silk",
  },
  {
    title: "Fujairah Pashmina",
    location: "FUJAIRAH, UAE",
    price: "AED 720/m",
    img: publicImage("./images/dress-1.png"),
    tag: "EXCLUSIVE",
    tagColor: "bg-[#A0522D]",
    desc: "Fine pashmina wool from the eastern region.",
    material: "cashmere",
  },
  {
    title: "Umm Al Quwain Velvet",
    location: "UAQ, UAE",
    price: "AED 420/m",
    img: publicImage("./images/dress-2.png"),
    tag: "PREMIUM",
    tagColor: "bg-[#2C1810]",
    desc: "Rich velvet fabric for ceremonial occasions.",
    material: "wool",
  },
  {
    title: "Desert Sand Linen",
    location: "LIWA, ABU DHABI",
    price: "AED 280/m",
    img: publicImage("./images/dress-3.png"),
    tag: "ARTISANAL",
    tagColor: "bg-[#C8A97E]",
    desc: "Inspired by the golden dunes of the Empty Quarter.",
    material: "linen",
  },
  {
    title: "Pearl Diver's Cotton",
    location: "DUBAI CREEK, UAE",
    price: "AED 165/m",
    img: publicImage("./images/dress-4.png"),
    tag: "SUSTAINABLE",
    tagColor: "bg-[#4A6B5D]",
    desc: "Eco-friendly cotton celebrating UAE's pearling heritage.",
    material: "cotton",
  },
];

/** Filter fabrics by material chip (matches Design/index.html fabric filter chips). */
export function filterFabrics(
  items: FabricProduct[],
  filter: FabricFilter,
): FabricProduct[] {
  if (filter === "all") return items;
  return items.filter((item) => item.material === filter);
}

/** Meet the Tailors — static artisan cards (Design/index.html Masters & Artisans section). */
export type ArtisanTailor = {
  slug: string;
  image: string;
  rating: number;
  reviewCount: number;
};

export const artisanTailors: ArtisanTailor[] = [
  {
    slug: "ayesha-al-riaz",
    image: publicImage("./images/tailor-1.png"),
    rating: 0,
    reviewCount: 0,
  },
  {
    slug: "asma-al-naeem",
    image: publicImage("./images/tailor-2.png"),
    rating: 0,
    reviewCount: 0,
  },
  {
    slug: "fatima-al-qasimi",
    image: publicImage("./images/tailor-3.png"),
    rating: 0,
    reviewCount: 0,
  },
];

/** Client testimonials (Design/index.html The Client Experience section). */
export type ClientTestimonial = {
  slug: string;
  rating: number;
};

export const clientTestimonials: ClientTestimonial[] = [
  { slug: "kauser-al-qayyum", rating: 5 },
  { slug: "noor-al-sayed", rating: 5 },
  { slug: "maria-al-javed", rating: 5 },
  { slug: "maryum-al-yaqoub", rating: 5 },
];

/** Craft Progress timeline steps (Design/index.html Tracking Preview). */
export type OrderTimelineStepId = "confirmed" | "fabric" | "atelier" | "delivery";

/** Demo order tracking preview — activeStep is 0-based (2 = Atelier, per design mockup). */
export const orderTrackingPreview = {
  activeStep: 2,
} as const;

/** Legacy tailor slider data (Design/index.html `tailorGrid` JS — not Meet the Tailors cards). */
export const tailors: TailorCard[] = [
  {
    name: "Alessandro Rossi",
    location: "Milan • Bespoke Suiting",
    rating: 4.9,
    price: "$1,200",
    availability: "Oct 2024",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAfHWE_4UC3S7m9Gxebt4P32Mq2IVh1aH2chndH1uN1eEDRcZPOp5wYgV19kSx1ZfQdtjWp8Gyh4azg1mz8lBt2suPrzxaMgn-J4W62DeOEJU7U0j_toVNleCJ5hle_HR3KDvO-LQvuw1O4Rp1iZ_ejklJrHDnp0Y-KADGCQCro9p-zjMkh2jX8hAW3o0X6qmZuKm3UbjCUQmoUIVLQocSe33m9oYzlLWOnXlDIaxlpFP5UY546vpG1xPYkJZ9ywv0z3VSvXuRSaQ",
    tags: ["Savile Row Trained", "Napolitan Shoulder"],
  },
  {
    name: "Elena Vassiliki",
    location: "Athens • Bridal & Couture",
    rating: 4.8,
    price: "$2,500",
    availability: "Nov 2024",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDNJe46AO99qvb-LrUvGtPEx6aU_9XtJ5VUMa-ZH5W1JfxDvJJqHDkKAmIlvdyXVbTcr3UI7ea6JzfA13bczDbLXrsAsUJn2_qDdvNUdWIVkeCDCXgm7bTA2g68j13LVjTqjf5nBISdVk6pXcap2xdXo3I8QhM8J8SVWxC7jkRPgePyKdtYF-RO-IUEwaxTK3gt1X1TVLwo1wHxAOb9mUOxfFXfOiMFgURYDMR0NQCZR3n19fVeJQmj0Vx9nbVf_tsHgQrz6NErQQ",
    tags: ["Hand-Embroidery", "Draping Master"],
  },
  {
    name: "Hassan Al-Maktoum",
    location: "Dubai • Traditional Luxury",
    rating: 5.0,
    price: "$1,800",
    availability: "Booked",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCjniyFvGYGqSQJXF_l8GmnhyW-08teIMo7OJfkq64qs2KSyk6dlArlf4FOBXIR4ja3PUbiVrjiNyi5eOGY9nu3pdlBNQ5BrWqHfVg3CBCDAIvuS08cxgTkl1Mn45JJ4gKMbxnO1EFtc0rFPxhVkEpQ85MDrCMUeGd-V2FP26xi81jl7hubpM2HeqGdJNEiW35bHTs5QEUzaa3ZKRN2fSQF3wPtVTu7oRtfTtWwb7qmwPSKWRhpp5F60ShRsEiQ53DTuK3RWiV7lQ",
    tags: ["Gold Threading", "Royal Appointment"],
  },
];

/** Popular boutique stores slider (Design/index.html `boutiqueStores`). */
export const boutiqueStores: BoutiqueStore[] = [
  {
    title: "Hanayan",
    city: "Dubai, UAE",
    photo: publicImage("./images/shop-1.png"),
    details: "High-end luxury Abayas, custom sheilas, and premium modest wear.",
    bgTone: "bg-[#FDFBF8]",
    edgeTone: "border-[#D6CEC2]",
  },
  {
    title: "Mauzan",
    city: "Abu Dhabi, UAE",
    photo: publicImage("./images/shop-2.png"),
    details: "Haute couture Abayas and luxury French-inspired Arabian tailoring.",
    bgTone: "bg-[#F8F5F0]",
    edgeTone: "border-[#E8E1D8]",
  },
  {
    title: "Hessa Falasi",
    city: "Dubai, UAE",
    photo: publicImage("./images/shop-3.png"),
    details: "Contemporary, minimalist Abayas and flowing Kaftans.",
    bgTone: "bg-[#F6F1EB]",
    edgeTone: "border-[#D8C3A5]",
  },
  {
    title: "DAS Collection",
    city: "Dubai, UAE",
    photo: publicImage("./images/shop-4.png"),
    details: "Modernized traditional Emirati dresses and high-fashion modest outerwear.",
    bgTone: "bg-[#FAF7F2]",
    edgeTone: "border-[#E7DDD0]",
  },
  {
    title: "Bait Al Jalabiya",
    city: "Abu-Dhabi, UAE",
    photo: publicImage("./images/shop-5.png"),
    details: "Ornate Jalabiyas, Moroccan-style kaftans, and traditional festive wear.",
    bgTone: "bg-[#F4EFE8]",
    edgeTone: "border-[#D9CFC3]",
  },
  {
    title: "Kalash Boutique",
    city: "Dubai, UAE",
    photo: publicImage("./images/shop-6.png"),
    details: "Classic Arabian dresses, traditional embroidery, and Gulf heritage attire.",
    bgTone: "bg-[#FBF8F4]",
    edgeTone: "border-[#DDD3C6]",
  },
];