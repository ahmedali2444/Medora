import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { CalendarCheck, ClipboardList, Heart, Package, Settings, LogOut, User, Menu, Home } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';

const COPY = {
  title: { ar: 'لوحة المريض', en: 'Patient Portal' },
  home: { ar: 'الرئيسية', en: 'Home' },
  appointments: { ar: 'حجوزاتي', en: 'Appointments' },
  orders: { ar: 'طلباتي', en: 'Orders' },
  favorites: { ar: 'المفضلة', en: 'Favorites' },
  prescriptions: { ar: 'روشتاتي', en: 'Prescriptions' },
  settings: { ar: 'الإعدادات', en: 'Settings' },
  logout: { ar: 'تسجيل الخروج', en: 'Logout' },
};

export default function PatientSidebar({ open, onNavigate, onToggleSidebar, expanded }) {
  const { logout, user } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();
  const isRtl = lang !== 'en';

  const links = [
    { path: '/', label: COPY.home[lang] || COPY.home.ar, icon: Home },
    { path: '/patient/appointments', label: COPY.appointments[lang] || COPY.appointments.ar, icon: CalendarCheck },
    { path: '/patient/orders', label: COPY.orders[lang] || COPY.orders.ar, icon: Package },
    { path: '/patient/favorites', label: COPY.favorites[lang] || COPY.favorites.ar, icon: Heart },
    { path: '/patient/prescriptions', label: COPY.prescriptions[lang] || COPY.prescriptions.ar, icon: ClipboardList },
    { path: '/patient/settings', label: COPY.settings[lang] || COPY.settings.ar, icon: Settings },
  ];

  const sideClass = isRtl
    ? 'right-0 border-l shadow-[-20px_0_50px_rgba(8,64,54,0.12)]'
    : 'left-0 border-r shadow-[20px_0_50px_rgba(8,64,54,0.12)]';
  const widthClass = expanded ? 'w-[260px]' : 'w-[72px]';
  const sidebarToggleLabel = expanded
    ? (isRtl ? 'إغلاق القائمة' : 'Close menu')
    : (isRtl ? 'فتح القائمة' : 'Open menu');

  const handleLogout = async () => {
    await logout();
    onNavigate?.();
    navigate('/sign-in', { replace: true });
  };

  const renderLink = (link) => {
    const LinkIcon = link.icon;
    return (
      <NavLink
        key={link.path}
        to={link.path}
        end={link.path === '/'}
        onClick={onNavigate}
        title={link.label}
        aria-label={link.label}
        className={({ isActive }) =>
          expanded
            ? [
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all',
                isActive
                  ? 'bg-[#14b8a6] text-white shadow-[0_10px_22px_rgba(20,184,166,0.25)]'
                  : 'text-[#295d60] hover:bg-[#f7fbfb] hover:text-[#119a8a]',
              ].join(' ')
            : [
                'group relative mx-auto flex h-11 w-11 items-center justify-center rounded-xl text-[#295d60] transition-all',
                isActive
                  ? 'bg-[#14b8a6] text-white shadow-[0_10px_22px_rgba(20,184,166,0.25)]'
                  : 'hover:bg-[#f7fbfb] hover:text-[#119a8a]',
              ].join(' ')
        }
      >
        {({ isActive }) => (
          <>
            <span
              className={`flex items-center justify-center rounded-lg ${
                expanded ? 'h-8 w-8' : 'h-9 w-9'
              } ${
                isActive
                  ? 'bg-white/20 text-white'
                  : expanded
                    ? 'bg-[#f7fbfb] text-[#14b8a6] group-hover:bg-white'
                    : 'text-[#14b8a6]'
              }`}
            >
              <LinkIcon size={16} />
            </span>
            {expanded && <span className={`flex-1 ${isRtl ? 'text-start' : 'text-left'}`}>{link.label}</span>}
          </>
        )}
      </NavLink>
    );
  };

  return (
    <>
      {open && expanded && (
        <div onClick={onNavigate} className="fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-sm lg:hidden" />
      )}
      <aside
        dir={isRtl ? 'rtl' : 'ltr'}
        className={[
          'fixed inset-y-0 z-40 flex h-screen flex-col overflow-hidden border-[#e4eeee] bg-white transition-[width,transform,opacity] duration-200 pt-16 lg:pt-0',
          sideClass,
          widthClass,
          open || expanded ? 'translate-x-0 opacity-100' : isRtl ? 'translate-x-full opacity-100 lg:translate-x-0' : '-translate-x-full opacity-100 lg:translate-x-0',
        ].join(' ')}
      >
        <div className={`flex items-center border-b border-[#e4eeee] py-4 ${expanded ? 'justify-between gap-3 px-3' : 'flex-col justify-center gap-3 px-2'}`}>
          <button
            type="button"
            onClick={onToggleSidebar}
            className="hidden lg:inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e4eeee] text-[#295d60] transition hover:border-[#14b8a6] hover:text-[#119a8a]"
            aria-label={sidebarToggleLabel}
            title={sidebarToggleLabel}
            aria-pressed={expanded}
          >
            <Menu size={18} />
          </button>

          {expanded && (
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="h-11 w-11 shrink-0 rounded-2xl bg-[#14b8a6]/10 text-[#14b8a6] flex items-center justify-center">
                <User size={22} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-black text-[#084036] truncate">{(lang === 'en' && user?.fullNameEn ? user.fullNameEn : user?.fullName) || user?.name || user?.email || (COPY.title[lang] || COPY.title.ar)}</div>
                {user?.email && <div className="text-[11px] text-slate-500 truncate" dir="ltr">{user.email}</div>}
              </div>
            </div>
          )}

          {!expanded && (
            <div className="h-9 w-9 rounded-2xl bg-[#14b8a6]/10 text-[#14b8a6] flex items-center justify-center">
              <User size={18} />
            </div>
          )}
        </div>

        <div className={`flex-1 overflow-y-auto ${expanded ? 'px-3 py-4' : 'px-2 py-3'}`}>
          <nav className={`flex flex-col ${expanded ? 'gap-1' : 'gap-2'}`}>
            {links.map(renderLink)}
          </nav>
        </div>

        <div className={`border-t border-[#e4eeee] ${expanded ? 'px-5 py-4' : 'px-2 py-3'}`}>
          <button
            type="button"
            onClick={handleLogout}
            title={COPY.logout[lang] || COPY.logout.ar}
            aria-label={COPY.logout[lang] || COPY.logout.ar}
            className={expanded
              ? 'flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-bold text-[#d14f4f] transition hover:bg-[#fdecec]'
              : 'mx-auto flex h-11 w-11 items-center justify-center rounded-xl text-[#d14f4f] transition hover:bg-[#fdecec]'
            }
          >
            <LogOut size={expanded ? 14 : 16} />
            {expanded && <span>{COPY.logout[lang] || COPY.logout.ar}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
