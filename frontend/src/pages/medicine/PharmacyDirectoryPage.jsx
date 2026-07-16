import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Clock3, MapPin, Navigation, Search, Store, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import MedicineLayout from '../../components/medicine/layout/MedicineLayout';
import { medoraApi } from '../../api/medoraApi';
import { useLang } from '../../context/LanguageContext';
import { useSEO } from '../../hooks/useSEO';
import LocationPermissionPrompt from '../../components/location/LocationPermissionPrompt';
import { formatDistanceKm } from '../../utils/locationUtils';
import { isPharmacyOpen } from '../../utils/pharmacyMappers';

function mapPharmacy(item, lang = 'ar') {
  const city = item.cityAr || item.cityEn || '';
  const governorate = item.governorateAr || item.governorateEn || '';
  return {
    id: item.pharmacyId,
    name: (lang === 'en' && item.pharmacyNameEn ? item.pharmacyNameEn : item.pharmacyName) || '',
    address: [item.addressLine, city, governorate].filter(Boolean).join('، '),
    area: city || governorate,
    phone: item.phone || '',
    openFrom: item.openFrom,
    openTo: item.openTo,
    is24Hours: item.is24Hours,
    status: item.status,
    open: isPharmacyOpen(item),
    latitude: item.latitude ?? null,
    longitude: item.longitude ?? null,
    distanceKm: item.distanceKm ?? null,
    reviewsCount: item.reviewsCount || 0,
    avgRating: Number(item.avgRating || 0),
  };
}

