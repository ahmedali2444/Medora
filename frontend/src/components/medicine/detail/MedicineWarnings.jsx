import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useLang } from '../../../context/LanguageContext';

export default function MedicineWarnings({ medicine }) {
  const { lang } = useLang();
  const isRtl = lang !== 'en';
  const warnings = Array.isArray(medicine?.warnings) ? medicine.warnings : [];
  const interactions = Array.isArray(medicine?.interactions) ? medicine.interactions : [];
  const direction = isRtl ? 'rtl' : 'ltr';
  const textAlign = isRtl ? 'text-right' : 'text-left';

  return (
    <div
      dir={direction}
      className={`animate-fadeInUp overflow-hidden rounded-xl border border-gray-100 bg-white ${textAlign}`}
      style={{
        boxShadow: '0px 2px 8px rgba(0,0,0,0.06)',
        [isRtl ? 'borderRight' : 'borderLeft']: '4px solid #13b5b1',
      }}
    >
      <div className="p-6">
        <h2 className="mb-5 flex items-center gap-2 text-[16px] font-bold text-[#0f8f81]">
          <AlertTriangle size={18} className="shrink-0 text-[#f59e0b]" />
          <span>{isRtl ? 'تحذيرات وآثار جانبية' : 'Warnings and side effects'}</span>
        </h2>

        {warnings.length > 0 ? (
          <ul className="space-y-3">
            {warnings.map((warning) => (
            <li
              key={warning}
              className="flex items-start gap-2.5 text-[13px] leading-relaxed text-gray-700"
            >
              <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#fffbeb] text-[#d97706] ring-1 ring-[#fde68a]">
                <AlertTriangle size={10} strokeWidth={2.4} />
              </span>
              <span className="flex-1">{warning}</span>
            </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] leading-7 text-gray-600">
            {isRtl
              ? 'لا توجد تحذيرات موثقة لهذا الدواء في قاعدة البيانات حاليًا.'
              : 'No verified warning information is available for this medicine yet.'}
          </p>
        )}
      </div>

      {interactions.length > 0 && (
        <div className="mx-4 mb-4 rounded-xl border border-[#13b5b1]/15 bg-[#13b5b1]/8 p-4">
        <h3 className="mb-2 text-[14px] font-bold text-[#0f8f81]">
          {isRtl ? 'تفاعل مع أدوية أخرى:' : 'Drug interactions:'}
        </h3>
        <ul className="space-y-1">
          {interactions.map((item) => (
            <li key={item} className="flex items-center gap-2 text-[13px] text-[#1f4b49]">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#0f8f81]" />
              <span className="flex-1">{item}</span>
            </li>
          ))}
        </ul>
        </div>
      )}
    </div>
  );
}
