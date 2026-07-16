import React from 'react';
import { CircleDot, Pill } from 'lucide-react';
import { useLang } from '../../../context/LanguageContext';

export default function MedicineUsages({ medicine }) {
  const { lang } = useLang();
  const isRtl = lang !== 'en';
  const items = Array.isArray(medicine?.usages) ? medicine.usages : [];
  const direction = isRtl ? 'rtl' : 'ltr';
  const textAlign = isRtl ? 'text-right' : 'text-left';

  return (
    <div
      dir={direction}
      className={`animate-fadeInUp rounded-xl border border-gray-100 bg-white p-6 ${textAlign}`}
      style={{ boxShadow: '0px 2px 8px rgba(0,0,0,0.06)' }}
    >
      <h2 className="mb-5 flex items-center gap-2 text-[16px] font-bold text-[#1e1e1e]">
        <Pill size={18} className="shrink-0 text-[#ef476f]" />
        <span>{isRtl ? 'الاستخدامات الطبية' : 'Medical uses'}</span>
      </h2>
      {items.length > 0 ? (
        <ul className="space-y-3">
          {items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2.5 text-[13px] leading-relaxed text-gray-700"
          >
            <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#e6f7f7] text-[#0f8f81] ring-1 ring-[#cceeed]">
              <CircleDot size={10} strokeWidth={2.4} />
            </span>
            <span className="flex-1">{item}</span>
          </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] leading-7 text-gray-600">
          {isRtl
            ? 'لا توجد استخدامات طبية موثقة لهذا الدواء في قاعدة البيانات حاليًا.'
            : 'No verified usage information is available for this medicine yet.'}
        </p>
      )}
    </div>
  );
}
