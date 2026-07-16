import {
  formatLocalizedDate,
  localizedText,
} from '../../../utils/localization';

export const PHARMACY_PROFILE = {
  id: 'pharm-1',
  name: localizedText('صيدلية العزبي — التجمع', 'El Ezaby Pharmacy — New Cairo'),
  owner: localizedText('أحمد العزبي', 'Ahmed El Ezaby'),
  email: 'info@azby-pharmacy.com',
  phone: '+20 19011',
  address: localizedText(
    'التجمع الخامس، شارع التسعين الجنوبي',
    'Fifth Settlement, South 90th Street',
  ),
  city: localizedText('القاهرة', 'Cairo'),
  license: 'PH-2245',
  workingHours: { from: '08:00', to: '00:00' },
  open24: false,
  rating: 4.7,
  reviewCount: 1482,
  totalOrders: 3240,
  logo: 'https://ui-avatars.com/api/?name=Azby&background=14b8a6&color=fff&size=200',
};

export const PHARMACY_KPIS = [
  {
    id: 'orders-today',
    label: localizedText('طلبات اليوم', 'Today\'s orders'),
    value: 34,
    delta: '+18%',
    positive: true,
    hint: localizedText('مقارنة بالأمس', 'Compared with yesterday'),
  },
  {
    id: 'revenue',
    label: localizedText('إيرادات اليوم (ج.م)', 'Today\'s revenue (EGP)'),
    value: '8,450',
    delta: '+11%',
    positive: true,
    hint: localizedText('حتى الآن', 'So far'),
  },
  {
    id: 'active-orders',
    label: localizedText('طلبات قيد التنفيذ', 'Active orders'),
    value: 12,
    delta: '-2',
    positive: false,
    hint: localizedText('مقارنة بالأمس', 'Compared with yesterday'),
  },
  {
    id: 'stock-alerts',
    label: localizedText('تنبيهات المخزون', 'Stock alerts'),
    value: 7,
    delta: '+3',
    positive: false,
    hint: localizedText('منتجات تحتاج تزويد', 'Products needing restock'),
  },
  {
    id: 'expired-count',
    label: localizedText('أدوية منتهية الصلاحية', 'Expired Medicines'),
    value: 0,
    delta: null,
    positive: false,
    hint: localizedText('أدوية انتهت صلاحيتها', 'Medicines past expiry date'),
  },
  {
    id: 'near-expiry',
    label: localizedText('قرب انتهاء الصلاحية', 'Near Expiry'),
    value: 0,
    delta: null,
    positive: false,
    hint: localizedText('أدوية تنتهي قريباً', 'Medicines expiring soon'),
  },
];

export const WEEKLY_SALES = [
  { id: 'sat', day: localizedText('السبت', 'Sat'), orders: 48, revenue: 7200 },
  { id: 'sun', day: localizedText('الأحد', 'Sun'), orders: 52, revenue: 7900 },
  { id: 'mon', day: localizedText('الإثنين', 'Mon'), orders: 61, revenue: 8600 },
  { id: 'tue', day: localizedText('الثلاثاء', 'Tue'), orders: 44, revenue: 6800 },
  { id: 'wed', day: localizedText('الأربعاء', 'Wed'), orders: 58, revenue: 8200 },
  { id: 'thu', day: localizedText('الخميس', 'Thu'), orders: 67, revenue: 9800 },
  { id: 'fri', day: localizedText('الجمعة', 'Fri'), orders: 34, revenue: 4500 },
];

export const ORDER_STATUS_META = {
  new: { label: localizedText('جديد', 'New'), color: '#1e56b5', bg: '#eef4ff' },
  preparing: { label: localizedText('قيد التجهيز', 'Preparing'), color: '#a35a00', bg: '#fff4e6' },
  ready: { label: localizedText('جاهز للاستلام', 'Ready for pickup'), color: '#6f47b5', bg: '#f4f0ff' },
  shipping: { label: localizedText('جارٍ التوصيل', 'Out for delivery'), color: '#0e7c6e', bg: '#e6f7f7' },
  delivered: { label: localizedText('تم التسليم', 'Delivered'), color: '#0e7c6e', bg: '#e6f7f7' },
  cancelled: { label: localizedText('ملغي', 'Cancelled'), color: '#c2362f', bg: '#fdecec' },
};

