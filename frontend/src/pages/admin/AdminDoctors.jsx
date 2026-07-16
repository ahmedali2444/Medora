import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Archive, Bell, Building2, CalendarCheck, CheckCircle2, Download, Edit2, ExternalLink, Eye, FileText, Pill, RefreshCw, ScanSearch as Search, ShieldCheck, Star, Stethoscope, UserX, Users, XCircle } from 'lucide-react';
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

const COPY = {
  title: localizedText('الأطباء', 'Doctors'),
  subtitle: localizedText('إدارة حسابات الأطباء واعتمادهم على المنصة', 'Manage doctor accounts and verification'),
  totalDoctors: localizedText('إجمالي الأطباء', 'Total doctors'),
  verified: localizedText('معتمدون', 'Verified'),
  pending: localizedText('قيد التحقق', 'Pending verification'),
  blocked: localizedText('مرفوض / معلّق', 'Rejected / suspended'),
  pendingTitle: localizedText('طلبات التحقق المعلّقة', 'Pending verification requests'),
  pendingDesc: localizedText('طبيب بانتظار مراجعة مستنداتهم', 'doctors awaiting document review'),
  allDoctors: localizedText('كل الأطباء', 'All doctors'),
  filteredDoctors: localizedText('طبيب بالفلاتر الحالية', 'doctors matching filters'),
  searchPlaceholder: localizedText(
    'ابحث بالاسم، التخصص، أو رقم الترخيص...',
    'Search by name, specialty, or license number...',
  ),
  all: localizedText('الكل', 'All'),
  approve: localizedText('اعتماد', 'Approve'),
  reject: localizedText('رفض', 'Reject'),
  viewProfile: localizedText('عرض الملف', 'View profile'),
  editProfile: localizedText('تعديل الملف', 'Edit profile'),
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
  empty: localizedText('لا يوجد أطباء بهذا الفلتر.', 'No doctors match this filter.'),
  exportCsv: localizedText('تصدير CSV', 'Export CSV'),
  refresh: localizedText('تحديث', 'Refresh'),
  specialty: localizedText('التخصص', 'Specialty'),
  phone: localizedText('الهاتف', 'Phone'),
  bio: localizedText('نبذة', 'Bio'),
  views: localizedText('المشاهدات', 'Views'),
  license: localizedText('رقم الترخيص', 'License number'),
  save: localizedText('حفظ', 'Save'),
  cancel: localizedText('إلغاء', 'Cancel'),
  rejectTitle: localizedText('رفض طلب تحقق الطبيب؟', 'Reject doctor verification?'),
  archiveTitle: localizedText('أرشفة الطبيب؟', 'Archive this doctor?'),
  archiveDesc: localizedText('سيتم تعطيل ملف الطبيب وإلغاء تمييزه مع الاحتفاظ بالسجلات التاريخية.', 'The doctor profile will be disabled and unfeatured while historical records remain.'),
};

const mapDoctorStatus = (doctor) => {
  const verification = `${doctor.verificationStatus || ''}`.toLowerCase();
  if (verification === 'pending') return 'pending';
  if (verification === 'rejected') return 'rejected';
  if (!doctor.isActive) return 'suspended';
  return 'verified';
};

