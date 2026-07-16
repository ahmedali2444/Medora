import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Logo from "../assets/images/Logo.png";
import { ArrowLeft, ClipboardPaste, RefreshCw } from "lucide-react";
import { useLang } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import LangToggleBtn from "../components/LangToggleBtn";
import { medoraApi } from "../api/medoraApi";

const COUNTDOWN_SECONDS = 60; // 1 minute

export default function Otp() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { t } = useLang();
  const { login } = useAuth();

  const flow = state?.flow;
  const role = state?.role;
  const email = state?.email || "";
  const identifier = state?.identifier || "";

  useEffect(() => {
    if (!flow) { navigate("/sign-up?role=patient", { replace: true }); return; }
    if (flow === "signup" && !role) { navigate("/sign-up?role=patient", { replace: true }); return; }
    if (flow === "reset" && !identifier) { navigate("/forgot-password", { replace: true }); return; }
  }, [flow, role, identifier, navigate]);

  const OTP_LEN = 6;
  const [digits, setDigits] = useState(Array(OTP_LEN).fill(""));
  const [ui, setUi] = useState({ loading: false, error: "", success: "" });
  const inputsRef = useRef([]);
  const otpValue = useMemo(() => digits.join(""), [digits]);

  // ─── Countdown Timer ──────────────────────────────────────────────────────
  const [seconds, setSeconds] = useState(COUNTDOWN_SECONDS);
  const [resendLoading, setResendLoading] = useState(false);
  const timerRef = useRef(null);

  const startTimer = useCallback(() => {
    setSeconds(COUNTDOWN_SECONDS);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) { clearInterval(timerRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    startTimer();
    return () => clearInterval(timerRef.current);
  }, [startTimer]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  // ─── Resend OTP ───────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (seconds > 0 || resendLoading) return;
    setResendLoading(true);
    setUi({ loading: false, error: "", success: "" });
    try {
      const target = flow === "reset" ? identifier : email;
      if (flow === "reset") {
        await medoraApi.forgotPassword({ email: target });
      } else {
        await medoraApi.resendOtp({ email: target });
      }
      setDigits(Array(OTP_LEN).fill(""));
      startTimer();
      setUi({ loading: false, error: "", success: t.otp_resend_success });
      setTimeout(() => setUi((u) => ({ ...u, success: "" })), 3000);
      requestAnimationFrame(() => inputsRef.current[0]?.focus());
    } catch (err) {
      setUi({ loading: false, error: err.message || "Failed to resend", success: "" });
    } finally {
      setResendLoading(false);
    }
  };

  // ─── Paste from Clipboard ─────────────────────────────────────────────────
  const handleClipboardPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      fillDigits(0, text);
    } catch {
      // fallback: focus first input so user can paste manually
      inputsRef.current[0]?.focus();
    }
  };

  // ─── Input helpers ────────────────────────────────────────────────────────
  const firstEmptyIndex = () => { const i = digits.findIndex((d) => d === ""); return i === -1 ? OTP_LEN - 1 : i; };
  const focusIndex = (i) => { const el = inputsRef.current[i]; if (!el) return; el.focus(); el.select?.(); };
  const handleBoxFocus = (i) => { const target = firstEmptyIndex(); if (i !== target) focusIndex(target); };
  const setAt = (i, v) => setDigits((prev) => { const next = [...prev]; next[i] = v; return next; });

  const handleChange = (i, e) => {
    const value = e.target.value.replace(/\D/g, "");
    if (!value) { setAt(i, ""); return; }
    if (value.length > 1) { fillDigits(i, value); return; }
    setAt(i, value);
    if (i < OTP_LEN - 1) requestAnimationFrame(() => focusIndex(i + 1));
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[i]) { setAt(i, ""); if (i > 0) requestAnimationFrame(() => focusIndex(i - 1)); return; }
      if (i > 0) { setAt(i - 1, ""); requestAnimationFrame(() => focusIndex(i - 1)); }
      return;
    }
    if (e.key === "ArrowLeft") { e.preventDefault(); if (i > 0) focusIndex(i - 1); return; }
    if (e.key === "ArrowRight") { e.preventDefault(); if (i < OTP_LEN - 1) focusIndex(i + 1); return; }
    if (e.key.length === 1 && !/^\d$/.test(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault();
  };

  const handlePaste = (i, e) => {
    e.preventDefault();
    fillDigits(i, e.clipboardData?.getData("text") || "");
  };

  const fillDigits = (i, value) => {
    const arr = value.replace(/\D/g, "").slice(0, OTP_LEN).split("");
    if (!arr.length) return;
    const start = arr.length >= OTP_LEN ? 0 : digits[i] ? firstEmptyIndex() : i;
    const nextFocus = Math.min(start + arr.length, OTP_LEN - 1);
    setDigits((prev) => {
      const next = [...prev];
      for (let k = 0; k < arr.length && start + k < OTP_LEN; k++) next[start + k] = arr[k];
      return next;
    });
    requestAnimationFrame(() => focusIndex(nextFocus));
  };

  // ─── Submit ───────────────────────────────────────────────────────────────
  const onVerify = async (e) => {
    e.preventDefault();
    if (otpValue.length !== 6) return;
    setUi({ loading: true, error: "", success: "" });
    try {
      if (flow === "reset") {
        const result = await medoraApi.verifyForgotPassword({ email: identifier, code: otpValue });
        navigate("/reset-password", { state: { identifier, resetToken: result.resetToken } });
        return;
      }
      if (flow === "signup") {
        const auth = await medoraApi.verifyEmail({ email, code: otpValue });
        const nextRole = auth.roles?.[0]?.toLowerCase() || role;
        const name = state?.name || auth.userName || (email ? email.split("@")[0] : "");
        login({ ...auth, name, role: nextRole });
        if (nextRole === "patient") navigate("/", { replace: true });
        else if (nextRole === "doctor") navigate("/complete-profile/doctor", { replace: true });
        else if (nextRole === "pharmacy") navigate("/complete-profile/pharmacy", { replace: true });
        else navigate("/", { replace: true });
      }
    } catch {
      setUi({ loading: false, error: t.otp_invalid, success: "" });
    }
  };

  const backTo = flow === "reset" ? "/forgot-password" : "/sign-up";
  const shownTo = flow === "reset" ? identifier : email;
  const canResend = seconds === 0 && !resendLoading;

  return (
    <div dir={t.dir} className="min-h-screen bg-linear-to-b from-[#eef7f7] via-[#f6fbfb] to-white">
      <LangToggleBtn variant="float" />
      <div className="mx-auto max-w-5xl px-4 py-10">
        {/* Back button */}
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => navigate(backTo)}
            aria-label={t.otp_back}
            className="inline-flex items-center gap-2 text-[#0da694] font-extrabold hover:opacity-80 transition">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="w-10" />
        </div>

        {/* Header */}
        <div className="mt-10 text-center">
          <div className="flex items-center justify-center gap-3">
            <img src={Logo} alt="Medora Logo" className="h-12 w-12 sm:h-14 sm:w-14 object-contain" />
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0ea5a5]">{t.brand}</div>
          </div>
          <h1 className="mt-6 text-3xl sm:text-4xl font-extrabold text-slate-900">{t.otp_title}</h1>
          <p className="mt-3 text-sm sm:text-base text-slate-600">
            {t.otp_sent}{" "}
            <span className="font-extrabold text-slate-800">{shownTo}</span>
          </p>
        </div>

        <form onSubmit={onVerify} className="mt-10">
          {/* Error */}
          {!!ui.error && (
            <div className="mx-auto mb-5 max-w-md rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-xs font-semibold text-red-700">
              {ui.error}
            </div>
          )}
          {/* Success */}
          {!!ui.success && (
            <div className="mx-auto mb-5 max-w-md rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-center text-xs font-semibold text-green-700">
              {ui.success}
            </div>
          )}

          {/* OTP Inputs */}
          <div dir="ltr" className="flex justify-center gap-3 sm:gap-4">
            {digits.map((d, i) => (
              <input key={i} ref={(el) => (inputsRef.current[i] = el)} value={d}
                onChange={(e) => handleChange(i, e)} onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={(e) => handlePaste(i, e)} onFocus={() => handleBoxFocus(i)}
                inputMode="numeric" autoComplete="one-time-code" maxLength={1} dir="ltr"
                className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl border border-[#14b8a6]/60 bg-white text-center text-xl font-extrabold text-slate-900 outline-none focus:ring-2 focus:ring-[#14b8a6] transition"
              />
            ))}
          </div>

          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={handleClipboardPaste}
              className="inline-flex items-center gap-2 rounded-xl border border-[#14b8a6]/30 bg-white px-4 py-2 text-xs font-bold text-[#0da694] transition hover:bg-[#e6f7f7]"
            >
              <ClipboardPaste className="h-4 w-4" />
              {t.otp_paste}
            </button>
          </div>

          {/* Countdown + Resend */}
          <div className="mt-8 flex flex-col items-center gap-2">
            {seconds > 0 ? (
              <p className="text-sm text-slate-500">
                {t.otp_expires_in}{" "}
                <span className={`font-extrabold tabular-nums ${seconds <= 30 ? "text-red-500" : "text-[#0da694]"}`}>
                  {formatTime(seconds)}
                </span>
              </p>
            ) : (
              <p className="text-sm font-semibold text-red-500">{t.otp_expired}</p>
            )}

            <button
              type="button"
              onClick={handleResend}
              disabled={!canResend}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold transition
                ${canResend
                  ? "bg-[#e6f7f7] text-[#0da694] hover:bg-teal-100 cursor-pointer"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
            >
              <RefreshCw className={`h-4 w-4 ${resendLoading ? "animate-spin" : ""}`} />
              {seconds > 0
                ? `${t.otp_resend_in} ${formatTime(seconds)}`
                : resendLoading ? "..." : t.otp_resend}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <button type="button" onClick={() => navigate(backTo)}
              className="w-full sm:w-44 h-12 sm:h-14 rounded-xl border border-[#14b8a6]/60 bg-white text-[#0da694] font-extrabold hover:bg-slate-50 transition">
              {t.otp_back}
            </button>
            <button type="submit" disabled={otpValue.length !== 6 || ui.loading}
              className="w-full sm:w-44 h-12 sm:h-14 rounded-xl bg-[#0da694] text-white font-extrabold hover:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed">
              {ui.loading ? "..." : t.otp_confirm}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
