import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList, FileCheck2, ScanSearch as Search, ShieldAlert } from 'lucide-react';
import PharmacyLayout from '../../components/pharmacy/layout/PharmacyLayout';
import SectionCard from '../../components/pharmacy/shared/SectionCard';
import DataTable from '../../components/pharmacy/shared/DataTable';
import StatusPill from '../../components/pharmacy/shared/StatusPill';
import { useLocalizedContent } from '../../hooks/useLocalizedContent';
import {
  formatLocalizedDate,
  localizedText,
} from '../../utils/localization';
import {
  PRESCRIPTION_STATUS_META,
} from '../../components/pharmacy/data/pharmacyData';
import PaginationBar from '../../components/shared/PaginationBar';
import { medoraApi } from '../../api/medoraApi';

const FILTERS = ['all', 'new', 'reviewing', 'approved', 'rejected'];
const PAGE_SIZE = 20;

const COPY = {
  title: localizedText('الروشتات', 'Prescriptions'),
  subtitle: localizedText('مراجعة الروشتات الإلكترونية واعتمادها أو رفضها', 'Review electronic prescriptions and approve or reject them'),
  totalPrescriptions: localizedText('إجمالي الروشتات', 'Total prescriptions'),
  newPrescriptions: localizedText('جديدة', 'New'),
  underReview: localizedText('قيد المراجعة', 'Under review'),
  approved: localizedText('تم اعتمادها', 'Approved'),
  prescriptionLog: localizedText('سجل الروشتات', 'Prescription log'),
  prescriptionCount: localizedText('روشتة', 'prescriptions'),
  searchPlaceholder: localizedText(
    'ابحث برقم الروشتة أو المريض أو الطبيب...',
    'Search by prescription ID, patient, or doctor...',
  ),
  all: localizedText('الكل', 'All'),
  prescription: localizedText('الروشتة', 'Prescription'),
  patient: localizedText('المريض', 'Patient'),
  doctor: localizedText('الطبيب', 'Doctor'),
  medicines: localizedText('الأدوية', 'Medicines'),
  status: localizedText('الحالة', 'Status'),
};

function StatBox({ label, value, tone, Icon }) {
  const { text } = useLocalizedContent();

  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-[#e4eeee] bg-white p-4 text-start shadow-[0_8px_22px_rgba(41,93,96,0.06)] sm:flex-row sm:items-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${tone}1a`, color: tone }}>
        {Icon ? <Icon size={16} /> : null}
      </span>
      <div className="min-w-0">
        <div className="text-[18px] font-black text-[#084036]">{value}</div>
        <div className="text-[11px] text-[#486466]">{text(label)}</div>
      </div>
    </div>
  );
}

