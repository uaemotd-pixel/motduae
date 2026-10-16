"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { api, getApiErrorMessage } from "@/lib/api/client";
import { FormPageSkeleton } from "@/components/ui/Skeleton";
import {
  ChevronLeft,
  Edit,
  MapPin,
  Layers,
  Package,
  Scissors,
  Coins,
  Palette,
  Info,
} from "lucide-react";
import { ImageModal } from "@/components/shared/ImageModal";
import { LowStockBadge } from "@/components/shared/LowStockBadge";
import { resolveMediaUrl } from "@/lib/media";
import { formatPhoneDisplay } from "@/lib/uaePhone";
import { isLowStockQty } from "@/lib/lowStock";
import {
  PartnerListingPrice,
  useFabricStoreCommission,
} from "@/components/partner/CommissionFinalPriceField";

interface PopulatedRef {
  _id: string;
  name?: string;
  nameAr?: string;
  slug?: string;
  logo?: string;
  image?: string;
  images?: string[];
  priceAED?: number;
}

interface ReadyMadeProductDetails {
  _id: string;
  name: string;
  nameAr?: string;
  code?: string;
  slug?: string;
  description?: string;
  descriptionAr?: string;
  category?: string;
  categoryAr?: string;
  material?: string;
  materialAr?: string;
  pattern?: string;
  patternAr?: string;
  season?: string;
  seasonAr?: string;
  tag?: string;
  tagAr?: string;
  colors?: string[];
  thumbnailImage?: string;
  images?: string[];
  fabricShopId?: PopulatedRef | string | null;
  fabricId?: PopulatedRef | string | null;
  tailorShopId?: PopulatedRef | string | null;
  designId?: PopulatedRef | string | null;
  fabricType?: string;
  fabricTypeAr?: string;
  tailorName?: string;
  tailorNameAr?: string;
  pickupAddress?: {
    fullName?: string;
    phone?: string;
    line1?: string;
    line2?: string;
    building?: string;
    city?: string;
    emirate?: string;
  };
  metersPerFabric?: number;
  fabricPriceAED?: number;
  mukhawarPriceAED?: number;
  finalSellingPriceAED?: number;
  availableFabricStock?: number;
  minAge?: number;
  maxAge?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function FabricReadyMadeDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const localeParam = (params.locale as string) || "en";
  const id = params.id as string;
  const isAr = localeParam === "ar";

  const commissionPercent = useFabricStoreCommission();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<ReadyMadeProductDetails | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setImageModalOpen(true);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await api.get<ReadyMadeProductDetails>(
          `/api/fabric/ready-made/${id}`,
        );

        if (!data) {
          setError(isAr ? "المنتج غير موجود" : "Ready-made product not found");
          return;
        }

