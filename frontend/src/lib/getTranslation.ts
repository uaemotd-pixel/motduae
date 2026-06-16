// for translating login page
import loginEn from "@/messages/login.en.json";
import loginAr from "@/messages/login.ar.json";

// for translating signup page
import signupEn from "@/messages/signup.en.json";
import signupAr from "@/messages/signup.ar.json";

// for translating home page
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";

// for translating ready to wear items page (single detail page + ready to wear info card)
import readyMadeEn from "@/messages/readyMade.en.json";
import readyMadeAr from "@/messages/readyMade.ar.json";

// for translation of checkout page
import checkoutEn from "@/messages/checkout.en.json";
import checkoutAr from "@/messages/checkout.ar.json";

// for translation of admin dashoard
import adminDashboardEn from "@/messages/adminDashboard.en.json";
import adminDashboardAr from "@/messages/adminDashboard.ar.json";
import adminFabricsEn from "@/messages/adminFabrics.en.json";
import adminFabricsAr from "@/messages/adminFabrics.ar.json";

const translations = {
    en: {
        login: loginEn.login,
        signup: signupEn.signup,
        readyToWear: en.ReadyToWear,
        readyMade: readyMadeEn.readyMadeInfoCard,
        checkout: checkoutEn.checkout,
        adminDashboard: adminDashboardEn.create_ready_made,
        editReadyMade: adminDashboardEn.edit_ready_made,
        heroSection: en.HeroSection,
        pendingTailorsData: adminDashboardEn.pendingTailorsData,
        navbar: en.Navbar,
        trendingDesigns: en.TrendingDesigns,
        adminFabrics: adminFabricsEn,
    },
    ar: {
        login: loginAr.login,
        signup: signupAr.signup,
        readyToWear: ar.ReadyToWear,
        readyMade: readyMadeAr.readyMadeInfoCard,
        checkout: checkoutAr.checkout,
        adminDashboard: adminDashboardAr.create_ready_made,
        editReadyMade: adminDashboardAr.edit_ready_made,
        pendingTailorsData: adminDashboardAr.pendingTailorsData,
        heroSection: ar.HeroSection,
        navbar: ar.Navbar,
        trendingDesigns: ar.TrendingDesigns,
        adminFabrics: adminFabricsAr,
    },
};

export const getTranslation = (locale: string) => {
    return translations[locale as keyof typeof translations] || translations.en;
};