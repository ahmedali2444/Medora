import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Boxes,
  ClipboardList,
  Package,
  Pill,
  Star,
  TrendingUp,
  Truck,
  ShoppingBag,
} from 'lucide-react';
import PharmacyLayout from '../../components/pharmacy/layout/PharmacyLayout';
import KpiCard from '../../components/pharmacy/shared/KpiCard';
import SectionCard from '../../components/pharmacy/shared/SectionCard';
import StatusPill from '../../components/pharmacy/shared/StatusPill';
import { useLocalizedContent } from '../../hooks/useLocalizedContent';
import {
  formatLocalizedNumber,
  localizedText,
} from '../../utils/localization';
import {
  PHARMACY_KPIS,
  getInventoryStatus,
  ORDER_STATUS_META,
} from '../../components/pharmacy/data/pharmacyData';
import { medoraApi } from '../../api/medoraApi';
import { subscribeNotifications } from '../../hooks/useNotificationHub';
import {
  mapPharmacyMedicine,
  mapPharmacyProfile,
  mapReview,
  toDateKey,
} from '../../utils/professionalApiMappers';

const COPY = {
  title: localizedText('نظرة عامة', 'Overview'),
  performance: localizedText('أداء اليوم', 'Today\'s performance'),
  welcomeBack: localizedText('مرحبًا بعودتك', 'Welcome back'),
  totalOrders: localizedText('طلب إجمالي', 'total orders'),
  todayOrders: localizedText('طلبات اليوم', 'Today\'s orders'),
  inventory: localizedText('المخزون', 'Inventory'),
  weeklySales: localizedText('المبيعات الأسبوعية', 'Weekly sales'),
  weeklySalesDescription: localizedText('عدد الطلبات لكل يوم خلال الأسبوع', 'Orders per day this week'),
  detailedReport: localizedText('تقرير مفصّل', 'Detailed report'),
  recentActivity: localizedText('النشاط الأخير', 'Recent activity'),
  latestOrders: localizedText('آخر الطلبات الواردة', 'Latest incoming orders'),
  allOrders: localizedText('كل الطلبات', 'All orders'),
  time: localizedText('الوقت', 'Time'),
  items: localizedText('عنصر', 'items'),
  stockAlerts: localizedText('تنبيهات المخزون', 'Stock alerts'),
  restockProducts: localizedText('منتجات تحتاج تزويد', 'Products needing restock'),
  fullInventory: localizedText('المخزون الكامل', 'Full inventory'),
  outOf: localizedText('من', 'of'),
  healthyInventory: localizedText('المخزون في وضع جيد ✓', 'Inventory is in good shape ✓'),
};

// BUG-05 FIX: icons now match the actual KPI data displayed
const KPI_META = {
  'orders-today': { Icon: Pill, tone: '#14b8a6' },       // أدوية متاحة
  revenue: { Icon: Star, tone: '#f59e0b' },              // متوسط التقييم
  'active-orders': { Icon: Package, tone: '#6366f1' },   // إجمالي الأدوية
  'stock-alerts': { Icon: AlertTriangle, tone: '#ef4444' }, // تنبيهات المخزون
  'expired-count': { Icon: AlertTriangle, tone: '#c2362f' },
  'near-expiry': { Icon: AlertTriangle, tone: '#f59e0b' },
};

const ACTIVITY_META = {
  order: { Icon: ShoppingBag, bg: '#e6f7f7', color: '#0e7c6e' },
  stock: { Icon: AlertTriangle, bg: '#fdecec', color: '#c2362f' },
  prescription: { Icon: ClipboardList, bg: '#eef4ff', color: '#2465b6' },
  review: { Icon: BarChart3, bg: '#fff4e6', color: '#a35a00' },
  delivery: { Icon: Truck, bg: '#f4f0ff', color: '#6f47b5' },
};

