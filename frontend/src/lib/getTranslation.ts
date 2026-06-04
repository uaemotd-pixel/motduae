import loginEn from "@/messages/login.en.json";
import loginAr from "@/messages/login.ar.json";

import signupEn from "@/messages/signup.en.json";
import signupAr from "@/messages/signup.ar.json";

import ar from "@/messages/ar.json";
import en from "@/messages/en.json";

const translations = {
    en: {
        login: loginEn.login,
        signup: signupEn.signup,
        readyToWear: en.ReadyToWear,
    },
    ar: {
        login: loginAr.login,
        signup: signupAr.signup,
        readyToWear: ar.ReadyToWear,
    },
};

export const getTranslation = (locale: string) => {
    return translations[locale as keyof typeof translations] || translations.en;
};