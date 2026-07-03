"use client";

import { useParams } from "next/navigation";
import MainLayout from "../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";
import { Link } from "@/i18n/navigation";
import { Scissors, Palmtree, Truck, ArrowRight } from "lucide-react";

export default function PartnersPage() {
    const params = useParams();
    const locale = params.locale as string;
    const isAr = locale === "ar";

    return (
        <MainLayout>
            <FadeInSection>
                <div className="bg-[#FFFDF9] min-h-screen py-16 sm:py-24">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6">
                        {/* Header */}
                        <div className="text-center mb-16">
                            <span className="[font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.28em] text-[#8A8A80] mb-3 block">
                                {isAr ? "فرص الشراكة" : "Join the Ecosystem"}
                            </span>
                            <h1 className="[font-family:var(--font-display)] text-4xl sm:text-5xl font-light tracking-tight text-black mb-4">
                                {isAr ? "كن شريكاً لنا" : "Partner Opportunities"}
                            </h1>
                            <p className="[font-family:var(--font-body)] text-[#5A5A56] max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
                                {isAr 
                                    ? "انضم إلى مجتمعنا ووسّع نطاق عملك كدار خياطة، أو مورد أقمشة، أو شريك لوجستي في منصتنا."
                                    : "Join our luxury tailoring platform and expand your business reach as a tailor shop, premium fabric store, or courier partner."}
                            </p>
                        </div>

                        {/* Gateway Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Tailor Card */}
                            <div className="bg-white border border-[#E8E8E4] rounded-2xl p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl">
                                <div className="space-y-4">
                                    <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center">
                                        <Scissors className="w-5 h-5" />
                                    </div>
                                    <h3 className="[font-family:var(--font-display)] text-xl font-medium text-black">
                                        {isAr ? "دور الخياطة والمصممين" : "Tailoring Houses"}
                                    </h3>
                                    <p className="[font-family:var(--font-body)] text-[13px] text-[#5A5A56] leading-relaxed">
                                        {isAr 
                                            ? "اعرض تصاميمك الفريدة واستقبل طلبات القياس المخصصة من عملاء MOTD."
                                            : "Showcase your craftsmanship and receive custom tailoring requests from customers across the region."}
                                    </p>
                                </div>
                                <Link 
                                    href="/partners/tailor"
                                    className="mt-8 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-black font-semibold border-b border-black pb-1 self-start hover:opacity-75 transition-opacity"
                                >
                                    <span>{isAr ? "تقديم طلب خياط" : "Become a Tailor"}</span>
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>

                            {/* Fabric Vendor Card */}
                            <div className="bg-white border border-[#E8E8E4] rounded-2xl p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl">
                                <div className="space-y-4">
                                    <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center">
                                        <Palmtree className="w-5 h-5" />
                                    </div>
                                    <h3 className="[font-family:var(--font-display)] text-xl font-medium text-black">
                                        {isAr ? "موردو الأقمشة الفاخرة" : "Fabric Vendors"}
                                    </h3>
                                    <p className="[font-family:var(--font-body)] text-[13px] text-[#5A5A56] leading-relaxed">
                                        {isAr 
                                            ? "اعرض كتالوج الحرير والصوف والكتان والقطن الفاخر لعملائنا في دول الخليج."
                                            : "Publish your collection of premium silk, linen, wool, and cotton fabrics to designers and custom buyers."}
                                    </p>
                                </div>
                                <Link 
                                    href="/partners/fabric"
                                    className="mt-8 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-black font-semibold border-b border-black pb-1 self-start hover:opacity-75 transition-opacity"
                                >
                                    <span>{isAr ? "تسجيل بائع أقمشة" : "Register Store"}</span>
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>

                            {/* Shipping Card */}
                            <div className="bg-white border border-[#E8E8E4] rounded-2xl p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl">
                                <div className="space-y-4">
                                    <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center">
                                        <Truck className="w-5 h-5" />
                                    </div>
                                    <h3 className="[font-family:var(--font-display)] text-xl font-medium text-black">
                                        {isAr ? "شركاء الخدمات اللوجستية" : "Logistics Partners"}
                                    </h3>
                                    <p className="[font-family:var(--font-body)] text-[13px] text-[#5A5A56] leading-relaxed">
                                        {isAr 
                                            ? "ساعدنا في توصيل القطع الفاخرة والقياسات بأمان وسرعة لعملائنا."
                                            : "Deliver premium fabrics and custom packages securely and swiftly to customers throughout the GCC."}
                                    </p>
                                </div>
                                <Link 
                                    href="/partners/shipping"
                                    className="mt-8 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-black font-semibold border-b border-black pb-1 self-start hover:opacity-75 transition-opacity"
                                >
                                    <span>{isAr ? "التسجيل كمندوب شحن" : "Apply as Courier"}</span>
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </FadeInSection>
        </MainLayout>
    );
}
