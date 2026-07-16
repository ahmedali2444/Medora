import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, Clock, Pill, Sparkles, Stethoscope, Store, ThumbsUp, Truck } from 'lucide-react';
import MedicineLayout from '../../components/medicine/layout/MedicineLayout';
import MedicineDetailHeader from '../../components/medicine/detail/MedicineDetailHeader';
import MedicineUsages from '../../components/medicine/detail/MedicineUsages';
import MedicineWarnings from '../../components/medicine/detail/MedicineWarnings';
import MedicineDosage from '../../components/medicine/detail/MedicineDosage';
import MedicineAlternatives from '../../components/medicine/detail/MedicineAlternatives';
import NearbyPharmacies from '../../components/medicine/detail/NearbyPharmacies';
import CartFab from '../../components/medicine/layout/CartFab';
import CartDrawer from '../../components/medicine/layout/CartDrawer';
import FavoritesDrawer from '../../components/medicine/layout/FavoritesDrawer';
import DeliveryOptionSheet from '../../components/medicine/layout/DeliveryOptionSheet';
import { useLang } from '../../context/LanguageContext';
import {
  MEDICINE_SYMPTOM_LABELS,
  getMedicineAlternatives,
  getMedicineById,
} from '../../components/medicine/data/medicineData';
import { getLocalizedText } from '../../utils/localization';

