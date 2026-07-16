import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Filter, MessagesSquare, Reply, Star, ThumbsUp } from 'lucide-react';
import DoctorLayout from '../../components/doctor/layout/DoctorLayout';
import SectionCard from '../../components/doctor/shared/SectionCard';
import { computeRatingBreakdown, formatDate } from '../../components/doctor/data/doctorData';
import { useLocalizedContent } from '../../hooks/useLocalizedContent';
import { formatLocalizedNumber, localizedText } from '../../utils/localization';
import { medoraApi } from '../../api/medoraApi';
import { mapReview } from '../../utils/professionalApiMappers';
import { useToast } from '../../components/medicine/layout/ToastContext';

const COPY = {
  title: localizedText('تقييمات المرضى', 'Patient Reviews'),
  subtitle: localizedText('آراء المرضى وتقييماتهم لخدماتك', 'Patient opinions and ratings for your services'),
  summaryTitle: localizedText('ملخّص التقييمات', 'Ratings summary'),
  reviewsCount: localizedText('تقييم', 'reviews'),
  overallRating: localizedText('تقييم عام', 'Overall rating'),
  fiveStars: localizedText('5 نجوم', '5 stars'),
  lowRatings: localizedText('تقييمات منخفضة', 'Low ratings'),
  needsReply: localizedText('بحاجة لرد', 'Needs reply'),
  latestTitle: localizedText('آخر التقييمات', 'Latest reviews'),
  countSuffix: localizedText('تقييم', 'review(s)'),
  filterLabel: localizedText('فلترة:', 'Filter:'),
  all: localizedText('الكل', 'All'),
  stars5: localizedText('5 نجوم', '5 stars'),
  stars4: localizedText('4 نجوم', '4 stars'),
  stars3: localizedText('3 نجوم', '3 stars'),
  starsLow: localizedText('2 أو أقل', '2 or less'),
  reply: localizedText('رد', 'Reply'),
  emptyText: localizedText('لا توجد تقييمات بهذا الفلتر', 'No reviews matching this filter'),
};

const STARS_FILTER = [
  { id: 'all', label: COPY.all },
  { id: '5', label: COPY.stars5 },
  { id: '4', label: COPY.stars4 },
  { id: '3', label: COPY.stars3 },
  { id: 'low', label: COPY.starsLow },
];

