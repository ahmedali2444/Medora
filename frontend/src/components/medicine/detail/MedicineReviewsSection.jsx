import React from 'react';
import { Star } from 'lucide-react';
import { useLang } from '../../../context/LanguageContext';
import { getLocalizedText } from '../../../utils/localization';

function ReviewCard({ review, isRtl }) {
  const date = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')
    : '';

  return (
    <article className="rounded-2xl border border-[#e4eeee] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-[#084036]">{review.reviewerName || (isRtl ? 'مريض' : 'Patient')}</div>
          <div className="mt-0.5 text-[11px] text-slate-400">{date}</div>
        </div>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={12}
              fill={star <= review.rating ? '#14b8a6' : '#e2e8f0'}
              color={star <= review.rating ? '#14b8a6' : '#e2e8f0'}
            />
          ))}
        </div>
      </div>
      {review.comment && (
        <p className="mt-3 text-[13px] leading-6 text-slate-600">{review.comment}</p>
      )}
      {review.reply && (
        <div className="mt-3 rounded-xl bg-[#f7fbfb] px-3 py-2 text-[12px] leading-6 text-slate-600">
          <span className="font-bold text-[#295d60]">{isRtl ? 'رد:' : 'Reply:'}</span> {review.reply}
        </div>
      )}
    </article>
  );
}

export default function MedicineReviewsSection({ reviews = [], rating = 0, reviewCount = 0, loading = false }) {
  const { lang } = useLang();
  const isRtl = lang !== 'en';

  const COPY = {
    title: { ar: 'التقييمات والمراجعات', en: 'Ratings & Reviews' },
    basedOn: { ar: 'بناءً على', en: 'Based on' },
    reviews: { ar: 'تقييم', en: 'reviews' },
    empty: { ar: 'لا توجد تقييمات معتمدة بعد', en: 'No verified reviews yet' },
    loading: { ar: 'جارٍ تحميل التقييمات...', en: 'Loading reviews...' },
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#e4eeee] bg-white p-8 text-center text-sm text-slate-500">
        {getLocalizedText(COPY.loading, lang, '')}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-lg font-extrabold text-[#084036]">{getLocalizedText(COPY.title, lang, '')}</h2>
        <div className="text-end">
          <div className="inline-flex items-center gap-1 text-2xl font-black text-[#084036]">
            <Star size={18} fill="#14b8a6" color="#14b8a6" />
            {Number(rating || 0).toFixed(1)}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {getLocalizedText(COPY.basedOn, lang, '')} {reviewCount} {getLocalizedText(COPY.reviews, lang, '')}
          </p>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d7e7e5] bg-white p-8 text-center text-sm text-slate-500">
          {getLocalizedText(COPY.empty, lang, '')}
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} isRtl={isRtl} />
          ))}
        </div>
      )}
    </section>
  );
}
