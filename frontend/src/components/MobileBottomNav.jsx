import { memo, useCallback, useMemo, useState } from "react";
import { Bot, Home, LayoutDashboard, LogOut, Menu, Newspaper, Stethoscope, UserCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import { getUserDestination, hasDashboardDestination, PATIENT_PROFILE_PATH, shouldShowPatientProfileLink } from "../utils/userDestination";

const BRAND = "#14b8a6";

export default memo(function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLang();
  const { user, logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const tabs = useMemo(
    () => [
      { label: t.nav_home, icon: Home, path: "/" },
      { label: t.nav_doctors, icon: Stethoscope, path: "/doctors" },
      { label: t.nav_ai, icon: Bot, path: "/ai-consultation" },
      { label: t.nav_articles, icon: Newspaper, path: "/articles" },
      { label: t.nav_contact, icon: Menu, path: "__more__" },
    ],
    [t],
  );

  const moreLinks = useMemo(() => {
    const links = [
      { label: t.footer_find_medicine, path: "/medicine" },
      { label: t.nav_contact, path: "/contact" },
      { label: t.nav_doctors, path: "/doctors" },
    ];

    if (!user) {
      links.push({ label: t.nav_login, path: "/sign-in" });
      links.push({ label: t.nav_register, path: "/sign-up" });
    }

    return links;
  }, [t, user]);

  const isActive = useCallback(
    (path) => {
      if (path === "/") return location.pathname === "/";
      return location.pathname.startsWith(path);
    },
    [location.pathname],
  );

  const openUserDestination = useCallback(() => {
    setMoreOpen(false);
    navigate(getUserDestination(user));
  }, [navigate, user]);

  const openPatientProfile = useCallback(() => {
    setMoreOpen(false);
    navigate(PATIENT_PROFILE_PATH);
  }, [navigate]);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await logout();
      setMoreOpen(false);
      navigate("/", { replace: true });
    } finally {
      setLoggingOut(false);
    }
  }, [logout, navigate]);

  const canOpenDashboard = hasDashboardDestination(user);
  const canUsePatientProfile = shouldShowPatientProfileLink(user);

  return (
    <>
      {moreOpen && (
        <div
          className="fixed inset-0 z-998 bg-black/30 backdrop-blur-sm"
          onClick={() => setMoreOpen(false)}
        />
      )}

      <div
        className="fixed left-0 right-0 z-999 transition-all duration-300 ease-in-out"
        style={{
          bottom: moreOpen ? 72 : -300,
          opacity: moreOpen ? 1 : 0,
          pointerEvents: moreOpen ? "auto" : "none",
        }}
      >
        <div
          className="mx-4 mb-4 flex flex-col overflow-hidden rounded-2xl shadow-2xl"
          style={{ background: "#fff", border: "1px solid #e8f0ef" }}
        >
          {user && (
            <div className="border-b border-[#f0f5f4] bg-slate-50" style={{ direction: t.dir }}>
              <div className="px-5 py-3 text-start">
                <p className="truncate text-sm font-bold text-slate-800">{user.name}</p>
                {user.email && <p className="truncate text-xs text-slate-500">{user.email}</p>}
              </div>

              {canOpenDashboard && (
                <button
                  type="button"
                  onClick={openUserDestination}
                  className="flex w-full items-center gap-3 border-t border-[#f0f5f4] px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-teal-50"
                >
                  <LayoutDashboard size={17} />
                  {t.dir === "rtl" ? "لوحة التحكم" : "Dashboard"}
                </button>
              )}

              {canUsePatientProfile && (
                <button
                  type="button"
                  onClick={openPatientProfile}
                  className="flex w-full items-center gap-3 border-t border-[#f0f5f4] px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-teal-50"
                >
                  <UserCircle size={17} />
                  {t.dir === "rtl" ? "ملفي" : "My Profile"}
                </button>
              )}

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex w-full items-center gap-3 border-t border-[#f0f5f4] px-5 py-3 text-sm font-semibold text-[#d14f4f] transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <LogOut size={17} />
                {loggingOut ? (t.dir === "rtl" ? "جارٍ الخروج..." : "Signing out...") : t.dir === "rtl" ? "تسجيل الخروج" : "Sign out"}
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {moreLinks.map((link, index) => (
              <button
                key={link.path}
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  navigate(link.path);
                }}
                className="flex w-full items-center gap-3 px-5 py-3.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-teal-50"
                style={{
                  borderBottom: index < moreLinks.length - 1 ? "1px solid #f0f5f4" : "none",
                  direction: t.dir,
                }}
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-999 md:hidden"
        style={{
          background: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderTop: "1px solid #e8f0ef",
          boxShadow: "0 -2px 20px rgba(0,0,0,0.06)",
        }}
      >
        <div
          className="flex items-center justify-around px-2"
          style={{ height: 64, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = tab.path !== "__more__" && isActive(tab.path);
            const isMore = tab.path === "__more__";

            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => {
                  if (isMore) {
                    setMoreOpen((value) => !value);
                  } else {
                    setMoreOpen(false);
                    navigate(tab.path);
                  }
                }}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-all"
                style={{ minWidth: 0 }}
              >
                <div
                  className="flex items-center justify-center rounded-xl transition-all duration-200"
                  style={{
                    width: 40,
                    height: 32,
                    background: active ? `${BRAND}15` : "transparent",
                  }}
                >
                  <Icon
                    style={{
                      width: 22,
                      height: 22,
                      color: active ? BRAND : "#94a3b8",
                      strokeWidth: active ? 2.5 : 1.8,
                      transition: "all 0.2s ease",
                    }}
                  />
                </div>
                <span
                  className="max-w-full truncate px-1 text-[10px] font-semibold leading-tight"
                  style={{
                    color: active ? BRAND : "#94a3b8",
                    transition: "color 0.2s ease",
                  }}
                >
                  {isMore ? (t.dir === "rtl" ? "المزيد" : "More") : tab.label}
                </span>
                {active && (
                  <div
                    className="mt-0.5 rounded-full"
                    style={{ width: 4, height: 4, background: BRAND }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="md:hidden" style={{ height: 72 }} />
    </>
  );
});
