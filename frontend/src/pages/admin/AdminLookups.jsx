import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Archive, Database, Download, Edit2, Eye, MapPinned, Plus, RotateCcw, ScanSearch as Search, Stethoscope } from 'lucide-react';
import AdminLayout from '../../components/admin/layout/AdminLayout';
import SectionCard from '../../components/admin/shared/SectionCard';
import DataTable from '../../components/admin/shared/DataTable';
import StatusPill from '../../components/admin/shared/StatusPill';
import AdminModal from '../../components/admin/shared/AdminModal';
import AdminActionDialog from '../../components/admin/shared/AdminActionDialog';
import { useLocalizedContent } from '../../hooks/useLocalizedContent';
import { formatLocalizedNumber, localizedText } from '../../utils/localization';
import { triggerBrowserDownload } from '../../utils/download';
import { medoraApi } from '../../api/medoraApi';

const PAGE_SIZE = 20;
const OPTION_PAGE_SIZE = 100;
const TABS = ['specialties', 'governorates', 'cities'];
const STATUS_TABS = ['all', 'active', 'archived'];

const STATUS_META = {
  active: { label: localizedText('نشط', 'Active'), color: '#0e7c6e', bg: '#e6f7f7' },
  archived: { label: localizedText('مؤرشف', 'Archived'), color: '#64748b', bg: '#f1f5f9' },
};

const EMPTY_EDITOR = {
  open: false,
  mode: 'create',
  id: null,
  nameAr: '',
  nameEn: '',
  governorateId: '',
};

const COPY = {
  title: localizedText('القوائم الأساسية', 'Core lookups'),
  subtitle: localizedText('إدارة التخصصات والمحافظات والمدن التي تعتمد عليها المنصة', 'Manage specialties, governorates, and cities used across the platform'),
  specialties: localizedText('التخصصات', 'Specialties'),
  governorates: localizedText('المحافظات', 'Governorates'),
  cities: localizedText('المدن', 'Cities'),
  total: localizedText('الإجمالي', 'Total'),
  linked: localizedText('مرتبط', 'Linked'),
  archived: localizedText('مؤرشف', 'Archived'),
  add: localizedText('إضافة', 'Add'),
  edit: localizedText('تعديل', 'Edit'),
  view: localizedText('عرض', 'View'),
  details: localizedText('تفاصيل العنصر', 'Item details'),
  save: localizedText('حفظ', 'Save'),
  cancel: localizedText('إلغاء', 'Cancel'),
  archive: localizedText('أرشفة', 'Archive'),
  restore: localizedText('استعادة', 'Restore'),
  bulkArchive: localizedText('أرشفة المحدد', 'Archive selected'),
  bulkRestore: localizedText('استعادة المحدد', 'Restore selected'),
  selected: localizedText('محدد', 'selected'),
  export: localizedText('تصدير', 'Export'),
  all: localizedText('الكل', 'All'),
  active: localizedText('نشط', 'Active'),
  nameAr: localizedText('الاسم بالعربية', 'Arabic name'),
  nameEn: localizedText('الاسم بالإنجليزية', 'English name'),
  governorate: localizedText('المحافظة', 'Governorate'),
  name: localizedText('الاسم', 'Name'),
  counts: localizedText('الاستخدام', 'Usage'),
  status: localizedText('الحالة', 'Status'),
  actions: localizedText('إجراءات', 'Actions'),
  doctors: localizedText('أطباء', 'doctors'),
  citiesCount: localizedText('مدن', 'cities'),
  pharmacies: localizedText('صيدليات', 'pharmacies'),
  clinics: localizedText('عيادات', 'clinics'),
  searchPlaceholder: localizedText('ابحث بالاسم العربي أو الإنجليزي...', 'Search by Arabic or English name...'),
  empty: localizedText('لا توجد عناصر بهذا الفلتر.', 'No lookup items match this filter.'),
  archiveTitle: localizedText('أرشفة العنصر؟', 'Archive item?'),
  archiveDesc: localizedText('قد لا تتم الأرشفة إذا كان العنصر مرتبطًا ببيانات تشغيلية.', 'Archiving may be unavailable when the item is linked to operational data.'),
};

const getStatus = (row) => (row.isArchived ? 'archived' : 'active');

