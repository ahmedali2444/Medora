import { getLocalizedText, localizedText } from '../../../utils/localization';

export const MEDICINE_SYMPTOM_LABELS = {
  headache: localizedText('الصداع', 'Headache'),
  pain: localizedText('الألم العام', 'General pain'),
  cold: localizedText('البرد والرشح', 'Cold and flu'),
  infection: localizedText('الالتهابات والعدوى', 'Infections'),
  allergy: localizedText('الحساسية', 'Allergy'),
  stomach: localizedText('اضطرابات المعدة', 'Stomach issues'),
  pressure: localizedText('ضغط الدم', 'Blood pressure'),
  diabetes: localizedText('السكري', 'Diabetes'),
};

const CATEGORY_KEYS = {
  all: 'all',
  painRelief: 'pain-relief',
  antibiotics: 'antibiotics',
  vitamins: 'vitamins',
  supplements: 'supplements',
  coldFlu: 'cold-flu',
  allergy: 'allergy',
  stomach: 'stomach',
  chronic: 'chronic',
  diabetes: 'diabetes',
  skincare: 'skincare',
};

const CATEGORY_LABELS = {
  [CATEGORY_KEYS.all]: localizedText('الكل', 'All'),
  [CATEGORY_KEYS.painRelief]: localizedText('مسكنات', 'Pain relief'),
  [CATEGORY_KEYS.antibiotics]: localizedText('مضادات حيوية', 'Antibiotics'),
  [CATEGORY_KEYS.vitamins]: localizedText('فيتامينات', 'Vitamins'),
  [CATEGORY_KEYS.supplements]: localizedText('مكملات غذائية', 'Supplements'),
  [CATEGORY_KEYS.coldFlu]: localizedText('برد وإنفلونزا', 'Cold and flu'),
  [CATEGORY_KEYS.allergy]: localizedText('حساسية', 'Allergy'),
  [CATEGORY_KEYS.stomach]: localizedText('معدة', 'Stomach'),
  [CATEGORY_KEYS.chronic]: localizedText('أدوية مزمنة', 'Chronic medicine'),
  [CATEGORY_KEYS.diabetes]: localizedText('السكري', 'Diabetes'),
  [CATEGORY_KEYS.skincare]: localizedText('العناية بالبشرة', 'Skincare'),
};

export const SORT_KEYS = {
  bestSelling: 'best-selling',
  lowestPrice: 'lowest-price',
  topRated: 'top-rated',
  newest: 'newest',
};

const SORT_LABELS = {
  [SORT_KEYS.bestSelling]: localizedText('الأكثر مبيعًا', 'Best selling'),
  [SORT_KEYS.lowestPrice]: localizedText('الأقل سعرًا', 'Lowest price'),
  [SORT_KEYS.topRated]: localizedText('الأعلى تقييمًا', 'Top rated'),
  [SORT_KEYS.newest]: localizedText('الأحدث', 'Newest'),
};

