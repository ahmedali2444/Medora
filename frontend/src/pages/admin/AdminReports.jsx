import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, Download, FileText, History, Pill, ScanSearch as Search, ShieldAlert, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/layout/AdminLayout';
import SectionCard from '../../components/admin/shared/SectionCard';
import StatusPill from '../../components/admin/shared/StatusPill';
import DataTable from '../../components/admin/shared/DataTable';
import AdminActionDialog from '../../components/admin/shared/AdminActionDialog';
import LinkedFilterPills from '../../components/admin/shared/LinkedFilterPills';
import { LINKED_FILTER_KEYS, readLinkedFilters } from '../../components/admin/shared/linkedFilterUtils';
import { VERIFY_STATUS_META, formatDate } from '../../components/admin/data/adminData';
import { useLocalizedContent } from '../../hooks/useLocalizedContent';
import { formatLocalizedNumber, localizedText } from '../../utils/localization';
import { medoraApi } from '../../api/medoraApi';
import { triggerBrowserDownload } from '../../utils/download';

const PAGE_SIZE = 10;
const AUDIT_PAGE_SIZE = 12;

const EXPORTS = [
  { id: 'users', title: localizedText('تصدير المستخدمين', 'Export users'), description: localizedText('كل حسابات المستخدمين المسجلة', 'All registered user accounts') },
  { id: 'doctors', title: localizedText('تصدير الأطباء', 'Export doctors'), description: localizedText('ملفات الأطباء والتراخيص', 'Doctor profiles and licenses') },
  { id: 'pharmacies', title: localizedText('تصدير الصيدليات', 'Export pharmacies'), description: localizedText('ملفات الصيدليات والحالة الحالية', 'Pharmacy profiles and current statuses') },
  { id: 'medicines', title: localizedText('تصدير الأدوية', 'Export medicines'), description: localizedText('كتالوج الأدوية والمخزون المجمع', 'Medicine catalog and aggregate stock') },
  { id: 'orders', title: localizedText('تصدير الطلبات', 'Export orders'), description: localizedText('طلبات الأدوية وحالات الدفع والتسليم', 'Medicine orders, payment, and delivery status') },
  { id: 'appointments', title: localizedText('تصدير المواعيد', 'Export appointments'), description: localizedText('المواعيد وتدفق الحالة', 'Appointments and status flow') },
  { id: 'articles', title: localizedText('تصدير المقالات', 'Export articles'), description: localizedText('المحتوى التحريري وحالة المراجعة', 'Editorial content and moderation status') },
  { id: 'reviews', title: localizedText('تصدير التقييمات', 'Export reviews'), description: localizedText('التقييمات والتعليقات وحالة الظهور', 'Ratings, comments, and visibility status') },
  { id: 'reports', title: localizedText('تصدير البلاغات', 'Export reports'), description: localizedText('بلاغات المستخدمين وحالة الحل', 'User reports and resolution status') },
  { id: 'lookups', title: localizedText('تصدير القوائم الأساسية', 'Export lookups'), description: localizedText('التخصصات والمحافظات والمدن', 'Specialties, governorates, and cities') },
];

const EXPORT_HANDLERS = {
  users: medoraApi.adminExportUsers,
  doctors: medoraApi.adminExportDoctors,
  pharmacies: medoraApi.adminExportPharmacies,
  medicines: medoraApi.adminExportMedicines,
  orders: medoraApi.adminExportOrders,
  appointments: medoraApi.adminExportAppointments,
  articles: medoraApi.adminExportArticles,
  reviews: medoraApi.adminExportReviews,
  reports: medoraApi.adminExportReports,
  lookups: medoraApi.adminExportLookups,
};

