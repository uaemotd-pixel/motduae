import type { Metadata } from "next";
import "./globals.css";
import { EXTENSION_HYDRATION_GUARD_SCRIPT } from "@/lib/extension-hydration-guard";
import { AuthProvider } from "@/context/AuthContext";
// import ToggleLanguage from "../components/shared/ToggleLanguage";

export const metadata: Metadata = {
  title: "MOTD — Mukhawar of the Day",
  description: "Mukhawar of the Day — bespoke Eastern luxury tailored for the modern world",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: EXTENSION_HYDRATION_GUARD_SCRIPT,
          }}
        />
      </head>
      <body
        className="bg-[#FFFDF9] text-[#000000]"
        suppressHydrationWarning
      >
        <AuthProvider>
          {children}
          {/* <ToggleLanguage /> */}
        </AuthProvider>
      </body>
    </html>
  );
}
