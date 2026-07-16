import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Home, LogOut, ScanSearch as Search, Sparkles, User } from 'lucide-react';
import { useLang } from '../../../context/LanguageContext';
import { getLocalizedText } from '../../../utils/localization';
import { avatarForName } from '../../../utils/professionalApiMappers';
import { medoraApi } from '../../../api/medoraApi';
import LangToggleBtn from '../../LangToggleBtn';
import { useAuth } from '../../../context/AuthContext';
import { useNotifications } from '../../../hooks/useNotifications';

export default function DoctorTopbar({ title, subtitle }) {
  const navigate = useNavigate();
  const { lang } = useLang();
  const { logout } = useAuth();
  const isRtl = lang !== 'en';
  const { notifications, unreadCount, markAllAsRead, markAsRead, error } = useNotifications();
  const [openNotifs, setOpenNotifs] = useState(false);
  const [openMenu, setOpenMenu] = useState(false);
  const [profile, setProfile] = useState(null);
  const dropdownSideClass = isRtl ? 'sm:left-0' : 'sm:right-0';
  const displayProfile = useMemo(() => {
    const name = (lang === 'en' && profile?.fullNameEn ? profile.fullNameEn : profile?.fullName) || (isRtl ? 'طبيب ميدورا' : 'Medora doctor');
    const specialty = profile?.specialtyNameAr || profile?.specialtyNameEn || (isRtl ? 'طبيب' : 'Doctor');
    return {
      name,
      specialty,
      avatar: profile?.profileImageUrl || avatarForName(name),
    };
  }, [isRtl, profile]);

  useEffect(() => {
    let mounted = true;
    medoraApi.doctorMe()
      .then((data) => {
        if (mounted) setProfile(data);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const goTo = (path) => {
    setOpenMenu(false);
    setOpenNotifs(false);
    navigate(path);
  };

  const handleLogout = async () => {
    setOpenMenu(false);
    setOpenNotifs(false);
    await logout();
    navigate('/sign-in', { replace: true });
  };

  return (
    <header
      dir={isRtl ? 'rtl' : 'ltr'}
      className="sticky top-0 z-20 flex min-h-[64px] items-center justify-between gap-2 border-b border-[#e4eeee] bg-white/95 px-3 py-2 backdrop-blur sm:min-h-[72px] sm:gap-3 sm:px-6 sm:py-3"
      style={{ fontFamily: 'Cairo, sans-serif' }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-black text-[#084036] sm:text-[20px]">{title}</h1>
          {subtitle && <p className="mt-0.5 hidden truncate text-[11px] text-slate-500 sm:block sm:text-[12px]">{subtitle}</p>}
        </div>
      </div>

      <div className="hidden max-w-md flex-1 md:block">
        <div className="relative">
          <input
            type="search"
            placeholder={isRtl ? 'ابحث عن مريض، موعد، أو روشتة...' : 'Search patients, appointments, or prescriptions...'}
            className={[
              'h-10 w-full rounded-xl border border-[#e4eeee] bg-[#f7fbfb] text-[12px] text-[#295d60] outline-none transition focus:border-[#14b8a6] focus:bg-white',
              isRtl ? 'pr-10 pl-4 text-start' : 'pl-10 pr-4 text-left',
            ].join(' ')}
          />
          <Search
            size={15}
            className={[
              'pointer-events-none absolute top-1/2 -translate-y-1/2 text-[#14b8a6]',
              isRtl ? 'right-3' : 'left-3',
            ].join(' ')}
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => goTo('/')}
          className="inline-flex h-9 w-9 items-center justify-center gap-2 rounded-xl border border-[#e4eeee] text-[12px] font-bold text-[#295d60] transition hover:border-[#14b8a6] hover:text-[#119a8a] sm:h-10 sm:w-auto sm:px-3"
          aria-label={isRtl ? 'الذهاب إلى الصفحة الرئيسية' : 'Go to main website'}
          title={isRtl ? 'الصفحة الرئيسية' : 'Main website'}
        >
          <Home size={16} />
          <span className="hidden sm:inline">{isRtl ? 'الرئيسية' : 'Home'}</span>
        </button>

        <LangToggleBtn variant="topbar" />

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setOpenNotifs((v) => !v);
              setOpenMenu(false);
            }}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#e4eeee] text-[#295d60] transition hover:border-[#14b8a6] hover:text-[#119a8a] sm:h-10 sm:w-10"
            aria-label={isRtl ? 'إشعارات' : 'Notifications'}
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ef4444] px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {openNotifs && (
            <div className={`fixed inset-x-3 top-[70px] z-50 overflow-hidden rounded-2xl border border-[#e4eeee] bg-white shadow-[0_24px_50px_rgba(8,64,54,0.18)] sm:absolute sm:inset-x-auto sm:top-auto sm:mt-2 sm:w-80 ${dropdownSideClass}`}>
              <div className="flex items-center justify-between border-b border-[#e4eeee] px-4 py-3">
                <button type="button" onClick={markAllAsRead} className="text-[11px] font-bold text-[#14b8a6] hover:underline">
                  {isRtl ? 'تعليم الكل كمقروء' : 'Mark all as read'}
                </button>
                <span className="text-[12px] font-extrabold text-[#084036]">
                  {isRtl ? 'الإشعارات' : 'Notifications'}
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {error ? (
                  <div className="p-4 text-center text-[12px] text-[#d14f4f]">{error}</div>
                ) : notifications.length === 0 ? (
                  <div className="p-4 text-center text-[12px] text-slate-500">
                    {isRtl ? 'لا توجد إشعارات' : 'No notifications'}
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => { if (!n.isRead) markAsRead(n.id); }}
                      className={`flex items-start gap-3 border-b border-[#f3f7f7] px-4 py-3 last:border-b-0 ${!n.isRead ? 'cursor-pointer bg-[#f7fbfb] hover:bg-[#eaf4f4]' : ''}`}
                    >
                      <span className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${!n.isRead ? 'bg-[#14b8a6]' : 'bg-transparent'}`} />
                      <div className={`flex-1 ${isRtl ? 'text-start' : 'text-left'}`}>
                        <div className={`text-[12px] text-[#084036] ${!n.isRead ? 'font-extrabold' : 'font-semibold'}`}>{n.title}</div>
                        <div className="mt-0.5 text-[11px] leading-6 text-slate-500">{n.desc}</div>
                      </div>
                      <span className="shrink-0 text-[10px] text-slate-400">{n.time}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setOpenMenu((v) => !v);
              setOpenNotifs(false);
            }}
            className="flex h-9 items-center gap-2 rounded-xl border border-[#e4eeee] bg-white px-1 transition hover:border-[#14b8a6] sm:h-auto sm:py-1.5 sm:pl-2 sm:pr-1.5"
          >
            <ChevronDown size={12} className="text-slate-400" />
            <div className={`hidden sm:block ${isRtl ? 'text-start' : 'text-left'}`}>
              <div className="text-[12px] font-bold text-[#084036]">{getLocalizedText(displayProfile.name, lang, '')}</div>
              <div className="text-[10px] text-slate-500">{getLocalizedText(displayProfile.specialty, lang, '')}</div>
            </div>
            <div className="h-9 w-9 overflow-hidden rounded-xl bg-[#14b8a6]">
              <img src={displayProfile.avatar} alt="" className="h-full w-full object-cover" />
            </div>
          </button>

          {openMenu && (
            <div className={`fixed inset-x-3 top-[70px] z-50 overflow-hidden rounded-2xl border border-[#e4eeee] bg-white shadow-[0_24px_50px_rgba(8,64,54,0.18)] sm:absolute sm:inset-x-auto sm:top-auto sm:mt-2 sm:w-56 ${dropdownSideClass}`}>
              <button
                type="button"
                onClick={() => {
                  setOpenMenu(false);
                  goTo('/doctor/profile');
                }}
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-[12px] font-bold text-[#295d60] transition hover:bg-[#f7fbfb] ${isRtl ? 'text-start' : 'text-left'}`}
              >
                <User size={13} />
                {isRtl ? 'الملف الشخصي' : 'Profile'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpenMenu(false);
                  goTo('/doctor/settings');
                }}
                className={`flex w-full items-center gap-2 border-t border-[#f3f7f7] px-4 py-2.5 text-[12px] font-bold text-[#295d60] transition hover:bg-[#f7fbfb] ${isRtl ? 'text-start' : 'text-left'}`}
              >
                <Sparkles size={13} />
                {isRtl ? 'إعدادات الحساب' : 'Account settings'}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className={`flex w-full items-center gap-2 border-t border-[#f3f7f7] bg-[#fff8f8] px-4 py-2.5 text-[12px] font-bold text-[#d14f4f] transition hover:bg-[#fdecec] ${isRtl ? 'text-start' : 'text-left'}`}
              >
                <LogOut size={13} />
                {isRtl ? 'تسجيل الخروج' : 'Sign out'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
