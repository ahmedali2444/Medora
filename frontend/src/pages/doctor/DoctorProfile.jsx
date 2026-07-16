import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  Building2,
  Clock,
  Edit2,
  GraduationCap,
  Languages,
  Mail,
  MapPin,
  Phone,
  Stethoscope,
  Users,
} from 'lucide-react';
import DoctorLayout from '../../components/doctor/layout/DoctorLayout';
import SectionCard from '../../components/doctor/shared/SectionCard';
import { WEEK_DAYS } from '../../components/doctor/data/doctorData';
import { useLocalizedContent } from '../../hooks/useLocalizedContent';
import { formatLocalizedNumber, localizedText } from '../../utils/localization';
import { medoraApi } from '../../api/medoraApi';
import { mapDoctorProfile } from '../../utils/professionalApiMappers';

const COPY = {
  title: localizedText('الملف الشخصي', 'Profile'),
  subtitle: localizedText('كيف يراك المرضى في صفحتك العامة', 'How patients see you on your public page'),
  editProfile: localizedText('تعديل الملف', 'Edit profile'),
  reviewsSuffix: localizedText('تقييم', 'reviews'),
  patients: localizedText('مرضى', 'Patients'),
  experience: localizedText('سنوات خبرة', 'Yrs experience'),
  consultation: localizedText('كشف', 'Consult'),
  bioTitle: localizedText('نبذة عني', 'About me'),
  scheduleTitle: localizedText('ساعات وأيام العمل', 'Working hours'),
  dailyHours: localizedText('ساعات العمل اليومية', 'Daily working hours'),
  contactTitle: localizedText('بيانات الاتصال', 'Contact info'),
  professionalTitle: localizedText('معلومات مهنية', 'Professional info'),
  languagesTitle: localizedText('اللغات', 'Languages'),
  editAll: localizedText('تعديل جميع البيانات', 'Edit all data'),
  phoneLabel: localizedText('رقم الهاتف', 'Phone number'),
  emailLabel: localizedText('البريد الإلكتروني', 'Email'),
  locationLabel: localizedText('الموقع', 'Location'),
  licenseLabel: localizedText('رقم الترخيص', 'License number'),
  departmentLabel: localizedText('القسم', 'Department'),
  expYearsLabel: localizedText('سنوات الخبرة', 'Years of experience'),
  feeLabel: localizedText('رسوم الكشف', 'Consultation fee'),
  expSuffix: localizedText('سنوات', 'years'),
  feeSuffix: localizedText('ج.م', 'EGP'),
  available: localizedText('متاح', 'Available'),
};