export default function AdminLookups() {
  const { lang, text } = useLocalizedContent();
  const [tab, setTab] = useState('specialties');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [governorates, setGovernorates] = useState([]);
  const [editor, setEditor] = useState(EMPTY_EDITOR);
  const [action, setAction] = useState(null);
  const [ui, setUi] = useState({ loading: true, actionLoading: false, error: '', notice: '' });

  const setError = (message) => setUi((current) => ({ ...current, loading: false, actionLoading: false, error: message }));
  const setNotice = useCallback((message) => {
    setUi((current) => ({ ...current, notice: message }));
    window.clearTimeout(setNotice.timer);
    setNotice.timer = window.setTimeout(() => setUi((current) => ({ ...current, notice: '' })), 2600);
  }, []);

  const loadGovernorateOptions = useCallback(async () => {
    try {
      const data = await medoraApi.adminGovernorates({ page: 1, pageSize: OPTION_PAGE_SIZE, status: 'active' });
      setGovernorates(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setGovernorates([]);
    }
  }, []);

  const loadItems = useCallback(async () => {
    setUi((current) => ({ ...current, loading: true, error: '' }));
    try {
      const params = {
        page,
        pageSize: PAGE_SIZE,
        search: query,
        status: status === 'all' ? '' : status,
        includeArchived: status === 'all' || status === 'archived',
      };
      const data = tab === 'specialties'
        ? await medoraApi.adminSpecialties(params)
        : tab === 'governorates'
          ? await medoraApi.adminGovernorates(params)
          : await medoraApi.adminCities(params);

      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number(data?.total || 0));
      setSelectedIds([]);
      setUi((current) => ({ ...current, loading: false, error: '' }));
    } catch (error) {
      setItems([]);
      setTotal(0);
      setError(error.message || 'Unable to load lookups');
    }
  }, [page, query, status, tab]);

  useEffect(() => {
    queueMicrotask(() => {
      loadItems();
      loadGovernorateOptions();
    });
    return () => {
      if (setNotice.timer) window.clearTimeout(setNotice.timer);
    };
  }, [loadGovernorateOptions, loadItems, setNotice]);

  const resetFilters = (nextTab) => {
    setTab(nextTab);
    setPage(1);
    setStatus('all');
    setQuery('');
    setEditor(EMPTY_EDITOR);
    setAction(null);
  };

  const openCreate = () => setEditor({ ...EMPTY_EDITOR, open: true, mode: 'create', governorateId: tab === 'cities' ? `${governorates[0]?.id || ''}` : '' });
  const openEdit = (item) => setEditor({
    open: true,
    mode: 'edit',
    id: item.id,
    nameAr: item.nameAr || '',
    nameEn: item.nameEn || '',
    governorateId: item.governorateId ? `${item.governorateId}` : '',
  });

  const saveLookup = async () => {
    setUi((current) => ({ ...current, actionLoading: true, error: '' }));
    try {
      if (tab === 'specialties') {
        const payload = { nameAr: editor.nameAr, nameEn: editor.nameEn };
        if (editor.mode === 'create') await medoraApi.adminCreateSpecialty(payload);
        else await medoraApi.adminUpdateSpecialty(editor.id, payload);
      }

      if (tab === 'governorates') {
        const payload = { nameAr: editor.nameAr, nameEn: editor.nameEn };
        if (editor.mode === 'create') await medoraApi.adminCreateGovernorate(payload);
        else await medoraApi.adminUpdateGovernorate(editor.id, payload);
      }

      if (tab === 'cities') {
        const governorateId = Number(editor.governorateId);
        const payload = { nameAr: editor.nameAr, nameEn: editor.nameEn, governorateId };
        if (editor.mode === 'create') await medoraApi.adminCreateCity(governorateId, { nameAr: editor.nameAr, nameEn: editor.nameEn });
        else await medoraApi.adminUpdateCity(editor.id, payload);
      }

      setEditor(EMPTY_EDITOR);
      setNotice(text(editor.mode === 'create' ? localizedText('تمت إضافة العنصر', 'Lookup item created') : localizedText('تم تحديث العنصر', 'Lookup item updated')));
      await loadItems();
      await loadGovernorateOptions();
    } catch (error) {
      setError(error.message || 'Unable to save lookup item');
    } finally {
      setUi((current) => ({ ...current, actionLoading: false }));
    }
  };

  const archiveLookup = async (reason) => {
    if (!action?.item) return;
    setUi((current) => ({ ...current, actionLoading: true, error: '' }));
    try {
      const payload = reason ? { reason } : {};
      if (tab === 'specialties') await medoraApi.adminArchiveSpecialty(action.item.id, payload);
      if (tab === 'governorates') await medoraApi.adminArchiveGovernorate(action.item.id, payload);
      if (tab === 'cities') await medoraApi.adminArchiveCity(action.item.id, payload);
      setAction(null);
      setNotice(text(localizedText('تمت أرشفة العنصر', 'Lookup item archived')));
      await loadItems();
      await loadGovernorateOptions();
    } catch (error) {
      setError(error.message || 'Unable to archive lookup item');
    } finally {
      setUi((current) => ({ ...current, actionLoading: false }));
    }
  };

  const restoreLookup = async (item) => {
    try {
      if (tab === 'specialties') await medoraApi.adminRestoreSpecialty(item.id);
      if (tab === 'governorates') await medoraApi.adminRestoreGovernorate(item.id);
      if (tab === 'cities') await medoraApi.adminRestoreCity(item.id);
      setNotice(text(localizedText('تمت استعادة العنصر', 'Lookup item restored')));
      await loadItems();
      await loadGovernorateOptions();
    } catch (error) {
      setError(error.message || 'Unable to restore lookup item');
    }
  };

  const archiveLookupItem = async (item, payload = {}) => {
    if (tab === 'specialties') await medoraApi.adminArchiveSpecialty(item.id, payload);
    if (tab === 'governorates') await medoraApi.adminArchiveGovernorate(item.id, payload);
    if (tab === 'cities') await medoraApi.adminArchiveCity(item.id, payload);
  };

  const restoreLookupItem = async (item) => {
    if (tab === 'specialties') await medoraApi.adminRestoreSpecialty(item.id);
    if (tab === 'governorates') await medoraApi.adminRestoreGovernorate(item.id);
    if (tab === 'cities') await medoraApi.adminRestoreCity(item.id);
  };

  const selectedRows = items.filter((item) => selectedIds.map(String).includes(String(item.id)));

  const bulkArchive = async () => {
    const targets = selectedRows.filter((item) => !item.isArchived);
    if (!targets.length) return;
    setUi((current) => ({ ...current, actionLoading: true, error: '' }));
    try {
      await Promise.all(targets.map((item) => archiveLookupItem(item, {})));
      setSelectedIds([]);
      setNotice(text(localizedText('تمت أرشفة العناصر المحددة', 'Selected lookup items archived')));
      await loadItems();
      await loadGovernorateOptions();
    } catch (error) {
      setError(error.message || 'Unable to archive selected lookup items');
    } finally {
      setUi((current) => ({ ...current, actionLoading: false }));
    }
  };

  const bulkRestore = async () => {
    const targets = selectedRows.filter((item) => item.isArchived);
    if (!targets.length) return;
    setUi((current) => ({ ...current, actionLoading: true, error: '' }));
    try {
      await Promise.all(targets.map((item) => restoreLookupItem(item)));
      setSelectedIds([]);
      setNotice(text(localizedText('تمت استعادة العناصر المحددة', 'Selected lookup items restored')));
      await loadItems();
      await loadGovernorateOptions();
    } catch (error) {
      setError(error.message || 'Unable to restore selected lookup items');
    } finally {
      setUi((current) => ({ ...current, actionLoading: false }));
    }
  };

  const exportLookups = async () => {
    try {
      triggerBrowserDownload(await medoraApi.adminExportLookups());
      setNotice(text(localizedText('تم تنزيل ملف القوائم', 'Lookups export downloaded')));
    } catch (error) {
      setError(error.message || 'Unable to export lookups');
    }
  };

  const linkedCount = useMemo(() => items.reduce((sum, item) => {
    if (tab === 'specialties') return sum + (item.doctorsCount || 0);
    if (tab === 'governorates') return sum + (item.citiesCount || 0) + (item.pharmaciesCount || 0) + (item.clinicsCount || 0);
    return sum + (item.pharmaciesCount || 0) + (item.clinicsCount || 0);
  }, 0), [items, tab]);

  const columns = [
    {
      key: 'nameAr',
      label: COPY.name,
      width: '1.2fr',
      render: (row) => (
        <div>
          <div className="text-[12px] font-extrabold text-[#084036]">{row.nameAr}</div>
          <div className="text-[10px] text-slate-500">{row.nameEn || '-'}</div>
        </div>
      ),
    },
    ...(tab === 'cities'
      ? [{
          key: 'governorate',
          label: COPY.governorate,
          width: '1fr',
          render: (row) => <span className="text-[11px] font-bold text-[#486466]">{lang === 'ar' ? row.governorateAr : row.governorateEn}</span>,
        }]
      : []),
    {
      key: 'counts',
      label: COPY.counts,
      width: '1.2fr',
      align: 'center',
      render: (row) => <UsageSummary row={row} tab={tab} />,
    },
    {
      key: 'status',
      label: COPY.status,
      width: '0.8fr',
      align: 'center',
      render: (row) => <StatusPill meta={STATUS_META[getStatus(row)]} />,
    },
    {
      key: 'actions',
      label: COPY.actions,
      width: '0.9fr',
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <IconButton title={COPY.view} onClick={() => setSelectedItem(row)} tone="#2465b6" Icon={Eye} />
          <IconButton title={COPY.edit} onClick={() => openEdit(row)} tone="#295d60" Icon={Edit2} />
          {row.isArchived ? (
            <IconButton title={COPY.restore} onClick={() => restoreLookup(row)} tone="#0e7c6e" Icon={RotateCcw} />
          ) : (
            <IconButton title={COPY.archive} onClick={() => setAction({ item: row })} tone="#c2362f" Icon={Archive} />
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminLayout title={COPY.title} subtitle={COPY.subtitle}>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatBox label={COPY.total} value={total} tone="#14b8a6" Icon={Database} />
        <StatBox label={COPY.linked} value={linkedCount} tone="#6366f1" Icon={tab === 'specialties' ? Stethoscope : MapPinned} />
        <StatBox label={COPY.archived} value={items.filter((item) => item.isArchived).length} tone="#64748b" Icon={Archive} />
        <StatBox label={COPY[tab]} value={items.length} tone="#f59e0b" Icon={Database} />
      </div>

      <SectionCard
        title={COPY[tab]}
        description={`${formatLocalizedNumber(total, lang)} ${text(COPY.total)}`}
        icon={Database}
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportLookups}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#d7ece8] bg-white px-4 py-2 text-[12px] font-bold text-[#119a8a] transition hover:border-[#14b8a6]"
            >
              <Download size={13} />
              {text(COPY.export)}
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#14b8a6] px-4 py-2 text-[12px] font-bold text-white shadow-[0_8px_20px_rgba(20,184,166,0.3)] transition hover:bg-[#119a8a]"
            >
              <Plus size={13} />
              {text(COPY.add)}
            </button>
          </div>
        }
      >
        <div className="mb-4 flex flex-wrap gap-1.5">
          {TABS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => resetFilters(item)}
              className="rounded-full border px-3 py-1.5 text-[11px] font-bold transition"
              style={tab === item ? { background: '#084036', borderColor: '#084036', color: '#ffffff' } : { background: '#ffffff', borderColor: '#e4eeee', color: '#486466' }}
            >
              {text(COPY[item])}
            </button>
          ))}
        </div>

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
            {STATUS_TABS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setPage(1);
                  setStatus(item);
                }}
                className="rounded-full border px-3 py-1.5 text-[11px] font-bold transition"
                style={status === item ? { background: '#14b8a6', borderColor: '#14b8a6', color: '#ffffff' } : { background: '#ffffff', borderColor: '#e4eeee', color: '#486466' }}
              >
                {text(COPY[item])}
              </button>
            ))}
          </div>
        </div>

        {selectedRows.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#d7ece8] bg-[#f7fbfb] px-3 py-3">
            <div className="text-[12px] font-extrabold text-[#084036]">
              {formatLocalizedNumber(selectedRows.length, lang)} {text(COPY.selected)}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={ui.actionLoading} onClick={bulkArchive} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-[11px] font-bold text-red-700 disabled:opacity-60">
                <Archive size={13} /> {text(COPY.bulkArchive)}
              </button>
              <button type="button" disabled={ui.actionLoading} onClick={bulkRestore} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-[11px] font-bold text-emerald-700 disabled:opacity-60">
                <RotateCcw size={13} /> {text(COPY.bulkRestore)}
              </button>
            </div>
          </div>
        )}

        <DataTable
          columns={columns}
          rows={items}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          empty={text(COPY.empty)}
          loading={ui.loading}
          error={ui.error}
          pagination={{ page, totalPages: Math.max(Math.ceil(total / PAGE_SIZE), 1), onPageChange: setPage }}
        />
        {ui.notice && <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">{ui.notice}</div>}
      </SectionCard>

      <AdminModal
        open={!!selectedItem}
        title={COPY.details}
        description={selectedItem ? selectedItem.nameAr : COPY[tab]}
        onClose={() => setSelectedItem(null)}
      >
        {selectedItem && (
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailCard label={COPY.nameAr} value={selectedItem.nameAr || '—'} />
            <DetailCard label={COPY.nameEn} value={selectedItem.nameEn || '—'} />
            {tab === 'cities' && (
              <DetailCard label={COPY.governorate} value={lang === 'ar' ? selectedItem.governorateAr || '—' : selectedItem.governorateEn || '—'} />
            )}
            <DetailCard label={COPY.status} value={text(STATUS_META[getStatus(selectedItem)]?.label)} />
            <DetailCard label={localizedText('المعرّف', 'ID')} value={`#${selectedItem.id}`} />
            <div className="rounded-2xl border border-[#eef5f5] bg-[#f8fbfb] p-4 sm:col-span-2">
              <div className="mb-2 text-[11px] font-extrabold text-[#486466]">{text(COPY.counts)}</div>
              <UsageSummary row={selectedItem} tab={tab} />
            </div>
          </div>
        )}
      </AdminModal>

      <AdminModal
        open={editor.open}
        title={editor.mode === 'create' ? COPY.add : COPY.edit}
        description={COPY[tab]}
        onClose={() => setEditor(EMPTY_EDITOR)}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditor(EMPTY_EDITOR)} className="rounded-full border border-[#e4eeee] bg-white px-4 py-2 text-[12px] font-bold text-[#486466]">
              {text(COPY.cancel)}
            </button>
            <button type="button" disabled={ui.actionLoading} onClick={saveLookup} className="rounded-full bg-[#14b8a6] px-4 py-2 text-[12px] font-bold text-white disabled:opacity-60">
              {text(COPY.save)}
            </button>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {tab === 'cities' && (
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-[11px] font-extrabold text-[#486466]">{text(COPY.governorate)}</span>
              <select
                value={editor.governorateId}
                onChange={(event) => setEditor((current) => ({ ...current, governorateId: event.target.value }))}
                className="h-11 rounded-xl border border-[#e4eeee] bg-white px-3 text-[12px] text-[#084036] outline-none transition focus:border-[#14b8a6]"
              >
                <option value="">{text(localizedText('اختر محافظة', 'Choose governorate'))}</option>
                {governorates.map((governorate) => (
                  <option key={governorate.id} value={governorate.id}>
                    {lang === 'ar' ? governorate.nameAr : governorate.nameEn}
                  </option>
                ))}
              </select>
            </label>
          )}
          <Field label={COPY.nameAr} value={editor.nameAr} onChange={(value) => setEditor((current) => ({ ...current, nameAr: value }))} />
          <Field label={COPY.nameEn} value={editor.nameEn} onChange={(value) => setEditor((current) => ({ ...current, nameEn: value }))} />
        </div>
      </AdminModal>

      <AdminActionDialog
        open={!!action}
        title={COPY.archiveTitle}
        description={COPY.archiveDesc}
        confirmLabel={COPY.archive}
        requiresReason
        loading={ui.actionLoading}
        onClose={() => setAction(null)}
        onConfirm={archiveLookup}
      />
    </AdminLayout>
  );
}

