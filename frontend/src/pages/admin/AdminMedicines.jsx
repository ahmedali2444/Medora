import React, { useEffect, useMemo, useState } from 'react';
import { Archive, Edit2, Eye, Pill, Plus, RefreshCw, RotateCcw, ScanSearch as Search } from 'lucide-react';
import AdminLayout from '../../components/admin/layout/AdminLayout';
import SectionCard from '../../components/admin/shared/SectionCard';
import StatusPill from '../../components/admin/shared/StatusPill';
import DataTable from '../../components/admin/shared/DataTable';
import AdminModal from '../../components/admin/shared/AdminModal';
import AdminActionDialog from '../../components/admin/shared/AdminActionDialog';
import { PreviewableImage } from '../../components/admin/shared/ImagePreview';
import { MEDICINE_STATUS_META } from '../../components/admin/data/adminData';
import { useLocalizedContent } from '../../hooks/useLocalizedContent';
import { formatLocalizedNumber, localizedText } from '../../utils/localization';
import { medoraApi } from '../../api/medoraApi';

const PAGE_SIZE = 20;
const STATUS_TABS = ['all', 'active', 'low-stock', 'out-of-stock', 'archived'];

const COPY = {
  title: localizedText('الأدوية', 'Medicines'),
  subtitle: localizedText('إدارة كتالوج الأدوية على المنصة', 'Manage the medicine catalog on the platform'),
  total: localizedText('إجمالي الأدوية', 'Total medicines'),
  active: localizedText('متاح', 'Available'),
  lowStock: localizedText('مخزون منخفض', 'Low stock'),
  outOfStock: localizedText('نفذ المخزون', 'Out of stock'),
  catalog: localizedText('كتالوج الأدوية', 'Medicine catalog'),
  products: localizedText('منتج', 'products'),
  addMedicine: localizedText('إضافة دواء', 'Add medicine'),
  editMedicine: localizedText('تعديل دواء', 'Edit medicine'),
  refresh: localizedText('تحديث', 'Refresh'),
  searchPlaceholder: localizedText('ابحث بالاسم أو المادة الفعالة...', 'Search by medicine name or active ingredient...'),
  all: localizedText('الكل', 'All'),
  medicineCol: localizedText('الدواء', 'Medicine'),
  detailsCol: localizedText('التفاصيل', 'Details'),
  priceCol: localizedText('أقل سعر', 'Lowest price'),
  stockCol: localizedText('المخزون', 'Stock'),
  statusCol: localizedText('الحالة', 'Status'),
  actionsCol: localizedText('إجراءات', 'Actions'),
  edit: localizedText('تعديل', 'Edit'),
  view: localizedText('عرض', 'View'),
  details: localizedText('تفاصيل الدواء', 'Medicine details'),
  delete: localizedText('حذف', 'Delete'),
  archive: localizedText('أرشفة', 'Archive'),
  restore: localizedText('استعادة', 'Restore'),
  bulkArchive: localizedText('أرشفة المحدد', 'Archive selected'),
  bulkRestore: localizedText('استعادة المحدد', 'Restore selected'),
  selected: localizedText('محدد', 'selected'),
  currency: localizedText('ج.م', 'EGP'),
  save: localizedText('حفظ', 'Save'),
  cancel: localizedText('إلغاء', 'Cancel'),
  name: localizedText('اسم الدواء', 'Medicine name'),
  ingredient: localizedText('المادة الفعالة', 'Active ingredient'),
  form: localizedText('الشكل الدوائي', 'Form'),
  strength: localizedText('التركيز', 'Strength'),
  company: localizedText('الشركة', 'Company'),
  category: localizedText('التصنيف', 'Category'),
  symptomsJson: localizedText('الأعراض JSON', 'Symptoms JSON'),
  usagesJson: localizedText('الاستخدامات JSON', 'Usages JSON'),
  warningsJson: localizedText('التحذيرات JSON', 'Warnings JSON'),
  interactionsJson: localizedText('التفاعلات JSON', 'Interactions JSON'),
  dosageAr: localizedText('الجرعة بالعربية', 'Dosage Arabic'),
  dosageEn: localizedText('الجرعة بالإنجليزية', 'Dosage English'),
  imageUrl: localizedText('رابط الصورة', 'Image URL'),
  empty: localizedText('لا توجد أدوية بهذا الفلتر.', 'No medicines match this filter.'),
  archiveTitle: localizedText('أرشفة الدواء؟', 'Archive this medicine?'),
  archiveDesc: localizedText('سيتم إخفاؤه من البحث العام والصيدليات الجديدة مع الاحتفاظ بأي روابط تاريخية.', 'It will be hidden from public search and new pharmacy links while existing history remains.'),
};