export default function PharmacyDirectoryPage() {
  const { t } = useLang();
  const isRtl = t.dir === 'rtl';
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;
  const [query, setQuery] = useState('');
  const [pharmacies, setPharmacies] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [ui, setUi] = useState({ loading: true, error: '' });

  useSEO({
    title: isRtl ? 'العثور على صيدلية' : 'Find a Pharmacy',
    description: isRtl
      ? 'اعثر على صيدلية قريبة وتصفح الأدوية المتوفرة داخل كل فرع.'
      : 'Find a nearby pharmacy and browse the medicines available at each branch.',
  });

  useEffect(() => {
    let mounted = true;
    const timer = window.setTimeout(() => {
      setUi({ loading: true, error: '' });
      medoraApi.pharmaciesSearch({ name: query.trim(), lat: userLocation?.lat, lng: userLocation?.lng, page: 1, pageSize: 50 })
        .then((data) => {
          if (!mounted) return;
          const items = Array.isArray(data?.items) ? data.items : [];
          setPharmacies(items.map((p) => mapPharmacy(p, lang)));
          setUi({ loading: false, error: '' });
        })
        .catch((error) => {
          if (!mounted) return;
          setPharmacies([]);
          setUi({ loading: false, error: error.message || 'Unable to load pharmacies' });
        });
    }, 250);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [query, userLocation]);

  const sortedPharmacies = useMemo(
    () => [...pharmacies].sort((first, second) => {
      const firstDistance = Number.isFinite(Number(first.distanceKm)) ? Number(first.distanceKm) : Number.POSITIVE_INFINITY;
      const secondDistance = Number.isFinite(Number(second.distanceKm)) ? Number(second.distanceKm) : Number.POSITIVE_INFINITY;
      if (firstDistance !== secondDistance) return firstDistance - secondDistance;
      return Number(second.open) - Number(first.open) || first.name.localeCompare(second.name);
    }),
    [pharmacies],
  );

  return (
    <MedicineLayout>
      <div dir={t.dir} className="min-h-[70vh] bg-[#f3fafa] pb-10" style={{ fontFamily: 'Cairo, sans-serif' }}>
        <section className="border-b border-[#d7e7e5] bg-gradient-to-l from-[#2f7f7f] to-[#119a8a] text-white">
          <div className="mx-auto max-w-6xl px-4 py-8 text-center sm:px-6 sm:py-10">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <Store size={23} />
            </div>
            <h1 className="mt-3 text-2xl font-black sm:text-3xl">
              {isRtl ? 'اعثر على صيدلية مناسبة' : 'Find the right pharmacy'}
            </h1>
            <p className="mx-auto mt-2 max-w-2xl text-xs leading-6 text-white/80 sm:text-sm">
              {isRtl
                ? 'اختر صيدلية قريبة، ثم تصفّح الأدوية المتوفرة فيها أو ابحث داخل مخزون الفرع.'
                : 'Choose a pharmacy, then browse its available medicines or search branch inventory.'}
            </p>
          </div>
        </section>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <LocationPermissionPrompt isRtl={isRtl} onLocation={setUserLocation} showRefreshButton className="mb-4" />
          <div className="mx-auto max-w-2xl">
            <label className="relative block">
              <Search size={18} className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-[#14b8a6]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={isRtl ? 'ابحث باسم الصيدلية أو المنطقة...' : 'Search by pharmacy name or area...'}
                className="h-13 w-full rounded-2xl border border-[#d7e7e5] bg-white px-5 pe-12 text-sm text-[#084036] outline-none shadow-[0_8px_24px_rgba(41,93,96,0.06)] transition focus:border-[#14b8a6] focus:ring-4 focus:ring-[#14b8a6]/10"
              />
            </label>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <p className="text-xs font-bold text-[#5f7a7c]">
              {isRtl ? `${sortedPharmacies.length} صيدلية` : `${sortedPharmacies.length} pharmacies`}
            </p>
            <p className="text-xs text-slate-500">
              {ui.loading ? '...' : isRtl ? 'البيانات من قاعدة المنصة' : 'Live platform data'}
            </p>
          </div>

          {ui.error && <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">{ui.error}</div>}

          {sortedPharmacies.length > 0 ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {sortedPharmacies.map((pharmacy) => (
                (() => {
                  const distanceLabel = formatDistanceKm(pharmacy.distanceKm, isRtl);
                  return (
                <Link
                  key={pharmacy.id}
                  to={`/medicine/pharmacies/${pharmacy.id}`}
                  className="group rounded-[24px] border border-[#d7e7e5] bg-white p-5 shadow-[0_10px_28px_rgba(41,93,96,0.07)] outline-none transition hover:-translate-y-1 hover:border-[#14b8a6]/60 hover:shadow-[0_18px_38px_rgba(41,93,96,0.12)] focus-visible:ring-4 focus-visible:ring-[#14b8a6]/20"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-[#e6f7f7] text-[#119a8a]">
                      <Store size={23} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-base font-black text-[#084036]">{pharmacy.name}</h2>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${pharmacy.open ? 'bg-[#e6f7f7] text-[#0e7c6e]' : 'bg-slate-100 text-slate-500'}`}>
                          {pharmacy.open ? (isRtl ? 'مفتوحة الآن' : 'Open now') : (isRtl ? 'مغلقة الآن' : 'Closed now')}
                        </span>
                        {distanceLabel && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#e6f7f7] px-2.5 py-1 text-[10px] font-extrabold text-[#0e7c6e]">
                            <Navigation size={11} />
                            {distanceLabel}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 flex items-start gap-1.5 text-xs leading-6 text-slate-500">
                        <MapPin size={13} className="mt-1 shrink-0 text-[#14b8a6]" />
                        <span>{pharmacy.address || pharmacy.area}</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-[#f7fbfb] px-2 py-2.5">
                      <div className="text-xs font-black text-[#295d60]">{pharmacy.area || '-'}</div>
                      <div className="mt-0.5 text-[9px] text-slate-500">{isRtl ? 'المنطقة' : 'Area'}</div>
                    </div>
                    <div className="rounded-xl bg-[#f7fbfb] px-2 py-2.5">
                      <div className="text-xs font-black text-[#295d60]">{pharmacy.avgRating.toFixed(1)}</div>
                      <div className="mt-0.5 text-[9px] text-slate-500">{isRtl ? 'التقييم' : 'Rating'}</div>
                    </div>
                    <div className="rounded-xl bg-[#f7fbfb] px-2 py-2.5">
                      <div className="flex items-center justify-center gap-1 text-xs font-black text-[#295d60]">
                        {pharmacy.is24Hours ? <Truck size={12} /> : <Clock3 size={12} />}
                        {pharmacy.is24Hours ? '24h' : pharmacy.openFrom || '-'}
                      </div>
                      <div className="mt-0.5 truncate text-[9px] text-slate-500">{isRtl ? 'العمل' : 'Hours'}</div>
                    </div>
                  </div>

                  <div className="mt-4 inline-flex items-center gap-2 text-xs font-extrabold text-[#119a8a] transition group-hover:gap-3">
                    {isRtl ? 'عرض الصيدلية والأدوية' : 'View pharmacy and medicines'}
                    <ArrowIcon size={14} />
                  </div>
                </Link>
                  );
                })()
              ))}
            </div>
          ) : (
            !ui.loading && (
              <div className="mt-6 rounded-3xl border border-dashed border-[#cfe4e2] bg-white px-6 py-12 text-center">
                <Store className="mx-auto text-[#14b8a6]" size={30} />
                <h2 className="mt-3 font-black text-[#084036]">
                  {isRtl ? 'لم نجد صيدلية مطابقة' : 'No matching pharmacy found'}
                </h2>
              </div>
            )
          )}
        </main>
      </div>
    </MedicineLayout>
  );
}
