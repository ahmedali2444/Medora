import React from 'react';

export default function CategoryCard({
  id, title, subtitle, accentColor, bgColor,
  count, tags, isSelected, onSelect
}) {
  return (
    <div
      onClick={() => onSelect(id)}
      className="bg-white rounded-2xl p-6 cursor-pointer flex flex-col transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5"
      style={{
        border: `2px solid ${isSelected ? accentColor : 'rgba(20,184,166,0.12)'}`,
        boxShadow: isSelected
          ? `0px 6px 20px rgba(0,0,0,0.1)`
          : '0px 2px 12px rgba(8,64,54,0.06)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: bgColor }}
        >
          {/* Generic medical cross SVG */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 2H13V22H11zM2 11H22V13H2z"/>
          </svg>
        </div>
        <div className="flex-1 text-right">
          <h3 className="font-bold text-[15px] leading-tight" style={{ color: '#064e3b' }}>{title}</h3>
          <p className="text-[12px] mt-0.5" style={{ color: 'rgba(8,64,54,0.55)' }}>{subtitle}</p>
          <span
            className="inline-block mt-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ background: bgColor, color: accentColor }}
          >
            {count}
          </span>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 justify-end">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="rounded-full px-2.5 py-1 text-[11px] font-medium"
            style={{ background: bgColor, color: accentColor }}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
        <span className="text-[12px]" style={{ color: 'rgba(8,64,54,0.45)' }}>← {count}</span>
        <span className="font-bold text-[13px]" style={{ color: accentColor }}>تصفح الفئة</span>
      </div>
    </div>
  );
}