export default function AdminDoctors() {
  const { lang, text } = useLocalizedContent();
  const navigate = useNavigate();
  const [params, setSearchParams] = useSearchParams();
  const initialStatus = params.get('status') || 'all';
  const [status, setStatus] = useState(initialStatus);
  const [query, setQuery] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [editor, setEditor] = useState({ open: false, form: null });
  const [action, setAction] = useState(null);
  const [ui, setUi] = useState({ loading: true, error: '', notice: '' });
  // Server pagination state for the admin doctors list.
  const [currentPage, setCurrentPage] = useState(1);
  const [totalDoctors, setTotalDoctors] = useState(0);
  const PAGE_SIZE = 20;
  const totalPages = Math.max(Math.ceil(totalDoctors / PAGE_SIZE), 1);
  const linkedFilters = readLinkedFilters(params);
  const userId = params.get('userId') || '';
  const doctorId = params.get('doctorId') || '';
  const dateFrom = params.get('dateFrom') || '';
  const dateTo = params.get('dateTo') || '';
  const sortBy = params.get('sortBy') || '';
  const sortDir = params.get('sortDir') || '';

  const setError = (message) => setUi((current) => ({ ...current, loading: false, error: message }));
  const setNotice = (message) => {
    setUi((current) => ({ ...current, notice: message }));
    window.clearTimeout(setNotice.timer);
    setNotice.timer = window.setTimeout(() => {
      setUi((current) => ({ ...current, notice: '' }));
    }, 2400);
  };

  const loadDoctors = async (page = currentPage) => {
    setUi((current) => ({ ...current, loading: true, error: '' }));
    try {
      const [doctorsResult, pendingResult] = await Promise.allSettled([
        medoraApi.adminDoctors({
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
        }),
        medoraApi.adminPendingVerifications(),
      ]);
      if (doctorsResult.status === 'rejected') throw doctorsResult.reason;

      const doctorsData = doctorsResult.value;
      const pendingData = pendingResult.status === 'fulfilled' ? pendingResult.value : {};

      const mappedDoctors = Array.isArray(doctorsData?.items)
        ? doctorsData.items.map((doctor) => ({
            id: doctor.id,
            name: localizedText(doctor.fullName || '', doctor.fullName || ''),
            specialty: localizedText(doctor.specialtyNameAr || '—', doctor.specialtyNameEn || doctor.specialtyNameAr || '—'),
            status: mapDoctorStatus(doctor),
            license: doctor.licenseNumber || '—',
            rating: Number(doctor.avgRating || 0),
            reviews: Number(doctor.reviewsCount || 0),
            joined: doctor.createdAt,
            phone: doctor.phone || '—',
            profileImageUrl: doctor.profileImageUrl || '',
            views: doctor.viewCount || 0,
            availabilityStatus: doctor.availabilityStatus,
            isFeatured: !!doctor.isFeatured,
            isActive: !!doctor.isActive,
          }))
        : [];

      const mappedPending = Array.isArray(pendingData?.doctors)
        ? pendingData.doctors.map((doctor) => ({
            id: doctor.doctorId,
            name: localizedText(doctor.fullName || '', doctor.fullName || ''),
            specialty: localizedText(doctor.specialtyAr || '—', doctor.specialtyEn || doctor.specialtyAr || '—'),
            license: doctor.licenseNumber || '—',
          }))
        : [];

      setDoctors(mappedDoctors);
      setTotalDoctors(doctorsData?.total ?? mappedDoctors.length);
      setPendingDoctors(mappedPending);
      setSelectedIds([]);
      setUi((current) => ({ ...current, loading: false, error: '' }));
    } catch (error) {
      setDoctors([]);
      setPendingDoctors([]);
      setError(error.message || 'Unable to load doctors');
    }
  };

  useEffect(() => {
    queueMicrotask(() => loadDoctors(currentPage));
    return () => {
      if (setNotice.timer) window.clearTimeout(setNotice.timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, dateFrom, dateTo, doctorId, query, sortBy, sortDir, status, userId]);

  const clearLinkedFilters = () => {
    const next = new URLSearchParams(params);
    LINKED_FILTER_KEYS.forEach((key) => next.delete(key));
    setCurrentPage(1);
    setSearchParams(next, { replace: true });
  };

  const loadDoctorDetails = async (doctorId) => {
    try {
      const data = await medoraApi.adminDoctorActivity(doctorId);
      const doctor = data?.doctor || data;
      setSelectedDoctor({
        id: doctor.id,
        userId: doctor.userId,
        name: localizedText(doctor.fullName || '', doctor.fullName || ''),
        specialty: localizedText(doctor.specialtyNameAr || '—', doctor.specialtyNameEn || doctor.specialtyNameAr || '—'),
        license: doctor.licenseNumber || '—',
        joined: doctor.createdAt,
        phone: doctor.phone || '—',
        bio: doctor.bio || '—',
        views: doctor.viewCount || 0,
        status: mapDoctorStatus(doctor),
        profileImageUrl: doctor.profileImageUrl,
        syndicateCardImageUrl: doctor.syndicateCardImageUrl,
        selfieWithCardUrl: doctor.selfieWithCardUrl,
        experienceYears: doctor.experienceYears || 0,
        languages: doctor.languages || '',
        user: data?.user || null,
        counts: data?.counts || {},
        clinics: Array.isArray(data?.clinics) ? data.clinics : [],
        latestPatients: Array.isArray(data?.latestPatients) ? data.latestPatients : [],
        latestAppointments: Array.isArray(data?.latestAppointments) ? data.latestAppointments : [],
        latestPrescriptions: Array.isArray(data?.latestPrescriptions) ? data.latestPrescriptions : [],
        latestArticles: Array.isArray(data?.latestArticles) ? data.latestArticles : [],
        latestReviews: Array.isArray(data?.latestReviews) ? data.latestReviews : [],
        latestReports: Array.isArray(data?.latestReports) ? data.latestReports : [],
      });
    } catch (error) {
      setError(error.message || 'Unable to load doctor details');
    }
  };

  const navigateWithParams = (path, nextParams) => {
    const search = new URLSearchParams();
    Object.entries(nextParams || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') search.set(key, value);
    });
    navigate(`${path}?${search.toString()}`);
    setSelectedDoctor(null);
  };

  const approveDoctor = async (doctorId) => {
    try {
      await medoraApi.adminApproveDoctor(doctorId);
      setNotice(text(localizedText('تم اعتماد الطبيب', 'Doctor approved')));
      loadDoctors();
    } catch (error) {
      setError(error.message || 'Unable to approve doctor');
    }
  };

  const rejectDoctor = async (doctorId, reason = '') => {
    try {
      await medoraApi.adminRejectDoctor(doctorId, reason ? { reason } : {});
      setNotice(text(localizedText('تم رفض الطبيب', 'Doctor rejected')));
      setAction(null);
      loadDoctors();
    } catch (error) {
      setError(error.message || 'Unable to reject doctor');
    }
  };

  const updateDoctorStatus = async (doctor, isActive) => {
    try {
      await medoraApi.adminUpdateDoctorStatus(doctor.id, { isActive });
      setNotice(text(isActive ? localizedText('تم تفعيل الطبيب', 'Doctor activated') : localizedText('تم تعليق الطبيب', 'Doctor suspended')));
      loadDoctors();
    } catch (error) {
      setError(error.message || 'Unable to update doctor status');
    }
  };

  const toggleDoctorFeature = async (doctor) => {
    try {
      await medoraApi.adminFeatureDoctor(doctor.id, { isFeatured: !doctor.isFeatured });
      setNotice(text(doctor.isFeatured ? localizedText('تم إلغاء تمييز الطبيب', 'Doctor unfeatured') : localizedText('تم تمييز الطبيب', 'Doctor featured')));
      loadDoctors();
    } catch (error) {
      setError(error.message || 'Unable to update doctor feature');
    }
  };

  const archiveDoctor = async (reason) => {
    if (!action?.doctor) return;
    try {
      await medoraApi.adminArchiveDoctor(action.doctor.id, reason ? { reason } : {});
      setNotice(text(localizedText('تمت أرشفة الطبيب', 'Doctor archived')));
      setAction(null);
      loadDoctors();
    } catch (error) {
      setError(error.message || 'Unable to archive doctor');
    }
  };

  const selectedDoctors = doctors.filter((doctor) => selectedIds.map(String).includes(String(doctor.id)));
  const toggleSelectedDoctor = (doctorId, checked) => {
    setSelectedIds((current) => checked ? Array.from(new Set([...current, doctorId])) : current.filter((id) => String(id) !== String(doctorId)));
  };

  const bulkUpdateDoctorStatus = async (isActive) => {
    const targets = selectedDoctors.filter((doctor) => doctor.isActive !== isActive);
    if (!targets.length) return;
    try {
      await Promise.all(targets.map((doctor) => medoraApi.adminUpdateDoctorStatus(doctor.id, { isActive })));
      setSelectedIds([]);
      setNotice(text(isActive ? localizedText('تم تفعيل الأطباء المحددين', 'Selected doctors activated') : localizedText('تم تعليق الأطباء المحددين', 'Selected doctors suspended')));
      loadDoctors();
    } catch (error) {
      setError(error.message || 'Unable to update selected doctors');
    }
  };

  const bulkArchiveDoctors = async () => {
    if (!selectedDoctors.length) return;
    try {
      await Promise.all(selectedDoctors.map((doctor) => medoraApi.adminArchiveDoctor(doctor.id, {})));
      setSelectedIds([]);
      setNotice(text(localizedText('تمت أرشفة الأطباء المحددين', 'Selected doctors archived')));
      loadDoctors();
    } catch (error) {
      setError(error.message || 'Unable to archive selected doctors');
    }
  };

  const openEdit = async (doctorId) => {
    try {
      const doctor = await medoraApi.adminDoctor(doctorId);
      setEditor({
        open: true,
        form: {
          id: doctor.id,
          fullName: doctor.fullName || '',
          phone: doctor.phone || '',
          licenseNumber: doctor.licenseNumber || '',
          specialty: doctor.specialtyNameAr || '',
          experienceYears: doctor.experienceYears || 0,
          languages: doctor.languages || '',
          bio: doctor.bio || '',
          profileImageUrl: doctor.profileImageUrl || '',
        },
      });
    } catch (error) {
      setError(error.message || 'Unable to load doctor editor');
    }
  };

  const saveDoctor = async () => {
    try {
      await medoraApi.adminUpdateDoctor(editor.form.id, {
        fullName: editor.form.fullName,
        phone: editor.form.phone,
        licenseNumber: editor.form.licenseNumber,
        specialty: editor.form.specialty,
        experienceYears: Number(editor.form.experienceYears || 0),
        languages: editor.form.languages,
        bio: editor.form.bio,
        profileImageUrl: editor.form.profileImageUrl,
      });
      setEditor({ open: false, form: null });
      setNotice(text(localizedText('تم حفظ بيانات الطبيب', 'Doctor saved')));
      loadDoctors();
    } catch (error) {
      setError(error.message || 'Unable to save doctor');
    }
  };

  const exportDoctors = async () => {
    try {
      const file = await medoraApi.adminExportDoctors();
      triggerBrowserDownload(file);
      setNotice(text(localizedText('تم تنزيل ملف الأطباء', 'Doctors file downloaded')));
    } catch (error) {
      setError(error.message || 'Unable to export doctors');
    }
  };

  const filtered = useMemo(() => {
    return doctors;
  }, [doctors]);

  const pendingCount = doctors.filter((doctor) => doctor.status === 'pending').length;
  const verifiedCount = doctors.filter((doctor) => doctor.status === 'verified').length;
  const blockedCount = doctors.filter((doctor) => doctor.status === 'rejected' || doctor.status === 'suspended').length;

  return (
    <AdminLayout title={COPY.title} subtitle={COPY.subtitle}>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatBox label={COPY.totalDoctors} value={doctors.length} tone="#14b8a6" Icon={Stethoscope} />
        <StatBox label={COPY.verified} value={verifiedCount} tone="#0e7c6e" Icon={ShieldCheck} />
        <StatBox label={COPY.pending} value={pendingCount} tone="#a35a00" Icon={CheckCircle2} />
        <StatBox label={COPY.blocked} value={blockedCount} tone="#c2362f" Icon={UserX} />
      </div>

      {pendingDoctors.length > 0 && (
        <SectionCard
          title={COPY.pendingTitle}
          description={`${formatLocalizedNumber(pendingDoctors.length, lang)} ${text(COPY.pendingDesc)}`}
          icon={ShieldCheck}
          className="mb-5"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {pendingDoctors.map((doctor) => (
              <div
                key={doctor.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[#fff4e6] bg-[#fffaf2] p-4"
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => approveDoctor(doctor.id)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#14b8a6] text-white transition hover:bg-[#119a8a]"
                    title={text(COPY.approve)}
                  >
                    <CheckCircle2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAction({ type: 'reject', doctor })}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#fdecec] text-[#c2362f] transition hover:bg-[#fbd5d5]"
                    title={text(COPY.reject)}
                  >
                    <XCircle size={14} />
                  </button>
                </div>
                <div className="flex-1 text-start">
                  <div className="text-[13px] font-extrabold text-[#084036]">{text(doctor.name)}</div>
                  <div className="text-[11px] text-slate-500">{text(doctor.specialty)}</div>
                  <div className="mt-1 text-[10px] text-slate-400" dir="ltr">
                    {doctor.license}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard
        title={COPY.allDoctors}
        description={`${formatLocalizedNumber(filtered.length, lang)} ${text(COPY.filteredDoctors)}`}
        icon={Stethoscope}
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportDoctors}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#d7ece8] bg-white px-4 py-2 text-[12px] font-bold text-[#119a8a] transition hover:border-[#14b8a6]"
            >
              <Download size={13} />
              {text(COPY.exportCsv)}
            </button>
            <button
              type="button"
              onClick={() => loadDoctors(currentPage)}
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
              onChange={(e) => { setCurrentPage(1); setQuery(e.target.value); }}
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
                onClick={() => { setCurrentPage(1); setStatus(tab); }}
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

        {selectedDoctors.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#d7ece8] bg-[#f7fbfb] px-3 py-3">
            <div className="text-[12px] font-extrabold text-[#084036]">
              {formatLocalizedNumber(selectedDoctors.length, lang)} {text(COPY.selected)}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => bulkUpdateDoctorStatus(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-[11px] font-bold text-emerald-700">
                <CheckCircle2 size={13} /> {text(COPY.bulkActivate)}
              </button>
              <button type="button" onClick={() => bulkUpdateDoctorStatus(false)} className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-white px-3 py-2 text-[11px] font-bold text-amber-700">
                <UserX size={13} /> {text(COPY.bulkSuspend)}
              </button>
              <button type="button" onClick={bulkArchiveDoctors} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-[11px] font-bold text-red-700">
                <Archive size={13} /> {text(COPY.bulkArchive)}
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((doctor) => {
            const doctorName = text(doctor.name);

            return (
              <div
                key={doctor.id}
                className="flex flex-col rounded-2xl border border-[#e4eeee] bg-white p-4 shadow-[0_8px_22px_rgba(41,93,96,0.05)] transition hover:-translate-y-0.5 hover:border-[#14b8a6] hover:shadow-[0_14px_30px_rgba(41,93,96,0.1)]"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.map(String).includes(String(doctor.id))}
                      onChange={(event) => toggleSelectedDoctor(doctor.id, event.target.checked)}
                      aria-label={text(localizedText('اختيار الطبيب', 'Select doctor'))}
                    />
                    <StatusPill meta={VERIFY_STATUS_META[doctor.status]} />
                  </div>
                  <div className="flex items-center gap-3 text-start">
                    <div>
                      <div className="text-[13px] font-extrabold text-[#084036]">{doctorName}</div>
                      <div className="text-[11px] text-slate-500">{text(doctor.specialty)}</div>
                    </div>
                    {doctor.profileImageUrl ? (
                      <PreviewableImage
                        src={doctor.profileImageUrl}
                        alt={doctorName}
                        className="h-11 w-11 rounded-xl object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#14b8a6] to-[#0b5e52] text-white">
                        <span className="text-[13px] font-black">{doctorName.trim().charAt(0) || '?'}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-3 flex flex-wrap items-center justify-end gap-1.5 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#f7fbfb] px-2 py-0.5 font-bold text-[#2d6669]">
                    {text(localizedText('الحالة المهنية', 'Availability'))}: {doctor.availabilityStatus || '—'}
                  </span>
                  {doctor.reviews > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#fff8e7] px-2 py-0.5 font-bold text-[#a35a00]">
                      <Star size={10} fill="#f4a524" color="#f4a524" />
                      {formatLocalizedNumber(doctor.reviews, lang)}
                    </span>
                  )}
                </div>

                <div className="mb-3 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{text(COPY.joined)}: {formatDate(doctor.joined, lang)}</span>
                  <span className="font-bold text-[#084036]" dir="ltr">
                    {doctor.license}
                  </span>
                </div>

                <div className="mt-auto flex gap-2 border-t border-[#f1f7f7] pt-3">
                  <button
                    type="button"
                    onClick={() => loadDoctorDetails(doctor.id)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#14b8a6] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#119a8a]"
                  >
                    <Eye size={12} />
                    {text(COPY.viewProfile)}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(doctor.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#e4eeee] bg-white text-[#2465b6] transition hover:border-[#2465b6]"
                    title={text(COPY.editProfile)}
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleDoctorFeature(doctor)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#e4eeee] bg-white text-[#a35a00] transition hover:border-[#f59e0b]"
                    title={text(doctor.isFeatured ? COPY.unfeature : COPY.feature)}
                  >
                    <Star size={12} fill={doctor.isFeatured ? '#f4a524' : 'none'} />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateDoctorStatus(doctor, !doctor.isActive)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#e4eeee] bg-white text-[#0e7c6e] transition hover:border-[#14b8a6]"
                    title={text(doctor.isActive ? COPY.suspend : COPY.activate)}
                  >
                    {doctor.isActive ? <UserX size={12} /> : <CheckCircle2 size={12} />}
                  </button>
                  {doctor.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => approveDoctor(doctor.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#e4eeee] bg-white text-[#0e7c6e] transition hover:border-[#14b8a6]"
                        title={text(COPY.approve)}
                      >
                        <CheckCircle2 size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAction({ type: 'reject', doctor })}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#e4eeee] bg-white text-[#c2362f] transition hover:border-[#ef4444]"
                        title={text(COPY.reject)}
                      >
                        <XCircle size={12} />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setAction({ type: 'archive', doctor })}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#e4eeee] bg-white text-[#c2362f] transition hover:border-[#ef4444]"
                    title={text(COPY.archive)}
                  >
                    <Archive size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="py-14 text-center text-[12px] text-slate-500">{text(COPY.empty)}</div>
        )}
        {ui.loading && <div className="mt-3 text-center text-xs font-semibold text-slate-400">...</div>}
        {ui.error && <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">{ui.error}</div>}
        {ui.notice && <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">{ui.notice}</div>}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-[#f1f7f7] pt-4">
            <span className="text-[11px] font-bold text-[#486466]">
              {text(localizedText('صفحة', 'Page'))} {currentPage} {text(localizedText('من', 'of'))} {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || ui.loading}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#d7ece8] bg-white px-4 py-2 text-[11px] font-bold text-[#119a8a] transition hover:border-[#14b8a6] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {text(localizedText('السابق', 'Previous'))}
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || ui.loading}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#d7ece8] bg-white px-4 py-2 text-[11px] font-bold text-[#119a8a] transition hover:border-[#14b8a6] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {text(localizedText('التالي', 'Next'))}
              </button>
            </div>
          </div>
        )}
      </SectionCard>

      <AdminModal
        open={!!selectedDoctor}
        title={localizedText('ملف الطبيب الإداري', 'Administrative doctor profile')}
        description={selectedDoctor?.name || COPY.viewProfile}
        onClose={() => setSelectedDoctor(null)}
        size="xl"
      >
        {selectedDoctor && <DoctorActivityProfile doctor={selectedDoctor} lang={lang} onNavigate={navigateWithParams} />}
      </AdminModal>

      <AdminModal
        open={editor.open}
        title={COPY.editProfile}
        onClose={() => setEditor({ open: false, form: null })}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditor({ open: false, form: null })} className="rounded-xl border border-[#e4eeee] px-4 py-2 text-[12px] font-bold text-[#486466]">{text(COPY.cancel)}</button>
            <button type="button" onClick={saveDoctor} className="rounded-xl bg-[#14b8a6] px-4 py-2 text-[12px] font-bold text-white">{text(COPY.save)}</button>
          </div>
        }
      >
        {editor.form && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={localizedText('الاسم', 'Name')} value={editor.form.fullName} onChange={(value) => setEditor((current) => ({ ...current, form: { ...current.form, fullName: value } }))} />
            <Field label={COPY.phone} value={editor.form.phone} onChange={(value) => setEditor((current) => ({ ...current, form: { ...current.form, phone: value } }))} dir="ltr" />
            <Field label={COPY.license} value={editor.form.licenseNumber} onChange={(value) => setEditor((current) => ({ ...current, form: { ...current.form, licenseNumber: value } }))} dir="ltr" />
            <Field label={COPY.specialty} value={editor.form.specialty} onChange={(value) => setEditor((current) => ({ ...current, form: { ...current.form, specialty: value } }))} />
            <Field label={localizedText('سنوات الخبرة', 'Experience years')} value={editor.form.experienceYears} onChange={(value) => setEditor((current) => ({ ...current, form: { ...current.form, experienceYears: value } }))} type="number" />
            <Field label={localizedText('اللغات', 'Languages')} value={editor.form.languages} onChange={(value) => setEditor((current) => ({ ...current, form: { ...current.form, languages: value } }))} />
            <div className="sm:col-span-2">
              <Field label={localizedText('رابط الصورة', 'Image URL')} value={editor.form.profileImageUrl} onChange={(value) => setEditor((current) => ({ ...current, form: { ...current.form, profileImageUrl: value } }))} dir="ltr" />
            </div>
            <label className="sm:col-span-2 flex flex-col gap-1">
              <span className="text-[11px] font-extrabold text-[#486466]">{text(COPY.bio)}</span>
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
        onConfirm={(reason) => rejectDoctor(action?.doctor?.id, reason)}
      />
      <AdminActionDialog
        open={action?.type === 'archive'}
        title={COPY.archiveTitle}
        description={COPY.archiveDesc}
        confirmLabel={COPY.archive}
        requiresReason
        onClose={() => setAction(null)}
        onConfirm={archiveDoctor}
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

function Field({ label, value, onChange, type = 'text', dir }) {
  const { text } = useLocalizedContent();

  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-extrabold text-[#486466]">{text(label)}</span>
      <input
        type={type}
        value={value}
        dir={dir}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-xl border border-[#e4eeee] bg-white px-3 text-[12px] outline-none focus:border-[#14b8a6]"
      />
    </label>
  );
}

function DoctorActivityProfile({ doctor, lang, onNavigate }) {
  const { text } = useLocalizedContent();
  const counts = doctor.counts || {};
  const userId = doctor.user?.id || doctor.userId;

  const quickLinks = [
    userId && { label: localizedText('حساب المستخدم', 'User account'), Icon: Users, count: null, action: () => onNavigate('/admin/users', { userId }) },
    { label: localizedText('مواعيد الطبيب', 'Doctor appointments'), Icon: CalendarCheck, count: counts.appointments, action: () => onNavigate('/admin/appointments', { doctorId: doctor.id }) },
    { label: localizedText('مرضى الطبيب', 'Doctor patients'), Icon: Users, count: counts.patients, action: () => onNavigate('/admin/appointments', { doctorId: doctor.id }) },
    { label: localizedText('تقييمات الطبيب', 'Doctor reviews'), Icon: Star, count: counts.reviews, action: () => onNavigate('/admin/reviews', { doctorId: doctor.id }) },
    { label: localizedText('مقالات الطبيب', 'Doctor articles'), Icon: FileText, count: counts.articles, action: () => onNavigate('/admin/articles', { doctorId: doctor.id }) },
    { label: localizedText('بلاغات على الطبيب', 'Doctor reports'), Icon: Bell, count: counts.reports, action: () => onNavigate('/admin/reports', { entityType: 'doctor', entityId: doctor.id }) },
    { label: localizedText('سجل الأدمن للكيان', 'Entity admin log'), Icon: ShieldCheck, count: null, action: () => onNavigate('/admin/reports', { entityType: 'doctor', entityId: doctor.id }) },
  ].filter(Boolean);

  const countCards = [
    { label: localizedText('العيادات', 'Clinics'), value: counts.clinics, Icon: Building2 },
    { label: localizedText('المواعيد', 'Appointments'), value: counts.appointments, Icon: CalendarCheck },
    { label: localizedText('المرضى', 'Patients'), value: counts.patients, Icon: Users },
    { label: localizedText('الروشتات', 'Prescriptions'), value: counts.prescriptions, Icon: Pill },
    { label: localizedText('المقالات', 'Articles'), value: counts.articles, Icon: FileText },
    { label: localizedText('التقييمات', 'Reviews'), value: counts.reviews, Icon: Star },
    { label: localizedText('البلاغات', 'Reports'), value: counts.reports, Icon: Bell },
    { label: localizedText('المشاهدات', 'Views'), value: doctor.views, Icon: Eye },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#eef5f5] bg-[#f8fbfb] p-4">
          <div className="flex items-start gap-3">
            {doctor.profileImageUrl ? (
              <PreviewableImage
                src={doctor.profileImageUrl}
                alt={text(localizedText('الصورة الشخصية', 'Profile image'))}
                className="h-16 w-16 shrink-0 rounded-2xl border-4 border-white object-cover shadow-sm"
              />
            ) : (
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#e6f7f7] text-[#14b8a6]">
                <Stethoscope size={22} />
              </span>
            )}
            <div className="min-w-0">
              <div className="text-[14px] font-black text-[#084036]">{text(doctor.name)}</div>
              <div className="mt-1 text-[12px] font-bold text-[#486466]">{text(doctor.specialty)}</div>
              <div className="mt-2">
                <StatusPill meta={VERIFY_STATUS_META[doctor.status]} size="lg" />
              </div>
            </div>
          </div>
        </div>
        <DetailCard label={COPY.license} value={doctor.license} dir="ltr" />
        <DetailCard label={COPY.phone} value={doctor.phone} dir="ltr" />
        <DetailCard label={COPY.joined} value={formatDate(doctor.joined, lang)} />
        <DetailCard label={localizedText('سنوات الخبرة', 'Experience years')} value={formatLocalizedNumber(doctor.experienceYears || 0, lang)} />
        <DetailCard label={localizedText('اللغات', 'Languages')} value={doctor.languages || '—'} />
        <div className="lg:col-span-3 rounded-2xl border border-[#eef5f5] bg-[#f8fbfb] p-4">
          <div className="mb-1 text-[11px] font-extrabold text-[#486466]">{text(COPY.bio)}</div>
          <div className="text-[13px] leading-7 text-[#084036]">{doctor.bio || '—'}</div>
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
        <ActivityPanel title={localizedText('عيادات الطبيب', 'Doctor clinics')} Icon={Building2}>
          <MiniRecordList items={doctor.clinics} empty={localizedText('لا توجد عيادات مسجلة', 'No clinics found')}>
            {(item) => (
              <>
                <div className="font-extrabold text-[#084036]">{item.name || `#${item.id}`}</div>
                <div className="text-slate-500">{item.addressLine || '—'} · {item.phone || '—'}</div>
                <div className="text-slate-400">{item.cityAr || item.cityEn || item.governorateAr || item.governorateEn || '—'}</div>
              </>
            )}
          </MiniRecordList>
        </ActivityPanel>

        <ActivityPanel title={localizedText('آخر المرضى المرتبطين', 'Latest linked patients')} Icon={Users}>
          <MiniRecordList items={doctor.latestPatients} empty={localizedText('لا يوجد مرضى مرتبطون بعد', 'No linked patients yet')}>
            {(item) => (
              <>
                <div className="font-extrabold text-[#084036]">{item.patientName || item.patientEmail || item.patientUserId}</div>
                <div className="text-slate-500" dir="ltr">{item.contactPhone || '—'}</div>
                <div className="text-slate-400">{formatDate(item.lastAppointmentAt, lang)} · {item.lastStatus || '—'}</div>
              </>
            )}
          </MiniRecordList>
        </ActivityPanel>

        <ActivityPanel title={localizedText('آخر المواعيد', 'Latest appointments')} Icon={CalendarCheck}>
          <MiniRecordList items={doctor.latestAppointments} empty={localizedText('لا توجد مواعيد', 'No appointments')}>
            {(item) => (
              <>
                <div className="font-extrabold text-[#084036]">{item.patientName || item.contactName || `#${item.id}`}</div>
                <div className="text-slate-500">{item.clinicName || '—'} · {item.status || '—'}</div>
                <div className="text-slate-400">{formatDate(item.scheduledAt, lang)}</div>
              </>
            )}
          </MiniRecordList>
        </ActivityPanel>

        <ActivityPanel title={localizedText('آخر الروشتات', 'Latest prescriptions')} Icon={Pill}>
          <MiniRecordList items={doctor.latestPrescriptions} empty={localizedText('لا توجد روشتات', 'No prescriptions')}>
            {(item) => (
              <>
                <div className="font-extrabold text-[#084036]">{item.prescriptionNumber || `#${item.id}`}</div>
                <div className="text-slate-500">{item.patientName || '—'} · {item.status || '—'}</div>
                <div className="text-slate-400">{item.diagnosis || '—'}</div>
              </>
            )}
          </MiniRecordList>
        </ActivityPanel>

        <ActivityPanel title={localizedText('آخر المقالات', 'Latest articles')} Icon={FileText}>
          <MiniRecordList items={doctor.latestArticles} empty={localizedText('لا توجد مقالات', 'No articles')}>
            {(item) => (
              <>
                <div className="font-extrabold text-[#084036]">{item.title || `#${item.id}`}</div>
                <div className="text-slate-500">{item.status || '—'} · {item.moderationStatus || '—'}</div>
                <div className="text-slate-400">{formatDate(item.publishedAt || item.createdAt, lang)}</div>
              </>
            )}
          </MiniRecordList>
        </ActivityPanel>

        <ActivityPanel title={localizedText('التقييمات والبلاغات', 'Reviews and reports')} Icon={Bell}>
          <MiniRecordList items={[...(doctor.latestReviews || []), ...(doctor.latestReports || [])]} empty={localizedText('لا توجد تقييمات أو بلاغات', 'No reviews or reports')}>
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

      {(doctor.syndicateCardImageUrl || doctor.selfieWithCardUrl) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {doctor.syndicateCardImageUrl && (
            <VerificationImage title={localizedText('كارنيه النقابة', 'Syndicate card')} src={doctor.syndicateCardImageUrl} />
          )}
          {doctor.selfieWithCardUrl && (
            <VerificationImage title={localizedText('صورة سيلفي بالكارنيه', 'Selfie with card')} src={doctor.selfieWithCardUrl} />
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
