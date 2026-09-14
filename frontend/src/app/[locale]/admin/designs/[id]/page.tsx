"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getApiErrorMessage } from "@/lib/api/client";
import { getTranslation } from "@/lib/getTranslation";
import { FormPageSkeleton } from "@/components/ui/Skeleton";
import { ChevronLeft, Edit } from "lucide-react";
import { ImageModal } from "@/components/shared/ImageModal";
import { resolveMediaUrl } from "@/lib/media";
import { Tag } from "@/components/ui/Tag";
import {
  fetchAdminDesign,
  getDesignTailorShopName,
  type AdminDesignProfile,
} from "@/lib/adminDesigns";

export default function AdminDesignDetailsPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const id = params.id as string;
  const t = getTranslation(locale).adminDesigns;
  const isAr = locale === "ar";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [design, setDesign] = useState<AdminDesignProfile | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const item = await fetchAdminDesign(id);
        setDesign(item);
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, t.errors.load_failed));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id, t.errors.load_failed]);

  if (loading) {
    return <FormPageSkeleton fields={8} />;
  }

  if (error || !design) {
    return (
      <div className="max-w-3xl mx-auto px-3 sm:px-0">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error || t.edit.not_found}
        </div>
        <Link
          href="/admin/designs"
          className="inline-flex items-center gap-1 mt-4 text-sm underline hover:cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          {t.edit.back_to_list}
        </Link>
      </div>
    );
  }

  const images = (design.images || [])
    .map((img) => resolveMediaUrl(img))
    .filter(Boolean);
  const name = isAr && design.nameAr ? design.nameAr : design.name;
  const description =
    isAr && design.descriptionAr ? design.descriptionAr : design.description;
  const category =
    isAr && design.categoryAr ? design.categoryAr : design.category;
  const material =
    isAr && design.materialAr ? design.materialAr : design.material;
  const pattern = isAr && design.patternAr ? design.patternAr : design.pattern;
  const season = isAr && design.seasonAr ? design.seasonAr : design.season;
  const tag = isAr && design.tagAr ? design.tagAr : design.tag;
  const cutName =
    isAr && design.minCutSnapshot?.nameAr
      ? design.minCutSnapshot.nameAr
      : design.minCutSnapshot?.name || "—";

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <Link
            href="/admin/designs"
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-black mb-2 hover:cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            {t.view.back}
          </Link>
          <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-light text-black tracking-tight">
            {name}
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">{design.slug}</p>
        </div>
        <Link
          href={`/admin/designs/${design._id}/edit`}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition text-sm hover:cursor-pointer"
        >
          <Edit className="w-4 h-4" />
          {t.view.edit_button}
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div
            className="aspect-square rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 cursor-pointer"
            onClick={() => {
              if (images[activeImage]) {
                setSelectedImage(images[activeImage]);
                setImageModalOpen(true);
              }
            }}
          >
            {images[activeImage] ? (
              <img
                src={images[activeImage]}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                {t.view.images}
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img, index) => (
                <button
                  key={img + index}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border shrink-0 hover:cursor-pointer ${
                    activeImage === index
                      ? "border-black"
                      : "border-gray-200"
                  }`}
                >
                  <img
                    src={img}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 space-y-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-500">{t.view.status}</span>
            <Tag size="md" variant={design.isActive ? "outline" : "muted"}>
              {design.isActive
                ? t.list.status_active
                : t.list.status_inactive}
            </Tag>
          </div>

          <DetailRow
            label={t.view.tailor}
            value={getDesignTailorShopName(design, locale)}
          />
          <DetailRow label={t.view.category} value={category || "—"} />
          <DetailRow label={t.view.material} value={material || "—"} />
          <DetailRow label={t.view.pattern} value={pattern || "—"} />
          <DetailRow label={t.view.season} value={season || "—"} />
          <DetailRow label={t.view.tag} value={tag || "—"} />
          <DetailRow
            label={t.view.base_price}
            value={`${Number(design.basePrice || 0).toFixed(2)} AED`}
          />
          <DetailRow
            label={t.view.tailoring_fee}
            value={`${Number(design.tailoringFee || 0).toFixed(2)} AED`}
          />
          <DetailRow label={t.view.min_cut} value={cutName} />
          <DetailRow
            label={t.view.estimated_days}
            value={String(design.estimatedDays || "—")}
          />
          <DetailRow
            label={t.view.age_range}
            value={`${design.minAge ?? 0} – ${design.maxAge ?? 0}`}
          />

          {description ? (
            <div>
              <p className="text-gray-500 mb-1">{t.view.description}</p>
              <p className="text-black whitespace-pre-wrap">{description}</p>
            </div>
          ) : null}
        </div>
      </div>

      <ImageModal
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        imageUrl={selectedImage}
        alt={name}
      />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-50 pb-2">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="text-black text-right">{value}</span>
    </div>
  );
}
