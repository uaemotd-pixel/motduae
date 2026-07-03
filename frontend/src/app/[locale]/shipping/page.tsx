"use client";

import { useParams } from "next/navigation";
import MainLayout from "../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";
import { Truck, ShieldCheck, Clock } from "lucide-react";

export default function ShippingPage() {
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
                                {isAr ? "سياسات التوصيل" : "Delivery Details"}
                            </span>
                            <h1 className="[font-family:var(--font-display)] text-4xl sm:text-5xl font-light tracking-tight text-black mb-4">
                                {isAr ? "سياسة الشحن والتوصيل" : "Shipping Policy"}
                            </h1>
                        </div>

                        {/* Summary Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                            <div className="text-center p-6">
                                <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mb-4 mx-auto">
                                    <Truck className="w-5 h-5" />
                                </div>
                                <h3 className="[font-family:var(--font-display)] text-lg font-medium text-black mb-2">
                                    {isAr ? "شحن مجاني" : "Free Shipping"}
                                </h3>
                                <p className="[font-family:var(--font-body)] text-sm text-[#5A5A56]">
                                    {isAr ? "شحن مجاني داخل الإمارات للطلبات فوق 500 درهم." : "Free shipping inside the UAE for orders above AED 500."}
                                </p>
                            </div>

                            <div className="text-center p-6">
                                <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mb-4 mx-auto">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <h3 className="[font-family:var(--font-display)] text-lg font-medium text-black mb-2">
                                    {isAr ? "توصيل سريع" : "Fast Delivery"}
                                </h3>
                                <p className="[font-family:var(--font-body)] text-sm text-[#5A5A56]">
                                    {isAr ? "توصيل خلال 3-5 أيام عمل للقطع الجاهزة." : "Delivery within 3-5 business days for ready-made collections."}
                                </p>
                            </div>

                            <div className="text-center p-6">
                                <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mb-4 mx-auto">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <h3 className="[font-family:var(--font-display)] text-lg font-medium text-black mb-2">
                                    {isAr ? "تأمين الشحن" : "Insured Delivery"}
                                </h3>
                                <p className="[font-family:var(--font-body)] text-sm text-[#5A5A56]">
                                    {isAr ? "جميع الطلبيات يتم شحنها وتأمينها بشكل آمن." : "All shipments are securely packaged and fully insured."}
                                </p>
                            </div>
                        </div>

                        {/* Detailed Shipping Info */}
                        <div className="bg-white border border-[#E8E8E4] rounded-2xl p-8 space-y-8 [font-family:var(--font-body)] text-[#5A5A56]">
                            <section className="space-y-4">
                                <h2 className="[font-family:var(--font-display)] text-xl text-black font-normal border-b border-[#E8E8E4] pb-2">
                                    {isAr ? "خيارات التوصيل والرسوم" : "Shipping Methods & Rates"}
                                </h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-[#E8E8E4]">
                                                <th className="py-3 font-medium text-black">{isAr ? "المنطقة" : "Region"}</th>
                                                <th className="py-3 font-medium text-black">{isAr ? "مدة التوصيل" : "Timelines"}</th>
                                                <th className="py-3 font-medium text-black">{isAr ? "الرسوم" : "Cost"}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#E8E8E4]">
                                            <tr>
                                                <td className="py-3 text-black">UAE (Dubai/Abu Dhabi)</td>
                                                <td className="py-3">3 - 5 {isAr ? "أيام عمل" : "Business Days"}</td>
                                                <td className="py-3">AED 20 ({isAr ? "مجاني فوق 500" : "Free above 500"})</td>
                                            </tr>
                                            <tr>
                                                <td className="py-3 text-black">UAE (Other Emirates)</td>
                                                <td className="py-3">4 - 6 {isAr ? "أيام عمل" : "Business Days"}</td>
                                                <td className="py-3">AED 25 ({isAr ? "مجاني فوق 500" : "Free above 500"})</td>
                                            </tr>
                                            <tr>
                                                <td className="py-3 text-black">GCC Countries (KSA, Oman, Qatar)</td>
                                                <td className="py-3">5 - 8 {isAr ? "أيام عمل" : "Business Days"}</td>
                                                <td className="py-3">AED 50</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h2 className="[font-family:var(--font-display)] text-xl text-black font-normal border-b border-[#E8E8E4] pb-2">
                                    {isAr ? "توصيل طلبات التفصيل المخصص" : "Custom Tailoring Delivery Info"}
                                </h2>
                                <p>
                                    {isAr 
                                        ? "بالنسبة لطلبات الخياطة المخصصة، يتم إضافة وقت صياغة وتفصيل القطعة (المحدد من قبل كل خياط، عادةً من 7 إلى 14 يوم عمل) إلى وقت الشحن القياسي المعروض أعلاه."
                                        : "For custom tailoring orders, please account for the tailor's crafting time (displayed at order selection, typically 7-14 business days) in addition to the shipping transit timelines listed above."}
                                </p>
                            </section>
                        </div>
                    </div>
                </div>
            </FadeInSection>
        </MainLayout>
    );
}
