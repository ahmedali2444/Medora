import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, LayoutDashboard, LogOut, Pill, Stethoscope, UserCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import Logo from "../assets/images/Logo.png";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import { getDashboardMenuItem, PATIENT_PROFILE_PATH, shouldShowPatientProfileLink } from "../utils/userDestination";
import PatientNotificationBell from "./patient/PatientNotificationBell";

const dashboardIcons = {
  admin: LayoutDashboard,
  doctor: Stethoscope,
  pharmacy: Pill,
};

const LangToggle = memo(function LangToggle({ lang, onToggle, scrolled, mobile }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        "rounded-lg px-3 py-1.5 text-xs font-bold border transition-all",
        mobile ? "w-full mt-1" : "",
        scrolled
          ? "border-[#14b8a6] text-[#14b8a6] hover:bg-[#14b8a6]/10"
          : "border-white/50 text-white hover:bg-white/15",
      ].join(" ")}
    >
      {lang === "ar" ? "EN" : "AR"}
    </button>
  );
});

const AccountMenu = memo(function AccountMenu({
  accountName,
  accountEmail,
  initial,
  onToggle,
  open,
  scrolled,
  dashboardItem,
  onDashboard,
  canUsePatientProfile,
  onPatientProfile,
  onLogout,
  loggingOut,
  isRtl,
}) {
  const DashboardIcon = dashboardIcons[dashboardItem?.role] || LayoutDashboard;
  const canOpenDashboard = Boolean(dashboardItem);
  const accountNameDir = accountName?.includes("@") ? "ltr" : "auto";

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={[
          "flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold border transition-all",
          scrolled
            ? "border-[#14b8a6]/40 text-[#14b8a6] hover:bg-[#14b8a6]/10"
            : "border-white/40 text-white hover:bg-white/15",
        ].join(" ")}
      >
        <span
          className={[
            "h-6 w-6 sm:h-7 sm:w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
            scrolled ? "bg-[#14b8a6] text-white" : "bg-white/20 text-white",
          ].join(" ")}
        >
          {initial}
        </span>
        <span
          dir={accountNameDir}
          title={accountName}
          className="max-w-28 truncate text-xs sm:max-w-36 sm:text-sm"
        >
          {accountName}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className={[
            "absolute top-full mt-2 w-56 overflow-hidden rounded-xl border border-[#e4eeee] bg-white text-slate-800 shadow-[0_18px_40px_rgba(8,64,54,0.18)]",
            isRtl ? "left-0" : "right-0",
          ].join(" ")}
        >
          <div className="border-b border-[#eef5f5] px-4 py-3">
            <p dir={accountNameDir} className="truncate text-sm font-black text-[#084036]">
              {accountName}
            </p>
            {accountEmail && <p dir="ltr" className="mt-0.5 truncate text-xs text-slate-500">{accountEmail}</p>}
          </div>

          {canUsePatientProfile && (
            <button
              type="button"
              onClick={onPatientProfile}
              className="flex w-full items-center gap-2 px-4 py-3 text-sm font-bold text-[#295d60] transition hover:bg-[#f7fbfb]"
            >
              <UserCircle size={15} />
              {isRtl ? "ملفي" : "My Profile"}
            </button>
          )}

          {canOpenDashboard && (
            <button
              type="button"
              onClick={onDashboard}
              className="flex w-full items-center gap-2 px-4 py-3 text-sm font-bold text-[#295d60] transition hover:bg-[#f7fbfb]"
            >
              <DashboardIcon size={15} />
              {dashboardItem.label}
            </button>
          )}

          <button
            type="button"
            onClick={onLogout}
            disabled={loggingOut}
            className={[
              "flex w-full items-center gap-2 px-4 py-3 text-sm font-bold text-[#d14f4f] transition hover:bg-[#fdecec] disabled:cursor-not-allowed disabled:opacity-70",
              canOpenDashboard || canUsePatientProfile ? "border-t border-[#f3f7f7]" : "",
            ].join(" ")}
          >
            <LogOut size={15} />
            {loggingOut ? (isRtl ? "جارٍ الخروج..." : "Signing out...") : isRtl ? "تسجيل الخروج" : "Sign out"}
          </button>
        </div>
      )}
    </>
  );
});

