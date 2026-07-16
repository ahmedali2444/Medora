import React, { useState } from 'react';
import { X, Star } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { medoraApi } from '../../api/medoraApi';

export default function AddMedicineReviewModal({ open, onClose, medicine, orderId, onSubmitted }) {
  const { lang } = useLang();
  const isRtl = lang !== 'en';
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await medoraApi.createReview({ targetType: 'medicine', medicineId: medicine?.id || medicine?.medicineId, medicineOrderId: orderId, rating, comment });
      onSubmitted?.();
      onClose?.();
    } catch (err) { setError(err?.message || (isRtl ? 'تعذر إرسال التقييم' : 'Failed to submit review')); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between"><h3 className="text-lg font-black text-[#084036]">{isRtl ? 'تقييم الدواء' : 'Review medicine'}</h3><button type="button" onClick={onClose}><X size={20} /></button></div>
        <div className="mb-2 text-sm font-bold text-[#295d60]">{medicine?.name || medicine?.medicineName}</div>
        <div className="mb-4 flex gap-1">{[1,2,3,4,5].map((n) => <button key={n} type="button" onClick={() => setRating(n)} className={n <= rating ? 'text-amber-400' : 'text-slate-300'}><Star fill="currentColor" size={24} /></button>)}</div>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} className="h-28 w-full rounded-2xl border border-[#e4eeee] p-3 text-sm outline-none focus:border-[#14b8a6]" placeholder={isRtl ? 'اكتب تقييمك...' : 'Write your review...'} />
        {error && <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600">{error}</div>}
        <button disabled={loading} className="mt-4 h-11 w-full rounded-xl bg-[#14b8a6] text-sm font-bold text-white disabled:opacity-70">{loading ? '...' : (isRtl ? 'إرسال التقييم' : 'Submit review')}</button>
      </form>
    </div>
  );
}
