"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import MainLayout from "../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";
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
  Heart,
  ChevronRight,
  ArrowDown
} from "lucide-react";

interface FAQItem {
  id: string;
  sectionId: string;
  questionEn: string;
  questionAr: string;
  answerEn: string;
  answerAr: string;
}

const FAQ_ITEMS: FAQItem[] = [
  // Section 1: Getting Started
  {
    id: "gs-1",
    sectionId: "section-1",
    questionEn: "What is MOTD?",
    questionAr: "ما هو MOTD؟",
    answerEn: "MOTD (Mukhawar of the Day) is a GCC marketplace for custom tailoring and traditional ready-made garments. We bring UAE's premium fabric stores and artisanal tailors under one roof to digitize custom traditional apparel.",
    answerAr: "MOTD (مخوّر اليوم) هو منصة تسوق خليجية مخصصة لتفصيل وتجهيز الملابس التقليدية الجاهزة. نحن نجمع أرقى محلات الأقمشة في الإمارات والخياطين الحرفيين تحت سقف واحد لرقمنة تفصيل الملابس التقليدية."
  },
  {
    id: "gs-2",
    sectionId: "section-1",
    questionEn: "Do I need an account to place an order?",
    questionAr: "هل أحتاج إلى حساب لتقديم طلب؟",
    answerEn: "Yes, you need to create an account. This allows you to save your custom measurements profiles, track tailoring milestones, view order history, and communicate with your chosen tailoring house.",
    answerAr: "نعم، تحتاج إلى إنشاء حساب. يتيح لك ذلك حفظ ملفات تعريف القياسات المخصصة، وتتبع مراحل التفصيل، وعرض سجل الطلبات، والتواصل مع دار الخياطة المختارة."
  },

  // Section 2: Creating Your Mukhawar
  {
    id: "cm-1",
    sectionId: "section-2",
    questionEn: "Can I choose my own fabric and designs together?",
    questionAr: "هل يمكنني اختيار القماش والتصميم معًا؟",
    answerEn: "Yes! The core MOTD journey allows you to select a base design from a tailor shop, pick your preferred fabric from a fabric store, and customize the sizes. You can also purchase standalone ready-made products directly.",
    answerAr: "نعم! تتيح لك رحلة MOTD الأساسية اختيار تصميم أساسي من محل الخياطة، واختيار قماشك المفضل من متجر أقمشة، وتخصيص المقاسات. يمكنك أيضًا شراء المنتجات الجاهزة مباشرة."
  },
  {
    id: "cm-2",
    sectionId: "section-2",
    questionEn: "Can I provide my own fabric?",
    questionAr: "هل يمكنني تقديم قماشي الخاص؟",
    answerEn: "Absolutely. When building a custom order, you can select the option to provide your own fabric. Once the order is placed, you will ship or deliver your fabric directly to the designated tailor's shop address listed in your order details.",
    answerAr: "بالتأكيد. عند إعداد طلب مخصص، يمكنك تحديد خيار توفير قماشك الخاص. بمجرد تقديم الطلب، ستقوم بإرسال أو تسليم قماشك مباشرة إلى عنوان محل الخياطة المحدد المذكور في تفاصيل طلبك."
  },

  // Section 3: Tailors & Measurements
  {
    id: "tm-1",
    sectionId: "section-3",
    questionEn: "How do I take accurate measurements?",
    questionAr: "كيف يمكنني أخذ قياسات دقيقة؟",
    answerEn: "Use a soft measuring tape and follow our bilingual 'Measure with Confidence' video or diagram. Keep the tape flat and snug, but not too tight. Get a friend to help measure your shoulder width, armhole depth, and total dress length.",
    answerAr: "استخدم شريط قياس ناعم واتبع فيديو أو مخطط 'القياس بكل ثقة' ثنائي اللغة. حافظ على الشريط مسطحًا ومريحًا، ولكن ليس ضيقًا جدًا. استعن بصديق للمساعدة في قياس عرض الكتفين، وعمق فتحة الإبط، وطول الفستان الإجمالي."
  },
  {
    id: "tm-2",
    sectionId: "section-3",
    questionEn: "Are my measurements saved for future purchases?",
    questionAr: "هل يتم حفظ قياساتي للمشتريات المستقبلية؟",
    answerEn: "Yes! Your custom measurements are securely saved on your account dashboard. You can create multiple profiles (e.g., for different family members) and easily apply them at checkout with a single click.",
    answerAr: "نعم! يتم حفظ قياساتك المخصصة بشكل آمن في لوحة تحكم حسابك. يمكنك إنشاء ملفات تعريف متعددة (على سبيل المثال، لأفراد العائلة المختلفين) وتطبيقها بسهولة عند الدفع بنقرة واحدة."
  },

  // Section 4: Orders & Your Creation Journey
  {
    id: "oj-1",
    sectionId: "section-4",
    questionEn: "How do I track my tailoring progress?",
    questionAr: "كيف يمكنني تتبع تقدم تفصيل ملابسي؟",
    answerEn: "Once your order is confirmed, you can track it step-by-step in your account panel. The order status updates live through milestones: Placed, Fabric Received, Cutting, Tailoring, Quality Check, and Out for Delivery.",
    answerAr: "بمجرد تأكيد طلبك، يمكنك تتبعه خطوة بخطوة في لوحة حسابك. يتم تحديث حالة الطلب مباشرة عبر مراحل: تم تقديم الطلب، تم استلام القماش، القص، الخياطة، فحص الجودة، وجاري التوصيل."
  },
  {
    id: "oj-2",
    sectionId: "section-4",
    questionEn: "Can I modify my design specifications after placing an order?",
    questionAr: "هل يمكنني تعديل مواصفات التصميم بعد تقديم الطلب؟",
    answerEn: "You can modify instructions or measurements within 2 hours of order confirmation by contacting support@motd.ae or messaging the tailor. Once the status updates to 'Cutting', modifications cannot be processed.",
    answerAr: "يمكنك تعديل التعليمات أو القياسات في غضون ساعتين من تأكيد الطلب عن طريق الاتصال بـ support@motd.ae أو مراسلة الخياط. بمجرد تحديث الحالة إلى 'القص'، لا يمكن معالجة التعديلات."
  },

  // Section 5: Delivery, Returns & Alterations
  {
    id: "dr-1",
    sectionId: "section-5",
    questionEn: "What is the return policy for custom orders?",
    questionAr: "ما هي سياسة الإرجاع للطلبات المخصصة؟",
    answerEn: "Since custom-tailored Mukhawars are crafted to your unique measurements, they cannot be returned or refunded. If there is a tailoring defect, we support you with alteration services in coordination with the partner tailor.",
    answerAr: "نظرًا لأن المخوّرات المفصلة خصيصًا تُصنع وفقًا لقياساتك الفريدة، فلا يمكن إرجاعها أو استرداد قيمتها. في حال وجود عيب في الخياطة، فنحن ندعمك بخدمات التعديل بالتنسيق مع الخياط الشريك."
  },
  {
    id: "dr-2",
    sectionId: "section-5",
    questionEn: "What are your delivery timelines?",
    questionAr: "ما هي مواعيد التوصيل الخاصة بكم؟",
    answerEn: "Standard ready-made shipping takes 3-5 business days. Custom tailoring orders usually take 7-14 business days to craft, after which standard courier shipping applies.",
    answerAr: "يستغرق شحن القطع الجاهزة القياسي من 3 إلى 5 أيام عمل. عادةً ما تستغرق طلبات الخياطة المخصصة من 7 إلى 14 يوم عمل للتفصيل، وبعد ذلك يتم تطبيق الشحن القياسي."
  },

  // Section 6: Payments & Your MOTD Account
  {
    id: "pa-1",
    sectionId: "section-6",
    questionEn: "Do you offer Cash on Delivery (COD)?",
    questionAr: "هل توفرون خدمة الدفع عند الاستلام؟",
    answerEn: "Yes, Cash on Delivery is currently supported for customers across the UAE. You pay the exact courier invoice amount when your order is delivered to your door.",
    answerAr: "نعم، الدفع عند الاستلام مدعوم حاليًا للعملاء في جميع أنحاء الإمارات. تدفع قيمة الفاتورة الدقيقة لمندوب التوصيل عند تسليم طلبك إلى باب منزلك."
  },
  {
    id: "pa-2",
    sectionId: "section-6",
    questionEn: "How do I update my profile details?",
    questionAr: "كيف يمكنني تحديث بيانات ملفي الشخصي؟",
    answerEn: "Navigate to Account Settings, where you can modify your shipping addresses, contact details, email notifications, and measurement profiles at any time.",
    answerAr: "انتقل إلى إعدادات الحساب، حيث يمكنك تعديل عناوين الشحن وتفاصيل الاتصال وإشعارات البريد الإلكتروني وملفات تعريف القياسات في أي وقت."
  },

  // Section 7: About MOTD
  {
    id: "am-1",
    sectionId: "section-7",
    questionEn: "Where is MOTD based?",
    questionAr: "أين يقع مقر MOTD؟",
    answerEn: "MOTD is proudly head-quartered in Dubai, UAE, in the heart of the Dubai Design District (D3), celebrating GCC traditional fashion with digital innovations.",
    answerAr: "يقع المقر الرئيسي لـ MOTD بفخر في دبي، الإمارات العربية المتحدة، في قلب حي دبي للتصميم (D3)، لنحتفي بالأزياء الخليجية التقليدية بلمسة رقمية مبتكرة."
  },
  {
    id: "am-2",
    sectionId: "section-7",
    questionEn: "How can business partners register?",
    questionAr: "كيف يمكن للشركاء التجاريين التسجيل؟",
    answerEn: "Fabric stores and Tailoring businesses can apply by navigating to the Join Our Community section on the homepage and clicking register, or emailing partner@motd.ae.",
    answerAr: "يمكن لمحلات الأقمشة ومحلات الخياطة التقديم من خلال الانتقال إلى قسم انضم إلى مجتمعنا على الصفحة الرئيسية والنقر على تسجيل، أو إرسال بريد إلكتروني إلى partner@motd.ae."
  }
];

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
    { id: "section-2", titleEn: "Creating Your Mukhawar", titleAr: "تفصيل المخوّر", icon: Scissors },
    { id: "section-3", titleEn: "Tailors & Measurements", titleAr: "الخياطون والقياسات", icon: Ruler },
    { id: "section-4", titleEn: "Orders & Your Creation Journey", titleAr: "مسار طلبك وتفصيله", icon: ShoppingBag },
    { id: "section-5", titleEn: "Delivery, Returns & Alterations", titleAr: "التوصيل والتعديلات والتبديل", icon: Truck },
    { id: "section-6", titleEn: "Payments & Your MOTD Account", titleAr: "الحساب والمدفوعات", icon: CreditCard },
    { id: "section-7", titleEn: "About MOTD", titleAr: "عن المنصة ورؤيتنا", icon: Heart }
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
  const filteredFAQs = FAQ_ITEMS.filter((item) => {
    if (item.sectionId !== selectedSection) return false;
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return isAr
      ? item.questionAr.toLowerCase().includes(query) || item.answerAr.toLowerCase().includes(query)
      : item.questionEn.toLowerCase().includes(query) || item.answerEn.toLowerCase().includes(query);
  });

  return (
    <MainLayout>
      <div className="bg-[#FFFDF9] min-h-screen">
        {/* 1. Page Header */}
        <section className="relative overflow-hidden py-16 sm:py-24 bg-white text-black text-center border-b border-[#E8E8E4]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,0,0,0.02),transparent_60%)]"></div>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 space-y-4">
            <span className="[font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.32em] text-[#8A8A80] block">
              {isAr ? "دليل MOTD" : "THE MOTD GUIDE"}
            </span>
            <h1 className="[font-family:var(--font-display)] text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight text-black leading-tight">
              {isAr ? "دليل مخوّر اليوم" : "The MOTD Guide"}
            </h1>
            <div className="h-px w-20 bg-black/10 mx-auto my-3"></div>
            <p className="[font-family:var(--font-body)] text-[#5A5A56] max-w-2xl mx-auto text-[15px] sm:text-[18px] leading-relaxed font-light">
              {isAr
                ? "كل ما تحتاج لمعرفته حول طلب وتفصيل والعناية والاستمتاع بالمخور الخاص بك."
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

        {/* 3. Seven FAQ Sections Grid */}
        <section ref={sectionsContainerRef} className="py-16 sm:py-24 max-w-5xl mx-auto px-4 sm:px-6 space-y-16">
          <div className="text-center space-y-2">
            <span className="[font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.24em] text-[#8A8A80] block">
              {isAr ? "دليل المساعدة الذكي" : "SMART HELP GUIDE"}
            </span>
            <h2 className="[font-family:var(--font-display)] text-2xl sm:text-3xl font-light text-black tracking-tight">
              {isAr ? "تصفح الأسئلة حسب الموضوع" : "Browse Guide Topics"}
            </h2>
            <p className="text-sm text-[#8A8A80] [font-family:var(--font-body)]">
              {isAr ? "اختر أحد المواضيع السبعة أدناه للاطلاع على الأسئلة والأجوبة المتعلقة به." : "Select one of the 7 sections below to view relevant questions."}
            </p>
          </div>

          {/* 7 Section Dashboard Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const isSelected = selectedSection === sec.id;
              const questionsCount = FAQ_ITEMS.filter(item => item.sectionId === sec.id).length;

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
                    ${isSelected ? "text-white/40 translate-x-0" : "text-[#8A8A80] opacity-0 group-hover:opacity-100 translate-x-[-4px] group-hover:translate-x-0"}`} 
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
                            <div className="px-5 pb-5 pt-1 [font-family:var(--font-body)] text-xs sm:text-sm leading-relaxed text-[#5A5A56]">
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
