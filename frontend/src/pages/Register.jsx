import Logo from "../assets/images/Logo.png";
import { useLang } from "../context/LanguageContext";
import RegisterForm from "../components/auth/RegisterForm";
import LangToggleBtn from "../components/LangToggleBtn";
import { useSEO } from "../hooks/useSEO";

export default function Register() {
  const { t } = useLang();
  useSEO({ title: "إنشاء حساب", description: "سجّل حسابك في ميدورا كمريض أو طبيب أو صيدلي وابدأ استخدام خدماتنا الطبية المتكاملة." });
  return (
    <div dir={t.dir} className="min-h-dvh bg-linear-to-b from-[#eef7f7] via-[#f6fbfb] to-white">
      <LangToggleBtn variant="float" />
      <div className="mx-auto max-w-xl px-3 py-3 sm:px-4 sm:py-5">
        <header className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <img src={Logo} alt="Medora Logo" className="h-6 w-6 object-contain" />
            <div className="text-base font-extrabold text-[#0ea5a5]">{t.brand}</div>
          </div>
          <h1 className="mt-1 text-sm sm:text-base font-extrabold text-slate-900">{t.reg_title}</h1>
          <p className="mt-0.5 text-[9px] sm:text-[10px] text-slate-600">{t.reg_subtitle}</p>
        </header>
        <main className="mt-2">
          <div className="rounded-md bg-white shadow border border-slate-100 p-2.5 sm:p-4">
            <RegisterForm />
          </div>
        </main>
      </div>
    </div>
  );
}