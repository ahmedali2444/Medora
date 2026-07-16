import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useLang } from "../context/LanguageContext";
import Logo from "../assets/images/Logo.png";
import LangToggleBtn from "../components/LangToggleBtn";
import { medoraApi } from "../api/medoraApi";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    const v = value.trim();

    if (!v) {
      setError(t.forgot_err_empty);
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(v)) {
      setError(t.dir === "rtl"
        ? "إعادة تعيين كلمة المرور تتم بالإيميل فقط حالياً"
        : "Password reset is currently only supported via email");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await medoraApi.forgotPassword({ email: v });
      navigate("/otp", { state: { flow: "reset", identifier: v } });
    } catch (err) {
      setLoading(false);
      setError(err.message || "Request failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#f0fdfa] px-4">
      <LangToggleBtn variant="float" />
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-160 text-center">
          <div className="flex items-center justify-center gap-3 mb-6 sm:mb-8">
            <img
              src={Logo}
              alt="Medora"
              className="h-9 w-9 sm:h-10 sm:w-10 object-contain"
            />
            <span className="text-2xl sm:text-3xl font-extrabold text-[#0b5e52]">
              {t.forgot_brand}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900">
            {t.forgot_title}
          </h1>
          <p className="mt-2 sm:mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
            {t.forgot_sub}
          </p>

          <form onSubmit={onSubmit} className="mt-8 sm:mt-10 mx-auto w-full max-w-130">
            {!!error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-start text-xs font-semibold text-red-700">
                {error}
              </div>
            )}

            <div className="text-start">
              <label className="block text-xs font-semibold text-slate-700">
                {t.forgot_label}
              </label>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                className="mt-2 w-full h-11 sm:h-12 rounded-xl border border-slate-200 bg-white px-4 text-start text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#14b8a6]"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={t.forgot_ph}
                dir="ltr"
              />
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="h-11 sm:h-12 px-6 rounded-xl bg-[#119a8a] text-white font-extrabold text-sm sm:text-base hover:bg-[#0e7c6e] transition disabled:opacity-60"
              >
                {loading ? "..." : t.forgot_send}
              </button>

              <Link
                to="/sign-in"
                className="h-11 sm:h-12 px-6 rounded-xl border border-[#14b8a6] text-[#14b8a6] font-extrabold text-sm sm:text-base flex items-center justify-center hover:bg-[#e6f7f7] transition"
              >
                {t.forgot_back}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
