import React, { useState } from 'react';
import CategoryCard from './CategoryCard';

const CATEGORIES = [
  {
    id: 'common', title: 'الأدوية الشائعة',
    subtitle: 'مسكنات، خافضات حرارة، برد وإنفلونزا',
    accentColor: '#ea580c', bgColor: 'rgba(249,115,22,0.08)',
    count: '120+ دواء', tags: ['مسكنات', 'خافضات حرارة', 'كحة', 'رشح', 'حساسية'],
  },
  {
    id: 'chronic', title: 'الرعاية المزمنة',
    subtitle: 'سكري، ضغط الدم، أمراض القلب، الغدة',
    accentColor: '#0284c7', bgColor: 'rgba(14,165,233,0.08)',
    count: '85+ دواء', tags: ['أدوية السكر', 'ضغط الدم', 'القلب', 'الغدة الدرقية', 'سيولة الدم'],
  },
  {
    id: 'special', title: 'العناية الخاصة',
    subtitle: 'أطفال، صحة المرأة، بشرة، مكملات',
    accentColor: '#0f766e', bgColor: 'rgba(17,154,138,0.08)',
    count: '95+ دواء', tags: ['أدوية الأطفال', 'صحة المرأة', 'بشرة وشعر', 'فيتامينات', 'مكملات'],
  },
];

const TABS = ['الكل', 'أدوية', 'مستحضرات', 'مكملات', 'أعشاب'];

export default function CategorySection({ selectedCategory, onCategorySelect }) {
  const [activeTab, setActiveTab] = useState('الكل');

  return (
    <section className="max-w-6xl mx-auto px-6 py-10 w-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <button
          className="text-[14px] font-semibold hover:underline transition-colors"
          style={{ color: '#14b8a6' }}
        >
          ← عرض الكل
        </button>
        <h2 className="font-bold text-[20px]" style={{ color: '#064e3b' }}>
          تصفح حسب الفئة
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap justify-end">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all duration-150"
            style={activeTab === tab
              ? { background: '#065f46', color: '#fff', border: '1px solid transparent' }
              : { background: '#fff', color: '#047857', border: '1px solid rgba(20,184,166,0.3)' }
            }
            onMouseEnter={e => { if (activeTab !== tab) { e.currentTarget.style.borderColor = '#14b8a6'; e.currentTarget.style.background = '#ecfdf5'; } }}
            onMouseLeave={e => { if (activeTab !== tab) { e.currentTarget.style.borderColor = 'rgba(20,184,166,0.3)'; e.currentTarget.style.background = '#fff'; } }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {CATEGORIES.map(cat => (
          <CategoryCard
            key={cat.id}
            {...cat}
            isSelected={selectedCategory === cat.id}
            onSelect={onCategorySelect}
          />
        ))}
      </div>
    </section>
  );
}
