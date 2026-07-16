import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  CalendarCheck,
  Database,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessagesSquare,
  Newspaper,
  Package,
  Pill,
  Settings,
  Stethoscope,
  Users,
} from 'lucide-react';
import { useLang } from '../../../context/LanguageContext';
import { medoraApi } from '../../../api/medoraApi';
import { useAuth } from '../../../context/AuthContext';

function buildPrimary(isRtl, badges) {
  return [
    { id: 'overview', icon: LayoutDashboard, label: isRtl ? 'نظرة عامة' : 'Overview', path: '/admin/overview' },
    { id: 'users', icon: Users, label: isRtl ? 'المستخدمون' : 'Users', path: '/admin/users' },
    { id: 'doctors', icon: Stethoscope, label: isRtl ? 'الأطباء' : 'Doctors', path: '/admin/doctors', badge: badges.doctors },
    { id: 'pharmacies', icon: Building2, label: isRtl ? 'الصيدليات' : 'Pharmacies', path: '/admin/pharmacies', badge: badges.pharmacies },
    { id: 'medicines', icon: Pill, label: isRtl ? 'الأدوية' : 'Medicines', path: '/admin/medicines' },
    { id: 'appointments', icon: CalendarCheck, label: isRtl ? 'المواعيد' : 'Appointments', path: '/admin/appointments' },
    { id: 'orders', icon: Package, label: isRtl ? 'الطلبات' : 'Orders', path: '/admin/orders' },
    { id: 'articles', icon: Newspaper, label: isRtl ? 'المقالات' : 'Articles', path: '/admin/articles', badge: badges.articles },
    { id: 'reviews', icon: MessagesSquare, label: isRtl ? 'التقييمات' : 'Reviews', path: '/admin/reviews' },
    { id: 'reports', icon: BarChart3, label: isRtl ? 'التقارير' : 'Reports', path: '/admin/reports' },
    { id: 'lookups', icon: Database, label: isRtl ? 'القوائم' : 'Lookups', path: '/admin/lookups' },
  ];
}

function buildSecondary(isRtl) {
  return [
    { id: 'home', icon: Home, label: isRtl ? 'الصفحة الرئيسية' : 'Main website', path: '/' },
    { id: 'settings', icon: Settings, label: isRtl ? 'إعدادات المنصة' : 'Platform settings', path: '/admin/settings' },
  ];
}

