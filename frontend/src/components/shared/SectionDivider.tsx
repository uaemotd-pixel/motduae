"use client";

import * as images from "../../../public/images/ImageIndex";

type DividerVariant = 1 | 2 | 3;

interface SectionDividerProps {
  variant?: DividerVariant;
  className?: string;
}

export default function SectionDivider({
  variant = 2,
  className = "",
}: SectionDividerProps) {
  const divider = {
    1: images.element_1.src,
    2: images.element_2.src,
    3: images.element_3.src,
  }[variant];

  return (
    <div
      className={`relative flex items-center justify-center py-16 px-6 overflow-hidden ${className}`}
    >
      {/* Left Line */}
      <div className="h-px flex-1 max-w-48 bg-black" />

      {/* Center Decoration */}
      <div className="mx-8 flex items-center justify-center">
        <img
          src={divider}
          alt=""
          aria-hidden
          draggable={false}
          className="w-12 md:w-14 animate-divider select-none pointer-events-none brightness-0"
        />
      </div>

      {/* Right Line */}
      <div className="h-px flex-1 max-w-48 bg-black" />

      {/* Animation */}
      <style jsx>{`
        @keyframes dividerBreath {
          0%,
          100% {
            transform: translateY(0) scale(1);
          }

          50% {
            transform: translateY(-2px) scale(1.05);
          }
        }

        .animate-divider {
          animation: dividerBreath 5s ease-in-out infinite;
          will-change: transform;
        }
      `}</style>
    </div>
  );
}
