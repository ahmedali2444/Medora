import React from 'react';
import { Heart, ShoppingBag } from 'lucide-react';
import { useCart } from './CartContext';
import { useLang } from '../../../context/LanguageContext';

export default function CartFab({ onOpenFavorites }) {
  const { cartCount, favCount, openCart } = useCart();
  const { lang } = useLang();
  const isRtl = lang !== 'en';

  return (
    <div
      dir="ltr"
      className={`pointer-events-none fixed bottom-6 z-[9990] flex flex-col gap-3 sm:bottom-8 ${
        isRtl ? 'right-6 items-end sm:right-8' : 'left-6 items-start sm:left-8'
      }`}
    >
      {typeof onOpenFavorites === 'function' && (
        <button
          onClick={onOpenFavorites}
          className="pointer-events-auto relative inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#14b8a6] shadow-[0_14px_30px_rgba(41,93,96,0.18)] ring-1 ring-[#d7e7e5] transition hover:scale-105"
          aria-label={isRtl ? 'المفضلة' : 'Favorites'}
        >
          <Heart size={18} fill={favCount > 0 ? '#14b8a6' : 'none'} />
          {favCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#119a8a] px-1 text-[10px] font-black text-white">
              {favCount}
            </span>
          )}
        </button>
      )}

      <button
        onClick={openCart}
        className="pointer-events-auto relative inline-flex h-14 items-center gap-2 rounded-full bg-[#14b8a6] px-5 text-white shadow-[0_18px_40px_rgba(20,184,166,0.35)] transition hover:bg-[#119a8a] hover:shadow-[0_22px_46px_rgba(20,184,166,0.45)]"
        aria-label={isRtl ? 'فتح السلة' : 'Open cart'}
        style={{ fontFamily: 'Cairo, sans-serif' }}
      >
        <ShoppingBag size={18} />
        <span className="text-sm font-extrabold" dir={isRtl ? 'rtl' : 'ltr'}>
          {isRtl ? 'السلة' : 'Cart'}
        </span>
        <span className="inline-flex h-6 min-w-[28px] items-center justify-center rounded-full bg-white/25 px-2 text-xs font-black">
          {cartCount}
        </span>
      </button>
    </div>
  );
}
