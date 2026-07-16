import React from 'react';
import EmptyResultsState from './EmptyResultsState';
import MedicineResultCard from './MedicineResultCard';
import SkeletonCard from './SkeletonCard';

export default function MedicineResultsGrid({
  medicines = [],
  query,
  isLoading,
  onSuggestionSelect,
  onRequestFulfillment,
  emptyStateSuggestions = [],
  hasActiveFilters = false,
  onResetFilters,
}) {
  return (
    <div className="rounded-[32px] border border-[#d7e7e5] bg-white p-4 shadow-[0_14px_35px_rgba(41,93,96,0.08)] sm:p-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />)
          : medicines.length === 0
            ? (
                <div className="col-span-full">
                  <EmptyResultsState
                    query={query}
                    suggestions={emptyStateSuggestions}
                    onSuggestionSelect={onSuggestionSelect}
                    hasActiveFilters={hasActiveFilters}
                    onResetFilters={onResetFilters}
                  />
                </div>
              )
            : medicines.map((medicine, index) => (
                <MedicineResultCard
                  key={medicine.id}
                  index={index}
                  onRequestFulfillment={onRequestFulfillment}
                  {...medicine}
                />
              ))}
      </div>
    </div>
  );
}
