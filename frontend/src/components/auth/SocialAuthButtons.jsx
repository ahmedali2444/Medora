import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LanguageContext";
import { medoraApi } from "../../api/medoraApi";
import { getUserDestination } from "../../utils/userDestination";
import { loadFacebookSdk } from "../../utils/facebookSdk";

/* ── Icons ── */
function GoogleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

/* ── Main component ── */
export default function SocialAuthButtons({
  actionType = "login",
  role = "patient",
  onStart,
  onError,
}) {
  const { lang } = useLang();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
  const facebookAppId = import.meta.env.VITE_FACEBOOK_APP_ID || "";
  const socialRole = actionType === "register" ? role : "patient";

  useEffect(() => {
    if (facebookAppId) {
      loadFacebookSdk(facebookAppId).catch(() => {});
    }
  }, [facebookAppId]);

  /* ── Shared finish handler ── */
  const finishAuth = (auth) => {
    const userRole = auth.roles?.[0]?.toLowerCase() || auth.role || socialRole;
    const nextUser = {
      ...auth,
      role: userRole,
      name: auth.fullName || auth.userName || "User",
    };
    login(nextUser);
    const needsProfile =
      auth.needsProfileCompletion || auth.isNewGoogleUser || auth.isNewFacebookUser;
    if (needsProfile) {
      if (userRole === "doctor") navigate("/complete-profile/doctor", { replace: true });
      else if (userRole === "pharmacy") navigate("/complete-profile/pharmacy", { replace: true });
      else navigate("/complete-profile/patient", { replace: true });
      return;
    }
    navigate(getUserDestination(nextUser), { replace: true });
  };

  /* ── Google ── */
  const handleCustomGoogleClick = () => {
    if (!googleClientId) {
      onError?.(lang === "ar" ? "تسجيل الدخول بجوجل غير مفعّل حالياً" : "Google login is currently disabled");
      return;
    }
    // If configured, trigger your login flow here
  };

  const handleGoogleError = () => {
    onError?.(lang === "ar" ? "فشل تسجيل الدخول بجوجل" : "Google login failed");
  };

  /* ── Facebook ── */
  const handleFacebookLogin = () => {
    if (!facebookAppId) {
      onError?.(lang === "ar" ? "فيسبوك غير مفعّل" : "Facebook is not configured");
      return;
    }
    const FB = window.FB;
    if (!FB) {
       onError?.(lang === "ar" ? "جاري تحميل فيسبوك، يرجى المحاولة بعد قليل" : "Facebook SDK is loading, please try again in a moment");
       return;
    }
    
    onStart?.();
    setLoading(true);
    
    FB.login((response) => {
      const token = response?.authResponse?.accessToken;
      if (!token) {
         setLoading(false);
         // Don't show error if user just cancelled
         return;
      }
      
      medoraApi.facebookLogin({
        accessToken: token,
        AccessToken: token,
        role: socialRole,
        Role: socialRole,
      })
      .then(finishAuth)
      .catch((err) => {
        setLoading(false);
        onError?.(err?.message || (lang === "ar" ? "فشل تسجيل الدخول بفيسبوك" : "Facebook login failed"));
      });
    }, { scope: "email,public_profile" });
  };

  /* ── Labels ── */
  const isRegister = actionType === "register";
  const facebookLabel = isRegister
    ? (lang === "ar" ? "التسجيل بواسطة Facebook" : "Sign up with Facebook")
    : (lang === "ar" ? "الدخول بواسطة Facebook" : "Sign in with Facebook");
  
  const googleLabel = isRegister
    ? (lang === "ar" ? "التسجيل بواسطة Google" : "Sign up with Google")
    : (lang === "ar" ? "الدخول بواسطة Google" : "Sign in with Google");

  const doGoogleLogin = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      onStart?.();
      setLoading(true);
      medoraApi.googleLogin({
        idToken: tokenResponse.access_token,
        IdToken: tokenResponse.access_token,
        role: socialRole,
        Role: socialRole,
      })
      .then(finishAuth)
      .catch((err) => {
        setLoading(false);
        onError?.(err?.message || (lang === "ar" ? "فشل تسجيل الدخول بجوجل" : "Google login failed"));
      });
    },
    onError: handleGoogleError
  });

  return (
    <div className="w-full space-y-3">
      {/* ── Google Button ── */}
      <div className="flex w-full justify-center">
        <button
          type="button"
          onClick={() => googleClientId ? doGoogleLogin() : handleCustomGoogleClick()}
          disabled={loading}
          className="flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <GoogleIcon />
          <span>{googleLabel}</span>
        </button>
      </div>

      {/* ── Facebook Button ── */}
      <div className="flex w-full justify-center">
        <button
          type="button"
          disabled={loading}
          onClick={handleFacebookLogin}
          className="flex h-11 w-full items-center justify-center gap-3 rounded-xl bg-[#1877F2] text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f6ae0] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FacebookIcon />
          <span>{facebookLabel}</span>
        </button>
      </div>
    </div>
  );
}
