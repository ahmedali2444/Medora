import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Archive, Bell, CheckCircle2, Download, Edit2, ExternalLink, Eye, EyeOff, FileText, Newspaper, RefreshCw, ScanSearch as Search, Send, Stethoscope, XCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/layout/AdminLayout';
import SectionCard from '../../components/admin/shared/SectionCard';
import StatusPill from '../../components/admin/shared/StatusPill';
import DataTable from '../../components/admin/shared/DataTable';
import AdminModal from '../../components/admin/shared/AdminModal';
import AdminActionDialog from '../../components/admin/shared/AdminActionDialog';
import LinkedFilterPills from '../../components/admin/shared/LinkedFilterPills';
import { LINKED_FILTER_KEYS, readLinkedFilters } from '../../components/admin/shared/linkedFilterUtils';
import { PreviewableImage } from '../../components/admin/shared/ImagePreview';
import { ARTICLE_STATUS_META, formatDate } from '../../components/admin/data/adminData';
import { useLocalizedContent } from '../../hooks/useLocalizedContent';
import { formatLocalizedNumber, localizedText } from '../../utils/localization';
import { triggerBrowserDownload } from '../../utils/download';
import { medoraApi } from '../../api/medoraApi';

const PAGE_SIZE = 20;
const STATUS_TABS = ['all', 'published', 'draft', 'review', 'rejected'];
const ARTICLE_META = {
  ...ARTICLE_STATUS_META,
  rejected: { label: localizedText('مرفوض', 'Rejected'), color: '#c2362f', bg: '#fdecec' },
};

const EMPTY_EDITOR = {
  open: false,
  id: null,
  title: '',
  content: '',
  coverImageUrl: '',
};

const COPY = {
  title: localizedText('المقالات', 'Articles'),
  subtitle: localizedText('تحرير ومراجعة ونشر المقالات بدون إنشاء مقال نيابة عن الطبيب', 'Edit, moderate, and publish articles without creating on behalf of doctors'),
  total: localizedText('إجمالي المقالات', 'Total articles'),
  published: localizedText('منشورة', 'Published'),
  review: localizedText('قيد المراجعة', 'Under review'),
  rejected: localizedText('مرفوضة', 'Rejected'),
  allArticles: localizedText('كل المقالات', 'All articles'),
  articlesSuffix: localizedText('مقال', 'articles'),
  refresh: localizedText('تحديث', 'Refresh'),
  export: localizedText('تصدير', 'Export'),
  searchPlaceholder: localizedText('ابحث بالعنوان، الكاتب، أو التخصص...', 'Search by title, author, or specialty...'),
  all: localizedText('الكل', 'All'),
  titleCol: localizedText('العنوان', 'Title'),
  authorCol: localizedText('الكاتب', 'Author'),
  categoryCol: localizedText('التخصص', 'Specialty'),
  viewsCol: localizedText('المشاهدات', 'Views'),
  dateCol: localizedText('التاريخ', 'Date'),
  statusCol: localizedText('الحالة', 'Status'),
  actionsCol: localizedText('إجراءات', 'Actions'),
  preview: localizedText('معاينة', 'Preview'),
  edit: localizedText('تعديل', 'Edit'),
  save: localizedText('حفظ', 'Save'),
  cancel: localizedText('إلغاء', 'Cancel'),
  approve: localizedText('اعتماد', 'Approve'),
  reject: localizedText('رفض', 'Reject'),
  publish: localizedText('نشر', 'Publish'),
  unpublish: localizedText('إلغاء النشر', 'Unpublish'),
  archive: localizedText('أرشفة', 'Archive'),
  bulkApprove: localizedText('اعتماد المحدد', 'Approve selected'),
  bulkPublish: localizedText('نشر المحدد', 'Publish selected'),
  bulkUnpublish: localizedText('إلغاء نشر المحدد', 'Unpublish selected'),
  bulkArchive: localizedText('أرشفة المحدد', 'Archive selected'),
  selected: localizedText('محدد', 'selected'),
  content: localizedText('المحتوى', 'Content'),
  coverImageUrl: localizedText('رابط صورة الغلاف', 'Cover image URL'),
  empty: localizedText('لا توجد مقالات بهذا الفلتر.', 'No articles match this filter.'),
  rejectTitle: localizedText('رفض المقال؟', 'Reject article?'),
  rejectDesc: localizedText('اكتب سبب الرفض ليظهر في سجل المراجعة والإشعارات.', 'Write the rejection reason for moderation history and notifications.'),
  archiveTitle: localizedText('أرشفة المقال؟', 'Archive article?'),
  archiveDesc: localizedText('سيتم إخفاء المقال من كل القوائم العامة مع حفظ السجل الإداري.', 'The article will be hidden from public lists while preserving the admin log.'),
};

