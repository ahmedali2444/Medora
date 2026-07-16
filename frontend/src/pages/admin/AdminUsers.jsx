import React, { useEffect, useState } from 'react';
import {
  Ban,
  Bell,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Download,
  Edit2,
  ExternalLink,
  Eye,
  FileText,
  Heart,
  Package,
  Pill,
  Plus,
  RefreshCw,
  ScanSearch as Search,
  ShieldOff,
  Stethoscope,
  Trash2,
  Users,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/layout/AdminLayout';
import SectionCard from '../../components/admin/shared/SectionCard';
import StatusPill from '../../components/admin/shared/StatusPill';
import DataTable from '../../components/admin/shared/DataTable';
import AdminModal from '../../components/admin/shared/AdminModal';
import AdminActionDialog from '../../components/admin/shared/AdminActionDialog';
import LinkedFilterPills from '../../components/admin/shared/LinkedFilterPills';
import { LINKED_FILTER_KEYS, readLinkedFilters } from '../../components/admin/shared/linkedFilterUtils';
import { VERIFY_STATUS_META, formatDate } from '../../components/admin/data/adminData';
import { useLocalizedContent } from '../../hooks/useLocalizedContent';
import { formatLocalizedNumber, localizedText } from '../../utils/localization';
import { medoraApi } from '../../api/medoraApi';
import { triggerBrowserDownload } from '../../utils/download';

const PAGE_SIZE = 20;
const STATUS_TABS = ['all', 'active', 'suspended', 'archived'];
const EMPTY_FORM = {
  id: '',
  email: '',
  password: '',
  fullName: '',
  phoneNumber: '',
  emailConfirmed: true,
  isActive: true,
  roles: ['patient'],
};

const COPY = {
  title: localizedText('المستخدمون', 'Users'),
  subtitle: localizedText('إدارة الحسابات والأدوار وحالة المستخدمين', 'Manage accounts, roles, and user status'),
  list: localizedText('قائمة المستخدمين', 'Users list'),
  add: localizedText('إضافة مستخدم', 'Add user'),
  edit: localizedText('تعديل مستخدم', 'Edit user'),
  exportCsv: localizedText('تصدير CSV', 'Export CSV'),
  refresh: localizedText('تحديث', 'Refresh'),
  search: localizedText('ابحث بالاسم، الإيميل، أو الهاتف...', 'Search by name, email, or phone...'),
  all: localizedText('الكل', 'All'),
  role: localizedText('الدور', 'Role'),
  user: localizedText('المستخدم', 'User'),
  phone: localizedText('الهاتف', 'Phone'),
  joined: localizedText('تاريخ الانضمام', 'Joined date'),
  status: localizedText('الحالة', 'Status'),
  actions: localizedText('إجراءات', 'Actions'),
  save: localizedText('حفظ', 'Save'),
  cancel: localizedText('إلغاء', 'Cancel'),
  email: localizedText('البريد الإلكتروني', 'Email'),
  password: localizedText('كلمة المرور', 'Password'),
  fullName: localizedText('الاسم الكامل', 'Full name'),
  active: localizedText('نشط', 'Active'),
  emailConfirmed: localizedText('البريد مؤكد', 'Email confirmed'),
  archive: localizedText('أرشفة', 'Archive'),
  activate: localizedText('تفعيل', 'Activate'),
  suspend: localizedText('تعليق', 'Suspend'),
  view: localizedText('عرض ملف المستخدم', 'View user profile'),
  bulkActivate: localizedText('تفعيل المحدد', 'Activate selected'),
  bulkSuspend: localizedText('تعليق المحدد', 'Suspend selected'),
  bulkArchive: localizedText('أرشفة المحدد', 'Archive selected'),
  selected: localizedText('محدد', 'selected'),
  userProfile: localizedText('ملف المستخدم الإداري', 'Administrative user profile'),
  revokeSessions: localizedText('إنهاء الجلسات النشطة', 'Revoke active sessions'),
  close: localizedText('إغلاق', 'Close'),
  empty: localizedText('لا يوجد مستخدمون بهذا الفلتر.', 'No users match this filter.'),
  confirmArchive: localizedText('أرشفة المستخدم؟', 'Archive this user?'),
  archiveDesc: localizedText('سيتم تعطيل الحساب وإخفاؤه من القوائم العامة مع الاحتفاظ بالسجلات التاريخية.', 'The account will be disabled and hidden while historical records remain.'),
};

const ROLE_LABELS = {
  admin: localizedText('أدمن', 'Admin'),
  patient: localizedText('مريض', 'Patient'),
  doctor: localizedText('طبيب', 'Doctor'),
  pharmacy: localizedText('صيدلية', 'Pharmacy'),
};

const STATUS_META = {
  ...VERIFY_STATUS_META,
  archived: { label: localizedText('مؤرشف', 'Archived'), color: '#64748b', bg: '#f1f5f9' },
};

function getInitial(params, key, fallback = '') {
  return params.get(key) || fallback;
}

function mapUser(user) {
  return {
    id: user.id,
    name: user.fullName || user.userName || user.email || '',
    email: user.email || '',
    phone: user.phoneNumber || '—',
    joined: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    deletedAt: user.deletedAt,
    status: user.isDeleted ? 'archived' : user.isActive ? 'active' : 'suspended',
    roles: Array.isArray(user.roles) ? user.roles.map((role) => String(role).toLowerCase()) : [],
    emailConfirmed: !!user.emailConfirmed,
    isActive: !!user.isActive,
  };
}

export default function AdminUsers() {
  const { lang, text } = useLocalizedContent();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(getInitial(searchParams, 'search'));
  const [status, setStatus] = useState(getInitial(searchParams, 'status', 'all'));
  const [role, setRole] = useState(getInitial(searchParams, 'role', 'all'));
  const [page, setPage] = useState(Number(getInitial(searchParams, 'page', '1')) || 1);
  const linkedFilters = React.useMemo(() => readLinkedFilters(searchParams), [searchParams]);
  const userId = searchParams.get('userId') || '';
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState([]);
  const [roles, setRoles] = useState(['admin', 'patient', 'doctor', 'pharmacy']);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);
  const [editor, setEditor] = useState({ open: false, mode: 'create', form: EMPTY_FORM });
  const [activity, setActivity] = useState({ open: false, user: null, data: null, loading: false, error: '' });
  const [dialog, setDialog] = useState(null);
  const [ui, setUi] = useState({ loading: true, saving: false, error: '', notice: '' });

  useEffect(() => {
    let mounted = true;
    medoraApi.adminRoles().then((data) => {
      if (mounted && Array.isArray(data) && data.length) setRoles(data.map((item) => String(item).toLowerCase()));
    }).catch((error) => {
      if (mounted) console.warn('Unable to load admin roles', error);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const next = { ...linkedFilters };
    if (query) next.search = query;
    if (status !== 'all') next.status = status;
    if (role !== 'all') next.role = role;
    if (page > 1) next.page = String(page);
    const nextParams = new URLSearchParams(next);
    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [linkedFilters, page, query, role, searchParams, setSearchParams, status]);

  useEffect(() => {
    let mounted = true;
    setUi((current) => ({ ...current, loading: true, error: '' }));
    medoraApi.adminUsers({
      page,
      pageSize: PAGE_SIZE,
      search: query,
      status: status === 'all' ? '' : status,
      role: role === 'all' ? '' : role,
      userId,
      includeArchived: status === 'archived',
    })
      .then((data) => {
        if (!mounted) return;
        setRows(Array.isArray(data?.items) ? data.items.map(mapUser) : []);
        setTotal(Number(data?.total || 0));
        setSelectedIds([]);
        setUi((current) => ({ ...current, loading: false, error: '' }));
      })
      .catch((error) => {
        if (!mounted) return;
        setRows([]);
        setTotal(0);
        setUi((current) => ({ ...current, loading: false, error: error.message || 'Unable to load users' }));
      });
    return () => { mounted = false; };
  }, [page, query, refreshKey, role, status, userId]);

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  const openCreate = () => setEditor({ open: true, mode: 'create', form: { ...EMPTY_FORM, roles: ['patient'] } });
  const openEdit = (user) => setEditor({
    open: true,
    mode: 'edit',
    form: {
      id: user.id,
      email: user.email,
      password: '',
      fullName: user.name,
      phoneNumber: user.phone === '—' ? '' : user.phone,
      emailConfirmed: user.emailConfirmed,
      isActive: user.status === 'active',
      roles: user.roles.length ? user.roles : ['patient'],
    },
  });
  const closeEditor = () => setEditor({ open: false, mode: 'create', form: EMPTY_FORM });

  const updateForm = (patch) => setEditor((current) => ({ ...current, form: { ...current.form, ...patch } }));

  const toggleRole = (roleName) => {
    const set = new Set(editor.form.roles);
    if (set.has(roleName)) set.delete(roleName);
    else set.add(roleName);
    updateForm({ roles: Array.from(set) });
  };

  const reload = () => {
    setRefreshKey((current) => current + 1);
  };

  const openActivity = async (user) => {
    setActivity({ open: true, user, data: null, loading: true, error: '' });
    try {
      const data = await medoraApi.adminUserActivity(user.id);
      setActivity({ open: true, user, data, loading: false, error: '' });
    } catch (error) {
      setActivity({ open: true, user, data: null, loading: false, error: error.message || 'Unable to load user activity' });
    }
  };

  const refreshActivity = async () => {
    if (!activity.user?.id) return;
    setActivity((current) => ({ ...current, loading: true, error: '' }));
    try {
      const data = await medoraApi.adminUserActivity(activity.user.id);
      setActivity((current) => ({ ...current, data, loading: false, error: '' }));
    } catch (error) {
      setActivity((current) => ({ ...current, loading: false, error: error.message || 'Unable to load user activity' }));
    }
  };

  const closeActivity = () => setActivity({ open: false, user: null, data: null, loading: false, error: '' });

  const clearLinkedFilters = () => {
    const next = new URLSearchParams(searchParams);
    LINKED_FILTER_KEYS.forEach((key) => next.delete(key));
    setPage(1);
    setSearchParams(next, { replace: true });
  };

  const navigateWithParams = (path, params) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') search.set(key, value);
    });
    navigate(`${path}?${search.toString()}`);
    closeActivity();
  };

  const revokeSessions = async () => {
    if (!activity.user?.id) return;
    setUi((current) => ({ ...current, saving: true, error: '' }));
    try {
      await medoraApi.adminRevokeUserSessions(activity.user.id);
      setUi((current) => ({ ...current, saving: false, notice: text(localizedText('تم إنهاء الجلسات النشطة', 'Active sessions revoked')) }));
      await refreshActivity();
    } catch (error) {
      setUi((current) => ({ ...current, saving: false, error: error.message || 'Unable to revoke sessions' }));
      setActivity((current) => ({ ...current, error: error.message || 'Unable to revoke sessions' }));
    }
  };

  const selectedRows = rows.filter((row) => selectedIds.map(String).includes(String(row.id)));

  const bulkUpdateStatus = async (isActive) => {
    const targets = selectedRows.filter((row) => row.status !== 'archived' && row.status !== (isActive ? 'active' : 'suspended'));
    if (!targets.length) return;
    setUi((current) => ({ ...current, saving: true, error: '' }));
    try {
      await Promise.all(targets.map((user) => medoraApi.adminUpdateUserStatus(user.id, { isActive })));
      setSelectedIds([]);
      reload();
      setUi((current) => ({
        ...current,
        saving: false,
        notice: text(isActive ? localizedText('تم تفعيل المستخدمين المحددين', 'Selected users activated') : localizedText('تم تعليق المستخدمين المحددين', 'Selected users suspended')),
      }));
    } catch (error) {
      setUi((current) => ({ ...current, saving: false, error: error.message || 'Unable to update selected users' }));
    }
  };

  const bulkArchive = async () => {
    const targets = selectedRows.filter((row) => row.status !== 'archived');
    if (!targets.length) return;
    setUi((current) => ({ ...current, saving: true, error: '' }));
    try {
      await Promise.all(targets.map((user) => medoraApi.adminDeleteUser(user.id)));
      setSelectedIds([]);
      reload();
      setUi((current) => ({ ...current, saving: false, notice: text(localizedText('تمت أرشفة المستخدمين المحددين', 'Selected users archived')) }));
    } catch (error) {
      setUi((current) => ({ ...current, saving: false, error: error.message || 'Unable to archive selected users' }));
    }
  };

  const saveUser = async () => {
    setUi((current) => ({ ...current, saving: true, error: '' }));
    try {
      const payload = {
        email: editor.form.email,
        fullName: editor.form.fullName,
        phoneNumber: editor.form.phoneNumber,
        emailConfirmed: editor.form.emailConfirmed,
        isActive: editor.form.isActive,
      };
      if (editor.mode === 'create') {
        await medoraApi.adminCreateUser({ ...payload, password: editor.form.password, roles: editor.form.roles });
      } else {
        await medoraApi.adminUpdateUser(editor.form.id, payload);
        await medoraApi.adminUpdateUserRoles(editor.form.id, { roles: editor.form.roles });
      }
      closeEditor();
      setUi((current) => ({ ...current, saving: false, notice: text(localizedText('تم حفظ المستخدم', 'User saved')) }));
      reload();
    } catch (error) {
      setUi((current) => ({ ...current, saving: false, error: error.message || 'Unable to save user' }));
    }
  };

  const setUserActive = async (user, isActive) => {
    setUi((current) => ({ ...current, saving: true, error: '' }));
    try {
      await medoraApi.adminUpdateUserStatus(user.id, { isActive });
      setRows((current) => current.map((item) => (item.id === user.id ? { ...item, status: isActive ? 'active' : 'suspended' } : item)));
      setUi((current) => ({ ...current, saving: false, notice: text(isActive ? localizedText('تم تفعيل المستخدم', 'User activated') : localizedText('تم تعليق المستخدم', 'User suspended')) }));
    } catch (error) {
      setUi((current) => ({ ...current, saving: false, error: error.message || 'Unable to update user status' }));
    }
  };

  const archiveUser = async () => {
    if (!dialog?.user) return;
    setUi((current) => ({ ...current, saving: true, error: '' }));
    try {
      await medoraApi.adminDeleteUser(dialog.user.id);
      setDialog(null);
      reload();
      setUi((current) => ({ ...current, saving: false, notice: text(localizedText('تمت أرشفة المستخدم', 'User archived')) }));
    } catch (error) {
      setUi((current) => ({ ...current, saving: false, error: error.message || 'Unable to archive user' }));
    }
  };

  const exportUsers = async () => {
    try {
      triggerBrowserDownload(await medoraApi.adminExportUsers());
    } catch (error) {
      setUi((current) => ({ ...current, error: error.message || 'Unable to export users' }));
    }
  };

  const columns = [
    {
      key: 'name',
      label: COPY.user,
      width: '1.5fr',
      render: (row) => (
        <div className="w-full text-start">
          <div className="text-[12px] font-extrabold text-[#084036]">{row.name || '—'}</div>
          <div
            className={`w-full text-[10px] text-slate-500 ${lang === 'ar' ? 'text-right' : 'text-left'}`}
            dir="ltr"
          >
            {row.email}
          </div>
        </div>
      ),
    },
    { key: 'phone', label: COPY.phone, width: '0.9fr', align: 'center', render: (row) => <span dir="ltr">{row.phone}</span> },
    {
      key: 'roles',
      label: COPY.role,
      width: '1fr',
      align: 'center',
      render: (row) => (
        <div className="flex flex-wrap justify-center gap-1">
          {row.roles.map((item) => (
            <span key={item} className="rounded-full bg-[#eef4ff] px-2 py-0.5 text-[10px] font-bold text-[#2465b6]">
              {text(ROLE_LABELS[item] || item)}
            </span>
          ))}
        </div>
      ),
    },
    { key: 'joined', label: COPY.joined, width: '0.8fr', align: 'center', render: (row) => <span>{formatDate(row.joined, lang)}</span> },
    { key: 'status', label: COPY.status, width: '0.8fr', align: 'center', render: (row) => <StatusPill meta={STATUS_META[row.status]} /> },
    {
      key: 'actions',
      label: COPY.actions,
      width: '1fr',
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <button type="button" onClick={() => openActivity(row)} className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#e4eeee] text-[#0e7c6e]" title={text(COPY.view)}>
            <Eye size={12} />
          </button>
          <button type="button" onClick={() => openEdit(row)} className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#e4eeee] text-[#2465b6]" title={text(COPY.edit)}>
            <Edit2 size={12} />
          </button>
          {row.status !== 'archived' && row.status !== 'active' && (
            <button type="button" onClick={() => setUserActive(row, true)} className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#e4eeee] text-[#0e7c6e]" title={text(COPY.activate)}>
              <CheckCircle2 size={12} />
            </button>
          )}
          {row.status === 'active' && (
            <button type="button" onClick={() => setUserActive(row, false)} className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#e4eeee] text-[#a35a00]" title={text(COPY.suspend)}>
              <Ban size={12} />
            </button>
          )}
          {row.status !== 'archived' && (
            <button type="button" onClick={() => setDialog({ type: 'archive', user: row })} className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#e4eeee] text-[#c2362f]" title={text(COPY.archive)}>
              <Trash2 size={12} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminLayout title={COPY.title} subtitle={COPY.subtitle}>
      <SectionCard
        title={COPY.list}
        description={`${formatLocalizedNumber(total, lang)} ${text(localizedText('مستخدم', 'users'))}`}
        icon={Users}
        action={
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={exportUsers} className="inline-flex items-center gap-1.5 rounded-xl border border-[#d7ece8] bg-white px-3 py-2 text-[12px] font-bold text-[#119a8a]">
              <Download size={13} /> {text(COPY.exportCsv)}
            </button>
            <button type="button" onClick={openCreate} className="inline-flex items-center gap-1.5 rounded-xl bg-[#14b8a6] px-3 py-2 text-[12px] font-bold text-white">
              <Plus size={13} /> {text(COPY.add)}
            </button>
          </div>
        }
      >
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto_auto_auto] lg:items-center">
          <div className="relative">
            <input value={query} onChange={(e) => { setPage(1); setQuery(e.target.value); }} placeholder={text(COPY.search)} className="h-10 w-full rounded-xl border border-[#e4eeee] bg-white px-9 text-[12px] outline-none focus:border-[#14b8a6]" />
            <Search size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#14b8a6]" />
          </div>
          <select value={role} onChange={(e) => { setPage(1); setRole(e.target.value); }} className="h-10 rounded-xl border border-[#e4eeee] bg-white px-3 text-[12px] font-bold text-[#486466] outline-none">
            <option value="all">{text(localizedText('كل الأدوار', 'All roles'))}</option>
            {roles.map((item) => <option key={item} value={item}>{text(ROLE_LABELS[item] || item)}</option>)}
          </select>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_TABS.map((item) => (
              <button key={item} type="button" onClick={() => { setPage(1); setStatus(item); }} className="rounded-xl border px-3 py-2 text-[11px] font-bold" style={status === item ? { background: '#14b8a6', borderColor: '#14b8a6', color: '#fff' } : { background: '#fff', borderColor: '#e4eeee', color: '#486466' }}>
                {item === 'all' ? text(COPY.all) : text(STATUS_META[item]?.label)}
              </button>
            ))}
          </div>
          <button type="button" onClick={reload} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#d7ece8] bg-white px-3 text-[12px] font-bold text-[#119a8a]">
            <RefreshCw size={13} /> {text(COPY.refresh)}
          </button>
        </div>

        <LinkedFilterPills filters={linkedFilters} onClear={clearLinkedFilters} />

        {selectedRows.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#d7ece8] bg-[#f7fbfb] px-3 py-3">
            <div className="text-[12px] font-extrabold text-[#084036]">
              {formatLocalizedNumber(selectedRows.length, lang)} {text(COPY.selected)}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={ui.saving} onClick={() => bulkUpdateStatus(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-[11px] font-bold text-emerald-700 disabled:opacity-60">
                <CheckCircle2 size={13} /> {text(COPY.bulkActivate)}
              </button>
              <button type="button" disabled={ui.saving} onClick={() => bulkUpdateStatus(false)} className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-white px-3 py-2 text-[11px] font-bold text-amber-700 disabled:opacity-60">
                <Ban size={13} /> {text(COPY.bulkSuspend)}
              </button>
              <button type="button" disabled={ui.saving} onClick={bulkArchive} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-[11px] font-bold text-red-700 disabled:opacity-60">
                <Trash2 size={13} /> {text(COPY.bulkArchive)}
              </button>
            </div>
          </div>
        )}

        <DataTable
          columns={columns}
          rows={rows}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          loading={ui.loading}
          error={ui.error}
          empty={text(COPY.empty)}
          pagination={{ page, totalPages, onPageChange: setPage }}
        />
        {ui.notice && <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">{ui.notice}</div>}
      </SectionCard>

      <AdminModal
        open={editor.open}
        title={editor.mode === 'create' ? COPY.add : COPY.edit}
        onClose={closeEditor}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeEditor} disabled={ui.saving} className="rounded-xl border border-[#e4eeee] bg-white px-4 py-2 text-[12px] font-bold text-[#486466]">{text(COPY.cancel)}</button>
            <button type="button" onClick={saveUser} disabled={ui.saving || !editor.form.email || (editor.mode === 'create' && !editor.form.password) || editor.form.roles.length === 0} className="rounded-xl bg-[#14b8a6] px-4 py-2 text-[12px] font-bold text-white disabled:opacity-60">{text(COPY.save)}</button>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={COPY.email} value={editor.form.email} onChange={(value) => updateForm({ email: value })} dir="ltr" />
          {editor.mode === 'create' && <Field label={COPY.password} value={editor.form.password} onChange={(value) => updateForm({ password: value })} type="password" dir="ltr" />}
          <Field label={COPY.fullName} value={editor.form.fullName} onChange={(value) => updateForm({ fullName: value })} />
          <Field label={COPY.phone} value={editor.form.phoneNumber} onChange={(value) => updateForm({ phoneNumber: value })} dir="ltr" />
          <Toggle label={COPY.active} checked={editor.form.isActive} onChange={() => updateForm({ isActive: !editor.form.isActive })} />
          <Toggle label={COPY.emailConfirmed} checked={editor.form.emailConfirmed} onChange={() => updateForm({ emailConfirmed: !editor.form.emailConfirmed })} />
          <div className="sm:col-span-2">
            <div className="mb-2 text-[11px] font-extrabold text-[#486466]">{text(COPY.role)}</div>
            <div className="grid gap-2 sm:grid-cols-4">
              {roles.map((item) => (
                <label key={item} className="flex items-center justify-between gap-2 rounded-xl border border-[#e4eeee] bg-[#f8fbfb] px-3 py-2 text-[12px] font-bold text-[#084036]">
                  <input type="checkbox" checked={editor.form.roles.includes(item)} onChange={() => toggleRole(item)} />
                  <span>{text(ROLE_LABELS[item] || item)}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </AdminModal>

      <AdminModal
        open={activity.open}
        title={COPY.userProfile}
        description={activity.user?.email || activity.user?.name}
        onClose={closeActivity}
        size="xl"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={revokeSessions} disabled={ui.saving || activity.loading} className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-white px-4 py-2 text-[12px] font-bold text-amber-700 disabled:opacity-60">
              <ShieldOff size={14} /> {text(COPY.revokeSessions)}
            </button>
            <button type="button" onClick={closeActivity} className="rounded-xl border border-[#e4eeee] bg-white px-4 py-2 text-[12px] font-bold text-[#486466]">{text(COPY.close)}</button>
          </div>
        }
      >
        <UserActivityContent
          state={activity}
          lang={lang}
          onNavigate={navigateWithParams}
        />
      </AdminModal>

      <AdminActionDialog
        open={dialog?.type === 'archive'}
        title={COPY.confirmArchive}
        description={COPY.archiveDesc}
        confirmLabel={COPY.archive}
        loading={ui.saving}
        onClose={() => setDialog(null)}
        onConfirm={archiveUser}
      />
    </AdminLayout>
  );
}

function Field({ label, value, onChange, type = 'text', dir }) {
  const { text } = useLocalizedContent();
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-extrabold text-[#486466]">{text(label)}</span>
      <input type={type} value={value} dir={dir} onChange={(e) => onChange(e.target.value)} className="h-11 rounded-xl border border-[#e4eeee] bg-white px-3 text-[12px] outline-none focus:border-[#14b8a6]" />
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  const { text } = useLocalizedContent();
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-[#e4eeee] bg-[#f8fbfb] px-3 py-3">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="text-[12px] font-bold text-[#084036]">{text(label)}</span>
    </label>
  );
}

function UserActivityContent({ state, lang, onNavigate }) {
  const { text } = useLocalizedContent();
  const data = state.data;

  if (state.loading && !data) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#14b8a6] border-t-transparent" />
        <div className="text-[12px] font-bold text-[#486466]">{text(localizedText('جارٍ تحميل ملف المستخدم...', 'Loading user profile...'))}</div>
      </div>
    );
  }

  if (state.error && !data) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-bold text-amber-700">
        {state.error}
      </div>
    );
  }

  const user = data?.user || state.user || {};
  const counts = data?.counts || {};
  const doctorProfile = data?.doctorProfile;
  const pharmacyProfile = data?.pharmacyProfile;
  const roles = Array.isArray(user.roles) ? user.roles.map((role) => String(role).toLowerCase()) : [];
  const jumpTo = (id) => document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'smooth' });

  const quickLinks = [
    { label: localizedText('طلبات المستخدم', 'User orders'), Icon: Package, count: counts.orders, action: () => onNavigate('/admin/orders', { userId: user.id }) },
    { label: localizedText('مواعيده', 'Appointments'), Icon: CalendarCheck, count: counts.appointments, action: () => onNavigate('/admin/appointments', { userId: user.id }) },
    { label: localizedText('تقييماته', 'Reviews'), Icon: FileText, count: counts.reviews, action: () => onNavigate('/admin/reviews', { userId: user.id }) },
    { label: localizedText('بلاغاته', 'Reports'), Icon: Bell, count: counts.reports, action: () => onNavigate('/admin/reports', { userId: user.id }) },
    doctorProfile && { label: localizedText('ملف الطبيب', 'Doctor profile'), Icon: Stethoscope, count: doctorProfile.id, action: () => onNavigate('/admin/doctors', { userId: user.id }) },
    doctorProfile && { label: localizedText('مقالات الطبيب', 'Doctor articles'), Icon: FileText, count: counts.doctorArticles, action: () => onNavigate('/admin/articles', { doctorId: doctorProfile.id }) },
    doctorProfile && { label: localizedText('عيادات الطبيب', 'Doctor clinics'), Icon: Building2, count: counts.doctorClinics, action: () => jumpTo('activity-doctor-clinics') },
    pharmacyProfile && { label: localizedText('ملف الصيدلية', 'Pharmacy profile'), Icon: Building2, count: pharmacyProfile.id, action: () => onNavigate('/admin/pharmacies', { userId: user.id }) },
    pharmacyProfile && { label: localizedText('طلبات الصيدلية', 'Pharmacy orders'), Icon: Package, count: null, action: () => onNavigate('/admin/orders', { pharmacyId: pharmacyProfile.id }) },
  ].filter(Boolean);

  const countCards = [
    { label: localizedText('الطلبات', 'Orders'), value: counts.orders, Icon: Package },
    { label: localizedText('المواعيد', 'Appointments'), value: counts.appointments, Icon: CalendarCheck },
    { label: localizedText('الروشتات', 'Prescriptions'), value: counts.prescriptions, Icon: Pill },
    { label: localizedText('التقييمات', 'Reviews'), value: counts.reviews, Icon: FileText },
    { label: localizedText('البلاغات', 'Reports'), value: counts.reports, Icon: Bell },
    { label: localizedText('الجلسات النشطة', 'Active sessions'), value: counts.activeSessions, Icon: Clock },
    { label: localizedText('الإشعارات', 'Notifications'), value: counts.notifications, Icon: Bell },
    { label: localizedText('المفضلة', 'Favorites'), value: (counts.favoriteDoctors || 0) + (counts.favoritePharmacies || 0), Icon: Heart },
  ];

  return (
    <div className="space-y-4">
      {state.error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-bold text-amber-700">
          {state.error}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        <InfoPanel
          title={localizedText('بيانات الحساب', 'Account details')}
          items={[
            [localizedText('الاسم', 'Name'), user.fullName || user.userName || user.email],
            [localizedText('البريد', 'Email'), user.email],
            [localizedText('الهاتف', 'Phone'), user.phoneNumber],
            [localizedText('الحالة', 'Status'), user.isDeleted ? text(localizedText('مؤرشف', 'Archived')) : user.isActive ? text(localizedText('نشط', 'Active')) : text(localizedText('معلق', 'Suspended'))],
            [localizedText('تأكيد البريد', 'Email confirmed'), user.emailConfirmed ? text(localizedText('مؤكد', 'Confirmed')) : text(localizedText('غير مؤكد', 'Unconfirmed'))],
            [localizedText('تاريخ الانضمام', 'Joined'), formatDate(user.createdAt, lang)],
            [localizedText('آخر دخول', 'Last login'), formatDate(user.lastLoginAt, lang)],
          ]}
        />
        <InfoPanel
          title={localizedText('الأدوار', 'Roles')}
          custom={
            <div className="flex flex-wrap gap-1.5">
              {roles.length ? roles.map((role) => (
                <span key={role} className="rounded-full bg-[#eef4ff] px-2 py-1 text-[10px] font-bold text-[#2465b6]">
                  {text(ROLE_LABELS[role] || role)}
                </span>
              )) : <span className="text-[12px] text-slate-500">—</span>}
            </div>
          }
        />
        <InfoPanel
          title={localizedText('الملفات المهنية', 'Professional profiles')}
          items={[
            [localizedText('ملف الطبيب', 'Doctor profile'), doctorProfile ? `${doctorProfile.fullName || '—'} #${doctorProfile.id}` : '—'],
            [localizedText('تخصص الطبيب', 'Doctor specialty'), doctorProfile?.specialtyNameAr || doctorProfile?.specialtyNameEn],
            [localizedText('حالة تحقق الطبيب', 'Doctor verification'), doctorProfile?.verificationStatus],
            [localizedText('ملف الصيدلية', 'Pharmacy profile'), pharmacyProfile ? `${pharmacyProfile.pharmacyName || '—'} #${pharmacyProfile.id}` : '—'],
            [localizedText('مدينة الصيدلية', 'Pharmacy city'), pharmacyProfile?.cityAr || pharmacyProfile?.cityEn],
            [localizedText('حالة تحقق الصيدلية', 'Pharmacy verification'), pharmacyProfile?.verificationStatus],
          ]}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map(({ label, Icon, count, action }) => (
          <button
            key={text(label)}
            type="button"
            onClick={action}
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
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {countCards.map(({ label, value, Icon }) => (
          <div key={text(label)} className="rounded-2xl border border-[#e4eeee] bg-[#fbfefe] px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-[#486466]">{text(label)}</span>
              {React.createElement(Icon, { size: 14, className: 'text-[#14b8a6]' })}
            </div>
            <div className="mt-2 text-[20px] font-black text-[#084036]">{formatLocalizedNumber(value || 0, lang)}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ActivitySection title={localizedText('آخر الطلبات', 'Latest orders')} Icon={Package}>
          <RecordList items={data?.latestOrders} empty={localizedText('لا توجد طلبات', 'No orders')}>
            {(item) => (
              <>
                <div className="font-extrabold text-[#084036]">{item.orderNumber || `#${item.id}`}</div>
                <div className="text-slate-500">{item.pharmacy || '—'} · {item.status || '—'} · {formatDate(item.createdAt, lang)}</div>
              </>
            )}
          </RecordList>
        </ActivitySection>

        <ActivitySection title={localizedText('آخر المواعيد', 'Latest appointments')} Icon={CalendarCheck}>
          <RecordList items={data?.latestAppointments} empty={localizedText('لا توجد مواعيد', 'No appointments')}>
            {(item) => (
              <>
                <div className="font-extrabold text-[#084036]">{item.doctorName || item.patientName || `#${item.id}`}</div>
                <div className="text-slate-500">{item.clinicName || '—'} · {item.status || '—'} · {formatDate(item.scheduledAt, lang)}</div>
              </>
            )}
          </RecordList>
        </ActivitySection>

        <ActivitySection title={localizedText('الروشتات', 'Prescriptions')} Icon={Pill}>
          <RecordList items={data?.latestPrescriptions} empty={localizedText('لا توجد روشتات', 'No prescriptions')}>
            {(item) => (
              <>
                <div className="font-extrabold text-[#084036]">{item.prescriptionNumber || `#${item.id}`}</div>
                <div className="text-slate-500">{item.doctorName || '—'} · {item.pharmacyName || '—'} · {item.status || '—'}</div>
              </>
            )}
          </RecordList>
        </ActivitySection>

        <ActivitySection title={localizedText('التقييمات والبلاغات', 'Reviews and reports')} Icon={FileText}>
          <RecordList items={[...(data?.latestReviews || []), ...(data?.latestReports || [])]} empty={localizedText('لا توجد تقييمات أو بلاغات', 'No reviews or reports')}>
            {(item) => (
              <>
                <div className="font-extrabold text-[#084036]">{item.reason || item.comment || item.targetType || `#${item.id}`}</div>
                <div className="text-slate-500">{item.status || item.rating ? `${item.status || `${item.rating}/5`}` : '—'} · {formatDate(item.createdAt, lang)}</div>
              </>
            )}
          </RecordList>
        </ActivitySection>

        <ActivitySection title={localizedText('الجلسات', 'Sessions')} Icon={Clock}>
          <RecordList items={data?.sessions} empty={localizedText('لا توجد جلسات', 'No sessions')}>
            {(item) => (
              <>
                <div className="font-extrabold text-[#084036]">{item.ipAddress || '—'} {item.isActive ? text(localizedText('(نشطة)', '(active)')) : ''}</div>
                <div className="truncate text-slate-500" title={item.userAgent || ''}>{item.userAgent || '—'} · {formatDate(item.createdAt, lang)}</div>
              </>
            )}
          </RecordList>
        </ActivitySection>

        <ActivitySection title={localizedText('الإشعارات الأخيرة', 'Recent notifications')} Icon={Bell}>
          <RecordList items={data?.notifications} empty={localizedText('لا توجد إشعارات', 'No notifications')}>
            {(item) => (
              <>
                <div className="font-extrabold text-[#084036]">{item.title || '—'} {!item.isRead ? text(localizedText('(غير مقروء)', '(unread)')) : ''}</div>
                <div className="text-slate-500">{item.body || item.type || '—'} · {formatDate(item.createdAt, lang)}</div>
              </>
            )}
          </RecordList>
        </ActivitySection>

        <ActivitySection title={localizedText('المفضلة', 'Favorites')} Icon={Heart}>
          <RecordList items={[...(data?.favoriteDoctors || []), ...(data?.favoritePharmacies || [])]} empty={localizedText('لا توجد عناصر مفضلة', 'No favorites')}>
            {(item) => (
              <>
                <div className="font-extrabold text-[#084036]">{item.doctorName || item.pharmacyName || `#${item.id}`}</div>
                <div className="text-slate-500">{item.specialtyNameAr || item.cityAr || item.specialtyNameEn || item.cityEn || '—'} · {formatDate(item.createdAt, lang)}</div>
              </>
            )}
          </RecordList>
        </ActivitySection>

        <ActivitySection title={localizedText('المشاهدات الأخيرة', 'Recently viewed')} Icon={Eye}>
          <RecordList items={data?.recentlyViewed} empty={localizedText('لا توجد مشاهدات حديثة', 'No recent views')}>
            {(item) => (
              <>
                <div className="font-extrabold text-[#084036]">{item.targetType || '—'} #{item.targetId}</div>
                <div className="text-slate-500">{formatDate(item.viewedAt, lang)}</div>
              </>
            )}
          </RecordList>
        </ActivitySection>

        {doctorProfile && (
          <ActivitySection id="activity-doctor-clinics" title={localizedText('عيادات الطبيب', 'Doctor clinics')} Icon={Building2}>
            <RecordList items={data?.doctorClinics} empty={localizedText('لا توجد عيادات', 'No clinics')}>
              {(item) => (
                <>
                  <div className="font-extrabold text-[#084036]">{item.name || `#${item.id}`}</div>
                  <div className="text-slate-500">{item.governorateAr || item.governorateEn || '—'} · {item.cityAr || item.cityEn || '—'} · {item.isActive ? text(localizedText('نشطة', 'Active')) : text(localizedText('غير نشطة', 'Inactive'))}</div>
                </>
              )}
            </RecordList>
          </ActivitySection>
        )}

        {doctorProfile && (
          <ActivitySection title={localizedText('مقالات الطبيب', 'Doctor articles')} Icon={FileText}>
            <RecordList items={data?.doctorArticles} empty={localizedText('لا توجد مقالات', 'No articles')}>
              {(item) => (
                <>
                  <div className="font-extrabold text-[#084036]">{item.title || `#${item.id}`}</div>
                  <div className="text-slate-500">{item.status || '—'} · {item.moderationStatus || '—'} · {formatLocalizedNumber(item.viewCount || 0, lang)} {text(localizedText('مشاهدة', 'views'))}</div>
                </>
              )}
            </RecordList>
          </ActivitySection>
        )}
      </div>
    </div>
  );
}

function InfoPanel({ title, items, custom }) {
  const { text } = useLocalizedContent();
  return (
    <div className="rounded-2xl border border-[#e4eeee] bg-[#fbfefe] px-4 py-4">
      <div className="mb-3 text-[13px] font-black text-[#084036]">{text(title)}</div>
      {custom || (
        <div className="space-y-2">
          {items.map(([label, value]) => (
            <div key={text(label)} className="flex items-start justify-between gap-3 border-b border-[#eef5f5] pb-2 last:border-b-0 last:pb-0">
              <span className="shrink-0 text-[11px] font-bold text-[#486466]">{text(label)}</span>
              <span className="min-w-0 break-words text-end text-[11px] font-semibold text-[#084036]" dir="auto">{value || '—'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivitySection({ id, title, Icon, children }) {
  const { text } = useLocalizedContent();
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-[#e4eeee] bg-white">
      <header className="flex items-center gap-2 border-b border-[#f1f7f7] px-3 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#e6f7f7] text-[#14b8a6]">
          {React.createElement(Icon, { size: 15 })}
        </span>
        <h4 className="text-[13px] font-black text-[#084036]">{text(title)}</h4>
      </header>
      <div className="px-3 py-3">{children}</div>
    </section>
  );
}

function RecordList({ items, empty, children }) {
  const { text } = useLocalizedContent();
  const list = Array.isArray(items) ? items : [];
  if (!list.length) {
    return <div className="rounded-xl bg-[#f8fbfb] px-3 py-3 text-center text-[11px] font-bold text-slate-500">{text(empty)}</div>;
  }

  return (
    <div className="space-y-2">
      {list.map((item, index) => (
        <div key={item.id || `${item.targetType || 'item'}-${index}`} className="rounded-xl border border-[#eef5f5] bg-[#fbfefe] px-3 py-2 text-[11px] leading-5">
          {children(item)}
        </div>
      ))}
    </div>
  );
}
