import React, { useState } from 'react';
import { ChevronDown, Clock } from 'lucide-react';
import { useLocalizedContent } from '../../../hooks/useLocalizedContent';
import { localizedText } from '../../../utils/localization';

const DAYS = [
  { id: 0, ar: 'الأحد', en: 'Sunday' },
  { id: 1, ar: 'الإثنين', en: 'Monday' },
  { id: 2, ar: 'الثلاثاء', en: 'Tuesday' },
  { id: 3, ar: 'الأربعاء', en: 'Wednesday' },
  { id: 4, ar: 'الخميس', en: 'Thursday' },
  { id: 5, ar: 'الجمعة', en: 'Friday' },
  { id: 6, ar: 'السبت', en: 'Saturday' },
];

export default function WorkingHoursSelector({ workingHours, onChange }) {
  const { lang, text } = useLocalizedContent();
  const [open, setOpen] = useState(false);
  const selectedCount = workingHours.length;

  const handleToggle = (dayId) => {
    const existing = workingHours.find((h) => h.dayOfWeek === dayId);
    if (existing) {
      onChange(workingHours.filter((h) => h.dayOfWeek !== dayId));
    } else {
      onChange([...workingHours, { dayOfWeek: dayId, openFrom: '09:00:00', openTo: '17:00:00', isClosed: false }]);
    }
  };

  const handleTimeChange = (dayId, field, value) => {
    const formatValue = value.length === 5 ? `${value}:00` : value;
    onChange(
      workingHours.map((h) =>
        h.dayOfWeek === dayId ? { ...h, [field]: formatValue } : h
      )
    );
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-[#d7e7e5] bg-[#f7fbfb]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-3 py-3 text-start transition hover:bg-white/70"
        aria-expanded={open}
      >
        <div className="text-start">
          <div className="flex items-center gap-2 text-[12px] font-black text-[#084036]">
            <Clock size={14} className="text-[#14b8a6]" />
            <span>{text(localizedText('مواعيد العمل', 'Working Hours'))}</span>
          </div>
          <div className="mt-0.5 text-[10px] font-semibold text-slate-500">
            {selectedCount
              ? text(localizedText(`${selectedCount} أيام محددة`, `${selectedCount} selected days`))
              : text(localizedText('اختر أيام العمل فقط', 'Choose working days only'))}
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`shrink-0 text-[#486466] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <div className={`${open ? 'grid' : 'hidden'} max-h-[250px] gap-2 overflow-y-auto border-t border-[#e4eeee] p-3`}>
        {DAYS.map((day) => {
          const isActive = workingHours.find((h) => h.dayOfWeek === day.id);
          return (
            <div
              key={day.id}
              className={`rounded-xl border px-3 py-2 transition ${
                isActive
                  ? 'border-[#14b8a6] bg-white shadow-[0_8px_20px_rgba(20,184,166,0.08)]'
                  : 'border-[#e4eeee] bg-white/70'
              }`}
            >
              <label className="flex cursor-pointer items-center justify-between gap-2">
                <span className="text-[12px] font-extrabold text-[#294f52]">
                  {lang === 'ar' ? day.ar : day.en}
                </span>
                <input
                  type="checkbox"
                  checked={!!isActive}
                  onChange={() => handleToggle(day.id)}
                  className="h-4 w-4 rounded border-[#cfe4e2] text-[#14b8a6]"
                />
              </label>

              {isActive && (
                <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <input
                    type="time"
                    required
                    value={isActive.openFrom?.substring(0, 5) || '09:00'}
                    onChange={(e) => handleTimeChange(day.id, 'openFrom', e.target.value)}
                    className="h-9 min-w-0 rounded-lg border border-[#e4eeee] bg-[#fbfefe] px-2 text-[12px] outline-none transition focus:border-[#14b8a6]"
                  />
                  <span className="text-xs text-slate-400">-</span>
                  <input
                    type="time"
                    required
                    value={isActive.openTo?.substring(0, 5) || '17:00'}
                    onChange={(e) => handleTimeChange(day.id, 'openTo', e.target.value)}
                    className="h-9 min-w-0 rounded-lg border border-[#e4eeee] bg-[#fbfefe] px-2 text-[12px] outline-none transition focus:border-[#14b8a6]"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
