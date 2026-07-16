import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Pill, Stethoscope, Store, Trash2 } from 'lucide-react';
import { medoraApi } from '../../api/medoraApi';
import { useLocalizedContent } from '../../hooks/useLocalizedContent';
import { getLocalizedText } from '../../utils/localization';
import { resolveImageUrl, avatarForName } from '../../utils/professionalApiMappers';
import PatientNotificationBell from '../../components/patient/PatientNotificationBell';

const COPY = {
  title: { ar: 'المفضلة', en: 'Favorites' },
  subtitle: { ar: 'الأطباء والصيدليات والأدوية المحفوظة', en: 'Saved doctors, pharmacies, and medicines' },
  tabDoctors: { ar: 'الأطباء', en: 'Doctors' },
  tabPharmacies: { ar: 'الصيدليات', en: 'Pharmacies' },
  tabMedicines: { ar: 'الأدوية', en: 'Medicines' },
  empty: { ar: 'لا توجد عناصر في هذه القائمة', en: 'No items in this list' },
  remove: { ar: 'إزالة', en: 'Remove' },
  loadError: { ar: 'تعذر تحميل المفضلة', en: 'Unable to load favorites' },
  view: { ar: 'عرض', en: 'View' },
};

export default function PatientFavorites() {
  const navigate = useNavigate();
  const { lang, text, isRtl } = useLocalizedContent();
  const [activeTab, setActiveTab] = useState('doctors');
  const [doctors, setDoctors] = useState([]);
  const [pharmacies, setPharmacies] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [doctorsRes, pharmaciesRes, medicinesRes] = await Promise.all([
        medoraApi.favoriteDoctors(),
        medoraApi.favoritePharmacies(),
        medoraApi.favoriteMedicines(),
      ]);
      setDoctors(Array.isArray(doctorsRes) ? doctorsRes : []);
      setPharmacies(Array.isArray(pharmaciesRes) ? pharmaciesRes : []);
      setMedicines(Array.isArray(medicinesRes) ? medicinesRes : []);
    } catch (err) {
      setError(err?.message || text(COPY.loadError));
    } finally {
      setLoading(false);
    }
  }, [text]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const tabs = [
    { id: 'doctors', label: text(COPY.tabDoctors), icon: Stethoscope, count: doctors.length },
    { id: 'pharmacies', label: text(COPY.tabPharmacies), icon: Store, count: pharmacies.length },
    { id: 'medicines', label: text(COPY.tabMedicines), icon: Pill, count: medicines.length },
  ];

  const removeDoctor = async (doctorId) => {
    await medoraApi.removeFavoriteDoctor(doctorId);
    setDoctors((prev) => prev.filter((item) => item.doctorId !== doctorId));
  };

  const removePharmacy = async (pharmacyId) => {
    await medoraApi.removeFavoritePharmacy(pharmacyId);
    setPharmacies((prev) => prev.filter((item) => item.pharmacyId !== pharmacyId));
  };

  const removeMedicine = async (medicineId) => {
    await medoraApi.removeFavoriteMedicine(medicineId);
    setMedicines((prev) => prev.filter((item) => item.medicineId !== medicineId));
  };

  const renderList = () => {
    if (activeTab === 'doctors') {
      if (!doctors.length) return <EmptyState text={text(COPY.empty)} />;
      return doctors.map((doctor) => (
        <FavoriteCard
          key={doctor.doctorId}
          title={doctor.fullName}
          subtitle={getLocalizedText({ ar: doctor.specialtyNameAr, en: doctor.specialtyNameEn }, lang, '')}
          meta={`★ ${Number(doctor.avgRating || 0).toFixed(1)} (${doctor.reviewsCount || 0})`}
          image={resolveImageUrl(doctor.profileImageUrl, doctor.fullName) || avatarForName(doctor.fullName)}
          onView={() => navigate(`/doctors/${doctor.doctorId}`)}
          onRemove={() => removeDoctor(doctor.doctorId)}
          viewLabel={text(COPY.view)}
          removeLabel={text(COPY.remove)}
        />
      ));
    }

    if (activeTab === 'pharmacies') {
      if (!pharmacies.length) return <EmptyState text={text(COPY.empty)} />;
      return pharmacies.map((pharmacy) => (
        <FavoriteCard
          key={pharmacy.pharmacyId}
          title={pharmacy.pharmacyName}
          subtitle={getLocalizedText({ ar: pharmacy.cityAr, en: pharmacy.cityEn }, lang, '')}
          meta={`★ ${Number(pharmacy.avgRating || 0).toFixed(1)} (${pharmacy.reviewsCount || 0})`}
          image={resolveImageUrl(pharmacy.profileImageUrl, pharmacy.pharmacyName) || avatarForName(pharmacy.pharmacyName)}
          onView={() => navigate(`/pharmacies/${pharmacy.pharmacyId}`)}
          onRemove={() => removePharmacy(pharmacy.pharmacyId)}
          viewLabel={text(COPY.view)}
          removeLabel={text(COPY.remove)}
        />
      ));
    }

    if (!medicines.length) return <EmptyState text={text(COPY.empty)} />;
    return medicines.map((medicine) => (
      <FavoriteCard
        key={medicine.medicineId}
        title={medicine.name}
        subtitle={medicine.company || medicine.activeIngredient || ''}
        meta={medicine.form ? `${medicine.form}${medicine.strength ? ` · ${medicine.strength}` : ''}` : ''}
        image={medicine.imageUrl || null}
        fallbackIcon={Pill}
        onView={() => navigate(`/medicine/${medicine.medicineId}`)}
        onRemove={() => removeMedicine(medicine.medicineId)}
        viewLabel={text(COPY.view)}
        removeLabel={text(COPY.remove)}
      />
    ));
  };

  return (
    <div style={{ fontFamily: 'Cairo, sans-serif' }}>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#084036]">{text(COPY.title)}</h1>
        <p className="mt-1 text-sm text-slate-500">{text(COPY.subtitle)}</p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
              activeTab === tab.id
                ? 'bg-[#14b8a6] text-white shadow-md shadow-[#14b8a6]/20'
                : 'border border-[#e4eeee] bg-white text-slate-600 hover:border-[#14b8a6]'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px]">{tab.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[#e4eeee] bg-white p-8 text-center text-sm text-slate-500">
          {isRtl ? 'جارٍ التحميل...' : 'Loading...'}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center text-sm text-red-600">{error}</div>
      ) : (
        <div className="space-y-3">{renderList()}</div>
      )}
    </div>
  );
}