        setProduct(data);
      } catch (err: unknown) {
        setError(
          getApiErrorMessage(
            err,
            isAr ? "فشل تحميل تفاصيل المنتج" : "Failed to load product details",
          ),
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id, isAr]);

  if (loading) {
    return <FormPageSkeleton fields={8} />;
  }

  if (error || !product) {
    return (
      <div className="text-center text-red-600 bg-red-50 p-6 rounded-2xl max-w-md mx-auto my-12 border border-red-200">
        <p className="font-medium">{error || (isAr ? "المنتج غير موجود" : "Product not found")}</p>
        <button
          onClick={() => router.push("/fabric/ready-made")}
          className="mt-4 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition text-sm cursor-pointer"
        >
          {isAr ? "العودة إلى القائمة" : "Back to list"}
        </button>
      </div>
    );
  }

  const rawImages: string[] = [];
  if (product.thumbnailImage && product.thumbnailImage.trim()) {
    rawImages.push(product.thumbnailImage);
  }
  if (Array.isArray(product.images)) {
    product.images.forEach((img) => {
      if (img && img.trim() && !rawImages.includes(img)) {
        rawImages.push(img);
      }
    });
  }
  const images = rawImages.length > 0 ? rawImages : ["/placeholder.png"];

  const stock = typeof product.availableFabricStock === "number" ? product.availableFabricStock : 0;
  const isAvailable = stock > 0;
  const isLowStock = isLowStockQty(stock);

  const displayName = isAr && product.nameAr ? product.nameAr : product.name;
  const fabricName =
    product.fabricId && typeof product.fabricId === "object"
      ? (isAr && product.fabricId.nameAr ? product.fabricId.nameAr : product.fabricId.name)
      : (isAr && product.fabricTypeAr ? product.fabricTypeAr : product.fabricType) || "—";

  const tailorDisplayName =
    product.tailorShopId && typeof product.tailorShopId === "object"
      ? (isAr && product.tailorShopId.nameAr ? product.tailorShopId.nameAr : product.tailorShopId.name)
      : (isAr && product.tailorNameAr ? product.tailorNameAr : product.tailorName) || "—";

  const ageRangeText = () => {
    const min = product.minAge ?? 0;
    const max = product.maxAge ?? 0;
    if (min > 0 && max > 0) {
      return `${min} - ${max} ${isAr ? "سنة" : "years"}`;
    } else if (min > 0) {
      return `${min}+ ${isAr ? "سنة" : "years"}`;
    } else if (max > 0) {
      return `${isAr ? "حتى" : "Up to"} ${max} ${isAr ? "سنة" : "years"}`;
    }
    return isAr ? "جميع الأعمار" : "All ages";
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 px-4 md:px-0 pb-12">
      {/* Breadcrumbs & Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-100">
        <div className="text-left">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500 mb-1">
            <Link
              href="/fabric/ready-made"
              className="hover:text-black transition"
            >
              {isAr ? "الملابس الجاهزة" : "Ready-Made Inventory"}
            </Link>
            <span>/</span>
            <span className="text-black font-medium">
              {isAr ? "التفاصيل" : "Details"}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-2xl md:text-3xl font-light text-black tracking-tight">
              {displayName}
            </h1>
            {product.code && (
              <span className="font-mono text-xs px-2.5 py-1 bg-gray-100 text-gray-800 rounded-md border border-gray-200">
                {product.code}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/fabric/ready-made"
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition cursor-pointer bg-white"
          >
            <ChevronLeft className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
            <span>{isAr ? "رجوع" : "Back"}</span>
          </Link>
          <Link
            href={`/fabric/ready-made/${id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition cursor-pointer"
          >
            <Edit className="w-4 h-4" />
            <span>{isAr ? "تعديل" : "Edit Item"}</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Image Gallery & Quick Stats */}
        <div className="lg:col-span-5 space-y-4">
          <div
            className="aspect-square bg-[#F5F4F0] rounded-2xl overflow-hidden relative cursor-zoom-in border border-gray-100 group shadow-xs"
            onClick={() =>
              handleImageClick(resolveMediaUrl(images[activeImage]) || "")
            }
          >
            <img
              src={resolveMediaUrl(images[activeImage]) || "/placeholder.png"}
              alt={product.name}
              className="w-full h-full object-cover transition duration-500 group-hover:scale-102"
            />
            {/* Badges Overlay */}
            <div className="absolute top-4 left-4 flex flex-col gap-1.5 items-start">
              <span className="bg-black/75 backdrop-blur-xs text-white px-2.5 py-1 text-[10px] tracking-wider uppercase font-mono rounded-md">
                {product.isActive !== false
                  ? isAr
                    ? "نشط"
                    : "Active"
                  : isAr
                    ? "غير نشط"
                    : "Inactive"}
              </span>
              {isLowStock ? (
                <LowStockBadge label={isAr ? "مخزون منخفض" : "Low stock"} />
              ) : isAvailable ? (
                <span className="bg-emerald-600/90 text-white px-2.5 py-1 text-[10px] tracking-wider uppercase font-mono rounded-md">
                  {isAr ? "متوفر" : "In Stock"}
                </span>
              ) : (
                <span className="bg-rose-600/90 text-white px-2.5 py-1 text-[10px] tracking-wider uppercase font-mono rounded-md">
                  {isAr ? "نفذ المخزون" : "Out of Stock"}
                </span>
              )}
            </div>
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition hover:cursor-pointer ${
                    idx === activeImage
                      ? "border-black scale-102 shadow-xs"
                      : "border-transparent hover:border-gray-300"
                  }`}
                >
                  <img
                    src={resolveMediaUrl(img) || "/placeholder.png"}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Stock Card */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h2 className="text-xs uppercase tracking-widest text-gray-400 font-semibold border-b border-gray-50 pb-2 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" />
              <span>{isAr ? "المخزون والتوفر" : "Stock & Inventory"}</span>
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                  {isAr ? "الكمية المتاحة" : "Available Units"}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-xl font-bold font-mono ${
                      isLowStock
                        ? "text-rose-700"
                        : isAvailable
                          ? "text-black"
                          : "text-gray-400"
                    }`}
                  >
                    {stock}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    {isAr ? "قطعة" : "pieces"}
                  </span>
                </div>
              </div>

              {/* Age Range temporarily hidden
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                  {isAr ? "الفئة العمرية" : "Age Range"}
                </p>
                <p className="text-sm font-medium text-black mt-1">
                  {ageRangeText()}
                </p>
              </div>
              */}
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Product Information */}
        <div className="lg:col-span-7 space-y-6 text-left">
          {/* Section 1: Pricing Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h2 className="text-xs uppercase tracking-widest text-gray-400 font-semibold border-b border-gray-50 pb-2 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5" />
              <span>{isAr ? "التسعير والمالية" : "Pricing & Revenue"}</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
                  {isAr ? "سعر البيع النهائي للعميل" : "Final Selling Price"}
                </p>
                <div className="mt-1">
                  <PartnerListingPrice
                    netAmount={product.finalSellingPriceAED || 0}
                    commissionPercent={commissionPercent}
                    stacked
                    className="font-mono text-base font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm py-1 border-b border-gray-50">
                  <span className="text-gray-500 text-xs">
                    {isAr ? "سعر القماش" : "Fabric Cost"}:
                  </span>
                  <span className="font-mono font-medium text-black">
                    {product.fabricPriceAED ?? 0} AED
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm py-1 border-b border-gray-50">
                  <span className="text-gray-500 text-xs">
                    {isAr ? "سعر المخور / الخياطة" : "Tailoring / Mukhawar"}:
                  </span>
                  <span className="font-mono font-medium text-black">
                    {product.mukhawarPriceAED ?? 0} AED
                  </span>
                </div>
                {product.metersPerFabric && product.metersPerFabric > 0 ? (
                  <div className="flex justify-between items-center text-sm py-1">
                    <span className="text-gray-500 text-xs">
                      {isAr ? "استهلاك القماش" : "Fabric Required"}:
                    </span>
                    <span className="font-mono font-medium text-black">
                      {product.metersPerFabric} {isAr ? "متر" : "meters"}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Section 2: Associated Partner Entities */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h2 className="text-xs uppercase tracking-widest text-gray-400 font-semibold border-b border-gray-50 pb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>{isAr ? "تفاصيل الشركاء" : "Partners & Associations"}</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-gray-400">
                  <Scissors className="w-3.5 h-3.5" />
                  <span>{isAr ? "الخياط / المتجر" : "Tailor / Tailor Shop"}</span>
                </div>
                <p className="text-sm font-medium text-black mt-1">
                  {tailorDisplayName}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-gray-400">
                  <Layers className="w-3.5 h-3.5" />
                  <span>{isAr ? "القماش المرتبط" : "Assigned Fabric"}</span>
                </div>
                <p className="text-sm font-medium text-black mt-1">
                  {fabricName}
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Attributes & Specifications */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h2 className="text-xs uppercase tracking-widest text-gray-400 font-semibold border-b border-gray-50 pb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>{isAr ? "المواصفات والسمات" : "Attributes & Specifications"}</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                  {isAr ? "الفئة" : "Category"}
                </p>
                <p className="text-sm font-medium text-black mt-0.5">
                  {(isAr && product.categoryAr ? product.categoryAr : product.category) || "—"}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                  {isAr ? "المادة" : "Material"}
                </p>
                <p className="text-sm font-medium text-black mt-0.5">
                  {(isAr && product.materialAr ? product.materialAr : product.material) || "—"}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                  {isAr ? "النقش" : "Pattern"}
                </p>
                <p className="text-sm font-medium text-black mt-0.5">
                  {(isAr && product.patternAr ? product.patternAr : product.pattern) || "—"}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                  {isAr ? "الموسم" : "Season"}
                </p>
                <p className="text-sm font-medium text-black mt-0.5">
                  {(isAr && product.seasonAr ? product.seasonAr : product.season) || "—"}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                  {isAr ? "الوسم" : "Tag"}
                </p>
                <p className="text-sm font-medium text-black mt-0.5">
                  {(isAr && product.tagAr ? product.tagAr : product.tag) || "—"}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                  {isAr ? "الرمز" : "Code"}
                </p>
                <p className="text-sm font-mono text-black mt-0.5">
                  {product.code || "—"}
                </p>
              </div>
            </div>

            {/* Colors */}
            {product.colors && product.colors.length > 0 && (
              <div className="border-t border-gray-50 pt-4">
                <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-gray-400 mb-2">
                  <Palette className="w-3.5 h-3.5" />
                  <span>{isAr ? "الألوان المتوفرة" : "Available Colors"}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 text-gray-800 text-xs font-mono border border-gray-200 rounded-lg"
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-black/20 shrink-0"
                        style={{ backgroundColor: c }}
                      />
                      <span>{c}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {(product.description || product.descriptionAr) && (
              <div className="border-t border-gray-50 pt-4 space-y-3">
                {product.description && (
                  <div>
                    <p className="text-[11px] font-mono uppercase tracking-wider text-gray-400">
                      Description (EN)
                    </p>
                    <p className="text-sm text-gray-700 mt-1 leading-relaxed whitespace-pre-line">
                      {product.description}
                    </p>
                  </div>
                )}
                {product.descriptionAr && (
                  <div className="text-right">
                    <p className="text-[11px] font-mono uppercase tracking-wider text-gray-400 text-left">
                      الوصف (العربية)
                    </p>
                    <p className="text-sm text-gray-700 mt-1 leading-relaxed whitespace-pre-line dir-rtl">
                      {product.descriptionAr}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 4: Store Pickup Address */}
          {product.pickupAddress && (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-50 pb-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <h2 className="text-xs uppercase tracking-widest text-gray-400 font-semibold">
                  {isAr ? "عنوان واستلام المتجر" : "Store Pickup & Fulfillment Address"}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {product.pickupAddress.fullName && (
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                      {isAr ? "الشخص المسؤول" : "Contact Person"}
                    </p>
                    <p className="text-sm font-medium text-black mt-0.5">
                      {product.pickupAddress.fullName}
                    </p>
                  </div>
                )}

                {product.pickupAddress.phone && (
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                      {isAr ? "رقم الهاتف" : "Phone Number"}
                    </p>
                    <p className="text-sm font-medium text-black font-mono mt-0.5">
                      {formatPhoneDisplay(product.pickupAddress.phone)}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                    {isAr ? "الإمارة" : "Emirate"}
                  </p>
                  <p className="text-sm font-medium text-black mt-0.5">
                    {product.pickupAddress.emirate || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                    {isAr ? "المدينة" : "City"}
                  </p>
                  <p className="text-sm font-medium text-black mt-0.5">
                    {product.pickupAddress.city || "—"}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                    {isAr ? "تفاصيل العنوان" : "Street Address / Building"}
                  </p>
                  <p className="text-sm font-medium text-black mt-0.5">
                    {[
                      product.pickupAddress.building,
                      product.pickupAddress.line1,
                      product.pickupAddress.line2,
                    ]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Meta & System Identifiers */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-3">
            <h2 className="text-xs uppercase tracking-widest text-gray-400 font-semibold border-b border-gray-50 pb-2 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              <span>{isAr ? "معلومات النظام" : "System Identifiers"}</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-400 uppercase tracking-wider font-mono text-[10px] block">
                  Slug
                </span>
                <span className="font-mono text-gray-700 break-all">
                  {product.slug || "—"}
                </span>
              </div>

              <div>
                <span className="text-gray-400 uppercase tracking-wider font-mono text-[10px] block">
                  Product ID
                </span>
                <span className="font-mono text-gray-700">
                  {product._id}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ImageModal
        isOpen={imageModalOpen}
        imageUrl={selectedImage}
        alt="Ready-made item preview"
        onClose={() => setImageModalOpen(false)}
      />
    </div>
  );
}