function SymptomsSummary({ symptoms = [], isRtl, lang }) {
  if (!symptoms.length) return null;

  return (
    <div
      className="rounded-[22px] border border-[#d7e7e5] bg-gradient-to-br from-[#eef8f7] to-white p-5 shadow-[0_10px_28px_rgba(41,93,96,0.08)]"
      style={{ fontFamily: 'Cairo, sans-serif' }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-full bg-[#e6f7f7] px-2.5 py-1 text-[10px] font-bold text-[#119a8a]">
          {isRtl ? 'ملخّص سريع' : 'Quick summary'}
        </span>
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-[#084036]">
          <span>{isRtl ? 'الأعراض التي يساعد فيها' : 'Helpful for symptoms like'}</span>
          <Stethoscope size={15} className="text-[#119a8a]" />
        </h3>
      </div>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {symptoms.map((key) => (
          <li
            key={key}
            className="flex items-center justify-end gap-2 rounded-xl bg-white px-3 py-2 text-[12px] font-bold text-[#2d6669] ring-1 ring-[#e6efef]"
          >
            <span>{getLocalizedText(MEDICINE_SYMPTOM_LABELS[key], lang, key)}</span>
            <ThumbsUp size={13} className="text-[#14b8a6]" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function FulfillmentStrip({ deliveryAvailable, pickupAvailable, isRtl }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2" style={{ fontFamily: 'Cairo, sans-serif' }}>
      <div
        className="flex items-center gap-3 rounded-2xl border border-[#d7e7e5] bg-white px-4 py-3 shadow-[0_6px_18px_rgba(41,93,96,0.05)]"
        style={{ opacity: deliveryAvailable ? 1 : 0.55 }}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e6f7f7]">
          <Truck size={16} className="text-[#14b8a6]" />
        </div>
        <div className="flex-1 text-right">
          <div className="text-sm font-extrabold text-[#084036]">
            {isRtl ? 'توصيل للمنزل' : 'Home delivery'}
          </div>
          <div className="text-[11px] text-slate-500">
            {deliveryAvailable
              ? isRtl ? 'متاح خلال 60 دقيقة تقريبًا' : 'Available in about 60 minutes'
              : isRtl ? 'غير متوفر لهذا الدواء' : 'Not available for this medicine'}
          </div>
        </div>
      </div>

      <div
        className="flex items-center gap-3 rounded-2xl border border-[#d7e7e5] bg-white px-4 py-3 shadow-[0_6px_18px_rgba(41,93,96,0.05)]"
        style={{ opacity: pickupAvailable ? 1 : 0.55 }}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef8f7]">
          <Store size={16} className="text-[#0e7c6e]" />
        </div>
        <div className="flex-1 text-right">
          <div className="text-sm font-extrabold text-[#084036]">
            {isRtl ? 'استلام من صيدلية' : 'Pharmacy pickup'}
          </div>
          <div className="text-[11px] text-slate-500">
            {pickupAvailable
              ? isRtl ? 'اختر فرعًا قريبًا من موقعك' : 'Choose a branch near your location'
              : isRtl ? 'غير متوفر لهذا الدواء' : 'Not available for this medicine'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MedicineDetailPage() {
  const { id } = useParams();
  const { lang } = useLang();
  const isRtl = lang !== 'en';
  const [activeTab, setActiveTab] = useState('usages');
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [fulfillmentFor, setFulfillmentFor] = useState(null);

  const medicine = getMedicineById(id);
  const alternatives = getMedicineAlternatives(medicine);

  const tabs = [
    { key: 'usages', label: isRtl ? 'الاستخدامات' : 'Uses', Icon: Pill },
    { key: 'warnings', label: isRtl ? 'التحذيرات' : 'Warnings', Icon: AlertTriangle },
    { key: 'dosage', label: isRtl ? 'الجرعة' : 'Dosage', Icon: Clock },
    { key: 'alternatives', label: isRtl ? 'البدائل' : 'Alternatives', Icon: Sparkles },
    { key: 'pharmacies', label: isRtl ? 'صيدليات قريبة' : 'Nearby pharmacies', Icon: Store },
  ];

  if (!medicine) {
    return (
      <MedicineLayout>
        <div className="mx-auto max-w-3xl px-4 py-12" style={{ fontFamily: 'Cairo, sans-serif' }}>
          <div
            className="rounded-3xl border border-[#e4eeee] bg-white p-8 text-center"
            style={{ boxShadow: '0px 10px 30px rgba(8,64,54,0.08)' }}
          >
            <div className="mb-4 text-5xl">💊</div>
            <h1 className="mb-3 text-2xl font-black text-[#084036]">
              {isRtl ? 'الدواء غير موجود' : 'Medicine not found'}
            </h1>
            <p className="mb-6 text-[13px] leading-7 text-slate-600">
              {isRtl
                ? 'الرابط الحالي لا يشير إلى دواء متاح في قاعدة البيانات. يمكنك الرجوع لنتائج الأدوية واختيار منتج آخر.'
                : 'This link does not point to a medicine available in the database. You can return to the medicine list and choose another product.'}
            </p>
            <Link
              to="/medicine"
              className="inline-flex items-center gap-2 rounded-full bg-[#14b8a6] px-5 py-3 font-extrabold text-white transition hover:bg-[#119a8a]"
            >
              {isRtl ? 'العودة إلى صفحة الأدوية' : 'Back to medicines'}
            </Link>
          </div>
        </div>
      </MedicineLayout>
    );
  }

  return (
    <MedicineLayout>
      <div className="bg-[#f3fafa] py-8" style={{ fontFamily: 'Cairo, sans-serif' }}>
        <div className="mx-auto max-w-4xl px-4 animate-fadeInUp">
          <MedicineDetailHeader
            {...medicine}
            onShowPharmacies={() => setActiveTab('pharmacies')}
            onRequestFulfillment={(med) => setFulfillmentFor(med)}
          />

          <div className="mt-5 grid gap-4 md:grid-cols-[1.3fr_1fr]">
            <SymptomsSummary symptoms={medicine.symptoms} isRtl={isRtl} lang={lang} />
            <FulfillmentStrip
              deliveryAvailable={medicine.deliveryAvailable}
              pickupAvailable={medicine.pickupAvailable}
              isRtl={isRtl}
            />
          </div>

          <div className="mt-6 flex gap-1 overflow-x-auto rounded-2xl border border-[#e4eeee] bg-white p-1.5 shadow-[0_6px_18px_rgba(41,93,96,0.05)]">
            {tabs.map((tab) => {
              const TabIcon = tab.Icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-[12px] font-extrabold transition-all ${
                    activeTab === tab.key
                      ? 'bg-[#14b8a6] text-white shadow-[0_8px_18px_rgba(20,184,166,0.3)]'
                      : 'text-slate-500 hover:bg-[#f7fbfb] hover:text-[#14b8a6]'
                  }`}
                >
                  <TabIcon size={13} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            {activeTab === 'usages' && <MedicineUsages />}
            {activeTab === 'warnings' && <MedicineWarnings />}
            {activeTab === 'dosage' && <MedicineDosage />}
            {activeTab === 'alternatives' && (
              <MedicineAlternatives currentMedicine={medicine} alternatives={alternatives} />
            )}
            {activeTab === 'pharmacies' && <NearbyPharmacies medicineName={medicine.name} />}
          </div>
        </div>
      </div>

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
