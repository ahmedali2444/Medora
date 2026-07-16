import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CalendarCheck,
  ClipboardList,
  Droplet,
  MessagesSquare,
  Phone,
  RefreshCw,
  ScanSearch as Search,
  Sparkles,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import DoctorLayout from '../../components/doctor/layout/DoctorLayout';
import SectionCard from '../../components/doctor/shared/SectionCard';
import { formatDate } from '../../components/doctor/data/doctorData';
import { useLocalizedContent } from '../../hooks/useLocalizedContent';
import {
  formatLocalizedNumber,
  getLocalizedSearchText,
  localizedText,
} from '../../utils/localization';
import { fetchAllPaginated } from '../../utils/appointmentHelpers';
import { medoraApi } from '../../api/medoraApi';
import { mapAppointment, mapPatientFromAppointments, mapPrescription } from '../../utils/professionalApiMappers';

const COPY = {
  title: localizedText('المرضى', 'Patients'),
  subtitle: localizedText('إدارة ملفات المرضى ومتابعة حالاتهم', 'Manage patient records and track their conditions'),
  totalPatients: localizedText('إجمالي المرضى', 'Total patients'),
  active: localizedText('نشطون', 'Active'),
  newThisMonth: localizedText('جدد هذا الشهر', 'New this month'),
  cancelledCases: localizedText('إلغاءات', 'Cancelled'),
  listTitle: localizedText('قائمة المرضى', 'Patients list'),
  addPatient: localizedText('إضافة مريض', 'Add patient'),
  searchPlaceholder: localizedText('ابحث بالاسم، رقم الهاتف، أو التشخيص...', 'Search by name, phone, or diagnosis...'),
  all: localizedText('الكل', 'All'),
  yearSuffix: localizedText('سنة', 'yrs'),
  visitSuffix: localizedText('زيارة', 'visits'),
  lastVisit: localizedText('آخر زيارة', 'Last visit'),
  countSuffix: localizedText('مريض بالفلاتر الحالية', 'patients matching filters'),
  emptyTitle: localizedText('لا يوجد مرضى', 'No patients'),
  emptyDesc: localizedText('جرّب كلمات بحث أخرى أو غيّر الفلتر.', 'Try different search terms or change the filter.'),
  drawerVisits: localizedText('الزيارات', 'Visits'),
  drawerStatus: localizedText('الحالة', 'Status'),
  drawerLastVisit: localizedText('آخر زيارة', 'Last visit'),
  drawerTimeline: localizedText('السجل الطبي (Timeline)', 'Medical Timeline'),
  noHistory: localizedText('لا يوجد سجل طبي مسجّل.', 'No medical history recorded.'),
  bookAppointment: localizedText('حجز موعد جديد', 'Book new appointment'),
  message: localizedText('مراسلة', 'Message'),
  close: localizedText('إغلاق', 'Close'),
  visitLabel: localizedText('زيارة رقم', 'Visit #'),
  prescriptionLabel: localizedText('روشتة', 'Prescription'),
  repeatRx: localizedText('تكرار الروشتة', 'Repeat Prescription'),
  appointmentLabel: localizedText('موعد', 'Appointment'),
  followingMonths: localizedText('أشهر متابعة', 'months of follow-up'),
};

const STATUS_META = {
  active: { label: localizedText('نشط', 'Active'), color: '#0e7c6e', bg: '#e6f7f7' },
  new: { label: localizedText('جديد', 'New'), color: '#2465b6', bg: '#eef4ff' },
  cancelled: { label: localizedText('ملغاة', 'Cancelled'), color: '#b91c1c', bg: '#fdecec' },
};

const STATUS_TABS = ['all', 'active', 'new', 'cancelled'];

