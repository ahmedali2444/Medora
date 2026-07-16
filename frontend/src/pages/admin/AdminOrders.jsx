import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock, Download, ExternalLink, Eye, Package, ScanSearch as Search, Store, Truck, Users, XCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/layout/AdminLayout';
import SectionCard from '../../components/admin/shared/SectionCard';
import StatusPill from '../../components/admin/shared/StatusPill';
import DataTable from '../../components/admin/shared/DataTable';
import AdminModal from '../../components/admin/shared/AdminModal';
import AdminActionDialog from '../../components/admin/shared/AdminActionDialog';
import LinkedFilterPills from '../../components/admin/shared/LinkedFilterPills';
import { LINKED_FILTER_KEYS, readLinkedFilters } from '../../components/admin/shared/linkedFilterUtils';
import { FULFILLMENT_META, ORDER_STATUS_META, formatDate } from '../../components/admin/data/adminData';
import { useLocalizedContent } from '../../hooks/useLocalizedContent';
import { formatLocalizedNumber, localizedText } from '../../utils/localization';
import { triggerBrowserDownload } from '../../utils/download';
import { medoraApi } from '../../api/medoraApi';

const PAGE_SIZE = 20;
const STATUS_TABS = ['all', 'pending', 'accepted', 'preparing', 'readyforpickup', 'outfordelivery', 'delivered', 'cancelled'];

const ORDER_META = {
  ...ORDER_STATUS_META,
  accepted: { label: localizedText('مقبول', 'Accepted'), color: '#2465b6', bg: '#eef4ff' },
  preparing: { label: localizedText('قيد التحضير', 'Preparing'), color: '#1e56b5', bg: '#eef4ff' },
  readyforpickup: { label: localizedText('جاهز للاستلام', 'Ready for pickup'), color: '#6f47b5', bg: '#f4f0ff' },
  outfordelivery: { label: localizedText('خارج للتوصيل', 'Out for delivery'), color: '#6f47b5', bg: '#f4f0ff' },
};

const ORDER_STATUS_PAYLOAD = {
  accepted: 'Accepted',
  preparing: 'Preparing',
  readyforpickup: 'ReadyForPickup',
  outfordelivery: 'OutForDelivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const COPY = {
  title: localizedText('طلبات الأدوية', 'Medicine orders'),
  subtitle: localizedText('متابعة الطلبات وتحديث حالتها من مكان واحد', 'Track orders and update their status from one place'),
  total: localizedText('إجمالي الطلبات', 'Total orders'),
  inProgress: localizedText('قيد التشغيل', 'In progress'),
  delivered: localizedText('تم التسليم', 'Delivered'),
  completedRevenue: localizedText('إيرادات مكتملة', 'Completed revenue'),
  allOrders: localizedText('كل الطلبات', 'All orders'),
  ordersSuffix: localizedText('طلب', 'orders'),
  export: localizedText('تصدير', 'Export'),
  searchPlaceholder: localizedText('ابحث برقم الطلب، العميل، الهاتف، أو الصيدلية...', 'Search by order ID, customer, phone, or pharmacy...'),
  all: localizedText('الكل', 'All'),
  orderNo: localizedText('رقم الطلب', 'Order ID'),
  customer: localizedText('العميل', 'Customer'),
  phone: localizedText('الهاتف', 'Phone'),
  pharmacy: localizedText('الصيدلية', 'Pharmacy'),
  items: localizedText('العناصر', 'Items'),
  totalLabel: localizedText('الإجمالي', 'Total'),
  subtotal: localizedText('قيمة المنتجات', 'Subtotal'),
  deliveryFee: localizedText('رسوم التوصيل', 'Delivery fee'),
  fulfillment: localizedText('نوع التسليم', 'Fulfillment'),
  payment: localizedText('الدفع', 'Payment'),
  status: localizedText('الحالة', 'Status'),
  actions: localizedText('إجراءات', 'Actions'),
  address: localizedText('العنوان', 'Address'),
  notes: localizedText('ملاحظات', 'Notes'),
  deliveryTask: localizedText('مهمة التوصيل', 'Delivery task'),
  courier: localizedText('المندوب', 'Courier'),
  eta: localizedText('الوقت المتوقع', 'ETA'),
  details: localizedText('تفاصيل الطلب', 'Order details'),
  view: localizedText('عرض التفاصيل', 'View details'),
  accept: localizedText('قبول', 'Accept'),
  prepare: localizedText('تحضير', 'Prepare'),
  ready: localizedText('جاهز', 'Ready'),
  ship: localizedText('إرسال', 'Dispatch'),
  complete: localizedText('تسليم', 'Deliver'),
  cancel: localizedText('إلغاء', 'Cancel'),
  actionTitle: localizedText('تحديث حالة الطلب؟', 'Update order status?'),
  actionDesc: localizedText('سيتم تحديث حالة الطلب، ويمكن إضافة ملاحظة إدارية.', 'The order status will be updated, and you can add an admin note.'),
  currency: localizedText('ج.م', 'EGP'),
  empty: localizedText('لا توجد طلبات بهذا الفلتر.', 'No orders match this filter.'),
};

