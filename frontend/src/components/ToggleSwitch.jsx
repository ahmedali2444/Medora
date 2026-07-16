import React from 'react';
import { useLang } from '../context/LanguageContext';

export default function ToggleSwitch({ checked, onToggle, ariaLabel, disabled = false, className = '' }) {
  const { lang } = useLang();
  const isRtl = lang !== 'en';
  const knobPosition = checked ? (isRtl ? 'left-1' : 'right-1') : isRtl ? 'right-1' : 'left-1';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onToggle}
      className={[
        'relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#14b8a6] focus-visible:ring-offset-2',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        checked ? 'bg-[#14b8a6]' : 'bg-[#cbd4d5]',
        className,
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200',
          knobPosition,
        ].join(' ')}
      />
    </button>
  );
}
