"use client";

import { useParams } from "next/navigation";
import MainLayout from "../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";
import { openCookiePreferences } from "@/components/analytics/CookieConsentBanner";

export default function CookiesPage() {
  const params = useParams();
  const locale = params.locale as string;
  const isAr = locale === "ar";

  return (
    <MainLayout>
      <FadeInSection>
        <div className="bg-[#FFFDF9] min-h-screen py-16 sm:py-24">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="border-b border-[#E8E8E4] pb-10 mb-12">
              <span className="[font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.28em] text-[#8A8A80] mb-3 block">
                {isAr ? "السياسات والخصوصية" : "Legal & Privacy"}
              </span>
              <h1 className="[font-family:var(--font-display)] text-4xl sm:text-5xl font-light tracking-tight text-black mb-4">
                {isAr ? "سياسة ملفات تعريف الارتباط" : "Cookies Policy"}
              </h1>
              <p className="[font-family:var(--font-ui)] text-[#8A8A80] text-xs uppercase tracking-wider">
                {isAr ? "آخر تحديث: أغسطس 2026" : "Last updated: August 2026"}
              </p>
            </div>

            <div className="space-y-10 [font-family:var(--font-body)] text-[#5A5A56] text-sm sm:text-base leading-relaxed">
              <section className="space-y-4">
                <h2 className="[font-family:var(--font-display)] text-xl sm:text-2xl text-black font-normal">
                  {isAr ? "1. ما هي ملفات تعريف الارتباط؟" : "1. What Are Cookies?"}
                </h2>
                <p>
                  {isAr
                    ? "ملفات تعريف الارتباط هي ملفات نصية صغيرة تُخزَّن على جهازك عند زيارة موقعنا. قد نستخدم أيضاً تقنيات مشابهة مثل التخزين المحلي للمتصفح لتذكر الجلسة والتفضيلات."
                    : "Cookies are small text files stored on your device when you visit our website. We may also use similar technologies such as browser local storage to remember session and preference data."}
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="[font-family:var(--font-display)] text-xl sm:text-2xl text-black font-normal">
                  {isAr ? "2. ملفات أساسية (ضرورية)" : "2. Essential Cookies"}
                </h2>
                <p>
                  {isAr
                    ? "هذه مطلوبة لتشغيل المنصة ولا يمكن تعطيلها من لافتة الموافقة دون التأثير على الوظائف الأساسية:"
                    : "These are required to run the platform and cannot be turned off via the consent banner without breaking core features:"}
                </p>
                <ul className="list-disc ps-5 space-y-2">
                  <li>
                    <span className="text-black">motd_auth</span>
                    {isAr
                      ? " — ملف تعريف ارتباط آمن (httpOnly) لجلسة تسجيل الدخول."
                      : " — secure httpOnly cookie for your signed-in session."}
                  </li>
                  <li>
                    <span className="text-black">motd_cookie_consent</span>
                    {isAr
                      ? " — تخزين محلي يحفظ اختيارك بشأن ملفات التحليلات."
                      : " — local storage that remembers your analytics preference."}
                  </li>
                  <li>
                    {isAr
                      ? "بيانات السلة والمفضلة ومسودة الطلب المخصص في التخزين المحلي/الجلسة لتشغيل التسوق."
                      : "Cart, wishlist, and custom-order draft data in local/session storage to power shopping flows."}
                  </li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="[font-family:var(--font-display)] text-xl sm:text-2xl text-black font-normal">
                  {isAr ? "3. ملفات التحليلات (اختيارية)" : "3. Analytics Cookies (Optional)"}
                </h2>
                <p>
                  {isAr
                    ? "نستخدم Google Analytics 4 فقط بعد موافقتك. تساعدنا على فهم زيارات الصفحات وتحسين التجربة. إذا رفضت، لن نحمّل أدوات التحليلات."
                    : "We use Google Analytics 4 only after you consent. It helps us understand page visits and improve the experience. If you choose Essential only, analytics scripts are not loaded."}
                </p>
                <ul className="list-disc ps-5 space-y-2">
                  <li>
                    <span className="text-black">_ga</span> /{" "}
                    <span className="text-black">_ga_*</span>
                    {isAr
                      ? " — تمييز الزيارات بشكل مجهول تقريباً عبر الجلسات."
                      : " — distinguish visits in a near-anonymous way across sessions."}
                  </li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="[font-family:var(--font-display)] text-xl sm:text-2xl text-black font-normal">
                  {isAr ? "4. إدارة تفضيلاتك" : "4. Managing Your Preferences"}
                </h2>
                <p>
                  {isAr
                    ? "يمكنك تحديث اختيار التحليلات في أي وقت. تعطيل ملفات المتصفح الأساسية يدوياً قد يؤثر على تسجيل الدخول وسلة التسوق."
                    : "You can update your analytics choice at any time. Manually blocking essential browser cookies may affect sign-in and cart functionality."}
                </p>
                <button
                  type="button"
                  onClick={() => openCookiePreferences()}
                  className="[font-family:var(--font-ui)] mt-2 border border-black px-5 py-3 text-[11px] uppercase tracking-[0.22em] text-black transition-colors hover:bg-black hover:text-white"
                >
                  {isAr ? "إدارة تفضيلات ملفات الارتباط" : "Manage cookie preferences"}
                </button>
              </section>
            </div>
          </div>
        </div>
      </FadeInSection>
    </MainLayout>
  );
}
