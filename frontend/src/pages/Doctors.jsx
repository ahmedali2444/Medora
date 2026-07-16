import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Building2,
  CalendarDays,
  ChevronDown,
  MapPin,
  Navigation,
  ScanSearch as Search,
  SlidersHorizontal,
  Star,
  Stethoscope,
  X,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Home_Page/Footer';
import MobileBottomNav from '../components/MobileBottomNav';
import SearchEmptyIcon from '../components/SearchEmptyIcon';
import BookingDialog from '../components/appointments/BookingDialog';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getLocalizedText } from '../utils/localization';
import { resolveImageUrl } from '../utils/professionalApiMappers';
import { medoraApi } from '../api/medoraApi';
import { useSEO } from '../hooks/useSEO';
import LocationPermissionPrompt from '../components/location/LocationPermissionPrompt';
import { formatDistanceKm } from '../utils/locationUtils';

const BRAND = '#0da694';
const BRAND_DK = '#0b5e52';
const DOCTORS_SEARCH_PAGE_SIZE = 50;
const DOCTORS_SEARCH_DEBOUNCE_MS = 350;

/* ─── Copy ─── */
const COPY = {
  heroTitle: { ar: 'ابحث عن عيادة طبيبك', en: 'Find Your Doctor Clinic' },
  heroSub: { ar: 'ابحث باسم الطبيب أو التخصص وشاهد العيادات الأقرب لك للحجز والاطلاع على ملف الطبيب', en: 'Search by doctor or specialty and see the nearest clinics for booking and doctor details' },
  searchPh: { ar: 'ابحث بالاسم أو التخصص...', en: 'Search by name or specialty...' },
  allSpecialties: { ar: 'كل التخصصات', en: 'All Specialties' },
  allGov: { ar: 'كل المحافظات', en: 'All Governorates' },
  allCities: { ar: 'كل المدن', en: 'All Cities' },
  sortLabel: { ar: 'ترتيب حسب', en: 'Sort by' },
  sortNearest: { ar: 'الأقرب لموقعك', en: 'Nearest' },
  sortRating: { ar: 'الأعلى تقييماً', en: 'Highest Rated' },
  sortPriceLow: { ar: 'الأقل سعراً', en: 'Lowest Price' },
  sortPriceHigh: { ar: 'الأعلى سعراً', en: 'Highest Price' },
  fee: { ar: 'ج.م', en: 'EGP' },
  bookNow: { ar: 'احجز الآن', en: 'Book Now' },
  details: { ar: 'ملف الطبيب', en: 'Doctor Profile' },
  reviews: { ar: 'تقييم', en: 'reviews' },
  doctorPrefix: { ar: 'الطبيب المسؤول', en: 'Doctor' },
  workHours: { ar: 'مواعيد العيادة', en: 'Clinic hours' },
  noResults: { ar: 'لا توجد عيادات مطابقة للبحث', en: 'No clinics match your search' },
  resetFilters: { ar: 'إعادة ضبط الفلاتر', en: 'Reset Filters' },
  results: { ar: 'نتيجة', en: 'results' },
  filters: { ar: 'الفلاتر', en: 'Filters' },
  yrsExp: { ar: 'سنة خبرة', en: 'yrs exp' },
};

const DAY_MAP = {
  0: { ar: 'الأحد', en: 'Sun' },
  1: { ar: 'الإثنين', en: 'Mon' },
  2: { ar: 'الثلاثاء', en: 'Tue' },
  3: { ar: 'الأربعاء', en: 'Wed' },
  4: { ar: 'الخميس', en: 'Thu' },
  5: { ar: 'الجمعة', en: 'Fri' },
  6: { ar: 'السبت', en: 'Sat' },
};

