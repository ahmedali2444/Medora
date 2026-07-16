import React from 'react';
import { ShieldCheck, SlidersHorizontal, Store, Truck } from 'lucide-react';
import { useLang } from '../../../context/LanguageContext';
import { getLocalizedText } from '../../../utils/localization';

export default function MedicineFiltersPanel({
  priceMin,
  priceMax,
  priceRange,
  onPriceChange,
  availableOnly,
  onAvailableToggle,
  deliveryOnly,
  onDeliveryToggle,
  pickupOnly,
  onPickupToggle,
  symptomEntries,
  selectedSymptom,
  onSymptomSelect,
  onReset,
}) {
  const { lang } = useLang();
  const isRtl = lang !== 'en';

  const fulfillmentFilters = [
    {
      label: isRtl ? 'متاح الآن' : 'Available now',
      active: availableOnly,
      onClick: onAvailableToggle,
      Icon: ShieldCheck,
    },
    {
      label: isRtl ? 'توصيل للمنزل' : 'Home delivery',
      active: deliveryOnly,
      onClick: onDeliveryToggle,
      Icon: Truck,
    },
    {
      label: isRtl ? 'استلام من فرع' : 'Store pickup',
      active: pickupOnly,
      onClick: onPickupToggle,
      Icon: Store,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-[#d7e7e5] bg-white p-4 shadow-[0_10px_28px_rgba(41,93,96,0.06)]">
        <div className="flex items-center justify-between">
          <button onClick={onReset} className="text-[11px] font-bold text-[#119a8a] hover:underline">
            {isRtl ? 'إعادة تعيين' : 'Reset'}
          </button>
          <div className="flex items-center gap-2 text-[#295d60]">
            <span className="text-sm font-extrabold">{isRtl ? 'فلاتر' : 'Filters'}</span>
            <SlidersHorizontal size={15} />
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="rounded-full bg-[#e6f7f7] px-2 py-0.5 text-[11px] font-black text-[#119a8a]">
              {priceRange} {isRtl ? 'ج.م' : 'EGP'}
            </span>
            <span className="text-[12px] font-bold text-[#295d60]">
              {isRtl ? 'الحد الأقصى للسعر' : 'Max price'}
            </span>
          </div>
          <input
            type="range"
            min={priceMin}
            max={priceMax}
            value={priceRange}
            onChange={(event) => onPriceChange(Number(event.target.value))}
            className="w-full cursor-pointer"
            style={{ accentColor: '#14b8a6', direction: 'ltr' }}
          />
          <div className="mt-1 flex justify-between text-[10px] text-slate-400">
            <span>{priceMax} {isRtl ? 'ج.م' : 'EGP'}</span>
            <span>{priceMin} {isRtl ? 'ج.م' : 'EGP'}</span>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {fulfillmentFilters.map((filter) => {
            const FilterIcon = filter.Icon;

            return (
              <button
                key={filter.label}
                onClick={filter.onClick}
                className="flex w-full items-center justify-between gap-2 rounded-2xl border px-3 py-2.5 text-[12px] font-bold transition-all"
                style={
                  filter.active
                    ? {
                        background: '#e6f7f7',
                        borderColor: '#14b8a6',
                        color: '#119a8a',
                      }
                    : {
                        background: '#ffffff',
                        borderColor: '#e4eeee',
                        color: '#526b6d',
                      }
                }
              >
                <span
                  className="inline-flex h-5 w-5 items-center justify-center rounded-md border"
                  style={{
                    borderColor: filter.active ? '#14b8a6' : '#d7e7e5',
                    background: filter.active ? '#14b8a6' : 'transparent',
                    color: '#ffffff',
                  }}
                >
                  {filter.active ? '✓' : ''}
                </span>
                <span className="flex flex-1 items-center justify-end gap-2">
                  <span>{filter.label}</span>
                  <FilterIcon size={13} />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-3xl border border-[#d7e7e5] bg-white p-4 shadow-[0_10px_28px_rgba(41,93,96,0.06)]">
        <div className="mb-3 flex items-center justify-between">
          {selectedSymptom && (
            <button
              onClick={() => onSymptomSelect(null)}
              className="text-[11px] font-bold text-[#119a8a] hover:underline"
            >
              {isRtl ? 'مسح' : 'Clear'}
            </button>
          )}
          <span className="text-sm font-extrabold text-[#295d60]">
            {isRtl ? 'حسب العَرَض' : 'By symptom'}
          </span>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          {symptomEntries.map(([key, label]) => {
            const active = selectedSymptom === key;

            return (
              <button
                key={key}
                onClick={() => onSymptomSelect(active ? null : key)}
                className="rounded-full border px-3 py-1 text-[11px] font-bold transition-all"
                style={
                  active
                    ? { background: '#14b8a6', borderColor: '#14b8a6', color: '#ffffff' }
                    : { background: '#f7fbfb', borderColor: '#e4eeee', color: '#2d6669' }
                }
                >
                  {getLocalizedText(label, lang, key)}
                </button>
              );
          })}
        </div>
      </div>
    </div>
  );
}
