import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Lock,
  Save,
  Settings as SettingsIcon,
  Shield,
  Stethoscope,
  User,
} from 'lucide-react';
import DoctorLayout from '../../components/doctor/layout/DoctorLayout';
import SectionCard from '../../components/doctor/shared/SectionCard';
import { WEEK_DAYS } from '../../components/doctor/data/doctorData';
import ToggleSwitch from '../../components/ToggleSwitch';
import { useLocalizedContent } from '../../hooks/useLocalizedContent';
import { localizedText, getLocalizedText } from '../../utils/localization';
import { medoraApi } from '../../api/medoraApi';
import { mapDoctorProfile } from '../../utils/professionalApiMappers';

const COPY = {
  title: localizedText('إعدادات الحساب', 'Account settings'),
  subtitle: localizedText('تحكّم كامل في بياناتك المهنية وصلاحيات حسابك', 'Full control over your professional data and account permissions'),
  savedMsg: localizedText('تم حفظ التعديلات بنجاح ✓', 'Changes saved successfully ✓'),
  tabs: {
    personal: localizedText('البيانات الشخصية', 'Personal info'),
    professional: localizedText('البيانات المهنية', 'Professional info'),
    security: localizedText('الأمان', 'Security'),
    notifications: localizedText('الإشعارات', 'Notifications'),
  },
  personalTitle: localizedText('البيانات الشخصية', 'Personal info'),
  personalDesc: localizedText('المعلومات الأساسية التي تظهر للمرضى', 'Basic information visible to patients'),
  photoTitle: localizedText('الصورة الشخصية', 'Profile photo'),
  photoDesc: localizedText('يُفضّل صورة واضحة بمقاس مربع. الحد الأقصى: 2MB.', 'A clear square photo is preferred. Maximum: 2MB.'),
  changePhoto: localizedText('تغيير الصورة', 'Change photo'),
  fullName: localizedText('الاسم الكامل', 'Full name'),
  email: localizedText('البريد الإلكتروني', 'Email'),
  phone: localizedText('رقم الهاتف', 'Phone number'),
  location: localizedText('الموقع', 'Location'),
  bio: localizedText('نبذة تعريفية', 'Bio'),
  professionalTitle: localizedText('البيانات المهنية', 'Professional info'),
  professionalDesc: localizedText('التفاصيل المتعلقة بتخصصك ورسوم الكشف', 'Details about your specialty and consultation fees'),
  specialty: localizedText('التخصص الأساسي', 'Primary specialty'),
  hospital: localizedText('المستشفى / المركز', 'Hospital / Center'),
  license: localizedText('رقم الترخيص', 'License number'),
  experienceYears: localizedText('سنوات الخبرة', 'Years of experience'),
  consultationFee: localizedText('رسوم الكشف (ج.م)', 'Consultation fee (EGP)'),
  subSpecialties: localizedText('تخصصات فرعية (افصل بـ ·)', 'Sub-specialties (separate with ·)'),
  languages: localizedText('اللغات (افصل بـ ·)', 'Languages (separate with ·)'),
  scheduleTitle: localizedText('أيام وساعات العمل', 'Work days and hours'),
  scheduleDesc: localizedText('اضبط توافرك للمرضى', 'Set your availability for patients'),
  startTime: localizedText('ساعة البداية', 'Start time'),
  endTime: localizedText('ساعة النهاية', 'End time'),
  workDaysLabel: localizedText('أيام العمل الأسبوعية', 'Weekly work days'),
  available: localizedText('متاح', 'Available'),
  dayOff: localizedText('إجازة', 'Day off'),
  securityTitle: localizedText('إعدادات الأمان', 'Security settings'),
  securityDesc: localizedText('كلمة المرور والتحقق الثنائي', 'Password and two-factor authentication'),
  currentPass: localizedText('كلمة المرور الحالية', 'Current password'),
  newPass: localizedText('كلمة المرور الجديدة', 'New password'),
  confirmPass: localizedText('تأكيد كلمة المرور', 'Confirm password'),
  showPass: localizedText('إظهار كلمة المرور', 'Show password'),
  emailLocked: localizedText('تغيير البريد الإلكتروني يتطلب كلمة المرور الحالية ويتم عبر مسار حساب منفصل، لذلك هذا الحقل للقراءة فقط هنا.', 'Changing email requires the current password and a separate account flow, so this field is read-only here.'),
  passPolicy: localizedText('6 أحرف على الأقل مع حرف كبير وحرف صغير ورقم ورمز خاص.', 'At least 6 characters with uppercase, lowercase, number, and special character.'),
  twoFATitle: localizedText('التحقق الثنائي (2FA)', 'Two-factor authentication (2FA)'),
  twoFADesc: localizedText('يتم إرسال رمز تحقق إلى هاتفك في كل مرة تسجّل دخول.', 'A verification code is sent to your phone each time you log in.'),
  notificationsTitle: localizedText('إعدادات الإشعارات', 'Notifications settings'),
  notificationsDesc: localizedText('اختر ما تريد استلامه من تنبيهات', 'Choose the alerts you want to receive'),
  cancel: localizedText('إلغاء', 'Cancel'),
  save: localizedText('حفظ التعديلات', 'Save changes'),
};

