import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarCheck,
  FileText,
  Newspaper,
  Package,
  Pill,
  ScanSearch as Search,
  ShieldCheck,
  Stethoscope,
  TrendingUp,
  Users,
} from 'lucide-react';
import AdminLayout from '../../components/admin/layout/AdminLayout';
import KpiCard from '../../components/admin/shared/KpiCard';
import SectionCard from '../../components/admin/shared/SectionCard';
import { useLocalizedContent } from '../../hooks/useLocalizedContent';
import { formatLocalizedNumber, localizedText } from '../../utils/localization';
import { medoraApi } from '../../api/medoraApi';

const COPY = {
  title: localizedText('نظرة عامة', 'Overview'),
  subtitle: localizedText('لوحة التحكم المركزية لمتابعة حالة المنصة', 'Central dashboard for platform status'),
  heroBadge: localizedText('مدير النظام', 'Super Admin'),
  heroTitle: localizedText('حالة المنصة الآن', 'Current platform status'),
  heroDesc: localizedText('تابع مؤشرات المنصة والتنبيهات المهمة من مكان واحد.', 'Track platform indicators and key alerts from one place.'),
  reports: localizedText('التقارير', 'Reports'),
  pendingVerify: localizedText('طلبات التحقق', 'Verification requests'),
  alertsTitle: localizedText('تنبيهات تحتاج إجراء', 'Alerts requiring action'),
  alertsEmpty: localizedText('لا توجد تنبيهات إدارية حالية.', 'There are no admin alerts right now.'),
  usersGrowthTitle: localizedText('نمو المستخدمين', 'User growth'),
  usersGrowthDesc: localizedText('أحدث السجلات المضافة', 'Latest signup records'),
  topDoctorsTitle: localizedText('أفضل الأطباء', 'Top doctors'),
  topPharmaciesTitle: localizedText('أفضل الصيدليات', 'Top pharmacies'),
  topSearchesTitle: localizedText('أكثر عمليات البحث', 'Top searches'),
  medicineDemandTitle: localizedText('أعلى أدوية مطلوبة', 'Top medicine demand'),
  emptyRanking: localizedText('لا توجد بيانات كافية حتى الآن.', 'There is not enough data yet.'),
  apptsToday: localizedText('المواعيد المعلقة', 'Pending appointments'),
  ordersCount: localizedText('طلبات الأدوية', 'Medicine orders'),
  articlesCount: localizedText('المقالات المنشورة', 'Published articles'),
  reviewsToday: localizedText('إجمالي التقييمات', 'Total reviews'),
  doctorsPending: localizedText('أطباء بانتظار التحقق', 'Doctors awaiting verification'),
  pharmaciesPending: localizedText('صيدليات بانتظار التحقق', 'Pharmacies awaiting verification'),
  reportsPending: localizedText('بلاغات معلقة', 'Pending reports'),
  appointmentsPending: localizedText('مواعيد معلقة', 'Pending appointments'),
  noData: localizedText('لا توجد بيانات بعد', 'No data yet'),
};

const KPI_META = {
  users: { Icon: Users, tone: '#14b8a6' },
  doctors: { Icon: Stethoscope, tone: '#6366f1' },
  pharmacies: { Icon: Building2, tone: '#f59e0b' },
  medicines: { Icon: Package, tone: '#ec4899' },
};

const ALERT_META = {
  doctors: { Icon: Stethoscope, tone: '#a35a00', path: '/admin/doctors?status=pending' },
  pharmacies: { Icon: Building2, tone: '#2465b6', path: '/admin/pharmacies?status=pending' },
  reports: { Icon: AlertTriangle, tone: '#c2362f', path: '/admin/reports' },
  appointments: { Icon: CalendarCheck, tone: '#0e7c6e', path: '/admin/appointments' },
};