export const FULFILLMENT_META = {
  delivery: { label: localizedText('توصيل', 'Delivery'), color: '#0e7c6e', bg: '#e6f7f7' },
  pickup: { label: localizedText('استلام', 'Pickup'), color: '#6f47b5', bg: '#f4f0ff' },
};

export const PENDING_DELIVERY_META = {
  label: localizedText('بانتظار', 'Pending'),
  color: '#a35a00',
  bg: '#fff4e6',
};

export const PHARMACY_ORDERS = [
  {
    id: 'ORD-5428',
    customer: localizedText('منى السيد', 'Mona El-Sayed'),
    phone: '01001112233',
    items: 3,
    total: 195,
    status: 'new',
    fulfillment: 'delivery',
    date: '2026-04-22',
    time: '09:12',
    address: localizedText('التجمع — شارع 90', 'New Cairo — 90th Street'),
    payment: localizedText('نقدي عند الاستلام', 'Cash on delivery'),
    lines: [
      { name: localizedText('بانادول إكسترا', 'Panadol Extra'), qty: 2, price: 35 },
      { name: localizedText('فيتامين د3 5000', 'Vitamin D3 5000'), qty: 1, price: 125 },
    ],
  },
  {
    id: 'ORD-5427',
    customer: localizedText('يوسف عبد الله', 'Youssef Abdullah'),
    phone: '01119900011',
    items: 2,
    total: 260,
    status: 'preparing',
    fulfillment: 'delivery',
    date: '2026-04-22',
    time: '09:45',
    address: localizedText('مدينة نصر', 'Nasr City'),
    payment: localizedText('فيزا', 'Visa'),
    lines: [
      { name: localizedText('نيكسيوم 40 مجم', 'Nexium 40 mg'), qty: 1, price: 220 },
      { name: localizedText('كونجستال', 'Congestal'), qty: 1, price: 40 },
    ],
  },
  {
    id: 'ORD-5426',
    customer: localizedText('هبة مصطفى', 'Heba Mostafa'),
    phone: '01288771122',
    items: 1,
    total: 85,
    status: 'ready',
    fulfillment: 'pickup',
    date: '2026-04-22',
    time: '10:20',
    address: localizedText('—', '—'),
    payment: localizedText('نقدي', 'Cash'),
    lines: [{ name: localizedText('زيرتك 10 مجم', 'Zyrtec 10 mg'), qty: 1, price: 85 }],
  },
  {
    id: 'ORD-5425',
    customer: localizedText('أحمد الشناوي', 'Ahmed El-Shenawy'),
    phone: '01533224411',
    items: 4,
    total: 310,
    status: 'shipping',
    fulfillment: 'delivery',
    date: '2026-04-22',
    time: '10:40',
    address: localizedText('التجمع الأول', 'First Settlement'),
    payment: localizedText('محفظة', 'Wallet'),
    lines: [
      { name: localizedText('أسبرين 81', 'Aspirin 81'), qty: 2, price: 40 },
      { name: localizedText('بلافيكس 75', 'Plavix 75'), qty: 2, price: 115 },
    ],
  },
  {
    id: 'ORD-5424',
    customer: localizedText('سلمى فوزي', 'Salma Fawzy'),
    phone: '01044558822',
    items: 2,
    total: 140,
    status: 'delivered',
    fulfillment: 'delivery',
    date: '2026-04-21',
    time: '19:10',
    address: localizedText('التجمع الخامس', 'Fifth Settlement'),
    payment: localizedText('فيزا', 'Visa'),
    lines: [
      { name: localizedText('بروفين 400', 'Brufen 400'), qty: 1, price: 28 },
      { name: localizedText('إندرال 10', 'Inderal 10'), qty: 1, price: 112 },
    ],
  },
  {
    id: 'ORD-5423',
    customer: localizedText('كريم طارق', 'Karim Tarek'),
    phone: '01221100998',
    items: 2,
    total: 120,
    status: 'cancelled',
    fulfillment: 'pickup',
    date: '2026-04-21',
    time: '17:30',
    address: localizedText('—', '—'),
    payment: localizedText('نقدي', 'Cash'),
    lines: [{ name: localizedText('كونجستال', 'Congestal'), qty: 2, price: 60 }],
  },
  {
    id: 'ORD-5422',
    customer: localizedText('نور الدين', 'Nour Eldin'),
    phone: '01099887712',
    items: 5,
    total: 520,
    status: 'delivered',
    fulfillment: 'delivery',
    date: '2026-04-21',
    time: '14:22',
    address: localizedText('التجمع', 'New Cairo'),
    payment: localizedText('فيزا', 'Visa'),
    lines: [
      { name: localizedText('كونكور 5', 'Concor 5'), qty: 2, price: 44 },
      { name: localizedText('إنترستو 50', 'Entresto 50'), qty: 1, price: 432 },
    ],
  },
];

