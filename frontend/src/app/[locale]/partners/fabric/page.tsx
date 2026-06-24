"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import MainLayout from "../../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";

export default function FabricPartnerPage() {
    const params = useParams();
    const locale = params.locale as string;
    const isAr = locale === "ar";

    const [formSubmitted, setFormSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        storeName: "",
        contactName: "",
        email: "",
        phone: "",
        city: "",
        fabricType: "",
        details: ""
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Submitted fabric vendor request:", formData);
        setFormSubmitted(true);
    };

    return (
        <MainLayout>
            <FadeInSection>
                <div className="bg-[#FFFDF9] min-h-screen py-16 sm:py-24">
                    <div className="max-w-xl mx-auto px-4 sm:px-6">
                        {/* Header */}
                        <div className="text-center mb-12">
                            <span className="[font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.28em] text-[#8A8A80] mb-3 block">
                                {isAr ? "تسجيل بائع أقمشة" : "Merchant Account Registration"}
                            </span>
                            <h1 className="[font-family:var(--font-display)] text-3xl sm:text-4xl font-light tracking-tight text-black mb-4">
                                {isAr ? "سجل كمتجر أقمشة" : "Register as Fabric Vendor"}
                            </h1>
                            <p className="[font-family:var(--font-body)] text-[#5A5A56] text-sm leading-relaxed">
                                {isAr 
                                    ? "املأ النموذج أدناه للتواصل مع فريق الشركاء والبدء في عرض أقمشتك."
                                    : "Submit the registration details below to start selling your premium fabrics on our luxury portal."}
                            </p>
                        </div>

                        {/* Form */}
                        <div className="bg-white border border-[#E8E8E4] rounded-2xl p-6 sm:p-8 shadow-sm">
                            {formSubmitted ? (
                                <div className="text-center py-10 space-y-4">
                                    <h3 className="[font-family:var(--font-display)] text-xl font-normal text-black">
                                        {isAr ? "شكراً لاهتمامك!" : "Thank you for applying!"}
                                    </h3>
                                    <p className="[font-family:var(--font-body)] text-sm text-[#5A5A56]">
                                        {isAr 
                                            ? "تم استلام معلومات متجرك بنجاح. سيقوم فريق علاقات الموردين لدينا بمراجعة طلبك والتواصل معك قريباً."
                                            : "Your application has been received. Our partner relations team will review your proposal and get in touch shortly."}
                                    </p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-5 [font-family:var(--font-body)] text-sm text-black">
                                    <div className="space-y-1">
                                        <label className="text-xs uppercase tracking-wider text-[#5A5A56] block">{isAr ? "اسم المتجر / الشركة" : "Store / Company Name"}</label>
                                        <input 
                                            required
                                            type="text" 
                                            value={formData.storeName}
                                            onChange={(e) => setFormData({...formData, storeName: e.target.value})}
                                            className="w-full h-11 px-4 bg-transparent border border-[#E8E8E4] rounded-lg focus:outline-none focus:border-black"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs uppercase tracking-wider text-[#5A5A56] block">{isAr ? "اسم الشخص المسؤول" : "Contact Person Name"}</label>
                                        <input 
                                            required
                                            type="text" 
                                            value={formData.contactName}
                                            onChange={(e) => setFormData({...formData, contactName: e.target.value})}
                                            className="w-full h-11 px-4 bg-transparent border border-[#E8E8E4] rounded-lg focus:outline-none focus:border-black"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs uppercase tracking-wider text-[#5A5A56] block">{isAr ? "البريد الإلكتروني" : "Email Address"}</label>
                                            <input 
                                                required
                                                type="email" 
                                                value={formData.email}
                                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                                className="w-full h-11 px-4 bg-transparent border border-[#E8E8E4] rounded-lg focus:outline-none focus:border-black"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs uppercase tracking-wider text-[#5A5A56] block">{isAr ? "رقم الهاتف" : "Phone Number"}</label>
                                            <input 
                                                required
                                                type="tel" 
                                                value={formData.phone}
                                                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                                className="w-full h-11 px-4 bg-transparent border border-[#E8E8E4] rounded-lg focus:outline-none focus:border-black text-left"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs uppercase tracking-wider text-[#5A5A56] block">{isAr ? "المدينة والدولة" : "City & Country"}</label>
                                        <input 
                                            required
                                            type="text" 
                                            value={formData.city}
                                            onChange={(e) => setFormData({...formData, city: e.target.value})}
                                            className="w-full h-11 px-4 bg-transparent border border-[#E8E8E4] rounded-lg focus:outline-none focus:border-black"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs uppercase tracking-wider text-[#5A5A56] block">{isAr ? "نوع الأقمشة المتوفرة" : "Types of Fabrics Offered"}</label>
                                        <input 
                                            placeholder="Silk, Linen, Wool, Cotton..."
                                            type="text" 
                                            value={formData.fabricType}
                                            onChange={(e) => setFormData({...formData, fabricType: e.target.value})}
                                            className="w-full h-11 px-4 bg-transparent border border-[#E8E8E4] rounded-lg focus:outline-none focus:border-black"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs uppercase tracking-wider text-[#5A5A56] block">{isAr ? "تفاصيل إضافية" : "Additional Proposal Details"}</label>
                                        <textarea 
                                            rows={4}
                                            value={formData.details}
                                            onChange={(e) => setFormData({...formData, details: e.target.value})}
                                            className="w-full p-4 bg-transparent border border-[#E8E8E4] rounded-lg focus:outline-none focus:border-black resize-none"
                                        />
                                    </div>

                                    <button 
                                        type="submit" 
                                        className="w-full h-12 bg-black text-white text-xs uppercase tracking-widest hover:bg-black/90 transition duration-300 font-semibold cursor-pointer"
                                    >
                                        {isAr ? "تقديم طلب التسجيل" : "Submit Registration"}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </FadeInSection>
        </MainLayout>
    );
}
