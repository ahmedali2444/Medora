import React from 'react';

export default function TrustSignals() {
  const items = [
    {
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
      text: 'أدوية معتمدة من وزارة الصحة',
    },
    {
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
      text: 'بياناتك محمية بالكامل',
    },
    {
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
      text: 'مراجعة أطباء متخصصين',
    },
  ];
  return (
    <div className="bg-white py-3 w-full"
      style={{ borderTop: '1px solid rgba(20,184,166,0.2)', borderBottom: '1px solid rgba(20,184,166,0.2)' }}>
      <div className="max-w-6xl mx-auto px-6 flex justify-center items-center gap-8 flex-wrap">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-[12px] font-medium" style={{ color: '#119a8a' }}>
            {item.icon}
            <span>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