export default function PharmacyPrescriptions() {
  const { lang, text, isRtl } = useLocalizedContent();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [prescriptions, setPrescriptions] = useState([]);
  const [ui, setUi] = useState({ loading: true, error: '' });
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  const handleQueryChange = (value) => {
    setQuery(value);
    setPage(1);
  };

  const handleFilterChange = (value) => {
    setFilter(value);
    setPage(1);
  };

  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (mounted) setUi({ loading: true, error: '' });
    });
    medoraApi.pharmacyPrescriptionsList({
      page,
      pageSize: PAGE_SIZE,
      status: filter === 'all' ? undefined : filter,
      search: query.trim() || undefined,
    })
      .then((data) => {
        if (!mounted) return;
        const mapped = Array.isArray(data?.items) ? data.items.map(mapPrescription) : [];
        setPrescriptions(mapped);
        setTotal(Number.isFinite(Number(data?.total)) ? Number(data.total) : mapped.length);
        setUi({ loading: false, error: '' });
      })
      .catch((error) => {
        if (!mounted) return;
        setPrescriptions([]);
        setTotal(0);
        setUi({ loading: false, error: error.message || 'Unable to load prescriptions' });
      });

    return () => { mounted = false; };
  }, [filter, query, page]);

  const filtered = useMemo(() => {
    return prescriptions.slice().sort((a, b) => new Date(b.rawDate || 0) - new Date(a.rawDate || 0));
  }, [prescriptions]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      setUi((prev) => ({ ...prev, loading: true, error: '' }));
      await medoraApi.pharmacyUpdatePrescriptionStatus(id, { status: newStatus });
      setPrescriptions((prev) => prev.map(p => p.rawId === id ? { ...p, status: mapPrescriptionStatus(newStatus) } : p));
    } catch (err) {
      setUi((prev) => ({ ...prev, error: err.message || 'Failed to update prescription status' }));
    } finally {
      setUi((prev) => ({ ...prev, loading: false }));
    }
  };

  const columns = [
    {
      key: 'id',
      label: COPY.prescription,
      width: '0.9fr',
      align: 'center',
      render: (row) => (
        <div>
          <div dir="ltr" className="text-[12px] font-extrabold text-[#084036]">{row.id}</div>
          <div className="text-[10px] text-slate-400">{formatLocalizedDate(row.date, lang)}</div>
        </div>
      ),
    },
    {
      key: 'patient',
      label: COPY.patient,
      width: '1fr',
      render: (row) => <span className="text-[12px] font-bold text-[#084036]">{text(row.patient)}</span>,
    },
    {
      key: 'doctor',
      label: COPY.doctor,
      width: '1fr',
      render: (row) => <span className="text-[11px] text-slate-600">{text(row.doctor)}</span>,
    },
    {
      key: 'items',
      label: COPY.medicines,
      width: '1.2fr',
      align: 'center',
      render: (row) => (
        <div className="flex flex-wrap justify-center gap-1">
          {row.items.slice(0, 2).map((item) => (
            <span key={`${row.id}-${text(item.name)}`} className="rounded-full bg-[#f1fbfa] px-2 py-0.5 text-[10px] font-bold text-[#2d6669]">
              {text(item.name)}
            </span>
          ))}
          {row.items.length > 2 && <span className="text-[10px] text-slate-400">+{row.items.length - 2}</span>}
        </div>
      ),
    },
    {
      key: 'status',
      label: COPY.status,
      width: '0.9fr',
      align: 'center',
      render: (row) => <StatusPill meta={PRESCRIPTION_STATUS_META[row.status]} />,
    },
    {
      key: 'actions',
      label: text(localizedText('إجراءات', 'Actions')),
      width: '0.8fr',
      align: 'center',
      render: (row) => (
        <div className="flex gap-1 justify-center">
          {row.status === 'new' && (
            <button
              onClick={() => handleStatusChange(row.rawId, 'Reviewing')}
              className="rounded bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700 hover:bg-amber-200"
            >
              {text(localizedText('مراجعة', 'Review'))}
            </button>
          )}
          {row.status === 'reviewing' && (
            <>
              <button
                onClick={() => handleStatusChange(row.rawId, 'Approved')}
                className="rounded bg-teal-100 px-2 py-1 text-[10px] font-bold text-teal-700 hover:bg-teal-200"
              >
                {text(localizedText('قبول', 'Approve'))}
              </button>
              <button
                onClick={() => handleStatusChange(row.rawId, 'Rejected')}
                className="rounded bg-red-100 px-2 py-1 text-[10px] font-bold text-red-700 hover:bg-red-200"
              >
                {text(localizedText('رفض', 'Reject'))}
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <PharmacyLayout title={COPY.title} subtitle={COPY.subtitle}>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatBox label={COPY.totalPrescriptions} value={prescriptions.length} Icon={ClipboardList} tone="#14b8a6" />
        <StatBox label={COPY.newPrescriptions} value={prescriptions.filter((item) => item.status === 'new').length} Icon={ShieldAlert} tone="#2465b6" />
        <StatBox label={COPY.underReview} value={prescriptions.filter((item) => item.status === 'reviewing').length} Icon={ClipboardList} tone="#f59e0b" />
        <StatBox label={COPY.approved} value={prescriptions.filter((item) => item.status === 'approved').length} Icon={FileCheck2} tone="#0e7c6e" />
      </div>

      <SectionCard
        title={COPY.prescriptionLog}
        description={`${filtered.length} ${text(COPY.prescriptionCount)}`}
        icon={ClipboardList}
      >
        {ui.error && <div className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{ui.error}</div>}
        {ui.loading && <div className="mb-3 rounded-xl bg-[#e6f7f7] px-4 py-3 text-xs font-semibold text-[#0e7c6e]">...</div>}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <input
              type="search"
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
              placeholder={text(COPY.searchPlaceholder)}
              className="h-10 w-full rounded-full border border-[#e4eeee] bg-white pr-9 pl-4 text-[12px] outline-none transition focus:border-[#14b8a6]"
            />
            <Search size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#14b8a6]" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((tab) => (
              <button
                key={tab}
                onClick={() => handleFilterChange(tab)}
                className="rounded-full border px-3 py-1.5 text-[11px] font-bold transition"
                style={
                  filter === tab
                    ? { background: '#14b8a6', borderColor: '#14b8a6', color: '#fff' }
                    : { background: '#fff', borderColor: '#e4eeee', color: '#486466' }
                }
              >
                {tab === 'all' ? text(COPY.all) : text(PRESCRIPTION_STATUS_META[tab]?.label)}
              </button>
            ))}
          </div>
        </div>

        {filtered.length > 0 && <DataTable columns={columns} rows={filtered} />}
        <PaginationBar
          page={page}
          totalPages={totalPages}
          loading={ui.loading}
          onPageChange={setPage}
          isRtl={isRtl}
          text={text}
        />
        {filtered.length === 0 && !ui.loading && (
          <div className="mt-4 rounded-2xl border border-dashed border-[#cfe4e2] bg-[#f7fbfb] p-6 text-center text-[12px] font-bold text-[#486466]">
            {text(localizedText('لا توجد روشتات مربوطة بالمنصة حتى الآن.', 'No prescriptions are connected to the platform yet.'))}
          </div>
        )}
      </SectionCard>
    </PharmacyLayout>
  );
}

function mapPrescriptionStatus(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'new') return 'new';
  if (value === 'reviewing') return 'reviewing';
  if (value === 'approved' || value === 'fulfilled') return 'approved';
  if (value === 'rejected') return 'rejected';
  return 'new';
}

function mapPrescription(item) {
  return {
    id: item.prescriptionNumber || `RX-${item.id}`,
    rawId: item.id,
    patient: localizedText(item.patientName || '', item.patientName || ''),
    doctor: localizedText(item.doctorName || '', item.doctorName || ''),
    rawDate: item.createdAt || '',
    date: item.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    status: mapPrescriptionStatus(item.status),
    items: Array.isArray(item.items)
      ? item.items.map((rxItem) => ({ name: localizedText(rxItem.medicineName || '', rxItem.medicineName || '') }))
      : [],
  };
}
