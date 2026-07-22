"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface ImageModalProps {
  isOpen: boolean;
  imageUrl: string;
  alt?: string;
  onClose: () => void;
}

export function ImageModal({
  isOpen,
  imageUrl,
  alt = "Image",
  onClose,
}: ImageModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-2 sm:p-4 md:p-6 animate-in fade-in duration-300 cursor-pointer"
      onClick={onClose}
    >
      <div className="relative flex items-center justify-center w-full h-full cursor-default">
        {/* Close button - responsive */}
        <button
          onClick={onClose}
          className="absolute z-10 text-white/70 hover:text-white bg-black/50 hover:bg-black/70 rounded-full transition-all duration-200 backdrop-blur-sm border border-white/10 hover:scale-110 hover:cursor-pointer top-2 right-2 sm:top-3 sm:right-3 md:top-4 md:right-4 p-1.5 sm:p-2 md:p-2.5 [&_svg]:w-4 [&_svg]:h-4 sm:[&_svg]:w-5 sm:[&_svg]:h-5 md:[&_svg]:w-6 md:[&_svg]:h-6"
          aria-label="Close"
        >
          <X />
        </button>

        {/* Image container */}
        <div className="relative flex items-center justify-center w-full h-full">
          <img
            src={imageUrl}
            alt={alt}
            className="w-auto h-auto max-w-[92vw] sm:max-w-[95vw] max-h-[85vh] sm:max-h-[90vh] object-contain rounded-xl sm:rounded-2xl shadow-2xl transition-all duration-300"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Image name - optional bottom bar */}
          <div className="absolute -bottom-8 sm:-bottom-10 left-0 right-0 text-center">
            <p className="text-white/40 text-[10px] sm:text-xs font-light truncate max-w-[80%] mx-auto">
              {alt}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
