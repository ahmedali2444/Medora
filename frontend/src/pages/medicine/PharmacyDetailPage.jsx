import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Clock3, Flag, Heart, MapPin, Navigation, Phone, Search, Store, Truck } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import MedicineLayout from '../../components/medicine/layout/MedicineLayout';
import MedicineResultCard from '../../components/medicine/results/MedicineResultCard';
import CartFab from '../../components/medicine/layout/CartFab';
import CartDrawer from '../../components/medicine/layout/CartDrawer';
import FavoritesDrawer from '../../components/medicine/layout/FavoritesDrawer';
import ReportModal from '../../components/shared/ReportModal';
import { medoraApi } from '../../api/medoraApi';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';
import { useSEO } from '../../hooks/useSEO';
import { getDirectionsUrl } from '../../utils/locationUtils';
import { isPharmacyOpen } from '../../utils/pharmacyMappers';

function mapPharmacy(item, lang = 'ar') {
  const city = item.cityAr || item.cityEn || '';
  const governorate = item.governorateAr || item.governorateEn || '';
  return {
    id: item.pharmacyId,
    name: (lang === 'en' && item.pharmacyNameEn ? item.pharmacyNameEn : item.pharmacyName) || '',
    address: [item.addressLine, city, governorate].filter(Boolean).join('، '),
    phone: item.phone || '',
    openFrom: item.openFrom,
    openTo: item.openTo,
    is24Hours: item.is24Hours,
    status: item.status,
    open: isPharmacyOpen(item),
    latitude: item.latitude ?? null,
    longitude: item.longitude ?? null,
  };
}

function mapMedicine(item) {
  const name = item.name || '';
  const activeIngredient = item.activeIngredient || '';
  const price = Number(item.price ?? item.minPrice ?? 0);
  return {
    id: item.id,
    name: { ar: name, en: name },
    image: item.imageUrl || null,
    company: item.company || activeIngredient || '',
    category: item.category || 'medicine',
    categoryLabel: { ar: item.category || 'الأدوية', en: item.category || 'Medicines' },
    price,
    description: {
      ar: [activeIngredient, item.form, item.strength].filter(Boolean).join(' - '),
      en: [activeIngredient, item.form, item.strength].filter(Boolean).join(' - '),
    },
    isAvailable: Boolean(item.isAvailable),
    deliveryAvailable: true,
    pickupAvailable: true,
    rating: 0,
    reviewCount: 0,
    activeIngredient: { ar: activeIngredient, en: activeIngredient },
    symptoms: Array.isArray(item.symptoms) ? item.symptoms : [],
  };
}

