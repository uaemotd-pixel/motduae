"use client";

import { useParams } from "next/navigation";
import MainLayout from "../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";

export default function CookiesPage() {
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
                                {isAr ? "السياسات والخصوصية" : "Legal & Privacy"}
                            </span>
                            <h1 className="[font-family:var(--font-display)] text-4xl sm:text-5xl font-light tracking-tight text-black mb-4">
                                {isAr ? "سياسة ملفات تعريف الارتباط" : "Cookies Policy"}
                            </h1>
                            <p className="[font-family:var(--font-ui)] text-[#8A8A80] text-xs uppercase tracking-wider">
                                {isAr ? "آخر تحديث: يونيو 2026" : "Last updated: June 2026"}
                            </p>
                        </div>

                        {/* Content */}
                        <div className="space-y-10 [font-family:var(--font-body)] text-[#5A5A56] text-sm sm:text-base leading-relaxed">
                            <section className="space-y-4">
                                <h2 className="[font-family:var(--font-display)] text-xl sm:text-2xl text-black font-normal">
                                    {isAr ? "1. ما هي ملفات تعريف الارتباط؟" : "1. What Are Cookies?"}
                                </h2>
                                <p>
                                    {isAr 
                                        ? "ملفات تعريف الارتباط هي ملفات نصية صغيرة يتم تخزينها على جهازك عند زيارتك لموقعنا. وهي تساعدنا على تقديم تجربة تصفح سلسة ومخصصة وتذكر تفضيلاتك."
                                        : "Cookies are small text files stored on your device when you visit our website. They help us provide a seamless and customized browsing experience and remember your preferences."}
                                </p>
                            </section>

                            <section className="space-y-4">
                                <h2 className="[font-family:var(--font-display)] text-xl sm:text-2xl text-black font-normal">
                                    {isAr ? "2. كيف نستخدم ملفات تعريف الارتباط؟" : "2. How We Use Cookies"}
                                </h2>
                                <p>
                                    {isAr 
                                        ? "نستخدم ملفات تعريف الارتباط الأساسية لتمكينك من تسجيل الدخول وإضافة المنتجات إلى السلة، وملفات تعريف الارتباط التحليلية لفهم كيفية تفاعل المستخدمين مع منصتنا وتحسين جودتها."
                                        : "We use essential cookies to allow you to log in and add items to your cart, and analytical cookies to understand how users interact with our platform and improve its quality."}
                                </p>
                            </section>

                            <section className="space-y-4">
                                <h2 className="[font-family:var(--font-display)] text-xl sm:text-2xl text-black font-normal">
                                    {isAr ? "3. إدارة تفضيلاتك" : "3. Managing Your Preferences"}
                                </h2>
                                <p>
                                    {isAr 
                                        ? "يمكنك اختيار تعطيل ملفات تعريف الارتباط أو إدارتها من خلال إعدادات متصفحك. يرجى العلم بأن تعطيل ملفات تعريف الارتباط الأساسية قد يؤثر على عمل وظائف سلة التسوق والحساب."
                                        : "You can choose to disable or manage cookies through your browser settings. Please note that disabling essential cookies may impact the functionality of your shopping cart and account features."}
                                </p>
                            </section>
                        </div>
                    </div>
                </div>
            </FadeInSection>
        </MainLayout>
    );
}
