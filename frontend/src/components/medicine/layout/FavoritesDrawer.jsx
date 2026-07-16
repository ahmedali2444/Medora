import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, Trash2, X } from 'lucide-react';
import { formatMedicinePrice } from '../data/medicineData';
import { useCart } from './CartContext';
import { useLang } from '../../../context/LanguageContext';
import { getLocalizedText } from '../../../utils/localization';
import { medoraApi } from '../../../api/medoraApi';

function mapApiFavoriteMedicine(favorite, data) {
  const displayName = data.name || getLocalizedText(favorite.name, 'ar', '');
  const activeIngredient = data.activeIngredient || '';

  return {
    ...favorite,
    name: favorite.name ?? { ar: displayName, en: displayName },
    image: favorite.image ?? data.imageUrl ?? null,
    company: favorite.company || data.company || '',
    price: Number(data.minPrice ?? favorite.price ?? 0),
    description: favorite.description ?? {
      ar: [activeIngredient, data.form, data.strength].filter(Boolean).join(' - '),
      en: [activeIngredient, data.form, data.strength].filter(Boolean).join(' - '),
    },
    isAvailable: Boolean(data.isAvailable),
  };
}

export default function FavoritesDrawer({ open, onClose }) {
  const { favorites, toggleFavorite, addToCart } = useCart();
  const navigate = useNavigate();
  const { lang } = useLang();
  const isRtl = lang !== 'en';
  const [resolvedFavorites, setResolvedFavorites] = useState({});

  useEffect(() => {
    if (!open || favorites.length === 0) {
      queueMicrotask(() => setResolvedFavorites({}));
      return undefined;
    }

    let mounted = true;
    queueMicrotask(() => {
      if (mounted) setResolvedFavorites({});
    });

    Promise.all(
      favorites.map((favorite) =>
        medoraApi
          .medicine(favorite.id)
          .then((data) => ({ id: favorite.id, medicine: mapApiFavoriteMedicine(favorite, data) }))
          .catch((error) => {
            console.warn('Failed to load favorite medicine', favorite.id, error);
            return { id: favorite.id, medicine: favorite };
          }),
      ),
    ).then((results) => {
      if (!mounted) return;
      const next = {};
      results.forEach(({ id, medicine }) => {
        next[id] = medicine;
      });
      setResolvedFavorites(next);
    });

    return () => {
      mounted = false;
    };
  }, [open, favorites]);

  return (
    <>
      <div
        className={`fixed inset-0 z-[9995] bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      <aside
        dir={isRtl ? 'rtl' : 'ltr'}
        style={{ fontFamily: 'Cairo, sans-serif' }}
        className={`fixed inset-y-0 z-[9996] flex w-full max-w-md flex-col bg-white transition-transform duration-300 ${
          isRtl
            ? 'right-0 border-l border-[#e4eeee] shadow-[-20px_0_60px_rgba(8,64,54,0.2)]'
            : 'left-0 border-r border-[#e4eeee] shadow-[20px_0_60px_rgba(8,64,54,0.2)]'
        } ${
          open ? 'translate-x-0' : isRtl ? 'translate-x-full' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#e4eeee] bg-gradient-to-l from-[#eef8f7] to-white px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#14b8a6] text-white">
              <Heart size={18} fill="#ffffff" />
            </div>
            <div>
              <div className="text-base font-extrabold text-[#295d60]">
                {isRtl ? 'الأدوية المفضلة' : 'Favorite medicines'}
              </div>
              <div className="text-xs text-slate-500">
                {favorites.length > 0
                  ? isRtl
                    ? `${favorites.length} دواء محفوظ لديك`
                    : `${favorites.length} saved medicines`
                  : isRtl
                    ? 'لم تحفظ أي دواء بعد'
                    : 'No saved medicines yet'}
              </div>
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
          {favorites.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#cfe4e2] bg-[#f7fbfb] px-6 py-14 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-[0_10px_24px_rgba(41,93,96,0.08)]">
                <Heart size={22} color="#14b8a6" />
              </div>
              <div className="text-base font-extrabold text-[#295d60]">
                {isRtl ? 'قائمة المفضلة فارغة' : 'Favorites list is empty'}
              </div>
              <div className="mt-2 text-sm leading-7 text-slate-600">
                {isRtl
                  ? 'اضغط على أيقونة القلب داخل كارت الدواء لحفظه هنا والوصول إليه بسرعة لاحقًا.'
                  : 'Tap the heart icon on any medicine card to save it here for quick access later.'}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {favorites.map((favorite) => {
                const medicine = resolvedFavorites[favorite.id] || favorite;
                const favoriteName = getLocalizedText(medicine.name, lang, medicine.name);
                const favoriteDescription = getLocalizedText(medicine.description, lang, medicine.description);
                return (
                  <div
                    key={favorite.id}
                    className="rounded-2xl border border-[#e4eeee] bg-white p-4 shadow-[0_6px_18px_rgba(41,93,96,0.06)]"
                  >
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          onClose();
                          navigate(`/medicine/${favorite.id}`);
                        }}
                        className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl"
                        style={{ background: 'rgba(20,184,166,0.1)' }}
                      >
                        {medicine.image ? (
                          <img
                            src={medicine.image}
                            alt={favoriteName}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-2xl">💊</span>
                        )}
                      </button>

                      <div className="flex-1 text-right">
                        <div className="flex items-start justify-between gap-2">
                          <button
                            onClick={() => toggleFavorite(favorite)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#d7e7e5] bg-[#f7fbfb] text-[#119a8a] transition hover:border-[#14b8a6]"
                            aria-label={isRtl ? 'إزالة من المفضلة' : 'Remove from favorites'}
                          >
                            <Trash2 size={13} />
                          </button>
                          <div className="flex-1">
                            <button
                              onClick={() => {
                                onClose();
                                navigate(`/medicine/${favorite.id}`);
                              }}
                              className="text-right text-sm font-extrabold text-[#295d60] transition hover:text-[#14b8a6]"
                            >
                              {favoriteName}
                            </button>
                            <div className="mt-0.5 text-xs text-slate-500">{medicine.company}</div>
                          </div>
                        </div>

                        {favoriteDescription && (
                          <p className="mt-2 line-clamp-2 text-[11px] leading-6 text-slate-500">
                            {favoriteDescription}
                          </p>
                        )}

                        <div className="mt-3 flex items-center justify-between">
                          <button
                            onClick={() => addToCart(medicine)}
                            disabled={medicine.isAvailable === false}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#14b8a6] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#119a8a] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <ShoppingBag size={12} />
                            {isRtl ? 'أضف للسلة' : 'Add to cart'}
                          </button>
                          <div className="text-sm font-black text-[#295d60]">
                            {formatMedicinePrice(medicine.price)}{' '}
                            <span className="text-[10px] font-semibold text-[#14b8a6]">{isRtl ? 'ج.م' : 'EGP'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
