import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import { useLocalizedContent } from '../../../hooks/useLocalizedContent';
import { localizedText } from '../../../utils/localization';
import { toDateKey } from '../../../utils/professionalApiMappers';
import { APPOINTMENT_STATUS } from '../data/doctorData';

const STATUS_COLOR = {
  confirmed:  { bg: '#e6f7f7', border: '#14b8a6', dot: '#0e7c6e', text: '#0e7c6e' },
  pending:    { bg: '#fff4e6', border: '#f59e0b', dot: '#d97706', text: '#92400e' },
  completed:  { bg: '#f1f5f9', border: '#94a3b8', dot: '#64748b', text: '#475569' },
  cancelled:  { bg: '#fdecec', border: '#f87171', dot: '#dc2626', text: '#b91c1c' },
};

const HOUR_START = 8;
const HOUR_END   = 21;
const HOURS      = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

function getColors(appt) {
  return STATUS_COLOR[appt.status] || STATUS_COLOR.pending;
}

function timeToMinutes(timeStr) {
  if (!timeStr) return HOUR_START * 60;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export default function WeeklyCalendarView({ appointments, onAppointmentClick }) {
  const { text, isRtl } = useLocalizedContent();
  const [hoveredId, setHoveredId] = useState(null);
  const [currentTimeY, setCurrentTimeY] = useState(null);
  const containerRef = useRef(null);
  const ROW_H = 52; // px per hour

  // Week days
  const weekDays = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    const dayOffset = (today.getDay() + 1) % 7;
    startOfWeek.setDate(today.getDate() - dayOffset); // Saturday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return {
        key: toDateKey(d),
        short: localizedText(
          d.toLocaleDateString('ar-EG', { weekday: 'short' }),
          d.toLocaleDateString('en-US', { weekday: 'short' }),
        ),
        dayNum: localizedText(
          d.toLocaleDateString('ar-EG', { day: 'numeric' }),
          d.toLocaleDateString('en-US', { day: 'numeric' }),
        ),
        isToday: toDateKey(d) === toDateKey(today),
      };
    });
  }, []);

  // Current time indicator
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      const offsetMins = mins - HOUR_START * 60;
      if (offsetMins >= 0 && offsetMins < (HOUR_END - HOUR_START) * 60) {
        setCurrentTimeY((offsetMins / 60) * ROW_H);
      } else {
        setCurrentTimeY(null);
      }
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, []);

  // Group appointments by date key
  const byDay = useMemo(() => {
    const map = new Map();
    weekDays.forEach((d) => map.set(d.key, []));
    appointments.forEach((a) => {
      if (map.has(a.date)) map.get(a.date).push(a);
    });
    return map;
  }, [appointments, weekDays]);

  const totalH = (HOUR_END - HOUR_START) * ROW_H;

  return (
    <div
      ref={containerRef}
      dir={isRtl ? 'rtl' : 'ltr'}
      className="w-full overflow-x-auto rounded-2xl border border-[#e4eeee] bg-white"
    >
      {/* Day headers */}
      <div
        className="sticky top-0 z-20 grid border-b border-[#e4eeee] bg-white/95 backdrop-blur"
        style={{ gridTemplateColumns: `48px repeat(7, 1fr)` }}
      >
        <div className="border-e border-[#e4eeee]" />
        {weekDays.map((d) => (
          <div
            key={d.key}
            className="flex flex-col items-center py-2.5 text-center"
          >
            <span className="text-[9px] font-bold text-slate-400 uppercase">{text(d.short)}</span>
            <span
              className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-black transition ${
                d.isToday
                  ? 'bg-[#14b8a6] text-white shadow-lg'
                  : 'text-[#084036]'
              }`}
            >
              {text(d.dayNum)}
            </span>
          </div>
        ))}
      </div>

      {/* Grid body */}
      <div
        className="relative grid"
        style={{ gridTemplateColumns: `48px repeat(7, 1fr)`, height: `${totalH}px` }}
      >
        {/* Time rail */}
        <div className="relative border-e border-[#e4eeee]">
          {HOURS.map((h) => (
            <div
              key={h}
              className="absolute flex w-full items-start justify-end pr-2"
              style={{ top: `${(h - HOUR_START) * ROW_H - 8}px` }}
            >
              <span className="text-[9px] font-bold text-slate-400" dir="ltr">
                {h}:00
              </span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {weekDays.map((d) => (
          <div key={d.key} className="relative border-e border-[#f0f4f4] last:border-e-0">
            {/* Horizontal hour lines */}
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute w-full border-t border-[#f0f4f4]"
                style={{ top: `${(h - HOUR_START) * ROW_H}px` }}
              />
            ))}

            {/* Current time line */}
            {d.isToday && currentTimeY !== null && (
              <div
                className="absolute left-0 right-0 z-10 flex items-center"
                style={{ top: `${currentTimeY}px` }}
              >
                <span className="h-2 w-2 rounded-full bg-[#ef4444]" />
                <div className="h-[1.5px] flex-1 bg-[#ef4444]" />
              </div>
            )}

            {/* Appointments */}
            {(byDay.get(d.key) || []).map((appt) => {
              const mins = timeToMinutes(appt.time);
              const startOffset = mins - HOUR_START * 60;
              if (startOffset < 0 || startOffset >= (HOUR_END - HOUR_START) * 60) return null;
              const top = (startOffset / 60) * ROW_H + 2;
              const height = Math.max(28, ROW_H - 6);
              const colors = getColors(appt);
              const isHovered = hoveredId === appt.id;

              return (
                <div
                  key={appt.id}
                  className="absolute left-1 right-1 cursor-pointer overflow-hidden rounded-lg border px-1.5 py-1 transition-all duration-150 hover:z-30 hover:shadow-lg"
                  style={{
                    top: `${top}px`,
                    height: `${height}px`,
                    background: colors.bg,
                    borderColor: colors.border,
                    zIndex: isHovered ? 30 : 10,
                  }}
                  onMouseEnter={() => setHoveredId(appt.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => onAppointmentClick && onAppointmentClick(appt)}
                >
                  <div className="flex items-center gap-1">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: colors.dot }}
                    />
                    <span
                      className="truncate text-[9px] font-extrabold leading-tight"
                      style={{ color: colors.text }}
                    >
                      {text(appt.patient)}
                    </span>
                  </div>
                  <div
                    className="truncate text-[8px] font-bold leading-tight opacity-70"
                    style={{ color: colors.text }}
                    dir="ltr"
                  >
                    {appt.time}
                  </div>

                  {/* Hover popup */}
                  {isHovered && (
                    <div
                      className="absolute left-0 top-full z-40 mt-1 w-44 rounded-xl border border-[#e4eeee] bg-white p-3 shadow-[0_12px_32px_rgba(41,93,96,0.18)]"
                      style={{ minWidth: '168px' }}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-[#084036]">{text(appt.patient)}</span>
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[8px] font-bold"
                          style={{ background: colors.bg, color: colors.text }}
                        >
                          {text(APPOINTMENT_STATUS[appt.status]?.label)}
                        </span>
                      </div>
                      <div className="text-[9px] text-slate-500">{text(appt.reason)}</div>
                      <div className="mt-1 flex items-center gap-1 text-[9px] text-slate-400" dir="ltr">
                        <Clock size={8} /> {appt.time}
                      </div>
                      <div className="mt-0.5 text-[9px] text-slate-400">{text(appt.clinic)}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