const COPY = {
  title: localizedText('التقارير والتحليلات', 'Reports & analytics'),
  subtitle: localizedText('تتبّع البلاغات، تصدير البيانات، ومراجعة سجل الإدارة', 'Track reports, export data, and review the admin audit log'),
  totalUsers: localizedText('المستخدمون', 'Users'),
  totalMedicines: localizedText('الأدوية', 'Medicines'),
  totalReviews: localizedText('التقييمات', 'Reviews'),
  pendingReports: localizedText('بلاغات معلقة', 'Pending reports'),
  exportsTitle: localizedText('ملفات التصدير', 'Export files'),
  exportsDesc: localizedText('تحميل CSV لكل أجزاء التشغيل الأساسية', 'Download CSV for core operational areas'),
  download: localizedText('تحميل', 'Download'),
  reportsTitle: localizedText('بلاغات المستخدمين', 'User reports'),
  reportsDesc: localizedText('مراجعة البلاغات المفتوحة وحلّها بملاحظة', 'Review open reports and resolve them with a note'),
  auditTitle: localizedText('سجل عمليات الأدمن', 'Admin audit log'),
  auditDesc: localizedText('آخر الإجراءات الإدارية المسجلة', 'Latest recorded admin actions'),
  healthTitle: localizedText('صحة النظام', 'System health'),
  healthDesc: localizedText('فحص الخدمات الأساسية والإعدادات والرفع والبريد', 'Checks core services, settings, uploads, and email'),
  searchAnalyticsTitle: localizedText('أكثر عمليات البحث', 'Top searches'),
  medicineDemandTitle: localizedText('أعلى أدوية مطلوبة', 'Top medicine demand'),
  searchPlaceholder: localizedText('ابحث في البلاغات أو السجل...', 'Search reports or audit log...'),
  all: localizedText('الكل', 'All'),
  pending: localizedText('معلّق', 'Pending'),
  resolved: localizedText('محلول', 'Resolved'),
  resolve: localizedText('حل البلاغ', 'Resolve report'),
  empty: localizedText('لا توجد بلاغات بهذا الفلتر.', 'No reports match this filter.'),
  reason: localizedText('السبب', 'Reason'),
  resolution: localizedText('الحل', 'Resolution'),
  reporter: localizedText('المبلّغ', 'Reporter'),
  target: localizedText('الجهة', 'Target'),
  status: localizedText('الحالة', 'Status'),
  action: localizedText('الإجراء', 'Action'),
  entity: localizedText('الكيان', 'Entity'),
  actor: localizedText('المنفذ', 'Actor'),
  details: localizedText('التفاصيل', 'Details'),
  date: localizedText('التاريخ', 'Date'),
  resolveTitle: localizedText('حل البلاغ؟', 'Resolve report?'),
  resolveDesc: localizedText('أضف ملاحظة توضح كيف تم التعامل مع البلاغ.', 'Add a note describing how this report was handled.'),
};

const REPORT_STATUS_META = {
  pending: VERIFY_STATUS_META.pending,
  resolved: VERIFY_STATUS_META.verified,
};

