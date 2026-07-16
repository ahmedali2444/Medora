import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ClipboardList,
  FileSignature,
  Pill,
  Printer,
  Search,
  Share2,
  ShoppingBag,
  Stethoscope,
  Image as ImageIcon,
  MapPin,
  X
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { medoraApi } from '../../api/medoraApi';
import { useLocalizedContent } from '../../hooks/useLocalizedContent';
import { formatLocalizedNumber, localizedText } from '../../utils/localization';
import { mapPrescription } from '../../utils/professionalApiMappers';
import PaginationBar from '../../components/shared/PaginationBar';
import {
  GEOLOCATION_ERROR_CODES,
  readSessionLocation,
  requestBrowserLocation,
  saveSessionLocation,
} from '../../utils/locationUtils';

const RX_PAGE_SIZE = 25;

const WEEK_AGO_STR = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

const COPY = {
  title: localizedText('روشتاتي', 'My Prescriptions'),
  subtitle: localizedText('سجل الروشتات الطبية الصادرة لك', 'Your medical prescriptions record'),
  total: localizedText('إجمالي الروشتات', 'Total prescriptions'),
  thisWeek: localizedText('هذا الأسبوع', 'This week'),
  pending: localizedText('قيد الصرف', 'Pending'),
  searchPlaceholder: localizedText('ابحث بالتشخيص أو اسم الدواء...', 'Search by diagnosis or medicine...'),
  emptyTitle: localizedText('لا توجد روشتات', 'No prescriptions'),
  emptyDesc: localizedText('ستظهر روشتاتك هنا بعد اكتمال موعدك الطبي.', 'Your prescriptions will appear here after your appointment is completed.'),
  selectPrompt: localizedText('اختر روشتة من القائمة لعرض تفاصيلها', 'Select a prescription to view its details'),
  rxTitle: localizedText('روشتة طبية', 'Medical Prescription'),
  patientLabel: localizedText('المريض', 'Patient'),
  dateLabel: localizedText('التاريخ', 'Date'),
  diagnosisLabel: localizedText('التشخيص', 'Diagnosis'),
  medicinesLabel: localizedText('الأدوية الموصوفة', 'Prescribed Medications'),
  notesLabel: localizedText('ملاحظات الطبيب', "Doctor's Notes"),
  print: localizedText('طباعة', 'Print'),
  savePdf: localizedText('حفظ PDF', 'Save PDF'),
  share: localizedText('مشاركة', 'Share'),
  orderMedicines: localizedText('طلب الأدوية', 'Order medicines'),
  doseLabel: localizedText('الجرعة', 'Dose'),
  freqLabel: localizedText('التعليمات', 'Instructions'),
  qtyLabel: localizedText('الكمية', 'Qty'),
  countSuffix: localizedText('روشتة', 'prescription(s)'),
};

