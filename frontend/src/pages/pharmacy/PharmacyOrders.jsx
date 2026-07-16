import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ClipboardList, Eye, Package, ScanSearch as Search, Store, Truck, Download, Printer } from 'lucide-react';
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
  FULFILLMENT_META,
  ORDER_STATUS_META,
} from '../../components/pharmacy/data/pharmacyData';
import { medoraApi } from '../../api/medoraApi';
import { mapOrderStatusForList } from '../../utils/orderStatus';
import { subscribeNotifications } from '../../hooks/useNotificationHub';
import { useNavigate } from 'react-router-dom';
import { exportToCsv, printToPdf } from '../../utils/exportUtils';

const STATUS_TABS = ['all', 'new', 'preparing', 'ready', 'shipping', 'delivered', 'cancelled'];
const ORDERS_PAGE_SIZE = 20;

const COPY = {
  title: localizedText('إدارة الطلبات', 'Order management'),
  subtitle: localizedText('متابعة الطلبات الواردة وتجهيزها وتسليمها', 'Track incoming orders, preparation, and fulfillment'),
  totalOrders: localizedText('إجمالي الطلبات', 'Total orders'),
  inProgress: localizedText('قيد التنفيذ', 'In progress'),
  delivered: localizedText('تم التسليم', 'Delivered'),
  completedRevenue: localizedText('إيراد مكتمل', 'Completed revenue'),
  allOrders: localizedText('كل الطلبات', 'All orders'),
  orderCount: localizedText('طلب', 'orders'),
  searchPlaceholder: localizedText(
    'ابحث برقم الطلب أو اسم العميل أو الهاتف...',
    'Search by order number, customer name, or phone...',
  ),
  all: localizedText('الكل', 'All'),
  orderNumber: localizedText('رقم الطلب', 'Order ID'),
  customer: localizedText('العميل', 'Customer'),
  items: localizedText('العناصر', 'Items'),
  fulfillment: localizedText('التسليم', 'Fulfillment'),
  total: localizedText('الإجمالي', 'Total'),
  status: localizedText('الحالة', 'Status'),
  actions: localizedText('إجراءات', 'Actions'),
};