function EmptyState({ text: label }) {
  return (
    <div className="rounded-2xl border border-[#e4eeee] bg-white p-10 text-center">
      <Heart size={36} className="mx-auto text-[#14b8a6]" />
      <p className="mt-4 text-sm font-bold text-slate-600">{label}</p>
    </div>
  );
}

function FavoriteCard({ title, subtitle, meta, image, fallbackIcon: FallbackIcon, onView, onRemove, viewLabel, removeLabel }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-[#e4eeee] bg-white p-4 shadow-sm">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#eefbf8]">
        {image ? (
          <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          FallbackIcon ? <FallbackIcon size={24} className="text-[#14b8a6]" /> : null
        )}
      </div>
      <div className="min-w-0 flex-1 text-start">
        <div className="truncate text-sm font-black text-[#084036]">{title}</div>
        {subtitle && <div className="truncate text-xs text-slate-500">{subtitle}</div>}
        {meta && <div className="mt-1 text-[11px] font-bold text-[#14b8a6]">{meta}</div>}
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
        <button type="button" onClick={onView} className="rounded-lg border border-[#e4eeee] px-3 py-1.5 text-[11px] font-bold text-[#295d60] hover:border-[#14b8a6]">
          {viewLabel}
        </button>
        <button type="button" onClick={onRemove} className="inline-flex items-center justify-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-100">
          <Trash2 size={12} />
          {removeLabel}
        </button>
      </div>
    </div>
  );
}
