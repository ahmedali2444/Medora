import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  ChevronDown,
  Filter,
  Layers,
  Pill,
  ScanSearch as SearchIcon,
  Sparkles,
  Store,
  Truck,
  X,
} from 'lucide-react';
import MedicineLayout from '../../components/medicine/layout/MedicineLayout';
import MedicineFiltersPanel from '../../components/medicine/filters/MedicineFiltersPanel';
import MedicineResultsGrid from '../../components/medicine/results/MedicineResultsGrid';
import CartFab from '../../components/medicine/layout/CartFab';
import CartDrawer from '../../components/medicine/layout/CartDrawer';
import FavoritesDrawer from '../../components/medicine/layout/FavoritesDrawer';
import DeliveryOptionSheet from '../../components/medicine/layout/DeliveryOptionSheet';
import { useToast } from '../../components/medicine/layout/ToastContext';
import {
  MEDICINE_CATEGORY_META,
  MEDICINE_INVENTORY,
  MEDICINE_SIDEBAR_CATEGORIES,
  MEDICINE_SYMPTOM_LABELS,
  filterMedicines,
  getMedicineSortOptions,
  sortMedicines,
  SORT_KEYS,
} from '../../components/medicine/data/medicineData';
import { useLang } from '../../context/LanguageContext';
import { getLocalizedText } from '../../utils/localization';
import { scanMedicineImage, fileToDataUrl } from '../../api/aiApi';
import { medoraApi } from '../../api/medoraApi';

const EXPERIENCE_POINTS = [
  {
    Icon: Sparkles,
    title: { ar: 'بحث ذكي', en: 'Smart search' },
    description: {
      ar: 'ابحث بالاسم التجاري، المادة الفعالة، أو اسم الشركة.',
      en: 'Search by brand name, active ingredient, or company name.',
    },
  },
  {
    Icon: Camera,
    title: { ar: 'صوّر الدواء', en: 'Scan medicine' },
    description: {
      ar: 'ارفع صورة الدواء ونعرفه تلقائيًا خلال ثوانٍ.',
      en: 'Upload a medicine photo and identify it automatically in seconds.',
    },
  },
  {
    Icon: Truck,
    title: { ar: 'توصيل أو استلام', en: 'Delivery or pickup' },
    description: {
      ar: 'استلمه من أقرب صيدلية أو اطلبه يوصلك للبيت.',
      en: 'Pick it up from a nearby pharmacy or get it delivered home.',
    },
  },
];

const PRICE_MIN = 0;
const PRICE_MAX = 500;
const SEARCH_LISTBOX_ID = 'medicine-search-suggestions';