const NOTIF_ITEMS = [
  { key: 'newAppointment', title: localizedText('مواعيد جديدة', 'New appointments'), desc: localizedText('إشعار فور حجز موعد جديد.', 'Notify immediately when a new appointment is booked.') },
  { key: 'reminders', title: localizedText('تذكير بالمواعيد', 'Appointment reminders'), desc: localizedText('قبل موعد الكشف بـ 30 دقيقة.', '30 minutes before the appointment.') },
  { key: 'cancellations', title: localizedText('الإلغاء والتعديل', 'Cancellations & changes'), desc: localizedText('عند إلغاء أو تعديل موعد.', 'When an appointment is cancelled or changed.') },
  { key: 'reviews', title: localizedText('التقييمات', 'Reviews'), desc: localizedText('عند استلام تقييم جديد.', 'When a new review is received.') },
  { key: 'weekly', title: localizedText('التقرير الأسبوعي', 'Weekly report'), desc: localizedText('ملخّص أسبوعي لأدائك.', 'Weekly summary of your performance.') },
  { key: 'marketing', title: localizedText('تحديثات ميدورا', 'Medora updates'), desc: localizedText('عروض وميزات جديدة.', 'Offers and new features.') },
];

const TABS_LIST = [
  { id: 'personal', labelKey: 'personal', Icon: User },
  { id: 'professional', labelKey: 'professional', Icon: Stethoscope },
  { id: 'security', labelKey: 'security', Icon: Shield },
  { id: 'notifications', labelKey: 'notifications', Icon: Bell },
];

function getPasswordPolicyError(password) {
  const value = password || '';
  if (value.length < 6) return localizedText('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل', 'New password must be at least 6 characters');
  if (!/[A-Z]/.test(value)) return localizedText('كلمة المرور الجديدة يجب أن تحتوي على حرف كبير', 'New password must contain an uppercase letter');
  if (!/[a-z]/.test(value)) return localizedText('كلمة المرور الجديدة يجب أن تحتوي على حرف صغير', 'New password must contain a lowercase letter');
  if (!/[0-9]/.test(value)) return localizedText('كلمة المرور الجديدة يجب أن تحتوي على رقم', 'New password must contain a number');
  if (!/[^A-Za-z0-9]/.test(value)) return localizedText('كلمة المرور الجديدة يجب أن تحتوي على رمز خاص', 'New password must contain a special character');
  return null;
}

