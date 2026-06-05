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

const translations = {
    en: {
        login: loginEn.login,
        signup: signupEn.signup,
        readyToWear: en.ReadyToWear,
        readyMade: readyMadeEn.readyMadeInfoCard,
    },
    ar: {
        login: loginAr.login,
        signup: signupAr.signup,
        readyToWear: ar.ReadyToWear,
        readyMade: readyMadeAr.readyMadeInfoCard
    },
};

export const getTranslation = (locale: string) => {
    return translations[locale as keyof typeof translations] || translations.en;
};