export default memo(function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const ticking = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, t, toggleLang } = useLang();
  const { user, logout } = useAuth();
  const accountRef = useRef(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 20);
          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!accountOpen) return undefined;

    const closeAccountMenu = (event) => {
      if (accountRef.current?.contains(event.target)) return;
      setAccountOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setAccountOpen(false);
    };

    document.addEventListener("mousedown", closeAccountMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeAccountMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [accountOpen]);

  const links = useMemo(
    () => [
      { label: t.nav_home, href: "/" },
      { label: t.nav_doctors, href: "/doctors" },
      { label: t.nav_ai, href: "/ai-consultation" },
      { label: t.footer_find_medicine, href: "/medicine" },
      { label: t.nav_articles, href: "/articles" },
      { label: t.nav_contact, href: "/contact" },
    ],
    [t],
  );

  const goLogin = useCallback(() => {
    navigate("/sign-in");
  }, [navigate]);

  const goRegister = useCallback(() => {
    navigate("/sign-up");
  }, [navigate]);

  const handleLogoClick = useCallback(() => {
    if (location.pathname === "/") window.scrollTo({ top: 0, behavior: "smooth" });
    else navigate("/");
  }, [location.pathname, navigate]);

  const isRtl = t.dir === "rtl";
  const dashboardItem = useMemo(() => getDashboardMenuItem(user, isRtl), [user, isRtl]);
  const canUsePatientProfile = useMemo(() => shouldShowPatientProfileLink(user), [user]);

  const openDashboard = useCallback(() => {
    setAccountOpen(false);
    if (dashboardItem) navigate(dashboardItem.href);
  }, [dashboardItem, navigate]);

  const openPatientProfile = useCallback(() => {
    setAccountOpen(false);
    navigate(PATIENT_PROFILE_PATH);
  }, [navigate]);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await logout();
      setAccountOpen(false);
      navigate("/", { replace: true });
    } finally {
      setLoggingOut(false);
    }
  }, [logout, navigate]);

  const accountName = (lang === 'en' && user?.fullNameEn ? user.fullNameEn : user?.fullName) || user?.name || user?.userName || user?.email || "";
  const accountEmail = user?.email && user.email !== accountName ? user.email : "";
  const initial = accountName.trim()?.[0]?.toUpperCase() || "?";

  return (
    <header
      dir={t.dir}
      className={[
        "sticky top-0 z-40 transition-all duration-300",
        scrolled
          ? "bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm"
          : "bg-[#418989] backdrop-blur border-b border-white/10",
      ].join(" ")}
    >
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between py-3">
          <button
            type="button"
            onClick={handleLogoClick}
            className="flex items-center gap-3 justify-self-start transition-opacity hover:opacity-90"
          >
            <img src={Logo} alt="Medora Logo" className="h-10 w-auto object-contain" />
            <span className={["text-2xl font-bold transition-colors duration-300", scrolled ? "text-[#14b8a6]" : "text-white"].join(" ")}>
              {t.brand}
            </span>
          </button>

          <nav className="hidden items-center justify-center gap-4 text-sm font-medium md:flex">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(event) => {
                  event.preventDefault();
                  navigate(link.href);
                }}
                className={[
                  "relative flex cursor-pointer items-center gap-1 transition-colors duration-300",
                  scrolled ? "text-slate-700 hover:text-[#14b8a6]" : "text-white/90 hover:text-[#23cfbb]",
                  "after:absolute after:-bottom-1 after:right-0 after:h-0.5 after:w-0 after:bg-[#14b8a6] after:transition-all after:duration-300 hover:after:w-full",
                ].join(" ")}
              >
                {link.icon && <link.icon className="h-3.5 w-3.5 shrink-0" />}
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
            <LangToggle lang={lang} onToggle={toggleLang} scrolled={scrolled} />

            <span className={["hidden h-5 w-px md:block", scrolled ? "bg-slate-300" : "bg-white/30"].join(" ")} />

            {canUsePatientProfile && <PatientNotificationBell variant="navbar" />}

            {user ? (
              <div className="relative" ref={accountRef}>
                <AccountMenu
                  accountName={accountName}
                  accountEmail={accountEmail}
                  initial={initial}
                  onToggle={() => setAccountOpen((open) => !open)}
                  open={accountOpen}
                  scrolled={scrolled}
                  dashboardItem={dashboardItem}
                  onDashboard={openDashboard}
                  canUsePatientProfile={canUsePatientProfile}
                  onPatientProfile={openPatientProfile}
                  onLogout={handleLogout}
                  loggingOut={loggingOut}
                  isRtl={isRtl}
                />
              </div>
            ) : (
              <div className="hidden items-center gap-2 md:flex">
                <button
                  type="button"
                  onClick={goLogin}
                  className={[
                    "rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-500 border",
                    scrolled
                      ? "bg-transparent text-[#14b8a6] border-slate-200 hover:bg-[#14b8a6]/10 hover:border-[#14b8a6]/30"
                      : "bg-transparent text-white/90 border-white/30 hover:bg-white/15 hover:text-white hover:border-white/50",
                  ].join(" ")}
                >
                  {t.nav_login}
                </button>
                <button
                  type="button"
                  onClick={goRegister}
                  className="rounded-lg bg-[#14b8a6] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#119a8a]"
                >
                  {t.nav_register}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
});