const statusKey = (value) => `${value || 'Pending'}`.toLowerCase();
const fulfillmentKey = (value) => (statusKey(value) === 'pickup' ? 'pickup' : 'delivery');

const mapOrder = (order) => ({
  rawId: order.id,
  id: order.orderNumber || `ORD-${order.id}`,
  patientUserId: order.patientUserId || '',
  patientName: order.patientName || order.customer || '-',
  patientEmail: order.patientEmail || '',
  customer: localizedText(order.customer || order.patientName || '-', order.customer || order.patientName || '-'),
  phone: order.phone || '',
  deliveryAddress: order.deliveryAddress || '-',
  notes: order.notes || '-',
  pharmacyId: order.pharmacyId,
  pharmacy: localizedText(order.pharmacy || '-', order.pharmacy || '-'),
  pharmacyPhone: order.pharmacyPhone || '',
  items: Array.isArray(order.items) ? order.items : [],
  itemsCount: order.itemsCount || order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
  subtotal: Number(order.subtotal || 0),
  deliveryFee: Number(order.deliveryFee || 0),
  total: Number(order.total || 0),
  status: statusKey(order.status),
  fulfillment: fulfillmentKey(order.fulfillment),
  paymentMethod: order.paymentMethod || '-',
  paymentStatus: order.paymentStatus || '-',
  date: order.createdAt || new Date().toISOString(),
  deliveredAt: order.deliveredAt,
  deliveryTask: order.deliveryTask || null,
});

function nextOrderActions(order) {
  if (order.status === 'pending') return [{ key: 'accepted', label: COPY.accept, Icon: CheckCircle2, tone: '#0e7c6e' }, { key: 'cancelled', label: COPY.cancel, Icon: XCircle, tone: '#c2362f' }];
  if (order.status === 'accepted') return [{ key: 'preparing', label: COPY.prepare, Icon: Package, tone: '#2465b6' }, { key: 'cancelled', label: COPY.cancel, Icon: XCircle, tone: '#c2362f' }];
  if (order.status === 'preparing') {
    const next = order.fulfillment === 'pickup'
      ? { key: 'readyforpickup', label: COPY.ready, Icon: Store, tone: '#6f47b5' }
      : { key: 'outfordelivery', label: COPY.ship, Icon: Truck, tone: '#6f47b5' };
    return [next, { key: 'cancelled', label: COPY.cancel, Icon: XCircle, tone: '#c2362f' }];
  }
  if (order.status === 'readyforpickup' || order.status === 'outfordelivery') return [{ key: 'delivered', label: COPY.complete, Icon: CheckCircle2, tone: '#0e7c6e' }, { key: 'cancelled', label: COPY.cancel, Icon: XCircle, tone: '#c2362f' }];
  return [];
}

