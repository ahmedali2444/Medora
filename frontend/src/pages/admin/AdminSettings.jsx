import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Globe,
  LoaderCircle,
  Mail,
  Save,
  Shield,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { medoraApi } from '../../api/medoraApi';
import AdminLayout from '../../components/admin/layout/AdminLayout';
import SectionCard from '../../components/admin/shared/SectionCard';
import ToggleSwitch from '../../components/ToggleSwitch';
import { useLocalizedContent } from '../../hooks/useLocalizedContent';
import { localizedText } from '../../utils/localization';

const COPY = {
  title: localizedText('إعدادات المنصة', 'Platform settings'),
  subtitle: localizedText('الإعدادات العامة لميدورا وسياسات العمولات', 'General Medora settings and commission policies'),
  saved: localizedText('تم حفظ الإعدادات بنجاح ✓', 'Settings saved successfully ✓'),
  saveFailed: localizedText('تعذر حفظ الإعدادات. حاول مرة أخرى.', 'Failed to save settings. Please try again.'),
  loadFailed: localizedText('تعذر تحميل الإعدادات الحالية.', 'Failed to load current settings.'),
  loading: localizedText('جارٍ تحميل الإعدادات...', 'Loading settings...'),
  saving: localizedText('جارٍ الحفظ...', 'Saving...'),
  cancel: localizedText('إلغاء', 'Cancel'),
  save: localizedText('حفظ الإعدادات', 'Save settings'),
  tabs: {
    general: localizedText('عام', 'General'),
    security: localizedText('الأمان', 'Security'),
    billing: localizedText('العمولات', 'Billing'),
    email: localizedText('البريد والإشعارات', 'Email & notifications'),
    features: localizedText('الميزات', 'Features'),
  },
  generalTitle: localizedText('الإعدادات العامة', 'General settings'),
  generalDesc: localizedText('معلومات الهوية والتواصل', 'Identity and contact information'),
  platformName: localizedText('اسم المنصة', 'Platform name'),
  tagline: localizedText('الشعار الفرعي', 'Tagline'),
  supportEmail: localizedText('بريد الدعم', 'Support email'),
  supportPhone: localizedText('هاتف الدعم', 'Support phone'),
  about: localizedText('نبذة عن المنصة', 'About the platform'),
  securityTitle: localizedText('الأمان والسياسات', 'Security & policies'),
  securityDesc: localizedText('سياسات الحماية للحسابات الإدارية', 'Protection policies for admin accounts'),
  billingTitle: localizedText('العمولات والتسعير', 'Billing & pricing'),
  billingDesc: localizedText('نسب العمولات ورسوم التوصيل', 'Commission rates and delivery fees'),
  emailTitle: localizedText('البريد والإشعارات', 'Email & notifications'),
  emailDesc: localizedText('تحكّم كامل في أنواع الرسائل المرسلة', 'Full control over outgoing message types'),
  featuresTitle: localizedText('ميزات المنصة', 'Platform features'),
  featuresDesc: localizedText('فعّل أو أوقف وحدات كاملة من المنصة', 'Enable or disable full platform modules'),
  doctorCommission: localizedText('عمولة الأطباء (%)', 'Doctors commission (%)'),
  pharmacyCommission: localizedText('عمولة الصيدليات (%)', 'Pharmacies commission (%)'),
  deliveryFee: localizedText('رسوم التوصيل (ج.م)', 'Delivery fee (EGP)'),
  currency: localizedText('العملة', 'Currency'),
  taxRate: localizedText('نسبة الضريبة (%)', 'Tax rate (%)'),
};

const TABS = [
  { id: 'general', label: COPY.tabs.general, Icon: Globe },
  { id: 'security', label: COPY.tabs.security, Icon: Shield },
  { id: 'billing', label: COPY.tabs.billing, Icon: Wallet },
  { id: 'email', label: COPY.tabs.email, Icon: Mail },
  { id: 'features', label: COPY.tabs.features, Icon: Sparkles },
];

