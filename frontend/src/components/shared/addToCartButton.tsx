"use client";

import { ShoppingBag } from "lucide-react";
import { useParams } from "next/navigation";
import { useCart, type CartItem } from "@/context/CartContext";

export type AddToCartProduct = Omit<CartItem, "quantity" | "maxStock"> & {
  maxStock: number;
};

type AddToCartButtonProps = {
  item: AddToCartProduct;
  className?: string;
  iconClassName?: string;
  inline?: boolean;
};

export default function AddToCartButton({
  item,
  className = "",
  iconClassName = "",
  inline = false,
}: AddToCartButtonProps) {
  const params = useParams();
  const isAr = params.locale === "ar";
  const { addItem, items } = useCart();
  const inCart = items.some((p) => p.id === item.id);
  const outOfStock = !Number.isFinite(item.maxStock) || item.maxStock < 1;
  const iconSizeClass = iconClassName ? "" : "w-5 h-5";
  const label = outOfStock
    ? isAr
      ? "نفذت الكمية"
      : "Sold out"
    : isAr
      ? "أضف للسلة"
      : "Add to Cart";

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    addItem({
      ...item,
      quantity: 1,
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={outOfStock}
      aria-label={label}
      className={`${
        inline ? "relative z-10" : "absolute top-2 right-2 z-10"
      } ${
        inline ? "" : "p-1.5"
      } rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:scale-110 transition-transform hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${className}`}
    >
      <ShoppingBag
        className={`${iconSizeClass} transition-colors ${iconClassName} ${
          inCart
            ? "fill-black stroke-black"
            : "stroke-black fill-none"
        }`}
      />
    </button>
  );
}
