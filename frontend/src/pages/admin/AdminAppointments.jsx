import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarCheck, CheckCircle2, Clock, Download, ExternalLink, Eye, ScanSearch as Search, Stethoscope, Users, XCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/layout/AdminLayout';
import SectionCard from '../../components/admin/shared/SectionCard';
import StatusPill from '../../components/admin/shared/StatusPill';
import DataTable from '../../components/admin/shared/DataTable';
import AdminModal from '../../components/admin/shared/AdminModal';
import AdminActionDialog from '../../components/admin/shared/AdminActionDialog';
import LinkedFilterPills from '../../components/admin/shared/LinkedFilterPills';
import { LINKED_FILTER_KEYS, readLinkedFilters } from '../../components/admin/shared/linkedFilterUtils';
import { APPOINTMENT_STATUS_META, formatDate } from '../../components/admin/data/adminData';
import { useLocalizedContent } from '../../hooks/useLocalizedContent';
import { formatLocalizedNumber, localizedText } from '../../utils/localization';
import { triggerBrowserDownload } from '../../utils/download';
import { medoraApi } from '../../api/medoraApi';

const PAGE_SIZE = 20;
const STATUS_TABS = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];

const COPY = {
  title: localizedText('المواعيد', 'Appointments'),
  subtitle: localizedText('إدارة كل المواعيد وتحديث حالتها من مكان واحد', 'Manage all appointments and update their status from one place'),
  total: localizedText('إجمالي المواعيد', 'Total appointments'),
  confirmed: localizedText('مؤكّدة', 'Confirmed'),
  pending: localizedText('قيد المراجعة', 'Under review'),
  completed: localizedText('مكتملة', 'Completed'),
  allAppointments: localizedText('كل المواعيد', 'All appointments'),
  appointmentsSuffix: localizedText('موعد', 'appointments'),
  searchPlaceholder: localizedText('ابحث بالمريض، الطبيب، أو العيادة...', 'Search by patient, doctor, or clinic...'),
  all: localizedText('الكل', 'All'),
  scheduleCol: localizedText('الموعد', 'Schedule'),
  patientCol: localizedText('المريض', 'Patient'),
  doctorCol: localizedText('الطبيب', 'Doctor'),
  clinicCol: localizedText('العيادة', 'Clinic'),
  contactCol: localizedText('التواصل', 'Contact'),
  statusCol: localizedText('الحالة', 'Status'),
  actionsCol: localizedText('إجراءات', 'Actions'),
  confirm: localizedText('تأكيد', 'Confirm'),
  cancel: localizedText('إلغاء', 'Cancel'),
  complete: localizedText('إنهاء', 'Complete'),
  view: localizedText('عرض التفاصيل', 'View details'),
  export: localizedText('تصدير', 'Export'),
  empty: localizedText('لا توجد مواعيد بهذا الفلتر.', 'No appointments match this filter.'),
  details: localizedText('تفاصيل الموعد', 'Appointment details'),
  contactName: localizedText('اسم التواصل', 'Contact name'),
  contactPhone: localizedText('رقم التواصل', 'Contact phone'),
  patientEmail: localizedText('بريد المريض', 'Patient email'),
  doctorPhone: localizedText('هاتف الطبيب', 'Doctor phone'),
  reason: localizedText('سبب الزيارة', 'Visit reason'),
  notes: localizedText('ملاحظات', 'Notes'),
  createdAt: localizedText('تاريخ الإنشاء', 'Created at'),
  confirmTitle: localizedText('تأكيد الموعد؟', 'Confirm appointment?'),
  cancelTitle: localizedText('إلغاء الموعد؟', 'Cancel appointment?'),
  completeTitle: localizedText('إنهاء الموعد؟', 'Complete appointment?'),
  actionDesc: localizedText('يمكنك إضافة ملاحظة إدارية ستُحفظ مع الإجراء.', 'You can add an admin note that will be saved with this action.'),
};

const statusKey = (value) => `${value || 'pending'}`.toLowerCase();

const mapAppointment = (appointment) => ({
  id: appointment.id,
  patientUserId: appointment.patientUserId || '',
  doctorId: appointment.doctorId || '',
  clinicId: appointment.clinicId || '',
  patient: localizedText(appointment.patientName || appointment.contactName || '-', appointment.patientName || appointment.contactName || '-'),
  patientEmail: appointment.patientEmail || '',
  contactName: appointment.contactName || appointment.patientName || '-',
  contactPhone: appointment.contactPhone || '',
  doctor: localizedText(appointment.doctorName || '-', appointment.doctorName || '-'),
  doctorPhone: appointment.doctorPhone || '',
  clinic: localizedText(appointment.clinicName || '-', appointment.clinicName || '-'),
  date: appointment.scheduledAt,
  status: statusKey(appointment.status),
  reason: appointment.reason || '-',
  notes: appointment.notes || '-',
  createdAt: appointment.createdAt,
});

