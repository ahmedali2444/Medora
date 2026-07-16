import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Heart, Pill, ShoppingBag, Star } from 'lucide-react';
import { useCart } from '../layout/CartContext';
import { useLang } from '../../../context/LanguageContext';
import {
  MEDICINE_CATEGORY_META,
  MEDICINE_SYMPTOM_LABELS,
  formatMedicinePrice,
} from '../data/medicineData';
import MedicineArtwork from '../shared/MedicineArtwork';
import { getLocalizedText } from '../../../utils/localization';

export default function MedicineResultCard({
  id,
  name,
  image,
  company,
  category,
  categoryLabel,
  price,
  description,
  isAvailable,
  rating = 4.8,
  reviewCount = 230,
  activeIngredient,
  symptoms = [],
  deliveryAvailable,
  pickupAvailable,
  index = 0,
  onRequestFulfillment,
}) {
  const navigate = useNavigate();
  const { addToCart, toggleFavorite, isFavorite, isInCart } = useCart();
  const { lang } = useLang();
  const isRtl = lang !== 'en';
  const localizedName = getLocalizedText(name, lang, name);
  const localizedDescription = getLocalizedText(description, lang, description);
  const localizedIngredient = getLocalizedText(activeIngredient, lang, activeIngredient);
  const localizedCategory = getLocalizedText(categoryLabel || category, lang, category);

  const favorited = isFavorite(id);
  const inCart = isInCart(id);

  const categoryStyle = MEDICINE_CATEGORY_META[category] || {
    bg: 'rgba(74,155,150,0.12)',
    color: '#418989',
  };

  const medicinePayload = {
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

  const handleAddToCart = (event) => {
    event.stopPropagation();

    if (!isAvailable) return;

    if (!inCart) {
      addToCart(medicinePayload);
      if (typeof onRequestFulfillment === 'function') {
        onRequestFulfillment(medicinePayload);
      }
    }
  };

  const handleFav = (event) => {
    event.stopPropagation();
    toggleFavorite(medicinePayload);
  };

  const topSymptom = symptoms?.[0];
  const symptomLabel = topSymptom
    ? getLocalizedText(MEDICINE_SYMPTOM_LABELS[topSymptom], lang, topSymptom)
    : null;

  return (
    <div
      onClick={() => navigate(`/medicine/${id}`)}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-[22px] border bg-white p-4 transition-all duration-200 hover:-translate-y-1 animate-fadeInUp"
      style={{
        borderColor: 'rgba(74,155,150,0.14)',
        boxShadow: '0 10px 28px rgba(41,93,96,0.08)',
        animationDelay: `${index * 40}ms`,
        animationFillMode: 'both',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.boxShadow = '0 18px 40px rgba(41,93,96,0.14)';
        event.currentTarget.style.borderColor = 'rgba(20,184,166,0.35)';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.boxShadow = '0 10px 28px rgba(41,93,96,0.08)';
        event.currentTarget.style.borderColor = 'rgba(74,155,150,0.14)';
      }}
    >
      <div
        className="relative mb-3 flex h-36 items-center justify-center overflow-hidden rounded-2xl"
        style={{ background: categoryStyle.bg }}
      >
        {image ? (
          <img
            src={image}
            alt={localizedName}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <MedicineArtwork color={categoryStyle.color} className="h-16 w-16" />
        )}

        <span
          className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold backdrop-blur"
          style={
            isAvailable
              ? { background: 'rgba(255,255,255,0.92)', color: '#0e7c6e' }
              : { background: 'rgba(255,255,255,0.92)', color: '#5e8e8e' }
          }
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: isAvailable ? '#0e7c6e' : '#8eb0b0' }}
          />
          {isAvailable ? (isRtl ? 'متاح الآن' : 'Available now') : (isRtl ? 'غير متاح' : 'Unavailable')}
        </span>

        <button
          onClick={handleFav}
          className="absolute top-3 left-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[#14b8a6] shadow-[0_6px_16px_rgba(41,93,96,0.15)] transition active:scale-90"
          aria-label={favorited ? (isRtl ? 'إزالة من المفضلة' : 'Remove from favorites') : (isRtl ? 'إضافة للمفضلة' : 'Add to favorites')}
        >
          <Heart size={15} fill={favorited ? '#14b8a6' : 'none'} />
        </button>

        <span
          className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold"
          style={{ color: categoryStyle.color }}
        >
          <Pill size={11} />
          {localizedCategory}
        </span>
      </div>

      <div className="text-right">
        <div className="flex items-start justify-between gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#e6f7f7] px-2 py-1 text-[10px] font-bold text-[#0e7c6e]">
            <Star size={10} fill="#14b8a6" color="#14b8a6" />
            {rating}
            <span className="text-[9px] text-[#5e8e8e]">({reviewCount})</span>
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[15px] font-extrabold leading-tight text-[#295d60]">
              {localizedName}
            </h3>
            <div className="mt-0.5 flex items-center justify-end gap-1 text-[11px] font-medium text-slate-500">
              <Building2 size={11} />
              <span className="truncate">{company}</span>
            </div>
          </div>
        </div>

        {description && (
          <p className="mt-2.5 line-clamp-2 min-h-[38px] text-[12px] leading-6 text-slate-600">
            {localizedDescription}
          </p>
        )}

        <div className="mt-2.5 flex flex-wrap justify-end gap-1.5">
          {activeIngredient && (
            <span className="inline-flex rounded-full bg-[#f1fbfa] px-2 py-0.5 text-[10px] font-bold text-[#2d6669]">
              {localizedIngredient}
            </span>
          )}
          {symptomLabel && (
            <span className="inline-flex rounded-full bg-[#eef8f7] px-2 py-0.5 text-[10px] font-bold text-[#119a8a]">
              {symptomLabel}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 border-t border-dashed border-[#e6efef] pt-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-right">
            <div className="text-[10px] text-slate-400">{isRtl ? 'السعر' : 'Price'}</div>
            <div className="text-xl font-black text-[#295d60]">
              {formatMedicinePrice(price)}{' '}
              <span className="text-[10px] font-semibold text-[#14b8a6]">{isRtl ? 'ج.م' : 'EGP'}</span>
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={!isAvailable}
            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2.5 text-[12px] font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60"
            style={
              inCart
                ? {
                    background: 'rgba(20,184,166,0.12)',
                    color: '#0e7c6e',
                    boxShadow: 'inset 0 0 0 1px rgba(20,184,166,0.25)',
                  }
                : {
                    background: '#14b8a6',
                    color: '#ffffff',
                    boxShadow: '0 8px 18px rgba(20,184,166,0.28)',
                  }
            }
          >
            <ShoppingBag size={14} />
            <span>
              {!isAvailable
                ? isRtl ? 'غير متاح' : 'Unavailable'
                : inCart
                  ? isRtl ? 'في السلة' : 'In cart'
                  : isRtl ? 'أضف للسلة' : 'Add to cart'}
            </span>
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1 text-[#14b8a6]">
            {isRtl ? 'عرض التفاصيل' : 'View details'} <span>{isRtl ? '←' : '→'}</span>
          </span>
          <span className="flex items-center gap-1.5">
            {deliveryAvailable && <span className="rounded-full bg-[#e6f7f7] px-2 py-0.5 font-bold text-[#0e7c6e]">{isRtl ? 'توصيل' : 'Delivery'}</span>}
            {pickupAvailable && <span className="rounded-full bg-[#eef8f7] px-2 py-0.5 font-bold text-[#084036]">{isRtl ? 'استلام' : 'Pickup'}</span>}
          </span>
        </div>
      </div>
    </div>
  );
}
