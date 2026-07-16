import { Link } from "react-router-dom";
import { useLang } from "../context/LanguageContext";
import Logo from "../assets/images/Logo.png";

export default function NotFound() {
    const { t } = useLang();
    return (
        <div dir={t.dir} className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(180deg, #e6f7f7 0%, #f0fdfa 60%, #fff 100%)' }}>
            <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-6">
                    <img src={Logo} alt="Medora" className="h-10 w-10 object-contain" />
                    <div className="text-2xl font-extrabold text-[#0b5e52]">{t.brand}</div>
                </div>
                <div className="text-8xl font-extrabold text-[#14b8a6] mb-4">404</div>
                <h1 className="text-2xl font-extrabold text-slate-900 mb-2">
                    {t.dir === "rtl" ? "الصفحة غير موجودة" : "Page Not Found"}
                </h1>
                <p className="text-slate-500 text-sm mb-8">
                    {t.dir === "rtl" ? "الرابط الذي تبحث عنه غير موجود أو تم نقله." : "The link you're looking for doesn't exist or has been moved."}
                </p>
                <Link to="/"
                    className="inline-flex items-center justify-center h-11 px-8 rounded-xl bg-[#0b5e52] text-white font-extrabold hover:bg-[#084036] transition text-sm">
                    {t.dir === "rtl" ? "← العودة للرئيسية" : "← Back to Home"}
                </Link>
            </div>
        </div>
    );
}