export const INVENTORY = [
  {
    id: 1,
    name: localizedText('بانادول إكسترا', 'Panadol Extra'),
    company: 'GSK',
    category: localizedText('مسكنات', 'Pain Relief'),
    price: 35,
    cost: 22,
    stock: 240,
    reorder: 50,
    expiry: '2027-05-20',
  },
  {
    id: 2,
    name: localizedText('بروفين 400', 'Brufen 400'),
    company: 'Abbott',
    category: localizedText('مسكنات', 'Pain Relief'),
    price: 28,
    cost: 18,
    stock: 180,
    reorder: 40,
    expiry: '2026-11-15',
  },
  {
    id: 3,
    name: localizedText('أوجمنتين 1 جم', 'Augmentin 1 g'),
    company: 'GSK',
    category: localizedText('مضادات حيوية', 'Antibiotics'),
    price: 89.5,
    cost: 65,
    stock: 62,
    reorder: 30,
    expiry: '2026-08-10',
  },
  {
    id: 4,
    name: localizedText('فلاجيل 500', 'Flagyl 500'),
    company: 'Sanofi',
    category: localizedText('مضادات حيوية', 'Antibiotics'),
    price: 42,
    cost: 28,
    stock: 18,
    reorder: 25,
    expiry: '2026-07-05',
  },
  {
    id: 5,
    name: localizedText('زيرتك 10 مجم', 'Zyrtec 10 mg'),
    company: 'UCB',
    category: localizedText('حساسية', 'Allergy'),
    price: 85,
    cost: 60,
    stock: 0,
    reorder: 20,
    expiry: '2027-02-28',
  },
  {
    id: 6,
    name: localizedText('كونجستال', 'Congestal'),
    company: 'Sigma',
    category: localizedText('برد وإنفلونزا', 'Cold & Flu'),
    price: 32,
    cost: 22,
    stock: 120,
    reorder: 30,
    expiry: '2026-12-01',
  },
  {
    id: 7,
    name: localizedText('نيكسيوم 40', 'Nexium 40'),
    company: 'AstraZeneca',
    category: localizedText('معدة', 'Stomach'),
    price: 220,
    cost: 160,
    stock: 44,
    reorder: 20,
    expiry: '2027-01-15',
  },
  {
    id: 8,
    name: localizedText('جلوكوفاج 1000', 'Glucophage 1000'),
    company: 'Merck',
    category: localizedText('السكري', 'Diabetes'),
    price: 58,
    cost: 40,
    stock: 210,
    reorder: 50,
    expiry: '2027-03-22',
  },
  {
    id: 9,
    name: localizedText('فيتامين د3 5000', 'Vitamin D3 5000'),
    company: 'Limitless',
    category: localizedText('فيتامينات', 'Vitamins'),
    price: 125,
    cost: 85,
    stock: 14,
    reorder: 25,
    expiry: '2027-06-18',
  },
  {
    id: 10,
    name: localizedText('أوميجا 3 بلس', 'Omega 3 Plus'),
    company: 'Now Foods',
    category: localizedText('مكملات غذائية', 'Dietary Supplements'),
    price: 145,
    cost: 98,
    stock: 0,
    reorder: 20,
    expiry: '2026-09-30',
  },
];

