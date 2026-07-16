import Navbar from "../components/Navbar";
import Hero from "../components/Home_Page/Hero";
import Services from "../components/Home_Page/Services";
import HowItWorks from "../components/Home_Page/HowItWorks";
import Stats from "../components/Home_Page/Stats";
import Testimonials from "../components/Home_Page/Testimonials";
import CTA from "../components/Home_Page/CTA";
import Footer from "../components/Home_Page/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import { useSEO } from "../hooks/useSEO";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { isAuthenticated } = useAuth();

  useSEO({
    title: "الرئيسية",
    description: "ميدورا - منصتك الطبية الشاملة. احجز مواعيد مع أفضل الأطباء، ابحث عن الأدوية، واحصل على استشارات طبية فورية عبر الإنترنت.",
    keywords: "ميدورا, طبيب, حجز موعد, صيدلية, أدوية, استشارة طبية",
  });
  return (
    <div className="min-h-screen bg-[#eaf3f4] text-slate-900">
      <Navbar />

      <main>
        <Hero />
        <Services />
        <HowItWorks />
        <Stats />
        <Testimonials />
        {!isAuthenticated && <CTA />}
      </main>

      <Footer />
      <MobileBottomNav /> 
    </div>
  );
}