export default function DoctorProfile() {
  const navigate = useNavigate();
  const { lang, text } = useLocalizedContent();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [ui, setUi] = useState({ loading: true, error: '' });
  const doctorProfile = useMemo(() => mapDoctorProfile(profile, stats), [profile, stats]);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([medoraApi.doctorMe(), medoraApi.doctorStats()]).then(([profileResult, statsResult]) => {
      if (!mounted) return;
      if (profileResult.status === 'fulfilled') setProfile(profileResult.value);
      if (statsResult.status === 'fulfilled') setStats(statsResult.value);
      const failed = [profileResult, statsResult].find((result) => result.status === 'rejected');
      setUi({ loading: false, error: failed?.reason?.message || '' });
    });
    return () => { mounted = false; };
  }, []);

  return (
    <DoctorLayout title={COPY.title} subtitle={COPY.subtitle}>
      {ui.error && <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">{ui.error}</div>}
      {ui.loading && <div className="mb-4 rounded-xl bg-[#e6f7f7] px-4 py-3 text-xs font-semibold text-[#0e7c6e]">...</div>}
      <div className="overflow-hidden rounded-3xl border border-[#d7e7e5] bg-white shadow-[0_18px_44px_rgba(8,64,54,0.08)]">
        <div
          className="relative h-36 sm:h-44"
          style={{ background: 'linear-gradient(135deg, #0b5e52 0%, #119a8a 50%, #14b8a6 100%)' }}
        >
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage:
              'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.3) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.2) 0%, transparent 40%)',
          }} />
          <button
            onClick={() => navigate('/doctor/settings')}
            className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur transition hover:bg-white/30"
          >
            <Edit2 size={12} />
            {text(COPY.editProfile)}
          </button>
        </div>

        <div className="relative px-5 pb-6 pt-0 sm:px-7">
          <div className="-mt-16 flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-end">
              <div className="h-28 w-28 overflow-hidden rounded-2xl bg-white p-1 shadow-[0_14px_30px_rgba(8,64,54,0.15)]">
                <img src={doctorProfile.avatar} alt="" className="h-full w-full rounded-xl object-cover" />
              </div>
              <div className="mb-1 text-center sm:text-start">
                <h2 className="text-[22px] font-black text-[#084036] sm:text-[26px]">
                  {text(doctorProfile.name)}
                </h2>
                <p className="mt-1 text-[13px] font-bold text-[#119a8a]">{text(doctorProfile.title)}</p>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#fff8e7] px-3 py-1 text-[11px] font-bold text-[#a35a00]">
                    ★ {formatLocalizedNumber(doctorProfile.rating, lang, { maximumFractionDigits: 1, minimumFractionDigits: 1 })}
                    <span className="text-[10px] font-normal text-[#b89670]">
                      ({formatLocalizedNumber(doctorProfile.reviewCount, lang)} {text(COPY.reviewsSuffix)})
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#f1fbfa] px-3 py-1 text-[11px] font-bold text-[#0e7c6e]">
                    <MapPin size={11} />
                    {text(doctorProfile.location)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:min-w-[280px]">
              <StatBlock
                label={text(COPY.patients)}
                value={formatLocalizedNumber(doctorProfile.totalPatients, lang)}
                Icon={Users}
              />
              <StatBlock
                label={text(COPY.experience)}
                value={formatLocalizedNumber(doctorProfile.experienceYears, lang)}
                Icon={Award}
              />
              <StatBlock
                label={text(COPY.consultation)}
                value={`${formatLocalizedNumber(doctorProfile.consultationPrice, lang)} ${text(COPY.feeSuffix)}`}
                Icon={Stethoscope}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-5">
          <SectionCard title={COPY.bioTitle} icon={Stethoscope}>
            <p className="text-[13px] leading-8 text-slate-700">{text(doctorProfile.bio)}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {doctorProfile.specialties.map((s, i) => (
                <span
                  key={i}
                  className="rounded-full bg-[#e6f7f7] px-3 py-1 text-[11px] font-bold text-[#0e7c6e]"
                >
                  {text(s)}
                </span>
              ))}
            </div>
          </SectionCard>



          <SectionCard title={COPY.scheduleTitle} icon={Clock}>
            <div className="mb-4 flex items-center justify-between rounded-2xl bg-[#f7fbfb] px-4 py-3">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-[#14b8a6]" />
                <span className="text-[12px] font-extrabold text-[#084036]" dir="ltr">
                  {doctorProfile.workingHours.from} — {doctorProfile.workingHours.to}
                </span>
              </div>
              <span className="text-[11px] text-slate-500">{text(COPY.dailyHours)}</span>
            </div>

            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {WEEK_DAYS.map((day) => {
                const active = doctorProfile.workingDays.includes(day.id);
                return (
                  <div
                    key={day.id}
                    className="flex flex-col items-center rounded-xl border border-[#e4eeee] py-2 text-center"
                    style={
                      active
                        ? { background: '#14b8a6', borderColor: '#14b8a6' }
                        : { background: '#ffffff' }
                    }
                  >
                    <span
                      className="text-[11px] font-bold"
                      style={{ color: active ? '#ffffff' : '#486466' }}
                    >
                      {text(day.label)}
                    </span>
                    <span
                      className="mt-1 text-[9px]"
                      style={{ color: active ? '#ffffff' : '#cbd4d5' }}
                    >
                      {active ? text(COPY.available) : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>

        <div className="flex flex-col gap-5">
          <SectionCard title={COPY.contactTitle} icon={Phone}>
            <div className="flex flex-col gap-2.5">
              <ContactRow Icon={Phone} label={text(COPY.phoneLabel)} value={doctorProfile.phone || '—'} dir="ltr" />
              <ContactRow Icon={Mail} label={text(COPY.emailLabel)} value={doctorProfile.email || '—'} dir="ltr" />
              <ContactRow Icon={MapPin} label={text(COPY.locationLabel)} value={text(doctorProfile.location)} />
            </div>
          </SectionCard>

          <SectionCard title={COPY.professionalTitle} icon={Award}>
            <div className="flex flex-col gap-2.5">
              <InfoRow label={text(COPY.licenseLabel)} value={doctorProfile.license || '—'} dir="ltr" />
              <InfoRow label={text(COPY.departmentLabel)} value={text(doctorProfile.department)} />
              <InfoRow
                label={text(COPY.expYearsLabel)}
                value={`${formatLocalizedNumber(doctorProfile.experienceYears, lang)} ${text(COPY.expSuffix)}`}
              />
              <InfoRow
                label={text(COPY.feeLabel)}
                value={`${formatLocalizedNumber(doctorProfile.consultationPrice, lang)} ${text(COPY.feeSuffix)}`}
              />
            </div>
          </SectionCard>

          <SectionCard title={COPY.languagesTitle} icon={Languages}>
            <div className="flex flex-wrap gap-2">
              {doctorProfile.languages.map((lang, i) => (
                <span
                  key={i}
                  className="rounded-full border border-[#e4eeee] bg-white px-3 py-1.5 text-[11px] font-bold text-[#2d6669]"
                >
                  {text(lang)}
                </span>
              ))}
            </div>
          </SectionCard>

          <button
            onClick={() => navigate('/doctor/settings')}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[#d7e7e5] bg-[#f7fbfb] py-4 text-[13px] font-extrabold text-[#119a8a] transition hover:border-[#14b8a6] hover:bg-white"
          >
            <Edit2 size={14} />
            {text(COPY.editAll)}
          </button>
        </div>
      </div>
    </DoctorLayout>
  );
}

function StatBlock({ label, value, Icon }) {
  return (
    <div className="rounded-2xl border border-[#e4eeee] bg-white px-3 py-3 text-center shadow-[0_6px_18px_rgba(41,93,96,0.06)]">
      <div className="mb-1 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#e6f7f7] text-[#14b8a6]">
        {Icon && <Icon size={13} />}
      </div>
      <div className="text-[15px] font-black text-[#084036]">{value}</div>
      <div className="text-[10px] text-slate-500">{label}</div>
    </div>
  );
}

function ContactRow({ Icon, label, value, dir }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-[#e4eeee] bg-[#f7fbfb] px-3 py-2.5">
      <div className="flex items-center gap-2 text-[#14b8a6]">
        {Icon && <Icon size={14} />}
        <span className="text-[10px] font-bold text-[#486466]">{label}</span>
      </div>
      <span className="truncate text-[12px] font-bold text-[#084036]" dir={dir}>
        {value}
      </span>
    </div>
  );
}

function InfoRow({ label, value, dir }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-[#f7fbfb] px-3 py-2.5">
      <span className="text-[11px] text-slate-500">{label}</span>
      <span className="text-[12px] font-bold text-[#084036]" dir={dir}>
        {value}
      </span>
    </div>
  );
}