export default function DoctorSettings() {
  const { text } = useLocalizedContent();
  const [tab, setTab] = useState('personal');
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState(null);
  const [ui, setUi] = useState({ loading: true, error: '' });
  const doctorProfile = useMemo(() => mapDoctorProfile(profile), [profile]);

  const loadProfile = useCallback(async () => {
    setUi({ loading: true, error: '' });
    try {
      const data = await medoraApi.doctorMe();
      setProfile(data);
      setUi({ loading: false, error: '' });
      return data;
    } catch (error) {
      setProfile(null);
      setUi({ loading: false, error: error.message || 'Unable to load profile' });
      return null;
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const showSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleSave = async (section, payload) => {
    setUi({ loading: true, error: '' });
    try {
      if (section === 'security') {
        if (!payload.currentPassword || !payload.newPassword || !payload.confirmPassword) throw new Error('Please check password fields');
        if (payload.newPassword !== payload.confirmPassword) throw new Error('Passwords do not match');
        const passwordPolicyError = getPasswordPolicyError(payload.newPassword);
        if (passwordPolicyError) throw new Error(text(passwordPolicyError));
        await medoraApi.changePassword({
          currentPassword: payload.currentPassword,
          newPassword: payload.newPassword,
        });
      } else if (section === 'schedule') {
        if (payload.clinicId) {
          await medoraApi.updateDoctorClinic(payload.clinicId, {
            workingHours: payload.workingHours,
          });
        }
        await medoraApi.updateDoctorAvailability({ status: payload.status });
      } else if (section === 'notifications') {
        // Notification preferences do not have a backend endpoint yet.
      } else {
        await medoraApi.updateDoctorProfile(payload);
        await loadProfile();
      }
      setUi({ loading: false, error: '' });
      showSaved();
    } catch (error) {
      setUi({ loading: false, error: error.message || 'Unable to save changes' });
    }
  };

  return (
    <DoctorLayout title={COPY.title} subtitle={COPY.subtitle}>
      {saved && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-[#c8ebe6] bg-[#e6f7f7] px-4 py-3 text-[13px] font-extrabold text-[#0e7c6e] shadow-[0_6px_18px_rgba(20,184,166,0.15)]">
          <CheckCircle2 size={16} />
          {text(COPY.savedMsg)}
        </div>
      )}
      {ui.error && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-extrabold text-amber-700">
          {ui.error}
        </div>
      )}
      {ui.loading && (
        <div className="mb-4 rounded-2xl border border-[#c8ebe6] bg-[#e6f7f7] px-4 py-3 text-[13px] font-extrabold text-[#0e7c6e]">
          ...
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
        <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-[#e4eeee] bg-white p-2 shadow-[0_8px_22px_rgba(41,93,96,0.06)] lg:flex-col lg:overflow-visible lg:p-3">
          {TABS_LIST.map((t) => {
            const TabIcon = t.Icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-bold transition"
                style={
                  active
                    ? { background: '#14b8a6', color: '#ffffff', boxShadow: '0 10px 22px rgba(20,184,166,0.25)' }
                    : { background: 'transparent', color: '#486466' }
                }
              >
                <TabIcon size={13} />
                {text(COPY.tabs[t.labelKey])}
              </button>
            );
          })}
        </nav>

        <div>
          { tab === 'personal' && <PersonalSection profile={doctorProfile} loading={ui.loading} onSave={(payload) => handleSave('profile', payload)} /> }
          { tab === 'professional' && <ProfessionalSection profile={doctorProfile} loading={ui.loading} onSave={(payload) => handleSave('profile', payload)} /> }
          { tab === 'security' && <SecuritySection loading={ui.loading} onSave={(payload) => handleSave('security', payload)} /> }
          { tab === 'notifications' && <NotificationsSection loading={ui.loading} onSave={() => handleSave('notifications', {})} /> }
        </div>
      </div>
    </DoctorLayout>
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
      className="min-h-[120px] w-full resize-y rounded-xl border border-[#e4eeee] bg-white p-3 text-[12px] leading-7 text-[#084036] outline-none transition focus:border-[#14b8a6] focus:ring-2 focus:ring-[#14b8a6]/15"
    />
  );
}

function FormFooter({ onSave, loading }) {
  const { text } = useLocalizedContent();
  return (
    <div className="mt-5 flex flex-col-reverse items-stretch gap-2 border-t border-[#f1f7f7] pt-4 sm:flex-row sm:justify-end">
      <button
        type="button"
        className="rounded-full border border-[#e4eeee] bg-white px-5 py-2.5 text-[12px] font-bold text-[#486466] transition hover:border-[#14b8a6] hover:text-[#119a8a]"
      >
        {text(COPY.cancel)}
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={onSave}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#14b8a6] px-5 py-2.5 text-[12px] font-extrabold text-white shadow-[0_10px_22px_rgba(20,184,166,0.25)] transition hover:bg-[#119a8a] disabled:opacity-60"
      >
        <Save size={14} />
        {loading ? '...' : text(COPY.save)}
      </button>
    </div>
  );
}

function PersonalSection({ profile, onSave, loading }) {
  const { lang, text } = useLocalizedContent();
  const [form, setForm] = useState({
    name: getLocalizedText(profile.name, lang, ''),
    email: profile.email,
    phone: profile.phone,
    location: getLocalizedText(profile.location, lang, ''),
    bio: getLocalizedText(profile.bio, lang, ''),
  });

  useEffect(() => {
    queueMicrotask(() => {
      setForm({
        name: getLocalizedText(profile.name, lang, ''),
        email: profile.email,
        phone: profile.phone,
        location: getLocalizedText(profile.location, lang, ''),
        bio: getLocalizedText(profile.bio, lang, ''),
      });
    });
  }, [lang, profile]);

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        await medoraApi.updateDoctorProfileImage(file);
        window.location.reload();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <SectionCard title={COPY.personalTitle} description={COPY.personalDesc} icon={User}>
      <div className="mb-5 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#d7e7e5] bg-[#f7fbfb] p-5 sm:flex-row sm:items-start">
        <div className="h-20 w-20 overflow-hidden rounded-2xl bg-white p-1 shadow-[0_8px_18px_rgba(41,93,96,0.08)]">
          <img src={profile.avatar} alt="" className="h-full w-full rounded-xl object-cover" />
        </div>
        <div className="flex-1 text-center sm:text-start">
          <div className="text-[13px] font-extrabold text-[#084036]">{text(COPY.photoTitle)}</div>
          <div className="mt-1 text-[11px] leading-6 text-slate-500">{text(COPY.photoDesc)}</div>
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#14b8a6] px-4 py-2 text-[11px] font-bold text-white transition hover:bg-[#119a8a]">
            <ImageIcon size={12} />
            {text(COPY.changePhoto)}
            <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
          </label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={text(COPY.fullName)}>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label={text(COPY.email)}>
          <Input dir="ltr" value={form.email} readOnly title={text(COPY.emailLocked)} />
          <div className="mt-1 text-[10px] leading-5 text-slate-400">{text(COPY.emailLocked)}</div>
        </Field>
        <Field label={text(COPY.phone)}>
          <Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label={text(COPY.location)}>
          <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </Field>
      </div>

      <div className="mt-4">
        <Field label={text(COPY.bio)}>
          <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </Field>
      </div>

      <FormFooter loading={loading} onSave={() => onSave({
        fullName: form.name.trim() || "",
        phone: form.phone.trim() || "",
        bio: form.bio || "",
      })} />
    </SectionCard>
  );
}

function ProfessionalSection({ profile, onSave, loading }) {
  const { lang, text } = useLocalizedContent();
  const [form, setForm] = useState({
    specialty: getLocalizedText(profile.department, lang, ''),
    hospital: getLocalizedText(profile.hospital, lang, ''),
    license: profile.license,
    experience: profile.experienceYears,
    price: profile.consultationPrice,
    specialties: profile.specialties.map((s) => getLocalizedText(s, lang, '')).join(' · '),
    languages: profile.languages.map((l) => getLocalizedText(l, lang, '')).join(' · '),
  });

  useEffect(() => {
    queueMicrotask(() => {
      setForm({
        specialty: getLocalizedText(profile.department, lang, ''),
        hospital: getLocalizedText(profile.hospital, lang, ''),
        license: profile.license,
        experience: profile.experienceYears,
        price: profile.consultationPrice,
        specialties: profile.specialties.map((s) => getLocalizedText(s, lang, '')).join(' · '),
        languages: profile.languages.map((l) => getLocalizedText(l, lang, '')).join(' · '),
      });
    });
  }, [lang, profile]);

  return (
    <SectionCard title={COPY.professionalTitle} description={COPY.professionalDesc} icon={Stethoscope}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={text(COPY.specialty)}>
          <Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
        </Field>
        <Field label={text(COPY.hospital)}>
          <Input value={form.hospital} onChange={(e) => setForm({ ...form, hospital: e.target.value })} />
        </Field>
        <Field label={text(COPY.license)}>
          <Input dir="ltr" value={form.license} onChange={(e) => setForm({ ...form, license: e.target.value })} />
        </Field>
        <Field label={text(COPY.experienceYears)}>
          <Input type="number" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} />
        </Field>
        <Field label={text(COPY.consultationFee)}>
          <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        </Field>
      </div>

      <div className="mt-4">
        <Field label={text(COPY.subSpecialties)}>
          <Input value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} />
        </Field>
      </div>
      <div className="mt-4">
        <Field label={text(COPY.languages)}>
          <Input value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} />
        </Field>
      </div>

      <FormFooter loading={loading} onSave={() => onSave({
        specialty: form.specialty.trim() || "",
        hospital: form.hospital.trim() || "",
        license: form.license || "",
        experienceYears: Number(form.experience) || 0,
        consultationPrice: Number(form.price) || null,
        specialties: form.specialties.split('·').map(s => s.trim()).filter(Boolean),
        languages: form.languages.split('·').map(l => l.trim()).filter(Boolean)
      })} />
    </SectionCard>
  );
}

