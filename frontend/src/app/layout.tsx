import type { Metadata } from "next";
import "./globals.css";
import { EXTENSION_HYDRATION_GUARD_SCRIPT } from "@/lib/extension-hydration-guard";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { CustomOrderProvider } from "@/context/CustomOrderContext";
import { Toaster } from "react-hot-toast";

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
          <CartProvider>
            <CustomOrderProvider>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: '#000',
                  color: '#fff',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '12px',
                  letterSpacing: '0.24em',
                  textTransform: 'uppercase',
                  borderRadius: '0',
                  padding: '12px 16px',
                  border: '1px solid #333',
                },
                success: { iconTheme: { primary: '#fff', secondary: '#000' } },
                error: { iconTheme: { primary: '#ff4444', secondary: '#000' } },
              }}
            />
            </CustomOrderProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
