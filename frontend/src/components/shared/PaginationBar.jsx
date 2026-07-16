import { ChevronDown } from 'lucide-react';
import { localizedText } from '../../utils/localization';

export default function PaginationBar({ page, totalPages, loading = false, onPageChange, isRtl = false, text }) {
  if (totalPages <= 1) return null;

  const label = text || ((key) => key);
  const previousLabel = label(localizedText('الصفحة السابقة', 'Previous page'));
  const nextLabel = label(localizedText('الصفحة التالية', 'Next page'));

  return (
    <div className="mt-4 flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1 || loading}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e4eeee] bg-white text-[#295d60] transition hover:border-[#14b8a6] disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={previousLabel}
      >
        <ChevronDown size={14} style={{ transform: isRtl ? 'rotate(-90deg)' : 'rotate(90deg)' }} />
      </button>
      <span className="text-[12px] font-bold text-[#486466]">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages || loading}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e4eeee] bg-white text-[#295d60] transition hover:border-[#14b8a6] disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={nextLabel}
      >
        <ChevronDown size={14} style={{ transform: isRtl ? 'rotate(90deg)' : 'rotate(-90deg)' }} />
      </button>
    </div>
  );
}