export function getInventoryStatus(item) {
  if (item.stock === 0) return 'out-of-stock';
  if (item.stock < item.reorder) return 'low-stock';
  return 'in-stock';
}

export const STOCK_STATUS_META = {
  'in-stock': { label: localizedText('متاح', 'In stock'), color: '#0e7c6e', bg: '#e6f7f7' },
  'low-stock': { label: localizedText('مخزون منخفض', 'Low stock'), color: '#a35a00', bg: '#fff4e6' },
  'out-of-stock': { label: localizedText('نفذ المخزون', 'Out of stock'), color: '#c2362f', bg: '#fdecec' },
};

export const PRESCRIPTION_STATUS_META = {
  new: { label: localizedText('جديدة', 'New'), color: '#1e56b5', bg: '#eef4ff' },
  reviewing: { label: localizedText('قيد المراجعة', 'Under review'), color: '#a35a00', bg: '#fff4e6' },
  approved: { label: localizedText('تم القبول', 'Approved'), color: '#0e7c6e', bg: '#e6f7f7' },
  rejected: { label: localizedText('مرفوضة', 'Rejected'), color: '#c2362f', bg: '#fdecec' },
};

export const PRESCRIPTIONS = [
  {
    id: 'RX-4021',
    patient: localizedText('منى السيد', 'Mona El-Sayed'),
    doctor: localizedText('د. أحمد محمد', 'Dr. Ahmed Mohamed'),
    date: '2026-04-22',
    status: 'new',
    items: [
      {
        name: localizedText('كونكور 5 مجم', 'Concor 5 mg'),
        dose: localizedText('قرص', 'Tablet'),
        frequency: localizedText('مرة يوميًا', 'Once daily'),
        qty: 30,
      },
      {
        name: localizedText('نورفاسك 5 مجم', 'Norvasc 5 mg'),
        dose: localizedText('قرص', 'Tablet'),
        frequency: localizedText('مرة يوميًا', 'Once daily'),
        qty: 30,
      },
    ],
    notes: localizedText('مريض ضغط، يحتاج توصيل لباب المنزل.', 'Blood pressure patient, needs doorstep delivery.'),
  },
  {
    id: 'RX-4020',
    patient: localizedText('يوسف عبد الله', 'Youssef Abdullah'),
    doctor: localizedText('د. أحمد محمد', 'Dr. Ahmed Mohamed'),
    date: '2026-04-22',
    status: 'reviewing',
    items: [
      {
        name: localizedText('إنترستو 50 مجم', 'Entresto 50 mg'),
        dose: localizedText('قرص', 'Tablet'),
        frequency: localizedText('مرتين يوميًا', 'Twice daily'),
        qty: 60,
      },
    ],
    notes: localizedText('—', '—'),
  },
  {
    id: 'RX-4019',
    patient: localizedText('سلمى فوزي', 'Salma Fawzy'),
    doctor: localizedText('د. خالد نور', 'Dr. Khaled Nour'),
    date: '2026-04-21',
    status: 'approved',
    items: [
      {
        name: localizedText('إندرال 10 مجم', 'Inderal 10 mg'),
        dose: localizedText('قرص', 'Tablet'),
        frequency: localizedText('عند الحاجة', 'As needed'),
        qty: 20,
      },
    ],
    notes: localizedText('تم التجهيز، بانتظار الاستلام.', 'Prepared and awaiting pickup.'),
  },
  {
    id: 'RX-4018',
    patient: localizedText('كريم طارق', 'Karim Tarek'),
    doctor: localizedText('د. محمود عماد', 'Dr. Mahmoud Emad'),
    date: '2026-04-20',
    status: 'rejected',
    items: [
      {
        name: localizedText('ترامادول 50', 'Tramadol 50'),
        dose: localizedText('قرص', 'Tablet'),
        frequency: localizedText('—', '—'),
        qty: 10,
      },
    ],
    notes: localizedText('يتطلب وصفة من طبيب معتمد رسميًا.', 'Requires a prescription from a licensed physician.'),
  },
];