export default function PharmacyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLang();
  const { isAuthenticated, user } = useAuth();
  const isRtl = t.dir === 'rtl';
  const isPatient = [user?.role, user?.accountType].filter(Boolean).map((item) => String(item).toLowerCase()).includes('patient');
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;
  const [query, setQuery] = useState('');
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [pharmacy, setPharmacy] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [ui, setUi] = useState({ loading: true, error: '', status: null });
  const [inventoryUi, setInventoryUi] = useState({ loading: true, error: '', total: 0 });

  useSEO({
    title: pharmacy ? pharmacy.name : isRtl ? 'الصيدلية' : 'Pharmacy',
    description: isRtl
      ? 'تصفح الأدوية المتوفرة داخل الصيدلية وابحث في مخزون الفرع.'
      : 'Browse available medicines and search this pharmacy inventory.',
  });

  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (mounted) setUi({ loading: true, error: '' });
    });
    medoraApi.pharmacy(id)
      .then((data) => {
        if (!mounted) return;
        setPharmacy(mapPharmacy(data, lang));
        setUi({ loading: false, error: '', status: null });
      })
      .catch((error) => {
        if (!mounted) return;
        setPharmacy(null);
        setUi({ loading: false, error: error.message || 'Unable to load pharmacy', status: error.status });
      });
    return () => { mounted = false; };
  }, [id]);

  useEffect(() => {
    let mounted = true;
    const timer = window.setTimeout(() => {
      setInventoryUi((current) => ({ ...current, loading: true, error: '' }));
      medoraApi.pharmacyPublicMedicines(id, { search: query.trim(), page: 1, pageSize: 60 })
        .then((data) => {
          if (!mounted) return;
          const items = Array.isArray(data?.items) ? data.items : [];
          setMedicines(items.map(mapMedicine));
          setInventoryUi({ loading: false, error: '', total: Number(data?.total || items.length) });
        })
        .catch((error) => {
          if (!mounted) return;
          setMedicines([]);
          setInventoryUi({ loading: false, error: error.message || 'Unable to load inventory', total: 0 });
        });
    }, 250);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [id, query]);

  useEffect(() => {
    if (!isAuthenticated || !isPatient || !id) {
      setIsFavorite(false);
      return undefined;
    }

    let mounted = true;
    medoraApi.favoritePharmacies()
      .then((items) => {
        if (!mounted) return;
        const list = Array.isArray(items) ? items : [];
        setIsFavorite(list.some((item) => String(item.pharmacyId) === String(id)));
      })
      .catch((error) => {
        if (mounted) setIsFavorite(false);
        console.warn('Unable to load favorite pharmacies', error);
      });

    return () => { mounted = false; };
  }, [id, isAuthenticated, isPatient]);

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      navigate('/sign-in', { state: { from: location } });
      return;
    }
    if (!isPatient) return;

    setFavoriteBusy(true);
    try {
      if (isFavorite) {
        await medoraApi.removeFavoritePharmacy(id);
        setIsFavorite(false);
      } else {
        await medoraApi.addFavoritePharmacy(id);
        setIsFavorite(true);
      }
    } catch (error) {
      setUi((current) => ({ ...current, error: error.message || 'Unable to update favorites' }));
    } finally {
      setFavoriteBusy(false);
    }
  };

  const pharmacyHours = useMemo(() => {
    if (!pharmacy) return '';
    if (pharmacy.is24Hours) return '24h';
    return [pharmacy.openFrom, pharmacy.openTo].filter(Boolean).join(' - ');
  }, [pharmacy]);
  const directionsUrl = pharmacy ? getDirectionsUrl(pharmacy, pharmacy.address) : '';

  if (!ui.loading && !pharmacy) {
    const isNotFound = ui.status === 404;
    return (
      <MedicineLayout>
        <div dir={t.dir} className="mx-auto max-w-3xl px-4 py-12 text-center" style={{ fontFamily: 'Cairo, sans-serif' }}>
          <div className="rounded-3xl border border-[#d7e7e5] bg-white p-8">
            <Store size={34} className="mx-auto text-[#14b8a6]" />
            <h1 className="mt-4 text-2xl font-black text-[#084036]">
              {isNotFound
                ? (isRtl ? 'الصيدلية غير موجودة' : 'Pharmacy not found')
                : (isRtl ? 'تعذر تحميل الصيدلية' : 'Unable to load pharmacy')}
            </h1>
            {ui.error && !isNotFound && <p className="mt-2 text-xs text-slate-500">{ui.error}</p>}
            <Link to="/medicine/pharmacies" className="mt-5 inline-flex rounded-full bg-[#14b8a6] px-5 py-3 text-sm font-extrabold text-white">
              {isRtl ? 'العودة إلى الصيدليات' : 'Back to pharmacies'}
            </Link>
          </div>
        </div>
      </MedicineLayout>
    );
  }

  return (
    <MedicineLayout>
      <div dir={t.dir} className="min-h-[70vh] bg-[#f3fafa] pb-10" style={{ fontFamily: 'Cairo, sans-serif' }}>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <Link to="/medicine/pharmacies" className="inline-flex items-center gap-2 text-xs font-extrabold text-[#119a8a] transition hover:gap-3">
            <BackIcon size={14} />
            {isRtl ? 'العودة إلى دليل الصيدليات' : 'Back to pharmacy directory'}
          </Link>

          <section className="mt-4 overflow-hidden rounded-[28px] border border-[#d7e7e5] bg-white shadow-[0_14px_34px_rgba(41,93,96,0.08)]">
            <div className="bg-gradient-to-l from-[#e6f7f7] to-white p-5 sm:p-7">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-[#14b8a6] text-white shadow-[0_12px_24px_rgba(20,184,166,0.25)]">
                  <Store size={29} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-black text-[#084036] sm:text-2xl">{pharmacy?.name || '...'}</h1>
                    {pharmacy && (
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${pharmacy.open ? 'bg-white text-[#0e7c6e]' : 'bg-slate-100 text-slate-500'}`}>
                        {pharmacy.open ? (isRtl ? 'مفتوحة الآن' : 'Open now') : (isRtl ? 'مغلقة الآن' : 'Closed now')}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 flex items-start gap-2 text-xs leading-6 text-slate-600">
                    <MapPin size={14} className="mt-1 shrink-0 text-[#14b8a6]" />
                    {pharmacy?.address || '...'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleToggleFavorite}
                    disabled={favoriteBusy}
                    className="inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-xs font-extrabold transition disabled:opacity-60"
                    style={{
                      color: isFavorite ? '#119a8a' : '#2d6669',
                      borderColor: isFavorite ? '#14b8a6' : '#14b8a6/30',
                      background: isFavorite ? '#e6f7f7' : '#ffffff',
                    }}
                  >
                    <Heart size={14} fill={isFavorite ? '#14b8a6' : 'none'} />
                    {isFavorite ? (isRtl ? 'في المفضلة' : 'Favorited') : (isRtl ? 'المفضلة' : 'Favorite')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isAuthenticated) {
                        navigate('/sign-in', { state: { from: location } });
                        return;
                      }
                      setShowReport(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-[#14b8a6]/30 bg-white px-4 py-2.5 text-xs font-extrabold text-[#486466] transition hover:border-[#14b8a6] hover:text-[#119a8a]"
                  >
                    <Flag size={14} />
                    {isRtl ? 'إبلاغ' : 'Report'}
                  </button>
                  {directionsUrl && (
                    <a href={directionsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full border border-[#14b8a6]/30 bg-white px-4 py-2.5 text-xs font-extrabold text-[#119a8a] transition hover:border-[#14b8a6]">
                      <Navigation size={14} />
                      {isRtl ? 'الاتجاهات' : 'Directions'}
                    </a>
                  )}
                  {pharmacy?.phone && (
                    <a href={`tel:${pharmacy.phone}`} className="inline-flex items-center justify-center gap-2 rounded-full border border-[#14b8a6]/30 bg-white px-4 py-2.5 text-xs font-extrabold text-[#119a8a] transition hover:border-[#14b8a6]">
                      <Phone size={14} />
                      {pharmacy.phone}
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-px bg-[#e4eeee] sm:grid-cols-3">
              <div className="flex items-center gap-3 bg-white px-5 py-3.5">
                <Clock3 size={17} className="text-[#14b8a6]" />
                <div>
                  <div className="text-[10px] text-slate-500">{isRtl ? 'ساعات العمل' : 'Opening hours'}</div>
                  <div className="text-xs font-extrabold text-[#295d60]">{pharmacyHours || '-'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white px-5 py-3.5">
                <Store size={17} className="text-[#14b8a6]" />
                <div>
                  <div className="text-[10px] text-slate-500">{isRtl ? 'مخزون الفرع' : 'Branch inventory'}</div>
                  <div className="text-xs font-extrabold text-[#295d60]">
                    {inventoryUi.total} {isRtl ? 'دواء متوفر' : 'medicines available'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white px-5 py-3.5">
                <Truck size={17} className="text-[#14b8a6]" />
                <div>
                  <div className="text-[10px] text-slate-500">{isRtl ? 'طريقة الاستلام' : 'Fulfillment'}</div>
                  <div className="text-xs font-extrabold text-[#295d60]">
                    {isRtl ? 'استلام أو توصيل' : 'Pickup or delivery'}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6">
            <div className="rounded-3xl border border-[#d7e7e5] bg-white p-4 shadow-[0_10px_28px_rgba(41,93,96,0.06)]">
              <label className="relative block">
                <Search size={17} className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-[#14b8a6]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={isRtl ? 'ابحث عن دواء داخل هذه الصيدلية...' : 'Search medicines in this pharmacy...'}
                  className="h-12 w-full rounded-xl border border-[#d7e7e5] bg-[#f8fbfb] px-4 pe-11 text-sm text-[#084036] outline-none focus:border-[#14b8a6] focus:ring-2 focus:ring-[#14b8a6]/10"
                />
              </label>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-[#084036]">
                {isRtl ? 'الأدوية المتوفرة في الصيدلية' : 'Medicines available at this pharmacy'}
              </h2>
              <span className="text-xs font-bold text-[#119a8a]">
                {inventoryUi.loading ? '...' : isRtl ? `${medicines.length} نتيجة` : `${medicines.length} results`}
              </span>
            </div>

            {inventoryUi.error && <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">{inventoryUi.error}</div>}

            {medicines.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 gap-5 rounded-[28px] border border-[#d7e7e5] bg-white p-4 shadow-[0_14px_35px_rgba(41,93,96,0.08)] sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
                {medicines.map((medicine, index) => (
                  <MedicineResultCard
                    key={medicine.id}
                    {...medicine}
                    index={index}
                    pharmacyId={Number(id)}
                    purchaseDisabled={Boolean(pharmacy && !pharmacy.open)}
                  />
                ))}
              </div>
            ) : (
              !inventoryUi.loading && (
                <div className="mt-4 rounded-3xl border border-dashed border-[#cfe4e2] bg-white px-6 py-12 text-center">
                  <Search size={28} className="mx-auto text-[#14b8a6]" />
                  <h3 className="mt-3 font-black text-[#084036]">
                    {isRtl ? 'الدواء غير موجود في مخزون هذا الفرع' : 'Medicine not found in this branch'}
                  </h3>
                </div>
              )
            )}
          </section>
        </main>
      </div>

      <CartFab onOpenFavorites={() => setFavoritesOpen(true)} />
      <CartDrawer />
      <FavoritesDrawer open={favoritesOpen} onClose={() => setFavoritesOpen(false)} />
      <ReportModal
        open={showReport}
        onClose={() => setShowReport(false)}
        targetType="pharmacy"
        targetId={Number(id)}
        targetLabel={pharmacy?.name || ''}
      />
    </MedicineLayout>
  );
}