function SalesChart({ data }) {
  const { text } = useLocalizedContent();
  const max = Math.max(1, ...data.map((item) => item.revenue));
  const minBarHeight = 26;
  const maxBarHeight = 164;

  return (
    <div className="grid grid-cols-7 items-end gap-2 px-1 sm:gap-3 sm:px-2">
      {data.map((item) => {
        const ratio = max > 0 ? item.revenue / max : 0;
        const barHeight = item.revenue > 0
          ? Math.round(minBarHeight + ratio * (maxBarHeight - minBarHeight))
          : minBarHeight;
        return (
          <div key={item.id} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-40 w-full items-end rounded-[18px] bg-gradient-to-t from-[#edf6f5] to-transparent px-1 sm:h-44">
              <div
                className="flex w-full items-start justify-center rounded-t-[14px] bg-gradient-to-b from-[#18c2b0] via-[#12ad9d] to-[#0b5e52] pt-2 shadow-[0_10px_22px_rgba(20,184,166,0.22)]"
                style={{ height: `${barHeight}px` }}
              >
                <div className="text-center text-[10px] font-black text-white">{item.orders}</div>
              </div>
            </div>
            <div className="text-[10px] font-bold text-[#486466] sm:text-[11px]">{text(item.day)}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function PharmacyOverview() {
  const navigate = useNavigate();
  const { lang, text } = useLocalizedContent();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [todayOrders, setTodayOrders] = useState([]); // BUG-02 FIX: state instead of const []
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const localNow = new Date();
    const todayStr = new Date(localNow.getTime() - localNow.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    Promise.allSettled([
      medoraApi.pharmacyMe(),
      medoraApi.pharmacyStats(),
      medoraApi.pharmacyMedicines(),
      medoraApi.pharmacyReviews(),
      medoraApi.pharmacyOrders({ page: 1, pageSize: 100, dateFrom: todayStr, dateTo: todayStr }),
    ]).then(([profileResult, statsResult, medicinesResult, reviewsResult, ordersResult]) => {
      if (!mounted) return;
      if (profileResult.status === 'fulfilled') setProfile(profileResult.value);
      if (statsResult.status === 'fulfilled') setStats(statsResult.value);
      if (medicinesResult.status === 'fulfilled') {
        const medicineItems = Array.isArray(medicinesResult.value?.items)
          ? medicinesResult.value.items
          : Array.isArray(medicinesResult.value)
            ? medicinesResult.value
            : [];
        setMedicines(medicineItems.map(mapPharmacyMedicine));
      }
      if (reviewsResult.status === 'fulfilled') {
        setReviews(Array.isArray(reviewsResult.value) ? reviewsResult.value.map((review) => mapReview(review, 'customer')) : []);
      }
      // BUG-02 FIX: populate today's orders from API
      if (ordersResult.status === 'fulfilled') {
        const allOrders = Array.isArray(ordersResult.value?.items) ? ordersResult.value.items : [];
        const mapped = allOrders.map((order) => ({
          id: order.orderNumber || `ORD-${order.id}`,
          rawId: order.id,
          customer: localizedText(order.patientName || '', order.patientName || ''),
          phone: order.patientPhone || '',
          items: Array.isArray(order.items) ? order.items.reduce((s, i) => s + Number(i.quantity || 0), 0) : 0,
          total: Number(order.total || 0),
          status: (() => {
            const val = String(order.status || '').toLowerCase();
            if (val === 'pending' || val === 'accepted') return 'new';
            if (val === 'preparing') return 'preparing';
            if (val === 'readyforpickup') return 'ready';
            if (val === 'outfordelivery') return 'shipping';
            if (val === 'delivered') return 'delivered';
            if (val === 'cancelled') return 'cancelled';
            return 'new';
          })(),
          date: order.createdAt?.slice(0, 10) || todayStr,
          time: order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        }));
        setTodayOrders(mapped.filter((o) => o.date === todayStr));
      }
      // BUG-12 FIX: only redirect to complete-profile if profile itself is 404, not any API
      if (profileResult.status === 'rejected') {
        const reason = profileResult.reason;
        if (reason?.status === 404 || (typeof reason?.message === 'string' && reason.message.toLowerCase().includes('not found'))) {
          navigate('/complete-profile/pharmacy', { replace: true });
          return;
        }
      }
      const firstFailed = [statsResult, medicinesResult, reviewsResult, ordersResult].find((r) => r.status === 'rejected');
      setApiError(firstFailed?.reason?.message || (profileResult.status === 'rejected' ? profileResult.reason?.message : '') || '');
      setIsLoading(false);
    });
    return () => { mounted = false; };
  }, [navigate]);

  const refreshOrders = React.useCallback(async () => {
    try {
      const localNow = new Date();
      const todayStr = new Date(localNow.getTime() - localNow.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      const ordersResult = await medoraApi.pharmacyOrders({ page: 1, pageSize: 100, dateFrom: todayStr, dateTo: todayStr });
      const allOrders = Array.isArray(ordersResult?.items) ? ordersResult.items : [];
      const mapped = allOrders.map((order) => ({
        id: order.orderNumber || `ORD-${order.id}`,
        rawId: order.id,
        customer: localizedText(order.patientName || '', order.patientName || ''),
        phone: order.patientPhone || '',
        items: Array.isArray(order.items) ? order.items.reduce((s, i) => s + Number(i.quantity || 0), 0) : 0,
        total: Number(order.total || 0),
        status: (() => {
          const val = String(order.status || '').toLowerCase();
          if (val === 'pending' || val === 'accepted') return 'new';
          if (val === 'preparing') return 'preparing';
          if (val === 'readyforpickup') return 'ready';
          if (val === 'outfordelivery') return 'shipping';
          if (val === 'delivered') return 'delivered';
          if (val === 'cancelled') return 'cancelled';
          return 'new';
        })(),
        date: order.createdAt?.slice(0, 10) || todayStr,
        time: order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      }));
      setTodayOrders(mapped.filter((o) => o.date === todayStr));
    } catch (err) {
      console.error('Failed to refresh orders via notification', err);
    }
  }, []);

  useEffect(() => {
    return subscribeNotifications((payload) => {
      if (payload?.type === 'order') {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => {});
        refreshOrders();
      }
    });
  }, [refreshOrders]);

  const pharmacyProfile = useMemo(() => mapPharmacyProfile(profile, stats), [profile, stats]);

  // BUG-05 + BUG-06 FIX: proper labels, values, hints and deltas from live API
  const kpis = useMemo(() => PHARMACY_KPIS.map((kpi) => {
    const liveLabels = {
      'orders-today': localizedText('طلبات اليوم', "Today's orders"),
      revenue: localizedText('أرباح اليوم', "Today's revenue"),
      'active-orders': localizedText('طلبات نشطة', 'Active orders'),
      'stock-alerts': localizedText('تنبيهات المخزون', 'Stock alerts'),
      'expired-count': localizedText('منتهية الصلاحية', 'Expired meds'),
      'near-expiry': localizedText('توشك على الانتهاء', 'Expiring soon'),
    };
    const liveHints = {
      'orders-today': localizedText('إجمالي الطلبات الواردة اليوم', 'Total orders received today'),
      revenue: localizedText('إجمالي مبيعات اليوم', 'Total sales for today'),
      'active-orders': localizedText('الطلبات الجاري تجهيزها أو شحنها', 'Orders currently being prepared or shipped'),
      'stock-alerts': localizedText('منتجات تحتاج تزويد', 'Products needing restock'),
      'expired-count': localizedText('أدوية تجاوزت تاريخ الصلاحية', 'Medicines past expiry date'),
      'near-expiry': localizedText('تنتهي خلال أقل من 30 يوم', 'Expiring in less than 30 days'),
    };
    if (!stats) return { ...kpi, label: liveLabels[kpi.id] || kpi.label, hint: liveHints[kpi.id] || kpi.hint, value: 0, delta: null };
    const values = {
      'orders-today': stats.todayOrdersCount,
      revenue: `EGP ${Number(stats.todayRevenue || 0).toFixed(2)}`,
      'active-orders': stats.activeOrdersCount,
      'stock-alerts': stats.lowStockCount,
      'expired-count': stats.expiredCount ?? 0,
      'near-expiry': stats.nearExpiryCount ?? 0,
    };
    return {
      ...kpi,
      label: liveLabels[kpi.id] || kpi.label,
      hint: liveHints[kpi.id] || kpi.hint,
      value: values[kpi.id] ?? 0,
      delta: stats[`${kpi.id}Delta`] || null,
      positive: stats[`${kpi.id}Positive`] ?? kpi.positive,
    };
  }), [stats]);

  const lowStock = medicines.filter((item) => {
    const status = getInventoryStatus(item);
    return status === 'low-stock' || status === 'out-of-stock';
  });

  // BUG-01 FIX: show past 7 days (index=0 is 6 days ago, index=6 is today)
  const chartData = useMemo(() => {
    const today = new Date();
    const live = new Map((Array.isArray(stats?.weeklyOrders) ? stats.weeklyOrders : []).map((item) => [
      String(item.date || '').slice(0, 10),
      item,
    ]));
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      const key = toDateKey(date);
      const item = live.get(key);
      return {
        id: key,
        day: localizedText(
          date.toLocaleDateString('ar-EG', { weekday: 'short' }),
          date.toLocaleDateString('en-US', { weekday: 'short' }),
        ),
        orders: Number(item?.orders || 0),
        revenue: Number(item?.revenue || 0),
      };
    });
  }, [stats]);
  const recentActivity = useMemo(() => {
    const stockActivity = lowStock.slice(0, 3).map((item) => ({
      id: `stock-${item.id}`,
      kind: 'stock',
      text: localizedText(`تنبيه مخزون — ${item.name.ar}`, `Stock alert - ${item.name.en}`),
      time: localizedText('الآن', 'Now'),
    }));
    const reviewActivity = reviews.slice(0, 2).map((review) => ({
      id: `review-${review.id}`,
      kind: 'review',
      text: localizedText(`تقييم جديد ${review.rating} نجوم`, `New ${review.rating}-star review`),
      time: localizedText(review.date, review.date),
    }));
    return [...stockActivity, ...reviewActivity].slice(0, 5);
  }, [lowStock, reviews]);

  return (
    <PharmacyLayout
      title={COPY.title}
      subtitle={`${text(pharmacyProfile.name)} · ${text(COPY.performance)}`}
    >
      <div className="mb-6 overflow-hidden rounded-3xl border border-[#d7e7e5] bg-gradient-to-l from-[#0b5e52] via-[#119a8a] to-[#14b8a6] p-6 text-white shadow-[0_22px_60px_rgba(8,94,82,0.3)] sm:p-7">
        <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-2xl ring-4 ring-white/30">
              <img src={pharmacyProfile.logo} alt="" className="h-full w-full object-cover" />
            </div>
            <div>
              <div className="text-[11px] text-white/70">{text(COPY.welcomeBack)}</div>
              <h2 className="text-[20px] font-black sm:text-[24px]">{text(pharmacyProfile.name)}</h2>
              <p className="mt-1 text-[12px] text-white/80">
                {text(pharmacyProfile.city)} · {formatLocalizedNumber(pharmacyProfile.totalOrders, lang)}{' '}
                {text(COPY.totalOrders)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate('/pharmacy/orders')}
              className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-[12px] font-bold text-white backdrop-blur transition hover:bg-white/25"
            >
              <Package size={14} />
              {text(COPY.todayOrders)}
            </button>
            <button
              onClick={() => navigate('/pharmacy/inventory')}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[12px] font-bold text-[#119a8a] transition hover:bg-[#f3fafa]"
            >
              <Boxes size={14} />
              {text(COPY.inventory)}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const meta = KPI_META[kpi.id];
          return <KpiCard key={kpi.id} {...kpi} Icon={meta?.Icon} tone={meta?.tone} />;
        })}
      </div>

      {apiError && <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">{apiError}</div>}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <SectionCard
          title={COPY.weeklySales}
          description={COPY.weeklySalesDescription}
          icon={TrendingUp}
          action={
            <button
              onClick={() => navigate('/pharmacy/reports')}
              className="inline-flex items-center gap-1 rounded-full bg-[#e6f7f7] px-3 py-1.5 text-[11px] font-bold text-[#119a8a] transition hover:bg-[#d0efed]"
            >
              {text(COPY.detailedReport)}
              <ArrowUpRight size={11} />
            </button>
          }
        >
          <SalesChart data={chartData} />
        </SectionCard>

        <SectionCard title={COPY.recentActivity} icon={BarChart3}>
          <ul className="flex flex-col gap-3">
            {recentActivity.map((activity) => {
              const meta = ACTIVITY_META[activity.kind] || ACTIVITY_META.order;
              const ActIcon = meta.Icon;
              return (
                <li key={activity.id} className="flex items-start gap-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: meta.bg, color: meta.color }}
                  >
                    <ActIcon size={14} />
                  </span>
                  <div className="flex-1 text-start">
                    <div className="text-[12px] font-bold text-[#084036]">{text(activity.text)}</div>
                    <div className="mt-0.5 text-[10px] text-slate-400">{text(activity.time)}</div>
                  </div>
                </li>
              );
            })}
            {recentActivity.length === 0 && (
              <li className="rounded-xl bg-[#e6f7f7] p-4 text-center text-[11px] font-bold text-[#0e7c6e]">
                {text(COPY.healthyInventory)}
              </li>
            )}
          </ul>
        </SectionCard>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <SectionCard
          title={COPY.todayOrders}
          description={COPY.latestOrders}
          icon={Package}
          action={
            <button
              onClick={() => navigate('/pharmacy/orders')}
              className="inline-flex items-center gap-1 rounded-full bg-[#e6f7f7] px-3 py-1.5 text-[11px] font-bold text-[#119a8a] transition hover:bg-[#d0efed]"
            >
              {text(COPY.allOrders)}
              <ArrowUpRight size={11} />
            </button>
          }
        >
          <div className="flex flex-col gap-3">
            {todayOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center gap-3 rounded-2xl border border-[#e4eeee] bg-[#f7fbfb] p-3 transition hover:border-[#14b8a6] hover:bg-white"
              >
                <div className="flex flex-col items-center rounded-xl bg-white px-3 py-2 text-center shadow-[0_4px_14px_rgba(41,93,96,0.06)]">
                  <span className="text-[10px] font-bold text-[#486466]">{text(COPY.time)}</span>
                  <span className="text-[12px] font-black text-[#119a8a]" dir="ltr">
                    {order.time}
                  </span>
                </div>

                <div className="flex-1 text-start">
                  <div className="text-[13px] font-extrabold text-[#084036]">{text(order.customer)}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span className="font-bold text-[#119a8a]">{order.total}</span>
                    <span>{text(localizedText('ج.م', 'EGP'))}</span>
                    <span>·</span>
                    <span>
                      {order.items} {text(COPY.items)}
                    </span>
                    <span>·</span>
                    <span dir="ltr" className="font-bold">{order.id}</span>
                  </div>
                </div>

                <StatusPill meta={ORDER_STATUS_META[order.status] || ORDER_STATUS_META['new']} />
              </div>
            ))}
            {todayOrders.length === 0 && !isLoading && (
              <div className="rounded-xl bg-[#e6f7f7] p-4 text-center text-[11px] font-bold text-[#0e7c6e]">
                {text(localizedText('لا توجد طلبات مربوطة بالمنصة حتى الآن.', 'No orders are connected to the platform yet.'))}
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title={COPY.stockAlerts}
          description={COPY.restockProducts}
          icon={AlertTriangle}
          action={
            <button
              onClick={() => navigate('/pharmacy/inventory')}
              className="inline-flex items-center gap-1 rounded-full bg-[#fdecec] px-3 py-1.5 text-[11px] font-bold text-[#c2362f] transition hover:bg-[#fbd5d5]"
            >
              {text(COPY.fullInventory)}
              <ArrowUpRight size={11} />
            </button>
          }
        >
          <div className="flex flex-col gap-2">
            {lowStock.slice(0, 6).map((item) => {
              const status = getInventoryStatus(item);
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[#e4eeee] bg-white p-3"
                >
                  <div>
                    <div
                      className="text-[12px] font-black"
                      style={{ color: status === 'out-of-stock' ? '#c2362f' : '#a35a00' }}
                    >
                      {item.stock}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {text(COPY.outOf)} {item.reorder}
                    </div>
                  </div>
                  <div className="flex-1 text-start">
                    <div className="text-[12px] font-bold text-[#084036]">{text(item.name)}</div>
                    <div className="text-[10px] text-slate-500">{item.company}</div>
                  </div>
                </div>
              );
            })}
            {lowStock.length === 0 && (
              <div className="rounded-xl bg-[#e6f7f7] p-4 text-center text-[11px] font-bold text-[#0e7c6e]">
                {text(COPY.healthyInventory)}
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </PharmacyLayout>
  );
}
