// components/shared/ZoomImageEffect.tsx

"use client";

import { useEffect, useRef, useState } from "react";

interface ZoomImageEffectProps {
  src: string;
  alt?: string;
  className?: string;
  lensSize?: number;
  zoomLevel?: number;
}

export default function ZoomImageEffect({
  src,
  alt = "Image",
  className = "w-full h-auto",
  lensSize = 80,
  zoomLevel = 2.5,
}: ZoomImageEffectProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [imageDimensions, setImageDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [isMounted, setIsMounted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (imageRef.current && isMounted) {
      const updateDimensions = () => {
        const rect = imageRef.current?.getBoundingClientRect();
        if (rect) {
          setImageDimensions({ width: rect.width, height: rect.height });
        }
      };
      updateDimensions();
      window.addEventListener("resize", updateDimensions);
      return () => window.removeEventListener("resize", updateDimensions);
    }
  }, [src, isMounted]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!imageRef.current || !containerRef.current || !isMounted) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const lensX = Math.min(
      Math.max(x - lensSize / 2, 0),
      imageDimensions.width - lensSize,
    );
    const lensY = Math.min(
      Math.max(y - lensSize / 2, 0),
      imageDimensions.height - lensSize,
    );

    setPosition({ x: lensX, y: lensY });
  };

  const handleMouseEnter = () => {
    if (!isMounted) return;
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setPosition(null);
  };

  const lensScale = 1.5;
  const scaledLensSize = lensSize * lensScale;

  // CRITICAL: Only render after mount and with valid position
  const shouldShowLens =
    isMounted && isHovering && position !== null && imageDimensions.width > 0;

  return (
    <div
      ref={containerRef}
      className="relative inline-block w-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        className={className}
        draggable={false}
      />

      {shouldShowLens && (
        <div
          className="absolute border-2 border-white/80 rounded-full shadow-2xl pointer-events-none"
          style={{
            width: scaledLensSize,
            height: scaledLensSize,
            left: position.x - (scaledLensSize - lensSize) / 2,
            top: position.y - (scaledLensSize - lensSize) / 2,
            backgroundImage: `url(${src})`,
            backgroundSize: `${imageDimensions.width * zoomLevel}px ${imageDimensions.height * zoomLevel}px`,
            backgroundPosition: `-${position.x * zoomLevel}px -${position.y * zoomLevel}px`,
            backgroundRepeat: "no-repeat",
            boxShadow: "0 0 30px rgba(0,0,0,0.5)",
            borderColor: "rgba(255,255,255,0.9)",
          }}
        />
      )}
    </div>
  );
}
