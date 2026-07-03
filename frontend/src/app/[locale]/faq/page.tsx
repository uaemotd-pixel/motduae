"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import MainLayout from "../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, Search } from "lucide-react";

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

export default function FAQPage() {
    const params = useParams();
    const locale = params.locale as string;
    const isAr = locale === "ar";

    const [searchQuery, setSearchQuery] = useState("");
    const [openIndex, setOpenIndex] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string>("all");

    const categories = [
        { id: "all", labelEn: "All", labelAr: "الكل" },
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
            <FadeInSection>
                <div className="bg-[#FFFDF9] min-h-screen py-16 sm:py-24">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6">
                        {/* Header */}
                        <div className="text-center mb-12">
                            <span className="[font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.28em] text-[#8A8A80] mb-3 block">
                                {isAr ? "الأسئلة المتكررة" : "FAQ Directory"}
                            </span>
                            <h1 className="[font-family:var(--font-display)] text-4xl sm:text-5xl font-light tracking-tight text-black mb-4">
                                {isAr ? "الأسئلة الشائعة" : "Frequently Asked Questions"}
                            </h1>
                        </div>

                        {/* Search Bar */}
                        <div className="relative mb-10">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[#8A8A80]">
                                <Search className="w-5 h-5" />
                            </div>
                            <input
                                type="text"
                                placeholder={isAr ? "ابحث عن سؤالك هنا..." : "Search for questions..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-12 pl-12 pr-4 bg-white border border-[#E8E8E4] rounded-xl focus:outline-none focus:border-black text-sm [font-family:var(--font-body)] text-black transition-colors"
                            />
                        </div>

                        {/* Categories Tab */}
                        <div className="flex gap-2 mb-10 overflow-x-auto pb-2 scrollbar-thin">
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveTab(cat.id)}
                                    className={`px-4 py-2 border rounded-full text-xs uppercase tracking-widest [font-family:var(--font-ui)] transition-colors cursor-pointer whitespace-nowrap
                                        ${activeTab === cat.id 
                                            ? "bg-black border-black text-white" 
                                            : "bg-transparent border-[#E8E8E4] text-[#5A5A56] hover:border-black hover:text-black"
                                        }`}
                                >
                                    {isAr ? cat.labelAr : cat.labelEn}
                                </button>
                            ))}
                        </div>

                        {/* FAQ List */}
                        <div className="border border-[#E8E8E4] rounded-2xl bg-white divide-y divide-[#E8E8E4] overflow-hidden">
                            {filteredFAQ.length > 0 ? (
                                filteredFAQ.map((faq) => {
                                    const isOpen = openIndex === faq.id;
                                    return (
                                        <div key={faq.id} className="transition-colors duration-150">
                                            <button
                                                onClick={() => toggleFAQ(faq.id)}
                                                className="w-full p-5 sm:p-6 flex items-center justify-between text-left gap-4 hover:bg-black/1 transition cursor-pointer"
                                            >
                                                <span className="[font-family:var(--font-display)] text-[15px] sm:text-lg font-medium text-black">
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
                                                        transition={{ duration: 0.25, ease: "easeInOut" }}
                                                    >
                                                        <div className="px-5 sm:px-6 pb-6 pt-1 [font-family:var(--font-body)] text-sm sm:text-base leading-relaxed text-[#5A5A56]">
                                                            {isAr ? faq.answerAr : faq.answerEn}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="p-10 text-center [font-family:var(--font-body)] text-[#8A8A80]">
                                    {isAr ? "لا توجد نتائج مطابقة لعملية البحث." : "No matching questions found."}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </FadeInSection>
        </MainLayout>
    );
}
