import React, { useEffect, useState } from 'react';
import { AlertCircle, LoaderCircle, Save, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';
import { useLang } from '../../../context/LanguageContext';
import { getLocalizedText, localizedText } from '../../../utils/localization';

const SIDEBAR_STORAGE_KEY = 'medora-admin-sidebar';
const UNSAVED_COPY = {
  title: localizedText('تغييرات غير محفوظة', 'Unsaved changes'),
  desc: localizedText(
    'لديك تعديلات لم يتم حفظها بعد. احفظ التغييرات قبل المغادرة أو تجاهلها للمتابعة.',
    'You have changes that have not been saved yet. Save them before leaving or discard them to continue.',
  ),
  stay: localizedText('البقاء هنا', 'Stay here'),
  discard: localizedText('تجاهل التغييرات', 'Discard changes'),
  saveLeave: localizedText('حفظ ومغادرة', 'Save and leave'),
  saving: localizedText('جارٍ الحفظ...', 'Saving...'),
};

function getStoredSidebarVisible() {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) !== 'collapsed';
}

function getPathValue(to) {
  if (!to) return '';
  if (typeof to === 'string') return to;
  return `${to.pathname || ''}${to.search || ''}${to.hash || ''}`;
}

export default function AdminLayout({ children, title, subtitle, navigationGuard }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(getStoredSidebarVisible);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [guardSaving, setGuardSaving] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : false,
  );
  const { lang, t } = useLang();
  const isRtl = t.dir === 'rtl';
  const hasUnsavedChanges = Boolean(navigationGuard?.when);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const handleChange = (event) => {
      setIsDesktopViewport(event.matches);
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarVisible ? 'expanded' : 'collapsed');
  }, [sidebarVisible]);

  const closeMobileSidebar = () => {
    setSidebarOpen(false);
  };

  const requestNavigation = (to, event) => {
    const currentPath = `${location.pathname}${location.search}${location.hash}`;
    const nextPath = getPathValue(to);

    if (!to || !hasUnsavedChanges || nextPath === currentPath) {
      closeMobileSidebar();
      return true;
    }

    event?.preventDefault();
    setPendingNavigation({ to });
    setSidebarOpen(false);
    return false;
  };

  const completeNavigation = (to) => {
    setPendingNavigation(null);
    navigate(to);
  };

  const handleSaveAndLeave = async () => {
    if (!pendingNavigation || guardSaving) return;

    setGuardSaving(true);
    let saved = false;
    try {
      saved = await navigationGuard?.onSave?.();
    } catch {
      saved = false;
    } finally {
      setGuardSaving(false);
    }

    if (saved !== false) {
      completeNavigation(pendingNavigation.to);
    }
  };

  const handleDiscardAndLeave = () => {
    if (!pendingNavigation) return;
    navigationGuard?.onDiscard?.();
    completeNavigation(pendingNavigation.to);
  };

  const toggleSidebar = () => {
    if (isDesktopViewport) {
      setSidebarOpen(false);
      setSidebarVisible((visible) => !visible);
      return;
    }

    setSidebarOpen((open) => !open);
  };

  const desktopOffsetClass = sidebarVisible
    ? (isRtl ? 'lg:pr-[260px]' : 'lg:pl-[260px]')
    : (isRtl ? 'lg:pr-[72px]' : 'lg:pl-[72px]');
  const sidebarExpanded = isDesktopViewport ? sidebarVisible : sidebarOpen;
  const mobileRailOffsetClass = sidebarExpanded ? '' : (isRtl ? 'pr-[72px]' : 'pl-[72px]');

  return (
    <div
      dir={t.dir}
      style={{ fontFamily: 'Cairo, sans-serif' }}
      className="relative min-h-screen overflow-x-hidden bg-[#f3fafa] text-[#084036]"
    >
      <AdminSidebar
        open={sidebarOpen}
        onNavigate={requestNavigation}
        onToggleSidebar={toggleSidebar}
        expanded={sidebarExpanded}
      />

      <div className={['min-w-0 overflow-x-hidden transition-[padding] duration-200', mobileRailOffsetClass, desktopOffsetClass].join(' ')}>
        <AdminTopbar
          title={getLocalizedText(title, lang, title)}
          subtitle={getLocalizedText(subtitle, lang, subtitle)}
          onRequestNavigate={requestNavigation}
        />

        <main className="overflow-x-hidden px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      {pendingNavigation && (
        <div className="medora-modal-overlay medora-modal-overlay--elevated">
          <div
            className="medora-modal-panel medora-modal-panel--sm"
            role="dialog"
            aria-modal="true"
          >
            <div className="medora-modal-header flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <AlertCircle size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-black text-[#084036]">{getLocalizedText(UNSAVED_COPY.title, lang)}</h3>
                <p className="mt-1 text-[12px] leading-6 text-slate-500">{getLocalizedText(UNSAVED_COPY.desc, lang)}</p>
              </div>
            </div>

            <div className="medora-modal-footer flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={guardSaving}
                onClick={() => setPendingNavigation(null)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e4eeee] bg-white px-4 py-2.5 text-[12px] font-bold text-[#486466] transition hover:border-[#14b8a6] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <X size={14} />
                {getLocalizedText(UNSAVED_COPY.stay, lang)}
              </button>
              <button
                type="button"
                disabled={guardSaving}
                onClick={handleDiscardAndLeave}
                className="rounded-xl border border-[#f4d0d0] bg-[#fff8f8] px-4 py-2.5 text-[12px] font-bold text-[#c2362f] transition hover:bg-[#fdecec] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {getLocalizedText(UNSAVED_COPY.discard, lang)}
              </button>
              <button
                type="button"
                disabled={guardSaving}
                onClick={handleSaveAndLeave}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#14b8a6] px-4 py-2.5 text-[12px] font-extrabold text-white shadow-[0_10px_22px_rgba(20,184,166,0.25)] transition hover:bg-[#119a8a] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {guardSaving ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
                {guardSaving ? getLocalizedText(UNSAVED_COPY.saving, lang) : getLocalizedText(UNSAVED_COPY.saveLeave, lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
