"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useInView,
} from "framer-motion";
import { fabrics } from "../shared/fabricData";

interface FabricDetailsProps {
  product: {
    id: number;
    name: string;
    price: number;
    category: string;
    color: string;
    material: string;
    inStock: boolean;
    image: string;
    description: string;
    origin: string;
    careInstructions?: string[];
    weight?: string;
    width?: string;
    certifications?: string[];
  };
  onBack?: () => void;
}

const ViewFabricDetails = ({ product }: FabricDetailsProps) => {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState("meter");
  const [activeImage, setActiveImage] = useState(0);
  const [showStickyCart, setShowStickyCart] = useState(false);
  // Initialize as empty array to avoid errors
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);

  const images = [product.image, product.image, product.image, product.image];

  // Magnifier
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [magnifierPos, setMagnifierPos] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLDivElement>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.2]);

  useEffect(() => {
    const handleScroll = () => setShowStickyCart(window.scrollY > 600);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fallback: fetch related products or use local data
  useEffect(() => {
    // If the `fabrics` import is available, you can uncomment the next line and remove the fetch.
    setRelatedProducts(fabrics.slice(0, 4));

    // Otherwise, fetch from API (comment out if not available)
    fetch("/api/fabrics?limit=4")
      .then((res) => res.json())
      .then((data) => setRelatedProducts(data.slice(0, 4)))
      .catch(() => {
        // If fetch fails, fallback to empty array (already empty)
      });
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!imageRef.current) return;
    const { left, top, width, height } =
      imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setMagnifierPos({ x, y });
    setShowMagnifier(true);
  };

  const handleMouseLeave = () => setShowMagnifier(false);

  const detailsRef = useRef(null);
  const detailsInView = useInView(detailsRef, { once: true, margin: "-100px" });

  const handleAddToCart = () => {
    console.log("Added to cart:", { ...product, quantity, selectedSize });
  };

  const handleRequestSample = () => {
    console.log("Sample requested for:", product.name);
  };

  const colorMap: Record<string, string> = {
    gold: "#C9A96E",
    black: "#1A1A18",
    ivory: "#F5F0E8",
    white: "#FFFFFF",
    navy: "#1B2A4A",
  };

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[#FFFDF9] antialiased selection:bg-black/10"
    >
      {/* Main content with outer spacing */}
      <div className="pt-20 pb-8 sm:pb-10 lg:pb-12">
        {/* DESKTOP: two columns with left/right outer padding */}
        <div className="hidden lg:flex max-w-screen-2xl mx-auto">
          {/* Left: Sticky image column (spacing from left edge) */}
          <div className="w-[55%] h-screen sticky top-0 pl-8 xl:pl-12 flex items-center">
            <div className="relative w-full h-[calc(100vh-8rem)] bg-[#F5F4F0] overflow-hidden rounded-sm">
              <motion.div
                style={{ scale: heroScale, opacity: heroOpacity }}
                className="relative w-full h-full"
              >
                <div
                  ref={imageRef}
                  className="relative w-full h-full cursor-crosshair"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                >
                  <img
                    src={images[activeImage]}
                    alt={product.name}
                    className="w-full h-full object-cover transition-opacity duration-700"
                  />
                  <AnimatePresence>
                    {showMagnifier && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute pointer-events-none w-48 h-48 rounded-full border-2 border-white/60 shadow-2xl overflow-hidden"
                        style={{
                          left: `${magnifierPos.x}%`,
                          top: `${magnifierPos.y}%`,
                          transform: "translate(-50%, -50%)",
                          backgroundImage: `url(${images[activeImage]})`,
                          backgroundSize: "200%",
                          backgroundPosition: `${magnifierPos.x}% ${magnifierPos.y}%`,
                        }}
                      />
                    )}
                  </AnimatePresence>
                </div>
                {/* Badges */}
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="text-[9px] tracking-[0.2em] uppercase bg-black/80 text-white px-4 py-1.5 backdrop-blur-sm">
                    {product.inStock ? "In Stock" : "Sold Out"}
                  </span>
                  {product.certifications?.includes("GOTS") && (
                    <span className="text-[9px] tracking-[0.2em] uppercase bg-white/80 text-black px-4 py-1.5 backdrop-blur-sm">
                      Organic
                    </span>
                  )}
                </div>
              </motion.div>

              {/* Thumbnails */}
              <div className="absolute bottom-4 left-4 right-4 flex gap-3 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(idx)}
                    className={`w-20 h-20 shrink-0 overflow-hidden border-2 transition-all duration-300 ${
                      idx === activeImage
                        ? "border-black shadow-lg scale-105"
                        : "border-white/30 hover:border-white/70"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`View ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Scrollable details (spacing from right edge) */}
          <div className="w-[45%] bg-[#FFFDF9] pr-8 xl:pr-12 pl-12 py-16">
            <motion.div
              ref={detailsRef}
              initial={{ opacity: 0, y: 40 }}
              animate={detailsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
              className="space-y-10 max-w-lg"
            >
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-[#5A5A56]">
                <Link href="/fabrics" className="hover:text-black transition">
                  Fabrics
                </Link>
                <span>/</span>
                <span className="text-black font-medium">
                  {product.category}
                </span>
              </div>

              {/* Title & Price */}
              <div>
                <h1 className="font-serif text-4xl xl:text-5xl font-light tracking-tight text-black leading-tight mb-5">
                  {product.name}
                </h1>
                <div className="flex items-baseline gap-4">
                  <span className="text-3xl xl:text-4xl font-mono text-black">
                    AED {product.price.toLocaleString()}
                  </span>
                  <span className="text-sm text-[#5A5A56] font-mono">
                    per meter
                  </span>
                </div>
              </div>

              {/* Color swatches */}
              <div className="space-y-3">
                <span className="text-[10px] tracking-[0.2em] uppercase text-[#5A5A56]">
                  Color
                </span>
                <div className="flex gap-3">
                  {Object.entries(colorMap).map(([colorName, hex]) => (
                    <button
                      key={colorName}
                      className={`w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                        product.color.toLowerCase() === colorName
                          ? "border-black scale-110 shadow-md"
                          : "border-[#E8E8E4] hover:border-black/30"
                      }`}
                      style={{ backgroundColor: hex }}
                      aria-label={colorName}
                    />
                  ))}
                </div>
              </div>

              {/* Description */}
              <p className="text-base text-[#5A5A56] leading-relaxed font-light">
                {product.description}
              </p>

              {/* Attributes grid */}
              <div className="grid grid-cols-2 gap-6 py-6 border-t border-b border-[#E8E8E4]">
                <div>
                  <span className="text-[10px] tracking-[0.2em] uppercase text-[#5A5A56]">
                    Material
                  </span>
                  <p className="text-base text-black mt-1">
                    {product.material}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] tracking-[0.2em] uppercase text-[#5A5A56]">
                    Origin
                  </span>
                  <p className="text-base text-black mt-1">{product.origin}</p>
                </div>
                <div>
                  <span className="text-[10px] tracking-[0.2em] uppercase text-[#5A5A56]">
                    Weight
                  </span>
                  <p className="text-base text-black mt-1">
                    {product.weight || "250 gsm"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] tracking-[0.2em] uppercase text-[#5A5A56]">
                    Width
                  </span>
                  <p className="text-base text-black mt-1">
                    {product.width || "140 cm"}
                  </p>
                </div>
              </div>

              {/* Quantity & Size */}
              <div className="flex items-center gap-6">
                <div className="flex items-center border border-[#D1D1C8]">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-3 hover:bg-[#F2F2F0] transition"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M20 12H4"
                      />
                    </svg>
                  </button>
                  <span className="w-12 text-center text-base font-mono">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-4 py-3 hover:bg-[#F2F2F0] transition"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </button>
                </div>
                <select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="text-sm font-mono bg-transparent border border-[#D1D1C8] px-4 py-3 focus:outline-none cursor-pointer"
                >
                  <option value="meter">Meter</option>
                  <option value="yard">Yard</option>
                  <option value="sample">Sample (30cm)</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddToCart}
                  disabled={!product.inStock}
                  className="w-full py-4 bg-black text-white text-sm tracking-[0.22em] uppercase font-medium hover:bg-[#1A1A1A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add to Cart — AED{" "}
                  {(product.price * quantity).toLocaleString()}
                </motion.button>
                <div className="flex gap-3">
                  <button
                    onClick={handleRequestSample}
                    disabled={!product.inStock}
                    className="flex-1 py-4 border border-black text-sm tracking-[0.2em] uppercase font-medium hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Request Sample
                  </button>
                  <button className="py-4 px-5 border border-[#E8E8E4] hover:border-black transition-colors">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Accordions */}
              <div className="border-t border-[#E8E8E4] pt-6 space-y-4">
                <Accordion title="Care Instructions">
                  <div className="flex flex-wrap gap-2">
                    {(product.careInstructions?.length
                      ? product.careInstructions
                      : ["Dry Clean Only", "Do Not Bleach", "Iron Low Heat"]
                    ).map((care, i) => (
                      <span
                        key={i}
                        className="text-xs text-[#5A5A56] bg-[#F2F2F0] px-3 py-1.5"
                      >
                        {care}
                      </span>
                    ))}
                  </div>
                </Accordion>
                <Accordion title="Shipping & Returns">
                  <ul className="text-sm text-[#5A5A56] space-y-2">
                    <li>Free shipping on orders over AED 500</li>
                    <li>Delivery within 3-5 business days</li>
                    <li>30-day return policy</li>
                  </ul>
                </Accordion>
                <Accordion title="Certifications">
                  <div className="flex gap-4">
                    {(product.certifications?.length
                      ? product.certifications
                      : ["OEKO-TEX", "GOTS"]
                    ).map((cert, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-green-700"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span className="text-xs font-mono text-[#5A5A56]">
                          {cert}
                        </span>
                      </div>
                    ))}
                  </div>
                </Accordion>
              </div>
            </motion.div>
          </div>
        </div>

        {/* MOBILE & TABLET */}
        <div className="lg:hidden max-w-screen-2xl mx-auto px-4 sm:px-6 md:px-8">
          {/* Hero image */}
          <div className="relative w-full h-[60vh] sm:h-[70vh] bg-[#F5F4F0] mb-8 rounded-sm overflow-hidden">
            <motion.img
              src={images[activeImage]}
              alt={product.name}
              className="w-full h-full object-cover"
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.8 }}
            />
            <div className="absolute top-4 left-4 flex gap-2">
              <span className="text-[9px] tracking-[0.2em] uppercase bg-black/80 text-white px-4 py-1.5 backdrop-blur-sm">
                {product.inStock ? "In Stock" : "Sold Out"}
              </span>
            </div>
            <div className="absolute bottom-4 left-4 right-4 flex gap-2 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`w-16 h-16 shrink-0 overflow-hidden border-2 transition ${
                    idx === activeImage ? "border-black" : "border-white/50"
                  }`}
                >
                  <img
                    src={img}
                    alt={`View ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8 pb-8"
          >
            <div className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-[#5A5A56]">
              <Link href="/fabrics" className="hover:text-black">
                Fabrics
              </Link>
              <span>/</span>
              <span className="text-black">{product.category}</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-light tracking-tight text-black">
              {product.name}
            </h1>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl sm:text-3xl font-mono">
                AED {product.price.toLocaleString()}
              </span>
              <span className="text-sm text-[#5A5A56]">per meter</span>
            </div>
            <div className="flex gap-3">
              {Object.entries(colorMap).map(([colorName, hex]) => (
                <button
                  key={colorName}
                  className={`w-10 h-10 rounded-full border-2 transition ${
                    product.color.toLowerCase() === colorName
                      ? "border-black scale-110"
                      : "border-[#E8E8E4]"
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
            <p className="text-base text-[#5A5A56] leading-relaxed">
              {product.description}
            </p>
            <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-[#E8E8E4] text-sm">
              <div>
                <span className="text-[10px] uppercase text-[#5A5A56]">
                  Material
                </span>
                <p className="text-black">{product.material}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase text-[#5A5A56]">
                  Origin
                </span>
                <p className="text-black">{product.origin}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase text-[#5A5A56]">
                  Weight
                </span>
                <p className="text-black">{product.weight || "250 gsm"}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase text-[#5A5A56]">
                  Width
                </span>
                <p className="text-black">{product.width || "140 cm"}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-[#D1D1C8]">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-2"
                >
                  -
                </button>
                <span className="w-10 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 py-2"
                >
                  +
                </button>
              </div>
              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                className="border border-[#D1D1C8] px-3 py-2 text-sm"
              >
                <option value="meter">Meter</option>
                <option value="yard">Yard</option>
                <option value="sample">Sample (30cm)</option>
              </select>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={!product.inStock}
              className="w-full py-4 bg-black text-white text-sm tracking-[0.2em] uppercase disabled:opacity-50"
            >
              Add to Cart — AED {(product.price * quantity).toLocaleString()}
            </button>
            <button
              onClick={handleRequestSample}
              className="w-full py-4 border border-black text-sm tracking-[0.2em] uppercase"
            >
              Request Sample
            </button>
            <Accordion title="Care Instructions">
              <div className="flex flex-wrap gap-2">
                {(product.careInstructions?.length
                  ? product.careInstructions
                  : ["Dry Clean Only"]
                ).map((c, i) => (
                  <span key={i} className="text-xs bg-[#F2F2F0] px-3 py-1">
                    {c}
                  </span>
                ))}
              </div>
            </Accordion>
            <Accordion title="Shipping & Returns">
              <p className="text-sm text-[#5A5A56]">
                Free shipping over AED 500. 30-day returns.
              </p>
            </Accordion>
          </motion.div>
        </div>
      </div>

      {/* Sticky Add to Cart bar (mobile & tablet) */}
      <AnimatePresence>
        {showStickyCart && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-[#FFFDF9] border-t border-[#E8E8E4] px-4 sm:px-6 py-4 flex items-center justify-between"
          >
            <div>
              <p className="text-sm font-medium text-black truncate max-w-45">
                {product.name}
              </p>
              <p className="text-xs text-[#5A5A56]">
                AED {product.price.toLocaleString()} /m
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleAddToCart}
              disabled={!product.inStock}
              className="px-6 py-3 bg-black text-white text-xs tracking-[0.15em] uppercase font-medium disabled:opacity-50"
            >
              Add to Cart
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Related Products Section (fixed Tailwind class) */}
      <section className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-16 lg:py-20 border-t border-[#E8E8E4]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6 }}
          className="space-y-10"
        >
          <div className="flex items-center gap-3">
            <span className="block w-8 h-px bg-black/20"></span>
            <h2 className="text-xs tracking-[0.3em] uppercase text-black/40 font-medium">
              You May Also Like
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {relatedProducts.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="group cursor-pointer"
              >
                <Link href={`/fabrics/${item.id}`} className="block space-y-4">
                  <div className="relative aspect-3/4 bg-[#F2F2F0] overflow-hidden rounded-sm">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          console.log("Quick add:", item.name);
                        }}
                        className="bg-white text-black text-[10px] tracking-[0.15em] uppercase font-medium px-5 py-2 hover:bg-black hover:text-white transition-colors"
                      >
                        Quick Add
                      </button>
                    </div>
                    {!item.inStock && (
                      <div className="absolute top-3 left-3 bg-black/70 text-white text-[9px] tracking-[0.2em] uppercase px-3 py-1">
                        Sold Out
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-[#5A5A56] uppercase tracking-[0.15em]">
                      {item.material}
                    </p>
                    <h3 className="text-sm font-serif font-light text-black truncate">
                      {item.name}
                    </h3>
                    <p className="text-sm font-mono text-black">
                      AED {item.price.toLocaleString()}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>
    </div>
  );
};

/* Accordion component */
const Accordion = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-[#E8E8E4] py-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-xs tracking-[0.15em] uppercase font-medium text-black"
      >
        {title}
        <motion.svg
          animate={{ rotate: isOpen ? 180 : 0 }}
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </motion.svg>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ViewFabricDetails;