export const CUSTOMERS = [
  {
    id: 1,
    name: localizedText('منى السيد', 'Mona El-Sayed'),
    phone: '01001112233',
    orders: 14,
    totalSpent: 2850,
    lastOrder: '2026-04-22',
    tag: 'vip',
  },
  {
    id: 2,
    name: localizedText('يوسف عبد الله', 'Youssef Abdullah'),
    phone: '01119900011',
    orders: 22,
    totalSpent: 5240,
    lastOrder: '2026-04-22',
    tag: 'vip',
  },
  {
    id: 3,
    name: localizedText('هبة مصطفى', 'Heba Mostafa'),
    phone: '01288771122',
    orders: 3,
    totalSpent: 320,
    lastOrder: '2026-04-22',
    tag: 'regular',
  },
  {
    id: 4,
    name: localizedText('أحمد الشناوي', 'Ahmed El-Shenawy'),
    phone: '01533224411',
    orders: 9,
    totalSpent: 1520,
    lastOrder: '2026-04-22',
    tag: 'repeat',
  },
  {
    id: 5,
    name: localizedText('سلمى فوزي', 'Salma Fawzy'),
    phone: '01044558822',
    orders: 18,
    totalSpent: 4120,
    lastOrder: '2026-04-21',
    tag: 'vip',
  },
  {
    id: 6,
    name: localizedText('كريم طارق', 'Karim Tarek'),
    phone: '01221100998',
    orders: 1,
    totalSpent: 60,
    lastOrder: '2026-04-21',
    tag: 'new',
  },
  {
    id: 7,
    name: localizedText('نور الدين', 'Nour Eldin'),
    phone: '01099887712',
    orders: 31,
    totalSpent: 9840,
    lastOrder: '2026-04-21',
    tag: 'vip',
  },
];

export const CUSTOMER_TAG_META = {
  vip: { label: localizedText('VIP', 'VIP'), color: '#a35a00', bg: '#fff8e7' },
  repeat: { label: localizedText('متكرر', 'Returning'), color: '#2465b6', bg: '#eef4ff' },
  regular: { label: localizedText('عادي', 'Regular'), color: '#486466', bg: '#f3f4f6' },
  new: { label: localizedText('جديد', 'New'), color: '#0e7c6e', bg: '#e6f7f7' },
};

export const DRIVERS = [
  {
    id: 1,
    name: localizedText('محمود سامي', 'Mahmoud Samy'),
    phone: '01012345678',
    status: 'available',
    deliveries: 142,
    rating: 4.8,
    area: localizedText('التجمع الخامس', 'Fifth Settlement'),
  },
  {
    id: 2,
    name: localizedText('أحمد سيد', 'Ahmed Sayed'),
    phone: '01198765432',
    status: 'on-route',
    deliveries: 98,
    rating: 4.6,
    area: localizedText('مدينة نصر', 'Nasr City'),
  },
  {
    id: 3,
    name: localizedText('عماد فريد', 'Emad Farid'),
    phone: '01522334455',
    status: 'offline',
    deliveries: 54,
    rating: 4.4,
    area: localizedText('التجمع الأول', 'First Settlement'),
  },
  {
    id: 4,
    name: localizedText('كريم يحيى', 'Karim Yehia'),
    phone: '01044556677',
    status: 'available',
    deliveries: 210,
    rating: 4.9,
    area: localizedText('الرحاب', 'Al Rehab'),
  },
];

