import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import ScrollToTop from "@/components/shared/ScrollToTop";

type Props = {
  children: React.ReactNode;
};

export default function MainLayout({ children }: Props) {
  return (
    <>
      <Navbar />
      <main className="pt-18 md:pt-20">{children}</main>
      <Footer />
      <ScrollToTop />
    </>
  );
}