export default function DoctorPatients() {
  const { lang, text } = useLocalizedContent();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [detail, setDetail] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [ui, setUi] = useState({ loading: true, error: '' });
  const patients = useMemo(() => mapPatientFromAppointments(appointments), [appointments]);

  const [prescriptions, setPrescriptions] = useState([]);

  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (mounted) setUi({ loading: true, error: '' });
    });
    Promise.allSettled([
      fetchAllPaginated((page, pageSize) => medoraApi.appointments({ page, pageSize }), { pageSize: 500 }),
      medoraApi.doctorPrescriptions({ page: 1, pageSize: 100 }),
    ]).then(([appointmentsResult, prescriptionsResult]) => {
      if (!mounted) return;
      if (appointmentsResult.status === 'fulfilled') {
        const items = appointmentsResult.value.items.map(mapAppointment);
        setAppointments(items);
      } else {
        setAppointments([]);
        setUi({ loading: false, error: appointmentsResult.reason?.message || 'Unable to load patients' });
        return;
      }
      if (prescriptionsResult.status === 'fulfilled') {
        const rxData = prescriptionsResult.value;
        const rxItems = Array.isArray(rxData) ? rxData : Array.isArray(rxData?.items) ? rxData.items : [];
        setPrescriptions(rxItems.map(mapPrescription));
      }
      setUi({ loading: false, error: '' });
    });
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    let list = patients.slice();
    if (status !== 'all') list = list.filter((p) => p.status === status);
    if (query.trim()) {
      const lower = query.trim().toLowerCase();
      list = list.filter(
        (p) =>
          getLocalizedSearchText(p.name).includes(lower) ||
          p.phone.includes(query.trim()) ||
          getLocalizedSearchText(p.tag).includes(lower),
      );
    }
    return list;
  }, [patients, status, query]);

  const summary = useMemo(() => ({
    total: patients.length,
    active: patients.filter((p) => p.status === 'active').length,
    newOnes: patients.filter((p) => p.status === 'new').length,
    cancelledCount: patients.filter((p) => p.status === 'cancelled').length,
  }), [patients]);

  return (
    <DoctorLayout title={COPY.title} subtitle={COPY.subtitle}>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: text(COPY.totalPatients), value: summary.total, Icon: Users, tone: '#14b8a6' },
          { label: text(COPY.active), value: summary.active, Icon: Sparkles, tone: '#6366f1' },
          { label: text(COPY.newThisMonth), value: summary.newOnes, Icon: UserPlus, tone: '#f59e0b' },
          { label: text(COPY.cancelledCases), value: summary.cancelledCount, Icon: AlertCircle, tone: '#ef4444' },
        ].map((card) => {
          const CardIcon = card.Icon;
          return (
            <div key={card.label} className="flex items-center gap-3 rounded-2xl border border-[#e4eeee] bg-white p-4 shadow-[0_8px_22px_rgba(41,93,96,0.06)]">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: `${card.tone}1a`, color: card.tone }}
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
        icon={Users}
        action={null}
      >
        {ui.error && <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">{ui.error}</div>}
        {ui.loading && <div className="mb-4 rounded-xl bg-[#e6f7f7] px-4 py-3 text-xs font-semibold text-[#0e7c6e]">...</div>}
        <div className="mb-4 flex flex-col gap-3">
          <div className="relative">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={text(COPY.searchPlaceholder)}
              className="h-10 w-full rounded-full border border-[#e4eeee] bg-white pr-9 pl-4 text-[12px] outline-none transition focus:border-[#14b8a6]"
            />
            <Search size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#14b8a6]" />
          </div>

          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className="rounded-full border px-3 py-1.5 text-[11px] font-bold transition"
                style={
                  status === s
                    ? { background: '#14b8a6', borderColor: '#14b8a6', color: '#ffffff' }
                    : { background: '#ffffff', borderColor: '#e4eeee', color: '#486466' }
                }
              >
                {s === 'all' ? text(COPY.all) : text(STATUS_META[s]?.label || localizedText(s, s))}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => {
            const meta = STATUS_META[p.status] || { label: localizedText(p.status, p.status), color: '#64748b', bg: '#f1f5f9' };
            const patientName = text(p.name);
            const initials = patientName.trim().charAt(0);
            return (
              <button
                key={p.id}
                onClick={() => setDetail(p)}
                className="group flex flex-col rounded-2xl border border-[#e4eeee] bg-white p-4 text-start shadow-[0_8px_22px_rgba(41,93,96,0.04)] transition hover:-translate-y-0.5 hover:border-[#14b8a6] hover:shadow-[0_14px_30px_rgba(41,93,96,0.1)]"
              >
                <div className="mb-3 flex items-start justify-between">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-extrabold"
                    style={{ background: meta.bg, color: meta.color }}
                  >
                    {text(meta.label)}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="text-start">
                      <div className="text-[13px] font-extrabold text-[#084036]">{patientName}</div>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#14b8a6] to-[#0e7c6e] text-white">
                      <span className="text-[14px] font-black">{initials}</span>
                    </div>
                  </div>
                </div>

                <div className="mb-3 flex flex-wrap items-center justify-end gap-1.5">
                  <span className="rounded-full bg-[#eef4ff] px-2 py-0.5 text-[10px] font-bold text-[#2465b6]">
                    {text(p.tag)}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-dashed border-[#e4eeee] pt-3 text-[11px] text-slate-500">
                  <span>{formatLocalizedNumber(p.visits, lang)} {text(COPY.visitSuffix)}</span>
                  <span>{text(COPY.lastVisit)}: {formatDate(p.lastVisit, lang) || '-'}</span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#e4eeee] bg-white px-2.5 py-1 text-[10px] font-bold text-[#295d60] transition group-hover:border-[#14b8a6]">
                    <Phone size={10} />
                    {p.phone}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e6f7f7] text-[#14b8a6]">
              <Users size={18} />
            </div>
            <div className="text-[13px] font-bold text-[#084036]">{text(COPY.emptyTitle)}</div>
            <div className="text-[11px] text-slate-500">{text(COPY.emptyDesc)}</div>
          </div>
        )}
      </SectionCard>

      {detail && <PatientDrawer patient={detail} appointments={appointments} prescriptions={prescriptions} onClose={() => setDetail(null)} />}
    </DoctorLayout>
  );
}

function PatientDrawer({ patient, appointments, prescriptions, onClose }) {
  const navigate = useNavigate();
  const { isRtl, lang, text } = useLocalizedContent();
  const patientAppointments = appointments.filter((a) => a.patientId === patient.id);
  const patientPrescriptions = prescriptions.filter((rx) => rx.patientId === patient.id);
  const meta = STATUS_META[patient.status] || { label: localizedText(patient.status, patient.status), color: '#64748b', bg: '#f1f5f9' };
  const patientName = text(patient.name);
  const patientInitial = patientName.trim().charAt(0);

  // Calculate follow-up months
  const followMonths = useMemo(() => {
    if (patientAppointments.length < 2) return 0;
    const sorted = [...patientAppointments].sort((a, b) => a.date.localeCompare(b.date));
    const first = new Date(sorted[0].date + 'T00:00:00');
    const last = new Date(sorted[sorted.length - 1].date + 'T00:00:00');
    return Math.round((last - first) / (1000 * 60 * 60 * 24 * 30));
  }, [patientAppointments]);

  // Build merged timeline: group appointments + prescriptions by date
  const timeline = useMemo(() => {
    const map = new Map();
    const sortedAppts = [...patientAppointments].sort((a, b) => b.date.localeCompare(a.date));
    sortedAppts.forEach((a, idx) => {
      const key = a.date;
      if (!map.has(key)) map.set(key, { date: key, visitNumber: sortedAppts.length - idx, appointment: null, prescription: null });
      map.get(key).appointment = a;
    });
    patientPrescriptions.forEach((rx) => {
      const key = rx.date;
      if (!map.has(key)) map.set(key, { date: key, visitNumber: null, appointment: null, prescription: null });
      map.get(key).prescription = rx;
    });
    return [...map.values()].sort((a, b) => b.date.localeCompare(a.date));
  }, [patientAppointments, patientPrescriptions]);

  const handleRepeatRx = (rx) => {
    navigate(`/doctor/prescriptions?repeat=${rx.id}`);
    onClose();
  };

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{ fontFamily: 'Cairo, sans-serif' }}
      className="fixed inset-0 z-[100] flex items-stretch justify-start bg-slate-900/45 backdrop-blur-sm"
      onClick={onClose}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-lg flex-col overflow-hidden bg-white shadow-[20px_0_60px_rgba(8,64,54,0.25)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[#e4eeee] bg-gradient-to-l from-[#f1fbfa] to-white px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#14b8a6] to-[#0e7c6e] text-white">
              <span className="text-[16px] font-black">{patientInitial}</span>
            </div>
            <div>
              <div className="text-[15px] font-black text-[#084036]">{patientName}</div>
              <div className="mt-0.5 text-[11px] text-slate-500">{patient.phone || '-'}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#e4eeee] text-[#295d60] transition hover:border-[#14b8a6]"
            aria-label={text(COPY.close)}
          >
            <X size={15} />
          </button>
        </div>

        {/* KPIs row */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="mb-5 grid grid-cols-3 gap-3">
            <Tile
              label={text(COPY.drawerVisits)}
              value={formatLocalizedNumber(patient.visits, lang)}
              Icon={CalendarCheck}
            />
            <Tile label={text(COPY.drawerStatus)} value={text(meta.label)} color={meta.color} bg={meta.bg} />
            <Tile
              label={text(COPY.followingMonths)}
              value={formatLocalizedNumber(followMonths, lang)}
              Icon={ClipboardList}
            />
          </div>

          {/* Medical Timeline */}
          <div className="mb-4 flex items-center gap-2 text-[12px] font-extrabold text-[#084036]">
            <ClipboardList size={14} className="text-[#14b8a6]" />
            {text(COPY.drawerTimeline)}
          </div>

          {timeline.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#cfe4e2] bg-[#f7fbfb] p-6 text-center text-[11px] text-slate-500">
              {text(COPY.noHistory)}
            </div>
          ) : (
            <div className="relative">
              {/* vertical line */}
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#14b8a6] via-[#b4e8e2] to-transparent"
                style={{ [isRtl ? 'right' : 'left']: '18px' }}
              />
              <div className="flex flex-col gap-5">
                {timeline.map((entry) => (
                  <div key={entry.date} className="flex gap-4">
                    {/* dot + visit badge */}
                    <div className="relative flex flex-col items-center" style={{ minWidth: '38px' }}>
                      <div
                        className="z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-white shadow-md"
                        style={{ background: entry.appointment ? '#14b8a6' : '#6366f1' }}
                      >
                        {entry.appointment ? <CalendarCheck size={14} /> : <ClipboardList size={14} />}
                      </div>
                      {entry.visitNumber !== null && (
                        <span className="mt-1 rounded-full bg-[#e6f7f7] px-1.5 py-0.5 text-[9px] font-black text-[#0e7c6e]">
                          {text(COPY.visitLabel)}{formatLocalizedNumber(entry.visitNumber, lang)}
                        </span>
                      )}
                    </div>

                    {/* content card */}
                    <div className="flex-1 rounded-2xl border border-[#e4eeee] bg-white p-3 shadow-[0_2px_12px_rgba(41,93,96,0.05)]">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400" dir="ltr">
                          {formatDate(entry.date, lang)}
                        </span>
                        {entry.appointment && (
                          <span
                            className="rounded-full px-2 py-0.5 text-[9px] font-extrabold"
                            style={{ background: '#e6f7f7', color: '#0e7c6e' }}
                          >
                            {text(COPY.appointmentLabel)}
                          </span>
                        )}
                      </div>

                      {entry.appointment && (
                        <div className="mb-2">
                          <div className="text-[12px] font-bold text-[#084036]">{text(entry.appointment.reason)}</div>
                          <div className="text-[10px] text-slate-500">
                            {entry.appointment.time} · {text(entry.appointment.clinic)}
                          </div>
                        </div>
                      )}

                      {entry.prescription && (
                        <div
                          className="rounded-xl border border-[#e8eeff] p-2"
                          style={{ background: '#f5f8ff' }}
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-[10px] font-extrabold text-[#6366f1]">
                              🩺 {text(COPY.prescriptionLabel)} — {entry.prescription.id}
                            </span>
                            <button
                              onClick={() => handleRepeatRx(entry.prescription)}
                              className="inline-flex items-center gap-1 rounded-full border border-[#6366f1]/30 bg-white px-2 py-0.5 text-[9px] font-extrabold text-[#6366f1] transition hover:bg-[#6366f1] hover:text-white"
                            >
                              <RefreshCw size={9} />
                              {text(COPY.repeatRx)}
                            </button>
                          </div>
                          <div className="mb-1 text-[10px] text-slate-500">{text(entry.prescription.diagnosis)}</div>
                          <div className="flex flex-wrap gap-1">
                            {entry.prescription.items.map((item, i) => (
                              <span
                                key={i}
                                className="rounded-full bg-white px-2 py-0.5 text-[9px] font-bold text-[#2d6669] border border-[#e4eeee]"
                              >
                                {text(item.name)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button className="inline-flex items-center gap-2 rounded-full border border-[#e4eeee] bg-white px-4 py-2.5 text-[12px] font-bold text-[#295d60] transition hover:border-[#14b8a6]">
              <Phone size={13} />
              {patient.phone || '-'}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Tile({ label, value, Icon, color, bg }) {
  return (
    <div
      className="rounded-xl border border-[#e4eeee] bg-[#f7fbfb] p-3 text-center"
      style={bg ? { background: bg } : {}}
    >
      {Icon && (
        <div className="mb-1 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[#14b8a6]">
          <Icon size={12} />
        </div>
      )}
      <div className="text-[14px] font-black" style={{ color: color || '#084036' }}>
        {value}
      </div>
      <div className="mt-0.5 text-[10px] text-slate-500">{label}</div>
    </div>
  );
}