/* ─── Dropdown ─── */
const Dropdown = memo(function Dropdown({ value, options, onChange, isRtl }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-[#dbeae8] bg-white px-3 text-[13px] font-semibold text-slate-700 outline-none transition focus:border-[#0da694] focus:ring-2 focus:ring-[#0da694]/20"
        style={{ paddingRight: isRtl ? 12 : 32, paddingLeft: isRtl ? 32 : 12 }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400"
        style={{ [isRtl ? 'left' : 'right']: 10 }}
      />
    </div>
  );
});

const clinicHoursLabel = (workingHours = [], lang = 'ar') => {
  const openDays = workingHours.filter((hour) => !hour.isClosed && (hour.openFrom || hour.openTo));
  if (!openDays.length) return { ar: 'لا توجد مواعيد معلنة', en: 'No published hours' };

  const first = openDays[0];
  const day = DAY_MAP[first.dayOfWeek]?.[lang] || DAY_MAP[first.dayOfWeek]?.ar || '';
  const from = String(first.openFrom || '').slice(0, 5);
  const to = String(first.openTo || '').slice(0, 5);
  const time = from && to ? `${from} - ${to}` : from || to;
  const extra = openDays.length > 1
    ? (lang === 'ar' ? ` +${openDays.length - 1} أيام` : ` +${openDays.length - 1} days`)
    : '';

  return { ar: `${day}: ${time}${extra}`, en: `${day}: ${time}${extra}` };
};

/* ─── Clinic Card ─── */
const ClinicCard = memo(function ClinicCard({ clinic, lang, isRtl, onBook, onDetails }) {
  const t = (v) => getLocalizedText(v, lang);
  const [hovered, setHovered] = useState(false);
  const distanceLabel = formatDistanceKm(clinic.distanceKm, isRtl);
  const clinicTitle = t(clinic.clinicName) || t(clinic.name);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex flex-col overflow-hidden rounded-2xl bg-white transition-all duration-300"
      style={{
        border: hovered ? '1.5px solid #0da69450' : '1.5px solid #e2edec',
        boxShadow: hovered ? '0 12px 32px rgba(13,166,148,0.12)' : '0 2px 8px rgba(0,0,0,0.04)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
      }}
    >
      {/* Top */}
      <div className="flex items-start gap-4 p-5">
        <img
          src={clinic.avatar}
          alt={t(clinic.name)}
          className="h-16 w-16 shrink-0 rounded-2xl object-cover shadow-sm"
          loading="lazy"
        />
        <div className="min-w-0 flex-1" style={{ textAlign: isRtl ? 'right' : 'left' }}>
          <h3 className="truncate text-[15px] font-extrabold text-slate-900">{clinicTitle}</h3>
          <p className="mt-0.5 truncate text-[12px] font-bold text-slate-600">{t(COPY.doctorPrefix)}: {t(clinic.name)}</p>
          <p className="mt-0.5 text-[12px] font-semibold" style={{ color: BRAND }}>{t(clinic.specialty)}</p>
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            <MapPin size={11} className="shrink-0 text-slate-400" />
            <span className="truncate">{t(clinic.city)}، {t(clinic.governorate)}</span>
          </div>
          {t(clinic.clinicAddress) && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
              <Building2 size={11} className="shrink-0 text-slate-400" />
              <span className="truncate">{t(clinic.clinicAddress)}</span>
            </div>
          )}
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            <CalendarDays size={11} className="shrink-0 text-slate-400" />
            <span className="truncate">{t(clinic.hoursLabel)}</span>
          </div>
          {distanceLabel && (
            <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#e6f7f7] px-2 py-0.5 text-[10px] font-extrabold text-[#0e7c6e]">
              <Navigation size={10} />
              {distanceLabel}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mx-5 grid grid-cols-3 gap-2 rounded-xl bg-[#f4fbfa] p-3">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Star size={12} fill="#f4a524" color="#f4a524" />
            <span className="text-[14px] font-black text-slate-800">{clinic.rating}</span>
          </div>
          <p className="mt-0.5 text-[10px] text-slate-500">{clinic.reviewCount} {t(COPY.reviews)}</p>
        </div>
        <div className="text-center">
          <div className="text-[14px] font-black" style={{ color: BRAND }}>{clinic.consultationFee}</div>
          <p className="mt-0.5 text-[10px] text-slate-500">{t(COPY.fee)}</p>
        </div>
        <div className="text-center">
          <div className="text-[14px] font-black text-slate-800">{clinic.experience}</div>
          <p className="mt-0.5 text-[10px] text-slate-500">{t(COPY.yrsExp)}</p>
        </div>
      </div>

      {/* Buttons */}
      <div className="mt-auto flex gap-2 p-5 pt-4">
        <button
          onClick={() => onBook(clinic)}
          className="flex-1 rounded-xl py-2.5 text-[12px] font-bold text-white transition-all hover:opacity-90 active:scale-[0.97]"
          style={{ background: BRAND, boxShadow: `0 4px 14px ${BRAND}40` }}
        >
          {t(COPY.bookNow)}
        </button>
        <button
          onClick={() => onDetails(clinic)}
          className="flex-1 rounded-xl border py-2.5 text-[12px] font-bold transition-all hover:bg-[#f4fbfa] active:scale-[0.97]"
          style={{ borderColor: BRAND, color: BRAND }}
        >
          {t(COPY.details)}
        </button>
      </div>
    </div>
  );
});

const apiName = (value, lang) => (lang === 'ar' ? value?.nameAr : value?.nameEn) || value?.nameAr || value?.nameEn || '';

const mapClinicItem = (item, lang = 'ar') => {
  const doctorName = item.doctorName || item.fullName || '';
  const doctorNameAr = item.doctorNameAr || item.nameAr || doctorName;
  const doctorNameEn = item.doctorNameEn || item.fullNameEn || item.nameEn || doctorName;
  const avatar = resolveImageUrl(item.profileImage, doctorName);
  const clinicName = item.nameAr || item.nameEn || item.addressLine || doctorName;

  return {
    id: item.clinicId || item.doctorId,
    doctorId: item.doctorId,
    clinicId: item.clinicId || null,
    name: { ar: doctorNameAr, en: doctorNameEn },
    clinicName: { ar: clinicName, en: item.nameEn || clinicName },
    clinicAddress: { ar: item.addressLine || '', en: item.addressLine || '' },
    specialty: { ar: item.specialtyNameAr || '', en: item.specialtyNameEn || item.specialtyNameAr || '' },
    city: { ar: item.cityAr || '', en: item.cityEn || item.cityAr || '' },
    governorate: { ar: item.governorateAr || '', en: item.governorateEn || item.governorateAr || '' },
    avatar,
    rating: Number(item.avgRating || 0).toFixed(1),
    reviewCount: item.reviewsCount || 0,
    consultationFee: item.consultationFee || 0,
    reconsultationFee: item.reconsultationFee || 0,
    latitude: item.latitude ?? null,
    longitude: item.longitude ?? null,
    distanceKm: item.distanceKm ?? null,
    experience: item.experienceYears ?? 0,
    appointmentDurationMinutes: item.appointmentDurationMinutes || 15,
    workingHours: Array.isArray(item.workingHours) ? item.workingHours : [],
    hoursLabel: clinicHoursLabel(Array.isArray(item.workingHours) ? item.workingHours : [], lang),
  };
};

const mapLegacyDoctorClinic = (item, lang = 'ar') => {
  const clinic = item.clinics?.[0] || {};
  const name = item.fullName || '';
  const nameAr = clinic.nameAr || name;
  const nameEn = clinic.nameEn || name;
  const avatar = resolveImageUrl(item.profileImage, name);
  const clinicName = clinic.nameAr || clinic.nameEn || clinic.addressLine || name;

  return {
    id: clinic.clinicId || item.doctorId,
    doctorId: item.doctorId,
    clinicId: clinic.clinicId || null,
    name: { ar: nameAr, en: nameEn },
    clinicName: { ar: clinicName, en: clinic.nameEn || clinicName },
    clinicAddress: { ar: clinic.addressLine || '', en: clinic.addressLine || '' },
    specialty: { ar: item.specialtyNameAr || '', en: item.specialtyNameEn || item.specialtyNameAr || '' },
    city: { ar: clinic.cityAr || '', en: clinic.cityEn || clinic.cityAr || '' },
    governorate: { ar: clinic.governorateAr || '', en: clinic.governorateEn || clinic.governorateAr || '' },
    avatar,
    rating: Number(item.avgRating || 0).toFixed(1),
    reviewCount: item.reviewsCount || 0,
    consultationFee: clinic.consultationFee || 0,
    reconsultationFee: clinic.reconsultationFee || 0,
    latitude: clinic.latitude ?? null,
    longitude: clinic.longitude ?? null,
    distanceKm: clinic.distanceKm ?? null,
    experience: item.experienceYears ?? 0,
    appointmentDurationMinutes: clinic.appointmentDurationMinutes || 15,
    workingHours: Array.isArray(clinic.workingHours) ? clinic.workingHours : [],
    hoursLabel: clinicHoursLabel(Array.isArray(clinic.workingHours) ? clinic.workingHours : [], lang),
  };
};

export default function Doctors() {
  const { lang, t: trans } = useLang();
  useSEO({ title: "ابحث عن عيادة طبيب", description: "ابحث باسم الطبيب أو التخصص واعثر على أقرب عيادات الأطباء للحجز والاطلاع على ملف الطبيب عبر ميدورا.", keywords: "عيادة طبيب, حجز موعد, أطباء مصر, تخصصات طبية" });
  const isRtl = trans.dir === 'rtl';
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const t = useCallback((v) => getLocalizedText(v, lang), [lang]);
  const bookingIntent = searchParams.get('intent') === 'booking';

  const [search, setSearch] = useState('');
  const [govFilter, setGovFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [specFilter, setSpecFilter] = useState('');
  const [sortBy, setSortBy] = useState('nearest');
  const [showFilters, setShowFilters] = useState(false);
  const [clinics, setClinics] = useState([]);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [lookups, setLookups] = useState({ governorates: [], cities: [], specialties: [] });
  const [ui, setUi] = useState({ loading: true, error: '' });
  // BUG FIX: proper server-side pagination state — replaces the catastrophic while loop
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const totalPages = Math.ceil(totalResults / DOCTORS_SEARCH_PAGE_SIZE);
  useEffect(() => {
    let mounted = true;
    Promise.allSettled([medoraApi.specialties(), medoraApi.governorates()]).then(([specialtiesResult, governoratesResult]) => {
      if (!mounted) return;
      setLookups((prev) => ({
        ...prev,
        specialties: specialtiesResult.status === 'fulfilled' && Array.isArray(specialtiesResult.value) ? specialtiesResult.value : [],
        governorates: governoratesResult.status === 'fulfilled' && Array.isArray(governoratesResult.value) ? governoratesResult.value : [],
      }));
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const governorate = lookups.governorates.find((item) => item.nameAr === govFilter || item.nameEn === govFilter);
    if (!governorate?.id) {
      queueMicrotask(() => setLookups((prev) => ({ ...prev, cities: [] })));
      return;
    }

    let mounted = true;
    medoraApi.cities(governorate.id)
      .then((data) => {
        if (mounted) setLookups((prev) => ({ ...prev, cities: Array.isArray(data) ? data : [] }));
      })
      .catch(() => setLookups((prev) => ({ ...prev, cities: [] })));
    return () => { mounted = false; };
  }, [govFilter, lookups.governorates]);

  // BUG FIX: single-page fetch — no while loop — debounced and pagination-aware
  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (mounted) setUi({ loading: true, error: '' });
    });

    const timer = setTimeout(() => {
      medoraApi.doctorsSearch({
        name: search,
        specialty: specFilter,
        governorate: govFilter,
        city: cityFilter,
        lat: userLocation?.lat,
        lng: userLocation?.lng,
        page,
        pageSize: DOCTORS_SEARCH_PAGE_SIZE,
      })
        .then((data) => {
          if (!mounted) return;
          const pageItems = Array.isArray(data?.clinicItems) ? data.clinicItems : [];
          const legacyItems = Array.isArray(data?.items) ? data.items : [];
          setClinics(pageItems.length
            ? pageItems.map((item) => mapClinicItem(item, lang))
            : legacyItems.map((item) => mapLegacyDoctorClinic(item, lang)));
          setTotalResults(Number.isFinite(Number(data?.total)) ? Number(data.total) : 0);
          setUi({ loading: false, error: '' });
        })
        .catch((error) => {
          if (!mounted) return;
          setClinics([]);
          setTotalResults(0);
          setUi({ loading: false, error: error.message || 'Unable to load doctors' });
        });
    }, DOCTORS_SEARCH_DEBOUNCE_MS);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [search, govFilter, cityFilter, specFilter, userLocation, page, lang]);

  // Reset to page 1 when filters change
  useEffect(() => {
    queueMicrotask(() => setPage(1));
  }, [search, govFilter, cityFilter, specFilter]);

  const cityOptions = useMemo(() => {
    if (!govFilter) return [];
    return lookups.cities.map((city) => ({ ar: city.nameAr, en: city.nameEn }));
  }, [govFilter, lookups.cities]);

  const govOptions = useMemo(() => [
    { value: '', label: t(COPY.allGov) },
    ...lookups.governorates.map((g) => ({ value: apiName(g, lang), label: apiName(g, lang) })),
  ], [lang, lookups.governorates, t]);

  const cityOpts = useMemo(() => [
    { value: '', label: t(COPY.allCities) },
    ...cityOptions.map((c) => ({ value: c[lang] || c.ar, label: c[lang] || c.ar })),
  ], [cityOptions, lang, t]);

  const specOptions = useMemo(() => [
    { value: '', label: t(COPY.allSpecialties) },
    ...lookups.specialties.map((s) => ({ value: apiName(s, lang), label: apiName(s, lang) })),
  ], [lang, lookups.specialties, t]);

  const sortOptions = useMemo(() => [
    { value: 'nearest', label: t(COPY.sortNearest) },
    { value: 'rating', label: t(COPY.sortRating) },
    { value: 'priceLow', label: t(COPY.sortPriceLow) },
    { value: 'priceHigh', label: t(COPY.sortPriceHigh) },
  ], [t]);

  const filtered = useMemo(() => {
    let list = [...clinics];

    if (sortBy === 'nearest') {
      list.sort((a, b) => {
        const aHasDistance = Number.isFinite(Number(a.distanceKm));
        const bHasDistance = Number.isFinite(Number(b.distanceKm));
        if (aHasDistance !== bHasDistance) return aHasDistance ? -1 : 1;
        if (aHasDistance && bHasDistance) return Number(a.distanceKm) - Number(b.distanceKm);
        return 0;
      });
    }
    else if (sortBy === 'rating') list.sort((a, b) => b.rating - a.rating);
    else if (sortBy === 'priceLow') list.sort((a, b) => a.consultationFee - b.consultationFee);
    else if (sortBy === 'priceHigh') list.sort((a, b) => b.consultationFee - a.consultationFee);

    return list;
  }, [clinics, sortBy]);

  const hasActiveFilters = govFilter || cityFilter || specFilter;

  const resetFilters = () => {
    setSearch('');
    setGovFilter('');
    setCityFilter('');
    setSpecFilter('');
    setSortBy('nearest');
  };

  const dismissBookingIntent = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('intent');
    setSearchParams(nextParams, { replace: true });
  };

  const goDetails = (clinic) => navigate(`/doctors/${clinic.doctorId}${clinic.clinicId ? `?clinicId=${clinic.clinicId}` : ''}`);
  const goBook = (clinic) => {
    if (!isAuthenticated) {
      navigate('/sign-in', { state: { from: location } });
      return;
    }
    setUi((current) => ({ ...current, error: '' }));
    setSelectedClinic(clinic);
  };

  return (
    <div dir={trans.dir} style={{ fontFamily: "'Cairo','Inter',sans-serif", background: '#f4fbfa', minHeight: '100vh' }}>
      <Navbar />

      {/* Hero */}
      <section
        style={{
          background: `linear-gradient(135deg, ${BRAND_DK}, ${BRAND}, #14b8a6)`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -100, left: -60, width: 250, height: 250, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div className="relative mx-auto max-w-6xl px-4 py-7 text-center sm:py-9">
          <div
            className="mx-auto mb-3 flex items-center justify-center"
            style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}
          >
            <Stethoscope style={{ width: 24, height: 24, color: '#fff' }} />
          </div>
          <h1 className="mb-2 text-2xl font-extrabold text-white sm:text-3xl">{t(COPY.heroTitle)}</h1>
          <p className="mx-auto max-w-xl text-xs leading-6 text-white/80 sm:text-sm">{t(COPY.heroSub)}</p>
        </div>
      </section>

      {bookingIntent && (
        <div className="border-b border-[#cde5e2] bg-[#eaf8f6]">
          <div className="mx-auto flex max-w-6xl items-start gap-3 px-4 py-4 sm:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#0da694] shadow-sm">
              <CalendarDays size={19} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-extrabold text-[#084036]">
                {isRtl ? 'جاهز لحجز موعدك؟' : 'Ready to book your appointment?'}
              </h2>
              <p className="mt-1 text-xs leading-6 text-[#38696b]">
                {isRtl
                  ? 'ابحث عن الطبيب المناسب، ثم اضغط «احجز الآن» لاختيار العيادة والموعد المتاح.'
                  : 'Find the right doctor, then select “Book Now” to choose a clinic and an available time.'}
              </p>
            </div>
            <button
              type="button"
              onClick={dismissBookingIntent}
              aria-label={isRtl ? 'إغلاق الرسالة' : 'Dismiss message'}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#5d7c7d] transition hover:bg-white hover:text-[#0da694] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0da694]/30"
            >
              <X size={17} />
            </button>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div style={{ background: '#fff' }}>
        <div className="mx-auto flex max-w-6xl justify-center px-4 py-4">
          <div className="relative w-full max-w-xl">
            <Search
              className="absolute top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              style={{ [isRtl ? 'right' : 'left']: 16 }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t(COPY.searchPh)}
              dir={trans.dir}
              className="w-full rounded-xl text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400"
              style={{
                height: 48,
                paddingLeft: isRtl ? 16 : 48,
                paddingRight: isRtl ? 48 : 16,
                background: '#f4f9f8',
                border: '1.5px solid #dbeae8',
              }}
              onFocus={(e) => { e.target.style.borderColor = BRAND; e.target.style.boxShadow = `0 0 0 3px ${BRAND}20`; }}
              onBlur={(e) => { e.target.style.borderColor = '#dbeae8'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
        </div>
      </div>

      {/* Filter toggle (mobile) */}
      <div className="mx-auto max-w-6xl px-4 md:hidden">
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#dbeae8] bg-white py-2.5 text-[13px] font-bold text-slate-700 transition hover:border-[#0da694]"
        >
          <SlidersHorizontal size={14} style={{ color: BRAND }} />
          {t(COPY.filters)}
          {hasActiveFilters && <span className="h-2 w-2 rounded-full bg-[#0da694]" />}
        </button>
      </div>

      {/* Filters */}
      <div className={`mx-auto max-w-6xl px-4 ${showFilters ? '' : 'hidden md:block'}`}>
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5">
          <Dropdown value={specFilter} options={specOptions} onChange={setSpecFilter} isRtl={isRtl} />
          <Dropdown
            value={govFilter}
            options={govOptions}
            onChange={(v) => { setGovFilter(v); setCityFilter(''); }}
            isRtl={isRtl}
          />
          <Dropdown
            value={cityFilter}
            options={cityOpts}
            onChange={setCityFilter}
            isRtl={isRtl}
          />
          <Dropdown value={sortBy} options={sortOptions} onChange={setSortBy} isRtl={isRtl} />
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 text-[12px] font-bold text-red-500 transition hover:bg-red-100"
            >
              <X size={13} />
              {t(COPY.resetFilters)}
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <main className="mx-auto max-w-6xl px-4 pb-10">
        <LocationPermissionPrompt
          isRtl={isRtl}
          onLocation={setUserLocation}
          locationScope={isAuthenticated ? (user?.userId || user?.email || 'signed-in-user') : ''}
          showRefreshButton
          className="mb-4"
        />
        {/* Count */}
        <div className="mb-5 flex items-center gap-2">
          <Stethoscope size={16} style={{ color: BRAND }} />
          <span className="text-sm font-bold text-slate-700">
            {totalResults} {t(COPY.results)}
          </span>
          {ui.loading && <span className="text-xs font-semibold text-slate-400">...</span>}
        </div>

        {ui.error && <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">{ui.error}</div>}

        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <SearchEmptyIcon />
            <p className="text-base font-medium text-slate-400">{t(COPY.noResults)}</p>
            <button
              onClick={resetFilters}
              className="mt-4 rounded-xl px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
              style={{ background: BRAND }}
            >
              {t(COPY.resetFilters)}
            </button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((clinic) => (
              <ClinicCard
                key={clinic.id}
                clinic={clinic}
                lang={lang}
                isRtl={isRtl}
                onBook={goBook}
                onDetails={goDetails}
              />
            ))}
          </div>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || ui.loading}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#dbeae8] bg-white text-slate-700 transition hover:border-[#0da694] hover:text-[#0da694] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronDown size={16} style={{ transform: isRtl ? 'rotate(-90deg)' : 'rotate(90deg)' }} />
            </button>
            <span className="text-sm font-bold text-slate-700">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || ui.loading}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#dbeae8] bg-white text-slate-700 transition hover:border-[#0da694] hover:text-[#0da694] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronDown size={16} style={{ transform: isRtl ? 'rotate(90deg)' : 'rotate(-90deg)' }} />
            </button>
          </div>
        )}
      </main>

      {selectedClinic && (
        <BookingDialog
          doctor={selectedClinic}
          lang={lang}
          isRtl={isRtl}
          onClose={() => setSelectedClinic(null)}
          isAuthenticated={isAuthenticated}
        />
      )}

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
