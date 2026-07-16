import { useState } from 'react';
import { X } from 'lucide-react';
import { medoraApi } from '../../api/medoraApi';
import { useLang } from '../../context/LanguageContext';
import { getLocalizedText } from '../../utils/localization';

const COPY = {
  title: { ar: 'إبلاغ عن محتوى', en: 'Report content' },
  reason: { ar: 'سبب الإبلاغ', en: 'Reason' },
  details: { ar: 'تفاصيل إضافية (اختياري)', en: 'Additional details (optional)' },
  submit: { ar: 'إرسال البلاغ', en: 'Submit report' },
  cancel: { ar: 'إلغاء', en: 'Cancel' },
  success: { ar: 'تم استلام بلاغك. شكرًا لمساعدتنا.', en: 'Your report was received. Thank you.' },
};

export default function ReportModal({ open, onClose, targetType, targetId, targetLabel }) {
  const { lang } = useLang();
  const isRtl = lang !== 'en';
  const t = (value) => getLocalizedText(value, lang);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!reason.trim()) {
      setError(isRtl ? 'اكتب سبب الإبلاغ' : 'Enter a reason');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await medoraApi.report({
        targetType,
        targetId,
        reason: reason.trim(),
        details: details.trim() || null,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Unable to submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="medora-modal-overlay" onClick={onClose}>
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="medora-modal-panel medora-modal-panel--sm"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="medora-modal-header flex items-center justify-between gap-3">
          <h2 className="text-base font-extrabold text-[#084036]">{t(COPY.title)}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100" aria-label={t(COPY.cancel)}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="medora-modal-body space-y-3">
          {targetLabel && (
            <p className="rounded-xl bg-[#f7fbfb] px-3 py-2 text-[12px] font-semibold text-[#295d60]">{targetLabel}</p>
          )}

          {success ? (
            <p className="rounded-xl bg-[#e6f7f7] px-3 py-3 text-[13px] font-bold text-[#0e7c6e]">{t(COPY.success)}</p>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-[12px] font-bold text-slate-700">{t(COPY.reason)}</label>
                <input
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="medora-field"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-bold text-slate-700">{t(COPY.details)}</label>
                <textarea
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-[#d7e7e5] px-3 py-2 text-sm outline-none focus:border-[#14b8a6]"
                />
              </div>
              {error && <p className="text-[12px] font-bold text-red-600">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-xl bg-[#14b8a6] py-2.5 text-sm font-bold text-white disabled:opacity-60"
                >
                  {loading ? '...' : t(COPY.submit)}
                </button>
                <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">
                  {t(COPY.cancel)}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
