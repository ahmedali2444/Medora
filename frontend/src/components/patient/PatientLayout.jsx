import React, { useEffect, useState } from 'react';
import Footer from '../Home_Page/Footer';
import PatientSidebar from './PatientSidebar';
import PatientNotificationBell from './PatientNotificationBell';
import { Menu, X } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';

const SIDEBAR_STORAGE_KEY = 'medora-patient-sidebar';

function getStoredSidebarVisible() {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) !== 'collapsed';
}

export default function PatientLayout({ children }) {
  const { lang, t } = useLang();
  const isRtl = lang !== 'en';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(getStoredSidebarVisible);
  const [isDesktopViewport, setIsDesktopViewport] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : false,
  );

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
    <div dir={t?.dir || (isRtl ? 'rtl' : 'ltr')} className="min-h-screen flex flex-col bg-[#f8fcfc] font-cairo text-[#084036]">
      <main className="flex-1 flex flex-col relative z-10">
        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white shadow-sm z-30 flex items-center px-4">
          <button
            type="button"
            aria-label={isRtl ? 'القائمة' : 'Menu'}
            className="absolute top-3 right-4 w-10 h-10 text-[#084036] flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors z-50"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <div className="flex-1 flex justify-center">
            <span className="font-black text-xl text-[#14b8a6]">ميدورا</span>
          </div>
        </div>

        <PatientSidebar 
          open={sidebarOpen}
          onNavigate={closeMobileSidebar}
          onToggleSidebar={toggleSidebar}
          expanded={sidebarExpanded}
        />
        
        <div className={`flex-1 overflow-x-hidden min-h-screen transition-[padding] duration-200 ${desktopOffsetClass} pt-16 lg:pt-0`}>
          <div className="p-4 lg:p-8 max-w-6xl mx-auto h-full relative">
            <div className={`absolute top-4 lg:top-8 ${isRtl ? 'left-4 lg:left-8' : 'right-4 lg:right-8'} z-20`}>
              <PatientNotificationBell />
            </div>
            <div className="mt-8 lg:mt-0">
              {children}
            </div>
          </div>
        </div>
      </main>
      <div className={`transition-[padding] duration-200 ${desktopOffsetClass}`}>
        <Footer />
      </div>
    </div>
  );
}
