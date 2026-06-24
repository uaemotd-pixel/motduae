"use client";

import { useParams } from "next/navigation";
import MainLayout from "../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";
import { Link } from "@/i18n/navigation";
import { Mail, Phone, MapPin, MessageSquare, ArrowRight } from "lucide-react";

export default function SupportPage() {
    const params = useParams();
    const locale = params.locale as string;
    const isAr = locale === "ar";

    return (
        <MainLayout>
            <FadeInSection>
                <div className="bg-[#FFFDF9] min-h-screen py-16 sm:py-24">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6">
                        {/* Header */}
                        <div className="text-center mb-16">
                            <span className="[font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.28em] text-[#8A8A80] mb-3 block">
                                {isAr ? "مركز المساعدة" : "Help Center"}
                            </span>
                            <h1 className="[font-family:var(--font-display)] text-4xl sm:text-5xl font-light tracking-tight text-black mb-4">
                                {isAr ? "كيف يمكننا مساعدتك؟" : "How can we help you?"}
                            </h1>
                            <p className="[font-family:var(--font-body)] text-[#5A5A56] max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
                                {isAr 
                                    ? "فريق خدمة العملاء لدينا متواجد دائمًا لتقديم الدعم والمساعدة في اختيار الأقمشة وتفصيل الأزياء."
                                    : "Our customer service team is always here to provide support, guidance on fabrics, and assistance with tailoring."}
                            </p>
                        </div>

                        {/* Support Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                            <div className="bg-white border border-[#E8E8E4] rounded-2xl p-6 transition-all duration-300 hover:shadow-xl">
                                <div className="w-12 h-12 bg-black/5 rounded-full flex items-center justify-center mb-4">
                                    <Mail className="w-5 h-5 text-black" />
                                </div>
                                <h3 className="[font-family:var(--font-display)] text-lg font-medium text-black mb-2">
                                    {isAr ? "بريدنا الإلكتروني" : "Email Us"}
                                </h3>
                                <p className="text-[13px] text-[#8A8A80] mb-4">
                                    {isAr ? "راسلنا في أي وقت وسنقوم بالرد خلال 24 ساعة." : "Reach out anytime. We respond within 24 hours."}
                                </p>
                                <a href="mailto:support@motd.ae" className="text-sm font-medium text-black underline block hover:opacity-75">
                                    support@motd.ae
                                </a>
                            </div>

                            <div className="bg-white border border-[#E8E8E4] rounded-2xl p-6 transition-all duration-300 hover:shadow-xl">
                                <div className="w-12 h-12 bg-black/5 rounded-full flex items-center justify-center mb-4">
                                    <Phone className="w-5 h-5 text-black" />
                                </div>
                                <h3 className="[font-family:var(--font-display)] text-lg font-medium text-black mb-2">
                                    {isAr ? "اتصل بنا" : "Call Us"}
                                </h3>
                                <p className="text-[13px] text-[#8A8A80] mb-4">
                                    {isAr ? "متاح من الاثنين إلى السبت، 9 صباحًا - 6 مساءً." : "Available Mon-Sat, 9 AM to 6 PM."}
                                </p>
                                <a href="tel:+97140000000" className="text-sm font-medium text-black underline block hover:opacity-75">
                                    +971 4 000 0000
                                </a>
                            </div>

                            <div className="bg-white border border-[#E8E8E4] rounded-2xl p-6 transition-all duration-300 hover:shadow-xl">
                                <div className="w-12 h-12 bg-black/5 rounded-full flex items-center justify-center mb-4">
                                    <MapPin className="w-5 h-5 text-black" />
                                </div>
                                <h3 className="[font-family:var(--font-display)] text-lg font-medium text-black mb-2">
                                    {isAr ? "المكتب الرئيسي" : "Head Office"}
                                </h3>
                                <p className="text-[13px] text-[#8A8A80] mb-4">
                                    {isAr ? "دبي، الإمارات العربية المتحدة." : "Dubai, United Arab Emirates."}
                                </p>
                                <span className="text-sm font-medium text-[#5A5A56] block">
                                    D3, Dubai Design District
                                </span>
                            </div>
                        </div>

                        {/* Useful Links Section */}
                        <div className="bg-black text-white rounded-3xl p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
                            <div className="space-y-2 text-center md:text-left">
                                <h2 className="[font-family:var(--font-display)] text-2xl font-light tracking-tight">
                                    {isAr ? "هل تبحث عن إجابات سريعة؟" : "Looking for quick answers?"}
                                </h2>
                                <p className="[font-family:var(--font-body)] text-white/60 text-sm">
                                    {isAr 
                                        ? "تصفح الأسئلة الشائعة لمعرفة المزيد حول الشحن، المرتجعات، والقياسات."
                                        : "Browse our frequently asked questions about shipping, returns, and measurements."}
                                </p>
                            </div>
                            <Link 
                                href="/faq" 
                                className="inline-flex items-center gap-2 px-6 py-3.5 bg-white text-black font-semibold text-xs tracking-[0.2em] uppercase hover:bg-white/90 transition"
                            >
                                <span>{isAr ? "الأسئلة الشائعة" : "View FAQs"}</span>
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </FadeInSection>
        </MainLayout>
    );
}
