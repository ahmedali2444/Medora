import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Archive, Building2, CheckCircle2, Download, ExternalLink, Eye, EyeOff, Flag, MessagesSquare, ScanSearch as Search, Star, Stethoscope, Users } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/layout/AdminLayout';
import SectionCard from '../../components/admin/shared/SectionCard';
import StatusPill from '../../components/admin/shared/StatusPill';
import DataTable from '../../components/admin/shared/DataTable';
import AdminModal from '../../components/admin/shared/AdminModal';
import AdminActionDialog from '../../components/admin/shared/AdminActionDialog';
import LinkedFilterPills from '../../components/admin/shared/LinkedFilterPills';
import { LINKED_FILTER_KEYS, readLinkedFilters } from '../../components/admin/shared/linkedFilterUtils';
import { REVIEW_STATUS_META, formatDate } from '../../components/admin/data/adminData';
import { useLocalizedContent } from '../../hooks/useLocalizedContent';
import { formatLocalizedNumber, localizedText } from '../../utils/localization';
import { triggerBrowserDownload } from '../../utils/download';
import { medoraApi } from '../../api/medoraApi';

const PAGE_SIZE = 20;
const STATUS_TABS = ['all', 'approved', 'pending', 'flagged'];

const COPY = {
  title: localizedText('التقييمات', 'Reviews'),
  subtitle: localizedText('اعتماد وإخفاء وأرشفة تقييمات المستخدمين من مكان واحد', 'Approve, hide, and archive user reviews from one place'),
  total: localizedText('إجمالي', 'Total'),
  approved: localizedText('معتمدة', 'Approved'),
  pending: localizedText('قيد المراجعة', 'Under review'),
  flagged: localizedText('مخفية', 'Hidden'),
  allReviews: localizedText('كل التقييمات', 'All reviews'),
  reviewsSuffix: localizedText('تقييم', 'reviews'),
  export: localizedText('تصدير', 'Export'),
  searchPlaceholder: localizedText('ابحث بالاسم، الجهة، أو محتوى التعليق...', 'Search by author, target, or comment...'),
  all: localizedText('الكل', 'All'),
  reviewer: localizedText('المراجع', 'Reviewer'),
  target: localizedText('الجهة', 'Target'),
  rating: localizedText('التقييم', 'Rating'),
  comment: localizedText('التعليق', 'Comment'),
  date: localizedText('التاريخ', 'Date'),
  status: localizedText('الحالة', 'Status'),
  actions: localizedText('إجراءات', 'Actions'),
  approve: localizedText('اعتماد', 'Approve'),
  hide: localizedText('إخفاء', 'Hide'),
  unhide: localizedText('إظهار', 'Unhide'),
  archive: localizedText('أرشفة', 'Archive'),
  bulkApprove: localizedText('اعتماد المحدد', 'Approve selected'),
  bulkHide: localizedText('إخفاء المحدد', 'Hide selected'),
  bulkUnhide: localizedText('إظهار المحدد', 'Unhide selected'),
  bulkArchive: localizedText('أرشفة المحدد', 'Archive selected'),
  selected: localizedText('محدد', 'selected'),
  empty: localizedText('لا توجد تقييمات بهذا الفلتر.', 'No reviews match this filter.'),
  archiveTitle: localizedText('أرشفة التقييم؟', 'Archive review?'),
  archiveDesc: localizedText('سيتم إخفاء التقييم من الإدارة والقوائم العامة مع حفظ سبب الإجراء.', 'The review will be removed from admin/public lists while preserving the action reason.'),
  view: localizedText('عرض', 'View'),
  details: localizedText('تفاصيل التقييم', 'Review details'),
};

const mapReviewStatus = (review) => {
  if (review.isHidden) return 'flagged';
  if (review.verified) return 'approved';
  return 'pending';
};

const mapReview = (review) => ({
  id: review.id,
  reviewerUserId: review.reviewerUserId || '',
  doctorId: review.doctorId || '',
  pharmacyId: review.pharmacyId || '',
  targetType: review.targetType || '',
  author: localizedText(review.reviewerName || '-', review.reviewerName || '-'),
  target: localizedText(review.doctorName || review.pharmacyName || review.targetType || '-', review.doctorName || review.pharmacyName || review.targetType || '-'),
  rating: review.rating || 0,
  date: review.createdAt,
  comment: localizedText(review.comment || '-', review.comment || '-'),
  status: mapReviewStatus(review),
});

