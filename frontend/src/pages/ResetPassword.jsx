import { useLocation, useNavigate, Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Check, X, Eye, EyeOff } from "lucide-react";
import { useLang } from "../context/LanguageContext";
import Logo from "../assets/images/Logo.png";
import LangToggleBtn from "../components/LangToggleBtn";
import { medoraApi } from "../api/medoraApi";

/* ---- Password Strength Bar (same as RegisterForm) ---- */
function getStrength(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 6) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

function PasswordStrengthBar({ password, isRtl }) {
  const score = getStrength(password);
  if (!password) return null;
  const labels = {
    ar: ["ضعيف جداً", "ضعيف", "متوسط", "جيد", "قوي جداً"],
    en: ["Very Weak", "Weak", "Fair", "Good", "Very Strong"],
  };
  const colors = ["bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-lime-500", "bg-green-500"];
  const textColors = ["text-red-500", "text-orange-400", "text-yellow-500", "text-lime-600", "text-green-600"];
  const idx = Math.max(0, score - 1);
  const label = isRtl ? labels.ar[idx] : labels.en[idx];
  const color = colors[idx];
  const textColor = textColors[idx];
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-300 ${s <= score ? color : "bg-slate-200"}`} />
        ))}
      </div>
      <p className={`text-[11px] font-semibold ${textColor} ${isRtl ? "text-start" : "text-left"}`}>{label}</p>
      {score < 5 && (
        <ul className={`text-[10px] text-slate-500 space-y-0.5 list-none ${isRtl ? "text-start" : "text-left"}`}>
          {password.length < 6 && <li>{isRtl ? "• 6 أحرف على الأقل" : "• At least 6 characters"}</li>}
          {!/[A-Z]/.test(password) && <li>{isRtl ? "• حرف كبير (A-Z)" : "• Uppercase letter (A-Z)"}</li>}
          {!/[a-z]/.test(password) && <li>{isRtl ? "• حرف صغير (a-z)" : "• Lowercase letter (a-z)"}</li>}
          {!/[0-9]/.test(password) && <li>{isRtl ? "• رقم (0-9)" : "• Number (0-9)"}</li>}
          {!/[^A-Za-z0-9]/.test(password) && <li>{isRtl ? "• رمز خاص (!@#$%)" : "• Special character (!@#$%)"}</li>}
        </ul>
      )}
    </div>
  );
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { t } = useLang();
  const isRtl = t.dir === "rtl";
  const identifier = state?.identifier;
  const resetToken = state?.resetToken;

  const [form, setForm] = useState({ password: "", confirm: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const passStrength = getStrength(form.password);

  useEffect(() => {
    if (!identifier || !resetToken) navigate("/forgot-password");
  }, [identifier, resetToken, navigate]);



  const passwordsMatch = useMemo(() => {
    return form.password && form.confirm && form.password === form.confirm;
  }, [form.password, form.confirm]);

  const meetsBackendRequirements = useMemo(() => {
    const p = form.password || "";
    return p.length >= 6
      && /[A-Z]/.test(p)
      && /[a-z]/.test(p)
      && /[0-9]/.test(p)
      && /[^A-Za-z0-9]/.test(p);
  }, [form.password]);

  const allRequirementsMet = useMemo(() => {
    return meetsBackendRequirements && passwordsMatch;
  }, [meetsBackendRequirements, passwordsMatch]);

  const input =
    "mt-2 w-full h-10 sm:h-11 rounded-lg sm:rounded-xl border border-slate-200 bg-white px-3 sm:px-4 text-sm sm:text-base text-start text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#14b8a6] transition-all";
  const label = "block text-start text-xs sm:text-sm font-semibold text-slate-700";

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (passStrength < 3) return setError(isRtl ? "كلمة المرور ضعيفة جداً" : "Password is too weak");
    if (!passwordsMatch) return setError(isRtl ? "كلمتا المرور غير متطابقتين" : "Passwords do not match");
    if (!allRequirementsMet) return setError(t.reset_err_req);
    setError("");
    setLoading(true);
    try {
      await medoraApi.resetPassword({ email: identifier, resetToken, newPassword: form.password });
      navigate("/sign-in", { replace: true });
    } catch (err) {
      setLoading(false);
      setError(err.message || "Failed to reset password");
    }
  };



  return (
    <div className="min-h-screen bg-[#F2FBFA] flex items-center justify-center px-3 sm:px-4 md:px-6 py-6 sm:py-8">
      <LangToggleBtn variant="float" />
      <div className="w-full max-w-xl">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-8 sm:mb-10">
          <img
            src={Logo}
            alt="Medora"
            className="h-14 w-14 sm:h-16 sm:w-16 object-contain"
          />
          <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#0da694]">
            {t.reset_brand}
          </span>
        </div>

        {/* Header */}
        <div className="text-center px-2 sm:px-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900">
            {t.reset_title}
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 px-2">
            {t.reset_sub}{" "}
            <span className="font-bold break-all">{identifier}</span>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="mt-8 sm:mt-10 mx-auto w-full max-w-md space-y-3 sm:space-y-4">
          {/* Error Message */}
          {!!error && (
            <div className="rounded-lg sm:rounded-xl border border-red-200 bg-red-50 px-3 sm:px-4 py-2.5 sm:py-3 text-start text-xs sm:text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          {/* Password Input */}
          <div>
            <label className={label}>{t.reset_new_pass}</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className={input + " pl-10 sm:pl-12"}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                autoComplete="new-password"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? (
                  <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Password Strength Bar */}
          <PasswordStrengthBar password={form.password} isRtl={isRtl} />

          {/* Confirm Password Input */}
          <div>
            <label className={label}>{t.reset_confirm_pass}</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                className={input + " pl-10 sm:pl-12"}
                placeholder="••••••••"
                value={form.confirm}
                onChange={(e) => setForm((s) => ({ ...s, confirm: e.target.value }))}
                autoComplete="new-password"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showConfirm ? (
                  <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Password Match Indicator — متطابقتين دايماً ولايف, غير متطابقين بس بعد submit */}
          {form.confirm && passwordsMatch && (
            <div className="flex items-center gap-2 text-start px-1">
              <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-green-700 font-medium">{t.reset_match}</span>
            </div>
          )}
          {submitted && form.confirm && !passwordsMatch && (
            <div className="flex items-center gap-2 text-start px-1">
              <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-red-600">{t.reset_no_match}</span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-center gap-3 pt-2 sm:pt-3">
            <Link
              to="/otp"
              state={{ flow: "reset", identifier }}
              className="w-full sm:w-auto h-10 sm:h-11 px-4 sm:px-5 rounded-lg sm:rounded-xl border-2 border-[#0da694] text-[#0da694] font-extrabold text-sm flex items-center justify-center hover:bg-white transition-all cursor-pointer"
            >
              {t.reset_back}
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto h-10 sm:h-11 px-5 sm:px-6 rounded-lg sm:rounded-xl bg-[#0da694] text-white font-extrabold text-sm hover:brightness-95 transition-all cursor-pointer disabled:opacity-60"
            >
              {loading ? "..." : t.reset_save}
            </button>
          </div>

          {/* Back to Sign In */}
          <div className="text-center text-xs sm:text-sm text-slate-600 pt-2">
            <Link
              to="/sign-in"
              className="cursor-pointer text-[#14b8a6] font-bold hover:underline"
            >
              {t.reset_signin}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
