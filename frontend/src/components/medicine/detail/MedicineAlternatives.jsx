import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatMedicinePrice, MEDICINE_CATEGORY_META } from '../data/medicineData';
import MedicineArtwork from '../shared/MedicineArtwork';
import { useLang } from '../../../context/LanguageContext';
import { getLocalizedText } from '../../../utils/localization';

export default function MedicineAlternatives({ currentMedicine, alternatives = [] }) {
  const navigate = useNavigate();
  const { lang } = useLang();
  const isRtl = lang !== 'en';
  const currentMedicineName = getLocalizedText(currentMedicine?.name, lang, currentMedicine?.name);

  if (alternatives.length === 0) {
    return (
      <div
        className="animate-fadeInUp rounded-xl border border-gray-100 bg-white p-6 text-right"
        style={{ boxShadow: '0px 2px 8px rgba(0,0,0,0.06)' }}
      >
        <h2 className="mb-3 flex items-center justify-end gap-2 text-[16px] font-bold text-[#1e1e1e]">
          <span>{isRtl ? 'بدائل مقترحة' : 'Suggested alternatives'}</span>
          <span>🔄</span>
        </h2>
        <p className="text-[13px] leading-relaxed text-[rgba(8,64,54,0.65)]">
          {isRtl
            ? 'لا توجد بدائل جاهزة لهذا الدواء الآن. يمكنك مراجعة الصيدليات القريبة أو العودة لنتائج البحث لاختيار منتج من نفس الفئة.'
            : 'No ready alternatives are available for this medicine right now. You can check nearby pharmacies or go back to search results to choose a product from the same category.'}
        </p>
      </div>
    );
  }

  return (
    <div
      className="animate-fadeInUp rounded-xl border border-gray-100 bg-white p-6"
      style={{ boxShadow: '0px 2px 8px rgba(0,0,0,0.06)' }}
    >
      <h2 className="mb-5 flex items-center justify-end gap-2 text-[16px] font-bold text-[#1e1e1e]">
        <span>
          {isRtl ? `بدائل قريبة من ${currentMedicineName}` : `Alternatives close to ${currentMedicineName}`}
        </span>
        <span>🔄</span>
      </h2>
      <div className="flex flex-col gap-1">
        {alternatives.map((alternative) => {
          const alternativeName = getLocalizedText(alternative.name, lang, alternative.name);
          const categoryStyle = MEDICINE_CATEGORY_META[alternative.category] || {
            bg: 'rgba(19,181,177,0.1)',
            color: '#0f8f81',
          };

          return (
            <button
              key={alternative.id}
              onClick={() => navigate(`/medicine/${alternative.id}`)}
              className="flex w-full items-center justify-between rounded-xl p-3 transition-colors hover:bg-[rgba(19,181,177,0.05)]"
            >
              <div className="flex items-center gap-3">
                <span className="font-bold text-[14px] text-[#0f8f81]">
                  {formatMedicinePrice(alternative.price)} {isRtl ? 'ج.م' : 'EGP'}
                </span>
                <span className="text-[12px] font-medium text-[#0f8f81]">
                  {isRtl ? 'اعرف أكثر ←' : 'Learn more →'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[14px] font-bold text-[#1e1e1e]">{alternativeName}</div>
                  <div className="text-[11px] text-gray-500">{alternative.company}</div>
                </div>
                <div
                  className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg"
                  style={{ background: categoryStyle.bg, color: categoryStyle.color }}
                >
                  {alternative.image ? (
                    <img
                      src={alternative.image}
                      alt={alternativeName}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                      width="72"
                      height="72"
                    />
                  ) : (
                    <MedicineArtwork color={categoryStyle.color} className="h-5 w-5" />
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