export default function AdminAppointments() {
  const { lang, text } = useLocalizedContent();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [appointments, setAppointments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState(null);
  const [ui, setUi] = useState({ loading: true, actionLoading: false, error: '', notice: '' });
  const linkedFilters = readLinkedFilters(searchParams);
  const userId = searchParams.get('userId') || '';
  const doctorId = searchParams.get('doctorId') || '';
  const clinicId = searchParams.get('clinicId') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';
  const sortBy = searchParams.get('sortBy') || '';
  const sortDir = searchParams.get('sortDir') || '';

  const setError = (message) => setUi((current) => ({ ...current, loading: false, actionLoading: false, error: message }));
  const setNotice = useCallback((message) => {
    setUi((current) => ({ ...current, notice: message }));
    window.clearTimeout(setNotice.timer);
    setNotice.timer = window.setTimeout(() => setUi((current) => ({ ...current, notice: '' })), 2400);
  }, []);

  const loadAppointments = useCallback(async () => {
    setUi((current) => ({ ...current, loading: true, error: '' }));
    try {
      const data = await medoraApi.adminAppointments({
        page,
        pageSize: PAGE_SIZE,
        search: query,
        status: status === 'all' ? '' : status,
        userId,
        doctorId,
        clinicId,
        dateFrom,
        dateTo,
        sortBy,
        sortDir,
      });
      const mapped = Array.isArray(data?.items) ? data.items.map(mapAppointment) : [];
      setAppointments(mapped);
      setTotal(Number(data?.total || mapped.length));
      setUi((current) => ({ ...current, loading: false, error: '' }));
    } catch (error) {
      setAppointments([]);
      setTotal(0);
      setError(error.message || 'Unable to load appointments');
    }
  }, [clinicId, dateFrom, dateTo, doctorId, page, query, sortBy, sortDir, status, userId]);

  const clearLinkedFilters = () => {
    const next = new URLSearchParams(searchParams);
    LINKED_FILTER_KEYS.forEach((key) => next.delete(key));
    setPage(1);
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    queueMicrotask(() => loadAppointments());
    return () => {
      if (setNotice.timer) window.clearTimeout(setNotice.timer);
    };
  }, [loadAppointments, setNotice]);

  const openDetails = async (appointment) => {
    setSelected(appointment);
    try {
      const details = await medoraApi.adminAppointment(appointment.id);
      setSelected(mapAppointment(details));
    } catch (error) {
      setError(error.message || 'Unable to load appointment details');
    }
  };

  const navigateWithParams = (path, nextParams) => {
    const search = new URLSearchParams();
    Object.entries(nextParams || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') search.set(key, value);
    });
    navigate(`${path}?${search.toString()}`);
    setSelected(null);
  };

  const runAction = async (notes) => {
    if (!action) return;
    setUi((current) => ({ ...current, actionLoading: true, error: '' }));
    try {
      const payload = notes ? { notes } : {};
      if (action.type === 'confirm') await medoraApi.adminConfirmAppointment(action.appointment.id, payload);
      if (action.type === 'cancel') await medoraApi.adminCancelAppointment(action.appointment.id, payload);
      if (action.type === 'complete') await medoraApi.adminCompleteAppointment(action.appointment.id, payload);
      setAction(null);
      setNotice(text(action.type === 'confirm' ? localizedText('تم تأكيد الموعد', 'Appointment confirmed') : action.type === 'complete' ? localizedText('تم إنهاء الموعد', 'Appointment completed') : localizedText('تم إلغاء الموعد', 'Appointment cancelled')));
      await loadAppointments();
    } catch (error) {
      setError(error.message || 'Unable to update appointment');
    } finally {
      setUi((current) => ({ ...current, actionLoading: false }));
    }
  };

  const exportAppointments = async () => {
    try {
      triggerBrowserDownload(await medoraApi.adminExportAppointments());
      setNotice(text(localizedText('تم تنزيل ملف المواعيد', 'Appointments export downloaded')));
    } catch (error) {
      setError(error.message || 'Unable to export appointments');
    }
  };

  const stats = useMemo(() => ({
    confirmed: appointments.filter((appointment) => appointment.status === 'confirmed').length,
    pending: appointments.filter((appointment) => appointment.status === 'pending').length,
    completed: appointments.filter((appointment) => appointment.status === 'completed').length,
  }), [appointments]);

  const columns = [
    {
      key: 'date',
      label: COPY.scheduleCol,
      width: '1fr',
      align: 'center',
      render: (row) => (
        <div>
          <div className="text-[12px] font-black text-[#119a8a]" dir="ltr">
            {new Date(row.date).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-[10px] text-slate-400">{formatDate(row.date, lang)}</div>
        </div>
      ),
    },
    {
      key: 'patient',
      label: COPY.patientCol,
      width: '1fr',
      render: (row) => <span className="text-[12px] font-extrabold text-[#084036]">{text(row.patient)}</span>,
    },
    {
      key: 'doctor',
      label: COPY.doctorCol,
      width: '1fr',
      render: (row) => <span className="text-[12px] text-slate-600">{text(row.doctor)}</span>,
    },
    {
      key: 'clinic',
      label: COPY.clinicCol,
      width: '1fr',
      render: (row) => <span className="text-[11px] text-slate-500">{text(row.clinic)}</span>,
    },
    {
      key: 'status',
      label: COPY.statusCol,
      width: '0.9fr',
      align: 'center',
      render: (row) => <StatusPill meta={APPOINTMENT_STATUS_META[row.status]} />,
    },
    {
      key: 'actions',
      label: COPY.actionsCol,
      width: '1fr',
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <IconButton title={COPY.view} onClick={() => openDetails(row)} tone="#2465b6" Icon={Eye} />
          {row.status === 'pending' && <IconButton title={COPY.confirm} onClick={() => setAction({ type: 'confirm', appointment: row })} tone="#0e7c6e" Icon={CheckCircle2} />}
          {row.status === 'confirmed' && <IconButton title={COPY.complete} onClick={() => setAction({ type: 'complete', appointment: row })} tone="#2465b6" Icon={Stethoscope} />}
          {(row.status === 'confirmed' || row.status === 'pending') && <IconButton title={COPY.cancel} onClick={() => setAction({ type: 'cancel', appointment: row })} tone="#c2362f" Icon={XCircle} />}
        </div>
      ),
    },
  ];

  const actionCopy = action?.type === 'confirm'
    ? { title: COPY.confirmTitle, label: COPY.confirm, tone: 'success' }
    : action?.type === 'complete'
      ? { title: COPY.completeTitle, label: COPY.complete, tone: 'success' }
      : { title: COPY.cancelTitle, label: COPY.cancel, tone: 'danger' };

  return (
    <AdminLayout title={COPY.title} subtitle={COPY.subtitle}>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatBox label={COPY.total} value={total} tone="#14b8a6" Icon={CalendarCheck} />
        <StatBox label={COPY.confirmed} value={stats.confirmed} tone="#0e7c6e" Icon={CheckCircle2} />
        <StatBox label={COPY.pending} value={stats.pending} tone="#a35a00" Icon={Clock} />
        <StatBox label={COPY.completed} value={stats.completed} tone="#6366f1" Icon={Stethoscope} />
      </div>

      <SectionCard
        title={COPY.allAppointments}
        description={`${formatLocalizedNumber(total, lang)} ${text(COPY.appointmentsSuffix)}`}
        icon={CalendarCheck}
        action={
          <button
            type="button"
            onClick={exportAppointments}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#d7ece8] bg-white px-4 py-2 text-[12px] font-bold text-[#119a8a] transition hover:border-[#14b8a6]"
          >
            <Download size={13} />
            {text(COPY.export)}
          </button>
        }
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setPage(1);
                setQuery(event.target.value);
              }}
              placeholder={text(COPY.searchPlaceholder)}
              className="h-10 w-full rounded-full border border-[#e4eeee] bg-white pr-9 pl-4 text-[12px] outline-none transition focus:border-[#14b8a6]"
            />
            <Search size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#14b8a6]" />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setPage(1);
                  setStatus(tab);
                }}
                className="rounded-full border px-3 py-1.5 text-[11px] font-bold transition"
                style={status === tab ? { background: '#14b8a6', borderColor: '#14b8a6', color: '#ffffff' } : { background: '#ffffff', borderColor: '#e4eeee', color: '#486466' }}
              >
                {tab === 'all' ? text(COPY.all) : text(APPOINTMENT_STATUS_META[tab]?.label)}
              </button>
            ))}
          </div>
        </div>

        <LinkedFilterPills filters={linkedFilters} onClear={clearLinkedFilters} />

        <DataTable
          columns={columns}
          rows={appointments}
          empty={text(COPY.empty)}
          loading={ui.loading}
          error={ui.error}
          pagination={{ page, totalPages: Math.max(Math.ceil(total / PAGE_SIZE), 1), onPageChange: setPage }}
        />
        {ui.notice && <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">{ui.notice}</div>}
      </SectionCard>

      <AdminModal
        open={!!selected}
        title={COPY.details}
        description={selected ? `#${selected.id}` : ''}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {selected.patientUserId && (
                <QuickLinkButton label={localizedText('حساب المريض', 'Patient account')} Icon={Users} onClick={() => navigateWithParams('/admin/users', { userId: selected.patientUserId })} />
              )}
              {selected.doctorId && (
                <QuickLinkButton label={localizedText('ملف الطبيب', 'Doctor profile')} Icon={Stethoscope} onClick={() => navigateWithParams('/admin/doctors', { doctorId: selected.doctorId })} />
              )}
              {selected.patientUserId && (
                <QuickLinkButton label={localizedText('مواعيد المريض', 'Patient appointments')} Icon={CalendarCheck} onClick={() => navigateWithParams('/admin/appointments', { userId: selected.patientUserId })} />
              )}
              {selected.doctorId && (
                <QuickLinkButton label={localizedText('مواعيد الطبيب', 'Doctor appointments')} Icon={CalendarCheck} onClick={() => navigateWithParams('/admin/appointments', { doctorId: selected.doctorId })} />
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <DetailCard label={COPY.patientCol} value={text(selected.patient)} />
              <DetailCard label={COPY.patientEmail} value={selected.patientEmail || '-'} />
              <DetailCard label={COPY.contactName} value={selected.contactName || '-'} />
              <DetailCard label={COPY.contactPhone} value={selected.contactPhone || '-'} />
              <DetailCard label={COPY.doctorCol} value={text(selected.doctor)} />
              <DetailCard label={COPY.doctorPhone} value={selected.doctorPhone || '-'} />
              <DetailCard label={COPY.clinicCol} value={text(selected.clinic)} />
              <DetailCard label={COPY.statusCol} value={text(APPOINTMENT_STATUS_META[selected.status]?.label)} />
              <DetailCard label={COPY.reason} value={selected.reason || '-'} />
              <DetailCard label={COPY.notes} value={selected.notes || '-'} />
              <DetailCard label={COPY.scheduleCol} value={`${formatDate(selected.date, lang)} ${new Date(selected.date).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}`} />
              <DetailCard label={COPY.createdAt} value={formatDate(selected.createdAt, lang)} />
            </div>
          </div>
        )}
      </AdminModal>

      <AdminActionDialog
        open={!!action}
        title={actionCopy.title}
        description={COPY.actionDesc}
        confirmLabel={actionCopy.label}
        tone={actionCopy.tone}
        requiresReason
        loading={ui.actionLoading}
        onClose={() => setAction(null)}
        onConfirm={runAction}
      />
    </AdminLayout>
  );
}