export const NEARBY_PHARMACIES = [
  {
    id: 1,
    name: localizedText('صيدلية العزبي - التجمع', 'El Ezaby Pharmacy - Tagamoa'),
    area: localizedText('التجمع الخامس', 'Fifth Settlement'),
    address: localizedText('شارع التسعين الشمالي، التجمع الخامس، القاهرة', 'North 90th Street, Fifth Settlement, Cairo'),
    distanceKm: 0.45,
    phone: '19011',
    open: true,
    hours: localizedText('مفتوحة 24 ساعة', 'Open 24 hours'),
    delivery: true,
    medicineIds: [1, 2, 3, 5, 6, 9, 10, 12],
  },
  {
    id: 2,
    name: localizedText('صيدليات سيف', 'Seif Pharmacies'),
    area: localizedText('مدينة نصر', 'Nasr City'),
    address: localizedText('شارع عباس العقاد، مدينة نصر، القاهرة', 'Abbas El Akkad Street, Nasr City, Cairo'),
    distanceKm: 0.8,
    phone: '16999',
    open: true,
    hours: localizedText('حتى 12 صباحًا', 'Until 12 AM'),
    delivery: true,
    medicineIds: [1, 2, 4, 5, 6, 9, 10],
  },
  {
    id: 3,
    name: localizedText('صيدلية د. أحمد الدخاخني', 'Dr. Ahmed El Dakhakhny Pharmacy'),
    area: localizedText('المعادي', 'Maadi'),
    address: localizedText('شارع النصر، المعادي الجديدة، القاهرة', 'El Nasr Street, New Maadi, Cairo'),
    distanceKm: 1.2,
    phone: '02-23451109',
    open: true,
    hours: localizedText('حتى 11 مساءً', 'Until 11 PM'),
    delivery: false,
    medicineIds: [2, 3, 4, 6, 9, 12],
  },
  {
    id: 4,
    name: localizedText('صيدليات 19011', '19011 Pharmacies'),
    area: localizedText('الزمالك', 'Zamalek'),
    address: localizedText('شارع أبو الفدا، الزمالك، القاهرة', 'Abou El Feda Street, Zamalek, Cairo'),
    distanceKm: 2.1,
    phone: '19011',
    open: false,
    hours: localizedText('تفتح 8 صباحًا', 'Opens at 8 AM'),
    delivery: true,
    medicineIds: [1, 5, 9, 10, 12],
  },
  {
    id: 5,
    name: localizedText('صيدلية الإسعاف', 'El Esaaf Pharmacy'),
    area: localizedText('وسط البلد', 'Downtown'),
    address: localizedText('ميدان الإسعاف، وسط البلد، القاهرة', 'El Esaaf Square, Downtown, Cairo'),
    distanceKm: 3.4,
    phone: '02-25703344',
    open: true,
    hours: localizedText('مفتوحة 24 ساعة', 'Open 24 hours'),
    delivery: false,
    medicineIds: [1, 2, 3, 4, 5, 6, 9, 10, 12],
  },
];

export function getPharmaciesByProximity(limit) {
  const sorted = [...NEARBY_PHARMACIES].sort((first, second) => first.distanceKm - second.distanceKm);
  return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
}

export function getPharmacyById(id) {
  return NEARBY_PHARMACIES.find((pharmacy) => String(pharmacy.id) === String(id)) || null;
}

export const MEDICINE_CATEGORY_META = {
  [CATEGORY_KEYS.painRelief]: { color: '#14b8a6', bg: 'rgba(20,184,166,0.12)' },
  [CATEGORY_KEYS.antibiotics]: { color: '#119a8a', bg: 'rgba(17,154,138,0.12)' },
  [CATEGORY_KEYS.vitamins]: { color: '#0e7c6e', bg: 'rgba(14,124,110,0.12)' },
  [CATEGORY_KEYS.supplements]: { color: '#0b5e52', bg: 'rgba(11,94,82,0.1)' },
  [CATEGORY_KEYS.coldFlu]: { color: '#14b8a6', bg: 'rgba(20,184,166,0.12)' },
  [CATEGORY_KEYS.allergy]: { color: '#119a8a', bg: 'rgba(17,154,138,0.1)' },
  [CATEGORY_KEYS.stomach]: { color: '#0e7c6e', bg: 'rgba(14,124,110,0.1)' },
  [CATEGORY_KEYS.chronic]: { color: '#084036', bg: 'rgba(8,64,54,0.1)' },
  [CATEGORY_KEYS.diabetes]: { color: '#119a8a', bg: 'rgba(17,154,138,0.12)' },
  [CATEGORY_KEYS.skincare]: { color: '#0b5e52', bg: 'rgba(11,94,82,0.08)' },
};

export const MEDICINE_SORT_OPTIONS = Object.entries(SORT_LABELS).map(([key, label]) => ({
  key,
  label,
}));

const MEDICINE_CATEGORY_ORDER = [
  CATEGORY_KEYS.painRelief,
  CATEGORY_KEYS.antibiotics,
  CATEGORY_KEYS.coldFlu,
  CATEGORY_KEYS.allergy,
  CATEGORY_KEYS.stomach,
  CATEGORY_KEYS.vitamins,
  CATEGORY_KEYS.supplements,
  CATEGORY_KEYS.chronic,
  CATEGORY_KEYS.diabetes,
  CATEGORY_KEYS.skincare,
];

