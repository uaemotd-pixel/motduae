"use client";

import { useParams } from "next/navigation";
import MainLayout from "../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";

export default function TermsPage() {
    const params = useParams();
    const locale = params.locale as string;
    const isAr = locale === "ar";

    return (
        <MainLayout>
            <FadeInSection>
                <div className="bg-[#FFFDF9] min-h-screen py-16 sm:py-24">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6">
                        {/* Header */}
                        <div className="border-b border-[#E8E8E4] pb-10 mb-12">
                            <span className="[font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.28em] text-[#8A8A80] mb-3 block">
                                {isAr ? "السياسات والشروط" : "Legal & Terms"}
                            </span>
                            <h1 className="[font-family:var(--font-display)] text-4xl sm:text-5xl font-light tracking-tight text-black mb-4">
                                {isAr ? "الشروط والأحكام" : "Terms & Conditions"}
                            </h1>
                            <p className="[font-family:var(--font-ui)] text-[#8A8A80] text-xs uppercase tracking-wider">
                                {isAr ? "آخر تحديث: يونيو 2026" : "Last updated: June 2026"}
                            </p>
                        </div>

                        {/* Content */}
                        <div className="space-y-10 [font-family:var(--font-body)] text-[#5A5A56] text-sm sm:text-base leading-relaxed">
                            <section className="space-y-4">
                                <h2 className="[font-family:var(--font-display)] text-xl sm:text-2xl text-black font-normal">
                                    {isAr ? "1. قبول الشروط" : "1. Acceptance of Terms"}
                                </h2>
                                <p>
                                    {isAr 
                                        ? "باستخدامك لمنصة MOTD، فإنك توافق على الالتزام بشروط الاستخدام هذه. إذا كنت لا توافق على هذه الشروط، يرجى عدم استخدام خدماتنا."
                                        : "By accessing and using the MOTD platform, you agree to be bound by these Terms & Conditions. If you do not agree, please do not use our services."}
                                </p>
                            </section>

                            <section className="space-y-4">
                                <h2 className="[font-family:var(--font-display)] text-xl sm:text-2xl text-black font-normal">
                                    {isAr ? "2. طلبات التفصيل المخصص" : "2. Bespoke & Tailored Orders"}
                                </h2>
                                <p>
                                    {isAr 
                                        ? "نظرًا لأن الطلبات المخصصة تُصنع خصيصًا لقياساتك وتفضيلاتك الفريدة، فإن هذه الطلبات تخضع لشروط تعديل محددة بدلاً من المرتجعات الكاملة. تقع على عاتق العميل مسؤولية توفير قياسات دقيقة."
                                        : "Because custom-tailored garments are fabricated specifically to your unique measurements, bespoke orders are subject to alteration policies rather than standard refunds. It is the customer's responsibility to provide accurate measurements."}
                                </p>
                            </section>

                            <section className="space-y-4">
                                <h2 className="[font-family:var(--font-display)] text-xl sm:text-2xl text-black font-normal">
                                    {isAr ? "3. شروط الدفع والأسعار" : "3. Pricing and Payments"}
                                </h2>
                                <p>
                                    {isAr 
                                        ? "جميع الأسعار المعروضة بالدرهم الإماراتي وتخمل ضريبة القيمة المضافة بنسبة 5٪ عند الاقتضاء. يجب سداد الدفعات بالكامل قبل بدء عملية تفصيل القطع المخصصة."
                                        : "All prices on the platform are in AED (United Arab Emirates Dirham) and include 5% VAT where applicable. Payments must be processed in full before tailoring work commences."}
                                </p>
                            </section>

                            <section className="space-y-4">
                                <h2 className="[font-family:var(--font-display)] text-xl sm:text-2xl text-black font-normal">
                                    {isAr ? "4. القانون المعمول به" : "4. Governing Law"}
                                </h2>
                                <p>
                                    {isAr 
                                        ? "تخضع هذه الشروط والأحكام وتُفسر وفقًا لقوانين دولة الإمارات العربية المتحدة، ويخضع أي نزاع للاختصاص القضائي لمحاكم دبي."
                                        : "These Terms and Conditions shall be governed by and construed in accordance with the laws of the United Arab Emirates, and any disputes shall be subject to the exclusive jurisdiction of the courts of Dubai."}
                                </p>
                            </section>
                        </div>
                    </div>
                </div>
            </FadeInSection>
        </MainLayout>
    );
}
