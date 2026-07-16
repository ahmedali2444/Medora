import React from 'react';

export default function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-col gap-3">
      <div className="flex justify-between">
        <div className="h-4 w-14 bg-gray-100 rounded-full animate-pulse" />
        <div className="h-4 w-14 bg-gray-100 rounded-full animate-pulse" />
      </div>
      <div className="w-20 h-20 bg-gray-100 rounded-2xl mx-auto animate-pulse" />
      <div className="h-4 w-3/4 bg-gray-100 rounded mx-auto animate-pulse" />
      <div className="h-3 w-1/2 bg-gray-100 rounded mx-auto animate-pulse" />
      <div className="h-3 w-2/3 bg-gray-100 rounded mx-auto animate-pulse" />
      <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
      <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
        <div className="h-8 w-8 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-5 w-16 bg-teal-50 rounded animate-pulse" />
      </div>
    </div>
  );
}
