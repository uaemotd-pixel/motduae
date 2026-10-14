"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useParams } from "next/navigation";
import MainLayout from "../main/layout";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Minus,
  Search,
  Sparkles,
  Scissors,
  Ruler,
  ShoppingBag,
  Truck,
  CreditCard,
  ChevronRight,
  ArrowDown,
} from "lucide-react";

import { GUIDE_FAQ_ITEMS } from "@/data/motdFaqs";

const DEFAULT_PAGE_SIZE = 5;
const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100] as const;
const EASE = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE },
  },
};

const fadeIn = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.5, ease: EASE },
  },
};

const stagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

const SectionReveal = ({
  children,
  className = "",
  sectionRef,
}: {
  children: React.ReactNode;
  className?: string;
  sectionRef?: React.RefObject<HTMLElement | null>;
}) => {
  return (
    <motion.section
      ref={sectionRef as React.Ref<HTMLElement>}
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -48px 0px", amount: 0.12 }}
      variants={stagger}
    >
      {children}
    </motion.section>
  );
};

/** Soft geometric accents — quiet, not decorative noise */
function GuideShapes({ variant = "hero" }: { variant?: "hero" | "section" }) {
  if (variant === "section") {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -end-8 top-10 h-24 w-24 rotate-12 border border-black/6" />
        <div className="absolute -start-6 bottom-8 h-16 w-16 rounded-full border border-black/5" />
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <motion.div
        className="absolute -top-16 end-[8%] h-48 w-48 rounded-full border border-black/[0.06]"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: EASE }}
      />
      <motion.div
        className="absolute top-[28%] -start-10 h-32 w-32 rotate-45 border border-black/[0.05]"
        initial={{ opacity: 0, rotate: 30 }}
        animate={{ opacity: 1, rotate: 45 }}
        transition={{ duration: 1.2, delay: 0.15, ease: EASE }}
      />
      <motion.div
        className="absolute bottom-8 end-[18%] h-2 w-2 rounded-full bg-black/15"
        animate={{ y: [0, -6, 0], opacity: [0.35, 0.7, 0.35] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_12%,rgba(0,0,0,0.035),transparent_42%)]" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-black/10 to-transparent" />
    </div>
  );
}

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => {
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      for (let i = 1; i <= 4; i++) pages.push(i);
      pages.push("...");
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1);
      pages.push("...");
      for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push("...");
      for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
      pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="group relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-[#E4E0D8] bg-transparent text-black transition-all duration-200 hover:border-black hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Previous page"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      {getPageNumbers().map((page, index) => (
        <button
          key={index}
          type="button"
          onClick={() => typeof page === "number" && onPageChange(page)}
          disabled={page === "..."}
          className={`
            flex h-10 min-w-10 cursor-pointer items-center justify-center px-2 font-mono text-[13px] tracking-wide transition-all duration-200 rounded-lg
            ${
              page === currentPage
                ? "border-black bg-black text-white"
                : page === "..."
                  ? "cursor-default border-transparent text-[#8A8A80]"
                  : "border border-[#E4E0D8] bg-transparent text-black hover:border-black hover:bg-black hover:text-white"
            }
          `}
        >
          {page}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="group relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-[#E4E0D8] bg-transparent text-black transition-all duration-200 hover:border-black hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Next page"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
};

const JOURNEY_STEPS = [
  { step: 1, textEn: "Choose a Design", textAr: "اختر التصميم" },
  { step: 2, textEn: "Choose a Fabric", textAr: "اختر القماش" },
  { step: 3, textEn: "Add Measurements", textAr: "أدخل مقاساتك" },
  { step: 4, textEn: "Tailoring Begins", textAr: "بدء الخياطة" },
  { step: 5, textEn: "Quality Check", textAr: "فحص الجودة" },
  { step: 6, textEn: "Delivery to Door", textAr: "التوصيل لبابك" },
] as const;

export default function MOTDGuidePage() {
  const params = useParams();
  const locale = params.locale === "ar" ? "ar" : "en";
  const isAr = locale === "ar";

  const [searchQuery, setSearchQuery] = useState("");
  const [openIndex, setOpenIndex] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>("section-1");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  const sectionsContainerRef = useRef<HTMLElement | null>(null);
  const faqListRef = useRef<HTMLDivElement>(null);

  const SECTIONS = [
    {
      id: "section-1",
      titleEn: "Getting Started",
      titleAr: "دليل البداية",
      icon: Sparkles,
    },
    {
      id: "section-2",
      titleEn: "Creating Your Mukhawar",
      titleAr: "تفصيل المخوار",
      icon: Scissors,
    },
    {
      id: "section-3",
      titleEn: "Tailors & Measurements",
      titleAr: "الخياطون والقياسات",
      icon: Ruler,
    },
    {
      id: "section-4",
      titleEn: "Orders & Your Creation Journey",
      titleAr: "مسار طلبك وتفصيله",
      icon: ShoppingBag,
    },
    {
      id: "section-5",
      titleEn: "Delivery & Returns",
      titleAr: "التوصيل والإرجاع",
      icon: Truck,
    },
    {
      id: "section-6",
      titleEn: "Payments & Your MOTD Account",
      titleAr: "الحساب والمدفوعات",
      icon: CreditCard,
    },
  ];

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex === 1) {
      window.location.href = isAr ? "/ar/#designs" : "/en/#designs";
    } else if (stepIndex === 2) {
      window.location.href = isAr
        ? "/ar/fabrics/fabricStore"
        : "/en/fabrics/fabricStore";
    } else {
      let targetSection = "section-1";
      if (stepIndex === 3) targetSection = "section-3";
      else if (stepIndex === 4 || stepIndex === 5) targetSection = "section-4";
      else if (stepIndex === 6) targetSection = "section-5";

      setSelectedSection(targetSection);
      setSearchQuery("");
      setOpenIndex(null);
      setCurrentPage(1);

      setTimeout(() => {
        sectionsContainerRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 50);
    }
  };

  const handleSectionSelect = (sectionId: string) => {
    setSelectedSection(sectionId);
    setSearchQuery("");
    setOpenIndex(null);
    setCurrentPage(1);
    setTimeout(() => {
      faqListRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  };

  const toggleFAQ = (id: string) => {
    setOpenIndex(openIndex === id ? null : id);
  };

  const filteredFAQs = useMemo(() => {
    return GUIDE_FAQ_ITEMS.filter((item) => {
      if (item.sectionId !== selectedSection) return false;
      if (!searchQuery.trim()) return true;

      const query = searchQuery.toLowerCase();
      return isAr
        ? item.questionAr.toLowerCase().includes(query) ||
            item.answerAr.toLowerCase().includes(query)
        : item.questionEn.toLowerCase().includes(query) ||
            item.answerEn.toLowerCase().includes(query);
    });
  }, [selectedSection, searchQuery, isAr]);

  const totalPages = Math.ceil(filteredFAQs.length / itemsPerPage) || 0;
  const startIndex =
    filteredFAQs.length === 0 ? 0 : (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredFAQs.length);
  const paginatedFAQs = filteredFAQs.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
    setOpenIndex(null);
  }, [searchQuery, selectedSection, itemsPerPage]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setOpenIndex(null);
    setTimeout(() => {
      faqListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handlePageSizeChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
    setOpenIndex(null);
  };

  const activeSection = SECTIONS.find((s) => s.id === selectedSection);

  return (
    <MainLayout>
      <div className="min-h-screen bg-[#FAFAF8] text-black">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-[#E8E8E4] bg-white py-16 text-center sm:py-24">
          <GuideShapes variant="hero" />
          <motion.div
            className="relative z-10 mx-auto max-w-4xl space-y-4 px-4 sm:px-6"
            initial="hidden"
            animate="show"
            variants={stagger}
          >
            <motion.span
              variants={fadeUp}
              className="block [font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.32em] text-[#8A8A80]"
            >
              {isAr ? "دليل MOTD" : "THE MOTD GUIDE"}
            </motion.span>
            <motion.h1
              variants={fadeUp}
              className="[font-family:var(--font-display)] text-4xl font-light leading-tight tracking-tight text-black sm:text-5xl lg:text-6xl"
            >
              {isAr ? "دليل MOTD" : "The MOTD Guide"}
            </motion.h1>
            <motion.div
              variants={fadeIn}
              className="mx-auto my-3 h-px w-20 origin-center bg-black/15"
            />
            <motion.p
              variants={fadeUp}
              className="mx-auto max-w-2xl [font-family:var(--font-body)] text-[15px] font-light leading-relaxed text-[#5A5A56] sm:text-[18px]"
            >
              {isAr
                ? "كل ما تحتاج لمعرفته حول طلب وتفصيل والعناية والاستمتاع بالمخوار الخاص بك."
                : "Everything you need to know about ordering, tailoring, caring for and enjoying your Mukhawar."}
            </motion.p>
            <motion.div variants={fadeUp} className="flex justify-center pt-4">
              <motion.button
                type="button"
                onClick={() =>
                  sectionsContainerRef.current?.scrollIntoView({
                    behavior: "smooth",
                  })
                }
                className="flex cursor-pointer items-center gap-2 text-xs uppercase tracking-widest text-[#8A8A80] transition hover:text-black"
                animate={{ y: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
              >
                <span>{isAr ? "استكشف الدليل" : "Explore Guide"}</span>
                <ArrowDown className="h-3.5 w-3.5" />
              </motion.button>
            </motion.div>
          </motion.div>
        </section>

        {/* Journey */}
        <SectionReveal className="relative overflow-hidden border-b border-[#E8E8E4] bg-white py-16 sm:py-20">
          <GuideShapes variant="section" />
          <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6">
            <motion.div variants={fadeUp} className="mb-12 text-center">
              <span className="mb-2 block [font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.24em] text-[#8A8A80]">
                {isAr ? "كيف يعمل؟" : "HOW IT WORKS"}
              </span>
              <h2 className="[font-family:var(--font-display)] text-2xl font-light tracking-tight text-black sm:text-3xl">
                {isAr
                  ? "كيف تنبض مخورتك بالحياة"
                  : "How Your Mukhawar Comes to Life"}
              </h2>
              <div className="mx-auto mt-3 h-0.5 w-12 bg-black/10" />
            </motion.div>

            <div className="relative">
              {/* Desktop connector line */}
              <div
                aria-hidden
                className="pointer-events-none absolute start-[8.3%] end-[8.3%] top-[2.65rem] hidden h-px bg-gradient-to-r from-transparent via-black/12 to-transparent md:block"
              />

              <motion.div
                variants={stagger}
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-6"
              >
                {JOURNEY_STEPS.map((item) => {
                  const active = hoveredStep === item.step;
                  return (
                    <motion.div
                      key={item.step}
                      variants={fadeUp}
                      className="relative flex flex-col items-center"
                      onMouseEnter={() => setHoveredStep(item.step)}
                      onMouseLeave={() => setHoveredStep(null)}
                    >
                      <motion.button
                        type="button"
                        onClick={() => handleStepClick(item.step)}
                        whileHover={{ y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.25, ease: EASE }}
                        className="group flex h-36 w-full cursor-pointer flex-col items-center justify-between rounded-2xl border border-[#E8E8E4] bg-[#FFFDF9] p-5 text-center transition-colors duration-300 hover:border-black hover:shadow-[0_12px_28px_-18px_rgba(0,0,0,0.35)]"
                      >
                        <motion.span
                          animate={
                            active
                              ? { scale: 1.06, backgroundColor: "#000000", color: "#ffffff" }
                              : { scale: 1, backgroundColor: "rgba(0,0,0,0.05)", color: "#000000" }
                          }
                          transition={{ duration: 0.25 }}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold"
                        >
                          {item.step}
                        </motion.span>
                        <span className="mt-3 block [font-family:var(--font-display)] text-xs font-semibold uppercase leading-snug tracking-wider text-black">
                          {isAr ? item.textAr : item.textEn}
                        </span>
                        <span className="mt-2 block text-[10px] text-[#8A8A80] underline transition-colors group-hover:text-black">
                          {isAr ? "عرض التفاصيل" : "Learn details"}
                        </span>
                      </motion.button>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </div>
        </SectionReveal>

        {/* Topics + FAQs */}
        <SectionReveal
          sectionRef={sectionsContainerRef}
          className="relative mx-auto max-w-5xl space-y-16 px-4 py-16 sm:px-6 sm:py-24"
        >
          <motion.div variants={fadeUp} className="space-y-2 text-center">
            <span className="block [font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.24em] text-[#8A8A80]">
              {isAr ? "دليل المساعدة الذكي" : "SMART HELP GUIDE"}
            </span>
            <h2 className="[font-family:var(--font-display)] text-2xl font-light tracking-tight text-black sm:text-3xl">
              {isAr ? "تصفح الأسئلة حسب الموضوع" : "Browse Guide Topics"}
            </h2>
            <p className="[font-family:var(--font-body)] text-sm text-[#8A8A80]">
              {isAr
                ? "اختر أحد المواضيع الستة أدناه للاطلاع على الأسئلة والأجوبة المتعلقة به."
                : "Select one of the 6 sections below to view relevant questions."}
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3"
          >
            {SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const isSelected = selectedSection === sec.id;
              const questionsCount = GUIDE_FAQ_ITEMS.filter(
                (item) => item.sectionId === sec.id,
              ).length;

              return (
                <motion.button
                  key={sec.id}
                  type="button"
                  variants={fadeUp}
                  layout
                  onClick={() => handleSectionSelect(sec.id)}
                  whileHover={{ y: isSelected ? 0 : -3 }}
                  whileTap={{ scale: 0.985 }}
                  transition={{ duration: 0.28, ease: EASE }}
                  className={`group relative flex h-40 cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border p-5 text-start transition-colors duration-300
                    ${
                      isSelected
                        ? "border-black bg-black text-white shadow-[0_18px_40px_-24px_rgba(0,0,0,0.55)]"
                        : "border-[#E8E8E4] bg-white text-black hover:border-black hover:shadow-[0_14px_32px_-22px_rgba(0,0,0,0.3)]"
                    }`}
                >
                  {/* Shape accent */}
                  <span
                    aria-hidden
                    className={`pointer-events-none absolute -end-6 -top-6 h-20 w-20 rounded-full border transition-opacity duration-300
                      ${isSelected ? "border-white/15 opacity-100" : "border-black/5 opacity-0 group-hover:opacity-100"}`}
                  />
                  <span
                    aria-hidden
                    className={`pointer-events-none absolute -bottom-4 -start-4 h-14 w-14 rotate-12 border transition-opacity duration-300
                      ${isSelected ? "border-white/10 opacity-100" : "border-black/5 opacity-0 group-hover:opacity-70"}`}
                  />

                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full
                    ${isSelected ? "bg-white/10" : "bg-black/5"}`}
                  >
                    <Icon
                      className={`h-5 w-5 ${isSelected ? "text-white" : "text-black"}`}
                    />
                  </div>

                  <div className="mt-4 space-y-1">
                    <h3 className="[font-family:var(--font-display)] text-sm font-semibold uppercase leading-snug tracking-tight">
                      {isAr ? sec.titleAr : sec.titleEn}
                    </h3>
                    <span
                      className={`block text-[11px]
                      ${isSelected ? "text-white/60" : "text-[#8A8A80]"}`}
                    >
                      {questionsCount} {isAr ? "أسئلة" : "Questions"}
                    </span>
                  </div>

                  <ChevronRight
                    className={`absolute bottom-5 end-5 h-4 w-4 transition-all duration-300
                    ${
                      isSelected
                        ? "translate-x-0 text-white/40"
                        : "translate-x-1 text-[#8A8A80] opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                    }`}
                  />
                </motion.button>
              );
            })}
          </motion.div>

          <div
            id="sections-container"
            ref={faqListRef}
            className="mx-auto max-w-3xl space-y-8 border-t border-[#E8E8E4] pt-12"
          >
            <motion.div
              key={selectedSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="flex flex-col items-start justify-between gap-4 border-b border-[#E8E8E4] pb-4 sm:flex-row sm:items-center"
            >
              <div>
                <span className="block [font-family:var(--font-ui)] text-[10px] uppercase tracking-wider text-[#8A8A80]">
                  {isAr ? "الموضوع المحدد حالياً" : "CURRENT GUIDE TOPIC"}
                </span>
                <h3 className="[font-family:var(--font-display)] text-xl font-medium text-black">
                  {isAr ? activeSection?.titleAr : activeSection?.titleEn}
                </h3>
                <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-[#7A7A72] sm:text-[11px]">
                  {isAr
                    ? `عرض ${filteredFAQs.length === 0 ? 0 : startIndex + 1}-${endIndex} من ${filteredFAQs.length} أسئلة`
                    : `Showing ${filteredFAQs.length === 0 ? 0 : startIndex + 1}-${endIndex} of ${filteredFAQs.length} questions`}
                </span>
              </div>

              <div className="relative w-full sm:w-64">
                <div className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-[#8A8A80]">
                  <Search className="h-3.5 w-3.5" />
                </div>
                <input
                  type="text"
                  placeholder={
                    isAr ? "ابحث في هذا القسم..." : "Search inside section..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[#E8E8E4] bg-white pe-3 ps-9 text-xs text-black transition-colors [font-family:var(--font-body)] focus:border-black focus:outline-none"
                />
              </div>
            </motion.div>

            <motion.div
              layout
              className="overflow-hidden rounded-2xl border border-[#E8E8E4] bg-white shadow-sm divide-y divide-[#E8E8E4]"
            >
              <AnimatePresence mode="wait" initial={false}>
                {paginatedFAQs.length > 0 ? (
                  <motion.div
                    key={`${selectedSection}-${currentPage}-${searchQuery}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.28, ease: EASE }}
                  >
                    {paginatedFAQs.map((faq) => {
                      const isOpen = openIndex === faq.id;
                      return (
                        <div
                          key={faq.id}
                          className="transition-colors duration-150 hover:bg-black/[0.015]"
                        >
                          <button
                            type="button"
                            onClick={() => toggleFAQ(faq.id)}
                            className="flex w-full cursor-pointer items-center justify-between gap-4 p-5 text-start"
                          >
                            <span className="[font-family:var(--font-display)] text-sm font-medium text-black sm:text-base">
                              {isAr ? faq.questionAr : faq.questionEn}
                            </span>
                            <motion.span
                              animate={{ rotate: isOpen ? 180 : 0 }}
                              transition={{ duration: 0.25, ease: EASE }}
                              className="shrink-0 text-black"
                            >
                              {isOpen ? (
                                <Minus className="h-4 w-4" />
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                            </motion.span>
                          </button>

                          <AnimatePresence initial={false}>
                            {isOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.28, ease: EASE }}
                              >
                                <div className="px-5 pb-5 pt-1 [font-family:var(--font-body)] text-xs leading-relaxed whitespace-pre-line text-[#5A5A56] sm:text-sm">
                                  {isAr ? faq.answerAr : faq.answerEn}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-8 text-center [font-family:var(--font-body)] text-xs text-[#8A8A80]"
                  >
                    {isAr
                      ? "لا توجد أسئلة تطابق بحثك في هذا القسم."
                      : "No questions match your search in this section."}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {filteredFAQs.length > 0 && (
              <div className="flex flex-col items-center justify-between gap-4 pt-2 sm:flex-row">
                <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#7A7A72] sm:text-[11px]">
                  <span>{isAr ? "لكل صفحة" : "Per page"}</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) =>
                      handlePageSizeChange(Number(e.target.value))
                    }
                    className="cursor-pointer rounded-lg border border-[#E4E0D8] bg-transparent px-2 py-1.5 text-black focus:outline-none"
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </div>
        </SectionReveal>
      </div>
    </MainLayout>
  );
}