const mapArticleStatus = (article) => {
  const moderation = `${article.moderationStatus || ''}`.toLowerCase();
  const publish = `${article.status || ''}`.toLowerCase();
  if (moderation === 'pending') return 'review';
  if (moderation === 'rejected') return 'rejected';
  if (publish === 'published' && moderation === 'approved') return 'published';
  return 'draft';
};

const mapArticle = (article) => ({
  id: article.id,
  authorDoctorId: article.authorDoctorId || '',
  title: localizedText(article.title || '', article.title || ''),
  author: localizedText(article.authorName || '-', article.authorName || '-'),
  category: localizedText(article.specialtyNameAr || '-', article.specialtyNameEn || article.specialtyNameAr || '-'),
  status: mapArticleStatus(article),
  views: article.viewCount || 0,
  date: article.publishedAt || article.createdAt,
  rawStatus: article.status,
  rawModerationStatus: article.moderationStatus,
  content: article.content,
  coverImageUrl: article.coverImageUrl,
});

export default function AdminArticles() {
  const { lang, text } = useLocalizedContent();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [articles, setArticles] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [editor, setEditor] = useState(EMPTY_EDITOR);
  const [action, setAction] = useState(null);
  const [ui, setUi] = useState({ loading: true, actionLoading: false, error: '', notice: '' });
  const linkedFilters = readLinkedFilters(searchParams);
  const userId = searchParams.get('userId') || '';
  const doctorId = searchParams.get('doctorId') || '';
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

  const loadArticles = useCallback(async () => {
    setUi((current) => ({ ...current, loading: true, error: '' }));
    try {
      const data = await medoraApi.adminArticles({
        page,
        pageSize: PAGE_SIZE,
        search: query,
        status: status === 'all' ? '' : status,
        userId,
        doctorId,
        dateFrom,
        dateTo,
        sortBy,
        sortDir,
      });
      const mapped = Array.isArray(data?.items) ? data.items.map(mapArticle) : [];
      setArticles(mapped);
      setTotal(Number(data?.total || mapped.length));
      setSelectedIds([]);
      setUi((current) => ({ ...current, loading: false, error: '' }));
    } catch (error) {
      setArticles([]);
      setTotal(0);
      setError(error.message || 'Unable to load articles');
    }
  }, [dateFrom, dateTo, doctorId, page, query, sortBy, sortDir, status, userId]);

  const clearLinkedFilters = () => {
    const next = new URLSearchParams(searchParams);
    LINKED_FILTER_KEYS.forEach((key) => next.delete(key));
    setPage(1);
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    queueMicrotask(() => loadArticles());
    return () => {
      if (setNotice.timer) window.clearTimeout(setNotice.timer);
    };
  }, [loadArticles, setNotice]);

  const loadArticleDetails = async (article) => {
    const details = await medoraApi.adminArticle(article.id);
    return {
      ...article,
      ...mapArticle(details),
      content: details.content || '',
      coverImageUrl: details.coverImageUrl || '',
    };
  };

  const previewArticle = async (article) => {
    setSelectedArticle(article);
    try {
      setSelectedArticle(await loadArticleDetails(article));
    } catch (error) {
      setError(error.message || 'Unable to load article details');
    }
  };

  const navigateWithParams = (path, nextParams) => {
    const search = new URLSearchParams();
    Object.entries(nextParams || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') search.set(key, value);
    });
    navigate(`${path}?${search.toString()}`);
    setSelectedArticle(null);
  };

  const openEdit = async (article) => {
    try {
      const details = await loadArticleDetails(article);
      setEditor({
        open: true,
        id: details.id,
        title: text(details.title),
        content: details.content || '',
        coverImageUrl: details.coverImageUrl || '',
      });
    } catch (error) {
      setError(error.message || 'Unable to load article for editing');
    }
  };

  const saveArticle = async () => {
    if (!editor.id) return;
    setUi((current) => ({ ...current, actionLoading: true, error: '' }));
    try {
      await medoraApi.adminUpdateArticle(editor.id, {
        title: editor.title,
        content: editor.content,
        coverImageUrl: editor.coverImageUrl,
      });
      setEditor(EMPTY_EDITOR);
      setNotice(text(localizedText('تم تحديث المقال', 'Article updated')));
      await loadArticles();
    } catch (error) {
      setError(error.message || 'Unable to save article');
    } finally {
      setUi((current) => ({ ...current, actionLoading: false }));
    }
  };

  const approveArticle = async (articleId) => {
    try {
      await medoraApi.adminApproveArticle(articleId);
      setNotice(text(localizedText('تم اعتماد المقال', 'Article approved')));
      await loadArticles();
    } catch (error) {
      setError(error.message || 'Unable to approve article');
    }
  };

  const togglePublish = async (article) => {
    try {
      const isPublished = article.status !== 'published';
      await medoraApi.adminPublishArticle(article.id, { isPublished });
      setNotice(text(isPublished ? localizedText('تم نشر المقال', 'Article published') : localizedText('تم إلغاء نشر المقال', 'Article unpublished')));
      await loadArticles();
    } catch (error) {
      setError(error.message || 'Unable to publish article');
    }
  };

  const runAction = async (reason) => {
    if (!action) return;
    setUi((current) => ({ ...current, actionLoading: true, error: '' }));
    try {
      if (action.type === 'reject') {
        await medoraApi.adminRejectArticle(action.article.id, reason ? { reason } : {});
        setNotice(text(localizedText('تم رفض المقال', 'Article rejected')));
      }
      if (action.type === 'archive') {
        await medoraApi.adminArchiveArticle(action.article.id, reason ? { reason } : {});
        setNotice(text(localizedText('تمت أرشفة المقال', 'Article archived')));
      }
      setAction(null);
      await loadArticles();
    } catch (error) {
      setError(error.message || 'Unable to update article');
    } finally {
      setUi((current) => ({ ...current, actionLoading: false }));
    }
  };

  const selectedRows = articles.filter((article) => selectedIds.map(String).includes(String(article.id)));

  const bulkApprove = async () => {
    const targets = selectedRows.filter((article) => article.status !== 'published');
    if (!targets.length) return;
    try {
      await Promise.all(targets.map((article) => medoraApi.adminApproveArticle(article.id)));
      setSelectedIds([]);
      setNotice(text(localizedText('تم اعتماد المقالات المحددة', 'Selected articles approved')));
      await loadArticles();
    } catch (error) {
      setError(error.message || 'Unable to approve selected articles');
    }
  };

  const bulkPublish = async (isPublished) => {
    const targets = selectedRows.filter((article) => isPublished ? article.status !== 'published' : article.status === 'published');
    if (!targets.length) return;
    try {
      await Promise.all(targets.map((article) => medoraApi.adminPublishArticle(article.id, { isPublished })));
      setSelectedIds([]);
      setNotice(text(isPublished ? localizedText('تم نشر المقالات المحددة', 'Selected articles published') : localizedText('تم إلغاء نشر المقالات المحددة', 'Selected articles unpublished')));
      await loadArticles();
    } catch (error) {
      setError(error.message || 'Unable to publish selected articles');
    }
  };

  const bulkArchive = async () => {
    if (!selectedRows.length) return;
    setUi((current) => ({ ...current, actionLoading: true, error: '' }));
    try {
      await Promise.all(selectedRows.map((article) => medoraApi.adminArchiveArticle(article.id, {})));
      setSelectedIds([]);
      setNotice(text(localizedText('تمت أرشفة المقالات المحددة', 'Selected articles archived')));
      await loadArticles();
    } catch (error) {
      setError(error.message || 'Unable to archive selected articles');
    } finally {
      setUi((current) => ({ ...current, actionLoading: false }));
    }
  };

  const exportArticles = async () => {
    try {
      triggerBrowserDownload(await medoraApi.adminExportArticles());
      setNotice(text(localizedText('تم تنزيل ملف المقالات', 'Articles export downloaded')));
    } catch (error) {
      setError(error.message || 'Unable to export articles');
    }
  };

  const stats = useMemo(() => ({
    published: articles.filter((article) => article.status === 'published').length,
    review: articles.filter((article) => article.status === 'review').length,
    rejected: articles.filter((article) => article.status === 'rejected').length,
  }), [articles]);

  const columns = [
    {
      key: 'title',
      label: COPY.titleCol,
      width: '1.7fr',
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.coverImageUrl ? (
            <PreviewableImage
              src={row.coverImageUrl}
              alt={text(row.title)}
              className="h-10 w-10 shrink-0 rounded-xl border border-[#e4eeee] object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e6f7f7] text-[#14b8a6]">
              <Newspaper size={15} />
            </div>
          )}
          <div className="min-w-0">
            <div className="text-[12px] font-extrabold text-[#084036]">{text(row.title)}</div>
            <div className="text-[10px] text-slate-500">{text(row.author)}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      label: COPY.categoryCol,
      width: '1fr',
      align: 'center',
      render: (row) => <span className="inline-flex rounded-full bg-[#eef4ff] px-2 py-0.5 text-[10px] font-bold text-[#2465b6]">{text(row.category)}</span>,
    },
    {
      key: 'views',
      label: COPY.viewsCol,
      width: '0.7fr',
      align: 'center',
      render: (row) => <span className="text-[12px] font-extrabold text-[#119a8a]">{formatLocalizedNumber(row.views, lang)}</span>,
    },
    {
      key: 'date',
      label: COPY.dateCol,
      width: '0.8fr',
      align: 'center',
      render: (row) => <span className="text-[11px] text-slate-600">{formatDate(row.date, lang)}</span>,
    },
    {
      key: 'status',
      label: COPY.statusCol,
      width: '0.9fr',
      align: 'center',
      render: (row) => <StatusPill meta={ARTICLE_META[row.status]} />,
    },
    {
      key: 'actions',
      label: COPY.actionsCol,
      width: '1.3fr',
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <IconButton title={COPY.preview} onClick={() => previewArticle(row)} tone="#2465b6" Icon={Eye} />
          <IconButton title={COPY.edit} onClick={() => openEdit(row)} tone="#295d60" Icon={Edit2} />
          {row.status !== 'published' && <IconButton title={COPY.approve} onClick={() => approveArticle(row.id)} tone="#0e7c6e" Icon={CheckCircle2} />}
          <IconButton title={row.status === 'published' ? COPY.unpublish : COPY.publish} onClick={() => togglePublish(row)} tone="#6f47b5" Icon={row.status === 'published' ? EyeOff : Send} />
          {row.status !== 'rejected' && <IconButton title={COPY.reject} onClick={() => setAction({ type: 'reject', article: row })} tone="#a35a00" Icon={XCircle} />}
          <IconButton title={COPY.archive} onClick={() => setAction({ type: 'archive', article: row })} tone="#c2362f" Icon={Archive} />
        </div>
      ),
    },
  ];

  const actionCopy = action?.type === 'reject'
    ? { title: COPY.rejectTitle, desc: COPY.rejectDesc, label: COPY.reject, tone: 'warning' }
    : { title: COPY.archiveTitle, desc: COPY.archiveDesc, label: COPY.archive, tone: 'danger' };

  return (
    <AdminLayout title={COPY.title} subtitle={COPY.subtitle}>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatBox label={COPY.total} value={total} tone="#14b8a6" Icon={Newspaper} />
        <StatBox label={COPY.published} value={stats.published} tone="#0e7c6e" />
        <StatBox label={COPY.review} value={stats.review} tone="#a35a00" />
        <StatBox label={COPY.rejected} value={stats.rejected} tone="#c2362f" />
      </div>

      <SectionCard
        title={COPY.allArticles}
        description={`${formatLocalizedNumber(total, lang)} ${text(COPY.articlesSuffix)}`}
        icon={Newspaper}
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadArticles}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#d7ece8] bg-white px-4 py-2 text-[12px] font-bold text-[#119a8a] transition hover:border-[#14b8a6]"
            >
              <RefreshCw size={13} />
              {text(COPY.refresh)}
            </button>
            <button
              type="button"
              onClick={exportArticles}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#14b8a6] px-4 py-2 text-[12px] font-bold text-white shadow-[0_8px_20px_rgba(20,184,166,0.3)] transition hover:bg-[#119a8a]"
            >
              <Download size={13} />
              {text(COPY.export)}
            </button>
          </div>
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
                {tab === 'all' ? text(COPY.all) : text(ARTICLE_META[tab]?.label)}
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
              <button type="button" onClick={() => bulkPublish(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-white px-3 py-2 text-[11px] font-bold text-violet-700">
                <Send size={13} /> {text(COPY.bulkPublish)}
              </button>
              <button type="button" onClick={() => bulkPublish(false)} className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3 py-2 text-[11px] font-bold text-blue-700">
                <EyeOff size={13} /> {text(COPY.bulkUnpublish)}
              </button>
              <button type="button" onClick={bulkArchive} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-[11px] font-bold text-red-700">
                <Archive size={13} /> {text(COPY.bulkArchive)}
              </button>
            </div>
          </div>
        )}

        <DataTable
          columns={columns}
          rows={articles}
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
        open={!!selectedArticle}
        title={selectedArticle?.title || COPY.preview}
        description={selectedArticle?.author}
        onClose={() => setSelectedArticle(null)}
      >
        {selectedArticle && (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-3">
              {selectedArticle.authorDoctorId && (
                <QuickLinkButton label={localizedText('ملف الكاتب الطبيب', 'Author doctor profile')} Icon={Stethoscope} onClick={() => navigateWithParams('/admin/doctors', { doctorId: selectedArticle.authorDoctorId })} />
              )}
              {selectedArticle.authorDoctorId && (
                <QuickLinkButton label={localizedText('مقالات الكاتب', 'Author articles')} Icon={FileText} onClick={() => navigateWithParams('/admin/articles', { doctorId: selectedArticle.authorDoctorId })} />
              )}
              <QuickLinkButton label={localizedText('بلاغات المقال', 'Article reports')} Icon={Bell} onClick={() => navigateWithParams('/admin/reports', { entityType: 'article', entityId: selectedArticle.id })} />
            </div>
            {selectedArticle.coverImageUrl && (
              <PreviewableImage
                src={selectedArticle.coverImageUrl}
                alt={text(selectedArticle.title)}
                className="max-h-72 w-full rounded-2xl border border-[#e4eeee] bg-[#f8fbfb] object-contain"
              />
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              <DetailCard label={COPY.categoryCol} value={text(selectedArticle.category)} />
              <DetailCard label={COPY.viewsCol} value={formatLocalizedNumber(selectedArticle.views, lang)} />
              <DetailCard label={COPY.statusCol} value={text(ARTICLE_META[selectedArticle.status]?.label)} />
            </div>
            <div className="rounded-2xl border border-[#eef5f5] bg-[#f8fbfb] p-4">
              <div className="mb-2 text-[11px] font-extrabold text-[#486466]">{text(COPY.content)}</div>
              <div className="whitespace-pre-wrap text-[13px] leading-7 text-[#084036]">{selectedArticle.content || '-'}</div>
            </div>
          </div>
        )}
      </AdminModal>

      <AdminModal
        open={editor.open}
        title={COPY.edit}
        onClose={() => setEditor(EMPTY_EDITOR)}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditor(EMPTY_EDITOR)} className="rounded-full border border-[#e4eeee] bg-white px-4 py-2 text-[12px] font-bold text-[#486466]">
              {text(COPY.cancel)}
            </button>
            <button type="button" disabled={ui.actionLoading} onClick={saveArticle} className="rounded-full bg-[#14b8a6] px-4 py-2 text-[12px] font-bold text-white disabled:opacity-60">
              {text(COPY.save)}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <Field label={COPY.titleCol} value={editor.title} onChange={(value) => setEditor((current) => ({ ...current, title: value }))} />
          <Field label={COPY.coverImageUrl} value={editor.coverImageUrl} onChange={(value) => setEditor((current) => ({ ...current, coverImageUrl: value }))} />
          {editor.coverImageUrl && (
            <PreviewableImage
              src={editor.coverImageUrl}
              alt={editor.title || text(COPY.preview)}
              className="max-h-56 w-full rounded-2xl border border-[#e4eeee] bg-[#f8fbfb] object-contain"
            />
          )}
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-extrabold text-[#486466]">{text(COPY.content)}</span>
            <textarea
              value={editor.content}
              onChange={(event) => setEditor((current) => ({ ...current, content: event.target.value }))}
              className="min-h-[220px] rounded-xl border border-[#e4eeee] bg-white p-3 text-[12px] leading-6 text-[#084036] outline-none transition focus:border-[#14b8a6]"
            />
          </label>
        </div>
      </AdminModal>

      <AdminActionDialog
        open={!!action}
        title={actionCopy.title}
        description={actionCopy.desc}
        confirmLabel={actionCopy.label}
        tone={actionCopy.tone}
        requiresReason
        loading={ui.actionLoading}
        onClose={() => setAction(null)}
        onConfirm={runAction}
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

function DetailCard({ label, value }) {
  const { text } = useLocalizedContent();

  return (
    <div className="rounded-2xl border border-[#eef5f5] bg-[#f8fbfb] p-4">
      <div className="mb-1 text-[11px] font-extrabold text-[#486466]">{text(label)}</div>
      <div className="break-words text-[13px] font-bold text-[#084036]">{value}</div>
    </div>
  );
}
