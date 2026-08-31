"use client";

import { Heart } from "lucide-react";
import { useWishlist, type WishlistItem } from "@/context/WishlistContext";
import React from "react";

type WishlistButtonProps = {
  item: WishlistItem;
  className?: string;
  iconClassName?: string;
  inline?: boolean;
};

export default function WishlistButton({
  item,
  className = "",
  iconClassName = "",
  inline = false,
}: WishlistButtonProps) {
  const { isInWishlist, toggleItem } = useWishlist();
  const inWishlist = isInWishlist(item.id);
  const iconSizeClass = iconClassName ? "" : "w-5 h-5";

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      toggleItem?.(item);
    } catch {
      // Wishlist toggle failed silently in UI
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`${
        inline ? "relative z-10" : "absolute top-2 right-2 z-10"
      } ${
        inline ? "" : "p-1.5"
      } rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:scale-110 transition-transform ${className} hover:cursor-pointer`}
      aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
    >
      <Heart
        className={`${iconSizeClass} transition-colors ${iconClassName} ${
          inWishlist ? "fill-red-500 stroke-red-500" : "stroke-black fill-none"
        }`}
      />
    </button>
  );
}
