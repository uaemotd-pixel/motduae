"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import MainLayout from "../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, Search, Sparkles, BookOpen, Ruler, HelpCircle } from "lucide-react";

interface FAQItem {
    id: string;
    questionEn: string;
    questionAr: string;
    answerEn: string;
    answerAr: string;
    category: "orders" | "tailoring" | "shipping" | "general";
}

const FAQ_ITEMS: FAQItem[] = [
    {
        id: "faq-1",
        category: "orders",
        questionEn: "How do I place a custom tailoring order?",
        questionAr: "كيف يمكنني تقديم طلب خياطة مخصص؟",
        answerEn: "To place a custom order, choose 'Custom Design' from the menu or start from any fabric detail page. Select your fabric, choose your preferred tailor shop, input your measurements, review the pricing summary, and complete checkout. The chosen tailor will start crafting your design once the order is placed.",
        answerAr: "لتقديم طلب مخصص، اختر 'خياطة مخصصة' من القائمة أو ابدأ من صفحة تفاصيل أي قماش. حدد القماش، ثم اختر دار الخياطة المفضلة لديك، وأدخل قياساتك، وراجع ملخص الأسعار، وأكمل عملية الدفع. سيبدأ الخياط المختار في صياغة تصميمك بمجرد تقديم الطلب."
    },
    {
        id: "faq-2",
        category: "tailoring",
        questionEn: "What if my measurements are incorrect?",
        questionAr: "ماذا لو كانت قياساتي غير صحيحة؟",
        answerEn: "We encourage you to follow our step-by-step measurement guide before submitting. If you notice a mistake immediately after placing an order, please contact support at support@motd.ae within 2 hours. Once the tailor starts cutting the fabric, modifications might not be possible.",
        answerAr: "نحن نشجعك على اتباع دليل القياس خطوة بخطوة قبل التقديم. إذا لاحظت وجود خطأ فور تقديم الطلب، فيرجى الاتصال بالدعم على support@motd.ae في غضون ساعتين. بمجرد أن يبدأ الخياط في قص القماش، قد لا تكون التعديلات ممكنة."
    },
    {
        id: "faq-3",
        category: "shipping",
        questionEn: "What are your shipping rates and timelines?",
        questionAr: "ما هي أسعار وتواريخ الشحن؟",
        answerEn: "We offer free delivery within the UAE for orders above AED 500. Standard delivery within Dubai takes 3-5 business days for ready-made items. Custom tailoring orders depend on the tailor's estimated crafting time (usually 7-14 business days) plus shipping.",
        answerAr: "نحن نقدم خدمة التوصيل المجاني داخل دولة الإمارات العربية المتحدة للطلبات التي تزيد قيمتها عن 500 درهم إماراتي. يستغرق التوصيل القياسي داخل دبي من 3 إلى 5 أيام عمل للقطع الجاهزة. تعتمد طلبات الخياطة المخصصة على وقت الصياغة المقدر للخياط (عادةً من 7 إلى 14 يوم عمل) بالإضافة إلى الشحن."
    },
    {
        id: "faq-4",
        category: "general",
        questionEn: "Can I return a custom-tailored outfit?",
        questionAr: "هل يمكنني إرجاع ملابس مفصلة خصيصاً لي؟",
        answerEn: "Because custom-tailored garments are crafted to your exact specifications, we do not accept returns or refunds for them. However, we offer alteration services in partnership with our tailoring houses to ensure you get the perfect fit.",
        answerAr: "نظرًا لأن الملابس المفصلة خصيصًا يتم صياغتها وفقًا لقياساتك الدقيقة، فإننا لا نقبل إرجاعها أو استرداد الأموال مقابلها. ومع ذلك، فإننا نقدم خدمات تعديل بالشراكة مع دور الخياطة لدينا لضمان حصولك على القياس المثالي."
    }
];

