import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileSignature,
  Filter,
  LayoutGrid,
  List,
  Phone,
  Plus,
  ScanSearch as Search,
  X,
  XCircle,
} from 'lucide-react';
import DoctorLayout from '../../components/doctor/layout/DoctorLayout';
import SectionCard from '../../components/doctor/shared/SectionCard';
import StatusPill from '../../components/doctor/shared/StatusPill';
import WeeklyCalendarView from '../../components/doctor/appointments/WeeklyCalendarView';
import {
  APPOINTMENT_STATUS,
  formatDate,
} from '../../components/doctor/data/doctorData';
import { medoraApi } from '../../api/medoraApi';
import { mapAppointment, mapPrescription, offsetDateKey } from '../../utils/professionalApiMappers';
import { getWeekDateRange, buildDoctorAppointmentQuery } from '../../utils/appointmentHelpers';
import { normalizeAppointmentStatus } from '../../utils/professionalApiMappers';
import { useLocalizedContent } from '../../hooks/useLocalizedContent';
import {
  formatLocalizedNumber,
  localizedText,
} from '../../utils/localization';

const COPY = {
  title: localizedText('المواعيد', 'Appointments'),
  subtitle: localizedText('إدارة الحجوزات اليومية والمستقبلية', 'Manage your daily and future bookings'),
  confirmed: localizedText('مؤكّدة', 'Confirmed'),
  underReview: localizedText('قيد المراجعة', 'Under review'),
  completed: localizedText('مكتملة', 'Completed'),
  cancelled: localizedText('ملغاة', 'Cancelled'),
  listTitle: localizedText('قائمة المواعيد', 'Appointments list'),
  addAppointment: localizedText('إضافة موعد', 'Add appointment'),
  today: localizedText('اليوم', 'Today'),
  tomorrow: localizedText('غدًا', 'Tomorrow'),
  past: localizedText('السابقة', 'Past'),
  all: localizedText('الكل', 'All'),
  searchPlaceholder: localizedText('ابحث باسم المريض، السبب، أو العيادة...', 'Search patient, reason or clinic...'),
  statusFilter: localizedText('الحالة:', 'Status:'),
  colTime: localizedText('الوقت', 'Time'),
  colPatient: localizedText('المريض', 'Patient'),
  colReason: localizedText('السبب', 'Reason'),
  colClinic: localizedText('العيادة', 'Clinic'),
  colStatus: localizedText('الحالة', 'Status'),
  yearSuffix: localizedText('سنة', 'yrs'),
  emptyTitle: localizedText('لا توجد مواعيد', 'No appointments'),
  emptyDesc: localizedText('غيّر الفلاتر أو اختر تبويبًا آخر.', 'Change filters or select another tab.'),
  countSuffix: localizedText('موعد بالفلاتر الحالية', 'appointments matching filters'),
  detailTitle: localizedText('تفاصيل الموعد', 'Appointment details'),
  close: localizedText('إغلاق', 'Close'),
  timeLabel: localizedText('الوقت', 'Time'),
  dateLabel: localizedText('التاريخ', 'Date'),
  ageLabel: localizedText('العمر', 'Age'),
  feeLabel: localizedText('قيمة الكشف', 'Consultation fee'),
  ageSuffix: localizedText('سنة', 'yrs'),
  feeSuffix: localizedText('ج.م', 'EGP'),
  visitReason: localizedText('سبب الزيارة', 'Visit reason'),
  clinicLabel: localizedText('العيادة', 'Clinic'),
  startExam: localizedText('بدء الكشف', 'Start exam'),
  prescriptionTitle: localizedText('إنشاء روشتة', 'Create prescription'),
  diagnosis: localizedText('التشخيص', 'Diagnosis'),
  notes: localizedText('ملاحظات', 'Notes'),
  medicineName: localizedText('اسم الدواء', 'Medicine name'),
  dosage: localizedText('الجرعة', 'Dosage'),
  instructions: localizedText('التعليمات', 'Instructions'),
  quantity: localizedText('الكمية', 'Quantity'),
  addMedicine: localizedText('إضافة دواء', 'Add medicine'),
  savePrescription: localizedText('حفظ الروشتة', 'Save prescription'),
  prescriptionRequired: localizedText('اكتب التشخيص ودواء واحد على الأقل.', 'Enter a diagnosis and at least one medicine.'),
  prescriptionSaved: localizedText('تم حفظ الروشتة وإنهاء الموعد.', 'Prescription saved and appointment completed.'),
  call: localizedText('اتصال', 'Call'),
  cancel: localizedText('إلغاء', 'Cancel'),
  confirmAppointment: localizedText('تأكيد الموعد', 'Confirm appointment'),
  viewPrescription: localizedText('عرض الروشتة', 'View prescription'),
  actionUnavailable: localizedText('إضافة المواعيد من لوحة الطبيب غير مربوطة حالياً.', 'Adding appointments from the doctor dashboard is not connected yet.'),
  callUnavailable: localizedText('رقم هاتف المريض غير متاح من API المواعيد الحالي.', 'Patient phone is not available from the current appointments API.'),
  cancelReason: localizedText('سبب الإلغاء', 'Cancellation reason'),
  confirmCancel: localizedText('تأكيد الإلغاء', 'Confirm cancellation'),
  back: localizedText('رجوع', 'Back'),
  cancelReasonRequired: localizedText('يرجى إدخال سبب للإلغاء.', 'Please enter a cancellation reason.'),
};