export default function AdminOrders() {
  const { lang, text } = useLocalizedContent();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [action, setAction] = useState(null);
  const [ui, setUi] = useState({ loading: true, actionLoading: false, error: '', notice: '' });
  const linkedFilters = readLinkedFilters(searchParams);
  const userId = searchParams.get('userId') || '';
  const pharmacyId = searchParams.get('pharmacyId') || '';
  const paymentStatus = searchParams.get('paymentStatus') || '';
  const fulfillment = searchParams.get('fulfillment') || '';
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

  const loadOrders = useCallback(async () => {
    setUi((current) => ({ ...current, loading: true, error: '' }));
    try {
      const data = await medoraApi.adminOrders({
        page,
        pageSize: PAGE_SIZE,
        search: query,
        status: status === 'all' ? '' : ORDER_STATUS_PAYLOAD[status] || status,
        userId,
        pharmacyId,
        paymentStatus,
        fulfillment,
        dateFrom,
        dateTo,
        sortBy,
        sortDir,
      });
      const mapped = Array.isArray(data?.items) ? data.items.map(mapOrder) : [];
      setOrders(mapped);
      setTotal(Number(data?.total || mapped.length));
      setUi((current) => ({ ...current, loading: false, error: '' }));
    } catch (error) {
      setOrders([]);
      setTotal(0);
      setError(error.message || 'Unable to load orders');
    }
  }, [dateFrom, dateTo, fulfillment, page, paymentStatus, pharmacyId, query, sortBy, sortDir, status, userId]);

  const clearLinkedFilters = () => {
    const next = new URLSearchParams(searchParams);
    LINKED_FILTER_KEYS.forEach((key) => next.delete(key));
    setPage(1);
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    queueMicrotask(() => loadOrders());
    return () => {
      if (setNotice.timer) window.clearTimeout(setNotice.timer);
    };
  }, [loadOrders, setNotice]);

  const openDetails = async (order) => {
    setSelectedOrder(order);
    try {
      const details = await medoraApi.adminOrder(order.rawId);
      setSelectedOrder(mapOrder(details));
    } catch (error) {
      setError(error.message || 'Unable to load order details');
    }
  };

  const navigateWithParams = (path, nextParams) => {
    const search = new URLSearchParams();
    Object.entries(nextParams || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') search.set(key, value);
    });
    navigate(`${path}?${search.toString()}`);
    setSelectedOrder(null);
  };

  const updateOrderStatus = async (notes) => {
    if (!action) return;
    setUi((current) => ({ ...current, actionLoading: true, error: '' }));
    try {
      await medoraApi.adminUpdateOrderStatus(action.order.rawId, {
        status: ORDER_STATUS_PAYLOAD[action.nextStatus],
        notes,
      });
      setAction(null);
      setNotice(text(localizedText('تم تحديث حالة الطلب', 'Order status updated')));
      await loadOrders();
      if (selectedOrder?.rawId === action.order.rawId) {
        const details = await medoraApi.adminOrder(action.order.rawId);
        setSelectedOrder(mapOrder(details));
      }
    } catch (error) {
      setError(error.message || 'Unable to update order');
    } finally {
      setUi((current) => ({ ...current, actionLoading: false }));
    }
  };

  const exportOrders = async () => {
    try {
      triggerBrowserDownload(await medoraApi.adminExportOrders());
      setNotice(text(localizedText('تم تنزيل ملف الطلبات', 'Orders export downloaded')));
    } catch (error) {
      setError(error.message || 'Unable to export orders');
    }
  };

  const totalRevenue = orders.filter((order) => order.status === 'delivered').reduce((sum, order) => sum + order.total, 0);
  const inProgress = orders.filter((order) => !['delivered', 'cancelled'].includes(order.status)).length;

  const columns = [
    {
      key: 'id',
      label: COPY.orderNo,
      width: '0.95fr',
      align: 'center',
      render: (row) => (
        <div>
          <div className="text-[12px] font-extrabold text-[#084036]" dir="ltr">{row.id}</div>
          <div className="text-[10px] text-slate-400">{formatDate(row.date, lang)}</div>
        </div>
      ),
    },
    {
      key: 'customer',
      label: COPY.customer,
      width: '1fr',
      render: (row) => (
        <div>
          <div className="text-[12px] font-bold text-[#084036]">{text(row.customer)}</div>
          <div className="text-[10px] text-slate-500">{row.phone || '-'}</div>
        </div>
      ),
    },
    {
      key: 'pharmacy',
      label: COPY.pharmacy,
      width: '1.15fr',
      render: (row) => <span className="text-[11px] text-slate-600">{text(row.pharmacy)}</span>,
    },
    {
      key: 'items',
      label: COPY.items,
      width: '0.55fr',
      align: 'center',
      render: (row) => <span className="text-[12px] font-bold text-[#119a8a]">{formatLocalizedNumber(row.itemsCount, lang)}</span>,
    },
    {
      key: 'total',
      label: COPY.totalLabel,
      width: '0.85fr',
      align: 'center',
      render: (row) => <span className="text-[12px] font-extrabold text-[#084036]">{formatLocalizedNumber(row.total, lang)} {text(COPY.currency)}</span>,
    },
    {
      key: 'status',
      label: COPY.status,
      width: '0.95fr',
      align: 'center',
      render: (row) => <StatusPill meta={ORDER_META[row.status]} />,
    },
    {
      key: 'actions',
      label: COPY.actions,
      width: '1.15fr',
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <IconButton title={COPY.view} onClick={() => openDetails(row)} tone="#2465b6" Icon={Eye} />
          {nextOrderActions(row).map((item) => (
            <IconButton
              key={item.key}
              title={item.label}
              onClick={() => setAction({ order: row, nextStatus: item.key })}
              tone={item.tone}
              Icon={item.Icon}
            />
          ))}
        </div>
      ),
    },
  ];

  return (
    <AdminLayout title={COPY.title} subtitle={COPY.subtitle}>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatBox label={COPY.total} value={total} tone="#14b8a6" Icon={Package} />
        <StatBox label={COPY.inProgress} value={inProgress} tone="#a35a00" Icon={Clock} />
        <StatBox label={COPY.delivered} value={orders.filter((order) => order.status === 'delivered').length} tone="#0e7c6e" Icon={Truck} />
        <StatBox label={COPY.completedRevenue} value={totalRevenue} tone="#6366f1" currency />
      </div>

      <SectionCard
        title={COPY.allOrders}
        description={`${formatLocalizedNumber(total, lang)} ${text(COPY.ordersSuffix)}`}
        icon={Package}
        action={
          <button
            type="button"
            onClick={exportOrders}
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
                {tab === 'all' ? text(COPY.all) : text(ORDER_META[tab]?.label)}
              </button>
            ))}
          </div>
        </div>

        <LinkedFilterPills filters={linkedFilters} onClear={clearLinkedFilters} />

        <DataTable
          columns={columns}
          rows={orders}
          empty={text(COPY.empty)}
          loading={ui.loading}
          error={ui.error}
          pagination={{ page, totalPages: Math.max(Math.ceil(total / PAGE_SIZE), 1), onPageChange: setPage }}
          keyField="rawId"
        />
        {ui.notice && <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">{ui.notice}</div>}
      </SectionCard>

      <AdminModal
        open={!!selectedOrder}
        title={COPY.details}
        description={selectedOrder?.id}
        onClose={() => setSelectedOrder(null)}
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {selectedOrder.patientUserId && (
                <QuickLinkButton label={localizedText('حساب المستخدم', 'User account')} Icon={Users} onClick={() => navigateWithParams('/admin/users', { userId: selectedOrder.patientUserId })} />
              )}
              {selectedOrder.pharmacyId && (
                <QuickLinkButton label={localizedText('ملف الصيدلية', 'Pharmacy profile')} Icon={Store} onClick={() => navigateWithParams('/admin/pharmacies', { pharmacyId: selectedOrder.pharmacyId })} />
              )}
              {selectedOrder.pharmacyId && (
                <QuickLinkButton label={localizedText('طلبات الصيدلية', 'Pharmacy orders')} Icon={Package} onClick={() => navigateWithParams('/admin/orders', { pharmacyId: selectedOrder.pharmacyId })} />
              )}
              <QuickLinkButton label={localizedText('بلاغات وسجل الطلب', 'Order reports and log')} Icon={Clock} onClick={() => navigateWithParams('/admin/reports', { entityType: 'order', entityId: selectedOrder.rawId })} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <DetailCard label={COPY.customer} value={text(selectedOrder.customer)} />
              <DetailCard label={COPY.phone} value={selectedOrder.phone || '-'} />
              <DetailCard label={COPY.pharmacy} value={text(selectedOrder.pharmacy)} />
              <DetailCard label={COPY.fulfillment} value={text(FULFILLMENT_META[selectedOrder.fulfillment]?.label)} />
              <DetailCard label={COPY.status} value={text(ORDER_META[selectedOrder.status]?.label)} />
              <DetailCard label={COPY.payment} value={`${selectedOrder.paymentMethod} / ${selectedOrder.paymentStatus}`} />
              <DetailCard label={COPY.subtotal} value={`${formatLocalizedNumber(selectedOrder.subtotal, lang)} ${text(COPY.currency)}`} />
              <DetailCard label={COPY.deliveryFee} value={`${formatLocalizedNumber(selectedOrder.deliveryFee, lang)} ${text(COPY.currency)}`} />
              <DetailCard label={COPY.totalLabel} value={`${formatLocalizedNumber(selectedOrder.total, lang)} ${text(COPY.currency)}`} />
              <DetailCard label={COPY.address} value={selectedOrder.deliveryAddress || '-'} />
              <DetailCard label={COPY.notes} value={selectedOrder.notes || '-'} />
              <DetailCard label={COPY.orderNo} value={selectedOrder.id} />
            </div>

            <div className="rounded-2xl border border-[#eef5f5] bg-[#f8fbfb] p-4">
              <div className="mb-3 text-[11px] font-extrabold text-[#486466]">{text(COPY.items)}</div>
              <div className="space-y-2">
                {selectedOrder.items.length === 0 && <div className="text-[12px] text-slate-500">-</div>}
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-[12px]">
                    <span className="font-bold text-[#084036]">{item.medicineName || `#${item.medicineId}`}</span>
                    <span className="text-slate-500">
                      {formatLocalizedNumber(item.quantity || 0, lang)} x {formatLocalizedNumber(item.unitPrice || 0, lang)} {text(COPY.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {selectedOrder.deliveryTask && (
              <div className="rounded-2xl border border-[#eef5f5] bg-[#f8fbfb] p-4">
                <div className="mb-3 text-[11px] font-extrabold text-[#486466]">{text(COPY.deliveryTask)}</div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <DetailCard label={COPY.status} value={selectedOrder.deliveryTask.status || '-'} />
                  <DetailCard label={COPY.courier} value={`${selectedOrder.deliveryTask.courierName || '-'} ${selectedOrder.deliveryTask.courierPhone || ''}`} />
                  <DetailCard label={COPY.eta} value={selectedOrder.deliveryTask.etaMinutes ? `${formatLocalizedNumber(selectedOrder.deliveryTask.etaMinutes, lang)} min` : '-'} />
                </div>
              </div>
            )}
          </div>
        )}
      </AdminModal>

      <AdminActionDialog
        open={!!action}
        title={COPY.actionTitle}
        description={COPY.actionDesc}
        confirmLabel={action ? ORDER_META[action.nextStatus]?.label : COPY.status}
        tone={action?.nextStatus === 'cancelled' ? 'danger' : 'success'}
        requiresReason
        loading={ui.actionLoading}
        onClose={() => setAction(null)}
        onConfirm={updateOrderStatus}
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

function StatBox({ label, value, tone, Icon, currency = false }) {
  const { lang, text } = useLocalizedContent();

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#e4eeee] bg-white p-4 shadow-[0_8px_22px_rgba(41,93,96,0.06)]">
      {Icon && (
        <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${tone}1a`, color: tone }}>
          <Icon size={16} />
        </span>
      )}
      <div>
        <div className="text-[18px] font-black text-[#084036]">
          {formatLocalizedNumber(value, lang)} {currency ? text(COPY.currency) : ''}
        </div>
        <div className="text-[11px] text-[#486466]">{text(label)}</div>
      </div>
    </div>
  );
}

function DetailCard({ label, value }) {
  const { text } = useLocalizedContent();

  return (
    <div className="rounded-2xl border border-[#eef5f5] bg-white p-4">
      <div className="mb-1 text-[11px] font-extrabold text-[#486466]">{text(label)}</div>
      <div className="break-words text-[13px] font-bold text-[#084036]">{value}</div>
    </div>
  );
}
