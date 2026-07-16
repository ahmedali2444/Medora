import React from 'react';
import { useLocalizedContent } from '../../../hooks/useLocalizedContent';

export default function SectionCard({ title, description, icon: Icon, action, children, className = '' }) {
  const { text } = useLocalizedContent();

  return (
    <section
      className={`overflow-hidden rounded-2xl border border-[#e4eeee] bg-white shadow-[0_10px_24px_rgba(41,93,96,0.05)] ${className}`}
    >
      {(title || Icon || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f1f7f7] px-5 py-4">
          <div className="flex items-center gap-2">
            {Icon && (
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e6f7f7] text-[#14b8a6]">
                <Icon size={15} />
              </span>
            )}
            <div>
              {title && <h3 className="text-[14px] font-extrabold text-[#084036]">{text(title, title)}</h3>}
              {description && <p className="mt-0.5 text-[11px] text-slate-500">{text(description, description)}</p>}
            </div>
          </div>
          {action}
        </header>
      )}
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}
