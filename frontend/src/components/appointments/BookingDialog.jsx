import React, { useMemo, useState, useEffect } from 'react';
import { X, User, Phone, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { medoraApi } from '../../api/medoraApi';
import { useAuth } from '../../context/AuthContext';

/* ─── helpers ─────────────────────────────────────────────────────────── */
function dateKey(date) {
  const d = new Date(date);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

const DAY_NAMES = {
  ar: ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'],
  en: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
};
const MONTH_NAMES = {
  ar: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
  en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
};

/* "Mon, Jun 29" — exact format matching the screenshot */
function formatDateChip(dateStr, lang) {
  const d = new Date(dateStr + 'T00:00:00');
  const dayName   = DAY_NAMES[lang]?.[d.getDay()]    ?? DAY_NAMES.en[d.getDay()];
  const monthName = MONTH_NAMES[lang]?.[d.getMonth()] ?? MONTH_NAMES.en[d.getMonth()];
  return `${dayName}, ${monthName} ${d.getDate()}`;
}

function generateTimeSlots(openFrom = '09:00', openTo = '17:30', step = 15) {
  const slots = [];
  const [sh, sm] = openFrom.split(':').map(Number);
  const [eh, em] = openTo.split(':').map(Number);
  let cur = sh * 60 + sm;
  const end = eh * 60 + em;
  while (cur + step <= end) {
    const hh = String(Math.floor(cur / 60)).padStart(2, '0');
    const mm = String(cur % 60).padStart(2, '0');
    slots.push(`${hh}:${mm}`);
    cur += step;
  }
  return slots;
}

function fmt12(time24, lang) {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h < 12 ? (lang === 'ar' ? 'ص' : 'AM') : (lang === 'ar' ? 'م' : 'PM');
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

/* ─── copy ────────────────────────────────────────────────────────────── */
const COPY = {
  title:         { ar: 'حجز موعد',              en: 'Book Appointment' },
  bookingWith:   { ar: 'الحجز مع',              en: 'Booking with' },
  fullName:      { ar: 'الاسم الكامل',           en: 'Full Name' },
  phone:         { ar: 'رقم الهاتف',             en: 'Phone Number' },
  chooseDate:    { ar: 'اختر تاريخ الموعد',     en: 'Choose appointment date' },
  nearestDates:  { ar: 'أقرب المواعيد المتاحة', en: 'Nearest available dates' },
  selectTime:    { ar: 'اختر الوقت',            en: 'Select time' },
  duration:      { ar: 'المدة',                  en: 'Duration' },
  minutes:       { ar: 'دقيقة',                  en: 'min' },
  login:         { ar: 'سجّل الدخول للحجز',     en: 'Sign in to book' },
  submit:        { ar: 'تأكيد الحجز',           en: 'Confirm Booking' },
  cancel:        { ar: 'إلغاء',                  en: 'Cancel' },
  success:       { ar: 'تم إرسال الحجز بنجاح',  en: 'Appointment request sent' },
  successTitle:  { ar: 'تم تأكيد الحجز!',       en: 'Booking confirmed!' },
  successSub:    { ar: 'سنتواصل معك قريباً.',   en: 'We will contact you soon.' },
  closeBtn:      { ar: 'إغلاق',                  en: 'Close' },
  failed:        { ar: 'تعذر إنشاء الحجز',      en: 'Unable to create appointment' },
  nameRequired:  { ar: 'الاسم مطلوب',           en: 'Full name is required' },
  phoneRequired: { ar: 'رقم الهاتف مطلوب',      en: 'Phone number is required' },
  consultationFeeLabel: { ar: 'رسوم الكشف',     en: 'Consultation Fee' },
  reconsultationFeeLabel: { ar: 'رسوم الإعادة', en: 'Reconsultation Fee' },
  currency:      { ar: 'ج.م',                    en: 'EGP' },
};

/* ─── component ───────────────────────────────────────────────────────── */
export default function BookingDialog({ doctor, lang = 'ar', isRtl = true, onClose, isAuthenticated }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const durationMinutes = doctor?.appointmentDurationMinutes || 15;
  const openFrom        = doctor?.openFrom || '09:00';
  const openTo          = doctor?.openTo   || '17:30';

  const [contactName,  setContactName]  = useState(user?.fullName   || '');
  const [contactPhone, setContactPhone] = useState(user?.phoneNumber || '');
  
  const [schedule, setSchedule] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  
  const [date,    setDate]    = useState('');
  const [time,    setTime]    = useState('');
  const [status,  setStatus]  = useState({ type: '', msg: '' });
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState({});
  const [isReconsultation, setIsReconsultation] = useState(false);
  const [checkingHistory, setCheckingHistory] = useState(isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated || !doctor) {
      setCheckingHistory(false);
      return;
    }
    setCheckingHistory(true);
    const fetchHistory = async () => {
      try {
        const data = await medoraApi.appointments();
        const arr = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        const did = doctor?.doctorId || doctor?.id;
        const hasPast = arr.some(a => a.doctorId === did && a.status === 'completed');
        setIsReconsultation(hasPast);
      } catch (e) {}
      setCheckingHistory(false);
    };
    fetchHistory();
  }, [isAuthenticated, doctor]);

  useEffect(() => {
    if (!doctor) return;
    setLoadingSchedule(true);
    medoraApi.availableSchedule({ doctorId: doctor?.doctorId || doctor?.id, clinicId: doctor?.clinicId || 0, days: 14 })
      .then(data => {
        setSchedule(data || []);
        if (data && data.length > 0) {
          setDate(data[0].date);
          if (data[0].slots && data[0].slots.length > 0) {
             setTime(data[0].slots[0].time.substring(0, 5));
          }
        }
      })
      .catch(() => setSchedule([]))
      .finally(() => setLoadingSchedule(false));
  }, [doctor]);

  const dateOptions = useMemo(() => schedule.map(d => d.date), [schedule]);
  const timeSlots = useMemo(() => {
    const day = schedule.find(d => d.date === date);
    if (!day) return [];
    return day.slots.filter(s => s.isAvailable).map(s => s.time.substring(0, 5));
  }, [schedule, date]);
  const quickDates = dateOptions.slice(0, 6);

  const t = (key) => COPY[key]?.[lang] ?? COPY[key]?.ar;

  const submit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/sign-in', { state: { from: { pathname: '/doctors' } } });
      return;
    }
    const errs = {};
    if (!contactName.trim())  errs.contactName  = t('nameRequired');
    if (!contactPhone.trim()) errs.contactPhone = t('phoneRequired');
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setStatus({ type: '', msg: '' });
    setErrors({});
    try {
      const scheduledAt = new Date(`${date}T${time}:00`).toISOString();
      await medoraApi.createAppointment({
        doctorId:     doctor?.doctorId || doctor?.id,
        clinicId:     doctor?.clinicId || 0,
        contactName:  contactName.trim(),
        contactPhone: contactPhone.trim(),
        scheduledAt,
        appointmentDate: scheduledAt,
        isReconsultation,
      });
      setStatus({ type: 'success', msg: '' });
    } catch (err) {
      setStatus({ type: 'error', msg: err?.message || t('failed') });
    } finally {
      setLoading(false);
    }
  };

  const doctorName = doctor?.name?.[lang] ?? doctor?.name?.ar ?? doctor?.doctorName ?? '';

  if (status.type === 'success') {
    return (
      <div
        className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4"
        dir={isRtl ? 'rtl' : 'ltr'}
        style={{ fontFamily: "'Cairo', 'Segoe UI', sans-serif" }}
      >
        <div className="relative w-full max-w-[360px] bg-white rounded-2xl px-6 py-8 flex flex-col items-center text-center shadow-2xl">
          <div className="w-14 h-14 rounded-full border-[3px] flex items-center justify-center mb-5" style={{ borderColor: '#14b8a6' }}>
            <Check size={28} style={{ color: '#14b8a6' }} strokeWidth={3.5} />
          </div>
          
          <h3 className="text-[17px] font-bold text-gray-800 leading-tight mb-1">{t('successTitle')} {t('successSub')}</h3>
          
          <button
            onClick={onClose}
            className="mt-6 h-10 px-8 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: '#14b8a6' }}
          >
            {t('closeBtn')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4"
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{ fontFamily: "'Cairo', 'Segoe UI', sans-serif" }}
    >
      <form
        onSubmit={submit}
        className="relative w-full max-w-[420px] max-h-[95vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
        style={{ scrollbarWidth: 'none' }}
      >

        {/* ══ HEADER — dark teal, matches screenshot exactly ══ */}
        <div
          className="flex items-center justify-between px-5 py-4 rounded-t-2xl"
          style={{ background: '#0d9488' }}
        >
          <div>
            <h3 className="text-base font-bold text-white leading-tight">{t('title')}</h3>
            <p className="text-xs mt-0.5" style={{ color: '#8ab8b0' }}>
              {t('bookingWith')} {doctorName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('closeBtn')}
            className="w-7 h-7 flex items-center justify-center rounded-full transition-colors"
            style={{ color: '#8ab8b0' }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = '#8ab8b0'}
          >
            <X size={18} />
          </button>
        </div>

        {/* ══ BODY ══ */}
        <div className="px-5 py-4 space-y-4">

          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t('fullName')}</label>
            <input
              type="text"
              value={contactName}
              onChange={e => { setContactName(e.target.value); setErrors(p => ({ ...p, contactName: '' })); }}
              placeholder={lang === 'ar' ? 'اكتب اسمك بالكامل' : 'Write your full name'}
              className="w-full h-11 rounded-lg border px-3 text-sm outline-none transition-all"
              style={{
                borderColor: errors.contactName ? '#f87171' : '#d1d5db',
                background:  errors.contactName ? '#fef2f2' : '#fff',
              }}
              onFocus={e => { if (!errors.contactName) e.target.style.borderColor = '#14b8a6'; }}
              onBlur={e => { if (!errors.contactName) e.target.style.borderColor = '#d1d5db'; }}
            />
            {errors.contactName && <p className="mt-1 text-xs text-red-500">{errors.contactName}</p>}
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t('phone')}</label>
            <input
              type="tel"
              value={contactPhone}
              onChange={e => { setContactPhone(e.target.value); setErrors(p => ({ ...p, contactPhone: '' })); }}
              placeholder="01xxxxxxxxx"
              dir="ltr"
              className="w-full h-11 rounded-lg border px-3 text-sm outline-none transition-all"
              style={{
                borderColor: errors.contactPhone ? '#f87171' : '#d1d5db',
                background:  errors.contactPhone ? '#fef2f2' : '#fff',
              }}
              onFocus={e => { if (!errors.contactPhone) e.target.style.borderColor = '#14b8a6'; }}
              onBlur={e => { if (!errors.contactPhone) e.target.style.borderColor = '#d1d5db'; }}
            />
            {errors.contactPhone && <p className="mt-1 text-xs text-red-500">{errors.contactPhone}</p>}
          </div>

          {/* Choose appointment date */}
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t('chooseDate')}</label>
            {loadingSchedule ? (
              <div className="w-full h-11 rounded-lg border border-gray-200 bg-gray-50 animate-pulse"></div>
            ) : (
              <input
                type="date"
                value={date}
                min={dateOptions[0] || ''}
                max={dateOptions[dateOptions.length - 1] || ''}
                onChange={e => setDate(e.target.value)}
                className="w-full h-11 rounded-lg border border-gray-300 px-3 text-sm text-gray-700 outline-none"
                style={{ colorScheme: 'light' }}
                onFocus={e => e.target.style.borderColor = '#14b8a6'}
                onBlur={e => e.target.style.borderColor = '#d1d5db'}
              />
            )}
          </div>

          {/* Nearest available dates — 3 columns × 2 rows (exactly like screenshot) */}
          {loadingSchedule ? (
            <div>
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-9 bg-gray-100 rounded-lg animate-pulse"></div>)}
              </div>
            </div>
          ) : quickDates.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">{t('nearestDates')}</p>
              <div className="grid grid-cols-3 gap-2">
              {quickDates.map(d => {
                const label  = formatDateChip(d, lang);
                const active = d === date;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDate(d)}
                    className="h-9 rounded-lg text-xs font-semibold transition-all border truncate px-1"
                    style={
                      active
                        ? { background: '#0d9488', color: '#fff', borderColor: '#0d9488' }
                        : { background: '#f8fafa', color: '#374151', borderColor: '#e5e7eb' }
                    }
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = '#14b8a6'; e.currentTarget.style.background = '#f0fdfb'; }}}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#f8fafa'; }}}
                  >
                    {label}
                  </button>
                );
              })}
              </div>
            </div>
          )}

          {/* Select time — 5-column grid (matches screenshot) */}
          {loadingSchedule ? (
            <div>
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => <div key={i} className="h-9 bg-gray-100 rounded-lg animate-pulse"></div>)}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-700">{t('selectTime')}</p>
                <span className="text-xs text-gray-400">
                  {t('duration')}: {durationMinutes} {t('minutes')}
                </span>
              </div>

            {timeSlots.length > 0 ? (
              <div className="grid grid-cols-5 gap-1.5">
                {timeSlots.map(slot => {
                  const active = slot === time;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setTime(slot)}
                      className="h-9 rounded-lg text-xs font-semibold transition-all"
                      style={
                        active
                          ? { background: '#14b8a6', color: '#fff' }
                          : { background: '#f3f4f6', color: '#374151' }
                      }
                      onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#e0f7f5'; }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.background = '#f3f4f6'; }}
                    >
                      {fmt12(slot, lang)}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 bg-gray-50 rounded-lg text-sm text-gray-500">
                {lang === 'ar' ? 'لا توجد مواعيد متاحة في هذا اليوم' : 'No available slots on this day'}
              </div>
            )}
          </div>
          )}

          {/* Status message */}
          {status.msg && status.type !== 'success' && (
            <div
              className="rounded-lg px-4 py-2.5 text-sm font-semibold mb-3"
              style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
            >
              {status.msg}
            </div>
          )}

          {/* Price / Fee display */}
          <div className="flex items-center justify-between mb-4 px-3 py-3 bg-[#f8fafa] rounded-xl border border-slate-100">
            {checkingHistory ? (
              <span className="text-xs font-semibold text-gray-400 animate-pulse">...</span>
            ) : (
              <>
                <span className="text-[13px] font-bold text-gray-600">
                  {isReconsultation ? t('reconsultationFeeLabel') : t('consultationFeeLabel')}
                </span>
                <span className="text-lg font-black" style={{ color: '#0d9488' }}>
                  {isReconsultation ? (doctor?.reconsultationFee > 0 ? doctor.reconsultationFee : doctor?.consultationFee || 0) : (doctor?.consultationFee || 0)} {t('currency')}
                </span>
              </>
            )}
          </div>

          {/* ══ BUTTONS — Confirm (teal) + Cancel ══ */}
          <div className="flex items-center gap-3 pt-1 pb-1">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-11 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)' }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              {loading ? '...' : isAuthenticated ? t('submit') : t('login')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-12 px-5 rounded-xl border border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition-colors"
            >
              {t('cancel')}
            </button>
          </div>

        </div>
      </form>
    </div>
  );
}
