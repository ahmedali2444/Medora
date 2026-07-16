import React, { useEffect, useState } from 'react';
import DoctorSidebar from './DoctorSidebar';
import DoctorTopbar from './DoctorTopbar';
import { useLang } from '../../../context/LanguageContext';
import { getLocalizedText } from '../../../utils/localization';
import { medoraApi } from '../../../api/medoraApi';

export default function DoctorLayout({ children, title, subtitle }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [appointmentBadge, setAppointmentBadge] = useState(0);
  const [isDesktopViewport, setIsDesktopViewport] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : false,
  );
  const { lang, t } = useLang();
  const isRtl = t.dir === 'rtl';

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
    let mounted = true;
    medoraApi.doctorStats()
      .then((stats) => {
        if (!mounted) return;
        setAppointmentBadge(Number(stats?.todayPatientsCount ?? stats?.pendingAppointmentsCount ?? 0));
      })
      .catch((error) => {
        if (mounted) setAppointmentBadge(0);
        console.warn('Unable to load doctor stats badge', error);
      });

    return () => { mounted = false; };
  }, []);

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
  const mobileRailOffsetClass = sidebarExpanded ? '' : (isRtl ? 'pr-[72px]' : 'pl-[72px]');

  return (
    <div
      dir={t.dir}
      style={{ fontFamily: 'Cairo, sans-serif' }}
      className="relative min-h-screen overflow-x-hidden bg-[#f3fafa] text-[#084036]"
    >
      <DoctorSidebar
        open={sidebarOpen}
        onNavigate={closeMobileSidebar}
        onToggleSidebar={toggleSidebar}
        expanded={sidebarExpanded}
        badges={{ appointments: appointmentBadge }}
      />

      <div className={['min-w-0 overflow-x-hidden transition-[padding] duration-200', mobileRailOffsetClass, desktopOffsetClass].join(' ')}>
        <DoctorTopbar
          title={getLocalizedText(title, lang, title)}
          subtitle={getLocalizedText(subtitle, lang, subtitle)}
        />

        <main className="overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