function formatDate(dateStr, lang) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function PatientPrescriptions() {
  const { lang, text, isRtl } = useLocalizedContent();
  const [prescriptions, setPrescriptions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [orderFor, setOrderFor] = useState(null);
  const [ui, setUi] = useState({ loading: true, error: '' });
  const totalPages = Math.max(Math.ceil(total / RX_PAGE_SIZE), 1);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    queueMicrotask(() => setPage(1));
  }, [debouncedQuery]);

  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (mounted) setUi({ loading: true, error: '' });
    });
    medoraApi.patientPrescriptions({
      page,
      pageSize: RX_PAGE_SIZE,
      search: debouncedQuery || undefined,
    })
      .then((data) => {
        if (!mounted) return;
        const items = Array.isArray(data?.items) ? data.items.map(mapPrescription) : [];
        setPrescriptions(items);
        setTotal(Number.isFinite(Number(data?.total)) ? Number(data.total) : items.length);
        setSelected((current) => {
          if (current && items.some((item) => item.id === current.id)) return current;
          return items[0] || null;
        });
        setUi({ loading: false, error: '' });
      })
      .catch((err) => {
        if (!mounted) return;
        setPrescriptions([]);
        setTotal(0);
        setUi({ loading: false, error: err.message || 'Unable to load prescriptions' });
      });
    return () => { mounted = false; };
  }, [page, debouncedQuery]);

  const filtered = prescriptions;

  const stats = useMemo(() => {
    return {
      total,
      thisWeek: prescriptions.filter((rx) => rx.date >= WEEK_AGO_STR).length,
    };
  }, [prescriptions, total]);

  const handlePrint = () => window.print();
  const handleShare = async (rx) => {
    const value = `${text(COPY.rxTitle)} ${rx.id} – ${text(rx.diagnosis)}`;
    if (navigator.share) await navigator.share({ title: value, text: value }).catch(() => undefined);
    else await navigator.clipboard?.writeText(value).catch(() => undefined);
  };

  return (
    <>
      {/* Print CSS injected inline to avoid separate file dependency */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #rx-print-area, #rx-print-area * { visibility: visible !important; }
          #rx-print-area { position: fixed; inset: 0; z-index: 9999; background: #fff; padding: 32px; }
        }
      `}</style>

      <div className="min-h-screen" style={{ fontFamily: 'Cairo, sans-serif' }}>
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-[26px] font-black text-[#084036]">{text(COPY.title)}</h1>
          <p className="mt-1 text-[13px] text-slate-500">{text(COPY.subtitle)}</p>
        </div>

        {/* Stat boxes */}
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          {[
            { label: text(COPY.total), value: stats.total, icon: ClipboardList, tone: '#14b8a6' },
            { label: text(COPY.thisWeek), value: stats.thisWeek, icon: FileSignature, tone: '#6366f1' },
            { label: text(COPY.pending), value: 0, icon: Pill, tone: '#f59e0b' },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-[#e4eeee] bg-white p-4 shadow-sm">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${s.tone}1a`, color: s.tone }}>
                <s.icon size={18} />
              </span>
              <div>
                <div className="text-[22px] font-black text-[#084036]">{formatLocalizedNumber(s.value, lang)}</div>
                <div className="text-[11px] text-[#486466]">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Error / Loading */}
        {ui.error && (
          <div className="mb-4 flex items-center gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            <AlertCircle size={16} /> {ui.error}
          </div>
        )}
        {ui.loading && (
          <div className="flex justify-center py-20">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-[#14b8a6] border-t-transparent" />
          </div>
        )}

        {!ui.loading && !ui.error && (
          <div className="grid gap-5 xl:grid-cols-[1fr_1.5fr]">
            {/* Left: list */}
            <div className="rounded-2xl border border-[#e4eeee] bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[13px] font-extrabold text-[#084036]">{text(COPY.title)}</span>
                <span className="text-[11px] text-slate-400">
                  {formatLocalizedNumber(filtered.length, lang)} {text(COPY.countSuffix)}
                </span>
              </div>

              {/* Search */}
              <div className="relative mb-3">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={text(COPY.searchPlaceholder)}
                  className="h-10 w-full rounded-full border border-[#e4eeee] bg-[#f7fbfb] pr-9 pl-4 text-[12px] outline-none transition focus:border-[#14b8a6]"
                />
                <Search size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#14b8a6]" />
              </div>

              {/* List */}
              <div className="flex max-h-[520px] flex-col gap-2 overflow-y-auto">
                {filtered.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-[#cfe4e2] bg-[#f7fbfb] p-6 text-center text-[12px] font-bold text-[#486466]">
                    {text(COPY.emptyTitle)}
                  </div>
                )}
                {filtered.map((rx) => {
                  const active = selected?.id === rx.id;
                  return (
                    <button
                      key={rx.id}
                      onClick={() => setSelected(rx)}
                      className="flex items-start gap-3 rounded-2xl border px-3 py-3 text-start transition"
                      style={
                        active
                          ? { borderColor: '#14b8a6', background: '#e6f7f7', boxShadow: '0 8px 20px rgba(20,184,166,0.18)' }
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
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] text-slate-400" dir="ltr">{rx.id}</span>
                          <span className="text-[10px] text-slate-400">{formatDate(rx.date, lang)}</span>
                        </div>
                        <div className="mt-0.5 text-[12px] font-bold leading-6 text-[#084036]">{text(rx.diagnosis)}</div>
                        <div className="mt-0.5 text-[10px] text-slate-400">
                          {rx.items.slice(0, 2).map((i) => text(i.name)).join(' · ')}
                          {rx.items.length > 2 && ' ...'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <PaginationBar page={page} totalPages={totalPages} loading={ui.loading} onPageChange={setPage} isRtl={isRtl} text={text} />
            </div>

            {/* Right: prescription view */}
            {selected ? (
              <PrescriptionCard
                rx={selected}
                lang={lang}
                text={text}
                onPrint={handlePrint}
                onShare={handleShare}
                onOrder={() => setOrderFor(selected)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#cfe4e2] bg-white p-12 text-center">
                <ClipboardList size={32} className="mb-3 text-[#14b8a6]" />
                <div className="text-[13px] font-bold text-[#084036]">{text(COPY.selectPrompt)}</div>
              </div>
            )}
          </div>
        )}

        {/* Empty state when no prescriptions at all */}
        {!ui.loading && !ui.error && prescriptions.length === 0 && (
          <div className="mt-8 flex flex-col items-center rounded-3xl border border-dashed border-[#cfe4e2] bg-white py-24 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#e6f7f7]">
              <ClipboardList size={28} className="text-[#14b8a6]" />
            </div>
            <div className="text-[18px] font-black text-[#084036]">{text(COPY.emptyTitle)}</div>
            <div className="mt-2 max-w-xs text-[13px] text-slate-500">{text(COPY.emptyDesc)}</div>
          </div>
        )}

        {orderFor && (
          <PrescriptionOrderModal
            rx={orderFor}
            lang={lang}
            text={text}
            onClose={() => setOrderFor(null)}
            onCompleted={(pharmacyId) => {
              setPrescriptions((current) => current.map((item) => (
                item.rawId === orderFor.rawId
                  ? { ...item, status: 'Reviewing', pharmacyId }
                  : item
              )));
              setOrderFor(null);
            }}
          />
        )}
      </div>
    </>
  );
}

function PrescriptionCard({ rx, lang, text, onPrint, onShare, onOrder }) {
  const handleSaveAsImage = async () => {
    const el = document.getElementById('rx-print-area');
    if (!el) return;
    try {
      const dataUrl = await toPng(el, { quality: 1, backgroundColor: '#ffffff', pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `Prescription-${rx.id}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="rounded-2xl border border-[#e4eeee] bg-white shadow-sm">
      {/* Header bar */}
      <div className="flex flex-col gap-3 border-b border-[#e4eeee] bg-gradient-to-l from-[#f1fbfa] to-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] font-bold text-[#486466]">{text(COPY.rxTitle)}</div>
          <div className="text-[15px] font-black text-[#084036]" dir="ltr">{rx.id}</div>
          {rx.appointmentId && (
            <div className="mt-1 text-[11px] font-bold text-[#486466]">
              {text(localizedText('مرتبطة بحجز رقم', 'Linked appointment'))} #{rx.appointmentId}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onOrder}
            disabled={Boolean(rx.pharmacyId) || String(rx.status).toLowerCase() === 'rejected'}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#084036] px-3 py-2 text-[11px] font-bold text-white transition hover:bg-[#0c5648] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ShoppingBag size={12} /> {text(COPY.orderMedicines)}
          </button>
          <button
            onClick={() => onShare(rx)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#e4eeee] bg-white px-3 py-2 text-[11px] font-bold text-[#295d60] transition hover:border-[#14b8a6]"
          >
            <Share2 size={12} /> {text(COPY.share)}
          </button>
          <button
            onClick={handleSaveAsImage}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#e4eeee] bg-white px-3 py-2 text-[11px] font-bold text-[#295d60] transition hover:border-[#14b8a6]"
          >
            <ImageIcon size={12} /> {text(localizedText('حفظ كصورة', 'Save Image'))}
          </button>
          <button
            onClick={onPrint}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#14b8a6] px-3 py-2 text-[11px] font-bold text-white transition hover:bg-[#119a8a]"
          >
            <Printer size={12} /> {text(COPY.savePdf)}
          </button>
        </div>
      </div>

      {/* Printable body */}
      <div id="rx-print-area" className="p-5">
        {/* Prescription header (print-style) */}
        <div className="mb-5 rounded-2xl border border-dashed border-[#c5e4e0] bg-gradient-to-br from-[#f7fbfb] to-[#eef8f7] p-5">
          {/* Logo + title row */}
          <div className="mb-4 flex items-center gap-3 border-b border-[#d4eae8] pb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#14b8a6] text-white">
              <Stethoscope size={22} />
            </div>
            <div>
              <div className="text-[18px] font-black text-[#084036]">{text(COPY.rxTitle)}</div>
              <div className="text-[11px] text-slate-500" dir="ltr">{rx.id}</div>
            </div>
          </div>

          {/* Patient + Date row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#486466]">{text(COPY.patientLabel)}</div>
              <div className="mt-1 text-[13px] font-extrabold text-[#084036]">{text(rx.patient)}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#486466]">{text(COPY.dateLabel)}</div>
              <div className="mt-1 text-[13px] font-extrabold text-[#084036]" dir="ltr">{formatDate(rx.date, lang)}</div>
            </div>
          </div>
          {rx.appointmentId && (
            <div className="mt-4 rounded-xl border border-[#d8ecea] bg-white/80 px-3 py-2 text-[11px] font-bold text-[#486466]">
              {text(localizedText('الحجز المرتبط', 'Linked appointment'))}: #{rx.appointmentId}
              {rx.appointment?.scheduledAt ? ` · ${formatDate(rx.appointment.scheduledAt, lang)}` : ''}
            </div>
          )}
        </div>

        {/* Diagnosis */}
        <div className="mb-4">
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#486466]">{text(COPY.diagnosisLabel)}</div>
          <div className="rounded-xl border border-[#e4eeee] bg-white px-4 py-3 text-[14px] font-bold text-[#084036]">
            {text(rx.diagnosis)}
          </div>
        </div>

        {/* Medicines table */}
        <div className="mb-4">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#486466]">{text(COPY.medicinesLabel)}</div>
          <div className="overflow-hidden rounded-xl border border-[#e4eeee]">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_1.5fr] border-b border-[#e4eeee] bg-[#f7fbfb] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#486466]">
              <span>{text(localizedText('الدواء', 'Medicine'))}</span>
              <span className="text-center">{text(COPY.doseLabel)}</span>
              <span className="text-center">{text(COPY.freqLabel)}</span>
            </div>
            {rx.items.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-[2fr_1fr_1.5fr] items-center border-b border-[#f1f7f7] bg-white px-3 py-3 text-[12px] last:border-b-0"
              >
                {/* Medicine name */}
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#14b8a6] text-[10px] font-black text-white">
                    {idx + 1}
                  </span>
                  <span className="font-extrabold text-[#084036]">{text(item.name)}</span>
                </div>
                {/* Dose */}
                <div className="text-center">
                  <span className="rounded-full bg-[#e6f7f7] px-2 py-0.5 text-[10px] font-bold text-[#0e7c6e]">
                    {text(item.dose) || '—'}
                  </span>
                </div>
                {/* Instructions */}
                <div className="text-center text-[11px] text-slate-500">{text(item.frequency) || '—'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        {rx.notes && text(rx.notes) && (
          <div>
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#486466]">{text(COPY.notesLabel)}</div>
            <div className="rounded-xl border border-[#e4eeee] bg-[#f7fbfb] px-4 py-3 text-[12px] leading-7 text-slate-600">
              {text(rx.notes)}
            </div>
          </div>
        )}

        {/* Footer signature line */}
        <div className="mt-6 flex items-end justify-between border-t border-dashed border-[#d4eae8] pt-4">
          <div className="text-[10px] text-slate-400">Medora — {rx.id}</div>
          <div className="text-end">
            <div className="h-8 w-36 border-b border-slate-300" />
            <div className="mt-1 text-[10px] text-slate-400">{lang === 'ar' ? 'توقيع الطبيب' : 'Doctor Signature'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrescriptionOrderModal({ rx, lang, text, onClose, onCompleted }) {
  const isArabic = lang === 'ar';
  const [pharmacies, setPharmacies] = useState([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ contactName: '', contactPhone: '', deliveryAddress: '', fulfillment: 'delivery' });
  const [ui, setUi] = useState({ loading: true, submitting: false, error: '', notice: '' });

  const locationNotice = (error) => {
    if (error?.code === GEOLOCATION_ERROR_CODES.PERMISSION_DENIED) {
      return isArabic
        ? 'تم رفض إذن الموقع؛ اختر الصيدلية المناسبة من القائمة.'
        : 'Location permission was denied; choose a pharmacy from the list.';
    }
    if (error?.code === GEOLOCATION_ERROR_CODES.INSECURE_CONTEXT) {
      return isArabic
        ? 'تحديد الموقع يحتاج اتصال HTTPS آمن؛ اختر الصيدلية المناسبة من القائمة.'
        : 'Location access requires HTTPS; choose a pharmacy from the list.';
    }
    return isArabic
      ? 'تعذر قراءة موقعك؛ اختر الصيدلية المناسبة من القائمة.'
      : 'We could not read your location; choose a pharmacy from the list.';
  };

  const loadPharmacies = async (withCurrentLocation = false) => {
    setUi((current) => ({ ...current, loading: true, error: '', notice: '' }));
    let location = readSessionLocation();
    if (!location && withCurrentLocation) {
      try {
        location = await requestBrowserLocation();
        saveSessionLocation(location);
      } catch (locationError) {
        // The patient can still choose a pharmacy; it just cannot be ranked by distance.
        setUi((current) => ({ ...current, notice: locationNotice(locationError) }));
      }
    }

    try {
      const data = await medoraApi.prescriptionPharmacies(rx.rawId, location ? { lat: location.lat, lng: location.lng } : {});
      const nextPharmacies = Array.isArray(data?.pharmacies) ? data.pharmacies : [];
      setItems(Array.isArray(data?.items) ? data.items : []);
      setPharmacies(nextPharmacies);
      setSelectedPharmacy(nextPharmacies[0]?.pharmacyId ?? null);
      setUi((current) => ({
        ...current,
        loading: false,
        error: data?.canOrder === false
          ? (isArabic ? 'بعض الأدوية ليست مرتبطة بكتالوج الأدوية، لذا لا يمكن طلبها إلكترونيًا الآن.' : 'Some medicines are not linked to the medicine catalogue, so this prescription cannot be ordered online yet.')
          : '',
      }));
    } catch (error) {
      setUi((current) => ({ ...current, loading: false, error: error.message || 'Unable to load pharmacies' }));
    }
  };

  useEffect(() => {
    loadPharmacies(false);
  // The modal is created for one immutable prescription. Loading once avoids refetching while typing.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = pharmacies.find((pharmacy) => pharmacy.pharmacyId === selectedPharmacy);
  const submitOrder = async (event) => {
    event.preventDefault();
    if (!selected || !form.contactName.trim() || !form.contactPhone.trim() || (form.fulfillment === 'delivery' && !form.deliveryAddress.trim())) {
      setUi((current) => ({ ...current, error: isArabic ? 'أكمل بيانات الطلب واختر صيدلية.' : 'Complete the order details and choose a pharmacy.' }));
      return;
    }

    setUi((current) => ({ ...current, submitting: true, error: '' }));
    try {
      await medoraApi.checkoutOrder({
        pharmacyId: selected.pharmacyId,
        prescriptionId: rx.rawId,
        fulfillment: form.fulfillment,
        contactName: form.contactName.trim(),
        contactPhone: form.contactPhone.trim(),
        deliveryAddress: form.fulfillment === 'delivery' ? form.deliveryAddress.trim() : null,
        items: items.map((item) => ({ medicineId: item.medicineId, quantity: item.quantity })),
      });
      onCompleted(selected.pharmacyId);
    } catch (error) {
      setUi((current) => ({ ...current, submitting: false, error: error.message || 'Unable to create order' }));
    }
  };

  return (
    <div className="medora-modal-overlay medora-modal-overlay--sheet" dir={isArabic ? 'rtl' : 'ltr'} onClick={onClose}>
      <form onSubmit={submitOrder} onClick={(event) => event.stopPropagation()} className="medora-modal-panel medora-modal-panel--lg" role="dialog" aria-modal="true">
        <div className="medora-modal-header flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[#14b8a6]"><ShoppingBag size={17} /><span className="text-xs font-extrabold">{text(COPY.orderMedicines)}</span></div>
            <h2 className="mt-1 text-base font-black text-[#084036]">{rx.id}</h2>
            <p className="mt-1 text-xs text-slate-500">{isArabic ? 'اختر صيدلية يتوفر لديها كامل العلاج.' : 'Choose a pharmacy with your full prescription in stock.'}</p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#e4eeee] text-[#295d60]" aria-label={isArabic ? 'إغلاق' : 'Close'}><X size={15} /></button>
        </div>

        <div className="medora-modal-body space-y-4">
          {ui.error && <div className="rounded-xl bg-red-50 px-3 py-3 text-xs font-bold leading-6 text-red-700">{ui.error}</div>}
          {ui.notice && <div className="rounded-xl bg-amber-50 px-3 py-3 text-xs font-bold leading-6 text-amber-700">{ui.notice}</div>}
          {ui.loading ? (
            <div className="flex justify-center py-12"><span className="h-7 w-7 animate-spin rounded-full border-4 border-[#14b8a6] border-t-transparent" /></div>
          ) : !ui.error && (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-black text-[#084036]">{isArabic ? 'الصيدليات المتاحة' : 'Available pharmacies'}</div>
                <button type="button" onClick={() => loadPharmacies(true)} className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0e7c6e]"><MapPin size={12} />{isArabic ? 'رتّب حسب موقعي' : 'Sort by my location'}</button>
              </div>
              {pharmacies.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#cfe4e2] bg-[#f7fbfb] p-5 text-center text-xs font-bold text-[#486466]">{isArabic ? 'لا توجد صيدلية يتوفر لديها كامل العلاج حاليًا.' : 'No pharmacy currently has the complete prescription.'}</div>
              ) : (
                <div className="max-h-56 space-y-2 overflow-y-auto">
                  {pharmacies.map((pharmacy) => {
                    const active = selectedPharmacy === pharmacy.pharmacyId;
                    const distance = Number(pharmacy.distanceKm);
                    return (
                      <button key={pharmacy.pharmacyId} type="button" onClick={() => setSelectedPharmacy(pharmacy.pharmacyId)} className={`w-full rounded-xl border p-3 text-start transition ${active ? 'border-[#14b8a6] bg-[#e6f7f7]' : 'border-[#e4eeee] bg-white'}`}>
                        <div className="flex items-start justify-between gap-2"><span className="text-[13px] font-black text-[#084036]">{pharmacy.pharmacyName}</span><span className="text-[11px] font-extrabold text-[#0e7c6e]">{Number.isFinite(distance) ? `${distance.toFixed(distance < 10 ? 1 : 0)} ${isArabic ? 'كم' : 'km'}` : ''}</span></div>
                        <div className="mt-1 text-[11px] text-slate-500">{[pharmacy.addressLine, pharmacy.cityAr || pharmacy.cityEn].filter(Boolean).join('، ')}</div>
                        <div className="mt-1 text-[11px] font-bold text-[#295d60]">{isArabic ? 'الإجمالي المتوقع: ' : 'Estimated total: '}{Number(pharmacy.subtotal || 0).toFixed(2)} {isArabic ? 'ج.م' : 'EGP'}</div>
                      </button>
                    );
                  })}
                </div>
              )}
              {pharmacies.length > 0 && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block"><span className="mb-1 block text-[11px] font-bold text-[#486466]">{isArabic ? 'الاسم' : 'Name'}</span><input required value={form.contactName} onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))} className="h-10 w-full rounded-xl border border-[#e4eeee] px-3 text-xs outline-none focus:border-[#14b8a6]" /></label>
                    <label className="block"><span className="mb-1 block text-[11px] font-bold text-[#486466]">{isArabic ? 'رقم الهاتف' : 'Phone number'}</span><input required value={form.contactPhone} onChange={(event) => setForm((current) => ({ ...current, contactPhone: event.target.value }))} className="h-10 w-full rounded-xl border border-[#e4eeee] px-3 text-xs outline-none focus:border-[#14b8a6]" /></label>
                  </div>
                  <div className="flex gap-2">
                    {['delivery', 'pickup'].map((value) => <button key={value} type="button" onClick={() => setForm((current) => ({ ...current, fulfillment: value }))} className={`rounded-full px-4 py-2 text-xs font-bold ${form.fulfillment === value ? 'bg-[#14b8a6] text-white' : 'border border-[#e4eeee] text-[#486466]'}`}>{value === 'delivery' ? (isArabic ? 'توصيل' : 'Delivery') : (isArabic ? 'استلام' : 'Pickup')}</button>)}
                  </div>
                  {form.fulfillment === 'delivery' && <label className="block"><span className="mb-1 block text-[11px] font-bold text-[#486466]">{isArabic ? 'عنوان التوصيل' : 'Delivery address'}</span><input required value={form.deliveryAddress} onChange={(event) => setForm((current) => ({ ...current, deliveryAddress: event.target.value }))} className="h-10 w-full rounded-xl border border-[#e4eeee] px-3 text-xs outline-none focus:border-[#14b8a6]" /></label>}
                </>
              )}
            </>
          )}
        </div>
        <div className="medora-modal-footer flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full border border-[#e4eeee] px-4 py-2.5 text-xs font-bold text-[#295d60]">{isArabic ? 'إلغاء' : 'Cancel'}</button>
          <button type="submit" disabled={ui.loading || ui.submitting || !selected || pharmacies.length === 0} className="inline-flex items-center gap-2 rounded-full bg-[#14b8a6] px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50"><ShoppingBag size={14} />{ui.submitting ? '...' : (isArabic ? 'تأكيد الطلب' : 'Place order')}</button>
        </div>
      </form>
    </div>
  );
}
