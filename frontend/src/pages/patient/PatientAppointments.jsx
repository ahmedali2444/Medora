import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarCheck, Clock, MapPin, Star, XCircle } from 'lucide-react';
import { medoraApi } from '../../api/medoraApi';
import { useLang } from '../../context/LanguageContext';
import AddReviewModal from '../../components/patient/AddReviewModal';
import { canPatientCancelAppointment } from '../../utils/appointmentHelpers';

const COPY = {
  title: { ar: 'حجوزاتي', en: 'My Appointments' },
  subtitle: { ar: 'تابع وأدر مواعيدك الطبية', en: 'Track and manage all your medical appointments' },
  upcoming: { ar: 'القادمة', en: 'Upcoming' },
  past: { ar: 'السابقة', en: 'Past' },
  cancel: { ar: 'إلغاء الموعد', en: 'Cancel appointment' },
  cancelTooLate: { ar: 'لا يمكن إلغاء الموعد بعد وقته المحدد', en: 'Appointments cannot be cancelled after the scheduled time' },
  review: { ar: 'قيّم الطبيب', en: 'Review doctor' },
  noItems: { ar: 'لا توجد مواعيد', en: 'No appointments found' },
};

function getAppointmentDate(appointment) {
  return appointment.scheduledAt || appointment.appointmentDate || appointment.startAt || appointment.date;
}

function normalizeStatus(status) {
  return String(status || '').toLowerCase();
}

export default function PatientAppointments() {
  const { lang } = useLang();
  const isRtl = lang !== 'en';
  const [tab, setTab] = useState('upcoming');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewTarget, setReviewTarget] = useState(null);

  const loadAppointments = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await medoraApi.appointments();
      setAppointments(Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []);
    } catch (err) { setError(err?.message || (isRtl ? 'تعذر تحميل المواعيد' : 'Unable to load appointments')); }
    finally { setLoading(false); }
  }, [isRtl]);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  const filtered = useMemo(() => {
    const now = Date.now();
    return appointments.filter((a) => {
      const status = normalizeStatus(a.status);
      const date = new Date(getAppointmentDate(a)).getTime();
      const isPast = status === 'completed' || status === 'cancelled' || (Number.isFinite(date) && date < now);
      return tab === 'past' ? isPast : !isPast;
    });
  }, [appointments, tab]);

  const cancelAppointment = async (appointment) => {
    if (!window.confirm(isRtl ? 'هل تريد إلغاء الموعد؟' : 'Cancel this appointment?')) return;
    try {
      await medoraApi.cancelAppointment(appointment.id, { notes: 'Cancelled by patient', reason: 'Cancelled by patient' });
      await loadAppointments();
    } catch (err) { setError(err?.message || (isRtl ? 'تعذر إلغاء الموعد' : 'Unable to cancel appointment')); }
  };

  return (
    <div className="space-y-5" dir={isRtl ? 'rtl' : 'ltr'}>
      <div><h1 className="text-2xl font-black text-[#084036]">{COPY.title[lang] || COPY.title.ar}</h1><p className="mt-1 text-sm text-slate-500">{COPY.subtitle[lang] || COPY.subtitle.ar}</p></div>
      <div className="flex gap-2"><button onClick={() => setTab('upcoming')} className={`rounded-full px-4 py-2 text-sm font-bold ${tab === 'upcoming' ? 'bg-[#14b8a6] text-white' : 'bg-white border border-[#e4eeee] text-[#295d60]'}`}>{COPY.upcoming[lang] || COPY.upcoming.ar}</button><button onClick={() => setTab('past')} className={`rounded-full px-4 py-2 text-sm font-bold ${tab === 'past' ? 'bg-[#14b8a6] text-white' : 'bg-white border border-[#e4eeee] text-[#295d60]'}`}>{COPY.past[lang] || COPY.past.ar}</button></div>
      {error && <div className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">{error}</div>}
      {loading ? <div className="rounded-2xl bg-white p-6 text-center text-slate-500">...</div> : filtered.length === 0 ? <div className="rounded-2xl bg-white p-6 text-center text-slate-500">{COPY.noItems[lang] || COPY.noItems.ar}</div> : (
        <div className="space-y-4">
          {filtered.map((a) => {
            const date = getAppointmentDate(a);
            const status = normalizeStatus(a.status);
            const canCancel = tab === 'upcoming' && status !== 'cancelled' && status !== 'completed' && canPatientCancelAppointment(date);
            const doctorName = a.doctorName || a.doctor?.fullName || a.doctor?.name || a.doctorFullName || (isRtl ? 'الطبيب' : 'Doctor');
            const specialty = a.specialtyName || a.specialty || a.doctor?.specialtyName || '';
            return (
              <div key={a.id} className="rounded-2xl border border-[#e4eeee] bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-4">
                    <div className="h-16 w-16 overflow-hidden rounded-2xl bg-[#eaf4f4] flex items-center justify-center text-[#14b8a6]"><CalendarCheck size={28} /></div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold text-amber-600">{a.status || 'Pending'}</span>
                        {a.isReconsultation && <span className="rounded-full bg-purple-50 px-3 py-1 text-[10px] font-bold text-purple-600">Re-consultation</span>}
                      </div>
                      <h3 className="mt-2 text-lg font-black text-[#084036]">{doctorName}</h3>
                      {specialty && <p className="text-sm text-[#295d60]">{specialty}</p>}
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Clock size={14} />{date ? new Date(date).toLocaleString(isRtl ? 'ar-EG' : 'en-US') : '-'}</span>
                        {a.clinicName && <span className="flex items-center gap-1"><MapPin size={14} />{a.clinicName}</span>}
                      </div>
                      {status === 'cancelled' && a.notes && (
                        <div className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-600">
                          <strong>{isRtl ? 'سبب الإلغاء:' : 'Cancel Reason:'}</strong> {a.notes}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end"><div className="text-lg font-black text-[#14b8a6]">{a.fee || a.consultationFee || a.price ? `EGP ${a.fee || a.consultationFee || a.price}` : ''}</div>{canCancel ? <button onClick={() => cancelAppointment(a)} className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100"><XCircle size={15} />{COPY.cancel[lang] || COPY.cancel.ar}</button> : tab === 'upcoming' && <div className="max-w-xs text-xs font-semibold text-orange-600">{COPY.cancelTooLate[lang] || COPY.cancelTooLate.ar}</div>}{tab === 'past' && status === 'completed' && !a.hasReview && <button onClick={() => setReviewTarget(a)} className="inline-flex items-center gap-2 rounded-xl bg-[#14b8a6] px-3 py-2 text-xs font-bold text-white"><Star size={15} />{COPY.review[lang] || COPY.review.ar}</button>}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <AddReviewModal open={!!reviewTarget} onClose={() => setReviewTarget(null)} doctorId={reviewTarget?.doctorId} appointmentId={reviewTarget?.id} onSubmitted={loadAppointments} />
    </div>
  );
}
