import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
    title: "MOTD - Master of the Day",
    description: "Bespoke Eastern luxury tailored for the modern world",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
            <body className="bg-[#FFFDF9] text-[#000000]">
                {children}
            </body>
        </html>
    );
}