const STATUS_FILTERS = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];

export default function DoctorAppointments() {
  const navigate = useNavigate();
  const { lang, text } = useLocalizedContent();
  const [searchParams] = useSearchParams();
  const [dateKeys, setDateKeys] = useState(() => ({
    today: offsetDateKey(0),
    tomorrow: offsetDateKey(1),
  }));
  const [tab, setTab] = useState('today');
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [detail, setDetail] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [calendarAppointments, setCalendarAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [ui, setUi] = useState({ loading: true, error: '', notice: '' });
  const [actionState, setActionState] = useState({ id: null, action: '' });
  const [prescriptionFor, setPrescriptionFor] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
  const [page, setPage] = useState(1);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [statusCounts, setStatusCounts] = useState([]);
  const [calendarError, setCalendarError] = useState('');
  const APPOINTMENTS_PAGE_SIZE = 25;

  const loadCalendarWeek = useCallback(async () => {
    const { dateFrom, dateTo } = getWeekDateRange();
    try {
      const data = await medoraApi.appointments({ page: 1, pageSize: 500, dateFrom, dateTo, sort: 'asc' });
      const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      setCalendarAppointments(items.map(mapAppointment));
      setCalendarError('');
    } catch (error) {
      setCalendarAppointments([]);
      setCalendarError(error?.message || 'Unable to load calendar appointments');
    }
  }, []);

  const listParams = useMemo(
    () => buildDoctorAppointmentQuery({
      tab,
      dateKeys,
      status,
      search: debouncedQuery,
      page,
      pageSize: APPOINTMENTS_PAGE_SIZE,
    }),
    [tab, dateKeys, status, debouncedQuery, page],
  );

  const loadAppointments = useCallback(async () => {
    setUi({ loading: true, error: '', notice: '' });
    try {
      const [appointmentsResult, prescriptionsResult] = await Promise.allSettled([
        medoraApi.appointments(listParams),
        medoraApi.doctorPrescriptions({ page: 1, pageSize: 100 }),
      ]);

      if (!isMounted.current) return;

      if (appointmentsResult.status !== 'fulfilled') {
        throw appointmentsResult.reason;
      }

      const data = appointmentsResult.value;
      const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      setAppointments(items.map(mapAppointment));
      setTotalAppointments(Number.isFinite(Number(data?.total)) ? Number(data.total) : items.length);
      setStatusCounts(Array.isArray(data?.statusCounts) ? data.statusCounts : []);
      if (prescriptionsResult.status === 'fulfilled') {
        const rxData = prescriptionsResult.value;
        const rxItems = Array.isArray(rxData) ? rxData : Array.isArray(rxData?.items) ? rxData.items : [];
        setPrescriptions(rxItems.map(mapPrescription));
      } else {
        setPrescriptions([]);
      }
      setUi({ loading: false, error: '', notice: '' });
      await loadCalendarWeek();
    } catch (error) {
      if (!isMounted.current) return;
      setAppointments([]);
      setPrescriptions([]);
      setTotalAppointments(0);
      setStatusCounts([]);
      setUi({ loading: false, error: error.message || 'Unable to load appointments', notice: '' });
    }
  }, [listParams, loadCalendarWeek]);

  const totalPages = Math.max(Math.ceil(totalAppointments / APPOINTMENTS_PAGE_SIZE), 1);
  const searchQueryParam = searchParams.get('q') || '';

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    queueMicrotask(() => setPage(1));
  }, [tab, status, debouncedQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (viewMode === 'calendar') {
      loadCalendarWeek();
    }
  }, [viewMode, loadCalendarWeek]);

  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 1, 0);
    const timeout = window.setTimeout(() => {
      setDateKeys({
        today: offsetDateKey(0),
        tomorrow: offsetDateKey(1),
      });
    }, Math.max(1000, nextMidnight.getTime() - now.getTime()));

    return () => window.clearTimeout(timeout);
  }, [dateKeys.today]);

  useEffect(() => {
    queueMicrotask(() => loadAppointments());
  }, [loadAppointments]);

  useEffect(() => {
    const nextQuery = searchQueryParam;
    queueMicrotask(() => {
      setQuery(nextQuery);
      if (nextQuery) setTab('all');
    });
  }, [searchQueryParam]);

  const tabs = useMemo(() => [
    { id: 'today', label: COPY.today, date: dateKeys.today },
    { id: 'tomorrow', label: COPY.tomorrow, date: dateKeys.tomorrow },
    { id: 'past', label: COPY.past, past: true },
    { id: 'all', label: COPY.all },
  ], [dateKeys]);

  const prescriptionsByAppointmentId = useMemo(() => {
    const map = new Map();
    prescriptions.forEach((rx) => {
      if (rx.appointmentId) map.set(String(rx.appointmentId), rx);
    });
    return map;
  }, [prescriptions]);

  const handleAppointmentAction = async (action, appointment, notes) => {
    setActionState({ id: appointment.id, action });
    setUi((current) => ({ ...current, error: '', notice: '' }));
    try {
      if (action === 'confirm') {
        await medoraApi.confirmAppointment(appointment.id, {});
      } else if (action === 'cancel') {
        await medoraApi.cancelAppointment(appointment.id, { notes });
      }

      await loadAppointments();
      setDetail(null);
    } catch (error) {
      setUi({ loading: false, error: error.message || 'Unable to update appointment', notice: '' });
    } finally {
      setActionState({ id: null, action: '' });
    }
  };

  const filtered = appointments;

  const counts = useMemo(() => {
    const next = { confirmed: 0, pending: 0, completed: 0, cancelled: 0 };
    statusCounts.forEach((entry) => {
      const key = normalizeAppointmentStatus(entry?.status ?? entry?.Status);
      if (key in next) next[key] = Number(entry?.count ?? entry?.Count ?? 0);
    });
    return next;
  }, [statusCounts]);

  return (
    <DoctorLayout title={COPY.title} subtitle={COPY.subtitle}>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: text(COPY.confirmed), value: counts.confirmed, color: '#0e7c6e', bg: '#e6f7f7', Icon: CheckCircle2 },
          { label: text(COPY.underReview), value: counts.pending, color: '#a35a00', bg: '#fff4e6', Icon: Clock },
          { label: text(COPY.completed), value: counts.completed, color: '#1e56b5', bg: '#eef4ff', Icon: CalendarCheck },
          { label: text(COPY.cancelled), value: counts.cancelled, color: '#c2362f', bg: '#fdecec', Icon: XCircle },
        ].map((card) => {
          const CardIcon = card.Icon;
          return (
            <div
              key={card.label}
              className="flex items-center gap-3 rounded-2xl border border-[#e4eeee] bg-white p-4 shadow-[0_8px_22px_rgba(41,93,96,0.06)]"
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: card.bg, color: card.color }}
              >
                <CardIcon size={16} />
              </span>
              <div>
                <div className="text-[22px] font-black text-[#084036]">
                  {formatLocalizedNumber(card.value, lang)}
                </div>
                <div className="text-[11px] text-[#486466]">{card.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <SectionCard
        title={COPY.listTitle}
        description={`${formatLocalizedNumber(filtered.length, lang)} ${text(COPY.countSuffix)}`}
        icon={CalendarCheck}
        action={
          <div className="flex overflow-hidden rounded-full border border-[#e4eeee] bg-[#f7fbfb] p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-extrabold transition ${
                viewMode === 'list' ? 'bg-[#14b8a6] text-white shadow-sm' : 'text-[#486466]'
              }`}
            >
              <List size={12} /> {text({ ar: 'قائمة', en: 'List' })}
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-extrabold transition ${
                viewMode === 'calendar' ? 'bg-[#14b8a6] text-white shadow-sm' : 'text-[#486466]'
              }`}
            >
              <LayoutGrid size={12} /> {text({ ar: 'تقويم', en: 'Calendar' })}
            </button>
          </div>
        }
      >
        {ui.error && <div className="mb-3 rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">{ui.error}</div>}
        {ui.notice && <div className="mb-3 rounded-xl bg-[#e6f7f7] px-4 py-3 text-xs font-semibold text-[#0e7c6e]">{ui.notice}</div>}
        {ui.loading && <div className="mb-3 rounded-xl bg-[#e6f7f7] px-4 py-3 text-xs font-semibold text-[#0e7c6e]">...</div>}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex overflow-hidden rounded-full border border-[#e4eeee] bg-[#f7fbfb] p-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTab(t.id);
                    setPage(1);
                  }}
                  className={`rounded-full px-3.5 py-1.5 text-[11px] font-extrabold transition ${
                    tab === t.id ? 'bg-[#14b8a6] text-white' : 'text-[#486466] hover:bg-white'
                  }`}
                >
                  {text(t.label)}
                </button>
              ))}
            </div>

            <div className="relative min-w-[180px] flex-1">
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={text(COPY.searchPlaceholder)}
                className="h-10 w-full rounded-full border border-[#e4eeee] bg-white pr-9 pl-4 text-[12px] outline-none transition focus:border-[#14b8a6]"
              />
              <Search size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#14b8a6]" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#486466]">
              <Filter size={11} /> {text(COPY.statusFilter)}
            </span>
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
                className="rounded-full border px-3 py-1 text-[11px] font-bold transition"
                style={
                  status === s
                    ? { background: '#14b8a6', borderColor: '#14b8a6', color: '#ffffff' }
                    : { background: '#ffffff', borderColor: '#e4eeee', color: '#486466' }
                }
              >
                {s === 'all' ? text(COPY.all) : text(APPOINTMENT_STATUS[s]?.label)}
              </button>
            ))}
          </div>

          {viewMode === 'calendar' ? (
            <div className="mt-2">
              {calendarError && (
                <div className="mb-3 rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">{calendarError}</div>
              )}
              <WeeklyCalendarView
                appointments={calendarAppointments}
                onAppointmentClick={(appt) => setDetail(appt)}
              />
            </div>
          ) : (
          <div className="overflow-hidden rounded-2xl border border-[#e4eeee]">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-14 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e6f7f7] text-[#14b8a6]">
                  <CalendarCheck size={18} />
                </div>
                <div className="text-[13px] font-bold text-[#084036]">{text(COPY.emptyTitle)}</div>
                <div className="text-[11px] text-slate-500">{text(COPY.emptyDesc)}</div>
              </div>
            ) : (
              <>
                <div className="lg:hidden">
                  {filtered.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => setDetail(a)}
                        className="grid w-full grid-cols-1 items-center gap-2 border-b border-[#f1f7f7] bg-white px-4 py-3 text-start text-[12px] transition last:border-b-0 hover:bg-[#f7fbfb]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-400">{text(COPY.colTime)}</span>
                          <div className="text-center">
                            <div className="font-black text-[#119a8a]" dir="ltr">{a.time}</div>
                            <div className="text-[10px] text-slate-400">{formatDate(a.date, lang)}</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-400">{text(COPY.colPatient)}</span>
                          <div className="text-start">
                            <div className="font-extrabold text-[#084036]">{text(a.patient)}</div>
                            <div className="text-[10px] text-slate-500">
                              {a.age ? `${formatLocalizedNumber(a.age, lang)} ${text(COPY.yearSuffix)}` : '—'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-400">{text(COPY.colReason)}</span>
                          <div className="text-[11px] text-slate-600">{text(a.reason)}</div>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-400">{text(COPY.colClinic)}</span>
                          <div className="text-[11px] text-slate-500">{text(a.clinic)}</div>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-400">{text(COPY.colStatus)}</span>
                          <StatusPill status={a.status} />
                        </div>
                      </button>
                  ))}
                </div>

                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full min-w-[700px] table-fixed border-collapse">
                    <colgroup>
                      <col style={{ width: '16.67%' }} />
                      <col style={{ width: '22.22%' }} />
                      <col style={{ width: '27.78%' }} />
                      <col style={{ width: '16.67%' }} />
                      <col style={{ width: '16.67%' }} />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-[#e4eeee] bg-[#f7fbfb] text-[11px] font-bold text-[#486466]">
                        <th className="px-3 py-3 text-center">{text(COPY.colTime)}</th>
                        <th className="px-3 py-3 text-start">{text(COPY.colPatient)}</th>
                        <th className="px-3 py-3 text-start">{text(COPY.colReason)}</th>
                        <th className="px-3 py-3 text-start">{text(COPY.colClinic)}</th>
                        <th className="px-3 py-3 text-center">{text(COPY.colStatus)}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((a) => (
                          <tr
                            key={a.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setDetail(a)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                setDetail(a);
                              }
                            }}
                            className="cursor-pointer border-b border-[#f1f7f7] bg-white text-[12px] transition last:border-b-0 hover:bg-[#f7fbfb]"
                          >
                            <td className="px-3 py-3 text-center align-middle">
                              <div className="font-black text-[#119a8a]" dir="ltr">{a.time}</div>
                              <div className="text-[10px] text-slate-400">{formatDate(a.date, lang)}</div>
                            </td>
                            <td className="px-3 py-3 text-start align-middle">
                              <div className="font-extrabold text-[#084036]">{text(a.patient)}</div>
                              <div className="text-[10px] text-slate-500">
                                {a.age ? `${formatLocalizedNumber(a.age, lang)} ${text(COPY.yearSuffix)}` : '—'}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-start align-middle text-[11px] text-slate-600">
                              {text(a.reason)}
                            </td>
                            <td className="px-3 py-3 text-start align-middle text-[11px] text-slate-500">
                              {text(a.clinic)}
                            </td>
                            <td className="px-3 py-3 text-center align-middle">
                              <span className="inline-flex justify-center">
                                <StatusPill status={a.status} />
                              </span>
                            </td>
                          </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
          )}

          {viewMode === 'list' && totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3 border-t border-[#e4eeee] pt-4">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1 || ui.loading}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e4eeee] bg-white text-[#295d60] transition hover:border-[#14b8a6] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={text(localizedText('الصفحة السابقة', 'Previous page'))}
              >
                <ChevronDown size={14} style={{ transform: lang === 'ar' ? 'rotate(-90deg)' : 'rotate(90deg)' }} />
              </button>
              <span className="text-[12px] font-bold text-[#486466]">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages || ui.loading}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e4eeee] bg-white text-[#295d60] transition hover:border-[#14b8a6] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={text(localizedText('الصفحة التالية', 'Next page'))}
              >
                <ChevronDown size={14} style={{ transform: lang === 'ar' ? 'rotate(90deg)' : 'rotate(-90deg)' }} />
              </button>
            </div>
          )}
        </div>
      </SectionCard>

      {detail && (
        <AppointmentDetailSheet
          appointment={detail}
          prescription={prescriptionsByAppointmentId.get(String(detail.id))}
          onAction={handleAppointmentAction}
          onStartExam={(appointment) => {
            const rx = prescriptionsByAppointmentId.get(String(appointment.id));
            if (rx) {
              navigate(`/doctor/prescriptions?appointmentId=${encodeURIComponent(appointment.id)}`);
              return;
            }
            setPrescriptionFor(appointment);
          }}
          actionState={actionState}
          onClose={() => setDetail(null)}
        />
      )}
      {prescriptionFor && (
        <PrescriptionModal
          appointment={prescriptionFor}
          onClose={() => setPrescriptionFor(null)}
          onSaved={async () => {
            setPrescriptionFor(null);
            await loadAppointments();
            setUi((current) => ({ ...current, loading: false, error: '', notice: text(COPY.prescriptionSaved) }));
          }}
        />
      )}
    </DoctorLayout>
  );
}

