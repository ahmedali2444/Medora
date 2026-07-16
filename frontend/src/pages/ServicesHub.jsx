import {
  ArrowLeft,
  ArrowRight,
  Bot,
  HeartPulse,
  Newspaper,
  Pill,
  Search,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Store,
} from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "../components/Home_Page/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import Navbar from "../components/Navbar";
import { useLang } from "../context/LanguageContext";
import { useSEO } from "../hooks/useSEO";

export default function ServicesHub() {
  const { t } = useLang();
  const isRtl = t.dir === "rtl";
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  useSEO({
    title: t.service_hub_seo_title,
    description: t.service_hub_seo_description,
    keywords: isRtl
      ? "خدمات ميدورا, طبيب, حجز موعد, دواء, صيدلية, مساعد طبي"
      : "Medora services, doctors, appointments, medicine, pharmacy, medical assistant",
  });

  const services = [
    {
      title: t.service_hub_doctor_title,
      description: t.service_hub_doctor_desc,
      action: t.service_hub_doctor_action,
      path: "/doctors",
      Icon: Stethoscope,
      color: "#0e7c6e",
      iconBg: "#e6f7f7",
    },
    {
      title: t.service_hub_medicine_title,
      description: t.service_hub_medicine_desc,
      action: t.service_hub_medicine_action,
      path: "/medicine",
      Icon: Pill,
      color: "#2563a7",
      iconBg: "#edf6ff",
    },
    {
      title: t.service_hub_pharmacy_title,
      description: t.service_hub_pharmacy_desc,
      action: t.service_hub_pharmacy_action,
      path: "/medicine/pharmacies",
      Icon: Store,
      color: "#8a5a18",
      iconBg: "#fff7e8",
    },
    {
      title: t.service_hub_ai_title,
      description: t.service_hub_ai_desc,
      action: t.service_hub_ai_action,
      path: "/ai-consultation",
      Icon: Bot,
      color: "#6d4db3",
      iconBg: "#f4efff",
    },
    {
      title: t.service_hub_articles_title,
      description: t.service_hub_articles_desc,
      action: t.service_hub_articles_action,
      path: "/articles",
      Icon: Newspaper,
      color: "#b24d64",
      iconBg: "#fff0f3",
    },
  ];

  const guidance = [
    {
      title: t.service_hub_guide_symptoms_title,
      description: t.service_hub_guide_symptoms_desc,
      path: "/doctors",
      Icon: HeartPulse,
    },
    {
      title: t.service_hub_guide_medicine_title,
      description: t.service_hub_guide_medicine_desc,
      path: "/medicine/pharmacies",
      Icon: Search,
    },
    {
      title: t.service_hub_guide_question_title,
      description: t.service_hub_guide_question_desc,
      path: "/ai-consultation",
      Icon: Bot,
    },
  ];

  return (
    <div dir={t.dir} className="min-h-screen bg-[#f3fafa] text-slate-900">
      <Navbar />

      <main className="overflow-hidden pb-20 md:pb-0">
        <section className="relative overflow-hidden bg-[#2f7f7f] text-white">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-24 -top-28 h-96 w-96 rounded-full bg-white/8 blur-2xl" />
            <div className="absolute -bottom-36 -left-20 h-96 w-96 rounded-full bg-[#14b8a6]/25 blur-3xl" />
            <div className="absolute left-1/2 top-12 h-40 w-40 -translate-x-1/2 rounded-full border border-white/10" />
          </div>

          <div className="relative mx-auto max-w-6xl px-4 py-8 text-center sm:px-6 sm:py-10 lg:py-12">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white/95 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              {t.service_hub_badge}
            </div>
            <h1 className="mx-auto mt-4 max-w-4xl text-2xl font-black leading-tight sm:text-3xl lg:text-4xl">
              {t.service_hub_title}
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-xs leading-6 text-white/85 sm:text-sm">
              {t.service_hub_subtitle}
            </p>
          </div>
        </section>

        <section className="relative mx-auto max-w-6xl px-4 pb-12 pt-7 sm:px-6 sm:pb-16 sm:pt-9">
          <div className="mb-8 flex flex-col items-center text-center">
            <h2 className="text-2xl font-black text-[#084036] sm:text-3xl">
              {t.service_hub_section_title}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Link
                key={service.path}
                to={service.path}
                aria-label={`${service.title}: ${service.action}`}
                className="group flex h-full min-h-[285px] flex-col rounded-[28px] border border-[#dcebea] bg-white p-6 shadow-[0_12px_32px_rgba(8,64,54,0.07)] outline-none transition duration-300 hover:-translate-y-1.5 hover:border-[#14b8a6]/60 hover:shadow-[0_20px_45px_rgba(8,64,54,0.13)] focus-visible:ring-4 focus-visible:ring-[#14b8a6]/25"
              >
                <div className="flex items-start justify-between gap-4">
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-[20px] transition duration-300 group-hover:scale-105"
                    style={{ backgroundColor: service.iconBg, color: service.color }}
                  >
                    <service.Icon className="h-8 w-8" strokeWidth={1.9} />
                  </div>
                  <span className="rounded-full border border-[#e1eeee] bg-[#f7fbfb] px-3 py-1 text-[10px] font-extrabold text-[#5e7d7e]">
                    {t.service_hub_available}
                  </span>
                </div>

                <h3 className="mt-6 text-xl font-black text-[#123f42]">{service.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">{service.description}</p>

                <span
                  className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold transition group-hover:gap-3"
                  style={{ color: service.color }}
                >
                  {service.action}
                  <ArrowIcon className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="border-y border-[#dcebea] bg-white/70">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e6f7f7] text-[#119a8a]">
                <Sparkles className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-2xl font-black text-[#084036] sm:text-3xl">
                {t.service_hub_guide_title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {t.service_hub_guide_subtitle}
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {guidance.map((item) => (
                <Link
                  key={item.title}
                  to={item.path}
                  className="group flex min-h-[118px] items-center gap-4 rounded-2xl border border-[#dcebea] bg-white p-5 outline-none transition hover:border-[#14b8a6] hover:shadow-[0_12px_30px_rgba(8,64,54,0.08)] focus-visible:ring-4 focus-visible:ring-[#14b8a6]/25"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eaf8f6] text-[#119a8a]">
                    <item.Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-[#123f42]">{item.title}</h3>
                    <p className="mt-1 text-xs leading-6 text-slate-600">{item.description}</p>
                  </div>
                  <ArrowIcon className="h-4 w-4 shrink-0 text-[#119a8a] transition group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>

            <div className="mt-8 flex items-start gap-4 rounded-2xl border border-amber-200/80 bg-amber-50/80 p-5 text-start">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-black text-amber-950">{t.service_hub_emergency_title}</h3>
                <p className="mt-1 text-xs leading-6 text-amber-900/75 sm:text-sm">
                  {t.service_hub_emergency_desc}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