export default function MOTDGuidePage() {
    const params = useParams();
    const locale = params.locale as string;
    const isAr = locale === "ar";

    const [searchQuery, setSearchQuery] = useState("");
    const [openIndex, setOpenIndex] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string>("all");

    const categories = [
        { id: "all", labelEn: "All Questions", labelAr: "كل الأسئلة" },
        { id: "orders", labelEn: "Orders", labelAr: "الطلبات" },
        { id: "tailoring", labelEn: "Tailoring", labelAr: "الخياطة" },
        { id: "shipping", labelEn: "Shipping", labelAr: "الشحن" },
        { id: "general", labelEn: "General", labelAr: "عام" }
    ];

    const filteredFAQ = FAQ_ITEMS.filter((item) => {
        const matchesCategory = activeTab === "all" || item.category === activeTab;
        const query = searchQuery.toLowerCase();
        const matchesSearch = isAr
            ? item.questionAr.toLowerCase().includes(query) || item.answerAr.toLowerCase().includes(query)
            : item.questionEn.toLowerCase().includes(query) || item.answerEn.toLowerCase().includes(query);
        return matchesCategory && matchesSearch;
    });

    const toggleFAQ = (id: string) => {
        setOpenIndex(openIndex === id ? null : id);
    };

    return (
        <MainLayout>
            <div className="bg-[#FFFDF9] min-h-screen">
                {/* 1. Header Hero section */}
                <section className="relative overflow-hidden py-16 xs:py-20 sm:py-24 md:py-28 lg:py-32 bg-black text-white">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.05),transparent_60%)]"></div>
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 text-center">
                        <span className="[font-family:var(--font-ui)] text-[11px] xs:text-[12px] uppercase tracking-[0.32em] text-white/50 mb-4 block">
                            {isAr ? "دليل مخوّر اليوم" : "THE MOTD GUIDE"}
                        </span>
                        <h1 className="[font-family:var(--font-display)] text-4xl xs:text-5xl sm:text-6xl font-light tracking-tight text-white mb-6">
                            {isAr ? "دليلك المتكامل للتفصيل المخصص" : "Your Guide to Tailored Elegance"}
                        </h1>
                        <p className="[font-family:var(--font-body)] text-white/70 max-w-xl mx-auto text-sm sm:text-base leading-relaxed font-normal">
                            {isAr
                                ? "اكتشف قصة MOTD، وتعرّف على الأسئلة الشائعة حول كيفية طلب المخوّرات وتفصيلها خصيصًا لك."
                                : "Discover the story behind MOTD, and find comprehensive answers to all your questions about ordering custom UAE/GCC apparel."}
                        </p>
                    </div>
                </section>

                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20 md:py-24 space-y-20 sm:space-y-28">
                    {/* 2. About MOTD Section */}
                    <FadeInSection>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-start">
                            <div className="md:col-span-5 space-y-4">
                                <span className="[font-family:var(--font-ui)] text-[10px] xs:text-[11px] uppercase tracking-[0.24em] text-[#8A8A80] block">
                                    {isAr ? "قصتنا ورؤيتنا" : "OUR VISION & VALUES"}
                                </span>
                                <h2 className="[font-family:var(--font-display)] text-3xl sm:text-4xl font-light text-black tracking-tight leading-tight">
                                    {isAr ? "عن مخوّر اليوم" : "About MOTD"}
                                </h2>
                                <div className="h-0.5 w-16 bg-black/10"></div>
                            </div>
                            
                            <div className="md:col-span-7 space-y-6 [font-family:var(--font-body)] text-[#5A5A56] text-sm sm:text-base leading-relaxed">
                                <p className="font-semibold text-black">
                                    {isAr
                                        ? "مخوّر اليوم (MOTD) هي المنصة الأولى والوجهة المثالية في دولة الإمارات ودول الخليج لربط محبي الأزياء التقليدية بأفضل متاجر الأقمشة وأمهر الخياطين الحرفيين."
                                        : "Mukhawar of the Day (MOTD) represents the finest UAE/GCC apparel marketplace. Bridging standard-setting fabric stores with artisanal tailors for the ultimate customizable luxury."}
                                </p>
                                <p>
                                    {isAr
                                        ? "مهمتنا هي الحفاظ على الموروث الثقافي العريق للأزياء الإماراتية والخليجية ونقله إلى العصر الرقمي الحديث. نحن نتيح لك اختيار الأقمشة الفاخرة وتحديد مقاساتك بدقة وطلب تفصيل قطعة فريدة تناسبك تمامًا بكل سهولة ويُسر."
                                        : "Our mission is to digitalize and celebrate the rich tailoring heritage of the UAE and GCC. By unifying top-tier fabric sellers and skilled tailoring ateliers on a single intuitive platform, we bring customizable heritage garments to your doorstep."}
                                </p>

                                {/* Grid of core values */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                                    <div className="p-4 border border-[#E8E8E4] rounded-xl bg-white space-y-2">
                                        <div className="flex items-center gap-2 text-black">
                                            <Sparkles className="w-4 h-4 text-black" />
                                            <h4 className="font-medium text-xs uppercase tracking-widest [font-family:var(--font-ui)]">
                                                {isAr ? "جودة حرفية" : "Artisanal Craft"}
                                            </h4>
                                        </div>
                                        <p className="text-[12px] text-[#8A8A80] leading-normal">
                                            {isAr ? "خياطون محترفون لضمان دقة التفاصيل والتطريز." : "We partner exclusively with verified master tailors to guarantee absolute precision."}
                                        </p>
                                    </div>
                                    <div className="p-4 border border-[#E8E8E4] rounded-xl bg-white space-y-2">
                                        <div className="flex items-center gap-2 text-black">
                                            <BookOpen className="w-4 h-4 text-black" />
                                            <h4 className="font-medium text-xs uppercase tracking-widest [font-family:var(--font-ui)]">
                                                {isAr ? "موروث وتراث" : "Heritage Preserved"}
                                            </h4>
                                        </div>
                                        <p className="text-[12px] text-[#8A8A80] leading-normal">
                                            {isAr ? "نفتخر بتقديم التصاميم الأصيلة والهوية الوطنية." : "Keeping the traditional Emirati mukhawar art alive and modern."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </FadeInSection>

                    {/* 3. FAQ Section */}
                    <FadeInSection>
                        <div className="space-y-10">
                            <div className="text-center space-y-3">
                                <span className="[font-family:var(--font-ui)] text-[10px] xs:text-[11px] uppercase tracking-[0.24em] text-[#8A8A80] block">
                                    {isAr ? "الأسئلة الشائعة" : "FREQUENTLY ASKED QUESTIONS"}
                                </span>
                                <h2 className="[font-family:var(--font-display)] text-3xl sm:text-4xl font-light text-black tracking-tight">
                                    {isAr ? "الأسئلة المتكررة ودليل المساعدة" : "FAQ Directory"}
                                </h2>
                                <div className="h-0.5 w-16 bg-black/10 mx-auto"></div>
                            </div>

                            {/* Search bar */}
                            <div className="relative max-w-xl mx-auto">
                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[#8A8A80]">
                                    <Search className="w-4 h-4" />
                                </div>
                                <input
                                    type="text"
                                    placeholder={isAr ? "ابحث عن سؤالك هنا..." : "Search for questions..."}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full h-11 pl-11 pr-4 bg-white border border-[#E8E8E4] rounded-xl focus:outline-none focus:border-black text-sm [font-family:var(--font-body)] text-black transition-colors"
                                />
                            </div>

                            {/* Categories tabs */}
                            <div className="flex gap-2 justify-center overflow-x-auto pb-2 scrollbar-thin">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveTab(cat.id)}
                                        className={`px-4 py-1.5 border rounded-full text-[11px] uppercase tracking-wider [font-family:var(--font-ui)] transition-colors cursor-pointer whitespace-nowrap
                                            ${activeTab === cat.id 
                                                ? "bg-black border-black text-white" 
                                                : "bg-transparent border-[#E8E8E4] text-[#5A5A56] hover:border-black hover:text-black"
                                            }`}
                                    >
                                        {isAr ? cat.labelAr : cat.labelEn}
                                    </button>
                                ))}
                            </div>

                            {/* FAQ Accordions */}
                            <div className="border border-[#E8E8E4] rounded-2xl bg-white divide-y divide-[#E8E8E4] overflow-hidden max-w-3xl mx-auto shadow-sm">
                                {filteredFAQ.length > 0 ? (
                                    filteredFAQ.map((faq) => {
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
                                                        {isOpen ? <Minus className="w-4.5 h-4.5" /> : <Plus className="w-4.5 h-4.5" />}
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
                                    <div className="p-8 text-center [font-family:var(--font-body)] text-sm text-[#8A8A80]">
                                        {isAr ? "لا توجد نتائج مطابقة لعملية البحث." : "No matching questions found."}
                                    </div>
                                )}
                            </div>
                        </div>
                    </FadeInSection>
                </div>
            </div>
        </MainLayout>
    );
}
