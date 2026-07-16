import React from 'react';
import SearchEmptyIcon from '../../SearchEmptyIcon';
import { useLang } from '../../../context/LanguageContext';
import { getLocalizedText } from '../../../utils/localization';

export default function EmptyResultsState({
  query,
  suggestions = [],
  onSuggestionSelect,
  hasActiveFilters = false,
  onResetFilters,
}) {
  const { lang } = useLang();
  const isRtl = lang !== 'en';
  const normalizedSuggestions = suggestions.map((suggestion) =>
    typeof suggestion === 'string' ? { name: suggestion } : suggestion,
  );
  const suggestionsRequireReset = normalizedSuggestions.some(
    (suggestion) => suggestion.requiresFilterReset,
  );

  return (
    <div className="rounded-[28px] border border-dashed border-[#cfe4e2] bg-[#f7fbfb] px-6 py-14 text-center">
      <SearchEmptyIcon className="mb-5 h-20 w-20 rounded-3xl" />

      <h3 className="mt-1 text-[20px] font-bold text-[#2d6669]">
        {isRtl
          ? `لم نجد نتائج ${query ? `لـ "${query}"` : 'بالفلاتر الحالية'}`
          : `No results found ${query ? `for "${query}"` : 'with the current filters'}`}
      </h3>
      <p className="mx-auto mt-3 max-w-xl text-[14px] leading-7 text-slate-600">
        {isRtl
          ? 'جرّب كتابة الاسم التجاري أو المادة الفعالة بشكل مختلف، أو استخدم إحدى الاقتراحات التالية للوصول لنتائج أقرب لما تبحث عنه.'
          : 'Try a different brand name or active ingredient, or use one of the suggestions below to get closer matches.'}
      </p>

      {suggestionsRequireReset && (
        <div className="mx-auto mt-4 max-w-lg rounded-2xl border border-[#cfe4e2] bg-[#eef8f7] px-4 py-3 text-[13px] text-[#0e7c6e]">
          {isRtl
            ? 'بعض الفلاتر الحالية ضيّقت النتائج جدًا، لذلك جهزنا لك اقتراحات أوسع قليلًا.'
            : 'Some active filters are narrowing the results too much, so we prepared broader suggestions for you.'}
        </div>
      )}

      {normalizedSuggestions.length > 0 && (
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {normalizedSuggestions.map((suggestion) => (
            <button
              key={suggestion.id || getLocalizedText(suggestion.name, 'en', suggestion.name)}
              onClick={() => onSuggestionSelect?.(suggestion)}
              className="rounded-2xl border border-[#cfe4e2] bg-white px-4 py-4 text-right transition hover:border-[#14b8a6] hover:shadow-[0_12px_24px_rgba(20,184,166,0.08)]"
            >
              <div className="text-sm font-extrabold text-[#295d60]">
                {getLocalizedText(suggestion.name, lang, suggestion.name)}
              </div>
              {(suggestion.company || suggestion.category) && (
                <div className="mt-1 text-[11px] text-slate-500">
                  {[
                    suggestion.company,
                    getLocalizedText(suggestion.category, lang, suggestion.category),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              )}
              {suggestion.requiresFilterReset && (
                <div className="mt-2 text-[11px] font-bold text-[#119a8a]">
                  {isRtl ? 'سيُعاد توسيع الفلاتر عند الاختيار' : 'Filters will be widened when selected'}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {hasActiveFilters && onResetFilters && (
        <button
          onClick={onResetFilters}
          className="mt-6 rounded-full bg-[#14b8a6] px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(20,184,166,0.22)] transition hover:bg-[#119a8a]"
        >
          {isRtl ? 'إزالة الفلاتر وتجربة البحث من جديد' : 'Clear filters and search again'}
        </button>
      )}
    </div>
  );
}
