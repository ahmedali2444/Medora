import { createElement, useMemo, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Stethoscope, User, Pill, Eye, EyeOff } from "lucide-react";
import { useLang } from "../../context/LanguageContext";
import { usePersistedForm } from "../../hooks/usePersistedForm";
import { medoraApi } from "../../api/medoraApi";
import SocialAuthButtons from "./SocialAuthButtons";

// خارج الـ component تماماً عشان ميتعملش re-create عند كل render
function PasswordInput({ id, show, onToggle, value, onChange, placeholder, error, label, autoComplete, isRtl }) {
  return (
    <div>
      <label htmlFor={id} className={`block ${isRtl ? "text-right" : "text-left"} text-xs font-semibold text-slate-700`}>{label}</label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={show ? "text" : "password"}
          className={`w-full h-9 sm:h-10 rounded-lg border bg-white ${isRtl ? "pr-3 pl-10" : "pl-3 pr-10"} text-[16px] sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent transition ${error ? "border-red-500" : "border-slate-200"}`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          dir="ltr"
        />
        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          aria-label={show ? (isRtl ? "إخفاء كلمة المرور" : "Hide password") : (isRtl ? "إظهار كلمة المرور" : "Show password")}
          className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? "left-2.5" : "right-2.5"} text-slate-400 hover:text-slate-600 transition`}
        >
          {show ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="text-red-500 text-[11px] mt-1">{error}</p>}
    </div>
  );
}

/* ---- Password Strength ---- */
function getStrength(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 6) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score; // 0-5
}

function getPasswordRequirementError(password, isRtl) {
  const value = password || "";
  if (value.length < 6) return isRtl ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters";
  if (!/[A-Z]/.test(value)) return isRtl ? "كلمة المرور يجب أن تحتوي على حرف كبير" : "Password must contain an uppercase letter";
  if (!/[a-z]/.test(value)) return isRtl ? "كلمة المرور يجب أن تحتوي على حرف صغير" : "Password must contain a lowercase letter";
  if (!/[0-9]/.test(value)) return isRtl ? "كلمة المرور يجب أن تحتوي على رقم" : "Password must contain a number";
  if (!/[^A-Za-z0-9]/.test(value)) return isRtl ? "كلمة المرور يجب أن تحتوي على رمز خاص" : "Password must contain a special character";
  return "";
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

  const idx = Math.max(0, score - 1); // score 1→idx 0 … score 5→idx 4
  const label = isRtl ? labels.ar[idx] : labels.en[idx];
  const color = colors[idx];
  const textColor = textColors[idx];

  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${s <= score ? color : "bg-slate-200"}`}
          />
        ))}
      </div>
      <p className={`text-[11px] font-semibold ${textColor} ${isRtl ? "text-right" : "text-left"}`}>
        {label}
      </p>
      {score < 5 && (
        <ul className={`text-[10px] text-slate-500 space-y-0.5 ${isRtl ? "text-right list-none" : "text-left list-none"}`}>
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

export default function RegisterForm() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useLang();
  const isRtl = t.dir === "rtl";

  const [form, setFormState, clearForm] = usePersistedForm("register", { fullName: "", phone: "", email: "", password: "", confirmPassword: "", pharmacyName: "", agree: false });
  const [errors, setErrors] = useState({});
  const [submitState, setSubmitState] = useState({ loading: false, error: "" });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const role = getRoleFromSearchParams(searchParams);

  const roleCards = useMemo(() => [
    { key: "pharmacy", title: t.reg_pharmacy, Icon: Pill },
    { key: "doctor", title: t.reg_doctor, Icon: Stethoscope },
    { key: "patient", title: t.reg_patient, Icon: User },
  ], [t]);

  const textAlign = isRtl ? "text-right" : "text-left";
  const label = `block ${textAlign} text-xs font-semibold text-slate-700`;
  const inputBase = `mt-1.5 w-full h-9 sm:h-10 rounded-lg border bg-white px-3 ${textAlign} text-[16px] sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent transition`;

  const set = (k, v) => { setFormState((p) => ({ ...p, [k]: v })); setErrors((p) => ({ ...p, [k]: "" })); };

  const showPatientFields = role === "patient";
  const validate = () => {
    const e = {};
    const passwordRequirementError = getPasswordRequirementError(form.password, isRtl);
    if (showPatientFields) {
      if (!form.fullName.trim()) e.fullName = t.reg_err_name;
      if (!form.phone.trim()) e.phone = t.reg_err_phone;
    }
    if (!form.email.trim()) e.email = t.reg_err_email;
    if (!form.password.trim()) e.password = t.reg_err_pass;
    else if (passwordRequirementError) e.password = passwordRequirementError;
    if (!form.confirmPassword.trim()) e.confirmPassword = t.reg_err_confirm;
    if (form.password && form.confirmPassword && form.password !== form.confirmPassword) e.confirmPassword = t.reg_err_match;
    if (!form.agree) e.agree = t.reg_err_agree;
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = t.reg_err_email_invalid;
    return e;
  };

  const goOtp = (method) => {
    clearForm();
    const name = form.fullName.trim() || form.email.split("@")[0];
    navigate("/otp", { state: { flow: "signup", role, method, email: form.email.trim(), identifier: form.email.trim(), name } });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const e2 = validate();
    setErrors(e2);
    if (Object.keys(e2).length !== 0) return;
    setSubmitState({ loading: true, error: "" });
    try {
      await medoraApi.register({
        email: form.email.trim(),
        password: form.password,
        accountType: role,
        phoneNumber: role === "patient" ? form.phone.trim() : null,
        fullName: role === "patient" ? form.fullName.trim() : null,
      });
      goOtp("email");
    } catch (error) {
      setSubmitState({ loading: false, error: error.message || "Registration failed" });
    }
  };

  const setRoleAndUrl = (nextRole) => { setErrors({}); setSearchParams({ role: nextRole }, { replace: true }); };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <div className={`${textAlign} text-xs font-semibold text-slate-700`}>{t.reg_role_label}</div>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:gap-3">
          {roleCards.map(({ key, title, Icon }) => {
            const active = role === key;
            return (
              <button key={key} type="button" onClick={() => setRoleAndUrl(key)}
                className={["rounded-lg border px-2 py-2.5 text-center transition min-h-17.5 sm:rounded-xl sm:px-4 sm:py-3 sm:min-h-20.5",
                  active ? "border-[#14b8a6] bg-[#e6f7f7]" : "border-slate-200 bg-white hover:bg-slate-50"].join(" ")}>
                {createElement(Icon, { className: "mx-auto mb-1 h-5 w-5 sm:mb-1.5 sm:h-5 sm:w-5 text-[#14b8a6]" })}
                <div className="font-bold text-slate-900 text-xs sm:text-sm">{title}</div>
              </button>
            );
          })}
        </div>
      </div>

      {showPatientFields && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={label}>{t.reg_fullname}</label>
            <input type="text" className={`${inputBase} ${errors.fullName ? "border-red-500" : "border-slate-200"}`}
              placeholder={t.reg_fullname_ph} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
            {errors.fullName && <p className="text-red-500 text-[11px] mt-1">{errors.fullName}</p>}
          </div>
          <div>
            <label className={label}>{t.reg_phone}</label>
            <input type="tel" className={`${inputBase} ${errors.phone ? "border-red-500" : "border-slate-200"}`}
              placeholder="01xxxxxxxxx" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            {errors.phone && <p className="text-red-500 text-[11px] mt-1">{errors.phone}</p>}
          </div>
        </div>
      )}

      <div>
        <label className={label}>{t.reg_email}</label>
        <input type="email" className={`${inputBase} ${errors.email ? "border-red-500" : "border-slate-200"}`}
          placeholder="example@email.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
        {errors.email && <p className="text-red-500 text-[11px] mt-1">{errors.email}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <PasswordInput
            id="reg-pass"
            isRtl={isRtl}
            show={showPass} onToggle={() => setShowPass((v) => !v)}
            value={form.password} onChange={(e) => set("password", e.target.value)}
            placeholder="••••••••" error={errors.password}
            label={t.reg_pass} autoComplete="new-password"
          />
          {/* Password strength bar — only show when user starts typing */}
          <PasswordStrengthBar password={form.password} isRtl={isRtl} />
        </div>
        <PasswordInput
          id="reg-confirm"
          isRtl={isRtl}
          show={showConfirm} onToggle={() => setShowConfirm((v) => !v)}
          value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)}
          placeholder="••••••••" error={errors.confirmPassword}
          label={t.reg_confirm} autoComplete="new-password"
        />
      </div>

      <div className={`flex items-center ${isRtl ? "justify-end" : "justify-start"} gap-2`}>
        <input type="checkbox" className="h-4 w-4 rounded border-slate-300 order-last"
          checked={form.agree} onChange={(e) => set("agree", e.target.checked)} />
        <span className="text-slate-700 text-xs">{t.reg_agree}</span>
        <Link to="/terms" className="text-[#119a8a] text-xs font-extrabold hover:underline">{t.reg_terms}</Link>
        <span className="text-slate-700 text-xs">{t.reg_and}</span>
        <Link to="/privacy" className="text-[#119a8a] text-xs font-extrabold hover:underline">{t.reg_privacy}</Link>
      </div>
      {errors.agree && <p className={`text-red-500 text-[11px] -mt-1 ${textAlign}`}>{errors.agree}</p>}

      {submitState.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          {submitState.error}
        </div>
      )}

      <button type="submit" disabled={submitState.loading}
        className="w-full h-10 rounded-lg text-white text-sm font-extrabold bg-[#119a8a] hover:bg-[#0e7c6e] transition cursor-pointer disabled:opacity-60">
        {submitState.loading ? "..." : t.reg_btn}
      </button>

      <div className="flex items-center gap-3 my-2">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-[11px] text-slate-400">{t.or}</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <SocialAuthButtons
        actionType="register"
        role={role}
        onStart={() => setSubmitState({ loading: true, error: "" })}
        onError={(err) => setSubmitState({ loading: false, error: err })}
      />

      <div className="text-center text-xs text-slate-600 pt-1">
        {t.reg_have_account}{" "}
        <Link to="/sign-in" className="text-[#119a8a] font-extrabold hover:underline">{t.reg_signin}</Link>
      </div>
    </form>
  );
}

function getRoleFromSearchParams(searchParams) {
  const nextRole = (searchParams.get("role") || "").toLowerCase();
  return nextRole === "doctor" || nextRole === "pharmacy" || nextRole === "patient"
    ? nextRole
    : "patient";
}
