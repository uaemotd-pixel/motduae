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
      <main className="pt-[calc(var(--nav-height)+var(--safe-top))] min-w-0 overflow-x-clip">
        {children}
      </main>
      <Footer />
      <ScrollToTop />
    </>
  );
}