const getMedicineStatus = (medicine) => {
  if (medicine.isArchived) return 'archived';
  if ((medicine.stock || 0) <= 0) return 'out-of-stock';
  if ((medicine.stock || 0) <= 20) return 'low-stock';
  return 'active';
};

const EMPTY_FORM = {
  id: null,
  name: '',
  activeIngredient: '',
  form: '',
  strength: '',
  company: '',
  category: '',
  symptomsJson: '',
  usagesJson: '',
  warningsJson: '',
  interactionsJson: '',
  dosageAr: '',
  dosageEn: '',
  imageUrl: '',
};

const MEDICINE_META = {
  ...MEDICINE_STATUS_META,
  archived: { label: localizedText('مؤرشف', 'Archived'), color: '#64748b', bg: '#f1f5f9' },
};

export default function AdminMedicines() {
  const { lang, text } = useLocalizedContent();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [medicines, setMedicines] = useState([]);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [editor, setEditor] = useState({ open: false, form: EMPTY_FORM });
  const [action, setAction] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);
  const [ui, setUi] = useState({ loading: true, error: '', notice: '' });

  const setError = (message) => setUi((current) => ({ ...current, loading: false, error: message }));
  const setNotice = (message) => {
    setUi((current) => ({ ...current, notice: message }));
    window.clearTimeout(setNotice.timer);
    setNotice.timer = window.setTimeout(() => setUi((current) => ({ ...current, notice: '' })), 2400);
  };

  const loadMedicines = async (nextPage = page) => {
    setUi((current) => ({ ...current, loading: true, error: '' }));
    try {
      const data = await medoraApi.adminMedicines({
        page: nextPage,
        pageSize: PAGE_SIZE,
        search: query,
        status: status === 'all' ? '' : status,
        includeArchived: status === 'archived',
      });
      const mapped = Array.isArray(data?.items)
        ? data.items.map((medicine) => ({
            id: medicine.id,
            name: localizedText(medicine.name || '', medicine.name || ''),
            activeIngredient: medicine.activeIngredient || '',
            form: medicine.form || '',
            strength: medicine.strength || '',
            company: medicine.company || '',
            category: medicine.category || '',
            symptomsJson: medicine.symptomsJson || '',
            usagesJson: medicine.usagesJson || '',
            warningsJson: medicine.warningsJson || '',
            interactionsJson: medicine.interactionsJson || '',
            dosageAr: medicine.dosageAr || '',
            dosageEn: medicine.dosageEn || '',
            imageUrl: medicine.imageUrl || '',
            price: Number(medicine.minPrice || 0),
            stock: medicine.stock || 0,
            isArchived: !!medicine.isArchived,
            status: getMedicineStatus(medicine),
          }))
        : [];

      setMedicines(mapped);
      setTotal(Number(data?.total || mapped.length));
      setSelectedIds([]);
      setUi((current) => ({ ...current, loading: false, error: '' }));
    } catch (error) {
      setMedicines([]);
      setError(error.message || 'Unable to load medicines');
    }
  };

  useEffect(() => {
    queueMicrotask(() => loadMedicines(page));
    return () => {
      if (setNotice.timer) window.clearTimeout(setNotice.timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, query, status]);

  const openCreate = () => setEditor({ open: true, form: EMPTY_FORM });
  const openEdit = (medicine) => setEditor({ open: true, form: { ...medicine } });
  const closeEditor = () => setEditor({ open: false, form: EMPTY_FORM });

  const saveMedicine = async () => {
    try {
      if (editor.form.id) {
        await medoraApi.adminUpdateMedicine(editor.form.id, {
          name: text(editor.form.name),
          activeIngredient: editor.form.activeIngredient,
          form: editor.form.form,
          strength: editor.form.strength,
          company: editor.form.company,
          category: editor.form.category,
          symptomsJson: editor.form.symptomsJson,
          usagesJson: editor.form.usagesJson,
          warningsJson: editor.form.warningsJson,
          interactionsJson: editor.form.interactionsJson,
          dosageAr: editor.form.dosageAr,
          dosageEn: editor.form.dosageEn,
          imageUrl: editor.form.imageUrl,
        });
        setNotice(text(localizedText('تم تحديث الدواء', 'Medicine updated')));
      } else {
        await medoraApi.adminCreateMedicine({
          name: text(editor.form.name),
          activeIngredient: editor.form.activeIngredient,
          form: editor.form.form,
          strength: editor.form.strength,
          company: editor.form.company,
          category: editor.form.category,
          symptomsJson: editor.form.symptomsJson,
          usagesJson: editor.form.usagesJson,
          warningsJson: editor.form.warningsJson,
          interactionsJson: editor.form.interactionsJson,
          dosageAr: editor.form.dosageAr,
          dosageEn: editor.form.dosageEn,
          imageUrl: editor.form.imageUrl,
        });
        setNotice(text(localizedText('تمت إضافة الدواء', 'Medicine added')));
      }

      closeEditor();
      loadMedicines(page);
    } catch (error) {
      setError(error.message || 'Unable to save medicine');
    }
  };

  const archiveMedicine = async (reason) => {
    if (!action?.medicine) return;
    try {
      await medoraApi.adminArchiveMedicine(action.medicine.id, reason ? { reason } : {});
      setAction(null);
      setNotice(text(localizedText('تمت أرشفة الدواء', 'Medicine archived')));
      loadMedicines(page);
    } catch (error) {
      setError(error.message || 'Unable to archive medicine');
    }
  };

  const restoreMedicine = async (medicineId) => {
    try {
      await medoraApi.adminRestoreMedicine(medicineId);
      setNotice(text(localizedText('تمت استعادة الدواء', 'Medicine restored')));
      loadMedicines(page);
    } catch (error) {
      setError(error.message || 'Unable to restore medicine');
    }
  };

  const selectedRows = medicines.filter((medicine) => selectedIds.map(String).includes(String(medicine.id)));

  const bulkArchive = async () => {
    const targets = selectedRows.filter((medicine) => medicine.status !== 'archived');
    if (!targets.length) return;
    try {
      await Promise.all(targets.map((medicine) => medoraApi.adminArchiveMedicine(medicine.id, {})));
      setSelectedIds([]);
      setNotice(text(localizedText('تمت أرشفة الأدوية المحددة', 'Selected medicines archived')));
      loadMedicines(page);
    } catch (error) {
      setError(error.message || 'Unable to archive selected medicines');
    }
  };

  const bulkRestore = async () => {
    const targets = selectedRows.filter((medicine) => medicine.status === 'archived');
    if (!targets.length) return;
    try {
      await Promise.all(targets.map((medicine) => medoraApi.adminRestoreMedicine(medicine.id)));
      setSelectedIds([]);
      setNotice(text(localizedText('تمت استعادة الأدوية المحددة', 'Selected medicines restored')));
      loadMedicines(page);
    } catch (error) {
      setError(error.message || 'Unable to restore selected medicines');
    }
  };

  const filtered = useMemo(() => {
    return medicines;
  }, [medicines]);

  const columns = [
    {
      key: 'name',
      label: COPY.medicineCol,
      width: '1.3fr',
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.imageUrl ? (
            <PreviewableImage
              src={row.imageUrl}
              alt={text(row.name)}
              className="h-10 w-10 rounded-xl border border-[#e4eeee] object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e6f7f7] text-[#14b8a6]">
              <Pill size={15} />
            </div>
          )}
          <div className="text-start">
            <div className="text-[12px] font-extrabold text-[#084036]">{text(row.name)}</div>
            <div className="text-[10px] text-slate-500">{row.activeIngredient}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'details',
      label: COPY.detailsCol,
      width: '1fr',
      render: (row) => (
        <span className="text-[11px] text-slate-600">
          {row.form} · {row.strength}
        </span>
      ),
    },
    {
      key: 'price',
      label: COPY.priceCol,
      width: '0.8fr',
      align: 'center',
      render: (row) => (
        <span className="text-[12px] font-extrabold text-[#084036]">
          {row.price > 0 ? `${formatLocalizedNumber(row.price, lang)} ${text(COPY.currency)}` : '—'}
        </span>
      ),
    },
    {
      key: 'stock',
      label: COPY.stockCol,
      width: '0.7fr',
      align: 'center',
      render: (row) => (
        <span
          className="text-[12px] font-extrabold"
          style={{ color: row.stock === 0 ? '#c2362f' : row.stock <= 20 ? '#a35a00' : '#0e7c6e' }}
        >
          {formatLocalizedNumber(row.stock, lang)}
        </span>
      ),
    },
    {
      key: 'status',
      label: COPY.statusCol,
      width: '0.9fr',
      align: 'center',
      render: (row) => <StatusPill meta={MEDICINE_META[row.status]} />,
    },
    {
      key: 'actions',
      label: COPY.actionsCol,
      width: '0.8fr',
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => setSelectedMedicine(row)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#e4eeee] bg-white text-[#2465b6] transition hover:border-[#14b8a6]"
            title={text(COPY.view)}
          >
            <Eye size={11} />
          </button>
          <button
            type="button"
            onClick={() => openEdit(row)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#e4eeee] bg-white text-[#295d60] transition hover:border-[#14b8a6]"
            title={text(COPY.edit)}
          >
            <Edit2 size={11} />
          </button>
          {row.status === 'archived' ? (
            <button
              type="button"
              onClick={() => restoreMedicine(row.id)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#e4eeee] bg-white text-[#0e7c6e] transition hover:border-[#14b8a6]"
              title={text(COPY.restore)}
            >
              <RotateCcw size={11} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setAction({ type: 'archive', medicine: row })}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#e4eeee] bg-white text-[#c2362f] transition hover:border-[#ef4444]"
              title={text(COPY.archive)}
            >
              <Archive size={11} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminLayout title={COPY.title} subtitle={COPY.subtitle}>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatBox label={COPY.total} value={medicines.length} tone="#14b8a6" />
        <StatBox label={COPY.active} value={medicines.filter((medicine) => medicine.status === 'active').length} tone="#0e7c6e" />
        <StatBox label={COPY.lowStock} value={medicines.filter((medicine) => medicine.status === 'low-stock').length} tone="#a35a00" />
        <StatBox label={COPY.outOfStock} value={medicines.filter((medicine) => medicine.status === 'out-of-stock').length} tone="#c2362f" />
      </div>

      <SectionCard
        title={COPY.catalog}
        description={`${formatLocalizedNumber(filtered.length, lang)} ${text(COPY.products)}`}
        icon={Pill}
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => loadMedicines(page)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#d7ece8] bg-white px-4 py-2 text-[12px] font-bold text-[#119a8a] transition hover:border-[#14b8a6]"
            >
              <RefreshCw size={13} />
              {text(COPY.refresh)}
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#14b8a6] px-4 py-2 text-[12px] font-bold text-white shadow-[0_8px_20px_rgba(20,184,166,0.3)] transition hover:bg-[#119a8a]"
            >
              <Plus size={13} />
              {text(COPY.addMedicine)}
            </button>
          </div>
        }
      >
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setPage(1);
                setQuery(e.target.value);
              }}
              placeholder={text(COPY.searchPlaceholder)}
              className="h-10 w-full rounded-full border border-[#e4eeee] bg-white pr-9 pl-4 text-[12px] outline-none transition focus:border-[#14b8a6]"
            />
            <Search size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#14b8a6]" />
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setPage(1);
                setStatus(tab);
              }}
              className="rounded-full border px-3 py-1.5 text-[11px] font-bold transition"
              style={
                status === tab
                  ? { background: '#14b8a6', borderColor: '#14b8a6', color: '#ffffff' }
                  : { background: '#ffffff', borderColor: '#e4eeee', color: '#486466' }
              }
            >
              {tab === 'all' ? text(COPY.all) : text(MEDICINE_META[tab]?.label)}
            </button>
          ))}
        </div>

        {selectedRows.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#d7ece8] bg-[#f7fbfb] px-3 py-3">
            <div className="text-[12px] font-extrabold text-[#084036]">
              {formatLocalizedNumber(selectedRows.length, lang)} {text(COPY.selected)}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={bulkArchive} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-[11px] font-bold text-red-700">
                <Archive size={13} /> {text(COPY.bulkArchive)}
              </button>
              <button type="button" onClick={bulkRestore} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-[11px] font-bold text-emerald-700">
                <RotateCcw size={13} /> {text(COPY.bulkRestore)}
              </button>
            </div>
          </div>
        )}

        <DataTable
          columns={columns}
          rows={filtered}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          empty={text(COPY.empty)}
          loading={ui.loading}
          error={ui.error}
          pagination={{
            page,
            totalPages: Math.max(Math.ceil(total / PAGE_SIZE), 1),
            onPageChange: setPage,
          }}
        />
        {ui.notice && <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">{ui.notice}</div>}
      </SectionCard>

      <AdminModal
        open={!!selectedMedicine}
        title={COPY.details}
        description={selectedMedicine ? text(selectedMedicine.name) : ''}
        onClose={() => setSelectedMedicine(null)}
      >
        {selectedMedicine && (
          <div className="grid gap-3 sm:grid-cols-2">
            {selectedMedicine.imageUrl && (
              <div className="sm:col-span-2">
                <PreviewableImage
                  src={selectedMedicine.imageUrl}
                  alt={text(selectedMedicine.name)}
                  className="max-h-56 w-full rounded-2xl border border-[#e4eeee] bg-[#f8fbfb] object-contain"
                />
              </div>
            )}
            <DetailCard label={COPY.name} value={text(selectedMedicine.name)} />
            <DetailCard label={COPY.ingredient} value={selectedMedicine.activeIngredient || '—'} />
            <DetailCard label={COPY.form} value={selectedMedicine.form || '—'} />
            <DetailCard label={COPY.strength} value={selectedMedicine.strength || '—'} />
            <DetailCard label={COPY.company} value={selectedMedicine.company || '—'} />
            <DetailCard label={COPY.category} value={selectedMedicine.category || '—'} />
            <DetailCard label={COPY.dosageAr} value={selectedMedicine.dosageAr || '—'} />
            <DetailCard label={COPY.dosageEn} value={selectedMedicine.dosageEn || '—'} />
            <DetailCard label={COPY.priceCol} value={selectedMedicine.price > 0 ? `${formatLocalizedNumber(selectedMedicine.price, lang)} ${text(COPY.currency)}` : '—'} />
            <DetailCard label={COPY.stockCol} value={formatLocalizedNumber(selectedMedicine.stock || 0, lang)} />
            <DetailCard label={COPY.statusCol} value={text(MEDICINE_META[selectedMedicine.status]?.label)} />
            <DetailCard label={localizedText('المعرّف', 'ID')} value={`#${selectedMedicine.id}`} />
          </div>
        )}
      </AdminModal>

      <AdminModal
        open={editor.open}
        title={editor.form.id ? COPY.editMedicine : COPY.addMedicine}
        onClose={closeEditor}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeEditor}
              className="rounded-full border border-[#e4eeee] bg-white px-4 py-2 text-[12px] font-bold text-[#486466]"
            >
              {text(COPY.cancel)}
            </button>
            <button
              type="button"
              onClick={saveMedicine}
              className="rounded-full bg-[#14b8a6] px-4 py-2 text-[12px] font-bold text-white"
            >
              {text(COPY.save)}
            </button>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={COPY.name} value={text(editor.form.name)} onChange={(value) => setEditor((current) => ({ ...current, form: { ...current.form, name: value } }))} />
          <Field label={COPY.ingredient} value={editor.form.activeIngredient} onChange={(value) => setEditor((current) => ({ ...current, form: { ...current.form, activeIngredient: value } }))} />
          <Field label={COPY.form} value={editor.form.form} onChange={(value) => setEditor((current) => ({ ...current, form: { ...current.form, form: value } }))} />
          <Field label={COPY.strength} value={editor.form.strength} onChange={(value) => setEditor((current) => ({ ...current, form: { ...current.form, strength: value } }))} />
          <Field label={COPY.company} value={editor.form.company} onChange={(value) => setEditor((current) => ({ ...current, form: { ...current.form, company: value } }))} />
          <Field label={COPY.category} value={editor.form.category} onChange={(value) => setEditor((current) => ({ ...current, form: { ...current.form, category: value } }))} />
          <Field label={COPY.symptomsJson} value={editor.form.symptomsJson} onChange={(value) => setEditor((current) => ({ ...current, form: { ...current.form, symptomsJson: value } }))} />
          <Field label={COPY.usagesJson} value={editor.form.usagesJson} onChange={(value) => setEditor((current) => ({ ...current, form: { ...current.form, usagesJson: value } }))} />
          <Field label={COPY.warningsJson} value={editor.form.warningsJson} onChange={(value) => setEditor((current) => ({ ...current, form: { ...current.form, warningsJson: value } }))} />
          <Field label={COPY.interactionsJson} value={editor.form.interactionsJson} onChange={(value) => setEditor((current) => ({ ...current, form: { ...current.form, interactionsJson: value } }))} />
          <Field label={COPY.dosageAr} value={editor.form.dosageAr} onChange={(value) => setEditor((current) => ({ ...current, form: { ...current.form, dosageAr: value } }))} />
          <Field label={COPY.dosageEn} value={editor.form.dosageEn} onChange={(value) => setEditor((current) => ({ ...current, form: { ...current.form, dosageEn: value } }))} />
          <div className="sm:col-span-2">
            <Field label={COPY.imageUrl} value={editor.form.imageUrl} onChange={(value) => setEditor((current) => ({ ...current, form: { ...current.form, imageUrl: value } }))} />
            {editor.form.imageUrl && (
              <PreviewableImage
                src={editor.form.imageUrl}
                alt={text(editor.form.name) || text(COPY.medicineCol)}
                className="mt-3 h-44 w-full rounded-2xl border border-[#e4eeee] bg-[#f8fbfb] object-contain"
              />
            )}
          </div>
        </div>
      </AdminModal>

      <AdminActionDialog
        open={action?.type === 'archive'}
        title={COPY.archiveTitle}
        description={COPY.archiveDesc}
        confirmLabel={COPY.archive}
        requiresReason
        onClose={() => setAction(null)}
        onConfirm={archiveMedicine}
      />
    </AdminLayout>
  );
}

function Field({ label, value, onChange }) {
  const { text } = useLocalizedContent();

  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-extrabold text-[#486466]">{text(label)}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-xl border border-[#e4eeee] bg-white px-3 text-[12px] text-[#084036] outline-none transition focus:border-[#14b8a6]"
      />
    </label>
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

function StatBox({ label, value, tone }) {
  const { lang, text } = useLocalizedContent();

  return (
    <div className="rounded-2xl border border-[#e4eeee] bg-white p-4 shadow-[0_8px_22px_rgba(41,93,96,0.06)]">
      <div className="mb-2 h-1 w-10 rounded-full" style={{ background: tone }} />
      <div className="text-[22px] font-black text-[#084036]">{formatLocalizedNumber(value, lang)}</div>
      <div className="text-[11px] text-[#486466]">{text(label)}</div>
    </div>
  );
}
