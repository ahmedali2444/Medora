import React, { useEffect, useMemo, useState } from 'react';
import { MessageSquareHeart, Star } from 'lucide-react';
import PharmacyLayout from '../../components/pharmacy/layout/PharmacyLayout';
import SectionCard from '../../components/pharmacy/shared/SectionCard';
import { useLocalizedContent } from '../../hooks/useLocalizedContent';
import {
  formatLocalizedDate,
  formatLocalizedNumber,
  localizedText,
} from '../../utils/localization';
import { medoraApi } from '../../api/medoraApi';
import { mapReview } from '../../utils/professionalApiMappers';

const COPY = {
  title: localizedText('التقييمات', 'Reviews'),
  subtitle: localizedText('متابعة رضا العملاء وملاحظاتهم الأخيرة', 'Track customer satisfaction and recent feedback'),
  averageRating: localizedText('متوسط التقييم', 'Average rating'),
  totalReviews: localizedText('إجمالي المراجعات', 'Total reviews'),
  fiveStars: localizedText('5 نجوم', '5 stars'),
  needsFollowUp: localizedText('بحاجة متابعة', 'Needs follow-up'),
  latestCustomerReviews: localizedText('آخر تقييمات العملاء', 'Latest customer reviews'),
  reviewCount: localizedText('تقييم', 'reviews'),
};

function ReviewStat({ label, value, tone }) {
  const { text } = useLocalizedContent();

  return (
    <div className="rounded-2xl border border-[#e4eeee] bg-white p-4 text-center shadow-[0_8px_22px_rgba(41,93,96,0.06)]">
      <div className="text-[22px] font-black" style={{ color: tone }}>{value}</div>
      <div className="text-[11px] text-slate-500">{text(label)}</div>
    </div>
  );
}

export default function PharmacyReviews() {
  const { lang, text } = useLocalizedContent();
  const [reviews, setReviews] = useState([]);
  const [ui, setUi] = useState({ loading: true, error: '' });
  const average = useMemo(() => {
    if (reviews.length === 0) return '0.0';
    return (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1);
  }, [reviews]);

  useEffect(() => {
    let mounted = true;
    medoraApi.pharmacyReviews()
      .then((items) => {
        if (!mounted) return;
        setReviews(Array.isArray(items) ? items.map((review) => mapReview(review, 'customer')) : []);
        setUi({ loading: false, error: '' });
      })
      .catch((error) => {
        if (!mounted) return;
        setReviews([]);
        setUi({ loading: false, error: error.message || 'Unable to load reviews' });
      });
    return () => { mounted = false; };
  }, []);

  return (
    <PharmacyLayout title={COPY.title} subtitle={COPY.subtitle}>
      {ui.error && <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">{ui.error}</div>}
      {ui.loading && <div className="mb-4 rounded-xl bg-[#e6f7f7] px-4 py-3 text-xs font-semibold text-[#0e7c6e]">...</div>}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ReviewStat label={COPY.averageRating} value={average} tone="#f59e0b" />
        <ReviewStat
          label={COPY.totalReviews}
          value={formatLocalizedNumber(reviews.length, lang)}
          tone="#14b8a6"
        />
        <ReviewStat
          label={COPY.fiveStars}
          value={reviews.filter((review) => review.rating === 5).length}
          tone="#0e7c6e"
        />
        <ReviewStat
          label={COPY.needsFollowUp}
          value={reviews.filter((review) => review.rating <= 3).length}
          tone="#ef4444"
        />
      </div>

      <SectionCard
        title={COPY.latestCustomerReviews}
        description={`${reviews.length} ${text(COPY.reviewCount)}`}
        icon={MessageSquareHeart}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-2xl border border-[#e4eeee] bg-white p-4 shadow-[0_8px_22px_rgba(41,93,96,0.04)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="text-start">
                  <div className="text-[12px] font-extrabold text-[#084036]">{text(review.customer)}</div>
                  <div className="text-[10px] text-slate-400">{formatLocalizedDate(review.date, lang)}</div>
                </div>
                <div className="flex justify-end gap-0.5 text-[#f59e0b]">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} size={14} fill={index < review.rating ? 'currentColor' : 'none'} />
                  ))}
                </div>
              </div>
              <p className="mt-4 text-[12px] leading-7 text-slate-600">{text(review.comment)}</p>
            </article>
          ))}
        </div>
        {reviews.length === 0 && !ui.loading && (
          <div className="rounded-2xl border border-dashed border-[#cfe4e2] bg-[#f7fbfb] p-6 text-center text-[12px] font-bold text-[#486466]">
            {text(localizedText('لا توجد تقييمات حتى الآن.', 'No reviews yet.'))}
          </div>
        )}
      </SectionCard>
    </PharmacyLayout>
  );
}