const DEFAULT_SETTINGS = {
  general: {
    platformName: 'Medora',
    tagline: 'منصتك الطبية الشاملة',
    supportEmail: 'support@medora.com',
    supportPhone: '+20 19011',
    about: 'ميدورا منصة طبية متكاملة تجمع المرضى بالأطباء والصيدليات في مكان واحد.',
  },
  security: {
    require2Fa: true,
    requireStrongPasswords: true,
    restrictAdminIp: false,
  },
  billing: {
    doctorCommission: 10,
    pharmacyCommission: 7,
    deliveryFee: 15,
    currency: 'EGP',
    taxRate: 14,
  },
  email: {
    welcome: true,
    orderUpdates: true,
    weeklyDigest: true,
    marketing: false,
    criticalAlerts: true,
  },
  features: {
    ai: true,
    delivery: true,
    videoConsult: true,
    reviews: true,
    articles: true,
  },
};

function normalizeSettings(value) {
  return {
    general: { ...DEFAULT_SETTINGS.general, ...(value?.general || {}) },
    security: { ...DEFAULT_SETTINGS.security, ...(value?.security || {}) },
    billing: {
      ...DEFAULT_SETTINGS.billing,
      ...(value?.billing || {}),
    },
    email: { ...DEFAULT_SETTINGS.email, ...(value?.email || {}) },
    features: { ...DEFAULT_SETTINGS.features, ...(value?.features || {}) },
  };
}