export default function DoctorReviews() {
  const { lang, text } = useLocalizedContent();
  const [filter, setFilter] = useState('all');
  const [reviews, setReviews] = useState([]);
  const [ui, setUi] = useState({ loading: true, error: '' });
  const stats = useMemo(() => computeRatingBreakdown(reviews), [reviews]);

  const loadReviews = useCallback(async () => {
    setUi(prev => ({ ...prev, loading: true }));
    try {
      const items = await medoraApi.doctorReviews();
      setReviews(Array.isArray(items) ? items.map((review) => mapReview(review)) : []);
      setUi({ loading: false, error: '' });
    } catch (error) {
      setReviews([]);
      setUi({ loading: false, error: error.message || 'Unable to load reviews' });
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => loadReviews());
  }, [loadReviews]);

  const filtered = useMemo(() => {
    if (filter === 'all') return reviews;
    if (filter === 'low') return reviews.filter((r) => r.rating <= 2);
    return reviews.filter((r) => String(r.rating) === filter);
  }, [filter, reviews]);

  return (
    <DoctorLayout title={COPY.title} subtitle={COPY.subtitle}>
      <div className="mb-5 grid gap-5 lg:grid-cols-[1.2fr_2fr]">
        <SectionCard title={COPY.summaryTitle} icon={Star}>
          <div className="flex flex-col gap-4 rounded-2xl bg-[#f7fbfb] p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
            <div className="flex flex-col items-center rounded-2xl bg-white px-5 py-4 text-center shadow-[0_6px_18px_rgba(41,93,96,0.06)] sm:min-w-[124px]">
              <div className="text-[36px] font-black text-[#084036] sm:text-[42px]" dir="ltr">
                {formatLocalizedNumber(stats.average, lang, {
                  maximumFractionDigits: 1,
                  minimumFractionDigits: 1,
                })}
              </div>
              <div className="mt-1 flex">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    size={13}
                    fill={i <= Math.round(stats.average) ? '#f4a524' : '#e4eeee'}
                    color={i <= Math.round(stats.average) ? '#f4a524' : '#e4eeee'}
                  />
                ))}
              </div>
              <div className="mt-1 text-[10px] text-slate-500 sm:text-[11px]">
                {formatLocalizedNumber(stats.total, lang)} {text(COPY.reviewsCount)}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.breakdown[star] || 0;
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <div key={star} className="mb-2 flex items-center gap-1.5 sm:gap-2">
                    <span className="w-8 shrink-0 text-start text-[10px] font-bold text-[#486466] sm:w-10 sm:text-[11px]">{star} ★</span>
                    <div className="h-2 flex-1 rounded-full bg-[#eef2f2]">
                      <div className="h-full rounded-full bg-gradient-to-l from-[#f4a524] to-[#f59e0b]" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-6 shrink-0 text-start text-[10px] font-bold text-[#486466] sm:w-8 sm:text-[11px]">
                      {formatLocalizedNumber(count, lang)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </SectionCard>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <InfoTile label={text(COPY.overallRating)} value={stats.average} Icon={Star} tone="#f59e0b" />
          <InfoTile label={text(COPY.fiveStars)} value={stats.breakdown[5] || 0} Icon={ThumbsUp} tone="#14b8a6" />
          <InfoTile label={text(COPY.lowRatings)} value={reviews.filter((r) => r.rating <= 2).length} Icon={MessagesSquare} tone="#ef4444" />
          <InfoTile label={text(COPY.needsReply)} value={reviews.filter((r) => !r.reply).length} Icon={Reply} tone="#6366f1" />
        </div>
      </div>

      {ui.error && <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">{ui.error}</div>}
      {ui.loading && <div className="mb-4 rounded-xl bg-[#e6f7f7] px-4 py-3 text-xs font-semibold text-[#0e7c6e]">...</div>}

      <SectionCard
        title={COPY.latestTitle}
        description={`${formatLocalizedNumber(filtered.length, lang)} ${text(COPY.countSuffix)}`}
        icon={MessagesSquare}
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#486466]">
            <Filter size={11} /> {text(COPY.filterLabel)}
          </span>
          {STARS_FILTER.map((s) => (
            <button
              key={s.id}
              onClick={() => setFilter(s.id)}
              className="rounded-full border px-3 py-1 text-[11px] font-bold transition"
              style={
                filter === s.id
                  ? { background: '#14b8a6', borderColor: '#14b8a6', color: '#ffffff' }
                  : { background: '#ffffff', borderColor: '#e4eeee', color: '#486466' }
              }
            >
              {text(s.label)}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {filtered.map((review) => (
            <ReviewCard key={review.id} review={review} reload={loadReviews} />
          ))}
          </div>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <MessagesSquare size={20} className="text-[#14b8a6]" />
              <div className="text-[13px] font-bold text-[#084036]">{text(COPY.emptyText)}</div>
            </div>
          )}
        </SectionCard>
      </DoctorLayout>
    );
  }

  function ReviewCard({ review, reload }) {
    const { isRtl, lang, text } = useLocalizedContent();
    const { showToast } = useToast();
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleReply = async () => {
      if (!replyText.trim()) return;
      setSubmitting(true);
      try {
        await medoraApi.replyToReview(review.id, { Reply: replyText });
        setIsReplying(false);
        showToast(text(localizedText('تم الرد بنجاح!', 'Reply sent successfully!')));
        reload();
      } catch (err) {
        showToast(err.message || text(localizedText('حدث خطأ أثناء الرد', 'Error replying to review')));
      } finally {
        setSubmitting(false);
      }
    };

    const patientName = text(review.patient);
    const initials = patientName.trim().charAt(0);

    return (
      <div className="rounded-2xl border border-[#e4eeee] bg-white p-4 shadow-[0_4px_18px_rgba(41,93,96,0.04)]">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center justify-end gap-3">
            <div className="min-w-0 text-start">
              <div className="truncate text-[13px] font-extrabold text-[#084036]">
                {patientName}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center justify-end gap-1 text-[10px] sm:text-[11px]">
                <span className="text-slate-400">{formatDate(review.date, lang)}</span>
                <span className="text-slate-300">·</span>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      size={10}
                      fill={i <= review.rating ? '#f4a524' : '#e4eeee'}
                      color={i <= review.rating ? '#f4a524' : '#e4eeee'}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#14b8a6] to-[#0e7c6e] text-white">
              <span className="text-[13px] font-black">{initials}</span>
            </div>
          </div>
          {!review.reply && !isReplying && (
            <button onClick={() => setIsReplying(true)} className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-[#e4eeee] bg-white px-3 py-2 text-[11px] font-bold text-[#295d60] transition hover:border-[#14b8a6] sm:w-auto sm:self-start">
              <Reply size={12} />
              {text(COPY.reply)}
            </button>
          )}
        </div>

        <p className="rounded-xl bg-[#f7fbfb] p-3 text-[12px] leading-7 text-slate-700 sm:p-4">
          {text(review.comment)}
        </p>

        {review.reply && (
          <div className={`mt-3 rounded-xl bg-slate-50 p-3 sm:p-4 border border-slate-100 ${isRtl ? 'mr-8' : 'ml-8'}`}>
            <div className="flex items-center gap-2 mb-2 text-[#084036] font-bold text-[12px]">
              <Reply size={12} className="rotate-180" />
              <span>{text(localizedText('ردك', 'Your Reply'))}</span>
              <span className="text-slate-400 text-[10px] font-normal">{formatDate(review.replyCreatedAt, lang)}</span>
            </div>
            <p className="text-[12px] leading-7 text-slate-700">{review.reply}</p>
          </div>
        )}

        {isReplying && (
          <div className="mt-3 rounded-xl border border-[#14b8a6]/20 bg-[#f7fbfb] p-3 sm:p-4">
            <textarea
              className="w-full resize-y rounded-xl border border-[#e4eeee] p-3 text-[12px] outline-none transition focus:border-[#14b8a6] focus:ring-1 focus:ring-[#14b8a6]/20"
              placeholder={text(localizedText('اكتب ردك هنا...', 'Type your reply here...'))}
              rows="3"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              disabled={submitting}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button disabled={submitting} onClick={() => setIsReplying(false)} className="rounded-full px-4 py-2 text-[11px] font-bold text-slate-500 hover:bg-slate-100">
                {text(localizedText('إلغاء', 'Cancel'))}
              </button>
              <button disabled={submitting} onClick={handleReply} className="rounded-full bg-[#14b8a6] px-4 py-2 text-[11px] font-bold text-white hover:bg-[#119a8a]">
                {submitting ? '...' : text(localizedText('إرسال', 'Submit'))}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

function InfoTile({ label, value, Icon, tone }) {
  const { lang } = useLocalizedContent();

  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-[#e4eeee] bg-white p-4 text-start shadow-[0_8px_22px_rgba(41,93,96,0.06)] sm:flex-row sm:items-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${tone}1a`, color: tone }}>
        {Icon && <Icon size={16} />}
      </span>
      <div className="w-full min-w-0">
        <div className="text-[18px] font-black text-[#084036]">
          {typeof value === 'number' ? formatLocalizedNumber(value, lang) : value}
        </div>
        <div className="text-[11px] text-[#486466]">{label}</div>
      </div>
    </div>
  );
}