export default function AdminReviews() {
  const { lang, text } = useLocalizedContent();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [action, setAction] = useState(null);
  const [ui, setUi] = useState({ loading: true, actionLoading: false, error: '', notice: '' });
  const linkedFilters = readLinkedFilters(searchParams);
  const userId = searchParams.get('userId') || '';
  const doctorId = searchParams.get('doctorId') || '';
  const pharmacyId = searchParams.get('pharmacyId') || '';
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

  const loadReviews = useCallback(async () => {
    setUi((current) => ({ ...current, loading: true, error: '' }));
    try {
      const data = await medoraApi.adminReviews({
        page,
        pageSize: PAGE_SIZE,
        search: query,
        status: status === 'all' ? '' : status,
        userId,
        doctorId,
        pharmacyId,
        dateFrom,
        dateTo,
        sortBy,
        sortDir,
      });
      const mapped = Array.isArray(data?.items) ? data.items.map(mapReview) : [];
      setReviews(mapped);
      setTotal(Number(data?.total || mapped.length));
      setSelectedIds([]);
      setUi((current) => ({ ...current, loading: false, error: '' }));
    } catch (error) {
      setReviews([]);
      setTotal(0);
      setError(error.message || 'Unable to load reviews');
    }
  }, [dateFrom, dateTo, doctorId, page, pharmacyId, query, sortBy, sortDir, status, userId]);

  const clearLinkedFilters = () => {
    const next = new URLSearchParams(searchParams);
    LINKED_FILTER_KEYS.forEach((key) => next.delete(key));
    setPage(1);
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    queueMicrotask(() => loadReviews());
    return () => {
      if (setNotice.timer) window.clearTimeout(setNotice.timer);
    };
  }, [loadReviews, setNotice]);

  const approveReview = async (reviewId) => {
    try {
      await medoraApi.adminApproveReview(reviewId);
      setNotice(text(localizedText('تم اعتماد التقييم', 'Review approved')));
      await loadReviews();
    } catch (error) {
      setError(error.message || 'Unable to approve review');
    }
  };

  const toggleVisibility = async (review) => {
    const hide = review.status !== 'flagged';
    try {
      await medoraApi.adminHideReview(review.id, { isActive: hide });
      setNotice(text(hide ? localizedText('تم إخفاء التقييم', 'Review hidden') : localizedText('تم إظهار التقييم', 'Review visible')));
      await loadReviews();
    } catch (error) {
      setError(error.message || 'Unable to update review visibility');
    }
  };

  const archiveReview = async (reason) => {
    if (!action?.review) return;
    setUi((current) => ({ ...current, actionLoading: true, error: '' }));
    try {
      await medoraApi.adminArchiveReview(action.review.id, reason ? { reason } : {});
      setAction(null);
      setNotice(text(localizedText('تمت أرشفة التقييم', 'Review archived')));
      await loadReviews();
    } catch (error) {
      setError(error.message || 'Unable to archive review');
    } finally {
      setUi((current) => ({ ...current, actionLoading: false }));
    }
  };

  const navigateWithParams = (path, nextParams) => {
    const search = new URLSearchParams();
    Object.entries(nextParams || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') search.set(key, value);
    });
    navigate(`${path}?${search.toString()}`);
    setSelectedReview(null);
  };

  const selectedRows = reviews.filter((review) => selectedIds.map(String).includes(String(review.id)));

  const bulkApprove = async () => {
    const targets = selectedRows.filter((review) => review.status !== 'approved');
    if (!targets.length) return;
    try {
      await Promise.all(targets.map((review) => medoraApi.adminApproveReview(review.id)));
      setSelectedIds([]);
      setNotice(text(localizedText('تم اعتماد التقييمات المحددة', 'Selected reviews approved')));
      await loadReviews();
    } catch (error) {
      setError(error.message || 'Unable to approve selected reviews');
    }
  };

  const bulkVisibility = async (hide) => {
    const targets = selectedRows.filter((review) => (hide ? review.status !== 'flagged' : review.status === 'flagged'));
    if (!targets.length) return;
    try {
      await Promise.all(targets.map((review) => medoraApi.adminHideReview(review.id, { isActive: hide })));
      setSelectedIds([]);
      setNotice(text(hide ? localizedText('تم إخفاء التقييمات المحددة', 'Selected reviews hidden') : localizedText('تم إظهار التقييمات المحددة', 'Selected reviews visible')));
      await loadReviews();
    } catch (error) {
      setError(error.message || 'Unable to update selected reviews');
    }
  };

  const bulkArchive = async () => {
    if (!selectedRows.length) return;
    setUi((current) => ({ ...current, actionLoading: true, error: '' }));
    try {
      await Promise.all(selectedRows.map((review) => medoraApi.adminArchiveReview(review.id, {})));
      setSelectedIds([]);
      setNotice(text(localizedText('تمت أرشفة التقييمات المحددة', 'Selected reviews archived')));
      await loadReviews();
    } catch (error) {
      setError(error.message || 'Unable to archive selected reviews');
    } finally {
      setUi((current) => ({ ...current, actionLoading: false }));
    }
  };

  const exportReviews = async () => {
    try {
      triggerBrowserDownload(await medoraApi.adminExportReviews());
      setNotice(text(localizedText('تم تنزيل ملف التقييمات', 'Reviews export downloaded')));
    } catch (error) {
      setError(error.message || 'Unable to export reviews');
    }
  };

  const stats = useMemo(() => ({
    approved: reviews.filter((review) => review.status === 'approved').length,
    pending: reviews.filter((review) => review.status === 'pending').length,
    flagged: reviews.filter((review) => review.status === 'flagged').length,
  }), [reviews]);

  const columns = [
    {
      key: 'author',
      label: COPY.reviewer,
      width: '1fr',
      render: (row) => <span className="text-[12px] font-extrabold text-[#084036]">{text(row.author)}</span>,
    },
    {
      key: 'target',
      label: COPY.target,
      width: '1fr',
      render: (row) => <span className="text-[11px] text-slate-600">{text(row.target)}</span>,
    },
    {
      key: 'rating',
      label: COPY.rating,
      width: '0.75fr',
      align: 'center',
      render: (row) => (
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} size={11} fill={i <= row.rating ? '#f4a524' : '#e4eeee'} color={i <= row.rating ? '#f4a524' : '#e4eeee'} />
          ))}
        </div>
      ),
    },
    {
      key: 'comment',
      label: COPY.comment,
      width: '1.7fr',
      render: (row) => <span className="line-clamp-2 text-[11px] leading-5 text-slate-600">{text(row.comment)}</span>,
    },
    {
      key: 'date',
      label: COPY.date,
      width: '0.85fr',
      align: 'center',
      render: (row) => <span className="text-[11px] text-slate-500">{formatDate(row.date, lang)}</span>,
    },
    {
      key: 'status',
      label: COPY.status,
      width: '0.85fr',
      align: 'center',
      render: (row) => <StatusPill meta={REVIEW_STATUS_META[row.status]} />,
    },
    {
      key: 'actions',
      label: COPY.actions,
      width: '1fr',
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <IconButton title={COPY.view} onClick={() => setSelectedReview(row)} tone="#2465b6" Icon={Eye} />
          {row.status !== 'approved' && <IconButton title={COPY.approve} onClick={() => approveReview(row.id)} tone="#0e7c6e" Icon={CheckCircle2} />}
          <IconButton title={row.status === 'flagged' ? COPY.unhide : COPY.hide} onClick={() => toggleVisibility(row)} tone="#a35a00" Icon={row.status === 'flagged' ? EyeOff : Flag} />
          <IconButton title={COPY.archive} onClick={() => setAction({ review: row })} tone="#c2362f" Icon={Archive} />
        </div>
      ),
    },
  ];

  return (
    <AdminLayout title={COPY.title} subtitle={COPY.subtitle}>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatBox label={COPY.total} value={total} tone="#14b8a6" Icon={MessagesSquare} />
        <StatBox label={COPY.approved} value={stats.approved} tone="#0e7c6e" Icon={CheckCircle2} />
        <StatBox label={COPY.pending} value={stats.pending} tone="#a35a00" Icon={Flag} />
        <StatBox label={COPY.flagged} value={stats.flagged} tone="#c2362f" Icon={AlertTriangle} />
      </div>

      <SectionCard
        title={COPY.allReviews}
        description={`${formatLocalizedNumber(total, lang)} ${text(COPY.reviewsSuffix)}`}
        icon={MessagesSquare}
        action={
          <button
            type="button"
            onClick={exportReviews}
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
                {tab === 'all' ? text(COPY.all) : text(REVIEW_STATUS_META[tab]?.label)}
              </button>
            ))}
          </div>
        </div>

        <LinkedFilterPills filters={linkedFilters} onClear={clearLinkedFilters} />

        {selectedRows.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#d7ece8] bg-[#f7fbfb] px-3 py-3">
            <div className="text-[12px] font-extrabold text-[#084036]">
              {formatLocalizedNumber(selectedRows.length, lang)} {text(COPY.selected)}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={bulkApprove} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-[11px] font-bold text-emerald-700">
                <CheckCircle2 size={13} /> {text(COPY.bulkApprove)}
              </button>
              <button type="button" onClick={() => bulkVisibility(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-white px-3 py-2 text-[11px] font-bold text-amber-700">
                <Flag size={13} /> {text(COPY.bulkHide)}
              </button>
              <button type="button" onClick={() => bulkVisibility(false)} className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3 py-2 text-[11px] font-bold text-blue-700">
                <EyeOff size={13} /> {text(COPY.bulkUnhide)}
              </button>
              <button type="button" onClick={bulkArchive} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-[11px] font-bold text-red-700">
                <Archive size={13} /> {text(COPY.bulkArchive)}
              </button>
            </div>
          </div>
        )}

        <DataTable
          columns={columns}
          rows={reviews}
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
        open={!!selectedReview}
        title={COPY.details}
        description={selectedReview ? `#${selectedReview.id}` : ''}
        onClose={() => setSelectedReview(null)}
      >
        {selectedReview && (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {selectedReview.reviewerUserId && (
                <QuickLinkButton label={localizedText('حساب المراجع', 'Reviewer account')} Icon={Users} onClick={() => navigateWithParams('/admin/users', { userId: selectedReview.reviewerUserId })} />
              )}
              {selectedReview.doctorId && (
                <QuickLinkButton label={localizedText('ملف الطبيب', 'Doctor profile')} Icon={Stethoscope} onClick={() => navigateWithParams('/admin/doctors', { doctorId: selectedReview.doctorId })} />
              )}
              {selectedReview.pharmacyId && (
                <QuickLinkButton label={localizedText('ملف الصيدلية', 'Pharmacy profile')} Icon={Building2} onClick={() => navigateWithParams('/admin/pharmacies', { pharmacyId: selectedReview.pharmacyId })} />
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailCard label={COPY.reviewer} value={text(selectedReview.author)} />
              <DetailCard label={COPY.target} value={text(selectedReview.target)} />
              <DetailCard label={COPY.rating} value={`${formatLocalizedNumber(selectedReview.rating, lang)} / 5`} />
              <DetailCard label={COPY.status} value={text(REVIEW_STATUS_META[selectedReview.status]?.label)} />
              <DetailCard label={COPY.date} value={formatDate(selectedReview.date, lang)} />
              <DetailCard label={localizedText('نوع الهدف', 'Target type')} value={selectedReview.targetType || '—'} />
              <div className="sm:col-span-2 rounded-2xl border border-[#eef5f5] bg-[#f8fbfb] p-4">
                <div className="mb-1 text-[11px] font-extrabold text-[#486466]">{text(COPY.comment)}</div>
                <div className="text-[13px] leading-7 text-[#084036]">{text(selectedReview.comment)}</div>
              </div>
            </div>
          </div>
        )}
      </AdminModal>

      <AdminActionDialog
        open={!!action}
        title={COPY.archiveTitle}
        description={COPY.archiveDesc}
        confirmLabel={COPY.archive}
        requiresReason
        loading={ui.actionLoading}
        onClose={() => setAction(null)}
        onConfirm={archiveReview}
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

function DetailCard({ label, value }) {
  const { text } = useLocalizedContent();

  return (
    <div className="rounded-2xl border border-[#eef5f5] bg-[#f8fbfb] p-4">
      <div className="mb-1 text-[11px] font-extrabold text-[#486466]">{text(label)}</div>
      <div className="break-words text-[13px] font-bold text-[#084036]">{value}</div>
    </div>
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
        <div className="text-[22px] font-black text-[#084036]">{formatLocalizedNumber(value, lang)}</div>
        <div className="text-[11px] text-[#486466]">{text(label)}</div>
      </div>
    </div>
  );
}