function IconButton({ title, onClick, tone, Icon: IconComponent }) {
  const { text } = useLocalizedContent();

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#e4eeee] bg-white transition hover:border-[#14b8a6]"
      style={{ color: tone }}
      title={text(title)}
    >
      {React.createElement(IconComponent, { size: 11 })}
    </button>
  );
}

function QuickLinkButton({ label, Icon: IconComponent, onClick }) {
  const { text } = useLocalizedContent();

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between gap-2 rounded-2xl border border-[#e4eeee] bg-white px-3 py-3 text-start transition hover:border-[#14b8a6] hover:bg-[#f7fbfb]"
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#e6f7f7] text-[#14b8a6]">
          {React.createElement(IconComponent, { size: 14 })}
        </span>
        <span className="min-w-0 text-[12px] font-extrabold text-[#084036]">{text(label)}</span>
      </span>
      <ExternalLink size={12} className="shrink-0 text-[#119a8a]" />
    </button>
  );
}

function StatBox({ label, value, tone, Icon }) {
  const { lang, text } = useLocalizedContent();

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#e4eeee] bg-white p-4 shadow-[0_8px_22px_rgba(41,93,96,0.06)]">
      {Icon && (
        <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${tone}1a`, color: tone }}>
          <Icon size={16} />
        </span>
      )}
      <div>
        <div className="text-[18px] font-black text-[#084036]">{formatLocalizedNumber(value, lang)}</div>
        <div className="text-[11px] text-[#486466]">{text(label)}</div>
      </div>
    </div>
  );
}

function DetailCard({ label, value }) {
  const { text } = useLocalizedContent();

  return (
    <div className="rounded-2xl border border-[#eef5f5] bg-[#f8fbfb] p-4">
      <div className="mb-1 text-[11px] font-extrabold text-[#486466]">{text(label)}</div>
      <div className="break-words text-[13px] font-bold text-[#084036]">{value}</div>
    </div>
  );
}
