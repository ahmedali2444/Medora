import React, { useState } from 'react';
import { AlertTriangle, LoaderCircle } from 'lucide-react';
import { useLocalizedContent } from '../../../hooks/useLocalizedContent';
import { localizedText } from '../../../utils/localization';

const COPY = {
  cancel: localizedText('إلغاء', 'Cancel'),
  confirm: localizedText('تأكيد', 'Confirm'),
  reason: localizedText('ملاحظة أو سبب الإجراء', 'Action note or reason'),
};

export default function AdminActionDialog({
  open,
  title,
  description,
  confirmLabel,
  tone = 'danger',
  requiresReason = false,
  loading = false,
  onClose,
  onConfirm,
}) {
  const { text } = useLocalizedContent();
  const [reason, setReason] = useState('');

  if (!open) return null;

  const color = tone === 'success' ? '#0e7c6e' : tone === 'warning' ? '#a35a00' : '#c2362f';
  const closeDialog = () => {
    setReason('');
    onClose?.();
  };
  const confirmDialog = () => {
    const value = reason.trim();
    setReason('');
    onConfirm?.(value);
  };

  return (
    <div className="medora-modal-overlay medora-modal-overlay--elevated">
      <div
        className="medora-modal-panel medora-modal-panel--sm"
        role="dialog"
        aria-modal="true"
      >
        <div className="medora-modal-header flex items-start gap-3 text-start">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${color}18`, color }}>
            <AlertTriangle size={18} />
          </span>
          <div>
            <h3 className="text-[15px] font-black text-[#084036]">{text(title, title)}</h3>
            {description && <p className="mt-1 text-[12px] leading-6 text-slate-500">{text(description, description)}</p>}
          </div>
        </div>

        {requiresReason && (
          <div className="medora-modal-body">
            <label className="flex flex-col gap-1 text-start">
              <span className="text-[11px] font-extrabold text-[#486466]">{text(COPY.reason)}</span>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="min-h-[96px] rounded-xl border border-[#e4eeee] bg-white p-3 text-[12px] leading-6 text-[#084036] outline-none transition focus:border-[#14b8a6]"
              />
            </label>
          </div>
        )}

        <div className="medora-modal-footer flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={loading}
            onClick={closeDialog}
            className="rounded-xl border border-[#e4eeee] bg-white px-4 py-2.5 text-[12px] font-bold text-[#486466] transition hover:border-[#14b8a6] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {text(COPY.cancel)}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={confirmDialog}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-extrabold text-white transition disabled:cursor-not-allowed disabled:opacity-70"
            style={{ background: color }}
          >
            {loading && <LoaderCircle size={14} className="animate-spin" />}
            {text(confirmLabel || COPY.confirm)}
          </button>
        </div>
      </div>
    </div>
  );
}
