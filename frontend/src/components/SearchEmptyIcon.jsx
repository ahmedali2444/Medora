import { SearchX } from 'lucide-react';

export default function SearchEmptyIcon({ className = '' }) {
  return (
    <div
      className={[
        'mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#bfe7e1] bg-[#e9f8f6] text-[#0da694] shadow-[0_12px_28px_rgba(13,166,148,0.12)]',
        className,
      ].join(' ')}
      aria-hidden="true"
    >
      <SearchX className="h-8 w-8" strokeWidth={2.2} />
    </div>
  );
}
