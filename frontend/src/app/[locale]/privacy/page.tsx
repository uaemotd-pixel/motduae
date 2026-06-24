"use client";

import { useParams } from "next/navigation";
import MainLayout from "../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";

export default function PrivacyPage() {
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
                                {isAr ? "سياسة الخصوصية" : "Privacy Policy"}
                            </h1>
                            <p className="[font-family:var(--font-ui)] text-[#8A8A80] text-xs uppercase tracking-wider">
                                {isAr ? "آخر تحديث: يونيو 2026" : "Last updated: June 2026"}
                            </p>
                        </div>

                        {/* Content */}
                        <div className="space-y-10 [font-family:var(--font-body)] text-[#5A5A56] text-sm sm:text-base leading-relaxed">
                            <section className="space-y-4">
                                <h2 className="[font-family:var(--font-display)] text-xl sm:text-2xl text-black font-normal">
                                    {isAr ? "1. جمع المعلومات" : "1. Information We Collect"}
                                </h2>
                                <p>
                                    {isAr 
                                        ? "نحن نجمع المعلومات التي تزودنا بها مباشرة عند إنشاء حساب، أو تقديم طلب، أو التواصل معنا. قد يشمل ذلك اسمك وبريدك الإلكتروني وعنوان الشحن ورقم هاتفك والقياسات المخصصة للأزياء."
                                        : "We collect information you provide directly to us when you create an account, place an order, or communicate with us. This may include your name, email, shipping address, phone number, and custom measurements for tailoring."}
                                </p>
                            </section>

                            <section className="space-y-4">
                                <h2 className="[font-family:var(--font-display)] text-xl sm:text-2xl text-black font-normal">
                                    {isAr ? "2. استخدام المعلومات" : "2. How We Use Your Information"}
                                </h2>
                                <p>
                                    {isAr 
                                        ? "نستخدم المعلومات التي نجمعها لتقديم وتخصيص وتحسين خدماتنا، بما في ذلك معالجة المعاملات، وتوفير القياسات للخياطين الشركاء، وإرسال إشعارات التحديث وتأكيد الطلبات."
                                        : "We use the information we collect to provide, personalize, and improve our services. This includes processing transactions, providing measurements to tailoring partners, and sending order confirmation updates."}
                                </p>
                            </section>

                            <section className="space-y-4">
                                <h2 className="[font-family:var(--font-display)] text-xl sm:text-2xl text-black font-normal">
                                    {isAr ? "3. مشاركة المعلومات مع الخياطين" : "3. Sharing with Tailoring Partners"}
                                </h2>
                                <p>
                                    {isAr 
                                        ? "لتسهيل التفصيل المخصص، نقوم بمشاركة قياساتك وتفضيلات التصميم الخاصة بك مع دار الخياطة المحددة التي اخترتها لطلبك. نحن لا نبيع معلوماتك الشخصية لأطراف ثالثة."
                                        : "To facilitate bespoke tailoring, we share your measurements and design specifications with the designated tailoring house selected for your order. We do not sell your personal information to third parties."}
                                </p>
                            </section>

                            <section className="space-y-4">
                                <h2 className="[font-family:var(--font-display)] text-xl sm:text-2xl text-black font-normal">
                                    {isAr ? "4. أمان البيانات" : "4. Data Security"}
                                </h2>
                                <p>
                                    {isAr 
                                        ? "نحن نتخذ تدابير أمنية متقدمة لحماية معلوماتك الشخصية من الوصول غير المصرح به أو الكشف عنها أو تعديلها أو إتلافها."
                                        : "We implement advanced security measures to protect your personal information from unauthorized access, disclosure, alteration, or destruction."}
                                </p>
                            </section>
                        </div>
                    </div>
                </div>
            </FadeInSection>
        </MainLayout>
    );
}
