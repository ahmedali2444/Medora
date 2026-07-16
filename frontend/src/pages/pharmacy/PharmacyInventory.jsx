import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Boxes, DollarSign, ScanSearch as Search, ShieldCheck, Edit2, Trash2, Download, Printer } from 'lucide-react';
import PharmacyLayout from '../../components/pharmacy/layout/PharmacyLayout';
import SectionCard from '../../components/pharmacy/shared/SectionCard';
import DataTable from '../../components/pharmacy/shared/DataTable';
import StatusPill from '../../components/pharmacy/shared/StatusPill';
import { useLocalizedContent } from '../../hooks/useLocalizedContent';
import {
  formatLocalizedCurrency,
  formatLocalizedDate,
  localizedText,
} from '../../utils/localization';
import {
  STOCK_STATUS_META,
  getInventoryStatus,
} from '../../components/pharmacy/data/pharmacyData';
import { medoraApi } from '../../api/medoraApi';
import { mapPharmacyMedicine } from '../../utils/professionalApiMappers';
import PaginationBar from '../../components/shared/PaginationBar';
import AddMedicineBarcodeModal from '../../components/pharmacy/inventory/AddMedicineBarcodeModal';
import EditMedicineModal from '../../components/pharmacy/inventory/EditMedicineModal';
import { exportToCsv, printToPdf } from '../../utils/exportUtils';

const FILTERS = ['all', 'in-stock', 'low-stock', 'out-of-stock'];
const PAGE_SIZE = 20;

const COPY = {
  title: localizedText('إدارة المخزون', 'Inventory management'),
  subtitle: localizedText('متابعة الكميات المتاحة والتنبيهات والصلاحية', 'Track stock levels, alerts, and expiry dates'),
  totalItems: localizedText('إجمالي الأصناف', 'Total items'),
  stockAlerts: localizedText('تنبيهات المخزون', 'Stock alerts'),
  available: localizedText('متاح', 'Available'),
  inventoryValue: localizedText('قيمة المخزون', 'Inventory value'),
  inventoryList: localizedText('قائمة المخزون', 'Inventory list'),
  itemCount: localizedText('صنف', 'items'),
  searchPlaceholder: localizedText(
    'ابحث باسم الدواء أو الشركة أو التصنيف...',
    'Search by medicine, company, or category...',
  ),
  all: localizedText('الكل', 'All'),
  item: localizedText('الصنف', 'Item'),
  price: localizedText('السعر', 'Price'),
  stock: localizedText('المخزون', 'Stock'),
  reorder: localizedText('حد إعادة الطلب', 'Reorder level'),
  expiry: localizedText('الصلاحية', 'Expiry'),
  status: localizedText('الحالة', 'Status'),
  actions: localizedText('إجراءات', 'Actions'),
  deleteConfirm: localizedText('هل أنت متأكد من حذف هذا الدواء من مخزونك؟', 'Are you sure you want to remove this medicine from your inventory?'),
};

function StatBox({ label, value, tone, Icon }) {
  const { text } = useLocalizedContent();

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#e4eeee] bg-white p-4 shadow-[0_8px_22px_rgba(41,93,96,0.06)]">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${tone}1a`, color: tone }}>
        {Icon ? <Icon size={16} /> : null}
      </span>
      <div>
        <div className="text-[18px] font-black text-[#084036]">{value}</div>
        <div className="text-[11px] text-[#486466]">{text(label)}</div>
      </div>
    </div>
  );
}