export default function AdminSettings() {
  const { text } = useLocalizedContent();
  const [tab, setTab] = useState('general');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [draft, setDraft] = useState(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(settings), [draft, settings]);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      setLoading(true);
      setError('');

      try {
        const response = normalizeSettings(await medoraApi.adminSettings());
        if (cancelled) {
          return;
        }

        setSettings(response);
        setDraft(response);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.message || text(COPY.loadFailed));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isDirty) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const updateSection = (section, valueOrUpdater) => {
    setSaved(false);
    setDraft((current) => {
      const currentSection = current[section];
      const nextSection =
        typeof valueOrUpdater === 'function'
          ? valueOrUpdater(currentSection)
          : { ...currentSection, ...valueOrUpdater };

      return { ...current, [section]: nextSection };
    });
  };

  const resetSection = (section) => {
    setDraft((current) => ({
      ...current,
      [section]: { ...settings[section] },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const response = normalizeSettings(await medoraApi.adminUpdateSettings(draft));
      setSettings(response);
      setDraft(response);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      return true;
    } catch (saveError) {
      setError(saveError?.message || text(COPY.saveFailed));
      return false;
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      title={COPY.title}
      subtitle={COPY.subtitle}
      navigationGuard={{
        when: isDirty && !loading,
        onSave: handleSave,
        onDiscard: () => setDraft(settings),
      }}
    >
      {saved && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-[#c8ebe6] bg-[#e6f7f7] px-4 py-3 text-[13px] font-extrabold text-[#0e7c6e]">
          <CheckCircle2 size={16} />
          {text(COPY.saved)}
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-[#f4d0d0] bg-[#fff4f4] px-4 py-3 text-[13px] font-bold text-[#9f2d2d]">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
        <nav className="grid grid-cols-2 gap-2 overflow-hidden rounded-2xl border border-[#e4eeee] bg-white p-2 shadow-[0_8px_22px_rgba(41,93,96,0.06)] sm:grid-cols-3 lg:flex lg:flex-col lg:p-3">
          {TABS.map((tabItem) => {
            const TabIcon = tabItem.Icon;
            const active = tab === tabItem.id;

            return (
              <button
                key={tabItem.id}
                type="button"
                onClick={() => setTab(tabItem.id)}
                className="flex min-w-0 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-bold transition lg:justify-start"
                style={
                  active
                    ? { background: '#14b8a6', color: '#ffffff', boxShadow: '0 10px 22px rgba(20,184,166,0.25)' }
                    : { background: 'transparent', color: '#486466' }
                }
              >
                <TabIcon size={13} />
                <span className="min-w-0 truncate">{text(tabItem.label)}</span>
              </button>
            );
          })}
        </nav>

        <div>
          {loading ? (
            <SectionCard title={COPY.title} description={COPY.loading} icon={LoaderCircle}>
              <div className="flex items-center gap-2 text-[13px] font-bold text-[#486466]">
                <LoaderCircle size={16} className="animate-spin" />
                {text(COPY.loading)}
              </div>
            </SectionCard>
          ) : (
            <>
              {tab === 'general' && (
                <GeneralSection
                  form={draft.general}
                  onChange={(value) => updateSection('general', value)}
                  onSave={handleSave}
                  onCancel={() => resetSection('general')}
                  saving={saving}
                />
              )}
              {tab === 'security' && (
                <SecuritySection
                  values={draft.security}
                  onChange={(value) => updateSection('security', value)}
                  onSave={handleSave}
                  onCancel={() => resetSection('security')}
                  saving={saving}
                />
              )}
              {tab === 'billing' && (
                <BillingSection
                  form={draft.billing}
                  onChange={(value) => updateSection('billing', value)}
                  onSave={handleSave}
                  onCancel={() => resetSection('billing')}
                  saving={saving}
                />
              )}
              {tab === 'email' && (
                <EmailSection
                  prefs={draft.email}
                  onChange={(value) => updateSection('email', value)}
                  onSave={handleSave}
                  onCancel={() => resetSection('email')}
                  saving={saving}
                />
              )}
              {tab === 'features' && (
                <FeaturesSection
                  features={draft.features}
                  onChange={(value) => updateSection('features', value)}
                  onSave={handleSave}
                  onCancel={() => resetSection('features')}
                  saving={saving}
                />
              )}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-extrabold text-[#486466]">{label}</span>
      {children}
    </label>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className="h-11 w-full rounded-xl border border-[#e4eeee] bg-white px-3 text-[12px] text-[#084036] outline-none transition focus:border-[#14b8a6] focus:ring-2 focus:ring-[#14b8a6]/15"
    />
  );
}

function Textarea(props) {
  return (
    <textarea
      {...props}
      className="min-h-[100px] w-full resize-y rounded-xl border border-[#e4eeee] bg-white p-3 text-[12px] leading-7 text-[#084036] outline-none transition focus:border-[#14b8a6]"
    />
  );
}

function FormFooter({ onSave, onCancel, saving }) {
  const { text } = useLocalizedContent();

  return (
    <div className="mt-5 flex flex-col-reverse items-stretch gap-2 border-t border-[#f1f7f7] pt-4 sm:flex-row sm:justify-end">
      <button
        type="button"
        disabled={saving}
        onClick={onCancel}
        className="rounded-full border border-[#e4eeee] bg-white px-5 py-2.5 text-[12px] font-bold text-[#486466] transition hover:border-[#14b8a6] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {text(COPY.cancel)}
      </button>
      <button
        type="button"
        disabled={saving}
        onClick={onSave}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#14b8a6] px-5 py-2.5 text-[12px] font-extrabold text-white shadow-[0_10px_22px_rgba(20,184,166,0.25)] transition hover:bg-[#119a8a] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {saving ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
        {saving ? text(COPY.saving) : text(COPY.save)}
      </button>
    </div>
  );
}

function Toggle({ value, onToggle, title, desc }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#e4eeee] bg-[#f7fbfb] p-4">
      <ToggleSwitch checked={value} onToggle={onToggle} ariaLabel={title} />
      <div className="flex-1 text-start">
        <div className="text-[13px] font-extrabold text-[#084036]">{title}</div>
        <div className="mt-0.5 text-[11px] leading-6 text-slate-500">{desc}</div>
      </div>
    </div>
  );
}

function GeneralSection({ form, onChange, onSave, onCancel, saving }) {
  const { text } = useLocalizedContent();

  return (
    <SectionCard title={COPY.generalTitle} description={COPY.generalDesc} icon={Globe}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={text(COPY.platformName)}>
          <Input value={form.platformName} onChange={(e) => onChange({ platformName: e.target.value })} />
        </Field>
        <Field label={text(COPY.tagline)}>
          <Input value={form.tagline} onChange={(e) => onChange({ tagline: e.target.value })} />
        </Field>
        <Field label={text(COPY.supportEmail)}>
          <Input dir="ltr" value={form.supportEmail} onChange={(e) => onChange({ supportEmail: e.target.value })} />
        </Field>
        <Field label={text(COPY.supportPhone)}>
          <Input dir="ltr" value={form.supportPhone} onChange={(e) => onChange({ supportPhone: e.target.value })} />
        </Field>
      </div>
      <div className="mt-4">
        <Field label={text(COPY.about)}>
          <Textarea value={form.about} onChange={(e) => onChange({ about: e.target.value })} />
        </Field>
      </div>
      <FormFooter onSave={onSave} onCancel={onCancel} saving={saving} />
    </SectionCard>
  );
}

function SecuritySection({ values, onChange, onSave, onCancel, saving }) {
  const { text } = useLocalizedContent();

  return (
    <SectionCard title={COPY.securityTitle} description={COPY.securityDesc} icon={ShieldCheck}>
      <div className="flex flex-col gap-3">
        <Toggle
          value={values.require2Fa}
          onToggle={() => onChange({ require2Fa: !values.require2Fa })}
          title={text(localizedText('التحقق الثنائي إجباري لكل الإدارة', 'Require 2FA for all admins'))}
          desc={text(
            localizedText(
              'يُطلب من كل مسؤول إدخال رمز تحقق من الموبايل.',
              'Every administrator must enter a verification code from mobile.',
            ),
          )}
        />
        <Toggle
          value={values.requireStrongPasswords}
          onToggle={() => onChange({ requireStrongPasswords: !values.requireStrongPasswords })}
          title={text(localizedText('اشتراط كلمات مرور قوية', 'Require strong passwords'))}
          desc={text(
            localizedText(
              'حروف كبيرة وصغيرة وأرقام ورموز وطول 10 أحرف على الأقل.',
              'Require uppercase, lowercase, numbers, symbols, and at least 10 characters.',
            ),
          )}
        />
        <Toggle
          value={values.restrictAdminIp}
          onToggle={() => onChange({ restrictAdminIp: !values.restrictAdminIp })}
          title={text(localizedText('تقييد الوصول حسب عناوين IP', 'Restrict access by IP addresses'))}
          desc={text(
            localizedText(
              'السماح فقط من قائمة IPs محددة لتسجيل الدخول كمسؤول.',
              'Allow admin login only from a specific allowlist of IP addresses.',
            ),
          )}
        />
      </div>
      <FormFooter onSave={onSave} onCancel={onCancel} saving={saving} />
    </SectionCard>
  );
}

function BillingSection({ form, onChange, onSave, onCancel, saving }) {
  const { text } = useLocalizedContent();

  const updateNumber = (key, value) => {
    if (value === '') {
      onChange({ [key]: 0 });
      return;
    }

    const parsed = Number(value);
    onChange({ [key]: Number.isNaN(parsed) ? form[key] : parsed });
  };

  return (
    <SectionCard title={COPY.billingTitle} description={COPY.billingDesc} icon={Wallet}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={text(COPY.doctorCommission)}>
          <Input type="number" value={form.doctorCommission} onChange={(e) => updateNumber('doctorCommission', e.target.value)} />
        </Field>
        <Field label={text(COPY.pharmacyCommission)}>
          <Input
            type="number"
            value={form.pharmacyCommission}
            onChange={(e) => updateNumber('pharmacyCommission', e.target.value)}
          />
        </Field>
        <Field label={text(COPY.deliveryFee)}>
          <Input type="number" value={form.deliveryFee} onChange={(e) => updateNumber('deliveryFee', e.target.value)} />
        </Field>
        <Field label={text(COPY.currency)}>
          <Input value={form.currency} onChange={(e) => onChange({ currency: e.target.value.toUpperCase() })} />
        </Field>
        <Field label={text(COPY.taxRate)}>
          <Input type="number" value={form.taxRate} onChange={(e) => updateNumber('taxRate', e.target.value)} />
        </Field>
      </div>
      <FormFooter onSave={onSave} onCancel={onCancel} saving={saving} />
    </SectionCard>
  );
}

function EmailSection({ prefs, onChange, onSave, onCancel, saving }) {
  const { text } = useLocalizedContent();

  const toggle = (key) => onChange({ [key]: !prefs[key] });

  const items = [
    {
      key: 'welcome',
      title: localizedText('رسائل الترحيب', 'Welcome emails'),
      desc: localizedText('تُرسل عند تسجيل مستخدم جديد.', 'Sent when a new user registers.'),
    },
    {
      key: 'orderUpdates',
      title: localizedText('تحديثات الطلبات', 'Order updates'),
      desc: localizedText('إشعار بأي تغيّر في حالة الطلب.', 'Notify on any order status change.'),
    },
    {
      key: 'weeklyDigest',
      title: localizedText('ملخّص أسبوعي للإدارة', 'Weekly admin digest'),
      desc: localizedText('تقرير أسبوعي مختصر عبر البريد.', 'A short weekly report via email.'),
    },
    {
      key: 'marketing',
      title: localizedText('حملات تسويقية', 'Marketing campaigns'),
      desc: localizedText('عروض وأخبار المنصة.', 'Platform offers and news.'),
    },
    {
      key: 'criticalAlerts',
      title: localizedText('تنبيهات حرجة', 'Critical alerts'),
      desc: localizedText(
        'عند حدوث مشاكل أمنية أو بنية تحتية.',
        'For security incidents or infrastructure issues.',
      ),
    },
  ];

  return (
    <SectionCard title={COPY.emailTitle} description={COPY.emailDesc} icon={Mail}>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <Toggle
            key={item.key}
            value={prefs[item.key]}
            onToggle={() => toggle(item.key)}
            title={text(item.title)}
            desc={text(item.desc)}
          />
        ))}
      </div>
      <FormFooter onSave={onSave} onCancel={onCancel} saving={saving} />
    </SectionCard>
  );
}

function FeaturesSection({ features, onChange, onSave, onCancel, saving }) {
  const { text } = useLocalizedContent();

  const toggle = (key) => onChange({ [key]: !features[key] });

  const items = [
    {
      key: 'ai',
      title: localizedText('مساعد الذكاء الاصطناعي', 'AI assistant'),
      desc: localizedText(
        'تفعيل صفحة الاستشارات الذكية للمستخدمين.',
        'Enable the smart consultation page for users.',
      ),
    },
    {
      key: 'delivery',
      title: localizedText('توصيل الأدوية', 'Medicine delivery'),
      desc: localizedText(
        'السماح للمرضى بطلب توصيل الأدوية.',
        'Allow patients to request medicine delivery.',
      ),
    },
    {
      key: 'videoConsult',
      title: localizedText('كشف أونلاين بالفيديو', 'Video consultations'),
      desc: localizedText('السماح بحجز استشارات فيديو.', 'Allow booking video consultations.'),
    },
    {
      key: 'reviews',
      title: localizedText('تقييمات المستخدمين', 'User reviews'),
      desc: localizedText(
        'إظهار تقييمات المرضى على الأطباء والصيدليات.',
        'Show patient reviews on doctors and pharmacies.',
      ),
    },
    {
      key: 'articles',
      title: localizedText('قسم المقالات', 'Articles section'),
      desc: localizedText(
        'نشر محتوى تحريري طبي للجمهور.',
        'Publish medical editorial content for the public.',
      ),
    },
  ];

  return (
    <SectionCard title={COPY.featuresTitle} description={COPY.featuresDesc} icon={Sparkles}>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <Toggle
            key={item.key}
            value={features[item.key]}
            onToggle={() => toggle(item.key)}
            title={text(item.title)}
            desc={text(item.desc)}
          />
        ))}
      </div>
      <FormFooter onSave={onSave} onCancel={onCancel} saving={saving} />
    </SectionCard>
  );
}
