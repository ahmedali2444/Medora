import React from 'react';
import { X } from 'lucide-react';
import { useLocalizedContent } from '../../../hooks/useLocalizedContent';

const SIZE_CLASS = {
  md: 'medora-modal-panel--md',
  lg: 'medora-modal-panel--lg',
  xl: 'medora-modal-panel--lg',
};

export default function AdminModal({ open, title, description, onClose, children, footer, size = 'md' }) {
  const { text } = useLocalizedContent();

  if (!open) return null;

  return (
    <div className="medora-modal-overlay">
      <div
        className={`medora-modal-panel ${SIZE_CLASS[size] || SIZE_CLASS.md}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="medora-modal-header flex items-start justify-between gap-4">
          <div className="text-start">
            <h3 className="text-[16px] font-black text-[#084036]">{text(title, title)}</h3>
            {description && <p className="mt-1 text-[12px] leading-6 text-slate-500">{text(description, description)}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#e4eeee] bg-white text-[#486466] transition hover:border-[#14b8a6] hover:text-[#119a8a]"
            aria-label={text('إغلاق', 'Close')}
          >
            <X size={14} />
          </button>
        </div>

        <div className="medora-modal-body">{children}</div>

        {footer && <div className="medora-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