export const MEDICINE_INVENTORY = [
  {
    id: 1,
    name: localizedText('بانادول إكسترا', 'Panadol Extra'),
    image: 'https://images.unsplash.com/photo-1584308666744-240400e5ea61?w=400&h=400&fit=crop',
    company: 'GSK',
    category: CATEGORY_KEYS.painRelief,
    categoryLabel: CATEGORY_LABELS[CATEGORY_KEYS.painRelief],
    price: 35,
    description: localizedText('مسكن سريع للصداع وآلام الجسم مع تأثير ممتد نسبيًا.', 'Fast relief for headaches and body aches with a relatively long-lasting effect.'),
    isAvailable: true,
    deliveryAvailable: true,
    pickupAvailable: true,
    rating: 4.9,
    reviewCount: 1540,
    activeIngredient: localizedText('باراسيتامول + كافيين', 'Paracetamol + Caffeine'),
    searchTerms: ['panadol extra', 'panadol', 'paracetamol', 'caffeine', 'بنادول', 'باراسيتامول'],
    symptoms: ['headache', 'pain', 'cold'],
    listedAt: '2026-04-12',
  },
  {
    id: 2,
    name: localizedText('بروفين 400', 'Brufen 400'),
    image: 'https://images.unsplash.com/photo-1563213128-403fd1671981?w=400&h=400&fit=crop',
    company: 'Abbott',
    category: CATEGORY_KEYS.painRelief,
    categoryLabel: CATEGORY_LABELS[CATEGORY_KEYS.painRelief],
    price: 28,
    description: localizedText('يستخدم لتخفيف الألم والالتهاب في الحالات اليومية الشائعة.', 'Used to relieve pain and inflammation in common everyday conditions.'),
    isAvailable: true,
    deliveryAvailable: true,
    pickupAvailable: true,
    rating: 4.8,
    reviewCount: 1310,
    activeIngredient: localizedText('إيبوبروفين', 'Ibuprofen'),
    searchTerms: ['brufen', 'ibuprofen', 'بروفين', 'ايبوبروفين'],
    symptoms: ['pain', 'headache', 'infection'],
    listedAt: '2026-03-28',
  },
  {
    id: 3,
    name: localizedText('أوجمنتين 1 جم', 'Augmentin 1 g'),
    image: 'https://images.unsplash.com/photo-1576086213369-07eb91d4e4c2?w=400&h=400&fit=crop',
    company: 'GSK',
    category: CATEGORY_KEYS.antibiotics,
    categoryLabel: CATEGORY_LABELS[CATEGORY_KEYS.antibiotics],
    price: 89.5,
    description: localizedText('مضاد حيوي واسع المجال للحالات البكتيرية وفق وصفة الطبيب.', 'A broad-spectrum antibiotic for bacterial cases as prescribed by a doctor.'),
    isAvailable: true,
    deliveryAvailable: false,
    pickupAvailable: true,
    rating: 4.5,
    reviewCount: 550,
    activeIngredient: localizedText('أموكسيسيلين + كلافولانيك أسيد', 'Amoxicillin + Clavulanic Acid'),
    searchTerms: ['augmentin', 'amoxicillin', 'clavulanic acid', 'اوجمنتين'],
    symptoms: ['infection'],
    listedAt: '2026-04-15',
  },
  {
    id: 4,
    name: localizedText('فلاجيل 500', 'Flagyl 500'),
    image: null,
    company: 'Sanofi',
    category: CATEGORY_KEYS.antibiotics,
    categoryLabel: CATEGORY_LABELS[CATEGORY_KEYS.antibiotics],
    price: 42,
    description: localizedText('خيار شائع لبعض العدوى المعوية والالتهابات وفق الإرشاد الطبي.', 'A common option for some intestinal infections and inflammations under medical guidance.'),
    isAvailable: true,
    deliveryAvailable: true,
    pickupAvailable: true,
    rating: 4.4,
    reviewCount: 710,
    activeIngredient: localizedText('ميترونيدازول', 'Metronidazole'),
    searchTerms: ['flagyl', 'metronidazole', 'فلاجيل', 'ميترونيدازول'],
    symptoms: ['infection', 'stomach'],
    listedAt: '2026-04-03',
  },
  {
    id: 5,
    name: localizedText('زيرتك 10 مجم', 'Zyrtec 10 mg'),
    image: 'https://images.unsplash.com/photo-1607619056574-38600cdbe4e5?w=400&h=400&fit=crop',
    company: 'UCB',
    category: CATEGORY_KEYS.allergy,
    categoryLabel: CATEGORY_LABELS[CATEGORY_KEYS.allergy],
    price: 85,
    description: localizedText('مضاد هيستامين مناسب لأعراض الحساسية الموسمية وتهيج الأنف.', 'An antihistamine suitable for seasonal allergy symptoms and nasal irritation.'),
    isAvailable: true,
    deliveryAvailable: true,
    pickupAvailable: true,
    rating: 4.7,
    reviewCount: 950,
    activeIngredient: localizedText('سيتريزين', 'Cetirizine'),
    searchTerms: ['zyrtec', 'cetirizine', 'زيرتك', 'سيتريزين'],
    symptoms: ['allergy', 'cold'],
    listedAt: '2026-04-01',
  },
  {
    id: 6,
    name: localizedText('كونجستال', 'Congestal'),
    image: null,
    company: 'Sigma',
    category: CATEGORY_KEYS.coldFlu,
    categoryLabel: CATEGORY_LABELS[CATEGORY_KEYS.coldFlu],
    price: 32,
    description: localizedText('لتخفيف الرشح والاحتقان وأعراض البرد الشائعة.', 'For relieving runny nose, congestion, and common cold symptoms.'),
    isAvailable: true,
    deliveryAvailable: true,
    pickupAvailable: true,
    rating: 4.6,
    reviewCount: 1180,
    activeIngredient: localizedText('باراسيتامول + سودوافدرين + كلورفينيرامين', 'Paracetamol + Pseudoephedrine + Chlorpheniramine'),
    searchTerms: ['congestal', 'cold', 'flu', 'كونجستال', 'برد', 'انفلونزا'],
    symptoms: ['cold', 'headache'],
    listedAt: '2026-04-08',
  },
  {
    id: 7,
    name: localizedText('نيكسيوم 40 مجم', 'Nexium 40 mg'),
    image: 'https://images.unsplash.com/photo-1631548658098-b8ce1ae8bd6b?w=400&h=400&fit=crop',
    company: 'AstraZeneca',
    category: CATEGORY_KEYS.stomach,
    categoryLabel: CATEGORY_LABELS[CATEGORY_KEYS.stomach],
    price: 220,
    description: localizedText('يساعد في تقليل الحموضة وتهدئة أعراض الارتجاع المعدي.', 'Helps reduce acidity and calm acid reflux symptoms.'),
    isAvailable: false,
    deliveryAvailable: true,
    pickupAvailable: true,
    rating: 4.8,
    reviewCount: 870,
    activeIngredient: localizedText('إيزوميبرازول', 'Esomeprazole'),
    searchTerms: ['nexium', 'esomeprazole', 'نيكسيوم', 'حموضة', 'معدة'],
    symptoms: ['stomach'],
    listedAt: '2026-03-15',
  },
  {
    id: 8,
    name: localizedText('كونكور 5 مجم', 'Concor 5 mg'),
    image: 'https://images.unsplash.com/photo-1585435557342-3b6abcecb8c5?w=400&h=400&fit=crop',
    company: 'Merck',
    category: CATEGORY_KEYS.chronic,
    categoryLabel: CATEGORY_LABELS[CATEGORY_KEYS.chronic],
    price: 22,
    description: localizedText('دواء مزمن شائع لحالات الضغط والقلب تحت متابعة طبية.', 'A common chronic medicine for blood pressure and heart cases under medical supervision.'),
    isAvailable: false,
    deliveryAvailable: false,
    pickupAvailable: true,
    rating: 4.6,
    reviewCount: 2310,
    activeIngredient: localizedText('بيسوبرولول', 'Bisoprolol'),
    searchTerms: ['concor', 'bisoprolol', 'كونكور', 'ضغط', 'قلب'],
    symptoms: ['pressure'],
    listedAt: '2026-02-22',
  },
  {
    id: 9,
    name: localizedText('جلوكوفاج 1000', 'Glucophage 1000'),
    image: null,
    company: 'Merck',
    category: CATEGORY_KEYS.diabetes,
    categoryLabel: CATEGORY_LABELS[CATEGORY_KEYS.diabetes],
    price: 58,
    description: localizedText('علاج فموي شائع للمساعدة في تنظيم مستويات السكر في الدم.', 'A common oral treatment that helps regulate blood sugar levels.'),
    isAvailable: true,
    deliveryAvailable: true,
    pickupAvailable: true,
    rating: 4.7,
    reviewCount: 1620,
    activeIngredient: localizedText('ميتفورمين', 'Metformin'),
    searchTerms: ['glucophage', 'metformin', 'جلوكوفاج', 'سكر', 'سكري'],
    symptoms: ['diabetes'],
    listedAt: '2026-04-05',
  },
  {
    id: 10,
    name: localizedText('فيتامين د3 5000', 'Vitamin D3 5000'),
    image: 'https://images.unsplash.com/photo-1584017911766-e4d6a5c13f9f?w=400&h=400&fit=crop',
    company: 'Limitless',
    category: CATEGORY_KEYS.vitamins,
    categoryLabel: CATEGORY_LABELS[CATEGORY_KEYS.vitamins],
    price: 120,
    description: localizedText('مكمل غذائي لدعم العظام والمناعة عند الحاجة.', 'A supplement for supporting bones and immunity when needed.'),
    isAvailable: true,
    deliveryAvailable: true,
    pickupAvailable: true,
    rating: 4.8,
    reviewCount: 890,
    activeIngredient: 'Vitamin D3',
    searchTerms: ['vitamin d', 'vitamin d3', 'د3', 'فيتامين د'],
    symptoms: ['pain'],
    listedAt: '2026-04-11',
  },
  {
    id: 11,
    name: localizedText('أوميجا 3 بلس', 'Omega 3 Plus'),
    image: 'https://images.unsplash.com/photo-1550572017-0ced57f2010c?w=400&h=400&fit=crop',
    company: 'Now Foods',
    category: CATEGORY_KEYS.supplements,
    categoryLabel: CATEGORY_LABELS[CATEGORY_KEYS.supplements],
    price: 145,
    description: localizedText('يدعم صحة القلب والتركيز ضمن روتين المكملات اليومية.', 'Supports heart health and focus as part of a daily supplement routine.'),
    isAvailable: false,
    deliveryAvailable: true,
    pickupAvailable: true,
    rating: 4.7,
    reviewCount: 420,
    activeIngredient: 'Omega 3 Fish Oil',
    searchTerms: ['omega 3', 'fish oil', 'اوميجا', 'مكملات'],
    symptoms: ['pressure'],
    listedAt: '2026-03-25',
  },
  {
    id: 12,
    name: localizedText('بيبانثين كريم', 'Bepanthen Cream'),
    image: null,
    company: 'Bayer',
    category: CATEGORY_KEYS.skincare,
    categoryLabel: CATEGORY_LABELS[CATEGORY_KEYS.skincare],
    price: 68,
    description: localizedText('كريم مرطب ومهدئ للجلد الجاف والالتهابات السطحية البسيطة.', 'A moisturizing and soothing cream for dry skin and minor surface irritation.'),
    isAvailable: true,
    deliveryAvailable: true,
    pickupAvailable: true,
    rating: 4.8,
    reviewCount: 760,
    activeIngredient: localizedText('ديكسبانثينول', 'Dexpanthenol'),
    searchTerms: ['bepanthen', 'dexpanthenol', 'بيبانثين', 'بشرة'],
    symptoms: ['allergy'],
    listedAt: '2026-04-14',
  },
];

