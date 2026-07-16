import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Clock3, MapPin, MessagesSquare, Package, Star } from 'lucide-react';
import PharmacyLayout from '../../components/pharmacy/layout/PharmacyLayout';
import SectionCard from '../../components/pharmacy/shared/SectionCard';
import { useLocalizedContent } from '../../hooks/useLocalizedContent';
import {
  formatLocalizedNumber,
  localizedText,
} from '../../utils/localization';
import { medoraApi } from '../../api/medoraApi';
import { mapPharmacyProfile } from '../../utils/professionalApiMappers';

const COPY = {
  title: localizedText('ملف الصيدلية', 'Pharmacy profile'),
  subtitle: localizedText('الهوية التجارية ومعلومات التواصل والتشغيل', 'Brand identity, contact details, and operating info'),
  generalProfile: localizedText('الملف العام', 'General profile'),
  pharmacyName: localizedText('اسم الصيدلية', 'Pharmacy name'),
  owner: localizedText('المالك', 'Owner'),
  email: localizedText('البريد الإلكتروني', 'Email'),
  license: localizedText('رقم الرخصة', 'License number'),
  phone: localizedText('الهاتف', 'Phone'),
  city: localizedText('المدينة', 'City'),
  quickMetrics: localizedText('مؤشرات سريعة', 'Quick metrics'),
  rating: localizedText('التقييم', 'Rating'),
  reviews: localizedText('المراجعات', 'Reviews'),
  workingHours: localizedText('ساعات العمل', 'Working hours'),
  totalOrders: localizedText('إجمالي الطلبات', 'Total orders'),
  address: localizedText('العنوان', 'Address'),
};

function Info({ label, value }) {
  const { text } = useLocalizedContent();

  return (
    <div className="rounded-2xl border border-[#e4eeee] bg-[#f7fbfb] p-4">
      <div className="text-[10px] text-slate-400">{text(label)}</div>
      <div className="mt-1 text-[13px] font-bold text-[#084036]">{value}</div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }) {
  const { text } = useLocalizedContent();

  return (
    <div className="rounded-2xl border border-[#e4eeee] bg-white p-4 text-center">
      <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#e6f7f7] text-[#14b8a6]">
        {Icon ? <Icon size={15} /> : null}
      </div>
      <div className="text-[16px] font-black text-[#084036]">{value}</div>
      <div className="text-[11px] text-slate-500">{text(label)}</div>
    </div>
  );
}

export default function PharmacyProfile() {
  const { lang, text } = useLocalizedContent();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [ui, setUi] = useState({ loading: true, error: '' });
  const pharmacyProfile = useMemo(() => mapPharmacyProfile(profile, stats), [profile, stats]);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([medoraApi.pharmacyMe(), medoraApi.pharmacyStats()]).then(([profileResult, statsResult]) => {
      if (!mounted) return;
      if (profileResult.status === 'fulfilled') setProfile(profileResult.value);
      if (statsResult.status === 'fulfilled') setStats(statsResult.value);
      const failed = [profileResult, statsResult].find((result) => result.status === 'rejected');
      setUi({ loading: false, error: failed?.reason?.message || '' });
    });
    return () => { mounted = false; };
  }, []);

  return (
    <PharmacyLayout title={COPY.title} subtitle={COPY.subtitle}>
      {ui.error && <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">{ui.error}</div>}
      {ui.loading && <div className="mb-4 rounded-xl bg-[#e6f7f7] px-4 py-3 text-xs font-semibold text-[#0e7c6e]">...</div>}
      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <SectionCard title={COPY.generalProfile} icon={Building2}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="h-28 w-28 overflow-hidden rounded-3xl ring-4 ring-[#e6f7f7]">
              <img src={pharmacyProfile.logo} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <Info label={COPY.pharmacyName} value={text(pharmacyProfile.name)} />
              <Info label={COPY.owner} value={text(pharmacyProfile.owner)} />
              <Info label={COPY.email} value={pharmacyProfile.email || '—'} />
              <Info label={COPY.license} value={pharmacyProfile.license || '—'} />
              <Info label={COPY.phone} value={pharmacyProfile.phone || '—'} />
              <Info label={COPY.city} value={text(pharmacyProfile.city)} />
            </div>
          </div>
        </SectionCard>

        <SectionCard title={COPY.quickMetrics} icon={Star}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric icon={Star} label={COPY.rating} value={`${formatLocalizedNumber(pharmacyProfile.rating, lang, { maximumFractionDigits: 1, minimumFractionDigits: 1 })} / 5`} />
            <Metric
              icon={MessagesSquare}
              label={COPY.reviews}
              value={formatLocalizedNumber(pharmacyProfile.reviewCount, lang)}
            />
            <Metric
              icon={Clock3}
              label={COPY.workingHours}
              value={`${pharmacyProfile.workingHours.from} - ${pharmacyProfile.workingHours.to}`}
            />
            <Metric
              icon={Package}
              label={COPY.totalOrders}
              value={formatLocalizedNumber(pharmacyProfile.totalOrders, lang)}
            />
          </div>
          <div className="mt-4 rounded-2xl bg-[#f7fbfb] p-4 text-[12px] text-slate-600">
            <div className="mb-1 font-extrabold text-[#084036]">{text(COPY.address)}</div>
            <div className="flex items-center justify-end gap-2">
              <span>{text(pharmacyProfile.address)}</span>
              <MapPin size={14} className="text-[#14b8a6]" />
            </div>
          </div>
        </SectionCard>
      </div>
    </PharmacyLayout>
  );
}
