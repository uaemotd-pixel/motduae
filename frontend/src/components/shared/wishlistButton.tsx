"use client";

import { Heart } from "lucide-react";
import { useWishlist, type WishlistItem } from "@/context/WishlistContext";
import React from "react";

type WishlistButtonProps = {
  item: WishlistItem;
  className?: string;
};

export default function WishlistButton({
  item,
  className = "",
}: WishlistButtonProps) {
  const { isInWishlist, toggleItem } = useWishlist();
  const inWishlist = isInWishlist(item.id);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      toggleItem?.(item);
    } catch (error) {
      console.log(`Failed to update wishlist`);
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:scale-110 transition-transform ${className} hover:cursor-pointer`}
      aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
    >
      <Heart
        className={`w-5 h-5 transition-colors ${
          inWishlist ? "fill-red-500 stroke-red-500" : "stroke-black fill-none"
        }`}
      />
    </button>
  );
}