export const MEDICINE_QUICK_FILTERS = [CATEGORY_LABELS[CATEGORY_KEYS.all].ar, ...MEDICINE_CATEGORY_ORDER.map((key) => CATEGORY_LABELS[key].ar)];

export const MEDICINE_SIDEBAR_CATEGORIES = [
  { label: CATEGORY_LABELS[CATEGORY_KEYS.all], count: MEDICINE_INVENTORY.length, color: '#14b8a6', key: CATEGORY_KEYS.all },
  ...MEDICINE_CATEGORY_ORDER.map((key) => ({
    key,
    label: CATEGORY_LABELS[key],
    count: MEDICINE_INVENTORY.filter((medicine) => medicine.category === key).length,
    color: MEDICINE_CATEGORY_META[key]?.color || '#14b8a6',
  })),
];

export const MEDICINE_SEARCH_SUGGESTIONS = MEDICINE_INVENTORY.map(({ id, name, categoryLabel }) => ({
  id,
  name,
  category: categoryLabel,
}));

export function getMedicineSortOptions(locale = 'ar') {
  return MEDICINE_SORT_OPTIONS.map((option) => ({
    key: option.key,
    label: getLocalizedText(option.label, locale, option.key),
  }));
}

export function formatMedicinePrice(price) {
  const parsedPrice = Number(price);
  if (Number.isNaN(parsedPrice)) return price;
  return Number.isInteger(parsedPrice) ? String(parsedPrice) : parsedPrice.toFixed(2);
}

