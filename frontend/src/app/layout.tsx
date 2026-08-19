// src/app/layout.tsx
import { AuthGoogleProvider } from "@/components/auth/AuthGoogleProvider";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { CustomOrderProvider } from "@/context/CustomOrderContext";
import { RTLProvider } from "@/components/shared/RTLProvider";
import { Toaster } from "react-hot-toast";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* <script
          dangerouslySetInnerHTML={{
            __html: EXTENSION_HYDRATION_GUARD_SCRIPT,
          }}
        /> */}
      </head>
      <body className="bg-white text-[#000000]" suppressHydrationWarning>
        <AuthGoogleProvider>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <CustomOrderProvider>
                  <RTLProvider>{children}</RTLProvider>
                  <Toaster
                    position="top-right"
                    toastOptions={{
                      style: {
                        fontFamily: "var(--font-body)",
                        fontSize: "12px",
                        letterSpacing: "0.24em",
                        textTransform: "uppercase",
                        borderRadius: "8px",
                        padding: "12px 18px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                      },
                      success: {
                        style: {
                          background: "#f0fdf4",
                          color: "#166534",
                          border: "1px solid #86efac",
                        },
                        iconTheme: {
                          primary: "#16a34a",
                          secondary: "#ffffff",
                        },
                      },
                      error: {
                        style: {
                          background: "#fef2f2",
                          color: "#991b1b",
                          border: "1px solid #fca5a5",
                        },
                        iconTheme: {
                          primary: "#dc2626",
                          secondary: "#ffffff",
                        },
                      },
                    }}
                  />
                </CustomOrderProvider>
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </AuthGoogleProvider>
      </body>
    </html>
  );
}
