import React from 'react';
import Navbar from '../../Navbar';
import Footer from '../../Home_Page/Footer';
import { Link, useLocation } from 'react-router-dom';
import { useLang } from '../../../context/LanguageContext';

export default function MedicineLayout({ children }) {
  const location = useLocation();
  const pathParts = location.pathname.split('/').filter(Boolean);
  const isPharmacyDetail = pathParts[0] === 'medicine' && pathParts[1] === 'pharmacies' && pathParts.length > 2;
  const isMedicineDetail = pathParts[0] === 'medicine' && pathParts.length === 2 && pathParts[1] !== 'pharmacies';
  const isDetail = isPharmacyDetail || isMedicineDetail;
  const { t } = useLang();
  const isRtl = t.dir === 'rtl';

  return (
    <div
      dir={t.dir}
      style={{ fontFamily: 'Cairo, sans-serif', background: '#eaf3f4' }}
      className="flex min-h-screen flex-col"
    >
      <Navbar />

      {isDetail && (
        <div
          className="border-b border-[#d7e7e5] bg-white/75 px-8 py-3 text-[12px] backdrop-blur-sm"
          style={{ color: 'rgba(8,64,54,0.5)' }}
        >
          <div
            className={[
              'mx-auto flex max-w-6xl items-center gap-2',
              isRtl ? 'flex-row-reverse justify-end' : 'flex-row justify-start',
            ].join(' ')}
          >
            <span style={{ color: '#084036' }} className="font-medium">
              {isPharmacyDetail
                ? isRtl ? 'تفاصيل الصيدلية' : 'Pharmacy details'
                : isRtl ? 'تفاصيل الدواء' : 'Medicine details'}
            </span>
            <span>{isRtl ? '←' : '→'}</span>
            <Link
              to={isPharmacyDetail ? '/medicine/pharmacies' : '/medicine'}
              className="font-semibold transition-colors hover:underline"
              style={{ color: '#119a8a' }}
            >
              {isPharmacyDetail
                ? isRtl ? 'الصيدليات' : 'Pharmacies'
                : isRtl ? 'الأدوية' : 'Medicines'}
            </Link>
          </div>
        </div>
      )}

      <main className="w-full flex-1">{children}</main>

      <Footer />
    </div>
  );
}
