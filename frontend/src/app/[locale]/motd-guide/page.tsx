"use client";

import { useState, useRef } from "react";
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
  ArrowDown
} from "lucide-react";

import { GUIDE_FAQ_ITEMS } from "@/data/motdFaqs";


export default function MOTDGuidePage() {
  const params = useParams();
  const locale = params.locale === "ar" ? "ar" : "en";
  const isAr = locale === "ar";

  const [searchQuery, setSearchQuery] = useState("");
  const [openIndex, setOpenIndex] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>("section-1");

  const sectionsContainerRef = useRef<HTMLDivElement>(null);

  const SECTIONS = [
    { id: "section-1", titleEn: "Getting Started", titleAr: "دليل البداية", icon: Sparkles },
    { id: "section-2", titleEn: "Creating Your Mukhawar", titleAr: "تفصيل المخوار", icon: Scissors },
    { id: "section-3", titleEn: "Tailors & Measurements", titleAr: "الخياطون والقياسات", icon: Ruler },
    { id: "section-4", titleEn: "Orders & Your Creation Journey", titleAr: "مسار طلبك وتفصيله", icon: ShoppingBag },
    { id: "section-5", titleEn: "Delivery & Returns", titleAr: "التوصيل والإرجاع", icon: Truck },
    { id: "section-6", titleEn: "Payments & Your MOTD Account", titleAr: "الحساب والمدفوعات", icon: CreditCard },
  ];

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex === 1) {
      window.location.href = isAr ? "/ar/#designs" : "/en/#designs";
    } else if (stepIndex === 2) {
      window.location.href = isAr ? "/ar/fabrics/fabricStore" : "/en/fabrics/fabricStore";
    } else {
      let targetSection = "section-1";
      if (stepIndex === 3) targetSection = "section-3";
      else if (stepIndex === 4 || stepIndex === 5) targetSection = "section-4";
      else if (stepIndex === 6) targetSection = "section-5";

      setSelectedSection(targetSection);
      setSearchQuery("");
      setOpenIndex(null);

      // Smooth scroll to sections anchor
      setTimeout(() => {
        sectionsContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  };

  const handleSectionSelect = (sectionId: string) => {
    setSelectedSection(sectionId);
    setSearchQuery("");
    setOpenIndex(null);
    setTimeout(() => {
      sectionsContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const toggleFAQ = (id: string) => {
    setOpenIndex(openIndex === id ? null : id);
  };

  // Filter items matching selected section AND query
  const filteredFAQs = GUIDE_FAQ_ITEMS.filter((item) => {
    if (item.sectionId !== selectedSection) return false;
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return isAr
      ? item.questionAr.toLowerCase().includes(query) || item.answerAr.toLowerCase().includes(query)
      : item.questionEn.toLowerCase().includes(query) || item.answerEn.toLowerCase().includes(query);
  });

  return (
    <MainLayout>
      <div className="bg-white min-h-screen">
        {/* 1. Page Header */}
        <section className="relative overflow-hidden py-16 sm:py-24 bg-white text-black text-center border-b border-[#E8E8E4]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,0,0,0.02),transparent_60%)]"></div>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 space-y-4">
            <span className="[font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.32em] text-[#8A8A80] block">
              {isAr ? "دليل MOTD" : "THE MOTD GUIDE"}
            </span>
            <h1 className="[font-family:var(--font-display)] text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight text-black leading-tight">
              {isAr ? "دليل MOTD" : "The MOTD Guide"}
            </h1>
            <div className="h-px w-20 bg-black/10 mx-auto my-3"></div>
            <p className="[font-family:var(--font-body)] text-[#5A5A56] max-w-2xl mx-auto text-[15px] sm:text-[18px] leading-relaxed font-light">
              {isAr
                ? "كل ما تحتاج لمعرفته حول طلب وتفصيل والعناية والاستمتاع بالمخوار الخاص بك."
                : "Everything you need to know about ordering, tailoring, caring for and enjoying your Mukhawar."}
            </p>
            <div className="pt-4 flex justify-center">
              <motion.button
                onClick={() => sectionsContainerRef.current?.scrollIntoView({ behavior: "smooth" })}
                className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#8A8A80] hover:text-black transition cursor-pointer"
                animate={{ y: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <span>{isAr ? "استكشف الدليل" : "Explore Guide"}</span>
                <ArrowDown className="w-3.5 h-3.5 text-[#8A8A80]" />
              </motion.button>
            </div>
          </div>
        </section>

        {/* 2. Customer Journey Section */}
        <section className="py-16 sm:py-20 border-b border-[#E8E8E4] bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <span className="[font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.24em] text-[#8A8A80] block mb-2">
                {isAr ? "كيف يعمل؟" : "HOW IT WORKS"}
              </span>
              <h2 className="[font-family:var(--font-display)] text-2xl sm:text-3xl font-light text-black tracking-tight">
                {isAr ? "كيف تنبض مخورتك بالحياة" : "How Your Mukhawar Comes to Life"}
              </h2>
              <div className="h-0.5 w-12 bg-black/10 mx-auto mt-3"></div>
            </div>

            {/* Clickable Ribbon Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 relative">
              {[
                { step: 1, textEn: "Choose a Design", textAr: "اختر التصميم" },
                { step: 2, textEn: "Choose a Fabric", textAr: "اختر القماش" },
                { step: 3, textEn: "Add Measurements", textAr: "أدخل مقاساتك" },
                { step: 4, textEn: "Tailoring Begins", textAr: "بدء الخياطة" },
                { step: 5, textEn: "Quality Check", textAr: "فحص الجودة" },
                { step: 6, textEn: "Delivery to Door", textAr: "التوصيل لبابك" }
              ].map((item, idx) => (
                <div key={item.step} className="flex flex-col items-center">
                  <button
                    onClick={() => handleStepClick(item.step)}
                    className="w-full bg-[#FFFDF9] border border-[#E8E8E4] rounded-2xl p-5 text-center transition-all duration-300 hover:border-black hover:shadow-md cursor-pointer group flex flex-col items-center justify-between h-36"
                  >
                    <span className="w-8 h-8 rounded-full bg-black/5 text-black flex items-center justify-center font-bold text-sm group-hover:bg-black group-hover:text-white transition-colors">
                      {item.step}
                    </span>
                    <span className="[font-family:var(--font-display)] text-xs font-semibold uppercase tracking-wider text-black mt-3 block leading-snug">
                      {isAr ? item.textAr : item.textEn}
                    </span>
                    <span className="text-[10px] text-[#8A8A80] underline group-hover:text-black mt-2 block transition-colors">
                      {isAr ? "عرض التفاصيل" : "Learn details"}
                    </span>
                  </button>
                  {/* Join Arrows */}
                  {idx < 5 && (
                    <div className="hidden md:flex absolute top-16 translate-x-1/2 right-[calc(83.33%-(idx*16.66%))] text-[#8A8A80] font-light text-lg pointer-events-none">
                      →
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Six FAQ Sections Grid */}
        <section ref={sectionsContainerRef} className="py-16 sm:py-24 max-w-5xl mx-auto px-4 sm:px-6 space-y-16">
          <div className="text-center space-y-2">
            <span className="[font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.24em] text-[#8A8A80] block">
              {isAr ? "دليل المساعدة الذكي" : "SMART HELP GUIDE"}
            </span>
            <h2 className="[font-family:var(--font-display)] text-2xl sm:text-3xl font-light text-black tracking-tight">
              {isAr ? "تصفح الأسئلة حسب الموضوع" : "Browse Guide Topics"}
            </h2>
            <p className="text-sm text-[#8A8A80] [font-family:var(--font-body)]">
              {isAr ? "اختر أحد المواضيع الستة أدناه للاطلاع على الأسئلة والأجوبة المتعلقة به." : "Select one of the 6 sections below to view relevant questions."}
            </p>
          </div>

          {/* 6 Section Dashboard Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const isSelected = selectedSection === sec.id;
              const questionsCount = GUIDE_FAQ_ITEMS.filter(item => item.sectionId === sec.id).length;

              return (
                <button
                  key={sec.id}
                  onClick={() => handleSectionSelect(sec.id)}
                  className={`border rounded-2xl p-5 text-left flex flex-col justify-between h-40 cursor-pointer transition-all duration-300 relative overflow-hidden group
                    ${isSelected
                      ? "bg-black border-black text-white shadow-lg"
                      : "bg-white border-[#E8E8E4] text-black hover:border-black hover:shadow-md"
                    }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0
                    ${isSelected ? "bg-white/10" : "bg-black/5"}`}
                  >
                    <Icon className={`w-5 h-5 ${isSelected ? "text-white" : "text-black"}`} />
                  </div>

                  <div className="space-y-1 mt-4">
                    <h3 className="[font-family:var(--font-display)] text-sm font-semibold tracking-tight uppercase leading-snug">
                      {isAr ? sec.titleAr : sec.titleEn}
                    </h3>
                    <span className={`text-[11px] block
                      ${isSelected ? "text-white/60" : "text-[#8A8A80]"}`}
                    >
                      {questionsCount} {isAr ? "أسئلة" : "Questions"}
                    </span>
                  </div>

                  {/* Corner Accent Arrow */}
                  <ChevronRight className={`absolute bottom-5 right-5 w-4 h-4 transition-transform duration-300
                    ${isSelected ? "text-white/40 translate-x-0" : "text-[#8A8A80] opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0"}`}
                  />
                </button>
              );
            })}
          </div>

          {/* 4. Active Q&As Section */}
          <div id="sections-container" className="border-t border-[#E8E8E4] pt-12 space-y-8 max-w-3xl mx-auto">
            {/* active header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#E8E8E4]">
              <div>
                <span className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-wider text-[#8A8A80] block">
                  {isAr ? "الموضوع المحدد حالياً" : "CURRENT GUIDE TOPIC"}
                </span>
                <h3 className="[font-family:var(--font-display)] text-xl font-medium text-black">
                  {isAr
                    ? SECTIONS.find(s => s.id === selectedSection)?.titleAr
                    : SECTIONS.find(s => s.id === selectedSection)?.titleEn
                  }
                </h3>
              </div>

              {/* category search */}
              <div className="relative w-full sm:w-64">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[#8A8A80]">
                  <Search className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  placeholder={isAr ? "ابحث في هذا القسم..." : "Search inside section..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 bg-white border border-[#E8E8E4] rounded-lg focus:outline-none focus:border-black text-xs [font-family:var(--font-body)] text-black transition-colors"
                />
              </div>
            </div>

            {/* Accordion list */}
            <div className="border border-[#E8E8E4] rounded-2xl bg-white divide-y divide-[#E8E8E4] overflow-hidden shadow-sm">
              {filteredFAQs.length > 0 ? (
                filteredFAQs.map((faq) => {
                  const isOpen = openIndex === faq.id;
                  return (
                    <div key={faq.id} className="transition-colors duration-150">
                      <button
                        onClick={() => toggleFAQ(faq.id)}
                        className="w-full p-5 flex items-center justify-between text-left gap-4 hover:bg-black/1 transition cursor-pointer"
                      >
                        <span className="[font-family:var(--font-display)] text-sm sm:text-base font-medium text-black">
                          {isAr ? faq.questionAr : faq.questionEn}
                        </span>
                        <span className="shrink-0 text-black">
                          {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </span>
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                          >
                            <div className="px-5 pb-5 pt-1 [font-family:var(--font-body)] text-xs sm:text-sm leading-relaxed text-[#5A5A56] whitespace-pre-line">
                              {isAr ? faq.answerAr : faq.answerEn}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center [font-family:var(--font-body)] text-xs text-[#8A8A80]">
                  {isAr ? "لا توجد أسئلة تطابق بحثك في هذا القسم." : "No questions match your search in this section."}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}