export default function PharmacyInventory() {
  const { lang, text, isRtl } = useLocalizedContent();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [medicines, setMedicines] = useState([]);
  const [ui, setUi] = useState({ loading: true, error: '' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  const fetchMedicines = useCallback(() => {
    setUi((prev) => ({ ...prev, loading: true }));
    medoraApi.pharmacyMedicines({
      page,
      pageSize: PAGE_SIZE,
      search: query.trim() || undefined,
      status: filter,
    })
      .then((data) => {
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        setMedicines(items.map(mapPharmacyMedicine));
        setTotal(Number.isFinite(Number(data?.total)) ? Number(data.total) : items.length);
        setUi({ loading: false, error: '' });
      })
      .catch((error) => {
        setMedicines([]);
        setTotal(0);
        setUi({ loading: false, error: error.message || 'Unable to load inventory' });
      });
  }, [filter, query, page]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchMedicines();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [fetchMedicines]);

  const handleDelete = async (item) => {
    if (window.confirm(text(COPY.deleteConfirm))) {
      try {
        await medoraApi.deletePharmacyMedicine(item.id);
        fetchMedicines();
      } catch (err) {
        alert(err.message || 'Error deleting medicine');
      }
    }
  };

  const items = useMemo(
    () => medicines.map((item) => ({ ...item, status: getInventoryStatus(item) })),
    [medicines],
  );

  const filtered = useMemo(() => {
    return items.slice().sort((a, b) => a.stock - b.stock);
  }, [items]);

  const inventoryValue = items.reduce((sum, item) => sum + item.stock * (item.price ?? 0), 0);

  const columns = [
    {
      key: 'name',
      label: COPY.item,
      width: '1.3fr',
      render: (row) => (
        <div>
          <div className="text-[12px] font-bold text-[#084036]">{text(row.name)}</div>
          <div className="text-[10px] text-slate-500">
            {row.company} - {text(row.category)}
          </div>
        </div>
      ),
    },
    {
      key: 'price',
      label: COPY.price,
      width: '0.7fr',
      align: 'center',
      render: (row) => (
        <span className="text-[12px] font-extrabold text-[#084036]">
          {formatLocalizedCurrency(row.price, lang)}
        </span>
      ),
    },
    {
      key: 'stock',
      label: COPY.stock,
      width: '0.8fr',
      align: 'center',
      render: (row) => (
        <div>
          <div className="text-[12px] font-black text-[#119a8a]">{row.stock}</div>
          <div className="text-[10px] text-slate-400">
            {text(COPY.reorder)}: {row.reorder}
          </div>
        </div>
      ),
    },
    {
      key: 'expiry',
      label: COPY.expiry,
      width: '0.8fr',
      align: 'center',
      render: (row) => <span className="text-[11px] text-slate-600">{formatLocalizedDate(row.expiry, lang)}</span>,
    },
    {
      key: 'status',
      label: COPY.status,
      width: '0.9fr',
      align: 'center',
      render: (row) => <StatusPill meta={STOCK_STATUS_META[row.status]} />,
    },
    {
      key: 'actions',
      label: COPY.actions,
      width: '0.6fr',
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center gap-2">
          <button 
            onClick={() => setEditItem(row)}
            className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-blue-600"
          >
            <Edit2 size={14} />
          </button>
          <button 
            onClick={() => handleDelete(row)}
            className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-red-600"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  const handleExportCsv = () => {
    const headers = [text(COPY.item), text(COPY.price), text(COPY.stock), text(COPY.reorder), text(COPY.expiry), text(COPY.status)];
    const rows = filtered.map(row => [
      text(row.name),
      row.price,
      row.stock,
      row.reorder,
      row.expiry,
      text(STOCK_STATUS_META[row.status]?.label || '')
    ]);
    exportToCsv('inventory_export.csv', headers, rows);
  };

  const handlePrintPdf = () => {
    const headers = [text(COPY.item), text(COPY.price), text(COPY.stock), text(COPY.reorder), text(COPY.expiry), text(COPY.status)];
    const rows = filtered.map(row => [
      text(row.name),
      row.price,
      row.stock,
      row.reorder,
      row.expiry || '-',
      text(STOCK_STATUS_META[row.status]?.label || '')
    ]);
    printToPdf(text(COPY.inventoryList), headers, rows, isRtl ? 'rtl' : 'ltr');
  };

  return (
    <PharmacyLayout title={COPY.title} subtitle={COPY.subtitle}>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatBox label={COPY.totalItems} value={items.length} Icon={Boxes} tone="#14b8a6" />
        <StatBox
          label={COPY.stockAlerts}
          value={items.filter((item) => item.status !== 'in-stock').length}
          Icon={AlertTriangle}
          tone="#ef4444"
        />
        <StatBox
          label={COPY.available}
          value={items.filter((item) => item.status === 'in-stock').length}
          Icon={ShieldCheck}
          tone="#0e7c6e"
        />
        <StatBox
          label={COPY.inventoryValue}
          value={formatLocalizedCurrency(inventoryValue, lang)}
          Icon={DollarSign}
          tone="#6366f1"
        />
      </div>

      <SectionCard
        title={COPY.inventoryList}
        description={`${filtered.length} ${text(COPY.itemCount)}`}
        icon={Boxes}
        action={
          <div className="flex gap-2">
            <button 
              onClick={handlePrintPdf}
              className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
              title="Print PDF"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button 
              onClick={handleExportCsv}
              className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
              title="Export CSV"
            >
              <Download size={14} />
              <span className="hidden sm:inline">CSV</span>
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="rounded-full bg-[#14b8a6] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#0e7c6e]"
            >
              {text(localizedText('+ إضافة صنف', '+ Add Item'))}
            </button>
          </div>
        }
      >
        {ui.error && <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">{ui.error}</div>}
        {ui.loading && <div className="mb-4 rounded-xl bg-[#e6f7f7] px-4 py-3 text-xs font-semibold text-[#0e7c6e]">...</div>}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder={text(COPY.searchPlaceholder)}
              className="h-10 w-full rounded-full border border-[#e4eeee] bg-white pr-9 pl-4 text-[12px] outline-none transition focus:border-[#14b8a6]"
            />
            <Search size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#14b8a6]" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setFilter(tab);
                  setPage(1);
                }}
                className="rounded-full border px-3 py-1.5 text-[11px] font-bold transition"
                style={
                  filter === tab
                    ? { background: '#14b8a6', borderColor: '#14b8a6', color: '#fff' }
                    : { background: '#fff', borderColor: '#e4eeee', color: '#486466' }
                }
              >
                {tab === 'all' ? text(COPY.all) : text(STOCK_STATUS_META[tab]?.label)}
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
            {text(localizedText('لا توجد عناصر مطابقة في المخزون.', 'No matching items in inventory.'))}
          </div>
        )}
      </SectionCard>

      {showAddModal && (
        <AddMedicineBarcodeModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchMedicines(); // Refresh the list
          }}
        />
      )}

      {editItem && (
        <EditMedicineModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSuccess={() => {
            setEditItem(null);
            fetchMedicines();
          }}
        />
      )}
    </PharmacyLayout>
  );
}
