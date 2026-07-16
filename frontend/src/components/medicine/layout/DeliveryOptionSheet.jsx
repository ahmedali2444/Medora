import React, { useState } from 'react';
import { Check, MapPin, Phone, Store, Truck, X } from 'lucide-react';
import { formatMedicinePrice, getPharmaciesByProximity } from '../data/medicineData';
import { useCart } from './CartContext';
import { useToast } from './ToastContext';
import { useLang } from '../../../context/LanguageContext';
import { getLocalizedText } from '../../../utils/localization';

function formatDistance(distanceKm, isRtl) {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} ${isRtl ? 'م' : 'm'}`;
  }
  return `${distanceKm.toFixed(1)} ${isRtl ? 'كم' : 'km'}`;
}

export default function DeliveryOptionSheet({ medicine, open, onClose }) {
  if (!open || !medicine) return null;
  return <DeliveryOptionSheetInner key={medicine.id} medicine={medicine} onClose={onClose} />;
}

function DeliveryOptionSheetInner({ medicine, onClose }) {
  const [mode, setMode] = useState('delivery');
  const [pharmacyId, setPharmacyId] = useState(null);
  const [locationReady, setLocationReady] = useState(true);
  const { setFulfillment, setItemPharmacy, isInCart } = useCart();
  const { showToast } = useToast();
  const { lang } = useLang();
  const isRtl = lang !== 'en';
  const medicineName = getLocalizedText(medicine.name, lang, medicine.name);

  const pharmacies = getPharmaciesByProximity();

  const handleConfirm = () => {
    if (!isInCart(medicine.id)) {
      onClose();
      return;
    }

    if (mode === 'pickup' && !pharmacyId) {
      showToast(isRtl ? 'اختر صيدلية أولًا' : 'Choose a pharmacy first');
      return;
    }

    if (mode === 'delivery') {
      setFulfillment(medicine.id, 'delivery');
      showToast(isRtl ? 'سيتم توصيل الدواء لعنوانك' : 'The medicine will be delivered to your address');
    } else {
      setItemPharmacy(medicine.id, pharmacyId);
      const pharmacy = pharmacies.find((p) => p.id === pharmacyId);
      showToast(
        isRtl
          ? `تم تحديد ${getLocalizedText(pharmacy?.name, lang, pharmacy?.name)} للاستلام ✓`
          : `${getLocalizedText(pharmacy?.name, lang, pharmacy?.name)} selected for pickup ✓`,
      );
    }

    onClose();
  };

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-[10000] flex items-end justify-center bg-slate-900/45 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_-20px_60px_rgba(8,64,54,0.25)] animate-fadeInUp sm:rounded-[28px] sm:shadow-[0_24px_80px_rgba(8,64,54,0.3)]"
        style={{ fontFamily: 'Cairo, sans-serif' }}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#e4eeee] bg-gradient-to-l from-[#f1fbfa] to-white px-5 py-4">
          <div>
            <div className="text-sm font-bold text-[#295d60]">
              {isRtl ? 'طريقة استلام الدواء' : 'How to receive your medicine'}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {isRtl
                ? 'اختر الأنسب لك: توصيل لباب المنزل أو استلام من الصيدلية.'
                : 'Choose what fits you best: doorstep delivery or pharmacy pickup.'}
            </div>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d7e7e5] bg-white text-[#295d60] transition hover:border-[#14b8a6]"
            aria-label={isRtl ? 'إغلاق' : 'Close'}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex items-center gap-3 rounded-2xl border border-[#dceceb] bg-[#f7fbfb] p-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white" style={{ boxShadow: '0 6px 16px rgba(41,93,96,0.08)' }}>
              <span className="text-xl">💊</span>
            </div>
            <div className="flex-1 text-right">
              <div className="text-sm font-extrabold text-[#295d60]">{medicineName}</div>
              <div className="mt-0.5 text-xs text-slate-500">{medicine.company}</div>
            </div>
            <div className="text-left">
              <div className="text-[10px] text-slate-500">{isRtl ? 'السعر' : 'Price'}</div>
              <div className="text-base font-black text-[#295d60]">
                {formatMedicinePrice(medicine.price)}{' '}
                <span className="text-[10px] font-semibold text-[#14b8a6]">{isRtl ? 'ج.م' : 'EGP'}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => setMode('delivery')}
              className="group relative rounded-2xl border p-4 text-right transition-all"
              style={{
                borderColor: mode === 'delivery' ? '#14b8a6' : '#d7e7e5',
                background: mode === 'delivery' ? '#e6f7f7' : '#ffffff',
                boxShadow:
                  mode === 'delivery'
                    ? '0 10px 24px rgba(20,184,166,0.18)'
                    : '0 4px 14px rgba(41,93,96,0.05)',
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: mode === 'delivery' ? '#14b8a6' : '#e6f7f7' }}>
                  <Truck size={18} color={mode === 'delivery' ? '#ffffff' : '#14b8a6'} />
                </div>
                {mode === 'delivery' && (
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#14b8a6] text-white">
                    <Check size={14} />
                  </span>
                )}
              </div>
              <div className="text-sm font-extrabold text-[#295d60]">{isRtl ? 'توصيل للمنزل' : 'Home delivery'}</div>
              <div className="mt-1 text-xs leading-6 text-slate-600">
                {isRtl
                  ? 'خلال 60 دقيقة تقريبًا مع رسوم توصيل من أقرب صيدلية.'
                  : 'Usually within about 60 minutes with a delivery fee from the nearest pharmacy.'}
              </div>
            </button>

            <button
              onClick={() => setMode('pickup')}
              className="group relative rounded-2xl border p-4 text-right transition-all"
              style={{
                borderColor: mode === 'pickup' ? '#14b8a6' : '#d7e7e5',
                background: mode === 'pickup' ? '#e6f7f7' : '#ffffff',
                boxShadow:
                  mode === 'pickup'
                    ? '0 10px 24px rgba(20,184,166,0.18)'
                    : '0 4px 14px rgba(41,93,96,0.05)',
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: mode === 'pickup' ? '#14b8a6' : '#e6f7f7' }}>
                  <Store size={18} color={mode === 'pickup' ? '#ffffff' : '#14b8a6'} />
                </div>
                {mode === 'pickup' && (
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#14b8a6] text-white">
                    <Check size={14} />
                  </span>
                )}
              </div>
              <div className="text-sm font-extrabold text-[#295d60]">{isRtl ? 'استلام من الصيدلية' : 'Pharmacy pickup'}</div>
              <div className="mt-1 text-xs leading-6 text-slate-600">
                {isRtl
                  ? 'اختر فرعًا قريبًا واستلم دواءك دون رسوم توصيل.'
                  : 'Choose a nearby branch and collect your medicine with no delivery fee.'}
              </div>
            </button>
          </div>

          {mode === 'pickup' && (
            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-extrabold text-[#295d60]">
                    {isRtl ? 'الصيدليات الأقرب لموقعك' : 'Closest pharmacies to you'}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {isRtl
                      ? 'مرتّبة من الأقرب للأبعد حسب موقعك الحالي.'
                      : 'Ordered from nearest to farthest based on your current location.'}
                  </div>
                </div>
                <button
                  onClick={() => setLocationReady((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#d7e7e5] bg-white px-3 py-1.5 text-[11px] font-bold text-[#2d6669] transition hover:border-[#14b8a6]"
                >
                  <MapPin size={12} />
                  {locationReady ? (isRtl ? 'تحديث موقعي' : 'Refresh location') : (isRtl ? 'تفعيل الموقع' : 'Enable location')}
                </button>
              </div>

              {!locationReady ? (
                <div className="rounded-2xl border border-dashed border-[#cfe4e2] bg-[#f7fbfb] p-5 text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white">
                    <MapPin size={18} color="#14b8a6" />
                  </div>
                  <div className="text-sm font-bold text-[#295d60]">
                    {isRtl
                      ? 'نحتاج إذن الموقع لعرض الصيدليات الأقرب'
                      : 'We need location permission to show the nearest pharmacies'}
                  </div>
                  <button
                    onClick={() => setLocationReady(true)}
                    className="mt-3 rounded-full bg-[#14b8a6] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#119a8a]"
                  >
                    {isRtl ? 'السماح بالوصول لموقعي' : 'Allow location access'}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {pharmacies.map((pharmacy) => {
                    const selected = pharmacyId === pharmacy.id;
                    return (
                      <button
                        key={pharmacy.id}
                        onClick={() => setPharmacyId(pharmacy.id)}
                        disabled={!pharmacy.open}
                        className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-right transition-all disabled:cursor-not-allowed disabled:opacity-55"
                        style={{
                          borderColor: selected ? '#14b8a6' : '#e4eeee',
                          background: selected ? '#e6f7f7' : '#ffffff',
                          boxShadow: selected
                            ? '0 10px 24px rgba(20,184,166,0.16)'
                            : '0 4px 14px rgba(41,93,96,0.05)',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="rounded-full px-2.5 py-1 text-[10px] font-bold"
                            style={
                              pharmacy.open
                                ? { background: 'rgba(20,184,166,0.12)', color: '#0e7c6e' }
                                : { background: '#eef8f7', color: '#5e8e8e' }
                            }
                          >
                            {pharmacy.open ? (isRtl ? 'مفتوحة الآن' : 'Open now') : (isRtl ? 'مغلقة' : 'Closed')}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#295d60] ring-1 ring-[#d7e7e5]">
                            <MapPin size={11} />
                            {formatDistance(pharmacy.distanceKm, isRtl)}
                          </span>
                        </div>

                        <div className="flex-1 text-right">
                          <div className="flex items-center justify-end gap-2 text-sm font-extrabold text-[#295d60]">
                            {selected && (
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#14b8a6] text-white">
                                <Check size={12} />
                              </span>
                            )}
                            <span>{getLocalizedText(pharmacy.name, lang, pharmacy.name)}</span>
                          </div>
                          <div className="mt-1 flex items-center justify-end gap-3 text-[11px] text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <Phone size={11} />
                              {pharmacy.phone}
                            </span>
                            <span>{getLocalizedText(pharmacy.hours, lang, pharmacy.hours)}</span>
                            <span>— {getLocalizedText(pharmacy.area, lang, pharmacy.area)}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[#e4eeee] bg-[#f7fbfb] px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-full border border-[#d7e7e5] bg-white px-4 py-2.5 text-sm font-bold text-[#2d6669] transition hover:border-[#14b8a6]"
          >
            {isRtl ? 'لاحقًا' : 'Later'}
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 rounded-full bg-[#14b8a6] px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#119a8a]"
          >
            {isRtl ? 'تأكيد الخيار' : 'Confirm choice'}
          </button>
        </div>
      </div>
    </div>
  );
}
