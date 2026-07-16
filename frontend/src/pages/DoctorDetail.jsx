import { memo, useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  ArrowRight, ArrowLeft, Briefcase, Calendar, Clock, Flag, Heart, MapPin, Phone,
  Navigation, Star, Stethoscope, Users,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Home_Page/Footer';
import MobileBottomNav from '../components/MobileBottomNav';
import SearchEmptyIcon from '../components/SearchEmptyIcon';
import BookingDialog from '../components/appointments/BookingDialog';
import ReportModal from '../components/shared/ReportModal';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getLocalizedText } from '../utils/localization';
import { resolveImageUrl } from '../utils/professionalApiMappers';
import { medoraApi } from '../api/medoraApi';
import { getDirectionsUrl } from '../utils/locationUtils';

const BRAND = '#0da694';

const COPY = {
  backToList: { ar: 'العودة للأطباء', en: 'Back to Doctors' },
  aboutDoc: { ar: 'عن الطبيب', en: 'About the Doctor' },
  availTimes: { ar: 'المواعيد المتاحة', en: 'Available Times' },
  bookNow: { ar: 'احجز الآن', en: 'Book Now' },
  clinicInfo: { ar: 'معلومات العيادة', en: 'Clinic Information' },
  reviewsTitle: { ar: 'التقييمات والمراجعات', en: 'Ratings & Reviews' },
  fee: { ar: 'ج.م', en: 'EGP' },
  feeLabel: { ar: 'كشف جديد', en: 'New Visit' },
  refeelLabel: { ar: 'إعادة كشف', en: 'Re-consultation' },
  expLabel: { ar: 'سنوات الخبرة', en: 'Years Experience' },
  patientsLabel: { ar: 'مريض', en: 'Patients' },
  reviews: { ar: 'تقييم', en: 'reviews' },
  yrs: { ar: 'سنة', en: 'yrs' },
  notFound: { ar: 'الطبيب غير موجود', en: 'Doctor not found' },
  goBack: { ar: 'العودة', en: 'Go Back' },
  bookTitle: { ar: 'حجز موعد', en: 'Book Appointment' },
  bookWith: { ar: 'حجز مع', en: 'Booking with' },
  nameLabel: { ar: 'الاسم بالكامل', en: 'Full Name' },
  phoneLabel: { ar: 'رقم الهاتف', en: 'Phone Number' },
  dateLabel: { ar: 'تاريخ الموعد', en: 'Appointment date' },
  timeLabel: { ar: 'اختر الموعد', en: 'Select Time' },
  notesLabel: { ar: 'ملاحظات (اختياري)', en: 'Notes (optional)' },
  confirmBook: { ar: 'تأكيد الحجز', en: 'Confirm Booking' },
  cancel: { ar: 'إلغاء', en: 'Cancel' },
  bookSuccess: { ar: 'تم الحجز بنجاح! سنتواصل معك قريباً.', en: 'Booking confirmed! We will contact you soon.' },
  close: { ar: 'إغلاق', en: 'Close' },
  overallRating: { ar: 'التقييم العام', en: 'Overall Rating' },
  basedOn: { ar: 'بناءً على', en: 'Based on' },
  newVisit: { ar: 'كشف جديد', en: 'New Visit' },
  reconsultation: { ar: 'إعادة كشف', en: 'Re-consultation' },
  visitTypeNew: { ar: 'أول مرة عند الطبيب', en: 'First time with this doctor' },
  visitTypeRe: { ar: 'بناءً على زياراتك السابقة', en: 'Based on your previous visits' },
  durationLabel: { ar: 'مدة الكشف:', en: 'Duration:' },
  minutes: { ar: 'دقيقة', en: 'min' },
};