function UsageSummary({ row, tab }) {
  const { lang, text } = useLocalizedContent();
  const parts = tab === 'specialties'
    ? [[row.doctorsCount || 0, COPY.doctors]]
    : tab === 'governorates'
      ? [[row.citiesCount || 0, COPY.citiesCount], [row.pharmaciesCount || 0, COPY.pharmacies], [row.clinicsCount || 0, COPY.clinics]]
      : [[row.pharmaciesCount || 0, COPY.pharmacies], [row.clinicsCount || 0, COPY.clinics]];

  return (
    <div className="flex flex-wrap gap-1.5">
      {parts.map(([value, label]) => (
        <span key={text(label)} className="rounded-full bg-[#f7fbfb] px-2 py-1 text-[10px] font-bold text-[#486466]">
          {formatLocalizedNumber(value, lang)} {text(label)}
        </span>
      ))}
    </div>
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

function DetailCard({ label, value }) {
  const { text } = useLocalizedContent();

  return (
    <div className="rounded-2xl border border-[#eef5f5] bg-[#f8fbfb] p-4">
      <div className="mb-1 text-[11px] font-extrabold text-[#486466]">{text(label)}</div>
      <div className="break-words text-[13px] font-bold text-[#084036]">{value}</div>
    </div>
  );
}

function Field({ label, value, onChange }) {
  const { text } = useLocalizedContent();

  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-extrabold text-[#486466]">{text(label)}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-xl border border-[#e4eeee] bg-white px-3 text-[12px] text-[#084036] outline-none transition focus:border-[#14b8a6]"
      />
    </label>
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
