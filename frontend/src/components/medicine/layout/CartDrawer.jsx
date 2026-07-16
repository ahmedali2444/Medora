import React from 'react';
import { MapPin, Minus, Plus, ShoppingBag, Store, Trash2, Truck, X } from 'lucide-react';
import {
  formatMedicinePrice,
  getPharmacyById,
  getPharmaciesByProximity,
} from '../data/medicineData';
import { useCart } from './CartContext';
import { useLang } from '../../../context/LanguageContext';
import { getLocalizedText } from '../../../utils/localization';

export default function CartDrawer() {
  const {
    cart,
    cartCount,
    cartTotal,
    isCartOpen,
    closeCart,
    removeFromCart,
    setItemQuantity,
    setFulfillment,
    setItemPharmacy,
  } = useCart();
  const { lang } = useLang();
  const isRtl = lang !== 'en';

  const pharmacies = getPharmaciesByProximity();
  const emptyPharmacyLabel = isRtl ? 'لم يتم اختيار صيدلية بعد' : 'No pharmacy selected yet';

  const anyPickup = cart.some((item) => item.fulfillment === 'pickup');
  const deliveryFee = cart.length > 0 && !cart.every((item) => item.fulfillment === 'pickup') ? 15 : 0;
  const grandTotal = cartTotal + deliveryFee;

  return (
    <>
      <div
        className={`fixed inset-0 z-[9995] bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200 ${
          isCartOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={closeCart}
      />

      <aside
        dir={isRtl ? 'rtl' : 'ltr'}
        style={{ fontFamily: 'Cairo, sans-serif' }}
        className={`fixed inset-y-0 z-[9996] flex w-full max-w-md flex-col bg-white transition-transform duration-300 ${
          isRtl
            ? 'right-0 border-l border-[#e4eeee] shadow-[-20px_0_60px_rgba(8,64,54,0.2)]'
            : 'left-0 border-r border-[#e4eeee] shadow-[20px_0_60px_rgba(8,64,54,0.2)]'
        } ${
          isCartOpen ? 'translate-x-0' : isRtl ? 'translate-x-full' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#e4eeee] bg-gradient-to-l from-[#f1fbfa] to-white px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#14b8a6] text-white">
              <ShoppingBag size={18} />
            </div>
            <div>
              <div className="text-base font-extrabold text-[#295d60]">
                {isRtl ? 'سلة الأدوية' : 'Medicine cart'}
              </div>
              <div className="text-xs text-slate-500">
                {cartCount > 0
                  ? isRtl
                    ? `${cartCount} عنصر في السلة`
                    : `${cartCount} item${cartCount === 1 ? '' : 's'} in cart`
                  : isRtl
                    ? 'سلتك فارغة حاليًا'
                    : 'Your cart is currently empty'}
              </div>
            </div>
          </div>
          <button
            onClick={closeCart}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d7e7e5] bg-white text-[#295d60] transition hover:border-[#14b8a6]"
            aria-label={isRtl ? 'إغلاق السلة' : 'Close cart'}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#cfe4e2] bg-[#f7fbfb] px-6 py-14 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-[0_10px_24px_rgba(41,93,96,0.08)]">
                <ShoppingBag size={24} color="#14b8a6" />
              </div>
              <div className="text-base font-extrabold text-[#295d60]">
                {isRtl ? 'لم تُضف أدوية بعد' : 'No medicines added yet'}
              </div>
              <div className="mt-2 text-sm leading-7 text-slate-600">
                {isRtl
                  ? 'تصفّح الأدوية وأضف ما تحتاجه إلى السلة. يمكنك اختيار التوصيل أو الاستلام من أقرب صيدلية لك.'
                  : 'Browse medicines and add what you need to the cart. You can choose delivery or pickup from the nearest pharmacy.'}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {cart.map((item) => {
                const pharmacy = item.pharmacyId ? getPharmacyById(item.pharmacyId) : null;
                const itemName = getLocalizedText(item.name, lang, item.name);
                const itemDescription = getLocalizedText(item.description, lang, item.description);
                const pharmacyArea = getLocalizedText(pharmacy?.area, lang, pharmacy?.area);
                const pharmacyHours = getLocalizedText(pharmacy?.hours, lang, pharmacy?.hours);

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-[#e4eeee] bg-white p-4 shadow-[0_6px_18px_rgba(41,93,96,0.06)]"
                  >
                    <div className="flex gap-3">
                      <div
                        className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl"
                        style={{ background: 'rgba(20,184,166,0.1)' }}
                      >
                        {item.image ? (
                          <img src={item.image} alt={itemName} className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <span className="text-2xl">💊</span>
                        )}
                      </div>

                      <div className="flex-1 text-right">
                        <div className="flex items-start justify-between gap-2">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#d7e7e5] bg-[#f7fbfb] text-[#119a8a] transition hover:border-[#14b8a6]"
                            aria-label={`${isRtl ? 'حذف' : 'Remove'} ${itemName}`}
                          >
                            <Trash2 size={14} />
                          </button>
                          <div className="flex-1">
                            <div className="text-sm font-extrabold text-[#295d60]">{itemName}</div>
                            <div className="mt-0.5 text-xs text-slate-500">{item.company}</div>
                          </div>
                        </div>

                        {itemDescription && (
                          <p className="mt-2 line-clamp-2 text-[11px] leading-6 text-slate-500">
                            {itemDescription}
                          </p>
                        )}

                        <div className="mt-3 flex items-center justify-between gap-2">
                          <div className="inline-flex items-center gap-1 rounded-full border border-[#d7e7e5] bg-white">
                            <button
                              onClick={() => setItemQuantity(item.id, item.quantity - 1)}
                              className="flex h-8 w-8 items-center justify-center text-[#2d6669] transition hover:bg-[#f1fbfa]"
                              aria-label={isRtl ? 'إنقاص' : 'Decrease'}
                            >
                              <Minus size={12} />
                            </button>
                            <span className="min-w-[28px] text-center text-sm font-extrabold text-[#295d60]">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => setItemQuantity(item.id, item.quantity + 1)}
                              className="flex h-8 w-8 items-center justify-center text-[#2d6669] transition hover:bg-[#f1fbfa]"
                              aria-label={isRtl ? 'زيادة' : 'Increase'}
                            >
                              <Plus size={12} />
                            </button>
                          </div>

                          <div className="text-left">
                            <div className="text-sm font-black text-[#295d60]">
                              {formatMedicinePrice(item.price * item.quantity)}{' '}
                              <span className="text-[10px] font-semibold text-[#14b8a6]">{isRtl ? 'ج.م' : 'EGP'}</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {formatMedicinePrice(item.price)} × {item.quantity}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#f7fbfb] p-1">
                      <button
                        onClick={() => setFulfillment(item.id, 'delivery')}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold transition-all"
                        style={
                          item.fulfillment === 'delivery'
                            ? {
                                background: '#14b8a6',
                                color: '#ffffff',
                                boxShadow: '0 6px 14px rgba(20,184,166,0.25)',
                              }
                            : { background: 'transparent', color: '#2d6669' }
                        }
                      >
                        <Truck size={12} />
                        <span>{isRtl ? 'توصيل' : 'Delivery'}</span>
                      </button>
                      <button
                        onClick={() => setFulfillment(item.id, 'pickup')}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold transition-all"
                        style={
                          item.fulfillment === 'pickup'
                            ? {
                                background: '#14b8a6',
                                color: '#ffffff',
                                boxShadow: '0 6px 14px rgba(20,184,166,0.25)',
                              }
                            : { background: 'transparent', color: '#2d6669' }
                        }
                      >
                        <Store size={12} />
                        <span>{isRtl ? 'استلام من صيدلية' : 'Pharmacy pickup'}</span>
                      </button>
                    </div>

                    {item.fulfillment === 'pickup' && (
                      <div className="mt-3">
                        <label className="flex flex-col gap-1 text-right">
                          <span className="flex items-center justify-end gap-1 text-[11px] font-bold text-[#295d60]">
                            <MapPin size={11} />
                            {isRtl ? 'اختر الصيدلية (مرتّبة من الأقرب)' : 'Choose a pharmacy (sorted by nearest)'}
                          </span>
                          <select
                            value={item.pharmacyId ?? ''}
                            onChange={(event) => setItemPharmacy(item.id, Number(event.target.value) || null)}
                            className="rounded-xl border border-[#d7e7e5] bg-white px-3 py-2 text-[12px] font-semibold text-[#295d60] outline-none transition focus:border-[#14b8a6]"
                          >
                            <option value="">{emptyPharmacyLabel}</option>
                            {pharmacies.map((pharmacyOption) => (
                              <option key={pharmacyOption.id} value={pharmacyOption.id}>
                                {getLocalizedText(pharmacyOption.name, lang, pharmacyOption.name)} —{' '}
                                {pharmacyOption.distanceKm < 1
                                  ? `${Math.round(pharmacyOption.distanceKm * 1000)}${isRtl ? 'م' : 'm'}`
                                  : `${pharmacyOption.distanceKm.toFixed(1)}${isRtl ? 'كم' : 'km'}`}
                              </option>
                            ))}
                          </select>
                        </label>

                        {pharmacy && (
                          <div className="mt-2 rounded-lg bg-[#f1fbfa] px-3 py-2 text-[11px] leading-6 text-[#2d6669]">
                            {pharmacyHours} · {pharmacyArea}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-[#e4eeee] bg-white px-5 py-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between text-slate-600">
                <span>{isRtl ? 'المجموع الفرعي' : 'Subtotal'}</span>
                <span className="font-bold text-[#295d60]">
                  {formatMedicinePrice(cartTotal)} {isRtl ? 'ج.م' : 'EGP'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>{isRtl ? 'رسوم التوصيل' : 'Delivery fee'}</span>
                <span className="font-bold text-[#295d60]">
                  {deliveryFee === 0 ? (isRtl ? 'بدون رسوم' : 'No fee') : `${deliveryFee} ${isRtl ? 'ج.م' : 'EGP'}`}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-dashed border-[#d7e7e5] pt-2 text-base">
                <span className="font-extrabold text-[#295d60]">{isRtl ? 'الإجمالي' : 'Total'}</span>
                <span className="font-black text-[#14b8a6]">
                  {formatMedicinePrice(grandTotal)} {isRtl ? 'ج.م' : 'EGP'}
                </span>
              </div>
            </div>

            {anyPickup && (
              <p className="mt-3 rounded-xl bg-[#eef8f7] px-3 py-2 text-[11px] leading-6 text-[#0e7c6e]">
                {isRtl
                  ? 'بعض العناصر محددة للاستلام من الصيدلية، تأكد من مواعيد العمل قبل التوجه.'
                  : 'Some items are marked for pharmacy pickup. Check opening hours before you go.'}
              </p>
            )}

            <button className="mt-4 w-full rounded-full bg-[#14b8a6] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#119a8a]">
              {isRtl ? 'متابعة الطلب' : 'Continue order'}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