const DAY_MAP = {
  0: { ar: 'الأحد', en: 'Sunday' },
  1: { ar: 'الإثنين', en: 'Monday' },
  2: { ar: 'الثلاثاء', en: 'Tuesday' },
  3: { ar: 'الأربعاء', en: 'Wednesday' },
  4: { ar: 'الخميس', en: 'Thursday' },
  5: { ar: 'الجمعة', en: 'Friday' },
  6: { ar: 'السبت', en: 'Saturday' },
  'Sunday': { ar: 'الأحد', en: 'Sunday' },
  'Monday': { ar: 'الإثنين', en: 'Monday' },
  'Tuesday': { ar: 'الثلاثاء', en: 'Tuesday' },
  'Wednesday': { ar: 'الأربعاء', en: 'Wednesday' },
  'Thursday': { ar: 'الخميس', en: 'Thursday' },
  'Friday': { ar: 'الجمعة', en: 'Friday' },
  'Saturday': { ar: 'السبت', en: 'Saturday' },
};

const mapDoctorDetails = (item, reviews = [], preferredClinicId = null) => {
  const clinics = Array.isArray(item.clinics) ? item.clinics : [];
  const clinic = clinics.find((entry) => String(entry.clinicId) === String(preferredClinicId)) || clinics[0] || {};
  const name = item.fullName || '';
  const availability = clinic.workingHours?.filter((hour) => !hour.isClosed).map((hour) => {
    const from = String(hour.openFrom || '').slice(0, 5);
    const to = String(hour.openTo || '').slice(0, 5);
    const timeStr = from && to ? `${from} - ${to}` : from || to;
    const day = DAY_MAP[hour.dayOfWeek];
    
    if (day && timeStr) {
      return { id: String(hour.dayOfWeek), ar: `${day.ar}: ${timeStr}`, en: `${day.en}: ${timeStr}` };
    }
    return timeStr ? { id: timeStr, ar: timeStr, en: timeStr } : null;
  }).filter(Boolean) || [];

  return {
    id: item.doctorId,
    clinicId: clinic.clinicId,
    name: { ar: name, en: name },
    specialty: { ar: item.specialtyNameAr || '', en: item.specialtyNameEn || item.specialtyNameAr || '' },
    bio: { ar: item.bio || '', en: item.bio || '' },
    avatar: resolveImageUrl(item.profileImageUrl, name),
    phone: item.phone,
    city: { ar: clinic.cityAr || '', en: clinic.cityEn || clinic.cityAr || '' },
    governorate: { ar: clinic.governorateAr || '', en: clinic.governorateEn || clinic.governorateAr || '' },
    clinicName: { ar: clinic.nameAr || '', en: clinic.nameEn || clinic.nameAr || '' },
    clinicAddress: { ar: clinic.addressLine || '', en: clinic.addressLine || '' },
    clinicPhone: clinic.phone || item.phone || '',
    latitude: clinic.latitude ?? null,
    longitude: clinic.longitude ?? null,
    consultationFee: clinic.consultationFee || 0,
    reconsultationFee: clinic.reconsultationFee || 0,
    appointmentDurationMinutes: clinic.appointmentDurationMinutes || 15,
    experience: item.experienceYears ?? 0,
    patientsCount: item.patientsCount ?? 0,
    rating: Number(item.avgRating || 0).toFixed(1),
    reviewCount: item.reviewsCount || 0,
    availability: availability.length ? availability : [{ id: 'default', ar: 'يومياً: 09:00 - 17:00', en: 'Daily: 09:00 - 17:00' }],
    reviews: reviews.map((review) => ({
      id: review.id,
      patient: { ar: review.reviewerName || '', en: review.reviewerName || '' },
      rating: review.rating,
      comment: { ar: review.comment || '', en: review.comment || '' },
      reply: review.reply ? { ar: review.reply, en: review.reply } : null,
      replyDate: review.replyCreatedAt ? new Date(review.replyCreatedAt).toLocaleDateString() : '',
      date: review.createdAt ? new Date(review.createdAt).toLocaleDateString() : '',
    })),
  };
};