export default function AdminReports() {
  const { lang, text } = useLocalizedContent();
  const [searchParams, setSearchParams] = useSearchParams();
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [topSearches, setTopSearches] = useState([]);
  const [medicineDemand, setMedicineDemand] = useState([]);
  const [reports, setReports] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [action, setAction] = useState(null);
  const [ui, setUi] = useState({ loading: true, actionLoading: false, error: '', notice: '' });
  const linkedFilters = readLinkedFilters(searchParams);
  const userId = searchParams.get('userId') || '';
  const actorUserId = searchParams.get('actorUserId') || '';
  const entityType = searchParams.get('entityType') || '';
  const entityId = searchParams.get('entityId') || '';
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

  const loadReportsPage = useCallback(async () => {
    setUi((current) => ({ ...current, loading: true, error: '' }));
    try {
      const [statsResult, healthResult, searchesResult, demandResult, reportsResult, auditResult] = await Promise.allSettled([
        medoraApi.adminStats(),
        medoraApi.adminSystemHealth(),
        medoraApi.adminSearchAnalytics(5),
        medoraApi.adminMedicineDemand(5),
        medoraApi.adminReports({
          page,
          pageSize: PAGE_SIZE,
          search: query,
          status: status === 'all' ? '' : status,
          userId,
          entityType,
          entityId,
          dateFrom,
          dateTo,
          sortBy,
          sortDir,
        }),
        medoraApi.adminAuditLogs({
          page: auditPage,
          pageSize: AUDIT_PAGE_SIZE,
          search: query,
          actorUserId,
          entityType,
          entityId,
          dateFrom,
          dateTo,
          sortBy,
          sortDir,
        }),
      ]);
      if (reportsResult.status === 'rejected') throw reportsResult.reason;

      const statsData = statsResult.status === 'fulfilled' ? statsResult.value : null;
      const healthData = healthResult.status === 'fulfilled' ? healthResult.value : null;
      const searchesData = searchesResult.status === 'fulfilled' ? searchesResult.value : [];
      const demandData = demandResult.status === 'fulfilled' ? demandResult.value : [];
      const reportsData = reportsResult.value;
      const auditData = auditResult.status === 'fulfilled' ? auditResult.value : {};

      setStats(statsData);
      setHealth(healthData);
      setTopSearches(Array.isArray(searchesData) ? searchesData : []);
      setMedicineDemand(Array.isArray(demandData) ? demandData : []);
      setReports(Array.isArray(reportsData?.items) ? reportsData.items : []);
      setTotal(Number(reportsData?.total || 0));
      setAuditLogs(Array.isArray(auditData?.items) ? auditData.items : []);
      setAuditTotal(Number(auditData?.total || 0));
      setUi((current) => ({ ...current, loading: false, error: '' }));
    } catch (error) {
      setStats(null);
      setHealth(null);
      setTopSearches([]);
      setMedicineDemand([]);
      setReports([]);
      setAuditLogs([]);
      setError(error.message || 'Unable to load reports');
    }
  }, [actorUserId, auditPage, dateFrom, dateTo, entityId, entityType, page, query, sortBy, sortDir, status, userId]);

  const clearLinkedFilters = () => {
    const next = new URLSearchParams(searchParams);
    LINKED_FILTER_KEYS.forEach((key) => next.delete(key));
    setPage(1);
    setAuditPage(1);
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    queueMicrotask(() => loadReportsPage());
    return () => {
      if (setNotice.timer) window.clearTimeout(setNotice.timer);
    };
  }, [loadReportsPage, setNotice]);

  const exportFile = async (type) => {
    try {
      const handler = EXPORT_HANDLERS[type];
      if (!handler) return;
      triggerBrowserDownload(await handler());
      setNotice(text(localizedText('تم تنزيل الملف', 'File downloaded')));
    } catch (error) {
      setError(error.message || 'Unable to download file');
    }
  };

  const resolveReport = async (resolution) => {
    if (!action?.report) return;
    setUi((current) => ({ ...current, actionLoading: true, error: '' }));
    try {
      await medoraApi.adminResolveReport(action.report.id, resolution ? { resolution } : {});
      setAction(null);
      setNotice(text(localizedText('تم حل البلاغ', 'Report resolved')));
      await loadReportsPage();
    } catch (error) {
      setError(error.message || 'Unable to resolve report');
    } finally {
      setUi((current) => ({ ...current, actionLoading: false }));
    }
  };

  const kpis = useMemo(
    () => [
      { id: 'users', label: COPY.totalUsers, value: stats?.users ?? 0, tone: '#14b8a6' },
      { id: 'medicines', label: COPY.totalMedicines, value: stats?.medicines ?? 0, tone: '#6366f1' },
      { id: 'reviews', label: COPY.totalReviews, value: stats?.reviews ?? 0, tone: '#f59e0b' },
      { id: 'reports', label: COPY.pendingReports, value: stats?.pendingReports ?? 0, tone: '#ec4899' },
    ],
    [stats],
  );

  const auditColumns = [
    {
      key: 'action',
      label: COPY.action,
      width: '0.9fr',
      render: (row) => <span className="text-[12px] font-extrabold text-[#084036]">{row.action || '-'}</span>,
    },
    {
      key: 'entityType',
      label: COPY.entity,
      width: '0.9fr',
      render: (row) => <span className="text-[11px] text-slate-600">{row.entityType || '-'} #{row.entityId || '-'}</span>,
    },
    {
      key: 'actor',
      label: COPY.actor,
      width: '1fr',
      render: (row) => <span className="text-[11px] text-slate-600">{row.actorEmail || row.actorUserId || '-'}</span>,
    },
    {
      key: 'details',
      label: COPY.details,
      width: '1.4fr',
      render: (row) => <span className="line-clamp-2 text-[11px] leading-5 text-slate-600">{row.details || '-'}</span>,
    },
    {
      key: 'createdAt',
      label: COPY.date,
      width: '0.8fr',
      align: 'center',
      render: (row) => <span className="text-[11px] text-slate-500">{formatDate(row.createdAt, lang)}</span>,
    },
  ];

  return (
    <AdminLayout title={COPY.title} subtitle={COPY.subtitle}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <div key={item.id} className="rounded-2xl border border-[#e4eeee] bg-white p-4 shadow-[0_8px_22px_rgba(41,93,96,0.06)]">
            <div className="mb-2 h-1 w-10 rounded-full" style={{ background: item.tone }} />
            <div className="text-[22px] font-black text-[#084036]">{formatLocalizedNumber(item.value, lang)}</div>
            <div className="text-[11px] text-[#486466]">{text(item.label)}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <SectionCard title={COPY.healthTitle} description={COPY.healthDesc} icon={Activity}>
          <SystemHealthSummary health={health} />
        </SectionCard>

        <SectionCard title={COPY.searchAnalyticsTitle} icon={Search}>
          <ReportAnalyticsList
            rows={topSearches}
            empty={localizedText('لا توجد عمليات بحث مسجلة.', 'No searches recorded.')}
            getName={(row) => row.query || '-'}
            getMeta={(row) => row.category || text(localizedText('عام', 'General'))}
            getValue={(row) => row.count || 0}
            valueLabel={localizedText('بحث', 'searches')}
          />
        </SectionCard>

        <SectionCard title={COPY.medicineDemandTitle} icon={Pill}>
          <ReportAnalyticsList
            rows={medicineDemand}
            empty={localizedText('لا توجد بيانات أدوية كافية.', 'Not enough medicine data.')}
            getName={(row) => row.medicineName || '-'}
            getMeta={(row) => `${formatLocalizedNumber(row.availablePharmaciesCount || 0, lang)} ${text(localizedText('صيدلية متاحة', 'available pharmacies'))}`}
            getValue={(row) => row.totalQuantity || 0}
            valueLabel={localizedText('قطعة', 'units')}
          />
        </SectionCard>
      </div>

      <div className="mt-5">
        <SectionCard title={COPY.exportsTitle} description={COPY.exportsDesc} icon={FileText}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {EXPORTS.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[#e4eeee] bg-[#f7fbfb] p-4">
                <button
                  type="button"
                  onClick={() => exportFile(item.id)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#14b8a6] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#119a8a]"
                >
                  <Download size={12} />
                  {text(COPY.download)}
                </button>
                <div className="flex-1 text-start">
                  <div className="text-[12px] font-extrabold text-[#084036]">{text(item.title)}</div>
                  <div className="mt-0.5 text-[11px] text-slate-500">{text(item.description)}</div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.1fr]">
        <SectionCard title={COPY.reportsTitle} description={`${formatLocalizedNumber(total, lang)} ${text(COPY.reportsDesc)}`} icon={BarChart3}>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setPage(1);
                  setAuditPage(1);
                  setQuery(event.target.value);
                }}
                placeholder={text(COPY.searchPlaceholder)}
                className="h-10 w-full rounded-full border border-[#e4eeee] bg-white pr-9 pl-4 text-[12px] outline-none transition focus:border-[#14b8a6]"
              />
              <Search size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#14b8a6]" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['all', 'pending', 'resolved'].map((tab) => (
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
                  {text(COPY[tab])}
                </button>
              ))}
            </div>
          </div>

          <LinkedFilterPills filters={linkedFilters} onClear={clearLinkedFilters} />

          <div className="flex flex-col gap-3">
            {ui.loading && <div className="rounded-xl border border-[#d7ece8] bg-[#e6f7f7] px-4 py-3 text-center text-[12px] font-bold text-[#0e7c6e]">...</div>}
            {ui.error && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-[12px] font-bold text-amber-700">{ui.error}</div>}
            {!ui.loading && reports.length === 0 && <div className="py-10 text-center text-[12px] text-slate-500">{text(COPY.empty)}</div>}
            {reports.map((report) => (
              <div key={report.id} className="rounded-2xl border border-[#e4eeee] bg-white p-4 shadow-[0_4px_18px_rgba(41,93,96,0.04)]">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <StatusPill meta={REPORT_STATUS_META[report.status] || VERIFY_STATUS_META.pending} />
                    <span className="text-[10px] text-slate-400">{formatDate(report.createdAt, lang)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-start">
                    <ShieldAlert size={14} className="text-[#a35a00]" />
                    <div className="text-[12px] font-extrabold text-[#084036]">#{report.id}</div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoCard label={COPY.reporter} value={`${report.reporterName || '-'}${report.reporterEmail ? ` • ${report.reporterEmail}` : ''}`} />
                  <InfoCard label={COPY.target} value={`${report.targetType || '-'} #${report.targetId || '-'}`} />
                  <InfoCard label={COPY.reason} value={report.reason || '-'} />
                  <InfoCard label={COPY.resolution} value={report.resolution || '-'} />
                </div>

                {report.status === 'pending' && (
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setAction({ report })}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#14b8a6] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#119a8a]"
                    >
                      <Users size={12} />
                      {text(COPY.resolve)}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <Pager page={page} totalPages={Math.max(Math.ceil(total / PAGE_SIZE), 1)} onPageChange={setPage} />
        </SectionCard>

        <SectionCard title={COPY.auditTitle} description={COPY.auditDesc} icon={History}>
          <DataTable
            columns={auditColumns}
            rows={auditLogs}
            empty={text(localizedText('لا يوجد سجل مطابق.', 'No matching audit logs.'))}
            loading={ui.loading}
            error={ui.error}
            pagination={{ page: auditPage, totalPages: Math.max(Math.ceil(auditTotal / AUDIT_PAGE_SIZE), 1), onPageChange: setAuditPage }}
          />
        </SectionCard>
      </div>

      {ui.notice && <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">{ui.notice}</div>}

      <AdminActionDialog
        open={!!action}
        title={COPY.resolveTitle}
        description={COPY.resolveDesc}
        confirmLabel={COPY.resolve}
        tone="success"
        requiresReason
        loading={ui.actionLoading}
        onClose={() => setAction(null)}
        onConfirm={resolveReport}
      />
    </AdminLayout>
  );
}

function SystemHealthSummary({ health }) {
  const { lang, text } = useLocalizedContent();
  const components = health?.components || {};
  const rows = [
    [localizedText('الخدمة الأساسية', 'Core service'), components.database],
    [localizedText('الإعدادات', 'Settings'), components.settings],
    [localizedText('مسار الرفع', 'Uploads path'), components.uploads],
    [localizedText('إعدادات البريد', 'Email settings'), components.email],
  ];

  if (!health) {
    return <div className="rounded-xl bg-[#f8fbfb] px-3 py-4 text-center text-[12px] font-bold text-slate-500">—</div>;
  }

  return (
    <div className="space-y-3">
      <div className={`rounded-2xl px-3 py-3 text-[12px] font-extrabold ${health.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
        {health.ok ? text(localizedText('كل الفحوصات الأساسية سليمة', 'All basic checks are healthy')) : text(localizedText('يوجد فحص يحتاج مراجعة', 'A check needs attention'))}
      </div>
      <div className="space-y-2">
        {rows.map(([label, component]) => (
          <div key={text(label)} className="flex items-center justify-between gap-3 rounded-xl border border-[#eef5f5] bg-[#fbfefe] px-3 py-2">
            <span className="text-[11px] font-bold text-[#486466]">{text(label)}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${component?.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {component?.ok ? text(localizedText('سليم', 'OK')) : text(localizedText('مراجعة', 'Check'))}
            </span>
          </div>
        ))}
      </div>
      <div className="text-[10px] text-slate-400">
        {text(localizedText('آخر فحص', 'Last check'))}: {formatDate(health.checkedAtUtc, lang)}
      </div>
    </div>
  );
}

function ReportAnalyticsList({ rows, empty, getName, getMeta, getValue, valueLabel }) {
  const { lang, text } = useLocalizedContent();
  if (!rows.length) {
    return <div className="rounded-xl bg-[#f8fbfb] px-3 py-4 text-center text-[12px] font-bold text-slate-500">{text(empty)}</div>;
  }

  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div key={`${getName(row)}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-[#eef5f5] bg-[#fbfefe] px-3 py-2">
          <div className="text-[11px] font-extrabold text-[#084036]">
            {formatLocalizedNumber(getValue(row), lang)} {text(valueLabel)}
          </div>
          <div className="min-w-0 text-start">
            <div className="truncate text-[11px] font-extrabold text-[#084036]" dir="auto">{getName(row)}</div>
            <div className="text-[10px] text-slate-500">{getMeta(row)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function InfoCard({ label, value }) {
  const { text } = useLocalizedContent();

  return (
    <div className="rounded-2xl border border-[#eef5f5] bg-[#f8fbfb] p-4">
      <div className="mb-1 text-[11px] font-extrabold text-[#486466]">{text(label)}</div>
      <div className="break-words text-[12px] leading-6 text-[#084036]">{value}</div>
    </div>
  );
}

function Pager({ page, totalPages, onPageChange }) {
  const { lang, text } = useLocalizedContent();

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-[#e4eeee] bg-[#fbfefe] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-[11px] font-bold text-[#486466]">
        {text(localizedText('صفحة', 'Page'))} {formatLocalizedNumber(page, lang)} {text(localizedText('من', 'of'))} {formatLocalizedNumber(totalPages, lang)}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-xl border border-[#d7ece8] bg-white px-3 py-2 text-[11px] font-bold text-[#119a8a] transition hover:border-[#14b8a6] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {text(localizedText('السابق', 'Previous'))}
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-xl border border-[#d7ece8] bg-white px-3 py-2 text-[11px] font-bold text-[#119a8a] transition hover:border-[#14b8a6] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {text(localizedText('التالي', 'Next'))}
        </button>
      </div>
    </div>
  );
}