function AppointmentDetailSheet({ appointment, prescription, onAction, onStartExam, actionState, onClose }) {
  const { isRtl, lang, text } = useLocalizedContent();
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  const busy = actionState?.id === appointment.id;
  const canConfirm = appointment.status === 'pending';
  const canCancel = appointment.status === 'pending' || appointment.status === 'confirmed';
  const canStartExam = appointment.status === 'confirmed' || appointment.status === 'completed';

  if (isCanceling) {
    return (
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        style={{ fontFamily: 'Cairo, sans-serif' }}
        className="medora-modal-overlay medora-modal-overlay--elevated"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="medora-modal-panel medora-modal-panel--sm animate-fadeInUp"
          role="dialog"
          aria-modal="true"
        >
          <div className="medora-modal-header flex items-center justify-between gap-3">
            <div className="text-[16px] font-black text-[#084036]">{text(COPY.cancelReason)}</div>
            <button
              onClick={() => setIsCanceling(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#e4eeee] text-[#295d60] transition hover:border-[#14b8a6]"
            >
              <X size={15} />
            </button>
          </div>
          <div className="medora-modal-body">
            {cancelError && <div className="mb-3 rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">{cancelError}</div>}
            <textarea
              value={cancelReason}
              onChange={(e) => {
                setCancelReason(e.target.value);
                setCancelError('');
              }}
              placeholder={text(COPY.cancelReason)}
              rows={4}
              className="w-full resize-none rounded-xl border border-[#e4eeee] bg-white px-3 py-2 text-[13px] outline-none transition focus:border-[#14b8a6]"
            />
          </div>
          <div className="medora-modal-footer flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCanceling(false)}
              className="rounded-full border border-[#e4eeee] bg-white px-4 py-2.5 text-[12px] font-bold text-[#295d60] transition hover:border-[#14b8a6]"
            >
              {text(COPY.back)}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (!cancelReason.trim()) {
                  setCancelError(text(COPY.cancelReasonRequired));
                  return;
                }
                onAction('cancel', appointment, cancelReason.trim());
              }}
              className="inline-flex items-center gap-2 rounded-full bg-[#d14f4f] px-4 py-2.5 text-[12px] font-extrabold text-white transition hover:bg-[#b04040] disabled:opacity-60"
            >
              <XCircle size={14} />
              {busy ? '...' : text(COPY.confirmCancel)}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{ fontFamily: 'Cairo, sans-serif' }}
      className="medora-modal-overlay medora-modal-overlay--elevated"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="medora-modal-panel medora-modal-panel--md animate-fadeInUp"
        role="dialog"
        aria-modal="true"
      >
        <div className="medora-modal-header flex items-center justify-between gap-3">
          <div>
            <div className="text-[12px] text-slate-500">{text(COPY.detailTitle)}</div>
            <div className="text-[16px] font-black text-[#084036]">{text(appointment.patient)}</div>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#e4eeee] text-[#295d60] transition hover:border-[#14b8a6]"
            aria-label={text(COPY.close)}
          >
            <X size={15} />
          </button>
        </div>

        <div className="medora-modal-body">
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoCell label={text(COPY.timeLabel)} value={appointment.time} dir="ltr" />
            <InfoCell label={text(COPY.dateLabel)} value={formatDate(appointment.date, lang)} dir="ltr" />
            <InfoCell
              label={text(COPY.ageLabel)}
              value={appointment.age ? `${formatLocalizedNumber(appointment.age, lang)} ${text(COPY.ageSuffix)}` : '—'}
            />
            <InfoCell
              label={text(COPY.feeLabel)}
              value={appointment.price ? `${formatLocalizedNumber(appointment.price, lang)} ${text(COPY.feeSuffix)}` : '—'}
            />
          </div>

          <div className="mb-4 rounded-2xl border border-[#e4eeee] bg-[#f7fbfb] p-4">
            <div className="mb-2">
              <StatusPill status={appointment.status} size="lg" />
            </div>
            <div className="mb-1 text-[11px] font-bold text-[#486466]">{text(COPY.visitReason)}</div>
            <p className="text-[12px] leading-7 text-[#084036]">{text(appointment.reason)}</p>
            
            {appointment.status === 'cancelled' && appointment.notes && (
              <div className="mt-3 border-t border-[#e4eeee] pt-3">
                <div className="mb-1 text-[11px] font-bold text-[#d14f4f]">{text(COPY.cancelReason)}</div>
                <p className="text-[12px] leading-7 text-[#084036]">{appointment.notes}</p>
              </div>
            )}

            <div className="mt-3 text-[11px] text-slate-500">{text(COPY.clinicLabel)}: {text(appointment.clinic)}</div>
          </div>

        </div>

          <div className="medora-modal-footer flex flex-wrap items-center gap-2">
            {canStartExam && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onStartExam(appointment)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#295d60] px-4 py-2.5 text-[12px] font-extrabold text-white transition hover:bg-[#084036] disabled:opacity-60"
              >
                <FileSignature size={14} />
                {prescription ? text(COPY.viewPrescription) : text(COPY.startExam)}
              </button>
            )}
            {canConfirm && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onAction('confirm', appointment)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#14b8a6] px-4 py-2.5 text-[12px] font-extrabold text-white transition hover:bg-[#119a8a] disabled:opacity-60"
              >
                <CheckCircle2 size={14} />
                {busy && actionState.action === 'confirm' ? '...' : text(COPY.confirmAppointment)}
              </button>
            )}
            {appointment.patientPhone ? (
              <a
                href={`tel:${appointment.patientPhone}`}
                className="inline-flex items-center gap-2 rounded-full border border-[#e4eeee] bg-white px-4 py-2.5 text-[12px] font-bold text-[#295d60] transition hover:border-[#14b8a6]"
              >
                <Phone size={13} />
                {text(COPY.call)}
              </a>
            ) : (
              <button
                type="button"
                disabled
                title={text(COPY.callUnavailable)}
                className="inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-[#e4eeee] bg-white px-4 py-2.5 text-[12px] font-bold text-[#295d60] opacity-60"
              >
                <Phone size={13} />
                {text(COPY.call)}
              </button>
            )}
            {canCancel && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setIsCanceling(true)}
                className="inline-flex items-center gap-2 rounded-full border border-[#fdd] bg-[#fff5f5] px-4 py-2.5 text-[12px] font-bold text-[#d14f4f] transition hover:bg-[#ffeded] disabled:opacity-60"
              >
                <XCircle size={13} />
                {busy && actionState.action === 'cancel' ? '...' : text(COPY.cancel)}
              </button>
            )}
          </div>
        </div>
      </div>
  );
}

