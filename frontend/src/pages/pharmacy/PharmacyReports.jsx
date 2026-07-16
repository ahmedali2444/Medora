import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Boxes, Package, Pill, Star, TrendingUp, PieChart, Calendar } from 'lucide-react';
import PharmacyLayout from '../../components/pharmacy/layout/PharmacyLayout';
import SectionCard from '../../components/pharmacy/shared/SectionCard';
import { useLocalizedContent } from '../../hooks/useLocalizedContent';
import {
  localizedText,
} from '../../utils/localization';
import { getInventoryStatus } from '../../components/pharmacy/data/pharmacyData';
import { medoraApi } from '../../api/medoraApi';
import { mapPharmacyMedicine } from '../../utils/professionalApiMappers';

const AR_MONTHS = {
  Jan: 'يناير', Feb: 'فبراير', Mar: 'مارس',
  Apr: 'أبريل', May: 'مايو', Jun: 'يونيو',
  Jul: 'يوليو', Aug: 'أغسطس', Sep: 'سبتمبر',
  Oct: 'أكتوبر', Nov: 'نوفمبر', Dec: 'ديسمبر',
};

const COPY = {
  title: localizedText('التقارير', 'Reports'),
  subtitle: localizedText('ملخص الأداء المالي والتشغيلي للصيدلية', 'Financial and operational performance summary'),
  todayOrders: localizedText('طلبات اليوم', 'Today\'s orders'),
  todayRevenue: localizedText('إيراد اليوم', 'Today\'s revenue'),
  activeOrders: localizedText('طلبات نشطة', 'Active orders'),
  stockAlerts: localizedText('تنبيهات المخزون', 'Stock alerts'),
  monthlyRevenue: localizedText('الإيراد الشهري', 'Monthly revenue'),
  recentMonths: localizedText('أداء الأشهر الأخيرة', 'Performance over recent months'),
  salesByCategory: localizedText('مبيعات حسب التصنيف', 'Sales by category'),
  categoryContribution: localizedText('نسبة مساهمة كل فئة', 'Share by category'),
  egp: localizedText('ج.م', 'EGP'),
};