export function getMedicineById(id) {
  return MEDICINE_INVENTORY.find((medicine) => String(medicine.id) === String(id)) || null;
}

export function getPharmacyMedicines(pharmacyId) {
  const pharmacy = getPharmacyById(pharmacyId);
  if (!pharmacy) return [];

  return pharmacy.medicineIds
    .map((medicineId) => getMedicineById(medicineId))
    .filter(Boolean)
    .map((medicine) => ({
      ...medicine,
      isAvailable: true,
      pickupAvailable: pharmacy.open,
      deliveryAvailable: pharmacy.open && pharmacy.delivery && medicine.deliveryAvailable,
    }));
}

export function filterMedicines(medicines, filters = {}) {
  const {
    query = '',
    symptom = null,
    category = null,
    maxPrice = null,
    availableOnly = false,
    deliveryOnly = false,
    pickupOnly = false,
  } = filters;

  const normalizedQuery = query.trim().toLowerCase();

  return medicines.filter((medicine) => {
    const searchBlob = [
      getLocalizedText(medicine.name, 'ar'),
      getLocalizedText(medicine.name, 'en'),
      medicine.company,
      getLocalizedText(medicine.categoryLabel, 'ar'),
      getLocalizedText(medicine.categoryLabel, 'en'),
      getLocalizedText(medicine.activeIngredient, 'ar'),
      getLocalizedText(medicine.activeIngredient, 'en'),
      ...(medicine.searchTerms || []),
    ]
      .join(' ')
      .toLowerCase();

    if (normalizedQuery && !searchBlob.includes(normalizedQuery)) return false;
    if (symptom && !medicine.symptoms?.includes(symptom)) return false;
    if (category && medicine.category !== category) return false;
    if (typeof maxPrice === 'number' && medicine.price > maxPrice) return false;
    if (availableOnly && !medicine.isAvailable) return false;
    if (deliveryOnly && !medicine.deliveryAvailable) return false;
    if (pickupOnly && !medicine.pickupAvailable) return false;

    return true;
  });
}

