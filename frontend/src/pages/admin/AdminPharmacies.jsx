import React, { useEffect, useMemo, useState } from 'react';
import { Archive, Bell, Building2, CheckCircle2, Download, Edit2, ExternalLink, Eye, FileText, MapPin, Package, Pill, RefreshCw, ScanSearch as Search, ShieldCheck, Star, Users, XCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/layout/AdminLayout';
import SectionCard from '../../components/admin/shared/SectionCard';
import StatusPill from '../../components/admin/shared/StatusPill';
import AdminModal from '../../components/admin/shared/AdminModal';
import AdminActionDialog from '../../components/admin/shared/AdminActionDialog';
import LinkedFilterPills from '../../components/admin/shared/LinkedFilterPills';
import { LINKED_FILTER_KEYS, readLinkedFilters } from '../../components/admin/shared/linkedFilterUtils';
import { PreviewableImage } from '../../components/admin/shared/ImagePreview';
import { VERIFY_STATUS_META, formatDate } from '../../components/admin/data/adminData';
import { useLocalizedContent } from '../../hooks/useLocalizedContent';
import { formatLocalizedNumber, localizedText } from '../../utils/localization';
import { medoraApi } from '../../api/medoraApi';
import { triggerBrowserDownload } from '../../utils/download';

const STATUS_TABS = ['all', 'verified', 'pending', 'suspended', 'rejected'];
const PAGE_SIZE = 20;

const COPY = {
  title: localizedText('الصيدليات', 'Pharmacies'),
  subtitle: localizedText('إدارة الصيدليات الشريكة وتراخيصها', 'Manage partner pharmacies and licenses'),
  total: localizedText('إجمالي الصيدليات', 'Total pharmacies'),
  verified: localizedText('معتمدة', 'Verified'),
  pending: localizedText('قيد المراجعة', 'Under review'),
  blocked: localizedText('مرفوضة / معلّقة', 'Rejected / suspended'),
  listTitle: localizedText('قائمة الصيدليات', 'Pharmacies list'),
  filtered: localizedText('صيدلية', 'pharmacies'),
  searchPlaceholder: localizedText(
    'ابحث باسم الصيدلية، المدينة، أو الترخيص...',
    'Search by pharmacy name, city, or license...',
  ),
  all: localizedText('الكل', 'All'),
  details: localizedText('عرض التفاصيل', 'View details'),
  approve: localizedText('اعتماد', 'Approve'),
  reject: localizedText('رفض', 'Reject'),
  edit: localizedText('تعديل', 'Edit'),
  feature: localizedText('تمييز', 'Feature'),
  unfeature: localizedText('إلغاء التمييز', 'Unfeature'),
  activate: localizedText('تفعيل', 'Activate'),
  suspend: localizedText('تعليق', 'Suspend'),
  archive: localizedText('أرشفة', 'Archive'),
  bulkActivate: localizedText('تفعيل المحدد', 'Activate selected'),
  bulkSuspend: localizedText('تعليق المحدد', 'Suspend selected'),
  bulkArchive: localizedText('أرشفة المحدد', 'Archive selected'),
  selected: localizedText('محدد', 'selected'),
  joined: localizedText('انضم', 'Joined'),
  empty: localizedText('لا توجد صيدليات بهذا الفلتر.', 'No pharmacies match this filter.'),
  exportCsv: localizedText('تصدير CSV', 'Export CSV'),
  refresh: localizedText('تحديث', 'Refresh'),
  phone: localizedText('الهاتف', 'Phone'),
  address: localizedText('العنوان', 'Address'),
  openHours: localizedText('ساعات العمل', 'Working hours'),
  views: localizedText('المشاهدات', 'Views'),
  license: localizedText('رقم الترخيص', 'License number'),
  save: localizedText('حفظ', 'Save'),
  cancel: localizedText('إلغاء', 'Cancel'),
  rejectTitle: localizedText('رفض طلب تحقق الصيدلية؟', 'Reject pharmacy verification?'),
  archiveTitle: localizedText('أرشفة الصيدلية؟', 'Archive this pharmacy?'),
  archiveDesc: localizedText('سيتم تعطيل ملف الصيدلية وإلغاء تمييزها مع الاحتفاظ بالسجلات التاريخية.', 'The pharmacy profile will be disabled and unfeatured while history remains.'),
};

const mapPharmacyStatus = (pharmacy) => {
  const verification = `${pharmacy.verificationStatus || ''}`.toLowerCase();
  if (verification === 'pending') return 'pending';
  if (verification === 'rejected') return 'rejected';
  if (!pharmacy.isActive) return 'suspended';
  return 'verified';
};

export default function AdminPharmacies() {
  const { lang, text } = useLocalizedContent();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [pharmacies, setPharmacies] = useState([]);
  const [pendingPharmacies, setPendingPharmacies] = useState([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [editor, setEditor] = useState({ open: false, form: null });
  const [action, setAction] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [ui, setUi] = useState({ loading: true, error: '', notice: '' });
  const linkedFilters = readLinkedFilters(searchParams);
  const userId = searchParams.get('userId') || '';
  const pharmacyId = searchParams.get('pharmacyId') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';
  const sortBy = searchParams.get('sortBy') || '';
  const sortDir = searchParams.get('sortDir') || '';

  const setError = (message) => setUi((current) => ({ ...current, loading: false, error: message }));
  const setNotice = (message) => {
    setUi((current) => ({ ...current, notice: message }));
    window.clearTimeout(setNotice.timer);
    setNotice.timer = window.setTimeout(() => {
      setUi((current) => ({ ...current, notice: '' }));
    }, 2400);
  };

  const loadPharmacies = async (nextPage = page) => {
    setUi((current) => ({ ...current, loading: true, error: '' }));
    try {
      const [pharmaciesResult, pendingResult] = await Promise.allSettled([
        medoraApi.adminPharmacies({
          page: nextPage,
          pageSize: PAGE_SIZE,
          search: query,
          status: status === 'all' ? '' : status,
          userId,
          pharmacyId,
          dateFrom,
          dateTo,
          sortBy,
          sortDir,
        }),
        medoraApi.adminPendingVerifications(),
      ]);
      if (pharmaciesResult.status === 'rejected') throw pharmaciesResult.reason;

      const pharmaciesData = pharmaciesResult.value;
      const pendingData = pendingResult.status === 'fulfilled' ? pendingResult.value : {};

      const mappedPharmacies = Array.isArray(pharmaciesData?.items)
        ? pharmaciesData.items.map((pharmacy) => ({
            id: pharmacy.id,
            name: localizedText(pharmacy.pharmacyName || '', pharmacy.pharmacyName || ''),
            city: localizedText(pharmacy.cityAr || '—', pharmacy.cityEn || pharmacy.cityAr || '—'),
            governorate: localizedText(pharmacy.governorateAr || '—', pharmacy.governorateEn || pharmacy.governorateAr || '—'),
            status: mapPharmacyStatus(pharmacy),
            license: pharmacy.licenseNumber || '—',
            joined: pharmacy.createdAt,
            phone: pharmacy.phone || '—',
            profileImageUrl: pharmacy.profileImageUrl || '',
            views: pharmacy.viewCount || 0,
            openStatus: pharmacy.status || '—',
            isFeatured: !!pharmacy.isFeatured,
            isActive: !!pharmacy.isActive,
          }))
        : [];

      const mappedPending = Array.isArray(pendingData?.pharmacies)
        ? pendingData.pharmacies.map((pharmacy) => ({
            id: pharmacy.pharmacyId,
            name: localizedText(pharmacy.pharmacyName || '', pharmacy.pharmacyName || ''),
            city: localizedText(pharmacy.cityAr || '—', pharmacy.cityEn || pharmacy.cityAr || '—'),
            license: pharmacy.licenseNumber || '—',
          }))
        : [];

      setPharmacies(mappedPharmacies);
      setTotal(Number(pharmaciesData?.total || mappedPharmacies.length));
      setPendingPharmacies(mappedPending);
      setSelectedIds([]);
      setUi((current) => ({ ...current, loading: false, error: '' }));
    } catch (error) {
      setPharmacies([]);
      setPendingPharmacies([]);
      setError(error.message || 'Unable to load pharmacies');
    }
  };

  useEffect(() => {
    queueMicrotask(() => loadPharmacies(page));
    return () => {
      if (setNotice.timer) window.clearTimeout(setNotice.timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, page, pharmacyId, query, sortBy, sortDir, status, userId]);

  const clearLinkedFilters = () => {
    const next = new URLSearchParams(searchParams);
    LINKED_FILTER_KEYS.forEach((key) => next.delete(key));
    setPage(1);
    setSearchParams(next, { replace: true });
  };

  const loadPharmacyDetails = async (pharmacyId) => {
    try {
      const data = await medoraApi.adminPharmacyActivity(pharmacyId);
      const pharmacy = data?.pharmacy || data;
      setSelectedPharmacy({
        id: pharmacy.id,
        userId: pharmacy.userId,
        name: localizedText(pharmacy.pharmacyName || '', pharmacy.pharmacyName || ''),
        city: localizedText(pharmacy.cityAr || '—', pharmacy.cityEn || pharmacy.cityAr || '—'),
        governorate: localizedText(pharmacy.governorateAr || '—', pharmacy.governorateEn || pharmacy.governorateAr || '—'),
        address: pharmacy.addressLine || '—',
        phone: pharmacy.phone || '—',
        license: pharmacy.licenseNumber || '—',
        joined: pharmacy.createdAt,
        views: pharmacy.viewCount || 0,
        bio: pharmacy.bio || '—',
        openFrom: pharmacy.openFrom,
        openTo: pharmacy.openTo,
        is24Hours: pharmacy.is24Hours,
        openStatus: pharmacy.status || '—',
        status: mapPharmacyStatus(pharmacy),
        profileImageUrl: pharmacy.profileImageUrl,
        licenseImageUrl: pharmacy.licenseImageUrl,
        pharmacistIdCardUrl: pharmacy.pharmacistIdCardUrl,
        user: data?.user || null,
        counts: data?.counts || {},
        medicines: Array.isArray(data?.medicines) ? data.medicines : [],
        latestOrders: Array.isArray(data?.latestOrders) ? data.latestOrders : [],
        latestPrescriptions: Array.isArray(data?.latestPrescriptions) ? data.latestPrescriptions : [],
        latestReviews: Array.isArray(data?.latestReviews) ? data.latestReviews : [],
        latestReports: Array.isArray(data?.latestReports) ? data.latestReports : [],
      });
    } catch (error) {
      setError(error.message || 'Unable to load pharmacy details');
    }
  };

  const navigateWithParams = (path, nextParams) => {
    const search = new URLSearchParams();
    Object.entries(nextParams || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') search.set(key, value);
    });
    navigate(`${path}?${search.toString()}`);
    setSelectedPharmacy(null);
  };

  const approvePharmacy = async (pharmacyId) => {
    try {
      await medoraApi.adminApprovePharmacy(pharmacyId);
      setNotice(text(localizedText('تم اعتماد الصيدلية', 'Pharmacy approved')));
      loadPharmacies();
    } catch (error) {
      setError(error.message || 'Unable to approve pharmacy');
    }
  };

  const rejectPharmacy = async (pharmacyId, reason = '') => {
    try {
      await medoraApi.adminRejectPharmacy(pharmacyId, reason ? { reason } : {});
      setNotice(text(localizedText('تم رفض الصيدلية', 'Pharmacy rejected')));
      setAction(null);
      loadPharmacies();
    } catch (error) {
      setError(error.message || 'Unable to reject pharmacy');
    }
  };

  const updatePharmacyStatus = async (pharmacy, isActive) => {
    try {
      await medoraApi.adminUpdatePharmacyStatus(pharmacy.id, { isActive });
      setNotice(text(isActive ? localizedText('تم تفعيل الصيدلية', 'Pharmacy activated') : localizedText('تم تعليق الصيدلية', 'Pharmacy suspended')));
      loadPharmacies();
    } catch (error) {
      setError(error.message || 'Unable to update pharmacy status');
    }
  };

  const togglePharmacyFeature = async (pharmacy) => {
    try {
      await medoraApi.adminFeaturePharmacy(pharmacy.id, { isFeatured: !pharmacy.isFeatured });
      setNotice(text(pharmacy.isFeatured ? localizedText('تم إلغاء تمييز الصيدلية', 'Pharmacy unfeatured') : localizedText('تم تمييز الصيدلية', 'Pharmacy featured')));
      loadPharmacies();
    } catch (error) {
      setError(error.message || 'Unable to update featured status');
    }
  };

  const archivePharmacy = async (reason) => {
    if (!action?.pharmacy) return;
    try {
      await medoraApi.adminArchivePharmacy(action.pharmacy.id, reason ? { reason } : {});
      setNotice(text(localizedText('تمت أرشفة الصيدلية', 'Pharmacy archived')));
      setAction(null);
      loadPharmacies();
    } catch (error) {
      setError(error.message || 'Unable to archive pharmacy');
    }
  };

  const selectedPharmacies = pharmacies.filter((pharmacy) => selectedIds.map(String).includes(String(pharmacy.id)));
  const toggleSelectedPharmacy = (pharmacyId, checked) => {
    setSelectedIds((current) => checked ? Array.from(new Set([...current, pharmacyId])) : current.filter((id) => String(id) !== String(pharmacyId)));
  };

  const bulkUpdatePharmacyStatus = async (isActive) => {
    const targets = selectedPharmacies.filter((pharmacy) => pharmacy.isActive !== isActive);
    if (!targets.length) return;
    try {
      await Promise.all(targets.map((pharmacy) => medoraApi.adminUpdatePharmacyStatus(pharmacy.id, { isActive })));
      setSelectedIds([]);
      setNotice(text(isActive ? localizedText('تم تفعيل الصيدليات المحددة', 'Selected pharmacies activated') : localizedText('تم تعليق الصيدليات المحددة', 'Selected pharmacies suspended')));
      loadPharmacies();
    } catch (error) {
      setError(error.message || 'Unable to update selected pharmacies');
    }
  };

  const bulkArchivePharmacies = async () => {
    if (!selectedPharmacies.length) return;
    try {
      await Promise.all(selectedPharmacies.map((pharmacy) => medoraApi.adminArchivePharmacy(pharmacy.id, {})));
      setSelectedIds([]);
      setNotice(text(localizedText('تمت أرشفة الصيدليات المحددة', 'Selected pharmacies archived')));
      loadPharmacies();
    } catch (error) {
      setError(error.message || 'Unable to archive selected pharmacies');
    }
  };

  const exportPharmacies = async () => {
    try {
      const file = await medoraApi.adminExportPharmacies();
      triggerBrowserDownload(file);
      setNotice(text(localizedText('تم تنزيل ملف الصيدليات', 'Pharmacies file downloaded')));
    } catch (error) {
      setError(error.message || 'Unable to export pharmacies');
    }
  };

  const openEdit = async (pharmacyId) => {
    try {
      const pharmacy = await medoraApi.adminPharmacy(pharmacyId);
      setEditor({
        open: true,
        form: {
          id: pharmacy.id,
          pharmacyName: pharmacy.pharmacyName || '',
          phone: pharmacy.phone || '',
          addressLine: pharmacy.addressLine || '',
          governorate: pharmacy.governorateAr || '',
          city: pharmacy.cityAr || '',
          bio: pharmacy.bio || '',
          profileImageUrl: pharmacy.profileImageUrl || '',
          openFrom: pharmacy.openFrom || '',
          openTo: pharmacy.openTo || '',
          is24Hours: !!pharmacy.is24Hours,
        },
      });
    } catch (error) {
      setError(error.message || 'Unable to load pharmacy editor');
    }
  };

  const savePharmacy = async () => {
    try {
      await medoraApi.adminUpdatePharmacy(editor.form.id, {
        pharmacyName: editor.form.pharmacyName,
        phone: editor.form.phone,
        addressLine: editor.form.addressLine,
        governorate: editor.form.governorate,
        city: editor.form.city,
        bio: editor.form.bio,
        profileImageUrl: editor.form.profileImageUrl,
        openFrom: editor.form.openFrom || null,
        openTo: editor.form.openTo || null,
        is24Hours: editor.form.is24Hours,
      });
      setEditor({ open: false, form: null });
      setNotice(text(localizedText('تم حفظ بيانات الصيدلية', 'Pharmacy saved')));
      loadPharmacies();
    } catch (error) {
      setError(error.message || 'Unable to save pharmacy');
    }
  };

  const filtered = useMemo(() => {
    return pharmacies;
  }, [pharmacies]);

  const verifiedCount = pharmacies.filter((pharmacy) => pharmacy.status === 'verified').length;
  const pendingCount = pharmacies.filter((pharmacy) => pharmacy.status === 'pending').length;
  const blockedCount = pharmacies.filter((pharmacy) => pharmacy.status === 'rejected' || pharmacy.status === 'suspended').length;

  return (
    <AdminLayout title={COPY.title} subtitle={COPY.subtitle}>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatBox label={COPY.total} value={pharmacies.length} tone="#14b8a6" Icon={Building2} />
        <StatBox label={COPY.verified} value={verifiedCount} tone="#0e7c6e" Icon={ShieldCheck} />
        <StatBox label={COPY.pending} value={pendingCount} tone="#a35a00" Icon={CheckCircle2} />
        <StatBox label={COPY.blocked} value={blockedCount} tone="#c2362f" Icon={Package} />
      </div>

      {pendingPharmacies.length > 0 && (
        <SectionCard
          title={localizedText('طلبات التحقق المعلقة', 'Pending verification requests')}
          description={`${formatLocalizedNumber(pendingPharmacies.length, lang)} ${text(localizedText('صيدلية تنتظر المراجعة', 'pharmacies awaiting review'))}`}
          icon={ShieldCheck}
          className="mb-5"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {pendingPharmacies.map((pharmacy) => (
              <div
                key={pharmacy.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[#fff4e6] bg-[#fffaf2] p-4"
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => approvePharmacy(pharmacy.id)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#14b8a6] text-white transition hover:bg-[#119a8a]"
                    title={text(COPY.approve)}
                  >
                    <CheckCircle2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAction({ type: 'reject', pharmacy })}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#fdecec] text-[#c2362f] transition hover:bg-[#fbd5d5]"
                    title={text(COPY.reject)}
                  >
                    <XCircle size={14} />
                  </button>
                </div>
                <div className="flex-1 text-start">
                  <div className="text-[13px] font-extrabold text-[#084036]">{text(pharmacy.name)}</div>
                  <div className="text-[11px] text-slate-500">{text(pharmacy.city)}</div>
                  <div className="mt-1 text-[10px] text-slate-400" dir="ltr">
                    {pharmacy.license}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard
        title={COPY.listTitle}
        description={`${formatLocalizedNumber(filtered.length, lang)} ${text(COPY.filtered)}`}
        icon={Building2}
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportPharmacies}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#d7ece8] bg-white px-4 py-2 text-[12px] font-bold text-[#119a8a] transition hover:border-[#14b8a6]"
            >
              <Download size={13} />
              {text(COPY.exportCsv)}
            </button>
            <button
              type="button"
              onClick={loadPharmacies}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#14b8a6] px-4 py-2 text-[12px] font-bold text-white shadow-[0_8px_20px_rgba(20,184,166,0.3)] transition hover:bg-[#119a8a]"
            >
              <RefreshCw size={13} />
              {text(COPY.refresh)}
            </button>
          </div>
        }
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <input
              type="search"
              value={query}
              onChange={(e) => { setPage(1); setQuery(e.target.value); }}
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
                onClick={() => { setPage(1); setStatus(tab); }}
                className="rounded-full border px-3 py-1.5 text-[11px] font-bold transition"
                style={
                  status === tab
                    ? { background: '#14b8a6', borderColor: '#14b8a6', color: '#ffffff' }
                    : { background: '#ffffff', borderColor: '#e4eeee', color: '#486466' }
                }
              >
                {tab === 'all' ? text(COPY.all) : text(VERIFY_STATUS_META[tab]?.label)}
              </button>
            ))}
          </div>
        </div>

        <LinkedFilterPills filters={linkedFilters} onClear={clearLinkedFilters} />

        {selectedPharmacies.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#d7ece8] bg-[#f7fbfb] px-3 py-3">
            <div className="text-[12px] font-extrabold text-[#084036]">
              {formatLocalizedNumber(selectedPharmacies.length, lang)} {text(COPY.selected)}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => bulkUpdatePharmacyStatus(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-[11px] font-bold text-emerald-700">
                <CheckCircle2 size={13} /> {text(COPY.bulkActivate)}
              </button>
              <button type="button" onClick={() => bulkUpdatePharmacyStatus(false)} className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-white px-3 py-2 text-[11px] font-bold text-amber-700">
                <Package size={13} /> {text(COPY.bulkSuspend)}
              </button>
              <button type="button" onClick={bulkArchivePharmacies} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-[11px] font-bold text-red-700">
                <Archive size={13} /> {text(COPY.bulkArchive)}
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((pharmacy) => (
            <div
              key={pharmacy.id}
              className="flex flex-col rounded-2xl border border-[#e4eeee] bg-white p-4 shadow-[0_8px_22px_rgba(41,93,96,0.05)] transition hover:border-[#14b8a6]"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.map(String).includes(String(pharmacy.id))}
                    onChange={(event) => toggleSelectedPharmacy(pharmacy.id, event.target.checked)}
                    aria-label={text(localizedText('اختيار الصيدلية', 'Select pharmacy'))}
                  />
                  <StatusPill meta={VERIFY_STATUS_META[pharmacy.status]} />
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-start">
                    <div className="text-[13px] font-extrabold text-[#084036]">{text(pharmacy.name)}</div>
                    <div className="text-[11px] text-slate-500">{text(pharmacy.governorate)}</div>
                  </div>
                  {pharmacy.profileImageUrl ? (
                    <PreviewableImage
                      src={pharmacy.profileImageUrl}
                      alt={text(pharmacy.name)}
                      className="h-11 w-11 rounded-xl object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#d97706] text-white">
                      <Building2 size={16} />
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-3 flex flex-wrap items-center justify-end gap-1.5 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#f7fbfb] px-2 py-0.5 font-bold text-[#2d6669]">
                  <MapPin size={10} /> {text(pharmacy.city)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#eef4ff] px-2 py-0.5 font-bold text-[#2465b6]">
                  {text(localizedText('الحالة التشغيلية', 'Operating status'))}: {pharmacy.openStatus}
                </span>
              </div>

              <div className="mb-3 flex items-center justify-between text-[11px] text-slate-500">
                <span>{text(COPY.joined)}: {formatDate(pharmacy.joined, lang)}</span>
                <span className="font-bold text-[#084036]" dir="ltr">
                  {pharmacy.license}
                </span>
              </div>

              <div className="mt-auto flex gap-2 border-t border-[#f1f7f7] pt-3">
                <button
                  type="button"
                  onClick={() => loadPharmacyDetails(pharmacy.id)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#14b8a6] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#119a8a]"
                >
                  <Eye size={12} />
                  {text(COPY.details)}
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(pharmacy.id)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#e4eeee] bg-white text-[#2465b6] transition hover:border-[#2465b6]"
                  title={text(COPY.edit)}
                >
                  <Edit2 size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => togglePharmacyFeature(pharmacy)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#e4eeee] bg-white text-[#a35a00] transition hover:border-[#f59e0b]"
                  title={text(pharmacy.isFeatured ? COPY.unfeature : COPY.feature)}
                >
                  <Star size={12} fill={pharmacy.isFeatured ? '#f4a524' : 'none'} />
                </button>
                <button
                  type="button"
                  onClick={() => updatePharmacyStatus(pharmacy, !pharmacy.isActive)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#e4eeee] bg-white text-[#0e7c6e] transition hover:border-[#14b8a6]"
                  title={text(pharmacy.isActive ? COPY.suspend : COPY.activate)}
                >
                  <CheckCircle2 size={12} />
                </button>
                {pharmacy.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => approvePharmacy(pharmacy.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#e4eeee] bg-white text-[#0e7c6e] transition hover:border-[#14b8a6]"
                      title={text(COPY.approve)}
                    >
                      <CheckCircle2 size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setAction({ type: 'reject', pharmacy })}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#e4eeee] bg-white text-[#c2362f] transition hover:border-[#ef4444]"
                      title={text(COPY.reject)}
                    >
                      <XCircle size={12} />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setAction({ type: 'archive', pharmacy })}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#e4eeee] bg-white text-[#c2362f] transition hover:border-[#ef4444]"
                  title={text(COPY.archive)}
                >
                  <Archive size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="py-14 text-center text-[12px] text-slate-500">{text(COPY.empty)}</div>
        )}
        {ui.loading && <div className="mt-3 text-center text-xs font-semibold text-slate-400">...</div>}
        {ui.error && <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">{ui.error}</div>}
        {ui.notice && <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">{ui.notice}</div>}
        {Math.ceil(total / PAGE_SIZE) > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-[#f1f7f7] pt-4">
            <span className="text-[11px] font-bold text-[#486466]">
              {text(localizedText('صفحة', 'Page'))} {page} {text(localizedText('من', 'of'))} {Math.ceil(total / PAGE_SIZE)}
            </span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || ui.loading} className="rounded-full border border-[#d7ece8] bg-white px-4 py-2 text-[11px] font-bold text-[#119a8a] disabled:opacity-50">
                {text(localizedText('السابق', 'Previous'))}
              </button>
              <button type="button" onClick={() => setPage((p) => Math.min(Math.ceil(total / PAGE_SIZE), p + 1))} disabled={page >= Math.ceil(total / PAGE_SIZE) || ui.loading} className="rounded-full border border-[#d7ece8] bg-white px-4 py-2 text-[11px] font-bold text-[#119a8a] disabled:opacity-50">
                {text(localizedText('التالي', 'Next'))}
              </button>
            </div>
          </div>
        )}
      </SectionCard>

      <AdminModal
        open={!!selectedPharmacy}
        title={localizedText('ملف الصيدلية الإداري', 'Administrative pharmacy profile')}
        description={selectedPharmacy?.name || COPY.details}
        onClose={() => setSelectedPharmacy(null)}
        size="xl"
      >
        {selectedPharmacy && <PharmacyActivityProfile pharmacy={selectedPharmacy} lang={lang} onNavigate={navigateWithParams} />}
      </AdminModal>

      <AdminModal
        open={editor.open}
        title={COPY.edit}
        onClose={() => setEditor({ open: false, form: null })}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditor({ open: false, form: null })} className="rounded-xl border border-[#e4eeee] px-4 py-2 text-[12px] font-bold text-[#486466]">{text(COPY.cancel)}</button>
            <button type="button" onClick={savePharmacy} className="rounded-xl bg-[#14b8a6] px-4 py-2 text-[12px] font-bold text-white">{text(COPY.save)}</button>
          </div>
        }
      >
        {editor.form && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={localizedText('اسم الصيدلية', 'Pharmacy name')} value={editor.form.pharmacyName} onChange={(value) => setEditor((current) => ({ ...current, form: { ...current.form, pharmacyName: value } }))} />
            <Field label={COPY.phone} value={editor.form.phone} onChange={(value) => setEditor((current) => ({ ...current, form: { ...current.form, phone: value } }))} dir="ltr" />
            <Field label={localizedText('المحافظة', 'Governorate')} value={editor.form.governorate} onChange={(value) => setEditor((current) => ({ ...current, form: { ...current.form, governorate: value } }))} />
            <Field label={localizedText('المدينة', 'City')} value={editor.form.city} onChange={(value) => setEditor((current) => ({ ...current, form: { ...current.form, city: value } }))} />
            <Field label={localizedText('بداية العمل', 'Open from')} value={editor.form.openFrom} onChange={(value) => setEditor((current) => ({ ...current, form: { ...current.form, openFrom: value } }))} dir="ltr" />
            <Field label={localizedText('نهاية العمل', 'Open to')} value={editor.form.openTo} onChange={(value) => setEditor((current) => ({ ...current, form: { ...current.form, openTo: value } }))} dir="ltr" />
            <label className="flex items-center justify-between gap-3 rounded-xl border border-[#e4eeee] bg-[#f8fbfb] px-3 py-3">
              <input type="checkbox" checked={editor.form.is24Hours} onChange={() => setEditor((current) => ({ ...current, form: { ...current.form, is24Hours: !current.form.is24Hours } }))} />
              <span className="text-[12px] font-bold text-[#084036]">{text(localizedText('تعمل 24 ساعة', 'Open 24 hours'))}</span>
            </label>
            <div className="sm:col-span-2">
              <Field label={COPY.address} value={editor.form.addressLine} onChange={(value) => setEditor((current) => ({ ...current, form: { ...current.form, addressLine: value } }))} />
            </div>
            <div className="sm:col-span-2">
              <Field label={localizedText('رابط الصورة', 'Image URL')} value={editor.form.profileImageUrl} onChange={(value) => setEditor((current) => ({ ...current, form: { ...current.form, profileImageUrl: value } }))} dir="ltr" />
            </div>
            <label className="sm:col-span-2 flex flex-col gap-1">
              <span className="text-[11px] font-extrabold text-[#486466]">{text(localizedText('نبذة', 'Bio'))}</span>
              <textarea value={editor.form.bio} onChange={(event) => setEditor((current) => ({ ...current, form: { ...current.form, bio: event.target.value } }))} className="min-h-[110px] rounded-xl border border-[#e4eeee] p-3 text-[12px] outline-none focus:border-[#14b8a6]" />
            </label>
          </div>
        )}
      </AdminModal>

      <AdminActionDialog
        open={action?.type === 'reject'}
        title={COPY.rejectTitle}
        confirmLabel={COPY.reject}
        tone="warning"
        requiresReason
        onClose={() => setAction(null)}
        onConfirm={(reason) => rejectPharmacy(action?.pharmacy?.id, reason)}
      />
      <AdminActionDialog
        open={action?.type === 'archive'}
        title={COPY.archiveTitle}
        description={COPY.archiveDesc}
        confirmLabel={COPY.archive}
        requiresReason
        onClose={() => setAction(null)}
        onConfirm={archivePharmacy}
      />
    </AdminLayout>
  );
}

function StatBox({ label, value, tone, Icon }) {
  const { lang, text } = useLocalizedContent();

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#e4eeee] bg-white p-4 shadow-[0_8px_22px_rgba(41,93,96,0.06)]">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${tone}1a`, color: tone }}>
        {Icon && <Icon size={16} />}
      </span>
      <div>
        <div className="text-[22px] font-black text-[#084036]">{formatLocalizedNumber(value, lang)}</div>
        <div className="text-[11px] text-[#486466]">{text(label)}</div>
      </div>
    </div>
  );
}

function DetailCard({ label, value, dir }) {
  const { text } = useLocalizedContent();

  return (
    <div className="rounded-2xl border border-[#eef5f5] bg-[#f8fbfb] p-4">
      <div className="mb-1 text-[11px] font-extrabold text-[#486466]">{text(label)}</div>
      <div className="text-[13px] font-bold text-[#084036]" dir={dir}>
        {value}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, dir }) {
  const { text } = useLocalizedContent();

  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-extrabold text-[#486466]">{text(label)}</span>
      <input
        value={value}
        dir={dir}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-xl border border-[#e4eeee] bg-white px-3 text-[12px] outline-none focus:border-[#14b8a6]"
      />
    </label>
  );
}

function PharmacyActivityProfile({ pharmacy, lang, onNavigate }) {
  const { text } = useLocalizedContent();
  const counts = pharmacy.counts || {};
  const userId = pharmacy.user?.id || pharmacy.userId;

  const quickLinks = [
    userId && { label: localizedText('حساب المستخدم', 'User account'), Icon: Users, count: null, action: () => onNavigate('/admin/users', { userId }) },
    { label: localizedText('طلبات الصيدلية', 'Pharmacy orders'), Icon: Package, count: counts.orders, action: () => onNavigate('/admin/orders', { pharmacyId: pharmacy.id }) },
    { label: localizedText('تقييمات الصيدلية', 'Pharmacy reviews'), Icon: Star, count: counts.reviews, action: () => onNavigate('/admin/reviews', { pharmacyId: pharmacy.id }) },
    { label: localizedText('بلاغات على الصيدلية', 'Pharmacy reports'), Icon: Bell, count: counts.reports, action: () => onNavigate('/admin/reports', { entityType: 'pharmacy', entityId: pharmacy.id }) },
    { label: localizedText('سجل الأدمن للكيان', 'Entity admin log'), Icon: ShieldCheck, count: null, action: () => onNavigate('/admin/reports', { entityType: 'pharmacy', entityId: pharmacy.id }) },
  ].filter(Boolean);

  const countCards = [
    { label: localizedText('الطلبات', 'Orders'), value: counts.orders, Icon: Package },
    { label: localizedText('الأدوية', 'Medicines'), value: counts.medicines, Icon: Pill },
    { label: localizedText('المتاح', 'Available'), value: counts.availableMedicines, Icon: CheckCircle2 },
    { label: localizedText('مخزون منخفض', 'Low stock'), value: counts.lowStockMedicines, Icon: Bell },
    { label: localizedText('الروشتات', 'Prescriptions'), value: counts.prescriptions, Icon: FileText },
    { label: localizedText('التقييمات', 'Reviews'), value: counts.reviews, Icon: Star },
    { label: localizedText('البلاغات', 'Reports'), value: counts.reports, Icon: Bell },
    { label: localizedText('المشاهدات', 'Views'), value: pharmacy.views, Icon: Eye },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#eef5f5] bg-[#f8fbfb] p-4">
          <div className="flex items-start gap-3">
            {pharmacy.profileImageUrl ? (
              <PreviewableImage
                src={pharmacy.profileImageUrl}
                alt={text(localizedText('صورة الصيدلية', 'Pharmacy image'))}
                className="h-16 w-16 shrink-0 rounded-2xl border-4 border-white object-cover shadow-sm"
              />
            ) : (
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#e6f7f7] text-[#14b8a6]">
                <Building2 size={22} />
              </span>
            )}
            <div className="min-w-0">
              <div className="text-[14px] font-black text-[#084036]">{text(pharmacy.name)}</div>
              <div className="mt-1 text-[12px] font-bold text-[#486466]">{text(pharmacy.city)} · {text(pharmacy.governorate)}</div>
              <div className="mt-2">
                <StatusPill meta={VERIFY_STATUS_META[pharmacy.status]} size="lg" />
              </div>
            </div>
          </div>
        </div>
        <DetailCard label={COPY.license} value={pharmacy.license} dir="ltr" />
        <DetailCard label={COPY.phone} value={pharmacy.phone} dir="ltr" />
        <DetailCard label={COPY.joined} value={formatDate(pharmacy.joined, lang)} />
        <DetailCard label={COPY.openHours} value={pharmacy.is24Hours ? '24/7' : `${pharmacy.openFrom || '—'} - ${pharmacy.openTo || '—'}`} dir="ltr" />
        <DetailCard label={localizedText('حالة التشغيل', 'Operating status')} value={pharmacy.openStatus || '—'} />
        <div className="lg:col-span-3 rounded-2xl border border-[#eef5f5] bg-[#f8fbfb] p-4">
          <div className="mb-1 text-[11px] font-extrabold text-[#486466]">{text(COPY.address)}</div>
          <div className="text-[13px] leading-7 text-[#084036]">{pharmacy.address}</div>
          {pharmacy.bio && pharmacy.bio !== '—' && (
            <div className="mt-3 border-t border-[#e4eeee] pt-3 text-[13px] leading-7 text-[#084036]">{pharmacy.bio}</div>
          )}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map(({ label, Icon, count, action }) => (
          <QuickAction key={text(label)} label={label} Icon={Icon} count={count} onClick={action} />
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {countCards.map(({ label, value, Icon }) => (
          <div key={text(label)} className="rounded-2xl border border-[#e4eeee] bg-white px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-[#486466]">{text(label)}</span>
              {React.createElement(Icon, { size: 14, className: 'text-[#14b8a6]' })}
            </div>
            <div className="mt-2 text-[20px] font-black text-[#084036]">{formatLocalizedNumber(value || 0, lang)}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ActivityPanel title={localizedText('أدوية الصيدلية والمخزون', 'Pharmacy medicines and stock')} Icon={Pill}>
          <MiniRecordList items={pharmacy.medicines} empty={localizedText('لا توجد أدوية مسجلة', 'No medicines found')}>
            {(item) => (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="font-extrabold text-[#084036]">{item.medicineName || `#${item.medicineId}`}</div>
                  {item.isLowStock && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">{text(localizedText('منخفض', 'Low'))}</span>}
                </div>
                <div className="text-slate-500">{item.activeIngredient || '—'} · {item.form || '—'} · {item.strength || '—'}</div>
                <div className="text-slate-400">
                  {text(localizedText('الكمية', 'Quantity'))}: {item.quantity ?? '—'} · {item.price ? `${formatLocalizedNumber(item.price, lang)} ${text(localizedText('ج.م', 'EGP'))}` : '—'}
                </div>
              </>
            )}
          </MiniRecordList>
        </ActivityPanel>

        <ActivityPanel title={localizedText('آخر الطلبات', 'Latest orders')} Icon={Package}>
          <MiniRecordList items={pharmacy.latestOrders} empty={localizedText('لا توجد طلبات', 'No orders')}>
            {(item) => (
              <>
                <div className="font-extrabold text-[#084036]">{item.orderNumber || `#${item.id}`}</div>
                <div className="text-slate-500">{item.patientName || item.customer || '—'} · {item.status || '—'}</div>
                <div className="text-slate-400">{formatLocalizedNumber(item.total || 0, lang)} {text(localizedText('ج.م', 'EGP'))} · {formatDate(item.createdAt, lang)}</div>
              </>
            )}
          </MiniRecordList>
        </ActivityPanel>

        <ActivityPanel title={localizedText('آخر الروشتات', 'Latest prescriptions')} Icon={FileText}>
          <MiniRecordList items={pharmacy.latestPrescriptions} empty={localizedText('لا توجد روشتات', 'No prescriptions')}>
            {(item) => (
              <>
                <div className="font-extrabold text-[#084036]">{item.prescriptionNumber || `#${item.id}`}</div>
                <div className="text-slate-500">{item.patientName || '—'} · {item.doctorName || '—'} · {item.status || '—'}</div>
                <div className="text-slate-400">{item.diagnosis || '—'}</div>
              </>
            )}
          </MiniRecordList>
        </ActivityPanel>

        <ActivityPanel title={localizedText('التقييمات والبلاغات', 'Reviews and reports')} Icon={Bell}>
          <MiniRecordList items={[...(pharmacy.latestReviews || []), ...(pharmacy.latestReports || [])]} empty={localizedText('لا توجد تقييمات أو بلاغات', 'No reviews or reports')}>
            {(item) => (
              <>
                <div className="font-extrabold text-[#084036]">{item.comment || item.reason || item.reviewerName || item.reporterName || `#${item.id}`}</div>
                <div className="text-slate-500">{item.rating ? `${item.rating}/5` : item.status || '—'}</div>
                <div className="text-slate-400">{formatDate(item.createdAt, lang)}</div>
              </>
            )}
          </MiniRecordList>
        </ActivityPanel>
      </div>

      {(pharmacy.licenseImageUrl || pharmacy.pharmacistIdCardUrl) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {pharmacy.licenseImageUrl && (
            <VerificationImage title={localizedText('رخصة التشغيل', 'Operating license')} src={pharmacy.licenseImageUrl} />
          )}
          {pharmacy.pharmacistIdCardUrl && (
            <VerificationImage title={localizedText('كارنيه الصيدلي', 'Pharmacist ID')} src={pharmacy.pharmacistIdCardUrl} />
          )}
        </div>
      )}
    </div>
  );
}

function QuickAction({ label, Icon, count, onClick }) {
  const { lang, text } = useLocalizedContent();

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between gap-3 rounded-2xl border border-[#e4eeee] bg-white px-3 py-3 text-start transition hover:border-[#14b8a6] hover:bg-[#f7fbfb]"
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#e6f7f7] text-[#14b8a6]">
          {React.createElement(Icon, { size: 15 })}
        </span>
        <span className="min-w-0 text-[12px] font-extrabold text-[#084036]">{text(label)}</span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-[#119a8a]">
        {count !== null && count !== undefined ? formatLocalizedNumber(count, lang) : null}
        <ExternalLink size={12} />
      </span>
    </button>
  );
}

function ActivityPanel({ title, Icon: IconComponent, children }) {
  const { text } = useLocalizedContent();

  return (
    <div className="rounded-2xl border border-[#e4eeee] bg-[#fbfefe] p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#e6f7f7] text-[#14b8a6]">
          {React.createElement(IconComponent, { size: 14 })}
        </span>
        <div className="text-[12px] font-black text-[#084036]">{text(title)}</div>
      </div>
      {children}
    </div>
  );
}

function MiniRecordList({ items, empty, children }) {
  const { text } = useLocalizedContent();

  if (!Array.isArray(items) || items.length === 0) {
    return <div className="rounded-xl bg-white px-3 py-4 text-center text-[12px] font-bold text-slate-400">{text(empty)}</div>;
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={item.id || `${index}`} className="rounded-xl border border-[#eef5f5] bg-white px-3 py-2 text-[12px] leading-6">
          {children(item)}
        </div>
      ))}
    </div>
  );
}

function VerificationImage({ title, src }) {
  const { text } = useLocalizedContent();

  return (
    <div className="rounded-2xl border border-[#eef5f5] bg-[#f8fbfb] p-4">
      <div className="mb-2 text-[11px] font-extrabold text-[#486466]">{text(title)}</div>
      <PreviewableImage
        src={src}
        alt={text(title)}
        className="h-48 w-full rounded-xl border border-[#e4eeee] object-cover hover:opacity-90"
      />
    </div>
  );
}
