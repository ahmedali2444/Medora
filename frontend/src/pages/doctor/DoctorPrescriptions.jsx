import React, { useEffect, useState } from 'react';
import { ClipboardList, FileSignature, Plus, Printer, ScanSearch as Search, Share2, User, Image as ImageIcon } from 'lucide-react';
import { toPng } from 'html-to-image';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DoctorLayout from '../../components/doctor/layout/DoctorLayout';
import SectionCard from '../../components/doctor/shared/SectionCard';
import { formatDate } from '../../components/doctor/data/doctorData';
import { useLocalizedContent } from '../../hooks/useLocalizedContent';
import {
  formatLocalizedNumber,
  localizedText,
} from '../../utils/localization';
import { medoraApi } from '../../api/medoraApi';
import { mapPrescription, mapDoctorProfile } from '../../utils/professionalApiMappers';
import PaginationBar from '../../components/shared/PaginationBar';
import PrintablePrescriptionTemplate from '../../components/doctor/prescriptions/PrintablePrescriptionTemplate';

const COPY = {
  title: localizedText('الروشتات', 'Prescriptions'),
  subtitle: localizedText('سجل الروشتات الصادرة للمرضى', 'Record of prescriptions issued to patients'),
  totalLabel: localizedText('إجمالي الروشتات', 'Total prescriptions'),
  thisWeek: localizedText('هذا الأسبوع', 'This week'),
  scheduled: localizedText('متابعات مجدولة', 'Scheduled follow-ups'),
  electronic: localizedText('آخر 30 يوم', 'Last 30 days'),
  listTitle: localizedText('السجل', 'Records'),
  countSuffix: localizedText('روشتة', 'prescription(s)'),
  addNew: localizedText('جديدة', 'New'),
  searchPlaceholder: localizedText('ابحث برقم الروشتة، الاسم، التشخيص...', 'Search by prescription ID, name, diagnosis...'),
  patient: localizedText('المريض', 'Patient'),
  date: localizedText('التاريخ', 'Date'),
  diagnosis: localizedText('التشخيص', 'Diagnosis'),
  medications: localizedText('الأدوية الموصوفة', 'Prescribed medications'),
  notes: localizedText('ملاحظات', 'Notes'),
  share: localizedText('مشاركة', 'Share'),
  print: localizedText('طباعة', 'Print'),
  prescriptionTitle: localizedText('روشتة', 'Prescription'),
};

const RX_PAGE_SIZE = 25;

