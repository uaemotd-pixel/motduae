import type { ReactNode } from "react";
import "./globals.css";

type Props = {
  children: ReactNode;
};

// Next.js 16 requires <html> and <body> on the root layout.
// Locale-specific lang/dir is applied on the client by RTLProvider.
export default function RootLayout({ children }: Props) {
  return (
    <html
      lang="en"
      dir="ltr"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="bg-white text-[#000000]" suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=location.pathname.split("/").filter(Boolean)[0];var l=s==="ar"?"ar":"en";document.documentElement.lang=l;document.documentElement.dir=l==="ar"?"rtl":"ltr";}catch(e){}})();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