function StatCard({ label, value, Icon, tone }) {
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

function RevenueChart({ data }) {
  const { text } = useLocalizedContent();
  const max = Math.max(1, ...data.map((item) => item.value));

  return (
    <div className="flex h-64 items-end justify-between gap-3">
      {data.map((item) => (
        <div key={item.id} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
          <div className="relative flex w-full flex-1 items-end">
            <div
              className="absolute bottom-0 flex w-full flex-col items-center justify-start rounded-t-2xl bg-gradient-to-t from-[#0b5e52] to-[#14b8a6] pt-2"
              style={{ height: `${Math.max(15, (Number(item.value) || 0) / max * 100)}%` }}
            >
              {Number(item.value) > 0 && (
                <span className="text-[10px] font-bold text-white shadow-sm sm:text-xs">
                  {Number(item.value).toLocaleString('en-US')}
                </span>
              )}
            </div>
          </div>
          <div className="text-[10px] font-bold text-[#486466]">{text(item.month)}</div>
        </div>
      ))}
    </div>
  );
}

export default function PharmacyReports() {
  const { text } = useLocalizedContent();
  const [stats, setStats] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [ui, setUi] = useState({ loading: true, error: '' });
  const [dateFilter, setDateFilter] = useState('all');

  const fetchStats = async () => {
    let params = {};
    const now = new Date();
    if (dateFilter === 'today') {
      const start = new Date(now.setHours(0, 0, 0, 0));
      const end = new Date(now.setHours(23, 59, 59, 999));
      params = { startDate: start.toISOString(), endDate: end.toISOString() };
    } else if (dateFilter === 'week') {
      const start = new Date(now);
      start.setDate(now.getDate() - 7);
      params = { startDate: start.toISOString() };
    } else if (dateFilter === 'month') {
      const start = new Date(now);
      start.setDate(now.getDate() - 30);
      params = { startDate: start.toISOString() };
    }

    try {
      setUi({ loading: true, error: '' });
      const [statsResult, medicinesResult] = await Promise.all([
        medoraApi.pharmacyStats(params),
        medoraApi.pharmacyMedicines()
      ]);
      setStats(statsResult);
      const medicineItems = Array.isArray(medicinesResult?.items)
        ? medicinesResult.items
        : Array.isArray(medicinesResult)
          ? medicinesResult
          : [];
      setMedicines(medicineItems.map(mapPharmacyMedicine));
      setUi({ loading: false, error: '' });
    } catch (err) {
      setUi({ loading: false, error: err?.response?.data?.message || 'Error loading stats' });
    }
  };

  useEffect(() => {
    fetchStats();
  }, [dateFilter]);

  const categorySales = useMemo(() => {
    const apiSales = Array.isArray(stats?.salesByCategory) ? stats.salesByCategory : [];
    if (apiSales.length === 0) return [];
    const totalRevenue = apiSales.reduce((sum, item) => sum + Number(item.revenue || 0), 0) || 1;
    return apiSales.map((item, index) => {
      return {
        id: item.category || `category-${index}`,
        label: localizedText(item.category || '-', item.category || '-'),
        value: Number(((Number(item.revenue || 0) / totalRevenue) * 100).toFixed(1)),
        color: ['#14b8a6', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6'][index % 5],
      };
    });
  }, [stats]);

  const monthlyRevenue = useMemo(() => {
    // BUG-07 FIX: build last 6 months dynamically from real date
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const enShort = d.toLocaleDateString('en-US', { month: 'short' }); // 'Jan', 'Feb'...
      const arShort = AR_MONTHS[enShort] || enShort;
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const monthKey = `${year}-${month}`; // '2026-04'

      const apiRevenue = Number(stats?.monthlyRevenue?.[monthKey]
        ?? stats?.revenueByMonth?.find?.((m) => m.month === monthKey)?.value
        ?? 0);
      return {
        id: monthKey,
        // BUG-08 FIX: proper Arabic month name
        month: localizedText(arShort, enShort),
        value: apiRevenue,
      };
    });
  }, [stats]);

  const stockAlerts = medicines.filter((item) => getInventoryStatus(item) !== 'in-stock').length;

  const handleExportCsv = () => {
    if (!stats) {
      alert(text(localizedText('لا توجد بيانات للتصدير', 'No data to export')));
      return;
    }
    
    // Create Summary Section
    let csvContent = `Report Period:,${dateFilter}\n`;
    csvContent += `Total Revenue:,EGP ${Number(stats.totalRevenue || 0).toFixed(2)}\n`;
    csvContent += `Total Orders:,${stats.ordersCount || 0}\n`;
    csvContent += `Average Rating:,${Number(stats.avgRating || 0).toFixed(1)}\n\n`;

    // Create Category Sales Section
    csvContent += `Category Sales\n`;
    csvContent += `Category,Orders,Revenue\n`;
    const apiSales = Array.isArray(stats.salesByCategory) ? stats.salesByCategory : [];
    apiSales.forEach(item => {
      csvContent += `"${(item.category || 'Uncategorized').replace(/"/g, '""')}",${item.orders || 0},${item.revenue || 0}\n`;
    });
    csvContent += `\n`;

    // Create Monthly Revenue Section
    csvContent += `Monthly Revenue\n`;
    csvContent += `Month,Revenue\n`;
    monthlyRevenue.forEach(item => {
      csvContent += `"${(item.month || '').replace(/"/g, '""')}",${item.value || 0}\n`;
    });

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `pharmacy_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <PharmacyLayout title={COPY.title} subtitle={COPY.subtitle}>
      <div className="mb-4 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar size={20} className="text-[#14b8a6]" />
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-lg border-none bg-white py-2 pl-3 pr-8 text-sm font-bold text-[#084036] shadow-sm focus:ring-2 focus:ring-[#14b8a6] outline-none cursor-pointer"
          >
            <option value="all">{text(localizedText('كل الأوقات', 'All Time'))}</option>
            <option value="today">{text(localizedText('اليوم', 'Today'))}</option>
            <option value="week">{text(localizedText('آخر 7 أيام', 'Last 7 Days'))}</option>
            <option value="month">{text(localizedText('آخر 30 يوم', 'Last 30 Days'))}</option>
          </select>
        </div>
        <button
          onClick={handleExportCsv}
          className="flex items-center gap-2 rounded-lg bg-[#14b8a6] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0d9488]"
        >
          <PieChart size={16} />
          {text(localizedText('تصدير CSV', 'Export CSV'))}
        </button>
      </div>
      {ui.error && <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">{ui.error}</div>}
      {ui.loading && <div className="mb-4 rounded-xl bg-[#e6f7f7] px-4 py-3 text-xs font-semibold text-[#0e7c6e]">...</div>}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard 
          label={localizedText('إجمالي الأرباح', 'Total Revenue')} 
          value={`EGP ${Number(stats?.totalRevenue || 0).toFixed(2)}`} 
          Icon={TrendingUp} 
          tone="#14b8a6" 
        />
        <StatCard 
          label={localizedText('إجمالي الطلبات', 'Total Orders')} 
          value={stats?.ordersCount ?? 0} 
          Icon={Package} 
          tone="#f59e0b" 
        />
        <StatCard 
          label={localizedText('متوسط التقييم', 'Average rating')} 
          value={Number(stats?.avgRating || 0).toFixed(1)} 
          Icon={Star} 
          tone="#6366f1" 
        />
        <StatCard 
          label={COPY.stockAlerts} 
          value={stats?.lowStockCount ?? stockAlerts} 
          Icon={AlertTriangle} 
          tone="#ef4444" 
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
        <SectionCard title={COPY.monthlyRevenue} description={COPY.recentMonths} icon={TrendingUp}>
          <RevenueChart data={monthlyRevenue} />
        </SectionCard>

        <SectionCard title={COPY.salesByCategory} description={COPY.categoryContribution} icon={PieChart}>
          <div className="flex flex-col gap-3">
            {categorySales.map((item) => (
              <div key={item.id}>
                <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-[#084036]">
                  <span>{item.value}%</span>
                  <span>{text(item.label)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#edf5f5]">
                  <div className="h-full rounded-full" style={{ width: `${item.value}%`, background: item.color }} />
                </div>
              </div>
            ))}
            {categorySales.length === 0 && !ui.loading && (
              <div className="rounded-xl bg-[#e6f7f7] p-4 text-center text-[11px] font-bold text-[#0e7c6e]">
                {text(localizedText('لا توجد بيانات تصنيف حتى الآن.', 'No category data yet.'))}
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </PharmacyLayout>
  );
}
