"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import MainLayout from "../../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";

export default function ShippingPartnerPage() {
    const params = useParams();
    const locale = params.locale as string;
    const isAr = locale === "ar";

    const [formSubmitted, setFormSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        companyName: "",
        contactName: "",
        email: "",
        phone: "",
        coverage: "",
        details: ""
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Submitted shipping partner request:", formData);
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
                                {isAr ? "شركاء الخدمات اللوجستية" : "Logistics & Delivery Partners"}
                            </span>
                            <h1 className="[font-family:var(--font-display)] text-3xl sm:text-4xl font-light tracking-tight text-black mb-4">
                                {isAr ? "سجل كشريك شحن" : "Apply as Shipping Partner"}
                            </h1>
                            <p className="[font-family:var(--font-body)] text-[#5A5A56] text-sm leading-relaxed">
                                {isAr 
                                    ? "املأ النموذج أدناه للتواصل معنا وبدء الشراكة لنقل الطرود والأقمشة والقياسات المخصصة."
                                    : "Fill in the form below to initiate a partnership for delivering fabrics and custom tailoring packages."}
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
                                            ? "تم استلام معلومات شريك الشحن بنجاح. سيقوم فريق الخدمات اللوجستية لدينا بالرد على استفسارك قريباً."
                                            : "Your inquiry has been received. Our logistics team will review your courier credentials and follow up soon."}
                                    </p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-5 [font-family:var(--font-body)] text-sm text-black">
                                    <div className="space-y-1">
                                        <label className="text-xs uppercase tracking-wider text-[#5A5A56] block">{isAr ? "اسم شركة الشحن" : "Courier / Company Name"}</label>
                                        <input 
                                            required
                                            type="text" 
                                            value={formData.companyName}
                                            onChange={(e) => setFormData({...formData, companyName: e.target.value})}
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
                                        <label className="text-xs uppercase tracking-wider text-[#5A5A56] block">{isAr ? "منطقة التغطية اللوجستية" : "Delivery Coverage Areas"}</label>
                                        <input 
                                            placeholder="Dubai only, UAE nationwide, GCC GCC-wide..."
                                            type="text" 
                                            value={formData.coverage}
                                            onChange={(e) => setFormData({...formData, coverage: e.target.value})}
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
                                        {isAr ? "تقديم طلب الشراكة" : "Submit Courier Inquiry"}
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