function SecuritySection({ onSave, loading }) {
  const { text } = useLocalizedContent();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [show, setShow] = useState(false);
  const [twoFA, setTwoFA] = useState(true);

  return (
    <SectionCard title={COPY.securityTitle} description={COPY.securityDesc} icon={Lock}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={text(COPY.currentPass)}>
          <div className="relative">
            <Input
              dir="ltr"
              type={show ? 'text' : 'password'}
              value={form.current}
              onChange={(e) => setForm({ ...form, current: e.target.value })}
              placeholder="••••••••"
            />
            <button
              onClick={() => setShow((v) => !v)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#14b8a6]"
              aria-label={text(COPY.showPass)}
              type="button"
            >
              {show ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
        </Field>
        <div className="hidden sm:block" />
        <Field label={text(COPY.newPass)}>
          <Input dir="ltr" type="password" value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} placeholder="••••••••" />
          <div className="mt-1 text-[10px] leading-5 text-slate-400">{text(COPY.passPolicy)}</div>
        </Field>
        <Field label={text(COPY.confirmPass)}>
          <Input dir="ltr" type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} placeholder="••••••••" />
        </Field>
      </div>

      <div className="mt-5 rounded-2xl border border-[#e4eeee] bg-[#f7fbfb] p-4">
        <div className="flex items-center justify-between gap-3">
          <ToggleSwitch
            checked={twoFA}
            onToggle={() => setTwoFA((v) => !v)}
            ariaLabel={text(COPY.twoFATitle)}
          />
          <div className="flex-1 text-start">
            <div className="text-[13px] font-extrabold text-[#084036]">{text(COPY.twoFATitle)}</div>
            <div className="mt-0.5 text-[11px] leading-6 text-slate-500">{text(COPY.twoFADesc)}</div>
          </div>
          <Shield size={16} className="text-[#14b8a6]" />
        </div>
      </div>

      <FormFooter loading={loading} onSave={() => onSave({
        currentPassword: form.current,
        newPassword: form.next,
        confirmPassword: form.confirm,
      })} />
    </SectionCard>
  );
}