/* ─── Rating breakdown bar ─── */
const RatingBar = memo(function RatingBar({ star, count, total }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span className="w-3 font-bold text-slate-600">{star}</span>
      <Star size={11} fill="#f4a524" color="#f4a524" />
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[#f4a524] transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-5 text-right text-slate-400">{count}</span>
    </div>
  );
});

/* ─── Review card ─── */
const ReviewCard = memo(function ReviewCard({ review, lang, doctorName }) {
  const t = (v) => getLocalizedText(v, lang);
  return (
    <div className="rounded-xl border border-[#e2edec] bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[13px] font-bold text-slate-800">{t(review.patient)}</span>
        <span className="text-[11px] text-slate-400">{review.date}</span>
      </div>
      <div className="mb-2 flex gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star key={s} size={12} fill={s <= review.rating ? '#f4a524' : '#e2e8f0'} color={s <= review.rating ? '#f4a524' : '#e2e8f0'} />
        ))}
      </div>
      <p className="text-[13px] leading-6 text-slate-600">{t(review.comment)}</p>

      {/* Doctor Reply */}
      {review.reply && (
        <div className="mt-3 rounded-lg bg-[#f4fbfa] p-3 border-s-2 border-[#0da694]">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[12px] font-bold text-[#0da694]">
              {lang === 'ar' ? `رد ${t(doctorName) || 'الطبيب'}` : `Reply from ${t(doctorName) || 'Doctor'}`}
            </span>
            <span className="text-[10px] text-slate-400">{review.replyDate}</span>
          </div>
          <p className="text-[12px] leading-5 text-slate-600">{t(review.reply)}</p>
        </div>
      )}
    </div>
  );
});

