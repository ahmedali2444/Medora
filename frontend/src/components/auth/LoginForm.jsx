import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useLang } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { medoraApi } from "../../api/medoraApi";
import SocialAuthButtons from "./SocialAuthButtons";
import { getUserDestination } from "../../utils/userDestination";

export default function LoginForm() {
  const navigate = useNavigate();
  const { t } = useLang();
  const { login } = useAuth();

  // BUG-F4: use plain useState (no localStorage persistence) so email is never stored
  const [form, setForm] = useState({ email: "", password: "", remember: false });
  const [ui, setUi] = useState({ loading: false, error: "" });
  const [showPass, setShowPass] = useState(false);

  const textAlign = t.dir === "rtl" ? "text-right" : "text-left";
  const label = `block ${textAlign} text-xs font-semibold text-slate-700`;
  // font-size 16px على الموبايل يمنع الـ zoom-in لما المستخدم يضغط على الـ input
  const input = `mt-1.5 w-full h-10 sm:h-11 rounded-xl border border-slate-200 bg-white px-4 ${textAlign} text-[16px] sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#14b8a6] transition`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = form.email.trim();
    const password = form.password;
    if (!email && !password) { setUi({ loading: false, error: t.login_err_both }); return; }
    if (!email) { setUi({ loading: false, error: t.login_err_email }); return; }
    if (!password) { setUi({ loading: false, error: t.login_err_pass }); return; }
    setUi({ loading: true, error: "" });
    try {
      const auth = await medoraApi.login({ email, password });
      const role = auth.roles?.[0]?.toLowerCase() || auth.role || auth.accountType || "patient";
      const userData = { ...auth, role, name: auth.userName || email.split("@")[0] };
      login(userData, { remember: form.remember });
      const destination = getUserDestination(userData);
      navigate(destination, { replace: true });
    } catch (error) {
      const errMessage = error.message || "Login failed";
      if (errMessage.toLowerCase().includes("invalid email or password")) {
        setUi({ loading: false, error: t.login_err_invalid || errMessage });
      } else {
        setUi({ loading: false, error: errMessage });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!!ui.error && (
        <div className={`rounded-xl border border-red-200 bg-red-50 px-4 py-3 ${textAlign} text-xs font-semibold text-red-700`}>
          {ui.error}
        </div>
      )}

      <div>
        <label className={label}>{t.login_email}</label>
        <input type="email" className={input} placeholder="example@email.com"
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
          autoComplete="email" dir="ltr" />
      </div>

      <div>
        <label className={label}>{t.login_password}</label>
        <div className="relative mt-1.5">
          <input
            type={showPass ? "text" : "password"}
            className={`w-full h-10 sm:h-11 rounded-xl border border-slate-200 bg-white px-4 ${t.dir === "rtl" ? "pr-4 pl-10" : "pl-4 pr-10"} text-[16px] sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#14b8a6] transition`}
            placeholder="••••••••"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            autoComplete="current-password" dir="ltr"
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            aria-label={showPass ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            className={`absolute top-1/2 -translate-y-1/2 ${t.dir === "rtl" ? "left-3" : "right-3"} text-slate-400 hover:text-slate-600 transition`}
            tabIndex={-1}
          >
            {showPass ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <Link to="/forgot-password" className="cursor-pointer text-[#14b8a6] font-semibold hover:underline">
          {t.login_forgot}
        </Link>
        <label className="flex items-center gap-2 text-slate-700 select-none cursor-pointer">
          {t.login_remember}
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 cursor-pointer"
            checked={form.remember} onChange={(e) => setForm({ ...form, remember: e.target.checked })} />
        </label>
      </div>

      <button type="submit" disabled={ui.loading}
        className="w-full h-10 sm:h-11 rounded-xl bg-[#119a8a] text-white text-sm sm:text-base font-extrabold hover:bg-[#0e7c6e] transition cursor-pointer disabled:opacity-60">
        {ui.loading ? "..." : t.login_btn}
      </button>

      <div className="flex items-center gap-3 my-2">
        <div className="h-px flex-1 bg-slate-200"></div>
        <span className="text-[11px] text-slate-400">{t.or}</span>
        <div className="h-px flex-1 bg-slate-200"></div>
      </div>

      <SocialAuthButtons 
        role="patient" 
        onStart={() => setUi({ loading: true, error: "" })}
        onError={(err) => setUi({ loading: false, error: err })}
      />

      <div className={`text-center text-xs text-slate-600 pt-1`}>
        {t.login_no_account}{" "}
        <Link to="/sign-up" className="cursor-pointer text-[#14b8a6] font-bold hover:underline">
          {t.login_create}
        </Link>
      </div>
    </form>
  );
}
