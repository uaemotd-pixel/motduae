"use client";

import { useParams } from "next/navigation";
import MainLayout from "../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";
import { Link } from "@/i18n/navigation";

export default function ReturnsPage() {
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
                                {isAr ? "سياسات الاسترجاع" : "Returns & Adjustments"}
                            </span>
                            <h1 className="[font-family:var(--font-display)] text-4xl sm:text-5xl font-light tracking-tight text-black mb-4">
                                {isAr ? "سياسة الإرجاع والتعديل" : "Returns & Alterations"}
                            </h1>
                            <p className="[font-family:var(--font-body)] text-sm text-[#5A5A56] leading-relaxed">
                                {isAr 
                                    ? "يرجى قراءة سياسة المرتجعات الخاصة بنا بعناية للقطع الجاهزة والقطع المصنوعة حسب الطلب."
                                    : "Please read our returns policy carefully for both our ready-made collections and custom-tailored garments."}
                            </p>
                        </div>

                        {/* Content */}
                        <div className="space-y-10 [font-family:var(--font-body)] text-[#5A5A56] text-sm sm:text-base leading-relaxed">
                            {/* Ready-Made Section */}
                            <section className="space-y-4">
                                <h2 className="[font-family:var(--font-display)] text-xl sm:text-2xl text-black font-normal">
                                    {isAr ? "القطع الجاهزة (Ready-to-Wear)" : "Ready-Made Collections"}
                                </h2>
                                <p>
                                    {isAr 
                                        ? "نحن نقبل المرتجعات للقطع الجاهزة في غضون 7 أيام من استلام الطلب. يجب أن تكون القطع غير مستخدمة، في حالتها الأصلية مع وجود البطاقات والملصقات الأصلية وفي التغليف الأصلي."
                                        : "We accept returns on all ready-made items within 7 days of delivery. Items must be unworn, unwashed, in their original condition with all tags attached, and in their original premium packaging."}
                                </p>
                                <p>
                                    {isAr 
                                        ? "لبدء عملية الإرجاع، يرجى التواصل مع فريق الدعم لدينا على support@motd.ae وتزويدنا برقم الطلب الخاص بك."
                                        : "To initiate a return for a ready-made item, please email our support team at support@motd.ae with your order reference number."}
                                </p>
                            </section>

                            {/* Custom Alteration Section */}
                            <section className="space-y-4">
                                <h2 className="[font-family:var(--font-display)] text-xl sm:text-2xl text-black font-normal">
                                    {isAr ? "القطع المصنوعة حسب الطلب (Custom Tailored)" : "Custom Tailoring & Alterations"}
                                </h2>
                                <p>
                                    {isAr 
                                        ? "نظرًا لأن القطع المخصصة تُصنع خصيصًا لتناسب قياساتك، فإننا لا نقبل المرتجعات أو الاسترداد المالي لهذه الفئة. ومع ذلك، نلتزم تمامًا بضمان حصولك على القياس الأمثل."
                                        : "Because custom-tailored garments are crafted specifically to your custom measurements and tailored style, they cannot be returned or refunded. However, we are committed to helping you achieve the perfect fit."}
                                </p>
                                <p>
                                    {isAr 
                                        ? "إذا كانت هناك حاجة لأي تعديلات، يمكنك طلب تعديل مجاني في غضون 14 يومًا من استلام طلبيتك بالتنسيق مع دار الخياطة التي قامت بتفصيل طلبك."
                                        : "If minor adjustments are needed, you can request an alteration within 14 days of delivery in coordination with the tailoring house that crafted your order."}
                                </p>
                            </section>

                            {/* Refund Timelines */}
                            <section className="space-y-4">
                                <h2 className="[font-family:var(--font-display)] text-xl sm:text-2xl text-black font-normal">
                                    {isAr ? "استرداد الأموال" : "Refund Processing"}
                                </h2>
                                <p>
                                    {isAr 
                                        ? "بمجرد استلام المرتجعات المؤهلة وفحصها، سنقوم بمعالجة استرداد الأموال إلى طريقة الدفع الأصلية الخاصة بك في غضون 7-10 أيام عمل."
                                        : "Once your eligible return is received and inspected, we will process your refund back to your original payment method within 7-10 business days."}
                                </p>
                            </section>
                        </div>
                    </div>
                </div>
            </FadeInSection>
        </MainLayout>
    );
}