/* ═══════ Main Page ═══════ */
export default function DoctorDetail() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, t: trans } = useLang();
  const { isAuthenticated, user } = useAuth();
  const isRtl = trans.dir === 'rtl';
  const t = (v) => getLocalizedText(v, lang);
  const isPatient = [user?.role, user?.accountType].filter(Boolean).map((item) => String(item).toLowerCase()).includes('patient');

  const [doctor, setDoctor] = useState(null);
  const [ui, setUi] = useState({ loading: true, error: '' });
  const [showBooking, setShowBooking] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const hasAutoOpenedRef = useRef(false);
  const preferredClinicId = searchParams.get('clinicId');
  const BackArrow = isRtl ? ArrowRight : ArrowLeft;
  const handleOpenBooking = useCallback(() => {
    if (!isAuthenticated) {
      navigate('/sign-in', { state: { from: location } });
      return;
    }
    setUi((current) => ({ ...current, error: '' }));
    setShowBooking(true);
  }, [isAuthenticated, location, navigate]);

  const handleCloseBooking = useCallback(() => {
    hasAutoOpenedRef.current = true;
    setShowBooking(false);
    if (searchParams.get('book') === '1') {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('book');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    window.scrollTo(0, 0);
    let mounted = true;
    queueMicrotask(() => {
      if (!mounted) return;
      setDoctor(null);
      setUi({ loading: true, error: '' });
    });
    Promise.allSettled([medoraApi.doctor(id), medoraApi.reviewsForDoctor(id)]).then(([doctorResult, reviewsResult]) => {
      if (!mounted) return;
      if (doctorResult.status === 'fulfilled') {
        const reviews = reviewsResult.status === 'fulfilled' && Array.isArray(reviewsResult.value) ? reviewsResult.value : [];
        setDoctor(mapDoctorDetails(doctorResult.value, reviews, preferredClinicId));
        setUi({ loading: false, error: '' });
      } else {
        setUi({ loading: false, error: doctorResult.reason?.message || '' });
      }
    });
    return () => { mounted = false; };
  }, [id, preferredClinicId]);

  useEffect(() => {
    if (searchParams.get('book') === '1' && doctor && !showBooking && !hasAutoOpenedRef.current) {
      hasAutoOpenedRef.current = true;
      queueMicrotask(() => {
        handleOpenBooking();
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('book');
        setSearchParams(newParams, { replace: true });
      });
    }
  }, [doctor, handleOpenBooking, searchParams, showBooking, setSearchParams]);

  useEffect(() => {
    if (!isAuthenticated || !isPatient || !id) {
      setIsFavorite(false);
      return undefined;
    }

    let mounted = true;
    medoraApi.favoriteDoctors()
      .then((items) => {
        if (!mounted) return;
        const list = Array.isArray(items) ? items : [];
        setIsFavorite(list.some((item) => String(item.doctorId) === String(id)));
      })
      .catch((error) => {
        if (mounted) {
          setIsFavorite(false);
          console.warn('Unable to load favorite doctors', error);
        }
      });

    return () => { mounted = false; };
  }, [id, isAuthenticated, isPatient]);

  const handleToggleFavorite = useCallback(async () => {
    if (!isAuthenticated) {
      navigate('/sign-in', { state: { from: location } });
      return;
    }
    if (!isPatient) {
      setUi((current) => ({
        ...current,
        error: isRtl ? 'المفضلة متاحة لحسابات المرضى فقط' : 'Favorites are available for patient accounts only',
      }));
      return;
    }

    setFavoriteBusy(true);
    try {
      if (isFavorite) {
        await medoraApi.removeFavoriteDoctor(id);
        setIsFavorite(false);
      } else {
        await medoraApi.addFavoriteDoctor(id);
        setIsFavorite(true);
      }
      setUi((current) => ({ ...current, error: '' }));
    } catch (error) {
      setUi((current) => ({ ...current, error: error.message || 'Unable to update favorites' }));
    } finally {
      setFavoriteBusy(false);
    }
  }, [id, isAuthenticated, isFavorite, isPatient, isRtl, location, navigate]);

  /* Rating breakdown */
  const ratingBreakdown = useMemo(() => {
    if (!doctor) return [];
    const counts = [0, 0, 0, 0, 0];
    doctor.reviews.forEach((r) => { if (r.rating >= 1 && r.rating <= 5) counts[r.rating - 1]++; });
    return [5, 4, 3, 2, 1].map((s) => ({ star: s, count: counts[s - 1] }));
  }, [doctor]);

  if (!doctor && ui.loading) {
    return (
      <div dir={trans.dir} style={{ fontFamily: "'Cairo','Inter',sans-serif" }} className="min-h-screen bg-[#f4fbfa]">
        <Navbar />
        <div className="flex flex-col items-center justify-center px-4 py-32 text-center">
          <div className="text-sm font-bold text-slate-500">...</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div dir={trans.dir} style={{ fontFamily: "'Cairo','Inter',sans-serif" }} className="min-h-screen bg-[#f4fbfa]">
        <Navbar />
        <div className="flex flex-col items-center justify-center px-4 py-32 text-center">
          <SearchEmptyIcon />
          <h1 className="text-2xl font-extrabold text-slate-900">{t(COPY.notFound)}</h1>
          <button onClick={() => navigate('/doctors')} className="mt-6 rounded-xl px-6 py-3 text-sm font-bold text-white" style={{ background: BRAND }}>
            {t(COPY.goBack)}
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  const directionsUrl = getDirectionsUrl(doctor, getLocalizedText(doctor.clinicAddress, lang, ''));

  return (
    <div dir={trans.dir} style={{ fontFamily: "'Cairo','Inter',sans-serif", background: '#f4fbfa', minHeight: '100vh' }}>
      <Navbar />

      {/* Back */}
      <div className="mx-auto max-w-5xl px-4 pt-6">
        <button onClick={() => navigate('/doctors')}
          className="flex items-center gap-2 text-[13px] font-bold transition hover:opacity-70" style={{ color: BRAND }}>
          <BackArrow size={16} />
          {t(COPY.backToList)}
        </button>
      </div>

      {ui.error && (
        <div className="mx-auto mt-4 max-w-5xl px-4">
          <div className="rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">{ui.error}</div>
        </div>
      )}

      {/* Profile header */}
      <section className="mx-auto mt-4 max-w-5xl px-4">
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_10px_30px_rgba(2,8,23,0.05)]" style={{ border: '1px solid #e2edec' }}>
          <div className="p-6 sm:p-8">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <img src={doctor.avatar} alt={t(doctor.name)}
                className="h-28 w-28 shrink-0 rounded-2xl object-cover shadow-md sm:h-32 sm:w-32" />

              <div className="flex-1 text-center sm:text-start">
                <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{t(doctor.name)}</h1>
                <p className="mt-1 text-[14px] font-bold" style={{ color: BRAND }}>{t(doctor.specialty)}</p>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-[13px] text-slate-500 sm:justify-start">
                  <span className="flex items-center gap-1"><MapPin size={13} />{t(doctor.city)}، {t(doctor.governorate)}</span>
                  <span className="flex items-center gap-1">
                    <Star size={13} fill="#f4a524" color="#f4a524" />
                    <span className="font-bold text-slate-800">{doctor.rating}</span>
                    <span>({doctor.reviewCount} {t(COPY.reviews)})</span>
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <button
                    type="button"
                    onClick={handleToggleFavorite}
                    disabled={favoriteBusy}
                    className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-extrabold transition disabled:opacity-60"
                    style={{
                      color: isFavorite ? '#119a8a' : '#2d6669',
                      borderColor: isFavorite ? '#14b8a6' : '#d7e7e5',
                      background: isFavorite ? '#e6f7f7' : '#ffffff',
                    }}
                  >
                    <Heart size={14} fill={isFavorite ? '#14b8a6' : 'none'} />
                    {isFavorite ? (isRtl ? 'في المفضلة' : 'Favorited') : (isRtl ? 'المفضلة' : 'Favorite')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isAuthenticated) {
                        navigate('/sign-in', { state: { from: location } });
                        return;
                      }
                      setShowReport(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-[#d7e7e5] bg-white px-4 py-2 text-xs font-extrabold text-[#486466] transition hover:border-[#14b8a6] hover:text-[#119a8a]"
                  >
                    <Flag size={14} />
                    {isRtl ? 'إبلاغ' : 'Report'}
                  </button>
                </div>

                {/* Quick stats */}
                <div className={`mt-5 grid gap-3 ${doctor.reconsultationFee > 0 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
                  {[
                    { icon: Briefcase, val: `${doctor.consultationFee} ${t(COPY.fee)}`, label: t(COPY.feeLabel), color: BRAND },
                    ...(doctor.reconsultationFee > 0 ? [{ icon: Briefcase, val: `${doctor.reconsultationFee} ${t(COPY.fee)}`, label: t(COPY.refeelLabel), color: '#6366f1' }] : []),
                    { icon: Clock, val: `${doctor.experience} ${t(COPY.yrs)}`, label: t(COPY.expLabel), color: '#6366f1' },
                    { icon: Users, val: `${doctor.patientsCount}+`, label: t(COPY.patientsLabel), color: '#f59e0b' },
                  ].map((s, i) => (
                    <div key={i} className="rounded-xl border border-[#e2edec] bg-[#f4fbfa] p-3 text-center">
                      <s.icon size={18} className="mx-auto mb-1" style={{ color: s.color }} />
                      <div className="text-[15px] font-black text-slate-800">{s.val}</div>
                      <div className="text-[10px] text-slate-500">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content grid */}
      <div className="mx-auto mt-6 max-w-5xl px-4 pb-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Left column */}
          <div className="space-y-6">
            {/* Bio */}
            <div className="rounded-2xl border border-[#e2edec] bg-white p-6">
              <h2 className="mb-3 text-lg font-extrabold text-slate-900">{t(COPY.aboutDoc)}</h2>
              <p className="text-[14px] leading-7 text-slate-600">{t(doctor.bio)}</p>
            </div>

            {/* Reviews */}
            <div className="rounded-2xl border border-[#e2edec] bg-white p-6">
              <h2 className="mb-4 text-lg font-extrabold text-slate-900">{t(COPY.reviewsTitle)}</h2>

              {/* Breakdown */}
              <div className="mb-6 flex flex-col items-center gap-5 rounded-xl bg-[#f4fbfa] p-5 sm:flex-row">
                <div className="text-center">
                  <div className="text-4xl font-black text-slate-900">{doctor.rating}</div>
                  <div className="mt-1 flex justify-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={14} fill={s <= Math.round(doctor.rating) ? '#f4a524' : '#e2e8f0'} color={s <= Math.round(doctor.rating) ? '#f4a524' : '#e2e8f0'} />
                    ))}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">{t(COPY.basedOn)} {doctor.reviewCount} {t(COPY.reviews)}</p>
                </div>
                <div className="flex-1 space-y-1.5">
                  {ratingBreakdown.map((r) => (
                    <RatingBar key={r.star} star={r.star} count={r.count} total={doctor.reviews.length} />
                  ))}
                </div>
              </div>

              {/* Review cards */}
              <div className="space-y-3">
                {doctor.reviews.map((r) => (
                  <ReviewCard key={r.id} review={r} lang={lang} doctorName={doctor.name} />
                ))}
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {/* Available times */}
            <div className="rounded-2xl border border-[#e2edec] bg-white p-6">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-slate-900">
                <Calendar size={18} style={{ color: BRAND }} />
                {t(COPY.availTimes)}
              </h2>
              <div className="flex flex-wrap gap-2">
                {doctor.availability.map((slot, idx) => (
                  <span key={slot.id || idx} className="rounded-lg border border-[#dbeae8] bg-[#f4fbfa] px-3 py-1.5 text-[12px] font-bold text-[#0b5e52]">
                    {typeof slot === 'string' ? slot : t(slot)}
                  </span>
                ))}
              </div>
              <button
                onClick={handleOpenBooking}
                className="mt-5 w-full rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90 active:scale-[0.97]"
                style={{ background: BRAND, boxShadow: `0 4px 16px ${BRAND}40` }}
              >
                {t(COPY.bookNow)}
              </button>
            </div>

            {/* Clinic info */}
            <div className="rounded-2xl border border-[#e2edec] bg-white p-6">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-slate-900">
                <Stethoscope size={18} style={{ color: BRAND }} />
                {t(COPY.clinicInfo)}
              </h2>
              <div className="space-y-3 text-[13px] text-slate-600">
                <div className="flex items-start gap-2">
                  <Stethoscope size={14} className="mt-0.5 shrink-0" style={{ color: BRAND }} />
                  <span className="font-bold">{t(doctor.clinicName)}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="mt-0.5 shrink-0" style={{ color: BRAND }} />
                  <span>{t(doctor.clinicAddress)}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Phone size={14} className="mt-0.5 shrink-0" style={{ color: BRAND }} />
                  <span dir="ltr">{doctor.clinicPhone}</span>
                </div>
                {directionsUrl && (
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-[#14b8a6]/30 bg-[#f4fbfa] px-4 py-2 text-[12px] font-extrabold text-[#119a8a] transition hover:border-[#14b8a6]"
                  >
                    <Navigation size={13} />
                    {isRtl ? 'الاتجاهات' : 'Directions'}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking modal */}
      {showBooking && (
        <BookingDialog
          doctor={doctor}
          lang={lang}
          isRtl={isRtl}
          onClose={handleCloseBooking}
          isAuthenticated={isAuthenticated}
        />
      )}

      <ReportModal
        open={showReport}
        onClose={() => setShowReport(false)}
        targetType="doctor"
        targetId={Number(id)}
        targetLabel={t(doctor.name)}
      />

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
