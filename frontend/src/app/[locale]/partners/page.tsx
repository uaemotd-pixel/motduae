"use client";

import { useParams } from "next/navigation";
import MainLayout from "../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";
import { Link } from "@/i18n/navigation";
import { Scissors, Palmtree, Truck, ArrowRight, TrendingUp, Award, Globe } from "lucide-react";

export default function PartnersPage() {
  const params = useParams();
  const locale = params.locale as string;
  const isAr = locale === "ar";

  return (
    <MainLayout>
      <FadeInSection>
        <div className="bg-[#FAF9F6] text-black min-h-screen py-16 sm:py-24 antialiased selection:bg-black/10">
          <div className="max-w-6xl mx-auto px-6">
            
            {/* Header / Hero */}
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <span className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.28em] text-[#8A8A80] mb-4 block">
                {isAr ? "فرص الشراكة" : "Join the Ecosystem"}
              </span>
              <h1 className="[font-family:var(--font-display)] text-4xl sm:text-6xl font-light tracking-tight text-black mb-6 leading-tight">
                {isAr ? "كن شريكاً لنا في MOTD" : "Partner with MOTD"}
              </h1>
              <p className="[font-family:var(--font-body)] text-[#5A5A56] text-sm sm:text-base leading-relaxed font-light">
                {isAr 
                  ? "انضم إلى منصتنا الفاخرة لربط دور الخياطة الراقية وموردي الأقمشة الاستثنائيين بالعملاء في كافة دول الخليج."
                  : "Connect with discerning clients. Partner with MOTD to list your premium fabrics, tailor bespoke traditional wear, or deliver packages GCC-wide."}
              </p>
            </div>

            {/* Statistics Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-0 bg-white border border-[#EAE6DF] rounded-2xl p-6 sm:p-8 mb-16 text-center sm:divide-x divide-[#EAE6DF] rtl:divide-x-reverse">
              <div className="space-y-1 py-2 sm:py-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-serif font-light text-black flex items-center gap-1.5 justify-center">
                  <TrendingUp className="w-4 h-4 text-[#C9A96E]" />
                  <span>50+</span>
                </div>
                <p className="text-[10px] uppercase tracking-widest text-[#8A8A80] font-mono">
                  {isAr ? "دور خياطة شريكة" : "Partner Boutiques"}
                </p>
              </div>

              <div className="space-y-1 py-2 sm:py-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-serif font-light text-black flex items-center gap-1.5 justify-center">
                  <Award className="w-4 h-4 text-[#C9A96E]" />
                  <span>100%</span>
                </div>
                <p className="text-[10px] uppercase tracking-widest text-[#8A8A80] font-mono">
                  {isAr ? "جودة مضمونة" : "Premium Standards"}
                </p>
              </div>

              <div className="space-y-1 py-2 sm:py-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-serif font-light text-black flex items-center gap-1.5 justify-center">
                  <Globe className="w-4 h-4 text-[#C9A96E]" />
                  <span>GCC</span>
                </div>
                <p className="text-[10px] uppercase tracking-widest text-[#8A8A80] font-mono">
                  {isAr ? "توصيل للخليج" : "GCC Logistics Network"}
                </p>
              </div>
            </div>

            {/* Gateway Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
              
              {/* Tailor Card */}
              <div className="bg-white border border-[#EAE6DF] rounded-2xl p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:border-black/20 group">
                <div className="space-y-6">
                  <div className="w-12 h-12 bg-[#F5F4F0] text-black border border-[#EAE6DF] rounded-xl flex items-center justify-center transition-colors duration-300 group-hover:bg-black group-hover:text-white group-hover:border-black">
                    <Scissors className="w-5 h-5" />
                  </div>
                  
                  <div className="space-y-2 text-left rtl:text-right">
                    <h3 className="[font-family:var(--font-display)] text-2xl font-light text-black tracking-tight">
                      {isAr ? "دور الخياطة والمصممين" : "Tailoring Houses"}
                    </h3>
                    <p className="text-[10px] font-mono tracking-wider text-[#C9A96E] uppercase">
                      {isAr ? "خياطة وتصميم" : "Craftsmanship & Design"}
                    </p>
                  </div>

                  <p className="[font-family:var(--font-body)] text-sm text-[#5A5A56] leading-relaxed font-light text-left rtl:text-right">
                    {isAr 
                      ? "اعرض تصاميمك الفريدة واستقبل طلبات القياس المخصصة من عملاء MOTD."
                      : "Showcase your craftsmanship and receive custom tailoring requests from customers across the region."}
                  </p>
                </div>
                
                <Link 
                  href="/partners/tailor"
                  className="mt-10 w-full py-3 px-4 border border-black text-[10px] tracking-[0.2em] uppercase font-medium text-center transition-all duration-200 hover:bg-black hover:text-white hover:cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>{isAr ? "تقديم طلب خياط" : "Become a Tailor"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Fabric Vendor Card */}
              <div className="bg-white border border-[#EAE6DF] rounded-2xl p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:border-black/20 group">
                <div className="space-y-6">
                  <div className="w-12 h-12 bg-[#F5F4F0] text-black border border-[#EAE6DF] rounded-xl flex items-center justify-center transition-colors duration-300 group-hover:bg-black group-hover:text-white group-hover:border-black">
                    <Palmtree className="w-5 h-5" />
                  </div>
                  
                  <div className="space-y-2 text-left rtl:text-right">
                    <h3 className="[font-family:var(--font-display)] text-2xl font-light text-black tracking-tight">
                      {isAr ? "موردو الأقمشة الفاخرة" : "Fabric Vendors"}
                    </h3>
                    <p className="text-[10px] font-mono tracking-wider text-[#C9A96E] uppercase">
                      {isAr ? "منسوجات راقية" : "Premium Textiles"}
                    </p>
                  </div>

                  <p className="[font-family:var(--font-body)] text-sm text-[#5A5A56] leading-relaxed font-light text-left rtl:text-right">
                    {isAr 
                      ? "اعرض كتالوج الحرير والصوف والكتان والقطن الفاخر لعملائنا في دول الخليج."
                      : "Publish your collection of premium silk, linen, wool, and cotton fabrics to designers and custom buyers."}
                  </p>
                </div>
                
                <Link 
                  href="/partners/fabric"
                  className="mt-10 w-full py-3 px-4 border border-black text-[10px] tracking-[0.2em] uppercase font-medium text-center transition-all duration-200 hover:bg-black hover:text-white hover:cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>{isAr ? "تسجيل بائع أقمشة" : "Register Store"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Shipping Card */}
              <div className="bg-white border border-[#EAE6DF] rounded-2xl p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:border-black/20 group">
                <div className="space-y-6">
                  <div className="w-12 h-12 bg-[#F5F4F0] text-black border border-[#EAE6DF] rounded-xl flex items-center justify-center transition-colors duration-300 group-hover:bg-black group-hover:text-white group-hover:border-black">
                    <Truck className="w-5 h-5" />
                  </div>
                  
                  <div className="space-y-2 text-left rtl:text-right">
                    <h3 className="[font-family:var(--font-display)] text-2xl font-light text-black tracking-tight">
                      {isAr ? "شركاء الخدمات اللوجستية" : "Logistics Partners"}
                    </h3>
                    <p className="text-[10px] font-mono tracking-wider text-[#C9A96E] uppercase">
                      {isAr ? "خدمات شحن" : "GCC Logistics"}
                    </p>
                  </div>

                  <p className="[font-family:var(--font-body)] text-sm text-[#5A5A56] leading-relaxed font-light text-left rtl:text-right">
                    {isAr 
                      ? "ساعدنا في توصيل القطع الفاخرة والقياسات بأمان وسرعة لعملائنا."
                      : "Deliver premium fabrics and custom packages securely and swiftly to customers throughout the GCC."}
                  </p>
                </div>
                
                <Link 
                  href="/partners/shipping"
                  className="mt-10 w-full py-3 px-4 border border-black text-[10px] tracking-[0.2em] uppercase font-medium text-center transition-all duration-200 hover:bg-black hover:text-white hover:cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>{isAr ? "التسجيل كمندوب شحن" : "Apply as Courier"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

            </div>

            {/* Steps Section */}
            <div className="border-t border-[#EAE6DF] pt-16">
              <h2 className="[font-family:var(--font-display)] text-3xl font-light text-black text-center mb-12">
                {isAr ? "كيف تبدأ الشراكة؟" : "The Onboarding Steps"}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-left rtl:text-right">
                <div className="space-y-2">
                  <div className="text-xl font-serif text-[#C9A96E] font-light">01</div>
                  <h4 className="text-base font-semibold text-black">{isAr ? "سجل طلبك" : "Register"}</h4>
                  <p className="text-xs text-[#5A5A56] leading-relaxed font-light">
                    {isAr 
                      ? "شاركنا تفاصيل أعمالك وصوراً لمنتجاتك وخدماتك عبر النموذج."
                      : "Submit your business coordinates and service parameters via our registration portal."}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="text-xl font-serif text-[#C9A96E] font-light">02</div>
                  <h4 className="text-base font-semibold text-black">{isAr ? "الموافقة والتفعيل" : "Verification"}</h4>
                  <p className="text-xs text-[#5A5A56] leading-relaxed font-light">
                    {isAr 
                      ? "سنقوم بمراجعة مستنداتك وتفعيل حسابك لتخصيص متجرك الرقمي."
                      : "Our team reviews alignment and credentials for quality and service compliance."}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="text-xl font-serif text-[#C9A96E] font-light">03</div>
                  <h4 className="text-base font-semibold text-black">{isAr ? "انطلق وبع" : "Publish & Scale"}</h4>
                  <p className="text-xs text-[#5A5A56] leading-relaxed font-light">
                    {isAr 
                      ? "اعرض خدماتك وابدأ في بيع أقمشتك أو خياطة أثواب عملائنا فوراً."
                      : "Fulfill orders and publish custom options to high-value GCC buyers."}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </FadeInSection>
    </MainLayout>
  );
}
