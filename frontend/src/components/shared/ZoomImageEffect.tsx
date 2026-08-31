"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  lensSize = 120,
  zoomLevel = 3,
}: ZoomImageEffectProps) {
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const zoomImgRef = useRef<HTMLImageElement>(null);

  const updateLens = useCallback(
    (clientX: number, clientY: number) => {
      const img = imageRef.current;
      const lens = lensRef.current;
      const zoomImg = zoomImgRef.current;
      if (!img || !lens || !zoomImg) return;

      const rect = img.getBoundingClientRect();
      const natW = img.naturalWidth;
      const natH = img.naturalHeight;
      if (rect.width <= 0 || rect.height <= 0 || !natW || !natH) return;

      const mx = clientX - rect.left;
      const my = clientY - rect.top;

      const ratioX = natW / rect.width;
      const ratioY = natH / rect.height;
      const effectiveZoom = Math.min(zoomLevel, ratioX, ratioY);
      const atNativeResolution =
        Math.abs(effectiveZoom - ratioX) < 0.001 &&
        Math.abs(effectiveZoom - ratioY) < 0.001;

      const lensX = Math.round(
        Math.min(Math.max(mx - lensSize / 2, 0), rect.width - lensSize),
      );
      const lensY = Math.round(
        Math.min(Math.max(my - lensSize / 2, 0), rect.height - lensSize),
      );

      let zoomW: number;
      let zoomH: number;
      let offsetX: number;
      let offsetY: number;

      if (atNativeResolution) {
        zoomW = natW;
        zoomH = natH;
        offsetX = Math.round(
          Math.min(
            Math.max((mx / rect.width) * natW - lensSize / 2, 0),
            natW - lensSize,
          ),
        );
        offsetY = Math.round(
          Math.min(
            Math.max((my / rect.height) * natH - lensSize / 2, 0),
            natH - lensSize,
          ),
        );
      } else {
        zoomW = Math.round(rect.width * effectiveZoom);
        zoomH = Math.round(rect.height * effectiveZoom);
        offsetX = Math.round(
          Math.min(
            Math.max(mx * effectiveZoom - lensSize / 2, 0),
            zoomW - lensSize,
          ),
        );
        offsetY = Math.round(
          Math.min(
            Math.max(my * effectiveZoom - lensSize / 2, 0),
            zoomH - lensSize,
          ),
        );
      }

      lens.style.left = `${lensX}px`;
      lens.style.top = `${lensY}px`;

      zoomImg.style.width = `${zoomW}px`;
      zoomImg.style.height = `${zoomH}px`;
      zoomImg.style.left = `-${offsetX}px`;
      zoomImg.style.top = `-${offsetY}px`;
    },
    [lensSize, zoomLevel],
  );

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isHovering) return;
    updateLens(e.clientX, e.clientY);
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    setIsHovering(true);
    requestAnimationFrame(() => updateLens(e.clientX, e.clientY));
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  const handleImageLoad = () => {
    if (isHovering && imageRef.current && containerRef.current) {
      const rect = imageRef.current.getBoundingClientRect();
      const event = new MouseEvent("mousemove", {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      });
      updateLens(event.clientX, event.clientY);
    }
  };

  useEffect(() => {
    const zoomImg = zoomImgRef.current;
    if (!zoomImg) return;

    const syncIntrinsicSize = () => {
      const img = imageRef.current;
      if (!img?.naturalWidth || !img.naturalHeight) return;
      zoomImg.width = img.naturalWidth;
      zoomImg.height = img.naturalHeight;
    };

    syncIntrinsicSize();
    const img = imageRef.current;
    img?.addEventListener("load", syncIntrinsicSize);
    return () => img?.removeEventListener("load", syncIntrinsicSize);
  }, [src]);

  useEffect(() => {
    const img = imageRef.current;
    if (!img) return;

    const observer = new ResizeObserver(() => {
      if (!isHovering || !containerRef.current) return;
      const rect = img.getBoundingClientRect();
      updateLens(rect.left + rect.width / 2, rect.top + rect.height / 2);
    });

    observer.observe(img);
    return () => observer.disconnect();
  }, [isHovering, src, updateLens]);

  return (
    <div
      ref={containerRef}
      className="relative inline-block w-full select-none cursor-crosshair"
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
        onLoad={handleImageLoad}
      />

      <div
        ref={lensRef}
        className="absolute overflow-hidden rounded-full border border-white pointer-events-none"
        style={{
          width: lensSize,
          height: lensSize,
          display: isHovering ? "block" : "none",
          boxShadow: "0 0 20px rgba(0, 0, 0, 0.4)",
        }}
      >
        <img
          ref={zoomImgRef}
          src={src}
          alt=""
          aria-hidden
          draggable={false}
          loading="eager"
          fetchPriority="high"
          className="absolute max-w-none max-h-none"
          style={{
            left: 0,
            top: 0,
          }}
        />
      </div>
    </div>
  );
}