export const DRIVER_STATUS_META = {
  available: { label: localizedText('متاح', 'Available'), color: '#0e7c6e', bg: '#e6f7f7' },
  'on-route': { label: localizedText('في رحلة', 'On route'), color: '#6f47b5', bg: '#f4f0ff' },
  offline: { label: localizedText('غير متاح', 'Offline'), color: '#5e6b6d', bg: '#f3f4f6' },
};

export const ACTIVE_DELIVERIES = [
  {
    id: 'DEL-1142',
    order: 'ORD-5425',
    customer: localizedText('أحمد الشناوي', 'Ahmed El-Shenawy'),
    driver: localizedText('أحمد سيد', 'Ahmed Sayed'),
    eta: localizedText('12 د', '12 min'),
    distance: localizedText('2.4 كم', '2.4 km'),
    status: 'shipping',
  },
  {
    id: 'DEL-1143',
    order: 'ORD-5428',
    customer: localizedText('منى السيد', 'Mona El-Sayed'),
    driver: null,
    eta: localizedText('—', '—'),
    distance: localizedText('1.1 كم', '1.1 km'),
    status: 'pending',
  },
  {
    id: 'DEL-1144',
    order: 'ORD-5427',
    customer: localizedText('يوسف عبد الله', 'Youssef Abdullah'),
    driver: null,
    eta: localizedText('—', '—'),
    distance: localizedText('3.8 كم', '3.8 km'),
    status: 'pending',
  },
];

export const PHARMACY_REVIEWS = [
  {
    id: 1,
    customer: localizedText('منى السيد', 'Mona El-Sayed'),
    rating: 5,
    date: '2026-04-21',
    comment: localizedText('أسعار منافسة وتوصيل سريع جدًا.', 'Competitive prices and very fast delivery.'),
  },
  {
    id: 2,
    customer: localizedText('يوسف عبد الله', 'Youssef Abdullah'),
    rating: 5,
    date: '2026-04-19',
    comment: localizedText('صيدلي محترم وخدمة ممتازة.', 'Professional pharmacist and excellent service.'),
  },
  {
    id: 3,
    customer: localizedText('هبة مصطفى', 'Heba Mostafa'),
    rating: 4,
    date: '2026-04-18',
    comment: localizedText('سرعة في التنفيذ لكن التوصيل اتأخر شوية.', 'Fulfillment was fast, but delivery was slightly delayed.'),
  },
  {
    id: 4,
    customer: localizedText('أحمد الشناوي', 'Ahmed El-Shenawy'),
    rating: 5,
    date: '2026-04-15',
    comment: localizedText('أفضل صيدلية في المنطقة.', 'Best pharmacy in the area.'),
  },
  {
    id: 5,
    customer: localizedText('سلمى فوزي', 'Salma Fawzy'),
    rating: 4,
    date: '2026-04-14',
    comment: localizedText('خدمة عملاء ممتازة.', 'Excellent customer service.'),
  },
  {
    id: 6,
    customer: localizedText('كريم طارق', 'Karim Tarek'),
    rating: 3,
    date: '2026-04-12',
    comment: localizedText('الدواء المطلوب مش دايمًا متوفر.', 'The requested medicine is not always available.'),
  },
];

export const PROMOTION_TYPE_LABELS = {
  shipping: localizedText('شحن مجاني', 'Free shipping'),
};