function NotificationsSection({ onSave, loading }) {
  const { text } = useLocalizedContent();
  const [prefs, setPrefs] = useState({
    newAppointment: true,
    reminders: true,
    cancellations: true,
    reviews: true,
    weekly: false,
    marketing: false,
  });

  const toggle = (k) => setPrefs((p) => ({ ...p, [k]: !p[k] }));

  return (
    <SectionCard title={COPY.notificationsTitle} description={COPY.notificationsDesc} icon={SettingsIcon}>
      <div className="flex flex-col gap-3">
        {NOTIF_ITEMS.map((item) => {
          const on = prefs[item.key];
          return (
            <div
              key={item.key}
              className="flex items-center justify-between gap-3 rounded-2xl border border-[#e4eeee] bg-[#f7fbfb] p-4"
            >
              <ToggleSwitch
                checked={on}
                onToggle={() => toggle(item.key)}
                ariaLabel={text(item.title)}
              />
              <div className="flex-1 text-start">
                <div className="text-[13px] font-extrabold text-[#084036]">{text(item.title)}</div>
                <div className="mt-0.5 text-[11px] leading-6 text-slate-500">{text(item.desc)}</div>
              </div>
            </div>
          );
        })}
      </div>

      <FormFooter loading={loading} onSave={onSave} />
    </SectionCard>
  );
}