export function sortMedicines(medicines, sortBy = SORT_KEYS.bestSelling) {
  const sortedMedicines = [...medicines];
  let compareBySelection;

  switch (sortBy) {
    case SORT_KEYS.lowestPrice:
    case SORT_LABELS[SORT_KEYS.lowestPrice].ar:
    case SORT_LABELS[SORT_KEYS.lowestPrice].en:
      compareBySelection = (first, second) => first.price - second.price;
      break;
    case SORT_KEYS.topRated:
    case SORT_LABELS[SORT_KEYS.topRated].ar:
    case SORT_LABELS[SORT_KEYS.topRated].en:
      compareBySelection = (first, second) => {
        if (second.rating !== first.rating) return second.rating - first.rating;
        return second.reviewCount - first.reviewCount;
      };
      break;
    case SORT_KEYS.newest:
    case SORT_LABELS[SORT_KEYS.newest].ar:
    case SORT_LABELS[SORT_KEYS.newest].en:
      compareBySelection = (first, second) =>
        new Date(second.listedAt).getTime() - new Date(first.listedAt).getTime();
      break;
    case SORT_KEYS.bestSelling:
    case SORT_LABELS[SORT_KEYS.bestSelling].ar:
    case SORT_LABELS[SORT_KEYS.bestSelling].en:
    default:
      compareBySelection = (first, second) => {
        if (second.reviewCount !== first.reviewCount) return second.reviewCount - first.reviewCount;
        return second.rating - first.rating;
      };
      break;
  }

  return sortedMedicines.sort((first, second) => {
    if (first.isAvailable !== second.isAvailable) {
      return first.isAvailable ? -1 : 1;
    }

    return compareBySelection(first, second);
  });
}

export function getMedicineAlternatives(medicine, limit = 4) {
  if (!medicine) return [];

  const sameIngredient = MEDICINE_INVENTORY.filter(
    (item) =>
      item.id !== medicine.id &&
      getLocalizedText(item.activeIngredient, 'ar') === getLocalizedText(medicine.activeIngredient, 'ar'),
  );

  const sameCategory = MEDICINE_INVENTORY.filter(
    (item) => item.id !== medicine.id && item.category === medicine.category,
  );

  const mergedAlternatives = [...sameIngredient];

  sameCategory.forEach((item) => {
    if (!mergedAlternatives.some((alternative) => alternative.id === item.id)) {
      mergedAlternatives.push(item);
    }
  });

  return mergedAlternatives
    .sort((first, second) => {
      if (first.price !== second.price) return first.price - second.price;
      return second.rating - first.rating;
    })
    .slice(0, limit);
}