export default function AdminSidebar({ open, onNavigate, onToggleSidebar, expanded }) {
  const navigate = useNavigate();
  const { lang } = useLang();
  const { logout } = useAuth();
  const isRtl = lang !== 'en';
  const [badges, setBadges] = useState({ doctors: 0, pharmacies: 0, articles: 0 });
  const primary = useMemo(() => buildPrimary(isRtl, badges), [badges, isRtl]);
  const secondary = useMemo(() => buildSecondary(isRtl), [isRtl]);
  const sideClass = isRtl
    ? 'right-0 border-l shadow-[-20px_0_50px_rgba(8,64,54,0.12)]'
    : 'left-0 border-r shadow-[20px_0_50px_rgba(8,64,54,0.12)]';
  const widthClass = expanded ? 'w-[260px]' : 'w-[72px]';
  const sidebarToggleLabel = expanded
    ? (isRtl ? 'إغلاق القائمة' : 'Close menu')
    : (isRtl ? 'فتح القائمة' : 'Open menu');

  useEffect(() => {
    let mounted = true;
    Promise.all([
      medoraApi.adminStats(),
      medoraApi.adminArticles({ page: 1, pageSize: 1, status: 'pending' }),
    ])
      .then(([stats, articles]) => {
        if (!mounted) return;
        setBadges({
          doctors: stats?.pendingDoctorVerifications || 0,
          pharmacies: stats?.pendingPharmacyVerifications || 0,
          articles: articles?.total || 0,
        });
      })
      .catch((error) => {
        if (mounted) setBadges({ doctors: 0, pharmacies: 0, articles: 0 });
        console.warn('Unable to load admin sidebar badges', error);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const renderLink = (item) => {
    const Icon = item.icon;
    const hasBadge = Number(item.badge) > 0;
    return (
      <NavLink
        key={item.id}
        to={item.path}
        end
        onClick={(event) => onNavigate(item.path, event)}
        title={item.label}
        aria-label={item.label}
        className={({ isActive }) =>
          expanded
            ? [
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all',
                isActive
                  ? 'bg-[#14b8a6] text-white shadow-[0_10px_22px_rgba(20,184,166,0.25)]'
                  : 'text-[#486466] hover:bg-[#e6f7f7] hover:text-[#119a8a]',
              ].join(' ')
            : [
                'group relative mx-auto flex h-11 w-11 items-center justify-center rounded-xl text-[#486466] transition-all',
                isActive
                  ? 'bg-[#14b8a6] text-white shadow-[0_10px_22px_rgba(20,184,166,0.25)]'
                  : 'hover:bg-[#e6f7f7] hover:text-[#119a8a]',
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
                    ? 'bg-[#f1fbfa] text-[#14b8a6] group-hover:bg-white'
                    : 'text-[#14b8a6]'
              }`}
            >
              <Icon size={16} />
            </span>
            {expanded && <span className={`flex-1 ${isRtl ? 'text-start' : 'text-left'}`}>{item.label}</span>}
            {expanded && hasBadge && (
              <span
                className={`rounded-full px-1.5 text-[10px] font-black ${
                  isActive ? 'bg-white/20 text-white' : 'bg-[#ef4444] text-white'
                }`}
              >
                {item.badge}
              </span>
            )}
            {!expanded && hasBadge && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 rounded-full bg-[#ef4444] px-1 text-center text-[9px] font-black leading-4 text-white">
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            )}
          </>
        )}
      </NavLink>
    );
  };

  const handleLogout = async () => {
    await logout();
    onNavigate?.();
    navigate('/sign-in', { replace: true });
  };

  return (
    <>
      {open && expanded && (
        <div onClick={() => onNavigate()} className="fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-sm lg:hidden" />
      )}
      <aside
        dir={isRtl ? 'rtl' : 'ltr'}
        style={{ fontFamily: 'Cairo, sans-serif' }}
        className={[
          'fixed inset-y-0 z-40 flex h-screen flex-col overflow-hidden border-[#e4eeee] bg-white transition-[width,transform,opacity] duration-200',
          sideClass,
          widthClass,
          'translate-x-0 opacity-100 pointer-events-auto',
        ].join(' ')}
      >
        <div
          className={[
            'flex items-center border-b border-[#e4eeee] py-4',
            expanded ? 'px-3' : 'px-2',
            expanded ? 'justify-between gap-3' : 'flex-col justify-center gap-3',
          ].join(' ')}
        >
          <NavLink
            to="/"
            onClick={(event) => onNavigate('/', event)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#e4eeee] bg-[#f7fbfb] transition hover:border-[#14b8a6]"
            aria-label={isRtl ? 'الصفحة الرئيسية' : 'Main website'}
            title={isRtl ? 'الصفحة الرئيسية' : 'Main website'}
          >
            <img
              src="/Logo.png"
              alt="Medora"
              className="h-8 w-8 object-contain"
            />
          </NavLink>
          <button
            type="button"
            onClick={onToggleSidebar}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e4eeee] text-[#295d60] transition hover:border-[#14b8a6] hover:text-[#119a8a]"
            aria-label={sidebarToggleLabel}
            title={sidebarToggleLabel}
            aria-pressed={expanded}
          >
            <Menu size={18} />
          </button>
        </div>

        <div className={`flex-1 overflow-y-auto ${expanded ? 'px-3 py-4' : 'px-2 py-3'}`}>
          {expanded && (
            <div className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {isRtl ? 'الإدارة' : 'Management'}
            </div>
          )}
          <nav className={`flex flex-col ${expanded ? 'gap-1' : 'gap-2'}`}>{primary.map(renderLink)}</nav>

          <div className={expanded ? 'mt-6 px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400' : 'mx-auto my-3 h-px w-8 bg-[#e4eeee]'}>
            {expanded && (
              <>
                {isRtl ? 'النظام' : 'System'}
              </>
            )}
          </div>
          <nav className={`flex flex-col ${expanded ? 'gap-1' : 'gap-2'}`}>{secondary.map(renderLink)}</nav>
        </div>

        <div className={`border-t border-[#e4eeee] ${expanded ? 'px-5 py-4' : 'px-2 py-3'}`}>
          <button
            type="button"
            onClick={handleLogout}
            title={isRtl ? 'تسجيل الخروج' : 'Sign out'}
            aria-label={isRtl ? 'تسجيل الخروج' : 'Sign out'}
            className={expanded
              ? 'flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-bold text-[#d14f4f] transition hover:bg-[#fdecec]'
              : 'mx-auto flex h-11 w-11 items-center justify-center rounded-xl text-[#d14f4f] transition hover:bg-[#fdecec]'
            }
          >
            <LogOut size={expanded ? 14 : 16} />
            {expanded && (isRtl ? 'تسجيل الخروج' : 'Sign out')}
          </button>
        </div>
      </aside>
    </>
  );
}