function readRecentSearches() {
  if (typeof window === 'undefined') return [];

  try {
    const saved = window.localStorage.getItem('medora_recent_searches');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function buildSearchBlob(medicine) {
  return [
    getLocalizedText(medicine.name, 'ar', medicine.name),
    getLocalizedText(medicine.name, 'en', medicine.name),
    medicine.company,
    getLocalizedText(medicine.categoryLabel || medicine.category, 'ar', medicine.category),
    getLocalizedText(medicine.categoryLabel || medicine.category, 'en', medicine.category),
    getLocalizedText(medicine.activeIngredient, 'ar', medicine.activeIngredient),
    getLocalizedText(medicine.activeIngredient, 'en', medicine.activeIngredient),
    ...(medicine.searchTerms || []),
  ]
    .join(' ')
    .toLowerCase();
}

function getInteractionWarning(query) {
  const normalizedQuery = query.toLowerCase();
  const hasPanadol = normalizedQuery.includes('بانادول') || normalizedQuery.includes('panadol');
  const hasBrufen =
    normalizedQuery.includes('بروفين') ||
    normalizedQuery.includes('brufen') ||
    normalizedQuery.includes('ibuprofen');

  return hasPanadol && hasBrufen
    ? {
        ar: 'تنبيه: يُنصح باستشارة طبيب قبل الجمع بين بانادول وبروفين معًا.',
        en: 'Notice: it is recommended to consult a doctor before combining Panadol and Brufen.',
      }
    : null;
}

export default function MedicinePage() {
  const { lang, t } = useLang();
  const isRtl = t.dir === 'rtl';
  const { showToast } = useToast();
  const fileInputRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const [draftQuery, setDraftQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSymptom, setSelectedSymptom] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [drugWarning, setDrugWarning] = useState(null);
  const [recentSearches, setRecentSearches] = useState(readRecentSearches);
  const [priceRange, setPriceRange] = useState(PRICE_MAX);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [deliveryOnly, setDeliveryOnly] = useState(false);
  const [pickupOnly, setPickupOnly] = useState(false);
  const [sortBy, setSortBy] = useState(SORT_KEYS.bestSelling);
  const [searchFocused, setSearchFocused] = useState(false);
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState(-1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [fulfillmentFor, setFulfillmentFor] = useState(null);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const [apiMedicines, setApiMedicines] = useState([]);
  
  useEffect(() => {
    medoraApi.medicineSearch({ pageSize: 1000 }).then(res => {
      if (res && res.items) {
        const mapped = res.items.map(m => {
          let symptoms = [];
          try { symptoms = m.symptomsJson ? JSON.parse(m.symptomsJson) : []; } catch (e) {}
          return {
            id: String(m.id),
            name: { ar: m.name, en: m.name },
            activeIngredient: { ar: m.activeIngredient || '', en: m.activeIngredient || '' },
            company: m.company || '',
            price: m.minPrice || 0,
            form: { ar: m.form || '', en: m.form || '' },
            strength: m.strength || '',
            category: m.category || 'other',
            categoryLabel: { ar: m.category || 'أخرى', en: m.category || 'Other' },
            requiresPrescription: false,
            deliveryAvailable: true,
            pickupAvailable: true,
            isAvailable: m.isAvailable,
            rating: m.avgRating || 0,
            reviewsCount: m.reviewCount || 0,
            image: m.imageUrl || 'https://images.unsplash.com/photo-1584308666744-24d5e4b7fbfe?auto=format&fit=crop&q=80&w=400',
            searchTerms: symptoms,
          };
        });
        setApiMedicines(mapped);
      }
    }).catch(console.error);
  }, []);

  const combinedInventory = useMemo(() => {
    const existingIds = new Set(MEDICINE_INVENTORY.map(m => String(m.id)));
    const newFromApi = apiMedicines.filter(m => !existingIds.has(m.id));
    return [...MEDICINE_INVENTORY, ...newFromApi];
  }, [apiMedicines]);


  useEffect(() => {
    if (!filtersOpen || typeof document === 'undefined') {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [filtersOpen]);

  const filteredMedicines = useMemo(
    () =>
      sortMedicines(
        filterMedicines(combinedInventory, {
          query: submittedQuery,
          category: selectedCategory,
          symptom: selectedSymptom,
          maxPrice: priceRange,
          availableOnly,
          deliveryOnly,
          pickupOnly,
          fulfillmentFor,
        }),
        sortBy,
      ),
    [
      availableOnly,
      deliveryOnly,
      pickupOnly,
      priceRange,
      selectedCategory,
      selectedSymptom,
      sortBy,
      submittedQuery,
    ],
  );

  const locale = isRtl ? 'ar-EG' : 'en-US';
  const sortOptions = useMemo(() => getMedicineSortOptions(lang), [lang]);

  const categoryChips = useMemo(() => MEDICINE_SIDEBAR_CATEGORIES, []);
  const symptomEntries = useMemo(() => Object.entries(MEDICINE_SYMPTOM_LABELS), []);

  const activeFilters = [
    selectedCategory && {
      key: 'category',
      label: `${isRtl ? 'التصنيف' : 'Category'}: ${getLocalizedText(
        MEDICINE_SIDEBAR_CATEGORIES.find((item) => item.key === selectedCategory)?.label,
        lang,
        selectedCategory,
      )}`,
      onRemove: () => setSelectedCategory(null),
    },
    selectedSymptom && {
      key: 'symptom',
      label: `${isRtl ? 'العَرَض' : 'Symptom'}: ${getLocalizedText(
        MEDICINE_SYMPTOM_LABELS[selectedSymptom],
        lang,
        selectedSymptom,
      )}`,
      onRemove: () => setSelectedSymptom(null),
    },
    priceRange < PRICE_MAX && {
      key: 'price',
      label: isRtl ? `حتى ${priceRange} ج.م` : `Up to ${priceRange} EGP`,
      onRemove: () => setPriceRange(PRICE_MAX),
    },
    availableOnly && {
      key: 'available',
      label: isRtl ? 'متاح الآن' : 'Available now',
      onRemove: () => setAvailableOnly(false),
    },
    deliveryOnly && {
      key: 'delivery',
      label: isRtl ? 'توصيل للمنزل' : 'Home delivery',
      onRemove: () => setDeliveryOnly(false),
    },
    pickupOnly && {
      key: 'pickup',
      label: isRtl ? 'استلام من فرع' : 'Branch pickup',
      onRemove: () => setPickupOnly(false),
    },
  ].filter(Boolean);

  const searchSuggestions = useMemo(() => {
    const normalizedQuery = draftQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return [];
    }

    return combinedInventory.filter((medicine) => buildSearchBlob(medicine).includes(normalizedQuery)).slice(0, 5);
  }, [draftQuery, combinedInventory]);

  const dropdownItems = useMemo(() => {
    const normalizedDraftQuery = draftQuery.trim();

    if (normalizedDraftQuery) {
      const items = searchSuggestions.map((medicine) => ({
        key: `medicine-${medicine.id}`,
        type: 'suggestion',
        value: getLocalizedText(medicine.name, lang, medicine.name),
        name: getLocalizedText(medicine.name, lang, medicine.name),
        category: getLocalizedText(medicine.categoryLabel || medicine.category, lang, medicine.category),
        helper: `${medicine.company} · ${getLocalizedText(medicine.activeIngredient, lang, medicine.activeIngredient)}`,
      }));

      const hasExactMatch = items.some(
        (item) => item.value.toLowerCase() === normalizedDraftQuery.toLowerCase(),
      );

      if (!hasExactMatch) {
        items.push({
          key: 'search-all',
          type: 'action',
          value: normalizedDraftQuery,
          name: isRtl ? `البحث عن "${normalizedDraftQuery}"` : `Search for "${normalizedDraftQuery}"`,
          helper: isRtl ? 'تنفيذ البحث في كل الأدوية' : 'Run the search across all medicines',
        });
      }

      return items;
    }

    return recentSearches.map((term) => ({
      key: `recent-${term}`,
      type: 'recent',
      value: term,
      name: term,
      helper: isRtl ? 'بحث سابق' : 'Recent search',
    }));
  }, [draftQuery, isRtl, lang, recentSearches, searchSuggestions]);

  const contextualEmptySuggestions = useMemo(() => {
    const withinCurrentFilters = sortMedicines(
      filterMedicines(combinedInventory, {
        query: '',
        category: selectedCategory,
        symptom: selectedSymptom,
        maxPrice: priceRange,
        availableOnly,
        deliveryOnly,
        pickupOnly,
        fulfillmentFor,
      }),
      sortBy,
    ).slice(0, 3);

    if (withinCurrentFilters.length > 0) {
      return withinCurrentFilters.map((medicine) => ({
        ...medicine,
        requiresFilterReset: false,
      }));
    }

    const withoutStrictAvailability = sortMedicines(
      filterMedicines(combinedInventory, {
        query: '',
        category: selectedCategory,
        symptom: selectedSymptom,
        maxPrice: priceRange,
        availableOnly: false,
        deliveryOnly: false,
        pickupOnly: false,
        fulfillmentFor,
      }),
      sortBy,
    ).slice(0, 3);

    if (withoutStrictAvailability.length > 0) {
      return withoutStrictAvailability.map((medicine) => ({
        ...medicine,
        requiresFilterReset: true,
      }));
    }

    return sortMedicines([...combinedInventory], sortBy).slice(0, 3).map((medicine) => ({
      ...medicine,
      requiresFilterReset: true,
    }));
  }, [
    availableOnly,
    deliveryOnly,
    pickupOnly,
    priceRange,
    selectedCategory,
    selectedSymptom,
    sortBy,
  ]);

  const dropdownOpen = searchFocused && dropdownItems.length > 0;
  const activeSuggestionIndex =
    highlightedSuggestionIndex >= 0 && highlightedSuggestionIndex < dropdownItems.length
      ? highlightedSuggestionIndex
      : -1;
  const hasPendingSearchDraft =
    draftQuery.trim().length > 0 && draftQuery.trim() !== submittedQuery.trim();

  const clearFilterSelections = () => {
    setSelectedCategory(null);
    setSelectedSymptom(null);
    setPriceRange(PRICE_MAX);
    setAvailableOnly(false);
    setDeliveryOnly(false);
    setPickupOnly(false);
  };

  const addRecentSearch = (term) => {
    if (!term.trim()) return;

    setRecentSearches((previousSearches) => {
      const updatedSearches = [term, ...previousSearches.filter((search) => search !== term)].slice(0, 5);

      try {
        window.localStorage.setItem('medora_recent_searches', JSON.stringify(updatedSearches));
      } catch {
        // Ignore local storage failures and keep the in-memory recent searches.
      }

      return updatedSearches;
    });
  };

  const finishSearchingSoon = () => {
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }

    setIsSearching(true);
    searchTimeoutRef.current = window.setTimeout(() => {
      setIsSearching(false);
      searchTimeoutRef.current = null;
    }, 450);
  };

  const applySearch = (query, { resetFilters = false } = {}) => {
    const trimmedQuery = query.trim();

    if (resetFilters) {
      clearFilterSelections();
    }

    setDraftQuery(trimmedQuery);
    setSubmittedQuery(trimmedQuery);
    setDrugWarning(trimmedQuery ? getInteractionWarning(trimmedQuery) : null);
    setSearchFocused(false);
    setHighlightedSuggestionIndex(-1);

    if (!trimmedQuery) {
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }

      setIsSearching(false);
      return;
    }

    addRecentSearch(trimmedQuery);
    finishSearchingSoon();
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);

    try {
      window.localStorage.removeItem('medora_recent_searches');
    } catch {
      // Ignore local storage failures and keep the current UI responsive.
    }
  };

  const resetFilters = () => {
    clearFilterSelections();
    setFiltersOpen(false);
  };

  const resetFiltersAndRetrySearch = () => {
    applySearch(submittedQuery || draftQuery, { resetFilters: true });
  };

  const clearSearch = () => {
    setDraftQuery('');
    setSubmittedQuery('');
    setDrugWarning(null);
    setSearchFocused(false);
    setHighlightedSuggestionIndex(-1);

    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    setIsSearching(false);
  };

  const selectDropdownItem = (item) => {
    applySearch(item.value, { resetFilters: Boolean(item.requiresFilterReset) });
  };

  const handleSearchInputKeyDown = (event) => {
    if (!dropdownItems.length) {
      if (event.key === 'Enter') {
        event.preventDefault();
        applySearch(draftQuery);
      }

      if (event.key === 'Escape') {
        setSearchFocused(false);
      }

      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedSuggestionIndex((currentIndex) =>
        currentIndex >= dropdownItems.length - 1 ? 0 : currentIndex + 1,
      );
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedSuggestionIndex((currentIndex) =>
        currentIndex <= 0 ? dropdownItems.length - 1 : currentIndex - 1,
      );
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setSearchFocused(false);
      setHighlightedSuggestionIndex(-1);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();

      if (activeSuggestionIndex >= 0 && dropdownItems[activeSuggestionIndex]) {
        selectDropdownItem(dropdownItems[activeSuggestionIndex]);
        return;
      }

      applySearch(draftQuery);
    }
  };

  const handleScanImage = async (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;

    showToast(isRtl ? 'جارٍ التعرّف على الدواء من الصورة...' : 'Identifying the medicine from the image...');

    try {
      const image = await fileToDataUrl(file);
      const { query, recognized } = await scanMedicineImage({ image });

      if (recognized && query) {
        applySearch(query);
      } else {
        showToast(
          isRtl
            ? 'تعذّر التعرّف على الدواء من الصورة. جرّب صورة أوضح.'
            : 'Could not recognize the medicine from the image. Try a clearer photo.',
        );
      }
    } catch (error) {
      showToast(
        error?.serviceDown
          ? isRtl
            ? 'خدمة التعرّف على الأدوية غير متاحة حاليًا. حاول لاحقًا.'
            : 'Medicine scanning service is currently unavailable. Please try again later.'
          : isRtl
            ? 'حدث خطأ أثناء التعرّف على الدواء. حاول مرة أخرى.'
            : 'Something went wrong while scanning the medicine. Please try again.',
      );
    }
  };

  const handleEmptySuggestionSelect = (suggestion) => {
    if (!suggestion) return;

    if (typeof suggestion === 'string') {
      applySearch(suggestion);
      return;
    }

    applySearch(getLocalizedText(suggestion.name, lang, suggestion.name), {
      resetFilters: Boolean(suggestion.requiresFilterReset),
    });
  };

  const toggleCategory = (label) => {
    setSelectedCategory((currentCategory) =>
      currentCategory === label || label === 'all' ? null : label,
    );
  };

  const resultSummary = submittedQuery
    ? isRtl
      ? `يعرض ${filteredMedicines.length.toLocaleString(locale)} نتيجة مرتبطة بـ "${submittedQuery}".`
      : `Showing ${filteredMedicines.length.toLocaleString(locale)} results related to "${submittedQuery}".`
    : availableOnly
      ? isRtl
        ? `متاح الآن ${filteredMedicines.length.toLocaleString(locale)} دواء حسب الفلاتر الحالية.`
        : `${filteredMedicines.length.toLocaleString(locale)} medicines are available now based on the current filters.`
      : isRtl
        ? `يعرض ${filteredMedicines.length.toLocaleString(locale)} دواء حسب الفلاتر الحالية.`
        : `Showing ${filteredMedicines.length.toLocaleString(locale)} medicines based on the current filters.`;

  return (
    <MedicineLayout>
      <div className="bg-[#f3fafa]" style={{ fontFamily: 'Cairo, sans-serif' }}>
        <section
          dir={t.dir}
          className="relative overflow-hidden border-b border-[#d7e7e5] bg-gradient-to-b from-[#eefaf8] via-[#f4fbfb] to-[#f3fafa]"
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-[#c8ebe6] blur-3xl opacity-60" />
            <div className="absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-[#d8f0ed] blur-3xl opacity-70" />
          </div>

          <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-10 sm:px-6 md:pt-14">
            <div className="flex flex-col items-center text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#d0e7e4] bg-white/80 px-4 py-2 text-xs font-bold text-[#2d6669] backdrop-blur-sm">
                <Pill size={14} className="text-[#14b8a6]" />
                {isRtl ? 'صيدلية ميدورا - البحث عن الأدوية' : 'Medora Pharmacy - Medicine search'}
              </span>

              <h1 className="mt-5 max-w-3xl text-3xl font-black leading-tight text-[#084036] md:text-5xl">
                {isRtl ? 'ابحث عن دوائك، واختر التوصيل أو أقرب صيدلية' : 'Find your medicine and choose delivery or a nearby pharmacy'}
                <span className="block text-[#14b8a6]">
                  {isRtl ? 'بسلاسة واحترافية.' : 'Smoothly and confidently.'}
                </span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
                {isRtl
                  ? 'بحث فوري بالاسم أو المادة الفعّالة، فلاتر ذكية للسعر والفئة، وتصوير للدواء للوصول إليه بسرعة مع خيارات استلام وتوصيل أوضح.'
                  : 'Instant search by name or active ingredient, smart price and category filters, and medicine image scan to find it faster with clearer pickup and delivery options.'}
              </p>
            </div>

            <div className="relative mx-auto mt-8 max-w-3xl">
              <div
                className="rounded-[28px] border bg-white/95 p-2.5 transition-all duration-200"
                style={{
                  borderColor: searchFocused ? '#14b8a6' : 'rgba(20,184,166,0.25)',
                  boxShadow: searchFocused
                    ? '0 22px 50px rgba(20,184,166,0.22), 0 0 0 4px rgba(20,184,166,0.08)'
                    : '0 18px 45px rgba(41,93,96,0.12)',
                }}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={draftQuery}
                      onChange={(event) => setDraftQuery(event.target.value)}
                      onFocus={() => setSearchFocused(true)}
                      onBlur={() => window.setTimeout(() => setSearchFocused(false), 120)}
                      onKeyDown={handleSearchInputKeyDown}
                      placeholder={
                        isRtl
                          ? 'اكتب اسم الدواء، المادة الفعالة أو الشركة...'
                          : 'Type the medicine name, active ingredient, or company...'
                      }
                      className="h-14 w-full rounded-[20px] bg-transparent px-5 pr-12 text-right text-[15px] text-[#084036] outline-none"
                      role="combobox"
                      aria-autocomplete="list"
                      aria-expanded={dropdownOpen}
                      aria-controls={SEARCH_LISTBOX_ID}
                      aria-activedescendant={
                        activeSuggestionIndex >= 0
                          ? dropdownItems[activeSuggestionIndex]?.key
                          : undefined
                      }
                    />
                    <SearchIcon
                      size={18}
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#14b8a6]"
                    />
                    {draftQuery && (
                      <button
                        onClick={clearSearch}
                        className="absolute left-4 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-[#f1fbfa] hover:text-[#14b8a6]"
                        aria-label={isRtl ? 'مسح البحث' : 'Clear search'}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2 sm:shrink-0">
                    <button
                      onClick={() => applySearch(draftQuery)}
                      disabled={!draftQuery.trim()}
                      className="flex-1 rounded-[18px] bg-[#14b8a6] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#119a8a] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                    >
                      {isRtl ? 'ابحث' : 'Search'}
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-[18px] border border-[#d7e7e5] bg-[#f7fbfb] px-4 py-3 text-sm font-bold text-[#2d6669] transition hover:border-[#14b8a6] hover:text-[#119a8a] sm:flex-none"
                    >
                      <Camera size={16} />
                      <span>{isRtl ? 'صوّر الدواء' : 'Scan medicine'}</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleScanImage}
                    />
                  </div>
                </div>
              </div>

              {hasPendingSearchDraft && (
                <div className="mt-3 text-center text-[12px] font-semibold text-[#2d6669]">
                  {isRtl
                    ? `اضغط Enter أو زر "ابحث" لتطبيق "${draftQuery.trim()}".`
                    : `Press Enter or "Search" to apply "${draftQuery.trim()}".`}
                </div>
              )}

              {dropdownOpen && (
                <div
                  id={SEARCH_LISTBOX_ID}
                  role="listbox"
                  className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-3xl border border-[#dceceb] bg-white shadow-[0_30px_60px_rgba(8,64,54,0.18)]"
                >
                  {draftQuery.trim() ? (
                    <div>
                      <div className="px-5 pb-2 pt-4 text-right text-[11px] font-bold text-[#6b8080]">
                        {isRtl ? 'نتائج مقترحة' : 'Suggested results'}
                      </div>

                      {searchSuggestions.length === 0 ? (
                        <div className="px-5 pb-4 text-right text-[12px] text-slate-500">
                          {isRtl
                            ? 'لا توجد نتائج مطابقة - جرّب مصطلحًا آخر أو نفّذ البحث كما هو.'
                            : 'No matching results. Try another term or run the search as is.'}
                        </div>
                      ) : (
                        searchSuggestions.map((suggestion, index) => {
                          const isActive = activeSuggestionIndex === index;

                          return (
                            <button
                              key={suggestion.id}
                              id={`medicine-${suggestion.id}`}
                              role="option"
                              aria-selected={isActive}
                              onMouseDown={(event) => event.preventDefault()}
                              onMouseEnter={() => setHighlightedSuggestionIndex(index)}
                              onClick={() =>
                                selectDropdownItem({
                                  key: `medicine-${suggestion.id}`,
                                  value: getLocalizedText(suggestion.name, lang, suggestion.name),
                                })
                              }
                              className="flex w-full items-center justify-between gap-3 px-5 py-2.5 text-right transition"
                              style={{
                                background: isActive ? '#f1fbfa' : '#ffffff',
                              }}
                            >
                              <span className="rounded-full bg-[#eef8f7] px-2 py-1 text-[10px] font-bold text-[#2d6669]">
                                {getLocalizedText(
                                  suggestion.categoryLabel || suggestion.category,
                                  lang,
                                  suggestion.category,
                                )}
                              </span>
                              <div className="min-w-0 flex-1 text-right">
                                <div className="truncate text-sm font-bold text-[#295d60]">
                                  {getLocalizedText(suggestion.name, lang, suggestion.name)}
                                </div>
                                <div className="truncate text-[11px] text-slate-500">
                                  {suggestion.company} · {getLocalizedText(suggestion.activeIngredient, lang, suggestion.activeIngredient)}
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}

                      <div className="border-t border-[#e4eeee]">
                        <button
                          id="search-all"
                          role="option"
                          aria-selected={activeSuggestionIndex === dropdownItems.length - 1}
                          onMouseDown={(event) => event.preventDefault()}
                          onMouseEnter={() => setHighlightedSuggestionIndex(dropdownItems.length - 1)}
                          onClick={() =>
                            selectDropdownItem({
                              key: 'search-all',
                              value: draftQuery.trim(),
                            })
                          }
                          className="flex w-full items-center justify-end gap-2 px-5 py-3 text-[13px] font-bold text-[#0f8f81] transition hover:bg-[#f7fbfb]"
                          style={{
                            background:
                              activeSuggestionIndex === dropdownItems.length - 1
                                ? '#f1fbfa'
                                : '#ffffff',
                          }}
                        >
                          <span>
                            {isRtl
                              ? `البحث عن "${draftQuery.trim()}" في كل الأدوية`
                              : `Search for "${draftQuery.trim()}" across all medicines`}
                          </span>
                          <SearchIcon size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between px-5 pb-2 pt-4 text-[11px] font-bold text-[#6b8080]">
                        <button
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={clearRecentSearches}
                          className="text-[11px] font-bold text-[#119a8a] hover:underline"
                        >
                          {isRtl ? 'مسح الكل' : 'Clear all'}
                        </button>
                        <span>{isRtl ? 'عمليات بحث سابقة' : 'Recent searches'}</span>
                      </div>

                      <div className="pb-3">
                        {recentSearches.map((term, index) => {
                          const isActive = activeSuggestionIndex === index;

                          return (
                            <button
                              key={term}
                              id={`recent-${term}`}
                              role="option"
                              aria-selected={isActive}
                              onMouseDown={(event) => event.preventDefault()}
                              onMouseEnter={() => setHighlightedSuggestionIndex(index)}
                              onClick={() =>
                                selectDropdownItem({
                                  key: `recent-${term}`,
                                  value: term,
                                })
                              }
                              className="flex w-full items-center justify-between px-5 py-2.5 text-right transition"
                              style={{
                                background: isActive ? '#f1fbfa' : '#ffffff',
                              }}
                            >
                              <span className="text-sm text-[#14b8a6]">←</span>
                              <div className="min-w-0 flex-1 text-right">
                                <div className="truncate text-sm font-bold text-[#295d60]">
                                  {term}
                                </div>
                                <div className="text-[11px] text-slate-500">{isRtl ? 'بحث سابق' : 'Recent search'}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {drugWarning && (
              <div className="mx-auto mt-4 flex max-w-3xl items-start gap-2 rounded-2xl border border-[#13b5b1]/20 bg-[#13b5b1]/8 px-4 py-3 text-right">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0f8f81"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-0.5 shrink-0"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span className="text-[12px] text-[#1f4b49]">{isRtl ? drugWarning?.ar : drugWarning?.en}</span>
              </div>
            )}

            <div className="mx-auto mt-6 hidden max-w-4xl gap-3 md:grid md:grid-cols-3">
              {EXPERIENCE_POINTS.map((point) => {
                const PointIcon = point.Icon;

                return (
                  <div
                    key={point.title.en}
                    className="flex items-start gap-3 rounded-2xl border border-[#d7e7e5] bg-white/80 px-4 py-3 backdrop-blur-sm"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e6f7f7]">
                      <PointIcon size={16} className="text-[#14b8a6]" />
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-[#295d60]">{isRtl ? point.title.ar : point.title.en}</div>
                      <div className="mt-0.5 text-[11px] leading-6 text-slate-600">
                        {isRtl ? point.description.ar : point.description.en}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </section>

        <section dir={t.dir} className="border-b border-[#e4eeee] bg-white/80 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-[#14b8a6]" />
                <span className="text-sm font-bold text-[#295d60]">{isRtl ? 'تصفّح حسب الفئة' : 'Browse by category'}</span>
              </div>
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="inline-flex items-center gap-1 rounded-full border border-[#d7e7e5] px-3 py-1.5 text-[11px] font-bold text-[#2d6669] transition hover:border-[#14b8a6]"
                >
                  <X size={11} />
                  {isRtl ? 'مسح التصنيف' : 'Clear category'}
                </button>
              )}
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {categoryChips.map((category) => {
                const active =
                  (category.key === 'all' && !selectedCategory) ||
                  selectedCategory === category.key;
                const meta = MEDICINE_CATEGORY_META[category.key];

                return (
                  <button
                    key={category.key}
                    onClick={() => toggleCategory(category.key)}
                    className="flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-[12px] font-bold transition-all"
                    style={
                      active
                        ? {
                            background: meta?.color || '#14b8a6',
                            borderColor: meta?.color || '#14b8a6',
                            color: '#ffffff',
                            boxShadow: `0 10px 22px ${(meta?.color || '#14b8a6')}33`,
                          }
                        : {
                            background: '#ffffff',
                            borderColor: '#d7e7e5',
                            color: '#2d6669',
                          }
                    }
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: active ? '#ffffff' : meta?.color || '#14b8a6' }}
                    />
                    {getLocalizedText(category.label, lang, category.key)}
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-black"
                      style={{
                        background: active ? 'rgba(255,255,255,0.18)' : 'rgba(20,184,166,0.1)',
                        color: active ? '#ffffff' : '#119a8a',
                      }}
                    >
                      {category.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section dir={t.dir} className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            <aside className="hidden space-y-4 lg:sticky lg:top-24 lg:block lg:self-start">
              <MedicineFiltersPanel
                priceMin={PRICE_MIN}
                priceMax={PRICE_MAX}
                priceRange={priceRange}
                onPriceChange={setPriceRange}
                availableOnly={availableOnly}
                onAvailableToggle={() => setAvailableOnly((value) => !value)}
                deliveryOnly={deliveryOnly}
                onDeliveryToggle={() => setDeliveryOnly((value) => !value)}
                pickupOnly={pickupOnly}
                onPickupToggle={() => setPickupOnly((value) => !value)}
                symptomEntries={symptomEntries}
                selectedSymptom={selectedSymptom}
                onSymptomSelect={setSelectedSymptom}
                onReset={resetFilters}
              />
            </aside>

            <div>
              <div className="flex flex-col gap-3 rounded-3xl border border-[#d7e7e5] bg-white p-4 shadow-[0_10px_28px_rgba(41,93,96,0.06)] sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-extrabold text-[#295d60]">{isRtl ? 'نتائج البحث' : 'Search results'}</div>
                  <div className="mt-0.5 text-[12px] text-slate-500">{resultSummary}</div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFiltersOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#d7e7e5] bg-white px-3 py-2 text-[12px] font-bold text-[#2d6669] transition hover:border-[#14b8a6] lg:hidden"
                  >
                    <Filter size={13} />
                    {isRtl ? 'الفلاتر' : 'Filters'}
                  </button>

                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(event) => setSortBy(event.target.value)}
                      className="appearance-none rounded-full border border-[#d7e7e5] bg-white py-2 pl-8 pr-4 text-[12px] font-bold text-[#295d60] outline-none transition focus:border-[#14b8a6]"
                      style={{ direction: isRtl ? 'rtl' : 'ltr' }}
                    >
                      {sortOptions.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={13}
                      className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[#14b8a6]"
                    />
                  </div>
                </div>
              </div>

              {activeFilters.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                  <button
                    onClick={resetFilters}
                    className="rounded-full bg-[#e6f7f7] px-3 py-1.5 text-[11px] font-bold text-[#119a8a] transition hover:bg-[#d7efee]"
                  >
                    {isRtl ? 'مسح الكل' : 'Clear all'}
                  </button>
                  {activeFilters.map((filter) => (
                    <button
                      key={filter.key}
                      onClick={filter.onRemove}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f7f7] px-3 py-1.5 text-[11px] font-bold text-[#2d6669] transition hover:bg-[#d7efee]"
                    >
                      <X size={11} />
                      {filter.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-4">
                <MedicineResultsGrid
                  medicines={filteredMedicines}
                  query={submittedQuery}
                  isLoading={isSearching}
                  onSuggestionSelect={handleEmptySuggestionSelect}
                  onRequestFulfillment={(medicine) => setFulfillmentFor(medicine)}
                  emptyStateSuggestions={contextualEmptySuggestions}
                  hasActiveFilters={activeFilters.length > 0}
                  onResetFilters={resetFiltersAndRetrySearch}
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      {filtersOpen && (
        <div className="lg:hidden">
          <button
            type="button"
            aria-label={isRtl ? 'إغلاق الفلاتر' : 'Close filters'}
            className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[1px]"
            onClick={() => setFiltersOpen(false)}
          />

          <div
            dir={t.dir}
            role="dialog"
            aria-modal="true"
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-[32px] bg-[#f7fbfb] p-4 shadow-[0_-18px_40px_rgba(8,64,54,0.2)]"
          >
            <div className="mx-auto max-w-2xl">
              <div className="mb-4 flex items-center justify-between">
                <button
                  onClick={() => setFiltersOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d7e7e5] bg-white text-[#2d6669]"
                  aria-label={isRtl ? 'إغلاق' : 'Close'}
                >
                  <X size={16} />
                </button>
                <div className="text-right">
                  <div className="text-base font-extrabold text-[#295d60]">{isRtl ? 'الفلاتر' : 'Filters'}</div>
                  <div className="text-[12px] text-slate-500">
                    {isRtl ? 'عدّل اختياراتك ثم اضغط عرض النتائج.' : 'Adjust your selections, then tap Show results.'}
                  </div>
                </div>
              </div>

              <MedicineFiltersPanel
                priceMin={PRICE_MIN}
                priceMax={PRICE_MAX}
                priceRange={priceRange}
                onPriceChange={setPriceRange}
                availableOnly={availableOnly}
                onAvailableToggle={() => setAvailableOnly((value) => !value)}
                deliveryOnly={deliveryOnly}
                onDeliveryToggle={() => setDeliveryOnly((value) => !value)}
                pickupOnly={pickupOnly}
                onPickupToggle={() => setPickupOnly((value) => !value)}
                symptomEntries={symptomEntries}
                selectedSymptom={selectedSymptom}
                onSymptomSelect={setSelectedSymptom}
                onReset={resetFilters}
              />

              <div className="sticky bottom-0 mt-4 flex gap-2 border-t border-[#dceceb] bg-[#f7fbfb] pt-4">
                <button
                  onClick={resetFilters}
                  className="flex-1 rounded-2xl border border-[#d7e7e5] bg-white px-4 py-3 text-sm font-bold text-[#2d6669]"
                >
                  {isRtl ? 'مسح الفلاتر' : 'Reset filters'}
                </button>
                <button
                  onClick={() => setFiltersOpen(false)}
                  className="flex-1 rounded-2xl bg-[#14b8a6] px-4 py-3 text-sm font-extrabold text-white shadow-[0_10px_22px_rgba(20,184,166,0.25)]"
                >
                  {isRtl ? 'عرض' : 'Show'} {filteredMedicines.length.toLocaleString(locale)} {isRtl ? 'نتيجة' : 'results'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CartFab onOpenFavorites={() => setFavoritesOpen(true)} />
      <CartDrawer />
      <FavoritesDrawer open={favoritesOpen} onClose={() => setFavoritesOpen(false)} />
      <DeliveryOptionSheet
        medicine={fulfillmentFor}
        open={Boolean(fulfillmentFor)}
        onClose={() => setFulfillmentFor(null)}
      />
    </MedicineLayout>
  );
}
