import { localizedText } from '../utils/localization';

/* ─── Avatars (UI Avatars placeholder) ─── */
const av = (name) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0da694&color=fff&size=256&bold=true&font-size=0.38`;

/* ─── Specialties ─── */
export const SPECIALTIES = [
  localizedText('باطنة', 'Internal Medicine'),
  localizedText('أطفال', 'Pediatrics'),
  localizedText('جلدية', 'Dermatology'),
  localizedText('عظام', 'Orthopedics'),
  localizedText('قلب', 'Cardiology'),
  localizedText('أسنان', 'Dentistry'),
  localizedText('نساء وتوليد', 'Gynecology'),
  localizedText('مخ وأعصاب', 'Neurology'),
  localizedText('أنف وأذن وحنجرة', 'ENT'),
  localizedText('رمد', 'Ophthalmology'),
];

/* ─── Governorates & Cities (bilingual mapping) ─── */
export const GOVERNORATES = [
  { ar: 'القاهرة', en: 'Cairo' },
  { ar: 'الجيزة', en: 'Giza' },
  { ar: 'الإسكندرية', en: 'Alexandria' },
  { ar: 'الدقهلية', en: 'Dakahlia' },
  { ar: 'الشرقية', en: 'Sharqia' },
  { ar: 'الغربية', en: 'Gharbia' },
];

export const CITIES = {
  القاهرة: [{ ar: 'مدينة نصر', en: 'Nasr City' }, { ar: 'المعادي', en: 'Maadi' }, { ar: 'مصر الجديدة', en: 'Heliopolis' }, { ar: 'التجمع الخامس', en: 'Fifth Settlement' }, { ar: 'شبرا', en: 'Shubra' }],
  Cairo: [{ ar: 'مدينة نصر', en: 'Nasr City' }, { ar: 'المعادي', en: 'Maadi' }, { ar: 'مصر الجديدة', en: 'Heliopolis' }, { ar: 'التجمع الخامس', en: 'Fifth Settlement' }, { ar: 'شبرا', en: 'Shubra' }],
  الجيزة: [{ ar: 'الدقي', en: 'Dokki' }, { ar: 'المهندسين', en: 'Mohandessin' }, { ar: 'الهرم', en: 'Haram' }, { ar: 'الشيخ زايد', en: 'Sheikh Zayed' }, { ar: 'أكتوبر', en: 'October' }],
  Giza: [{ ar: 'الدقي', en: 'Dokki' }, { ar: 'المهندسين', en: 'Mohandessin' }, { ar: 'الهرم', en: 'Haram' }, { ar: 'الشيخ زايد', en: 'Sheikh Zayed' }, { ar: 'أكتوبر', en: 'October' }],
  الإسكندرية: [{ ar: 'سموحة', en: 'Smouha' }, { ar: 'سيدي جابر', en: 'Sidi Gaber' }, { ar: 'المنتزه', en: 'Montazah' }],
  Alexandria: [{ ar: 'سموحة', en: 'Smouha' }, { ar: 'سيدي جابر', en: 'Sidi Gaber' }, { ar: 'المنتزه', en: 'Montazah' }],
  الدقهلية: [{ ar: 'المنصورة', en: 'Mansoura' }, { ar: 'طلخا', en: 'Talkha' }],
  Dakahlia: [{ ar: 'المنصورة', en: 'Mansoura' }, { ar: 'طلخا', en: 'Talkha' }],
  الشرقية: [{ ar: 'الزقازيق', en: 'Zagazig' }, { ar: 'بلبيس', en: 'Bilbeis' }],
  Sharqia: [{ ar: 'الزقازيق', en: 'Zagazig' }, { ar: 'بلبيس', en: 'Bilbeis' }],
  الغربية: [{ ar: 'طنطا', en: 'Tanta' }, { ar: 'المحلة الكبرى', en: 'Mahalla' }],
  Gharbia: [{ ar: 'طنطا', en: 'Tanta' }, { ar: 'المحلة الكبرى', en: 'Mahalla' }],
};

/* ─── Reviews helper ─── */
function makeReviews(items) {
  return items.map((r, i) => ({ id: i + 1, ...r }));
}

/* ─── Doctors List ─── */
export const DOCTORS = [
  {
    id: 1,
    name: localizedText('د. أحمد محمود', 'Dr. Ahmed Mahmoud'),
    specialty: SPECIALTIES[0],
    governorate: { ar: 'القاهرة', en: 'Cairo' },
    city: { ar: 'مدينة نصر', en: 'Nasr City' },
    rating: 4.9, reviewCount: 127,
    consultationFee: 350,
    experience: 18,
    patientsCount: 2400,
    avatar: av('Ahmed Mahmoud'),
    bio: localizedText(
      'أستاذ الباطنة العامة بكلية الطب جامعة القاهرة. متخصص في أمراض الجهاز الهضمي والكبد مع خبرة تزيد عن 18 عاماً.',
      'Professor of Internal Medicine at Cairo University. Specialized in gastroenterology and hepatology with over 18 years of experience.'
    ),
    availability: ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00'],
    clinicName: localizedText('عيادة النخبة الطبية', 'Elite Medical Clinic'),
    clinicAddress: localizedText('شارع مصطفى النحاس، مدينة نصر', 'Mostafa El-Nahas St, Nasr City'),
    clinicPhone: '+20 100 123 4567',
    reviews: makeReviews([
      { patient: localizedText('سارة أحمد', 'Sara Ahmed'), rating: 5, date: '2026-04-10', comment: localizedText('دكتور ممتاز ومتابع جداً. بيشرح كل حاجة بالتفصيل.', 'Excellent doctor, very attentive. Explains everything in detail.') },
      { patient: localizedText('محمد علي', 'Mohamed Ali'), rating: 5, date: '2026-04-05', comment: localizedText('أفضل دكتور باطنة في القاهرة. شخّص حالتي بدقة.', 'Best internist in Cairo. Diagnosed my condition accurately.') },
      { patient: localizedText('نورا حسن', 'Noura Hassan'), rating: 4, date: '2026-03-28', comment: localizedText('دكتور كويس بس الانتظار كان طويل شوية.', 'Good doctor but the wait was a bit long.') },
    ]),
  },
  {
    id: 2,
    name: localizedText('د. ريم سليمان', 'Dr. Reem Soliman'),
    specialty: SPECIALTIES[1],
    governorate: { ar: 'القاهرة', en: 'Cairo' },
    city: { ar: 'التجمع الخامس', en: 'Fifth Settlement' },
    rating: 4.8, reviewCount: 95,
    consultationFee: 400,
    experience: 12,
    patientsCount: 1800,
    avatar: av('Reem Soliman'),
    bio: localizedText(
      'استشاري طب الأطفال وحديثي الولادة. حاصلة على الزمالة البريطانية.',
      'Pediatric and neonatology consultant. Holds a British fellowship.'
    ),
    availability: ['10:00', '10:30', '11:00', '11:30', '16:00', '16:30', '17:00'],
    clinicName: localizedText('مركز أطفالنا الطبي', 'Our Kids Medical Center'),
    clinicAddress: localizedText('التجمع الخامس، القاهرة الجديدة', 'Fifth Settlement, New Cairo'),
    clinicPhone: '+20 101 234 5678',
    reviews: makeReviews([
      { patient: localizedText('أمل خالد', 'Amal Khaled'), rating: 5, date: '2026-04-12', comment: localizedText('دكتورة ممتازة مع الأطفال. بنتي بتحبها جداً.', 'Excellent with children. My daughter loves her.') },
      { patient: localizedText('يوسف عبدالله', 'Youssef Abdallah'), rating: 5, date: '2026-04-01', comment: localizedText('أفضل دكتورة أطفال اتعاملنا معاها.', 'Best pediatrician we have dealt with.') },
    ]),
  },
  {
    id: 3,
    name: localizedText('د. خالد نور', 'Dr. Khaled Nour'),
    specialty: SPECIALTIES[4],
    governorate: { ar: 'الجيزة', en: 'Giza' },
    city: { ar: 'المهندسين', en: 'Mohandessin' },
    rating: 4.7, reviewCount: 210,
    consultationFee: 500,
    experience: 22,
    patientsCount: 4200,
    avatar: av('Khaled Nour'),
    bio: localizedText(
      'أستاذ أمراض القلب والأوعية الدموية. متخصص في قسطرة القلب التشخيصية والعلاجية.',
      'Professor of Cardiology. Specialized in diagnostic and therapeutic cardiac catheterization.'
    ),
    availability: ['08:00', '08:30', '09:00', '09:30', '13:00', '13:30'],
    clinicName: localizedText('مركز قلب المهندسين', 'Mohandessin Heart Center'),
    clinicAddress: localizedText('شارع جامعة الدول العربية، المهندسين', 'Arab League St, Mohandessin'),
    clinicPhone: '+20 102 345 6789',
    reviews: makeReviews([
      { patient: localizedText('عادل فهمي', 'Adel Fahmy'), rating: 5, date: '2026-04-08', comment: localizedText('دكتور من الطراز الأول. عمل لي قسطرة وكانت ناجحة.', 'A first-class doctor. Performed a successful catheterization.') },
      { patient: localizedText('هدى مصطفى', 'Hoda Mostafa'), rating: 4, date: '2026-03-20', comment: localizedText('شاطر جداً بس أسعاره غالية.', 'Very skilled but prices are high.') },
      { patient: localizedText('سمير جابر', 'Samir Gaber'), rating: 5, date: '2026-03-15', comment: localizedText('أنقذ حياتي بفضل الله. دكتور محترم جداً.', 'Saved my life by God\'s grace. Very respectable doctor.') },
    ]),
  },
  {
    id: 4,
    name: localizedText('د. منى الشافعي', 'Dr. Mona El-Shafei'),
    specialty: SPECIALTIES[2],
    governorate: { ar: 'الإسكندرية', en: 'Alexandria' },
    city: { ar: 'سموحة', en: 'Smouha' },
    rating: 4.6, reviewCount: 78,
    consultationFee: 300,
    experience: 10,
    patientsCount: 1200,
    avatar: av('Mona ElShafei'),
    bio: localizedText(
      'أخصائية الأمراض الجلدية والتجميل. متخصصة في علاج حب الشباب والليزر.',
      'Dermatology and cosmetics specialist. Expert in acne treatment and laser procedures.'
    ),
    availability: ['11:00', '11:30', '12:00', '15:00', '15:30', '16:00', '16:30'],
    clinicName: localizedText('عيادة الجمال الطبية', 'Beauty Medical Clinic'),
    clinicAddress: localizedText('شارع فوزي معاذ، سموحة', 'Fawzy Moaz St, Smouha'),
    clinicPhone: '+20 103 456 7890',
    reviews: makeReviews([
      { patient: localizedText('ياسمين عمر', 'Yasmine Omar'), rating: 5, date: '2026-04-15', comment: localizedText('نتيجة جلسات الليزر ممتازة.', 'Laser session results are excellent.') },
      { patient: localizedText('دينا حسام', 'Dina Hossam'), rating: 4, date: '2026-03-30', comment: localizedText('دكتورة شاطرة والعيادة نظيفة.', 'Skilled doctor and clean clinic.') },
    ]),
  },
  {
    id: 5,
    name: localizedText('د. عمر فاروق', 'Dr. Omar Farouk'),
    specialty: SPECIALTIES[3],
    governorate: { ar: 'القاهرة', en: 'Cairo' },
    city: { ar: 'المعادي', en: 'Maadi' },
    rating: 4.5, reviewCount: 156,
    consultationFee: 450,
    experience: 15,
    patientsCount: 3100,
    avatar: av('Omar Farouk'),
    bio: localizedText(
      'استشاري جراحة العظام والمفاصل. متخصص في إصابات الملاعب وتغيير المفاصل.',
      'Orthopedic surgery consultant. Specialized in sports injuries and joint replacement.'
    ),
    availability: ['09:00', '09:30', '10:00', '14:00', '14:30', '15:00', '15:30', '16:00'],
    clinicName: localizedText('مركز العظام التخصصي', 'Specialized Bone Center'),
    clinicAddress: localizedText('شارع 9، المعادي', 'Street 9, Maadi'),
    clinicPhone: '+20 104 567 8901',
    reviews: makeReviews([
      { patient: localizedText('كريم حسن', 'Karim Hassan'), rating: 5, date: '2026-04-11', comment: localizedText('عمل لي عملية رباط صليبي وكانت ناجحة جداً.', 'ACL surgery was very successful.') },
      { patient: localizedText('تامر سعيد', 'Tamer Said'), rating: 4, date: '2026-03-25', comment: localizedText('دكتور ممتاز في تشخيص مشاكل العظام.', 'Excellent at diagnosing bone problems.') },
    ]),
  },
  {
    id: 6,
    name: localizedText('د. لينا حسن', 'Dr. Lina Hassan'),
    specialty: SPECIALTIES[5],
    governorate: { ar: 'الجيزة', en: 'Giza' },
    city: { ar: 'الشيخ زايد', en: 'Sheikh Zayed' },
    rating: 4.9, reviewCount: 88,
    consultationFee: 250,
    experience: 8,
    patientsCount: 950,
    avatar: av('Lina Hassan'),
    bio: localizedText(
      'طبيبة أسنان تجميلية. متخصصة في تبييض الأسنان وابتسامة هوليوود.',
      'Cosmetic dentist. Specialized in teeth whitening and Hollywood smile.'
    ),
    availability: ['10:00', '10:30', '11:00', '11:30', '12:00', '17:00', '17:30', '18:00'],
    clinicName: localizedText('عيادة ابتسامة زايد', 'Zayed Smile Clinic'),
    clinicAddress: localizedText('مول العرب، الشيخ زايد', 'Mall of Arabia, Sheikh Zayed'),
    clinicPhone: '+20 105 678 9012',
    reviews: makeReviews([
      { patient: localizedText('سلمى أحمد', 'Salma Ahmed'), rating: 5, date: '2026-04-14', comment: localizedText('عملت هوليود سمايل والنتيجة مذهلة!', 'Got a Hollywood smile and the result is amazing!') },
      { patient: localizedText('هاني محمد', 'Hani Mohamed'), rating: 5, date: '2026-04-02', comment: localizedText('أفضل دكتورة أسنان اتعاملت معاها.', 'Best dentist I have ever dealt with.') },
    ]),
  },
  {
    id: 7,
    name: localizedText('د. سارة أحمد', 'Dr. Sara Ahmed'),
    specialty: SPECIALTIES[6],
    governorate: { ar: 'القاهرة', en: 'Cairo' },
    city: { ar: 'مصر الجديدة', en: 'Heliopolis' },
    rating: 4.8, reviewCount: 142,
    consultationFee: 400,
    experience: 14,
    patientsCount: 2800,
    avatar: av('Sara Ahmed'),
    bio: localizedText(
      'استشاري أمراض النساء والتوليد. متخصصة في متابعة الحمل والولادة الطبيعية.',
      'OB/GYN consultant. Specialized in pregnancy follow-up and natural delivery.'
    ),
    availability: ['09:00', '09:30', '10:00', '10:30', '15:00', '15:30', '16:00'],
    clinicName: localizedText('عيادة حواء التخصصية', 'Eve Specialty Clinic'),
    clinicAddress: localizedText('شارع الحجاز، مصر الجديدة', 'El-Hegaz St, Heliopolis'),
    clinicPhone: '+20 106 789 0123',
    reviews: makeReviews([
      { patient: localizedText('فاطمة إبراهيم', 'Fatma Ibrahim'), rating: 5, date: '2026-04-09', comment: localizedText('تابعت معاها حملي كله وولدت طبيعي.', 'She followed my entire pregnancy and I delivered naturally.') },
    ]),
  },
  {
    id: 8,
    name: localizedText('د. محمد علي', 'Dr. Mohamed Ali'),
    specialty: SPECIALTIES[7],
    governorate: { ar: 'الجيزة', en: 'Giza' },
    city: { ar: 'الدقي', en: 'Dokki' },
    rating: 4.4, reviewCount: 65,
    consultationFee: 550,
    experience: 20,
    patientsCount: 1500,
    avatar: av('Mohamed Ali'),
    bio: localizedText(
      'أستاذ المخ والأعصاب. متخصص في علاج الصداع النصفي والصرع.',
      'Professor of Neurology. Specialized in migraine and epilepsy treatment.'
    ),
    availability: ['08:00', '08:30', '09:00', '13:00', '13:30'],
    clinicName: localizedText('مركز الأعصاب التخصصي', 'Specialized Neurology Center'),
    clinicAddress: localizedText('شارع التحرير، الدقي', 'Tahrir St, Dokki'),
    clinicPhone: '+20 107 890 1234',
    reviews: makeReviews([
      { patient: localizedText('علي محمود', 'Ali Mahmoud'), rating: 5, date: '2026-04-06', comment: localizedText('دكتور محترم جداً وفاهم.', 'Very respectable and knowledgeable doctor.') },
      { patient: localizedText('ندى سمير', 'Nada Samir'), rating: 4, date: '2026-03-22', comment: localizedText('عالج الصداع النصفي بتاعي بنجاح.', 'Successfully treated my migraines.') },
    ]),
  },
  {
    id: 9,
    name: localizedText('د. حسام الدين', 'Dr. Hossam El-Din'),
    specialty: SPECIALTIES[8],
    governorate: { ar: 'الدقهلية', en: 'Dakahlia' },
    city: { ar: 'المنصورة', en: 'Mansoura' },
    rating: 4.3, reviewCount: 52,
    consultationFee: 200,
    experience: 9,
    patientsCount: 800,
    avatar: av('Hossam ElDin'),
    bio: localizedText(
      'أخصائي أنف وأذن وحنجرة. خبرة في جراحات اللوزتين وعلاج الجيوب الأنفية.',
      'ENT specialist. Experienced in tonsillectomy and sinus treatment.'
    ),
    availability: ['10:00', '10:30', '11:00', '11:30', '17:00', '17:30', '18:00', '18:30'],
    clinicName: localizedText('عيادة السمع والحنجرة', 'Hearing & Throat Clinic'),
    clinicAddress: localizedText('شارع الجمهورية، المنصورة', 'El-Gomhoria St, Mansoura'),
    clinicPhone: '+20 108 901 2345',
    reviews: makeReviews([
      { patient: localizedText('مريم عادل', 'Mariam Adel'), rating: 4, date: '2026-04-03', comment: localizedText('عملية اللوز كانت سهلة وبدون مشاكل.', 'Tonsil surgery was easy and problem-free.') },
    ]),
  },
  {
    id: 10,
    name: localizedText('د. نورا هاشم', 'Dr. Noura Hashem'),
    specialty: SPECIALTIES[1],
    governorate: { ar: 'الغربية', en: 'Gharbia' },
    city: { ar: 'طنطا', en: 'Tanta' },
    rating: 4.6, reviewCount: 71,
    consultationFee: 180,
    experience: 7,
    patientsCount: 650,
    avatar: av('Noura Hashem'),
    bio: localizedText(
      'أخصائية طب الأطفال. خبرة في أمراض الأطفال الشائعة والتطعيمات.',
      'Pediatric specialist. Experienced in common childhood diseases and vaccinations.'
    ),
    availability: ['09:00', '09:30', '10:00', '10:30', '11:00', '15:00', '15:30'],
    clinicName: localizedText('عيادة براعم طنطا', 'Tanta Buds Clinic'),
    clinicAddress: localizedText('شارع سعيد، طنطا', 'Said St, Tanta'),
    clinicPhone: '+20 109 012 3456',
    reviews: makeReviews([
      { patient: localizedText('إيمان حسين', 'Iman Hussein'), rating: 5, date: '2026-04-13', comment: localizedText('بنتي اتحسنت كتير بعد الكشف.', 'My daughter improved a lot after the consultation.') },
    ]),
  },
  {
    id: 11,
    name: localizedText('د. طارق عبدالرحمن', 'Dr. Tarek Abdelrahman'),
    specialty: SPECIALTIES[0],
    governorate: { ar: 'الشرقية', en: 'Sharqia' },
    city: { ar: 'الزقازيق', en: 'Zagazig' },
    rating: 4.2, reviewCount: 44,
    consultationFee: 150,
    experience: 6,
    patientsCount: 500,
    avatar: av('Tarek Abdelrahman'),
    bio: localizedText(
      'أخصائي الطب الباطني. متخصص في أمراض السكر والضغط.',
      'Internal medicine specialist. Expert in diabetes and hypertension.'
    ),
    availability: ['09:00', '09:30', '10:00', '14:00', '14:30', '15:00'],
    clinicName: localizedText('عيادة الشفاء', 'Al-Shifa Clinic'),
    clinicAddress: localizedText('شارع الجلاء، الزقازيق', 'El-Galaa St, Zagazig'),
    clinicPhone: '+20 110 123 4567',
    reviews: makeReviews([
      { patient: localizedText('حسن محمد', 'Hassan Mohamed'), rating: 4, date: '2026-04-07', comment: localizedText('دكتور كويس وأسعاره مناسبة.', 'Good doctor with reasonable prices.') },
    ]),
  },
  {
    id: 12,
    name: localizedText('د. ياسمين فؤاد', 'Dr. Yasmine Fouad'),
    specialty: SPECIALTIES[9],
    governorate: { ar: 'الإسكندرية', en: 'Alexandria' },
    city: { ar: 'سيدي جابر', en: 'Sidi Gaber' },
    rating: 4.7, reviewCount: 93,
    consultationFee: 350,
    experience: 11,
    patientsCount: 1600,
    avatar: av('Yasmine Fouad'),
    bio: localizedText(
      'استشاري طب وجراحة العيون. متخصصة في عمليات الليزك وعلاج المياه البيضاء.',
      'Ophthalmology consultant. Specialized in LASIK and cataract surgery.'
    ),
    availability: ['08:00', '08:30', '09:00', '09:30', '12:00', '12:30', '13:00'],
    clinicName: localizedText('مركز النظر للعيون', 'Vision Eye Center'),
    clinicAddress: localizedText('شارع بورسعيد، سيدي جابر', 'Port Said St, Sidi Gaber'),
    clinicPhone: '+20 111 234 5678',
    reviews: makeReviews([
      { patient: localizedText('رانيا سعد', 'Rania Saad'), rating: 5, date: '2026-04-16', comment: localizedText('عملت ليزك والنتيجة ممتازة. بشوف 6/6.', 'Had LASIK and the result is excellent. 6/6 vision.') },
      { patient: localizedText('أحمد فتحي', 'Ahmed Fathy'), rating: 5, date: '2026-03-29', comment: localizedText('عملية المياه البيضاء كانت سهلة وسريعة.', 'Cataract surgery was easy and quick.') },
    ]),
  },
];

/* ─── Helper: get doctor by id ─── */
export function getDoctorById(id) {
  return DOCTORS.find((d) => d.id === Number(id)) || null;
}
