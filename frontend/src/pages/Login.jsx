import Logo from "../assets/images/Logo.png";
import { useLang } from "../context/LanguageContext";
import LoginForm from "../components/auth/LoginForm";
import LangToggleBtn from "../components/LangToggleBtn";
import { useSEO } from "../hooks/useSEO";

export default function Login() {
  const { t } = useLang();
  useSEO({ title: "تسجيل الدخول", description: "سجّل دخولك إلى ميدورا للوصول إلى حجوزاتك الطبية واستشاراتك." });
  return (
    <div dir={t.dir} className="min-h-dvh flex items-center justify-center px-4 py-4" style={{ background: 'linear-gradient(180deg, #e6f7f7 0%, #f0fdfa 60%, #fff 100%)' }}>
      <LangToggleBtn variant="float" />
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2">
            <img src={Logo} alt="Medora Logo" className="h-13 w-13 object-contain" />
            <div className="text-3xl font-extrabold text-[#0b5e52]">{t.brand}</div>
          </div>
          <h1 className="mt-2 text-xl font-extrabold text-slate-900">{t.login_title}</h1>
          <p className="mt-1 text-xs text-slate-600">{t.login_welcome}</p>
        </div>
        {/* Form Card */}
        <div className="rounded-2xl bg-white shadow-lg border border-slate-100 p-5">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}