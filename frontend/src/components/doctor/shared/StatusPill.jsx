import React from 'react';
import { APPOINTMENT_STATUS } from '../data/doctorData';
import { useLocalizedContent } from '../../../hooks/useLocalizedContent';

export default function StatusPill({ status, size = 'sm' }) {
  const { text } = useLocalizedContent();
  const meta = APPOINTMENT_STATUS[status] || APPOINTMENT_STATUS.pending;
  const sizeClass = size === 'lg' ? 'text-[12px] px-3 py-1' : 'text-[10px] px-2 py-0.5';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-extrabold ${sizeClass}`}
      style={{ background: meta.bg, color: meta.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      {text(meta.label, meta.label)}
    </span>
  );
}
