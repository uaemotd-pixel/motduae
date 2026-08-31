"use client";

import { useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { Heart, Trash2, ArrowLeft, Eye, Maximize2 } from "lucide-react";
import MainLayout from "../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";
import { useWishlist, type WishlistItem } from "@/context/WishlistContext";
import { resolveMediaUrl } from "@/lib/media";
import { ImageModal } from "@/components/shared/ImageModal";

export default function WishlistPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const { wishItems, removeItem, clearWishlist } = useWishlist();
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");

  const redirectToDetail = (item: WishlistItem) => {
    const slug = item.slug || item.id;
    let path = "";

    if (item.type === "design") {
      path = `/designs/${slug}`;
    } else if (item.type === "fabric") {
      path = `/fabrics/${slug}`;
    } else if (item.type === "readyMade") {
      path = `/ready-made/${slug}`;
    } else if (item.type === "addons") {
      path = `/addons/${slug}`;
    }

    router.push(path);
  };

  const handleImageClick = (imageUrl: string) => {
    if (imageUrl) {
      setSelectedImage(imageUrl);
      setImageModalOpen(true);
    }
  };

  if (wishItems.length === 0) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-(--bg-page) flex items-center justify-center px-4 py-12">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 mx-auto mb-6 bg-[#F2F2F0] rounded-full flex items-center justify-center">
              <Heart className="w-10 h-10 text-[#5A5A56]" />
            </div>
            <h1 className="[font-family:var(--font-display)] text-[28px] xs:text-[32px] sm:text-[36px] text-black mb-3">
              Your Wishlist is Empty
            </h1>
            <p className="text-[13px] xs:text-[14px] text-[#5A5A56] mb-6">
              Save your favorite items and come back later.
            </p>
            <Link
              href={`/`}
              scroll={true}
              className="inline-block px-6 py-3 bg-black text-white text-[10px] xs:text-[11px] tracking-[0.22em] uppercase hover:bg-[#1A1A1A] transition duration-300 hover:cursor-pointer"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <FadeInSection>
        <div className="bg-(--bg-page) py-12 xs:py-16 sm:py-20 md:py-24">
          <div className="px-4 xs:px-6 sm:px-8 md:px-12 lg:px-(--space-40) w-full mx-auto max-w-7xl">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-8 xs:mb-10 md:mb-12">
              <div>
                <h1 className="[font-family:var(--font-display)] text-[32px] xs:text-[36px] sm:text-[40px] md:text-[44px] lg:text-[48px] font-normal leading-[1.1] tracking-[-0.01em] text-black">
                  My Wishlist
                </h1>
                <p className="[font-family:var(--font-ui)] text-[9px] xs:text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) mt-2">
                  {wishItems.length} {wishItems.length === 1 ? "item" : "items"}
                </p>
              </div>
              <Link
                href={`/`}
                scroll={true}
                className="flex items-center gap-2 [font-family:var(--font-ui)] text-[9px] xs:text-[10px] uppercase tracking-[0.24em] text-black border-b border-black pb-1 hover:opacity-50 transition hover:cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                Continue Shopping
              </Link>
            </div>

            <div className="w-full">
              <div className="bg-(--bg-page) border border-(--color-border) rounded-lg overflow-hidden divide-y divide-(--color-border)">
                {wishItems.map((item) => {
                  const imageUrl = resolveMediaUrl(item.image);
                  return (
                    <div
                      key={item.id}
                      className="p-4 xs:p-5 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-6"
                    >
                      {/* Image with click to enlarge */}
                      <div className="w-full sm:w-28 h-28 bg-[#F5F5F0] rounded-md overflow-hidden shrink-0 relative group">
                        <img
                          src={imageUrl || "/placeholder.png"}
                          alt={item.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 hover:cursor-pointer"
                        />
                        {imageUrl && (
                          <button
                            onClick={() => handleImageClick(imageUrl)}
                            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:cursor-pointer"
                          >
                            <Maximize2 className="w-6 h-6 text-white" />
                          </button>
                        )}
                      </div>

                      <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="space-y-1">
                          <span className="inline-block [font-family:var(--font-ui)] text-[8px] xs:text-[9px] uppercase tracking-[0.2em] text-(--color-grey-muted) bg-gray-100 px-2 py-0.5 rounded">
                            {item.type || "product"}
                          </span>
                          <h3 className="[font-family:var(--font-display)] text-[16px] xs:text-[18px] sm:text-[20px] font-normal text-black">
                            {item.name}
                          </h3>
                          <p className="[font-family:var(--font-ui)] text-[14px] xs:text-[16px] font-medium text-black">
                            AED {item.price.toFixed(2)}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            onClick={() => redirectToDetail(item)}
                            className="flex items-center gap-2 px-4 py-2 bg-black text-white text-[10px] uppercase tracking-[0.24em] hover:bg-gray-800 transition hover:cursor-pointer"
                          >
                            <Eye size={14} />
                            View Details
                          </button>

                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-(--color-grey-muted) hover:text-red-600 transition hover:cursor-pointer"
                            aria-label="Remove from wishlist"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={clearWishlist}
                className="mt-4 text-[16px] xs:text-[14px] text-(--color-grey-muted) hover:text-black transition hover:cursor-pointer"
              >
                Clear wishlist
              </button>
            </div>
          </div>

          <ImageModal
            isOpen={imageModalOpen}
            imageUrl={selectedImage}
            alt="Wishlist Item Image"
            onClose={() => {
              setImageModalOpen(false);
              setSelectedImage("");
            }}
          />
        </div>
      </FadeInSection>
    </MainLayout>
  );
}
