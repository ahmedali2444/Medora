import React from 'react';
import { Building2, Heart, Pill, Share2, ShoppingBag, Star } from 'lucide-react';
import { useCart } from '../layout/CartContext';
import { useToast } from '../layout/ToastContext';
import { useLang } from '../../../context/LanguageContext';
import {
  MEDICINE_CATEGORY_META,
  MEDICINE_SYMPTOM_LABELS,
  formatMedicinePrice,
} from '../data/medicineData';
import MedicineArtwork from '../shared/MedicineArtwork';
import { getLocalizedText } from '../../../utils/localization';

export default function MedicineDetailHeader({
  id,
  name,
  image,
  company,
  category,
  categoryLabel,
  price,
  description,
  isAvailable,
  rating,
  reviewCount,
  activeIngredient,
  symptoms = [],
  deliveryAvailable,
  pickupAvailable,
  onShowPharmacies,
  onRequestFulfillment,
  pharmacyId = null,
  purchaseDisabled = false,
}) {
  const { addToCart, toggleFavorite, isFavorite, isInCart, openCart } = useCart();
  const { showToast } = useToast();
  const { lang } = useLang();
  const isRtl = lang !== 'en';
  const localizedName = getLocalizedText(name, lang, name);
  const localizedDescription = getLocalizedText(description, lang, description);
  const localizedIngredient = getLocalizedText(activeIngredient, lang, activeIngredient);
  const localizedCategory = getLocalizedText(categoryLabel || category, lang, category);

  const favorited = isFavorite(id);
  const inCart = isInCart(id);

  const categoryStyle = MEDICINE_CATEGORY_META[category] || {
    bg: 'rgba(20,184,166,0.1)',
    color: '#14b8a6',
  };

  const medicine = {
    id,
    name,
    image,
    company,
    category,
    categoryLabel,
    price,
    description,
    isAvailable,
    rating,
    reviewCount,
    activeIngredient,
    symptoms,
    deliveryAvailable,
    pickupAvailable,
  };

  const handleAddToCart = () => {
    if (!isAvailable) return;
    if (inCart) {
      openCart();
      return;
    }
    addToCart(
      medicine,
      pharmacyId
        ? { fulfillment: 'pickup', pharmacyId }
        : undefined,
    );
    if (!pharmacyId && typeof onRequestFulfillment === 'function') {
      onRequestFulfillment(medicine);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: localizedName,
      text: `${localizedName} - ${localizedDescription || ''}`,
      url: typeof window !== 'undefined' ? window.location.href : '',
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        showToast(isRtl ? 'تم نسخ الرابط ✓' : 'Link copied ✓');
      }
    } catch {
      // no-op
    }
  };

  const symptomChips = symptoms
    .map((key) => getLocalizedText(MEDICINE_SYMPTOM_LABELS[key], lang, key))
    .slice(0, 4);

  return (
    <div
      className="overflow-hidden rounded-[28px] border border-[#e4eeee] bg-white shadow-[0_18px_44px_rgba(8,64,54,0.1)]"
      style={{ fontFamily: 'Cairo, sans-serif' }}
    >
      <div
        className="relative px-5 py-6 sm:px-7 sm:py-8"
        style={{
          background: `linear-gradient(135deg, ${categoryStyle.bg} 0%, rgba(255,255,255,0.7) 100%)`,
        }}
      >
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[22px] bg-white shadow-[0_14px_30px_rgba(41,93,96,0.12)]">
            {image ? (
              <img
                src={image}
                alt={localizedName}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <MedicineArtwork color={categoryStyle.color} className="h-14 w-14" />
            )}
          </div>

          <div className="flex-1 text-center sm:text-right">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold"
                style={{ background: categoryStyle.color, color: '#ffffff' }}
              >
                <Pill size={10} />
                {localizedCategory}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                  isAvailable ? 'bg-[#e6f7f7] text-[#0e7c6e]' : 'bg-[#eef8f7] text-[#5e8e8e]'
                }`}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: isAvailable ? '#14b8a6' : '#8eb0b0' }}
                />
                {isAvailable ? (isRtl ? 'متاح الآن' : 'Available now') : (isRtl ? 'غير متاح' : 'Unavailable')}
              </span>
            </div>

            <h1 className="mt-2 text-2xl font-black text-[#084036] sm:text-3xl">{localizedName}</h1>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-[12px] text-slate-600 sm:justify-end">
              <span className="inline-flex items-center gap-1">
                <Building2 size={13} />
                {company}
              </span>
              <span className="text-slate-300">·</span>
              <span className="inline-flex items-center gap-1 text-[#084036]">
                <Star size={13} fill="#14b8a6" color="#14b8a6" />
                <span className="font-bold">{rating}</span>
                <span className="text-slate-400">({reviewCount} {isRtl ? 'تقييم' : 'reviews'})</span>
              </span>
              {activeIngredient && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold text-[#2d6669]">
                    {localizedIngredient}
                  </span>
                </>
              )}
            </div>

            {localizedDescription && <p className="mt-3 text-[13px] leading-7 text-slate-700">{localizedDescription}</p>}

            {symptomChips.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-end">
                <span className="text-[11px] font-bold text-slate-500">
                  {isRtl ? 'ملخّص الأعراض:' : 'Symptom summary:'}
                </span>
                {symptomChips.map((label) => (
                  <span
                    key={label}
                    className="rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-bold text-[#119a8a] ring-1 ring-[#d7e7e5]"
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 border-t border-[#e4eeee] bg-white px-5 py-4 sm:flex-row sm:justify-between sm:px-7">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          <button
            onClick={handleAddToCart}
            disabled={!isAvailable || purchaseDisabled}
            className="inline-flex items-center gap-2 rounded-full bg-[#14b8a6] px-5 py-2.5 text-[13px] font-extrabold text-white shadow-[0_10px_24px_rgba(20,184,166,0.3)] transition hover:bg-[#119a8a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ShoppingBag size={14} />
            {purchaseDisabled
              ? isRtl ? 'الفرع مغلق' : 'Branch closed'
              : !isAvailable
              ? isRtl ? 'غير متاح' : 'Unavailable'
              : inCart
                ? isRtl ? 'عرض السلة' : 'View cart'
                : isRtl ? 'أضف للسلة' : 'Add to cart'}
          </button>

          <button
            onClick={() => toggleFavorite(medicine)}
            className="inline-flex items-center gap-2 rounded-full border border-[#d7e7e5] bg-white px-4 py-2.5 text-[12px] font-bold transition"
            style={{
              color: favorited ? '#119a8a' : '#2d6669',
              borderColor: favorited ? '#14b8a6' : '#d7e7e5',
              background: favorited ? '#e6f7f7' : '#ffffff',
            }}
          >
            <Heart size={14} fill={favorited ? '#14b8a6' : 'none'} />
            {favorited ? (isRtl ? 'تمت الإضافة للمفضلة' : 'Added to favorites') : (isRtl ? 'المفضلة' : 'Favorite')}
          </button>

          <button
            onClick={onShowPharmacies}
            className="inline-flex items-center gap-2 rounded-full border border-[#d7e7e5] bg-white px-4 py-2.5 text-[12px] font-bold text-[#2d6669] transition hover:border-[#14b8a6]"
          >
            {isRtl ? 'عرض الصيدليات القريبة' : 'Show nearby pharmacies'}
          </button>

          <button
            onClick={handleShare}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d7e7e5] bg-white text-[#2d6669] transition hover:border-[#14b8a6]"
            aria-label={isRtl ? 'مشاركة' : 'Share'}
          >
            <Share2 size={14} />
          </button>
        </div>

        <div className="text-center sm:text-left">
          <div className="text-[11px] text-slate-500">{isRtl ? 'السعر' : 'Price'}</div>
          <div className="text-2xl font-black text-[#14b8a6]">
            {formatMedicinePrice(price)}{' '}
            <span className="text-xs font-semibold text-[#0e7c6e]">{isRtl ? 'ج.م' : 'EGP'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
