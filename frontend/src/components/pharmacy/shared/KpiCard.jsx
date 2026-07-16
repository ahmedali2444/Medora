import React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { useLocalizedContent } from '../../../hooks/useLocalizedContent';
import { formatLocalizedNumber } from '../../../utils/localization';

export default function KpiCard({ label, value, delta, positive, hint, Icon, tone = '#14b8a6' }) {
  const { lang, text } = useLocalizedContent();
  const displayValue = typeof value === 'number' ? formatLocalizedNumber(value, lang) : value;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[#e4eeee] bg-white p-4 shadow-[0_10px_24px_rgba(41,93,96,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(41,93,96,0.1)]">
      <div
        className="pointer-events-none absolute -top-12 -left-12 h-28 w-28 rounded-full opacity-30 blur-2xl transition group-hover:opacity-40"
        style={{ background: tone }}
      />
      <div className="flex items-start justify-between">
        {Icon && (
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: `${tone}1a`, color: tone }}
          >
            <Icon size={17} />
          </div>
        )}
        {delta && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-[10px] font-extrabold ${
              positive ? 'bg-[#e6f7f7] text-[#0e7c6e]' : 'bg-[#fdecec] text-[#d14f4f]'
            }`}
          >
            {positive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {delta}
          </span>
        )}
      </div>
      <div className="mt-4">
        <div className="text-[22px] font-black text-[#084036]">{displayValue}</div>
        <div className="mt-1 text-[12px] font-medium text-[#486466]">{text(label, label)}</div>
        {hint && <div className="mt-2 text-[10px] text-slate-400">{text(hint, hint)}</div>}
      </div>
    </div>
  );
}