function SimpleTrend({ rows, valueKey = 'count' }) {
  const values = rows.map((row) => row[valueKey] || 0);
  const max = Math.max(...values, 1);

  if (!rows.length) {
    return <div className="py-12 text-center text-[12px] text-slate-500">لا توجد بيانات بعد</div>;
  }

  return (
    <div className="flex h-44 items-end justify-between gap-2 px-2">
      {rows.map((row, index) => {
        const height = ((row[valueKey] || 0) / max) * 100;
        return (
          <div key={index} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t-lg bg-gradient-to-b from-[#14b8a6] to-[#0b5e52]"
                style={{ height: `${Math.max(height, 8)}%` }}
              />
            </div>
            <div className="text-[10px] font-bold text-[#486466]">
              {row.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminOverview() {
  const navigate = useNavigate();
  const { lang, text } = useLocalizedContent();
  const [stats, setStats] = useState(null);
  const [growth, setGrowth] = useState([]);
  const [topDoctors, setTopDoctors] = useState([]);
  const [topPharmacies, setTopPharmacies] = useState([]);
  const [topSearches, setTopSearches] = useState([]);
  const [medicineDemand, setMedicineDemand] = useState([]);
  const [statsError, setStatsError] = useState('');

  useEffect(() => {
    let mounted = true;

    Promise.allSettled([
      medoraApi.adminStats(),
      medoraApi.adminUsersGrowth(),
      medoraApi.adminTopDoctors(5),
      medoraApi.adminTopPharmacies(5),
      medoraApi.adminSearchAnalytics(5),
      medoraApi.adminMedicineDemand(5),
    ]).then(([statsResult, growthResult, doctorsResult, pharmaciesResult, searchesResult, demandResult]) => {
      if (!mounted) return;

      setStats(statsResult.status === 'fulfilled' ? statsResult.value : null);

      const growthData = growthResult.status === 'fulfilled' ? growthResult.value : [];
      setGrowth(
        Array.isArray(growthData)
          ? growthData.slice(-7).map((item) => ({
              label: new Date(item.date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' }),
              count: item.count || 0,
            }))
          : [],
      );

      const doctorsData = doctorsResult.status === 'fulfilled' ? doctorsResult.value : [];
      const pharmaciesData = pharmaciesResult.status === 'fulfilled' ? pharmaciesResult.value : [];
      const searchesData = searchesResult.status === 'fulfilled' ? searchesResult.value : [];
      const demandData = demandResult.status === 'fulfilled' ? demandResult.value : [];
      setTopDoctors(Array.isArray(doctorsData) ? doctorsData : []);
      setTopPharmacies(Array.isArray(pharmaciesData) ? pharmaciesData : []);
      setTopSearches(Array.isArray(searchesData) ? searchesData : []);
      setMedicineDemand(Array.isArray(demandData) ? demandData : []);

      const failedCount = [statsResult, growthResult, doctorsResult, pharmaciesResult, searchesResult, demandResult]
        .filter((result) => result.status === 'rejected').length;
      setStatsError(
        failedCount > 0
          ? lang === 'ar'
            ? 'تعذر تحميل بعض بيانات لوحة التحكم. يمكنك الاستمرار وسيتم تحديثها عند إعادة المحاولة.'
            : 'Some dashboard data could not be loaded. You can continue and retry shortly.'
          : '',
      );
    });

    return () => {
      mounted = false;
    };
  }, [lang]);

  const platformKpis = useMemo(
    () => [
      { id: 'users', label: localizedText('إجمالي المستخدمين', 'Total users'), value: stats?.users ?? 0, hint: localizedText('كل الحسابات', 'All accounts') },
      { id: 'doctors', label: localizedText('الأطباء', 'Doctors'), value: stats?.doctors ?? 0, hint: localizedText('الملفات الطبية', 'Doctor profiles') },
      { id: 'pharmacies', label: localizedText('الصيدليات', 'Pharmacies'), value: stats?.pharmacies ?? 0, hint: localizedText('ملفات الصيدليات', 'Pharmacy profiles') },
      { id: 'medicines', label: localizedText('الأدوية', 'Medicines'), value: stats?.medicines ?? 0, hint: localizedText('كتالوج الأدوية', 'Medicine catalog') },
    ],
    [stats],
  );

  const alerts = useMemo(() => {
    if (!stats) return [];
    return [
      {
        id: 'doctors',
        count: stats.pendingDoctorVerifications || 0,
        title: COPY.doctorsPending,
        desc: localizedText('تحتاج مراجعة واعتماد.', 'Need review and approval.'),
      },
      {
        id: 'pharmacies',
        count: stats.pendingPharmacyVerifications || 0,
        title: COPY.pharmaciesPending,
        desc: localizedText('تحتاج مراجعة واعتماد.', 'Need review and approval.'),
      },
      {
        id: 'reports',
        count: stats.pendingReports || 0,
        title: COPY.reportsPending,
        desc: localizedText('يوجد بلاغات مفتوحة تحتاج حسمًا.', 'There are open reports that need resolution.'),
      },
      {
        id: 'appointments',
        count: stats.pendingAppointments || 0,
        title: COPY.appointmentsPending,
        desc: localizedText('لا تزال بانتظار إجراء إداري.', 'Still waiting for an admin action.'),
      },
    ].filter((item) => item.count > 0);
  }, [stats]);

  return (
    <AdminLayout title={COPY.title} subtitle={COPY.subtitle}>
      <div className="mb-6 overflow-hidden rounded-3xl border border-[#d7e7e5] bg-gradient-to-l from-[#0b5e52] via-[#119a8a] to-[#14b8a6] p-6 text-white shadow-[0_22px_60px_rgba(8,94,82,0.3)] sm:p-7">
        <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold backdrop-blur">
              <ShieldCheck size={12} />
              {text(COPY.heroBadge)}
            </div>
            <h2 className="mt-3 text-[22px] font-black sm:text-[28px]">{text(COPY.heroTitle)}</h2>
            <p className="mt-2 max-w-xl text-[12px] leading-7 text-white/85 sm:text-[13px]">
              {text(COPY.heroDesc)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate('/admin/reports')}
              className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-[12px] font-bold text-white backdrop-blur transition hover:bg-white/25"
            >
              <TrendingUp size={14} />
              {text(COPY.reports)}
            </button>
            <button
              onClick={() => navigate('/admin/doctors?status=pending')}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[12px] font-bold text-[#119a8a] transition hover:bg-[#f3fafa]"
            >
              <Stethoscope size={14} />
              {text(COPY.pendingVerify)}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {platformKpis.map((kpi) => {
          const meta = KPI_META[kpi.id];
          return <KpiCard key={kpi.id} {...kpi} Icon={meta?.Icon} tone={meta?.tone} />;
        })}
      </div>

      {statsError && <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">{statsError}</div>}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <SectionCard title={COPY.usersGrowthTitle} description={COPY.usersGrowthDesc} icon={BarChart3}>
          <SimpleTrend rows={growth} />
        </SectionCard>

        <SectionCard title={COPY.alertsTitle} icon={AlertTriangle}>
          {alerts.length === 0 ? (
            <div className="py-12 text-center text-[12px] text-slate-500">{text(COPY.alertsEmpty)}</div>
          ) : (
            <div className="flex flex-col gap-3">
              {alerts.map((alert) => {
                const meta = ALERT_META[alert.id];
                const AlertIcon = meta.Icon;
                return (
                  <button
                    key={alert.id}
                    onClick={() => navigate(meta.path)}
                    className="flex items-start gap-3 rounded-2xl border border-[#e4eeee] bg-white p-3 text-start transition hover:border-[#14b8a6]"
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: `${meta.tone}1a`, color: meta.tone }}
                    >
                      <AlertIcon size={14} />
                    </span>
                    <div className="flex-1">
                      <div className="text-[12px] font-extrabold text-[#084036]">
                        {formatLocalizedNumber(alert.count, lang)} {text(alert.title)}
                      </div>
                      <div className="mt-0.5 text-[11px] leading-6 text-slate-500">{text(alert.desc)}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <SectionCard title={COPY.topDoctorsTitle} icon={Stethoscope}>
          <RankingList rows={topDoctors} emptyText={COPY.emptyRanking} valueLabel={localizedText('مشاهدة', 'views')} />
        </SectionCard>

        <SectionCard title={COPY.topPharmaciesTitle} icon={Building2}>
          <RankingList rows={topPharmacies} emptyText={COPY.emptyRanking} valueLabel={localizedText('مشاهدة', 'views')} nameKey="pharmacyName" />
        </SectionCard>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <SectionCard title={COPY.topSearchesTitle} icon={Search}>
          <AnalyticsList
            rows={topSearches}
            emptyText={COPY.emptyRanking}
            getName={(row) => row.query || '-'}
            getMeta={(row) => row.category || text(localizedText('عام', 'General'))}
            getValue={(row) => row.count || 0}
            valueLabel={localizedText('بحث', 'searches')}
          />
        </SectionCard>

        <SectionCard title={COPY.medicineDemandTitle} icon={Pill}>
          <AnalyticsList
            rows={medicineDemand}
            emptyText={COPY.emptyRanking}
            getName={(row) => row.medicineName || '-'}
            getMeta={(row) => `${formatLocalizedNumber(row.availablePharmaciesCount || 0, lang)} ${text(localizedText('صيدلية متاحة', 'available pharmacies'))}`}
            getValue={(row) => row.totalQuantity || 0}
            valueLabel={localizedText('قطعة', 'units')}
          />
        </SectionCard>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: COPY.apptsToday, value: stats?.pendingAppointments ?? 0, Icon: CalendarCheck, tone: '#14b8a6', path: '/admin/appointments' },
          { label: COPY.ordersCount, value: stats?.orders ?? 0, Icon: Package, tone: '#6366f1', path: '/admin/orders' },
          { label: COPY.articlesCount, value: stats?.publishedArticles ?? 0, Icon: Newspaper, tone: '#f59e0b', path: '/admin/articles' },
          { label: COPY.reviewsToday, value: stats?.reviews ?? 0, Icon: FileText, tone: '#ec4899', path: '/admin/reviews' },
        ].map((s) => {
          const SIcon = s.Icon;
          return (
            <button
              key={s.path}
              onClick={() => navigate(s.path)}
              className="flex items-center justify-between gap-3 rounded-2xl border border-[#e4eeee] bg-white p-4 text-start transition hover:-translate-y-0.5 hover:border-[#14b8a6] hover:shadow-[0_14px_32px_rgba(41,93,96,0.1)]"
            >
              <ArrowUpRight size={15} className="text-[#14b8a6]" />
              <div className="flex-1">
                <div className="text-[22px] font-black text-[#084036]">{formatLocalizedNumber(s.value, lang)}</div>
                <div className="text-[11px] text-[#486466]">{text(s.label)}</div>
              </div>
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ background: `${s.tone}1a`, color: s.tone }}
              >
                <SIcon size={16} />
              </span>
            </button>
          );
        })}
      </div>
    </AdminLayout>
  );
}

function AnalyticsList({ rows, emptyText, getName, getMeta, getValue, valueLabel }) {
  const { lang, text } = useLocalizedContent();

  if (!rows.length) {
    return <div className="py-12 text-center text-[12px] text-slate-500">{text(emptyText)}</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, index) => (
        <div key={`${getName(row)}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl border border-[#eef5f5] bg-[#f8fbfb] p-4">
          <div className="text-[12px] font-extrabold text-[#084036]">
            {formatLocalizedNumber(getValue(row), lang)} {text(valueLabel)}
          </div>
          <div className="min-w-0 text-start">
            <div className="truncate text-[12px] font-extrabold text-[#084036]" dir="auto">{getName(row)}</div>
            <div className="mt-0.5 text-[10px] text-slate-500">{getMeta(row)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RankingList({ rows, emptyText, valueLabel, nameKey = 'fullName' }) {
  const { lang, text } = useLocalizedContent();

  if (!rows.length) {
    return <div className="py-12 text-center text-[12px] text-slate-500">{text(emptyText)}</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, index) => (
        <div key={`${nameKey}-${index}`} className="flex items-center justify-between rounded-2xl border border-[#eef5f5] bg-[#f8fbfb] p-4">
          <div className="text-[12px] font-extrabold text-[#084036]">
            {formatLocalizedNumber(row.viewCount || 0, lang)} {text(valueLabel)}
          </div>
          <div className="text-start">
            <div className="text-[12px] font-extrabold text-[#084036]">{row[nameKey]}</div>
            <div className="text-[10px] text-slate-500">
              {formatLocalizedNumber(row.reviewsCount || 0, lang)} {text(localizedText('تقييم', 'reviews'))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
