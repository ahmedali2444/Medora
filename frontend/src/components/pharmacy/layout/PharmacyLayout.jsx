import React, { useEffect, useState } from 'react';
import PharmacySidebar from './PharmacySidebar';
import PharmacyTopbar from './PharmacyTopbar';
import { useLang } from '../../../context/LanguageContext';
import { getLocalizedText } from '../../../utils/localization';
import { medoraApi } from '../../../api/medoraApi';

const SIDEBAR_STORAGE_KEY = 'medora-pharmacy-sidebar';

function getStoredSidebarVisible() {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) !== 'collapsed';
}

export default function PharmacyLayout({ children, title, subtitle }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(getStoredSidebarVisible);
  const [isDesktopViewport, setIsDesktopViewport] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : false,
  );
  const { lang, t } = useLang();
  const isRtl = t.dir === 'rtl';
  // BUG-10 FIX: fetch stats to build real badge counts
  const [badgeCounts, setBadgeCounts] = useState({ orders: 0, prescriptions: 0 });

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

  // BUG-10 FIX: fetch badge counts from stats API
  useEffect(() => {
    let mounted = true;
    medoraApi.pharmacyStats()
      .then((stats) => {
        if (!mounted) return;
        setBadgeCounts({
          orders: stats?.pendingOrdersCount ?? stats?.newOrdersCount ?? 0,
          prescriptions: stats?.pendingPrescriptionsCount ?? stats?.newPrescriptionsCount ?? 0,
        });
      })
      .catch((error) => {
        console.warn('Failed to load pharmacy stats', error);
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarVisible ? 'expanded' : 'collapsed');
  }, [sidebarVisible]);

  const closeMobileSidebar = () => {
    setSidebarOpen(false);
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

  return (
    <div
      dir={t.dir}
      style={{ fontFamily: 'Cairo, sans-serif' }}
      className="relative min-h-screen overflow-x-hidden bg-[#f3fafa] text-[#084036]"
    >
      <PharmacySidebar
        open={sidebarOpen}
        onNavigate={closeMobileSidebar}
        onToggleSidebar={toggleSidebar}
        expanded={sidebarExpanded}
        badgeCounts={badgeCounts}
      />

      <div className={['min-w-0 overflow-x-hidden transition-[padding] duration-200', desktopOffsetClass].join(' ')}>
        <PharmacyTopbar
          title={getLocalizedText(title, lang, title)}
          subtitle={getLocalizedText(subtitle, lang, subtitle)}
          onOpenSidebar={toggleSidebar}
        />

        <main className="overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
