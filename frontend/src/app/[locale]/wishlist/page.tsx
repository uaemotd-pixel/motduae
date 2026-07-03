"use client";

import { Link } from "@/i18n/navigation";
import { Heart, Trash2, Plus, Minus, ArrowLeft } from "lucide-react";
import MainLayout from "../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";
import { useWishlist } from "@/context/WishlistContext";

export default function WishlistPage() {
  const { wishItems, removeItem, clearWishlist, updateQuantity } =
    useWishlist();

  // Buy Now (single item)
  const handleBuyNow = (item: any) => {
    console.log("Buy Now button is clicked");
  };

  // Buy All
  const handleBuyAll = () => {
    console.log("Buy All Clicked");
  };

  // Totals – now using item.quantity directly
  const totalItems = wishItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = wishItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const vat = subtotal * 0.05;
  const total = subtotal + vat;

  // Empty state
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
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-8 xs:mb-10 md:mb-12">
              <div>
                <h1 className="[font-family:var(--font-display)] text-[32px] xs:text-[36px] sm:text-[40px] md:text-[44px] lg:text-[48px] font-normal leading-[1.1] tracking-[-0.01em] text-black">
                  My Wishlist
                </h1>
                <p className="[font-family:var(--font-ui)] text-[9px] xs:text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) mt-2">
                  {totalItems} {totalItems === 1 ? "item" : "items"}
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

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 xs:gap-10 md:gap-12">
              {/* Items list */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-(--bg-page) border border-(--color-border) rounded-lg overflow-hidden divide-y divide-(--color-border)">
                  {wishItems.map((item) => {
                    // Use item.quantity directly
                    return (
                      <div
                        key={`${item.id}`} // use type to avoid duplicate keys
                        className="p-4 xs:p-5 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-6"
                      >
                        {/* Image */}
                        <div className="w-full sm:w-28 h-28 bg-[#F5F5F0] rounded-md overflow-hidden shrink-0">
                          <img
                            src={item.image || "/placeholder.png"}
                            alt={item.name}
                            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                          />
                        </div>

                        {/* Details */}
                        <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="space-y-1">
                            <h3 className="[font-family:var(--font-display)] text-[16px] xs:text-[18px] sm:text-[20px] font-normal text-black">
                              {item.name}
                            </h3>
                            <p className="[font-family:var(--font-ui)] text-[14px] xs:text-[16px] font-medium text-black">
                              AED {item.price.toFixed(2)}
                            </p>
                          </div>

                          {/* Quantity & Actions */}
                          <div className="flex flex-wrap items-center gap-3">
                            {/* Quantity selector */}
                            <div className="flex items-center border border-(--color-border) rounded-md">
                              <button
                                onClick={() => {
                                  if (item.quantity > 1)
                                    updateQuantity(item.id, item.quantity - 1);
                                }}
                                disabled={item.quantity <= 1}
                                className="px-2 py-1.5 disabled:opacity-40 hover:bg-black/5 transition hover:cursor-pointer"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="w-8 text-center font-ui text-sm">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  updateQuantity(item.id, item.quantity + 1)
                                }
                                // only disable when maxStock is known and reached
                                disabled={
                                  item.maxStock != null &&
                                  item.quantity >= item.maxStock
                                }
                                className="px-2 py-1.5 disabled:opacity-40 hover:bg-black/5 transition hover:cursor-pointer"
                              >
                                <Plus size={14} />
                              </button>
                            </div>

                            {/* Buy Now */}
                            <button
                              onClick={() => handleBuyNow(item)}
                              className="px-3 py-1.5 bg-black text-white text-[10px] uppercase tracking-[0.24em] hover:bg-gray-800 transition hover:cursor-pointer"
                            >
                              Buy Now
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

                        {/* Item total (desktop) */}
                        <div className="hidden sm:block text-right min-w-20">
                          <p className="[font-family:var(--font-ui)] text-[14px] xs:text-[16px] font-medium text-black">
                            AED {(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={clearWishlist}
                  className="text-[16px] xs:text-[14px] text-(--color-grey-muted) hover:text-black transition hover:cursor-pointer"
                >
                  Clear wishlist
                </button>
              </div>

              {/* Order Summary */}
              <div className="lg:sticky lg:top-24 h-fit">
                <div className="bg-(--bg-page) border border-(--color-border) rounded-lg p-5 xs:p-6 md:p-8">
                  <h2 className="[font-family:var(--font-display)] text-[22px] xs:text-[24px] sm:text-[26px] font-normal text-black mb-6">
                    Order Summary
                  </h2>
                  <div className="space-y-3 border-b border-(--color-border) pb-5 mb-5">
                    <div className="flex justify-between [font-family:var(--font-ui)] text-[13px] xs:text-[14px]">
                      <span className="text-(--color-grey-muted)">
                        Subtotal
                      </span>
                      <span className="text-black">
                        AED {subtotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between [font-family:var(--font-ui)] text-[13px] xs:text-[14px]">
                      <span className="text-(--color-grey-muted)">
                        VAT (5%)
                      </span>
                      <span className="text-black">AED {vat.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between [font-family:var(--font-ui)] text-[16px] xs:text-[18px] font-normal mb-8">
                    <span>Total</span>
                    <span>AED {total.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={handleBuyAll}
                    disabled={wishItems.length === 0}
                    className="w-full h-12 md:h-13 bg-black text-white font-label-sm text-[12px] md:text-[13px] uppercase tracking-[0.25em] hover:bg-black/80 transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
                  >
                    Buy All ({totalItems} items)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </FadeInSection>
    </MainLayout>
  );
}