function PrescriptionModal({ appointment, onClose, onSaved }) {
  const { isRtl, text } = useLocalizedContent();
  const [form, setForm] = useState({
    diagnosis: '',
    notes: '',
    items: [{ medicineName: '', dosage: '', instructions: '', quantity: 1 }],
  });
  const [ui, setUi] = useState({ loading: false, error: '' });

  const updateItem = (index, key, value) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
  };

  const addItem = () => {
    setForm((current) => ({
      ...current,
      items: [...current.items, { medicineName: '', dosage: '', instructions: '', quantity: 1 }],
    }));
  };

  const removeItem = (index) => {
    setForm((current) => ({
      ...current,
      items: current.items.length === 1
        ? current.items
        : current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const items = form.items
      .map((item) => ({
        medicineName: item.medicineName.trim(),
        dosage: item.dosage.trim(),
        instructions: item.instructions.trim(),
        quantity: Math.max(1, Number(item.quantity) || 1),
      }))
      .filter((item) => item.medicineName);

    if (!form.diagnosis.trim() || items.length === 0) {
      setUi({ loading: false, error: text(COPY.prescriptionRequired) });
      return;
    }

    setUi({ loading: true, error: '' });
    try {
      await medoraApi.createPrescriptionForAppointment(appointment.id, {
        diagnosis: form.diagnosis.trim(),
        notes: form.notes.trim() || null,
        items,
      });

      await onSaved();
    } catch (error) {
      setUi({ loading: false, error: error.message || 'Unable to save prescription' });
    }
  };

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{ fontFamily: 'Cairo, sans-serif' }}
      className="medora-modal-overlay medora-modal-overlay--sheet"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="medora-modal-panel medora-modal-panel--lg"
        role="dialog"
        aria-modal="true"
      >
        <div className="medora-modal-header flex items-center justify-between gap-3">
          <div>
            <div className="text-[12px] text-slate-500">{text(COPY.prescriptionTitle)}</div>
            <div className="text-[16px] font-black text-[#084036]">{text(appointment.patient)}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#e4eeee] text-[#295d60] transition hover:border-[#14b8a6]"
            aria-label={text(COPY.close)}
          >
            <X size={15} />
          </button>
        </div>

        <div className="medora-modal-body space-y-4">
          {ui.error && <div className="rounded-xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{ui.error}</div>}
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-[#486466]">{text(COPY.diagnosis)}</span>
            <input
              value={form.diagnosis}
              onChange={(event) => setForm((current) => ({ ...current, diagnosis: event.target.value }))}
              className="h-11 w-full rounded-xl border border-[#e4eeee] bg-white px-3 text-[13px] outline-none transition focus:border-[#14b8a6]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-[#486466]">{text(COPY.notes)}</span>
            <textarea
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              rows={3}
              className="w-full resize-none rounded-xl border border-[#e4eeee] bg-white px-3 py-2 text-[13px] outline-none transition focus:border-[#14b8a6]"
            />
          </label>

          <div className="space-y-3">
            {form.items.map((item, index) => (
              <div key={index} className="rounded-2xl border border-[#e4eeee] bg-[#f7fbfb] p-3">
                <div className="grid gap-2 sm:grid-cols-[1.4fr_0.9fr_1.3fr_0.55fr_auto]">
                  <input
                    value={item.medicineName}
                    onChange={(event) => updateItem(index, 'medicineName', event.target.value)}
                    placeholder={text(COPY.medicineName)}
                    className="h-10 rounded-xl border border-[#e4eeee] bg-white px-3 text-[12px] outline-none transition focus:border-[#14b8a6]"
                  />
                  <input
                    value={item.dosage}
                    onChange={(event) => updateItem(index, 'dosage', event.target.value)}
                    placeholder={text(COPY.dosage)}
                    className="h-10 rounded-xl border border-[#e4eeee] bg-white px-3 text-[12px] outline-none transition focus:border-[#14b8a6]"
                  />
                  <input
                    value={item.instructions}
                    onChange={(event) => updateItem(index, 'instructions', event.target.value)}
                    placeholder={text(COPY.instructions)}
                    className="h-10 rounded-xl border border-[#e4eeee] bg-white px-3 text-[12px] outline-none transition focus:border-[#14b8a6]"
                  />
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                    aria-label={text(COPY.quantity)}
                    className="h-10 rounded-xl border border-[#e4eeee] bg-white px-3 text-[12px] outline-none transition focus:border-[#14b8a6]"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={form.items.length === 1}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-[#fdd] bg-white px-3 text-[#d14f4f] transition hover:bg-[#fff5f5] disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={text(COPY.cancel)}
                  >
                    <XCircle size={13} />
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-2 rounded-full border border-[#14b8a6] bg-white px-4 py-2 text-[12px] font-bold text-[#0e7c6e] transition hover:bg-[#e6f7f7]"
            >
              <Plus size={13} />
              {text(COPY.addMedicine)}
            </button>
          </div>
        </div>

        <div className="medora-modal-footer flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#e4eeee] bg-white px-4 py-2.5 text-[12px] font-bold text-[#295d60] transition hover:border-[#14b8a6]"
          >
            {text(COPY.close)}
          </button>
          <button
            type="submit"
            disabled={ui.loading}
            className="inline-flex items-center gap-2 rounded-full bg-[#14b8a6] px-4 py-2.5 text-[12px] font-extrabold text-white transition hover:bg-[#119a8a] disabled:opacity-60"
          >
            <FileSignature size={14} />
            {ui.loading ? '...' : text(COPY.savePrescription)}
          </button>
        </div>
      </form>
    </div>
  );
}

function InfoCell({ label, value, dir }) {
  return (
    <div className="rounded-xl border border-[#e4eeee] bg-white p-3">
      <div className="text-[10px] text-slate-400">{label}</div>
      <div className="mt-1 text-[13px] font-extrabold text-[#084036]" dir={dir}>
        {value}
      </div>
    </div>
  );
}
