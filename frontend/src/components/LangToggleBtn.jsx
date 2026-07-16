import { memo } from 'react';
import { useLang } from '../context/LanguageContext';

/**
 * LangToggleBtn - زرار تغيير اللغة مشترك بين كل الصفحات
 * variant: 'topbar'  → داخل التوبار (border رفيعة، حجم صغير)
 * variant: 'float'   → عائم في ركن الصفحة (Auth pages)
 */
const LangToggleBtn = memo(function LangToggleBtn({ variant = 'topbar', className = '' }) {
  const { lang, toggleLang } = useLang();

  if (variant === 'float') {
    return (
      <button
        onClick={toggleLang}
        aria-label={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
        className={[
          'fixed top-4 z-50 flex h-9 w-9 items-center justify-center rounded-full',
          'border border-[#14b8a6]/40 bg-white/90 text-xs font-black text-[#0b5e52]',
          'shadow-[0_4px_16px_rgba(20,184,166,0.2)] backdrop-blur',
          'transition hover:scale-110 hover:border-[#14b8a6] hover:bg-[#e6f7f7] hover:shadow-[0_6px_22px_rgba(20,184,166,0.35)]',
          lang === 'ar' ? 'left-4' : 'right-4',
          className,
        ].join(' ')}
      >
        {lang === 'ar' ? 'EN' : 'AR'}
      </button>
    );
  }

  // variant === 'topbar'
  return (
    <button
      onClick={toggleLang}
      aria-label={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
      className={[
        'inline-flex h-8 w-8 items-center justify-center rounded-lg',
        'border border-[#e4eeee] bg-white text-[11px] font-black text-[#0b5e52]',
        'transition hover:border-[#14b8a6] hover:bg-[#e6f7f7] hover:text-[#0e7c6e]',
        className,
      ].join(' ')}
    >
      {lang === 'ar' ? 'EN' : 'AR'}
    </button>
  );
});

export default LangToggleBtn;
