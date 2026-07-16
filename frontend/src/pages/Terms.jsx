import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Home_Page/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import { useLang } from "../context/LanguageContext";

const AR_SECTIONS = [
  {
    title: "1. استخدام المنصة",
    points: [
      "يُستخدم Medora كواجهة معلومات وخدمات رقمية، ولا يغني عن الاستشارة الطبية المباشرة في الحالات الحرجة.",
      "يلتزم المستخدم بإدخال بيانات صحيحة وعدم إساءة استخدام المنصة أو تعطيلها.",
    ],
  },
  {
    title: "2. الحساب والمسؤولية",
    points: [
      "أنت مسؤول عن الحفاظ على سرية بيانات حسابك وأي نشاط يتم من خلاله.",
      "قد نوقف أو نقيّد الوصول عند وجود استخدام مخالف أو بيانات مضللة.",
    ],
  },
  {
    title: "3. المحتوى الطبي",
    points: [
      "المحتوى الطبي والتثقيفي هدفه الإرشاد العام فقط.",
      "لا يجب اتخاذ قرارات علاجية نهائية اعتمادًا على المحتوى وحده دون الرجوع لمختص.",
    ],
  },
  {
    title: "4. التواصل والدعم",
    points: [
      "لأي استفسارات، يمكن التواصل عبر info@medora.com.",
    ],
  },
];

const EN_SECTIONS = [
  {
    title: "1. Platform Use",
    points: [
      "Medora provides digital health information and service flows and does not replace urgent medical care.",
      "Users must provide accurate information and must not misuse or disrupt the platform.",
    ],
  },
  {
    title: "2. Accounts and Responsibility",
    points: [
      "You are responsible for maintaining the confidentiality of your account information.",
      "We may suspend or restrict access when misuse or misleading data is detected.",
    ],
  },
  {
    title: "3. Medical Content",
    points: [
      "Medical and educational content is provided for general guidance only.",
      "Final treatment decisions should not rely on platform content alone without consulting a qualified professional.",
    ],
  },
  {
    title: "4. Support",
    points: [
      "For questions, contact info@medora.com.",
    ],
  },
];

export default function Terms() {
  const { t } = useLang();
  const isRtl = t.dir === "rtl";
  const sections = isRtl ? AR_SECTIONS : EN_SECTIONS;

  return (
    <div dir={t.dir} className="min-h-screen bg-[#eef8f8] text-slate-900">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-7 sm:py-9">
        <section className="rounded-3xl border border-slate-200 bg-white px-6 py-7 shadow-[0_10px_30px_rgba(2,8,23,0.05)] sm:px-10 sm:py-8">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e6f7f7]">
              <FileText className="h-6 w-6 text-[#119a8a]" />
            </div>
            <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">
              {isRtl ? "شروط الاستخدام" : "Terms of Use"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {isRtl
                ? "أضفنا نسخة أولية واضحة من شروط الاستخدام حتى تصبح الروابط القانونية الأساسية متاحة."
                : "A first-pass Terms page is now available so the core legal navigation no longer breaks."}
            </p>
          </div>

          <div className="mt-6 space-y-6">
            {sections.map((section) => (
              <div key={section.title}>
                <h2 className="text-lg font-extrabold text-[#0b5e52]">{section.title}</h2>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
                  {section.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <Link
              to="/privacy"
              className="rounded-xl border border-[#119a8a] px-6 py-3 text-sm font-extrabold text-[#119a8a] transition hover:bg-[#e6f7f7]"
            >
              {isRtl ? "الانتقال لسياسة الخصوصية" : "Go to Privacy Policy"}
            </Link>
          </div>
        </section>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
