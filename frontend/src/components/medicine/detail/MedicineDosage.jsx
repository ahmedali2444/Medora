import React from 'react';
import { useLang } from '../../../context/LanguageContext';

export default function MedicineDosage({ medicine }) {
  const { lang } = useLang();
  const isRtl = lang !== 'en';
  const dosageText = lang === 'en'
    ? medicine?.dosage?.en || medicine?.dosage?.ar
    : medicine?.dosage?.ar || medicine?.dosage?.en;

  return (
    <div
      className="animate-fadeInUp rounded-xl border border-gray-100 bg-white p-6"
      style={{ boxShadow: '0px 2px 8px rgba(0,0,0,0.06)' }}
    >
      <h2 className="mb-5 flex items-center justify-end gap-2 text-[16px] font-bold text-[#1e1e1e]">
        <span>{isRtl ? 'الجرعة الموصى بها' : 'Recommended dosage'}</span>
        <span>💊</span>
      </h2>

      <div className="rounded-xl border border-[#13b5b1]/10 bg-[#13b5b1]/5 p-4 text-[13px] leading-7 text-[#1f4b49]">
        {dosageText || (
          isRtl
            ? 'لا توجد جرعة موثقة لهذا الدواء في قاعدة البيانات حاليًا.'
            : 'No verified dosage information is available for this medicine yet.'
        )}
      </div>

      <p className="mt-4 rounded-lg border border-[#13b5b1]/15 bg-[#13b5b1]/8 p-3 text-center text-[11px] text-[#1f4b49]">
        {isRtl
          ? '⚠️ هذه معلومات عامة. استشر طبيبك دائمًا قبل تناول أي دواء.'
          : '⚠️ This is general information. Always consult your doctor before taking any medicine.'}
      </p>
    </div>
  );
}