export default function DoctorPrescriptions() {
  const { lang, text, isRtl } = useLocalizedContent();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [rxStats, setRxStats] = useState({ weekCount: 0, monthCount: 0 });
  const [prescriptions, setPrescriptions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [ui, setUi] = useState({ loading: true, error: '' });
  const rxParam = searchParams.get('rx');
  const appointmentParam = searchParams.get('appointmentId');
  const totalPages = Math.max(Math.ceil(total / RX_PAGE_SIZE), 1);

  useEffect(() => {
    let mounted = true;
    medoraApi.doctorMe()
      .then((data) => {
        if (mounted) setDoctorProfile(mapDoctorProfile(data, {}));
      })
      .catch(() => {
        if (mounted) setDoctorProfile(null);
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (mounted) setUi({ loading: true, error: '' });
    });

    medoraApi.doctorPrescriptions({
      page,
      pageSize: RX_PAGE_SIZE,
      search: debouncedQuery || undefined,
    })
      .then((data) => {
        if (!mounted) return;
        const mapped = Array.isArray(data?.items) ? data.items.map(mapPrescription) : [];
        setPrescriptions(mapped);
        setTotal(Number.isFinite(Number(data?.total)) ? Number(data.total) : mapped.length);
        setRxStats({
          weekCount: Number(data?.weekCount || 0),
          monthCount: Number(data?.monthCount || 0),
        });
        setUi({ loading: false, error: '' });
      })
      .catch((error) => {
        if (!mounted) return;
        setPrescriptions([]);
        setTotal(0);
        setUi({ loading: false, error: error.message || 'Unable to load prescriptions' });
      });

    return () => { mounted = false; };
  }, [page, debouncedQuery]);

  const filtered = prescriptions;

  useEffect(() => {
    const preferred = filtered.find((rx) =>
      (rxParam && (rx.id === rxParam || String(rx.rawId) === rxParam)) ||
      (appointmentParam && String(rx.appointmentId) === appointmentParam),
    );

    queueMicrotask(() => {
      setSelected((current) => {
        if (preferred) return preferred;
        if (current && filtered.some((rx) => rx.id === current.id)) return current;
        return filtered[0] || null;
      });
    });
  }, [filtered, rxParam, appointmentParam]);

  return (
    <>
    <div className="print:hidden">
    <DoctorLayout title={COPY.title} subtitle={COPY.subtitle}>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatBox label={text(COPY.totalLabel)} value={total} tone="#14b8a6" Icon={ClipboardList} />
        <StatBox label={text(COPY.thisWeek)} value={rxStats.weekCount} tone="#6366f1" Icon={FileSignature} />
        <StatBox label={text(COPY.electronic)} value={rxStats.monthCount} tone="#ec4899" Icon={FileSignature} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.4fr]">
        <SectionCard
          title={COPY.listTitle}
          description={`${formatLocalizedNumber(total, lang)} ${text(COPY.countSuffix)}`}
          icon={ClipboardList}
          action={
            <button
              type="button"
              onClick={() => navigate('/doctor/appointments')}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#14b8a6] px-3 py-2 text-[11px] font-bold text-white transition hover:bg-[#119a8a] sm:w-auto sm:py-1.5"
            >
              <Plus size={12} />
              {text(COPY.addNew)}
            </button>
          }
        >
          {ui.error && <div className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{ui.error}</div>}
          {ui.loading && <div className="mb-3 rounded-xl bg-[#e6f7f7] px-4 py-3 text-xs font-semibold text-[#0e7c6e]">...</div>}
          <div className="relative mb-3">
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

          <div className="flex max-h-[520px] flex-col gap-2 overflow-y-auto">
            {filtered.map((rx) => {
              const active = selected?.id === rx.id;
              return (
                <button
                  key={rx.id}
                  onClick={() => setSelected(rx)}
                  className="flex items-start gap-3 rounded-2xl border px-3 py-3 text-start transition"
                  style={
                    active
                      ? {
                          borderColor: '#14b8a6',
                          background: '#e6f7f7',
                          boxShadow: '0 8px 20px rgba(20,184,166,0.18)',
                        }
                      : { borderColor: '#e4eeee', background: '#ffffff' }
                  }
                >
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: active ? '#14b8a6' : '#f1fbfa', color: active ? '#ffffff' : '#14b8a6' }}
                  >
                    <ClipboardList size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-[10px] text-slate-400 sm:order-1" dir="ltr">
                        {rx.id}
                      </span>
                      <span className="truncate text-[13px] font-extrabold text-[#084036] sm:order-2">{text(rx.patient)}</span>
                    </div>
                    <div className="mt-1 text-[11px] leading-6 text-slate-500">{text(rx.diagnosis)}</div>
                    <div className="mt-1 text-[10px] text-slate-400">{formatDate(rx.date, lang)}</div>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[#cfe4e2] bg-[#f7fbfb] p-6 text-center text-[12px] font-bold text-[#486466]">
                {text(localizedText('لا توجد روشتات مربوطة بالمنصة حتى الآن.', 'No prescriptions are connected to the platform yet.'))}
              </div>
            )}
          </div>
          <PaginationBar
            page={page}
            totalPages={totalPages}
            loading={ui.loading}
            onPageChange={setPage}
            isRtl={isRtl}
            text={text}
          />
        </SectionCard>

        {selected && <PrescriptionView prescription={selected} copy={COPY} />}
      </div>
    </DoctorLayout>
    </div>

    {/* Dedicated Print-Only Layout */}
    {selected && (
      <div id="prescription-capture-wrapper" className="hidden print:block w-full bg-white text-black print:!p-0 print:!m-0">
        <PrintablePrescriptionTemplate prescription={selected} doctorProfile={doctorProfile} />
      </div>
    )}
    </>
  );
}


function StatBox({ label, value, tone, Icon }) {
  const { lang } = useLocalizedContent();

  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-[#e4eeee] bg-white p-4 text-start shadow-[0_8px_22px_rgba(41,93,96,0.06)] sm:flex-row sm:items-center">
      <span
        className="flex h-10 w-10 items-center justify-center rounded-xl"
        style={{ background: `${tone}1a`, color: tone }}
      >
        {Icon && <Icon size={16} />}
      </span>
      <div className="min-w-0">
        <div className="text-[22px] font-black text-[#084036]">{formatLocalizedNumber(value, lang)}</div>
        <div className="text-[11px] text-[#486466]">{label}</div>
      </div>
    </div>
  );
}

function PrescriptionView({ prescription, copy }) {
  const { lang, text } = useLocalizedContent();
  const sharePrescription = async () => {
    const value = `${text(copy.prescriptionTitle)} ${prescription.id} - ${text(prescription.patient)}`;
    if (navigator.share) await navigator.share({ title: value, text: value }).catch(() => undefined);
    else await navigator.clipboard?.writeText(value).catch(() => undefined);
  };

  const saveAsImage = async () => {
    const wrapper = document.getElementById('prescription-capture-wrapper');
    if (!wrapper) return;
    
    const originalDisplay = wrapper.className;
    wrapper.className = 'w-full bg-white text-black print:!p-0 print:!m-0';
    wrapper.style.position = 'absolute';
    wrapper.style.top = '0';
    wrapper.style.left = '0';
    wrapper.style.zIndex = '-50';
    
    // Wait for the browser to apply styles and render the element
    await new Promise(resolve => setTimeout(resolve, 150));
    
    try {
      const dataUrl = await toPng(wrapper, { 
        quality: 1, 
        backgroundColor: '#ffffff',
        pixelRatio: 2
      });
      
      const link = document.createElement('a');
      link.download = `Prescription-${prescription.id}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error generating image', error);
    } finally {
      wrapper.className = originalDisplay;
      wrapper.style.position = '';
      wrapper.style.top = '';
      wrapper.style.left = '';
      wrapper.style.zIndex = '';
    }
  };

  return (
    <SectionCard
      title={`${text(copy.prescriptionTitle)} ${prescription.id}`}
      description={`${text(prescription.patient)} · ${formatDate(prescription.date, lang)}${prescription.appointmentId ? ` · ${text(localizedText('حجز', 'Appointment'))} #${prescription.appointmentId}` : ''}`}
      icon={FileSignature}
      action={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <button onClick={sharePrescription} className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-[#e4eeee] bg-white px-3 py-2 text-[11px] font-bold text-[#295d60] transition hover:border-[#14b8a6] sm:w-auto sm:py-1.5 print:hidden">
            <Share2 size={12} />
            {text(copy.share)}
          </button>
          <button onClick={saveAsImage} className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-[#e4eeee] bg-white px-3 py-2 text-[11px] font-bold text-[#295d60] transition hover:border-[#14b8a6] sm:w-auto sm:py-1.5 print:hidden">
            <ImageIcon size={12} />
            {text(localizedText('حفظ كصورة', 'Save as Image'))}
          </button>
          <button onClick={() => window.print()} className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#14b8a6] px-3 py-2 text-[11px] font-bold text-white transition hover:bg-[#119a8a] sm:w-auto sm:py-1.5 print:hidden">
            <Printer size={12} />
            {text(copy.print)}
          </button>
        </div>
      }
    >
      <div className="rounded-2xl border border-dashed border-[#d7e7e5] bg-[#f7fbfb] p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 border-b border-dashed border-[#d7e7e5] pb-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-[#486466]">{text(copy.patient)}</div>
            <div className="mt-0.5 flex min-w-0 items-center gap-2 text-[13px] font-extrabold text-[#084036]">
              <User size={13} className="text-[#14b8a6]" />
              <span className="truncate">{text(prescription.patient)}</span>
            </div>
          </div>
          <div className="text-start sm:text-left">
            <div className="text-[11px] font-bold text-[#486466]">{text(copy.date)}</div>
            <div className="mt-0.5 text-[13px] font-extrabold text-[#084036]" dir="ltr">
              {formatDate(prescription.date, lang)}
            </div>
          </div>
        </div>
        {prescription.appointmentId && (
          <div className="mb-4 rounded-xl border border-[#d8ecea] bg-white px-3 py-2 text-[11px] font-bold text-[#486466]">
            {text(localizedText('الحجز المرتبط', 'Linked appointment'))}: #{prescription.appointmentId}
            {prescription.appointment?.scheduledAt ? ` · ${formatDate(prescription.appointment.scheduledAt, lang)}` : ''}
          </div>
        )}

        <div className="mb-4">
          <div className="mb-1 text-[11px] font-bold text-[#486466]">{text(copy.diagnosis)}</div>
          <div className="rounded-xl border border-[#e4eeee] bg-white p-3 text-[13px] font-bold text-[#084036]">
            {text(prescription.diagnosis)}
          </div>
        </div>

        <div className="mb-4">
          <div className="mb-2 text-[11px] font-bold text-[#486466]">{text(copy.medications)}</div>
          <div className="overflow-hidden rounded-xl border border-[#e4eeee]">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_1.5fr] border-b border-[#e4eeee] bg-[#f7fbfb] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#486466]">
              <span>{text(localizedText('الدواء', 'Medicine'))}</span>
              <span className="text-center">{text(localizedText('الجرعة', 'Dose'))}</span>
              <span className="text-center">{text(localizedText('التعليمات', 'Instructions'))}</span>
            </div>
            {prescription.items.map((item, index) => (
              <div
                key={`${prescription.id}-${index}`}
                className="grid grid-cols-[2fr_1fr_1.5fr] items-center border-b border-[#f1f7f7] bg-white px-3 py-3 text-[12px] last:border-b-0"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#14b8a6] text-[10px] font-black text-white">
                    {index + 1}
                  </span>
                  <span className="font-extrabold text-[#084036]">{text(item.name)}</span>
                </div>
                <div className="text-center">
                  <span className="rounded-full bg-[#e6f7f7] px-2 py-0.5 text-[10px] font-bold text-[#0e7c6e]">
                    {text(item.dose) || '—'}
                  </span>
                </div>
                <div className="text-center text-[11px] text-slate-500">{text(item.frequency) || '—'}</div>
              </div>
            ))}
          </div>
        </div>

        {prescription.notes && text(prescription.notes) && (
          <div>
            <div className="mb-1 text-[11px] font-bold text-[#486466]">{text(copy.notes)}</div>
            <div className="rounded-xl border border-[#e4eeee] bg-white p-3 text-[12px] leading-7 text-slate-600 sm:p-4">
              {text(prescription.notes)}
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