function StatBox({ label, value, tone, Icon }) {
  const { text } = useLocalizedContent();

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#e4eeee] bg-white p-4 shadow-[0_8px_22px_rgba(41,93,96,0.06)]">
      {Icon && (
        <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${tone}1a`, color: tone }}>
          <Icon size={16} />
        </span>
      )}
      <div>
        <div className="text-[18px] font-black text-[#084036]">{value}</div>
        <div className="text-[11px] text-[#486466]">{text(label)}</div>
      </div>
    </div>
  );
}

export default function PharmacyOrders() {
  const navigate = useNavigate();
  const { lang, text } = useLocalizedContent();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [orders, setOrders] = useState([]);
  const [ui, setUi] = useState({ loading: true, error: '' });
  const totalPages = Math.max(Math.ceil(total / ORDERS_PAGE_SIZE), 1);
  const isRtl = lang === 'ar';

  const handleQueryChange = (value) => {
    setQuery(value);
    setPage(1);
  };

  const handleStatusChange = (value) => {
    setStatus(value);
    setPage(1);
  };

  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (mounted) setUi({ loading: true, error: '' });
    });
    medoraApi.pharmacyOrders({
      page,
      pageSize: ORDERS_PAGE_SIZE,
      status: status === 'all' ? undefined : status,
      search: query.trim() || undefined,
    })
      .then((data) => {
        if (!mounted) return;
        const mapped = Array.isArray(data?.items) ? data.items.map(mapOrder) : [];
        setOrders(mapped);
        setTotal(Number.isFinite(Number(data?.total)) ? Number(data.total) : mapped.length);
        setUi({ loading: false, error: '' });
      })
      .catch((error) => {
        if (!mounted) return;
        setOrders([]);
        setUi({ loading: false, error: error.message || 'Unable to load orders' });
      });

    return () => { mounted = false; };
  }, [page, query, status]);

  const refreshOrders = React.useCallback(async () => {
    try {
      const data = await medoraApi.pharmacyOrders({
        page,
        pageSize: ORDERS_PAGE_SIZE,
        status: status === 'all' ? undefined : status,
        search: query.trim() || undefined,
      });
      const mapped = Array.isArray(data?.items) ? data.items.map(mapOrder) : [];
      setOrders(mapped);
      setTotal(Number.isFinite(Number(data?.total)) ? Number(data.total) : mapped.length);
    } catch (error) {
      console.error('Failed to refresh orders via notification', error);
    }
  }, [page, query, status]);

  useEffect(() => {
    return subscribeNotifications((payload) => {
      if (payload?.type === 'order') {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => {});
        refreshOrders();
      }
    });
  }, [refreshOrders]);

  const filtered = useMemo(() => {
    return orders.slice().sort((a, b) => new Date(b.rawDate || 0) - new Date(a.rawDate || 0));
  }, [orders]);

  const totalRevenue = orders
    .filter((order) => order.status === 'delivered')
    .reduce((sum, order) => sum + order.total, 0);

  const columns = [
    {
      key: 'id',
      label: COPY.orderNumber,
      width: '0.9fr',
      align: 'center',
      render: (row) => (
        <div>
          <div dir="ltr" className="text-[12px] font-extrabold text-[#084036]">{row.id}</div>
          <div className="text-[10px] text-slate-400">
            {formatLocalizedDate(row.date, lang)} - {row.time}
          </div>
        </div>
      ),
    },
    {
      key: 'customer',
      label: COPY.customer,
      width: '1fr',
      render: (row) => (
        <div className="w-full">
          <div className="text-[12px] font-bold text-[#084036]">{text(row.customer)}</div>
          <div dir="ltr" className={`w-full text-[10px] text-slate-500 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{row.phone}</div>
        </div>
      ),
    },
    {
      key: 'items',
      label: COPY.items,
      width: '0.65fr',
      align: 'center',
      render: (row) => <span className="text-[12px] font-bold text-[#119a8a]">{row.items}</span>,
    },
    {
      key: 'fulfillment',
      label: COPY.fulfillment,
      width: '0.9fr',
      align: 'center',
      render: (row) => (
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
          style={{
            background: FULFILLMENT_META[row.fulfillment].bg,
            color: FULFILLMENT_META[row.fulfillment].color,
          }}
        >
          {row.fulfillment === 'delivery' ? <Truck size={10} /> : <Store size={10} />}
          {text(FULFILLMENT_META[row.fulfillment].label)}
        </span>
      ),
    },
    {
      key: 'total',
      label: COPY.total,
      width: '0.7fr',
      align: 'center',
      render: (row) => (
        <span className="text-[12px] font-extrabold text-[#084036]">
          {formatLocalizedCurrency(row.total, lang)}
        </span>
      ),
    },
    {
      key: 'status',
      label: COPY.status,
      width: '0.9fr',
      align: 'center',
      render: (row) => <StatusPill meta={ORDER_STATUS_META[row.status]} />,
    },
    {
      key: 'actions',
      label: COPY.actions,
      width: '0.45fr',
      align: 'center',
      render: (row) => (
        <button
          onClick={() => navigate(`/pharmacy/orders/${row.rawId}`)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#e4eeee] bg-white text-[#295d60] hover:bg-[#e4eeee] transition-colors"
        >
          <Eye size={11} />
        </button>
      ),
    },
  ];

  const handleExportCsv = () => {
    const headers = [text(COPY.orderNumber), text(COPY.customer), text(COPY.items), text(COPY.total), text(COPY.status)];
    const rows = filtered.map(row => [
      row.id,
      text(row.customer),
      row.itemsCount,
      row.total,
      text(ORDER_STATUS_META[row.status]?.label || '')
    ]);
    exportToCsv('orders_export.csv', headers, rows);
  };

  const handlePrintPdf = () => {
    const headers = [text(COPY.orderNumber), text(COPY.customer), text(COPY.items), text(COPY.total), text(COPY.status)];
    const rows = filtered.map(row => [
      row.id,
      text(row.customer),
      row.itemsCount,
      row.total,
      text(ORDER_STATUS_META[row.status]?.label || '')
    ]);
    printToPdf(text(COPY.allOrders), headers, rows, isRtl ? 'rtl' : 'ltr');
  };

  return (
    <PharmacyLayout title={COPY.title} subtitle={COPY.subtitle}>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatBox label={COPY.totalOrders} value={total} Icon={Package} tone="#14b8a6" />
        <StatBox
          label={COPY.inProgress}
          value={orders.filter((order) => ['new', 'preparing', 'ready', 'shipping'].includes(order.status)).length}
          Icon={ClipboardList}
          tone="#6366f1"
        />
        <StatBox
          label={COPY.delivered}
          value={orders.filter((order) => order.status === 'delivered').length}
          Icon={Truck}
          tone="#0e7c6e"
        />
        <StatBox label={COPY.completedRevenue} value={formatLocalizedCurrency(totalRevenue, lang)} tone="#f59e0b" />
      </div>

      <SectionCard
        title={COPY.allOrders}
        description={`${filtered.length} ${text(COPY.orderCount)}${totalPages > 1 ? ` · ${text(localizedText('صفحة', 'Page'))} ${page}/${totalPages}` : ''}`}
        icon={Package}
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
          </div>
        }
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
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => handleStatusChange(tab)}
                className="rounded-full border px-3 py-1.5 text-[11px] font-bold transition"
                style={
                  status === tab
                    ? { background: '#14b8a6', borderColor: '#14b8a6', color: '#fff' }
                    : { background: '#fff', borderColor: '#e4eeee', color: '#486466' }
                }
              >
                {tab === 'all' ? text(COPY.all) : text(ORDER_STATUS_META[tab]?.label)}
              </button>
            ))}
          </div>
        </div>

        {filtered.length > 0 && <DataTable columns={columns} rows={filtered} />}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || ui.loading}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e4eeee] bg-white text-[#295d60] transition hover:border-[#14b8a6] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={text(localizedText('الصفحة السابقة', 'Previous page'))}
            >
              <ChevronDown size={14} style={{ transform: isRtl ? 'rotate(-90deg)' : 'rotate(90deg)' }} />
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
              <ChevronDown size={14} style={{ transform: isRtl ? 'rotate(90deg)' : 'rotate(-90deg)' }} />
            </button>
          </div>
        )}
        {filtered.length === 0 && !ui.loading && (
          <div className="mt-4 rounded-2xl border border-dashed border-[#cfe4e2] bg-[#f7fbfb] p-6 text-center text-[12px] font-bold text-[#486466]">
            {text(localizedText('لا توجد طلبات مربوطة بالمنصة حتى الآن.', 'No orders are connected to the platform yet.'))}
          </div>
        )}
      </SectionCard>
    </PharmacyLayout>
  );
}

function mapOrder(order) {
  return {
    rawId: order.id,
    id: order.orderNumber || `ORD-${order.id}`,
    customer: localizedText(order.patientName || '', order.patientName || ''),
    phone: order.patientPhone || '',
    items: Array.isArray(order.items) ? order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0) : 0,
    fulfillment: String(order.fulfillment || '').toLowerCase() === 'pickup' ? 'pickup' : 'delivery',
    total: Number(order.total || 0),
    status: mapOrderStatusForList(order.status),
    rawDate: order.createdAt || '',
    date: order.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    time: order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
  };
}
