"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import MainLayout from "../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";
import toast from "react-hot-toast";
import { Mail, Phone, Loader2, Send } from "lucide-react";
import { api } from "@/lib/api/client";

export default function ContactUsPage() {
  const params = useParams();
  const locale = params.locale as string;
  const isAr = locale === "ar";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.subject.trim() ||
      !formData.message.trim()
    ) {
      toast.error(
        isAr
          ? "يرجى ملء جميع الحقول المطلوبة."
          : "Please fill in all required fields.",
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error(
        isAr
          ? "يرجى إدخال بريد إلكتروني صحيح."
          : "Please enter a valid email address.",
      );
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/users/contact", formData);
      toast.success(
        isAr
          ? "تم إرسال رسالتك بنجاح! سنتواصل معك قريبًا."
          : "Your message was sent successfully! We will contact you soon.",
      );
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      toast.error(
        isAr
          ? "فشل إرسال الرسالة. يرجى المحاولة لاحقًا."
          : "Failed to send message. Please try again later.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <FadeInSection>
        <div className="bg-[#FFFDF9] min-h-screen py-16 sm:py-24">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <span className="[font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.28em] text-[#8A8A80] mb-3 block">
                {isAr ? "تواصل معنا" : "GET IN TOUCH"}
              </span>
              <h1 className="[font-family:var(--font-display)] text-4xl sm:text-5xl font-light tracking-tight text-black mb-4">
                {isAr
                  ? "يسعدنا دائمًا سماع رأيك"
                  : "We'd Love to Hear From You"}
              </h1>
              <p className="[font-family:var(--font-body)] text-[#5A5A56] max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
                {isAr
                  ? "لديك استفسار حول تفصيل المخوّرات أو الأقمشة؟ لا تتردد في مراسلتنا وسيرد عليك فريق الدعم في أقرب وقت."
                  : "Have a question about fabric sourcing, custom measurements, or design tailoring? Contact us and our support team will respond shortly."}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
              <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6 self-start">
                <div className="bg-white border border-[#E8E8E4] rounded-2xl p-8 space-y-8 shadow-sm">
                  <h3 className="[font-family:var(--font-display)] text-xl font-normal text-black pb-4 border-b border-[#E8E8E4]">
                    {isAr ? "معلومات الاتصال" : "Contact Information"}
                  </h3>

                  <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 bg-black/5 rounded-full flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5 text-black" />
                    </div>
                    <div className="space-y-1">
                      <span className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-wider text-[#8A8A80] block">
                        {isAr ? "البريد الإلكتروني" : "EMAIL ADDRESS"}
                      </span>
                      <a
                        href="mailto:uaemotd@gmail.com"
                        className="text-sm sm:text-base font-medium text-black hover:opacity-70 transition-opacity decoration-1"
                      >
                        uaemotd@gmail.com
                      </a>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 bg-black/5 rounded-full flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5 text-black" />
                    </div>
                    <div className="space-y-1">
                      <span className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-wider text-[#8A8A80] block">
                        {isAr ? "رقم الهاتف" : "PHONE NUMBER"}
                      </span>
                      <a
                        href="tel:+971569722533"
                        className="text-sm sm:text-base font-medium text-black hover:opacity-70 transition-opacity decoration-1"
                      >
                        +971 56 972 2533
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 bg-white border border-[#E8E8E4] rounded-2xl p-8 shadow-sm">
                <h3 className="[font-family:var(--font-display)] text-xl font-normal text-black pb-4 border-b border-[#E8E8E4] mb-6">
                  {isAr ? "أرسل لنا رسالة" : "Send Us a Message"}
                </h3>

                <form
                  onSubmit={handleSubmit}
                  className="space-y-5 [font-family:var(--font-body)]"
                >
                  <div className="space-y-2">
                    <label
                      htmlFor="name"
                      className="text-xs uppercase tracking-wider font-semibold text-[#5A5A56] block"
                    >
                      {isAr ? "الاسم الكامل" : "Full Name"}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      disabled={loading}
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder={
                        isAr ? "أدخل اسمك الكريم..." : "Enter your full name..."
                      }
                      className="w-full h-11 px-4 bg-[#FFFDF9] border border-[#E8E8E4] rounded-xl focus:outline-none focus:border-black text-sm text-black transition-colors disabled:opacity-50"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="email"
                      className="text-xs uppercase tracking-wider font-semibold text-[#5A5A56] block"
                    >
                      {isAr ? "البريد الإلكتروني" : "Email Address"}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      disabled={loading}
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder={
                        isAr ? "example@domain.com" : "example@domain.com"
                      }
                      className="w-full h-11 px-4 bg-[#FFFDF9] border border-[#E8E8E4] rounded-xl focus:outline-none focus:border-black text-sm text-black transition-colors disabled:opacity-50"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="subject"
                      className="text-xs uppercase tracking-wider font-semibold text-[#5A5A56] block"
                    >
                      {isAr ? "موضوع الرسالة" : "Subject"}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="subject"
                      disabled={loading}
                      value={formData.subject}
                      onChange={(e) =>
                        setFormData({ ...formData, subject: e.target.value })
                      }
                      placeholder={
                        isAr
                          ? "عن ماذا تريد الاستفسار؟"
                          : "What is this inquiry about?"
                      }
                      className="w-full h-11 px-4 bg-[#FFFDF9] border border-[#E8E8E4] rounded-xl focus:outline-none focus:border-black text-sm text-black transition-colors disabled:opacity-50"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="message"
                      className="text-xs uppercase tracking-wider font-semibold text-[#5A5A56] block"
                    >
                      {isAr ? "الرسالة" : "Your Message"}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="message"
                      disabled={loading}
                      rows={5}
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                      placeholder={
                        isAr
                          ? "اكتب تفاصيل رسالتك هنا..."
                          : "Type your message here..."
                      }
                      className="w-full p-4 bg-[#FFFDF9] border border-[#E8E8E4] rounded-xl focus:outline-none focus:border-black text-sm text-black transition-colors resize-none disabled:opacity-50"
                      required
                    ></textarea>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full sm:w-auto px-6 py-3 bg-black text-white hover:opacity-80 transition font-normal text-xs uppercase tracking-[0.2em] rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>{isAr ? "جاري الإرسال..." : "Sending..."}</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 text-white" />
                          <span>{isAr ? "إرسال الرسالة" : "Send Message"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </FadeInSection>
    </MainLayout>
  );
}
