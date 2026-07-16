import React from 'react';

export default function MedicineArtwork({ color = '#14b8a6', className = 'h-8 w-8' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="8" y="20" width="32" height="8" rx="4" fill={color} opacity="0.14" />
      <path d="M24 20H40A4 4 0 0 1 40 28H24Z" fill={color} opacity="0.32" />
      <path d="M24 20H8A4 4 0 0 0 8 28H24Z" fill={color} opacity="0.58" />
      <rect x="23" y="19" width="2" height="10" rx="1" fill={color} opacity="0.42" />
    </svg>
  );
}
