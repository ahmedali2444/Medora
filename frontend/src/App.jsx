import { Suspense, Component } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider } from "./context/AuthContext";
import RequireRole from "./components/auth/RequireRole";
import RequireProfileComplete from "./components/auth/RequireProfileComplete";
import AuthNoticeBanner from "./components/auth/AuthNoticeBanner";
import ImagePreview from "./components/ImagePreview";
import { lazyWithRetry } from "./utils/lazyWithRetry";

const Home = lazyWithRetry(() => import("./pages/Home"));
const ServicesHub = lazyWithRetry(() => import("./pages/ServicesHub"));
const Login = lazyWithRetry(() => import("./pages/Login"));
const Register = lazyWithRetry(() => import("./pages/Register"));
const Otp = lazyWithRetry(() => import("./pages/Otp"));
const CompleteDoctorProfile = lazyWithRetry(() => import("./pages/CompleteDoctorProfile"));
const CompletePharmacyProfile = lazyWithRetry(() => import("./pages/CompletePharmacyProfile"));
const CompletePatientProfile = lazyWithRetry(() => import("./pages/CompletePatientProfile"));
const PatientRoutes = lazyWithRetry(() => import("./routes/PatientRoutes"));
const ForgotPassword = lazyWithRetry(() => import("./pages/ForgotPassword"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const CompleteDoctorVerification = lazyWithRetry(() => import("./pages/CompleteDoctorVerification"));
const AiConsultation = lazyWithRetry(() => import("./pages/AiConsultation"));
const Articles = lazyWithRetry(() => import("./pages/Articles"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const Privacy = lazyWithRetry(() => import("./pages/Privacy"));
const Terms = lazyWithRetry(() => import("./pages/Terms"));
const Contact = lazyWithRetry(() => import("./pages/Contact"));
const Doctors = lazyWithRetry(() => import("./pages/Doctors"));
const DoctorDetail = lazyWithRetry(() => import("./pages/DoctorDetail"));
const DoctorRoutes = lazyWithRetry(() => import("./routes/DoctorRoutes"));
const MedicineRoutes = lazyWithRetry(() => import("./routes/MedicineRoutes"));
const AdminRoutes = lazyWithRetry(() => import("./routes/AdminRoutes"));
const PharmacyRoutes = lazyWithRetry(() => import("./routes/PharmacyRoutes"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#eaf3f4]">
      <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// BUG-F6 fix: Error Boundary to prevent full-app crash on render errors
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      const isEn = typeof document !== "undefined"
        && (document.documentElement.lang === "en" || document.documentElement.getAttribute("dir") === "ltr");
      return (
        <div dir={isEn ? "ltr" : "rtl"} className="min-h-screen flex flex-col items-center justify-center bg-[#eaf3f4] p-8 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-extrabold text-slate-800 mb-2">
            {isEn ? "Something went wrong" : "حدث خطأ غير متوقع"}
          </h1>
          <p className="text-slate-500 mb-6">
            {isEn
              ? "Sorry, please reload the page or return to the home page."
              : "نعتذر، يرجى إعادة تحميل الصفحة أو العودة للرئيسية."}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2 bg-[#0da694] text-white rounded-xl font-bold hover:brightness-95 transition"
            >
              {isEn ? "Reload" : "إعادة التحميل"}
            </button>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = "/"; }}
              className="px-5 py-2 border border-[#0da694] text-[#0da694] rounded-xl font-bold hover:bg-slate-50 transition"
            >
              {isEn ? "Home" : "الرئيسية"}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        {/* BUG-F2: AuthProvider is inside BrowserRouter so it can use useNavigate */}
        <AuthProvider>
          <AuthNoticeBanner />
          {/* BUG-F6 fix: ErrorBoundary wraps all routes to prevent full white-screen on crashes */}
          <ErrorBoundary>
            <ImagePreview />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* ===== الصفحات العامة ===== */}
                <Route path="/" element={<RequireProfileComplete><Home /></RequireProfileComplete>} />
                <Route path="/services" element={<ServicesHub />} />
                <Route path="/articles" element={<Articles />} />
                <Route path="/ai-consultation" element={<AiConsultation />} />

                {/* ===== Auth Flow =====
                  Sign-in → Home
                  Sign-up → OTP → (doctor: complete-profile/doctor → doctor/verification → home)
                                 → (pharmacy: complete-profile/pharmacy → home)
                                 → (patient: home)
              */}
                <Route path="/sign-in" element={<Login />} />
                <Route path="/sign-up" element={<Register />} />
                <Route path="/otp" element={<Otp />} />

                {/* ===== Password Reset Flow =====
                  forgot-password → OTP (reset) → reset-password → sign-in
              */}
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* ===== Doctor Onboarding Flow =====
                  complete-profile/doctor → doctor/verification → home
              */}
                <Route path="/complete-profile/doctor" element={<RequireRole role="doctor"><CompleteDoctorProfile /></RequireRole>} />
                <Route path="/doctor/verification" element={<RequireRole role="doctor"><CompleteDoctorVerification /></RequireRole>} />

                {/* ===== Pharmacy Onboarding Flow =====
                  complete-profile/pharmacy → home
              */}
                <Route path="/complete-profile/pharmacy" element={<RequireRole role="pharmacy"><CompletePharmacyProfile /></RequireRole>} />

                {/* ===== Patient Onboarding Flow =====
                  complete-profile/patient → home
              */}
                <Route path="/complete-profile/patient" element={<RequireRole role="patient"><CompletePatientProfile /></RequireRole>} />

                {/* ===== Pages ===== */}
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/doctors" element={<Doctors />} />
                <Route path="/doctors/:id" element={<DoctorDetail />} />

                {/* ===== Medicine Feature ===== */}
                <Route path="/medicine/*" element={<MedicineRoutes />} />

                {/* ===== Patient Dashboard / Appointments ===== */}
                <Route path="/patient/*" element={<RequireRole role="patient"><RequireProfileComplete><PatientRoutes /></RequireProfileComplete></RequireRole>} />

                {/* ===== Doctor Dashboard ===== */}
                <Route path="/doctor/*" element={<DoctorRoutes />} />

                {/* ===== Admin Dashboard ===== */}
                <Route path="/admin/*" element={<AdminRoutes />} />

                {/* ===== Pharmacy Dashboard ===== */}
                <Route path="/pharmacy/*" element={<PharmacyRoutes />} />

                {/* ===== Redirects للروابط القديمة ===== */}
                <Route path="/login" element={<Navigate to="/sign-in" replace />} />
                <Route path="/register" element={<Navigate to="/sign-up" replace />} />

                {/* ===== 404 ===== */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </LanguageProvider>
  );
}
