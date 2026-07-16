import React from 'react';
import { useLocalizedContent } from '../../../hooks/useLocalizedContent';

export default function SectionCard({ title, description, icon: Icon, action, children, className = '' }) {
  const { text } = useLocalizedContent();

  return (
    <section
      className={`overflow-hidden rounded-2xl border border-[#e4eeee] bg-white shadow-[0_10px_24px_rgba(41,93,96,0.05)] ${className}`}
    >
      {(title || Icon || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#f1f7f7] px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-start gap-2">
            {Icon && (
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e6f7f7] text-[#14b8a6]">
                <Icon size={15} />
              </span>
            )}
            <div className="min-w-0">
              {title && <h3 className="break-words text-[14px] font-extrabold text-[#084036]">{text(title, title)}</h3>}
              {description && <p className="mt-0.5 break-words text-[11px] leading-5 text-slate-500">{text(description, description)}</p>}
            </div>
          </div>
          {action && <div className="w-full sm:w-auto">{action}</div>}
        </header>
      )}
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </section>
  );
}
