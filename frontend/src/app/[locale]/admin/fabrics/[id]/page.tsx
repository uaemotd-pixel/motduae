"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { api, getApiErrorMessage } from "@/lib/api/client";
import { getTranslation } from "@/lib/getTranslation";
import {
  FabricFormData,
  fromApiFabric,
  PickupAddress,
} from "@/lib/createFabricAdmin";
import { FormPageSkeleton } from "@/components/ui/Skeleton";
import { ChevronLeft, Edit, MapPin, Layers, Tag, Globe, Calendar, CheckCircle, XCircle } from "lucide-react";
import { ImageModal } from "@/components/shared/ImageModal";
import { resolveMediaUrl } from "@/lib/media";

export default function FabricDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const localeParam = params.locale as string;
  const id = params.id as string;
  const t = getTranslation(localeParam);
  const isAr = localeParam === "ar";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fabric, setFabric] = useState<FabricFormData | null>(null);
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
        let data: Record<string, unknown> | undefined;

        try {
          data = await api.get<Record<string, unknown>>(
            `/api/admin/fabrics/${id}`,
          );
        } catch (directErr: unknown) {
          const status =
            directErr && typeof directErr === "object" && "status" in directErr
              ? (directErr as { status: number }).status
              : undefined;

          if (status === 404) {
            const allItems =
              await api.get<Record<string, unknown>[]>("/api/admin/fabrics");
            data = allItems.find((item) => item._id === id);
          } else {
            throw directErr;
          }
        }

        if (!data) {
          setError(t.adminFabrics.edit.not_found);
          return;
        }

        setFabric(fromApiFabric(data));
      } catch (err: unknown) {
        setError(
          getApiErrorMessage(err, t.adminFabrics.errors.load_failed),
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, localeParam, t]);

  if (loading) {
    return <FormPageSkeleton fields={8} />;
  }

  if (error || !fabric) {
    return (
      <div className="text-center text-red-600 bg-red-50 p-6 rounded-lg max-w-md mx-auto my-12">
        <p>{error || t.adminFabrics.edit.not_found}</p>
        <button
          onClick={() => router.push("/admin/fabrics")}
          className="mt-4 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition text-sm cursor-pointer"
        >
          {t.adminFabrics.edit.back_to_list}
        </button>
      </div>
    );
  }

  const images = fabric.images.filter((img) => img.trim() !== "");

  return (
    <div className="max-w-5xl mx-auto space-y-6 px-4 md:px-0">
      
      {/* Breadcrumbs & Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-100">
        <div className="text-left">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500 mb-1">
            <Link href="/admin/fabrics" className="hover:text-black transition">
              {t.adminFabrics.edit.back_to_list}
            </Link>
            <span>/</span>
            <span className="text-black font-medium">Details</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-light text-black tracking-tight">
            {isAr ? fabric.nameAr || fabric.name : fabric.name}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/fabrics"
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition cursor-pointer bg-white"
          >
            <ChevronLeft className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
            <span>{isAr ? "رجوع" : "Back"}</span>
          </Link>
          <Link
            href={`/admin/fabrics/${id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition cursor-pointer"
          >
            <Edit className="w-4 h-4" />
            <span>{isAr ? "تعديل" : "Edit Fabric"}</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column - Image Gallery */}
        <div className="lg:col-span-5 space-y-4">
          <div 
            className="aspect-square bg-[#F5F4F0] rounded-xl overflow-hidden relative cursor-zoom-in border border-gray-100 group"
            onClick={() => handleImageClick(resolveMediaUrl(images[activeImage]) || "")}
          >
            <img
              src={resolveMediaUrl(images[activeImage]) || "/placeholder.png"}
              alt={fabric.name}
              className="w-full h-full object-cover transition duration-500 group-hover:scale-102"
            />
            <div className="absolute top-4 left-4 bg-black/75 text-white px-3 py-1 text-[10px] tracking-wider uppercase font-mono rounded">
              {fabric.isActive ? (isAr ? "نشط" : "Active") : (isAr ? "غير نشط" : "Inactive")}
            </div>
          </div>

          {images.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition ${
                    idx === activeImage ? "border-black scale-102" : "border-transparent hover:border-gray-300"
                  }`}
                >
                  <img
                    src={resolveMediaUrl(img) || "/placeholder.png"}
                    alt={`Thumb ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Product Attributes & Pickup Location */}
        <div className="lg:col-span-7 space-y-6 text-left">
          
          {/* Section 1: Overview */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h2 className="text-xs uppercase tracking-widest text-gray-400 font-semibold border-b border-gray-50 pb-2">
              Overview
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-wider text-gray-400">Price per meter</p>
                <p className="text-xl font-light text-black mt-0.5">AED {fabric.pricePerMeter}</p>
              </div>
              
              <div>
                <p className="text-[11px] font-mono uppercase tracking-wider text-gray-400">Available Stock</p>
                <p className="text-xl font-light text-black mt-0.5">{fabric.stockInMeters} meters</p>
              </div>
            </div>

            <div className="border-t border-gray-50 pt-4">
              <p className="text-[11px] font-mono uppercase tracking-wider text-gray-400">URL Slug</p>
              <p className="text-sm font-mono text-gray-600 mt-0.5 break-all">{fabric.slug}</p>
            </div>

            {fabric.listedByStore && (
              <div className="border-t border-gray-50 pt-4">
                <p className="text-[11px] font-mono uppercase tracking-wider text-gray-400">Listed By Store</p>
                <p className="text-sm font-medium text-black mt-0.5">{fabric.listedByStore}</p>
              </div>
            )}
          </div>

          {/* Section 2: Details */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h2 className="text-xs uppercase tracking-widest text-gray-400 font-semibold border-b border-gray-50 pb-2">
              Attributes & Description
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-gray-400">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Material (EN)</span>
                </div>
                <p className="text-sm font-medium text-black mt-0.5">{fabric.material || "—"}</p>
              </div>
              
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-gray-400">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Material (AR)</span>
                </div>
                <p className="text-sm font-medium text-black mt-0.5">{fabric.materialAr || "—"}</p>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-gray-400">
                  <Tag className="w-3.5 h-3.5" />
                  <span>Tag (EN)</span>
                </div>
                <p className="text-sm font-medium text-black mt-0.5">{fabric.tag || "—"}</p>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-gray-400">
                  <Tag className="w-3.5 h-3.5" />
                  <span>Tag (AR)</span>
                </div>
                <p className="text-sm font-medium text-black mt-0.5">{fabric.tagAr || "—"}</p>
              </div>

              {(fabric.minAge !== null || fabric.maxAge !== null) && (
                <div className="col-span-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-gray-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Age Recommendations</span>
                  </div>
                  <p className="text-sm font-medium text-black mt-0.5">
                    {fabric.minAge !== null ? `${fabric.minAge} years` : "No minimum"} — {fabric.maxAge !== null ? `${fabric.maxAge} years` : "No maximum"}
                  </p>
                </div>
              )}
            </div>

            {fabric.colors && fabric.colors.length > 0 && (
              <div className="border-t border-gray-50 pt-4">
                <p className="text-[11px] font-mono uppercase tracking-wider text-gray-400 mb-2">Available Colors</p>
                <div className="flex flex-wrap gap-1.5">
                  {fabric.colors.map((c) => (
                    <span 
                      key={c}
                      className="px-2.5 py-1 bg-gray-50 text-gray-700 text-xs font-mono border border-gray-150 rounded"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(fabric.description || fabric.descriptionAr) && (
              <div className="border-t border-gray-50 pt-4 space-y-3">
                {fabric.description && (
                  <div>
                    <p className="text-[11px] font-mono uppercase tracking-wider text-gray-400">Description (EN)</p>
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed whitespace-pre-line">{fabric.description}</p>
                  </div>
                )}
                {fabric.descriptionAr && (
                  <div className="text-right">
                    <p className="text-[11px] font-mono uppercase tracking-wider text-gray-400 text-left">Description (AR)</p>
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed whitespace-pre-line dir-rtl">{fabric.descriptionAr}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Store Pickup Address */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-50 pb-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <h2 className="text-xs uppercase tracking-widest text-gray-400 font-semibold">
                Store Pickup Address & Contact
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Emirate</p>
                <p className="text-sm font-medium text-black mt-0.5">{fabric.pickupAddress.emirate || "—"}</p>
              </div>

              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400">City</p>
                <p className="text-sm font-medium text-black mt-0.5">{fabric.pickupAddress.city || "—"}</p>
              </div>

              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Street / Area</p>
                <p className="text-sm font-medium text-black mt-0.5">{fabric.pickupAddress.street || "—"}</p>
              </div>

              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Building / Villa</p>
                <p className="text-sm font-medium text-black mt-0.5">{fabric.pickupAddress.building || "—"}</p>
              </div>

              <div className="col-span-2 border-t border-gray-50 pt-4">
                <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Contact Number</p>
                <p className="text-sm font-medium text-black font-mono mt-0.5">
                  {fabric.pickupAddress.phone ? `+971 ${fabric.pickupAddress.phone}` : "—"}
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

      <ImageModal
        isOpen={imageModalOpen}
        imageUrl={selectedImage}
        alt="Fabric product image zoom"
        onClose={() => setImageModalOpen(false)}
      />
    </div>
  );
}
