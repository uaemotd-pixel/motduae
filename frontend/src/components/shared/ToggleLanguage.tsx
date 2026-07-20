// /frontend/src/components/shared/ToggleLanguage.tsx
"use client";

import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";

const ToggleLanguage = () => {
    const pathname = usePathname();
    const router = useRouter();

    const segments = pathname.split("/").filter(Boolean);

    const currentLocale =
        segments[0] === "ar" || segments[0] === "en"
            ? segments[0]
            : "en";

    const switchLanguage = () => {
        const newLocale = currentLocale === "en" ? "ar" : "en";

        segments[0] = newLocale;

        router.push("/" + segments.join("/"));
    };

    const isArabic = currentLocale === "ar";

    return (
        <div className="fixed bottom-6 right-6 z-[9999]">
            <button
                onClick={switchLanguage}
                aria-label="Toggle Language"
                className="
                    relative
                    flex
                    items-center
                    w-[90px]
                    h-[44px]
                    p-1
                    rounded-full
                    border
                    border-[#D7D2C9]
                    bg-gradient-to-b from-[#FFFDF9] to-[#F2EEE8]
                    backdrop-blur-md
                    shadow-lg
                    hover:shadow-xl
                    transition-all
                    duration-300
                    cursor-pointer
                "
            >
                <motion.div
                    layout
                    transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 35,
                    }}
                    className="
                        absolute
                        top-1
                        bottom-1
                        w-[36px]
                        rounded-full
                        bg-black
                    "
                    animate={{
                        x: isArabic ? 44 : 0,
                    }}
                />

                <div className="flex justify-between items-center w-full px-2 relative z-10">
                    <span
                        className={`text-[10px] tracking-[0.18em] font-medium transition-colors duration-300 ${!isArabic
                                ? "text-white"
                                : "text-[#6F6B63]"
                            }`}
                    >
                        EN
                    </span>

                    <span
                        className={`text-[10px] tracking-[0.18em] font-medium transition-colors duration-300 ${isArabic
                                ? "text-white"
                                : "text-[#6F6B63]"
                            }`}
                    >
                        AR
                    </span>
                </div>
            </button>
        </div>
    );
};

export default ToggleLanguage;