export const PROMOTIONS = [
  {
    id: 1,
    code: 'MEDORA10',
    description: localizedText('خصم 10% على كل الطلبات', '10% off on all orders'),
    discount: 10,
    type: 'percent',
    uses: 348,
    limit: 1000,
    expiry: '2026-05-31',
    status: 'active',
  },
  {
    id: 2,
    code: 'FREESHIP',
    description: localizedText('توصيل مجاني للطلبات فوق 200 ج.م', 'Free delivery for orders above EGP 200'),
    discount: 15,
    type: 'shipping',
    uses: 120,
    limit: 500,
    expiry: '2026-06-15',
    status: 'active',
  },
  {
    id: 3,
    code: 'VIT20',
    description: localizedText('خصم 20% على الفيتامينات والمكملات', '20% off on vitamins and supplements'),
    discount: 20,
    type: 'percent',
    uses: 89,
    limit: 300,
    expiry: '2026-04-30',
    status: 'active',
  },
  {
    id: 4,
    code: 'WINTER25',
    description: localizedText('خصم 25% على أدوية البرد', '25% off cold medicines'),
    discount: 25,
    type: 'percent',
    uses: 540,
    limit: 500,
    expiry: '2026-03-15',
    status: 'expired',
  },
];

export const PROMO_STATUS_META = {
  active: { label: localizedText('نشط', 'Active'), color: '#0e7c6e', bg: '#e6f7f7' },
  expired: { label: localizedText('منتهي', 'Expired'), color: '#5e6b6d', bg: '#f3f4f6' },
  paused: { label: localizedText('موقوف', 'Paused'), color: '#a35a00', bg: '#fff4e6' },
};

export const MONTHLY_REVENUE = [
  { id: 'jan', month: localizedText('يناير', 'Jan'), value: 120 },
  { id: 'feb', month: localizedText('فبراير', 'Feb'), value: 138 },
  { id: 'mar', month: localizedText('مارس', 'Mar'), value: 162 },
  { id: 'apr', month: localizedText('أبريل', 'Apr'), value: 184 },
  { id: 'may', month: localizedText('مايو', 'May'), value: 155 },
  { id: 'jun', month: localizedText('يونيو', 'Jun'), value: 198 },
  { id: 'jul', month: localizedText('يوليو', 'Jul'), value: 215 },
];

export const CATEGORY_SALES = [
  { id: 'pain-relief', label: localizedText('مسكنات', 'Pain Relief'), value: 42, color: '#14b8a6' },
  { id: 'antibiotics', label: localizedText('مضادات حيوية', 'Antibiotics'), value: 25, color: '#6366f1' },
  { id: 'vitamins', label: localizedText('فيتامينات', 'Vitamins'), value: 18, color: '#f59e0b' },
  { id: 'chronic', label: localizedText('أدوية مزمنة', 'Chronic Medication'), value: 10, color: '#ec4899' },
  { id: 'other', label: localizedText('أخرى', 'Other'), value: 5, color: '#8b5cf6' },
];

export const RECENT_ACTIVITY = [
  {
    id: 1,
    kind: 'order',
    text: localizedText('طلب جديد ORD-5428 من منى السيد', 'New order ORD-5428 from Mona El-Sayed'),
    time: localizedText('منذ 3د', '3 min ago'),
  },
  {
    id: 2,
    kind: 'stock',
    text: localizedText('مخزون زيرتك نفذ — يحتاج تزويد', 'Zyrtec is out of stock — needs restocking'),
    time: localizedText('منذ 25د', '25 min ago'),
  },
  {
    id: 3,
    kind: 'prescription',
    text: localizedText('روشتة جديدة RX-4021 من د. أحمد محمد', 'New prescription RX-4021 from Dr. Ahmed Mohamed'),
    time: localizedText('منذ 40د', '40 min ago'),
  },
  {
    id: 4,
    kind: 'review',
    text: localizedText('تقييم 5 نجوم جديد', 'New 5-star review'),
    time: localizedText('منذ ساعة', '1 hour ago'),
  },
  {
    id: 5,
    kind: 'delivery',
    text: localizedText('ORD-5425 في الطريق مع أحمد سيد', 'ORD-5425 is on the way with Ahmed Sayed'),
    time: localizedText('منذ ساعة', '1 hour ago'),
  },
];

export function formatDate(dateStr, locale = 'ar') {
  return formatLocalizedDate(dateStr, locale);
}
