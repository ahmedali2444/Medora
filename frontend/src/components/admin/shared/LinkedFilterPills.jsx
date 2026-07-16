import React from 'react';
import { X } from 'lucide-react';
import { useLocalizedContent } from '../../../hooks/useLocalizedContent';
import { localizedText } from '../../../utils/localization';
import { LINKED_FILTER_LABELS } from './linkedFilterUtils';

export default function LinkedFilterPills({ filters, onClear }) {
  const { text } = useLocalizedContent();
  const entries = Object.entries(filters || {}).filter(([, value]) => value);
  if (!entries.length) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-[#d7ece8] bg-[#f7fbfb] px-3 py-3">
      {entries.map(([key, value]) => (
        <span key={key} className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-[#486466] ring-1 ring-[#e4eeee]">
          <span className="shrink-0 text-[#119a8a]">{text(LINKED_FILTER_LABELS[key] || key)}:</span>
          <span className="max-w-[180px] truncate" dir="ltr">{value}</span>
        </span>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="inline-flex items-center gap-1 rounded-full border border-[#d7ece8] bg-white px-3 py-1.5 text-[11px] font-bold text-[#119a8a] transition hover:border-[#14b8a6]"
      >
        <X size={12} />
        {text(localizedText('إزالة الفلتر', 'Clear filter'))}
      </button>
    </div>
  );
}
