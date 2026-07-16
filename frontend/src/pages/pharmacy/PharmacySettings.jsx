import React, { useState } from 'react';
import { Bell, Globe, Lock, Settings2 } from 'lucide-react';
import PharmacyLayout from '../../components/pharmacy/layout/PharmacyLayout';
import SectionCard from '../../components/pharmacy/shared/SectionCard';
import { useLocalizedContent } from '../../hooks/useLocalizedContent';
import { localizedText } from '../../utils/localization';

const COPY = {
  title: localizedText('الإعدادات', 'Settings'),
  subtitle: localizedText('إدارة تفضيلات التشغيل والتنبيهات والحساب', 'Manage operations, notifications, and account preferences'),
  generalSettings: localizedText('الإعدادات العامة', 'General settings'),
  defaultLanguage: localizedText('اللغة الافتراضية', 'Default language'),
  currency: localizedText('العملة', 'Currency'),
  timezone: localizedText('المنطقة الزمنية', 'Timezone'),
  arabic: localizedText('العربية', 'Arabic'),
  egyptianPound: localizedText('الجنيه المصري', 'Egyptian Pound'),
};

const SETTINGS_GROUPS = [
  {
    key: 'operations',
    title: localizedText('إعدادات التشغيل', 'Operations settings'),
    icon: Settings2,
    items: [
      { id: 'instant_orders', label: localizedText('تفعيل الطلبات الفورية', 'Enable instant orders') },
      { id: 'close_on_out_of_stock', label: localizedText('إغلاق مؤقت عند نفاد المخزون', 'Temporarily close when stock runs out') },
      { id: 'show_inventory', label: localizedText('إظهار المخزون للعملاء', 'Show inventory to customers') },
    ],
  },
  {
    key: 'notifications',
    title: localizedText('الإشعارات', 'Notifications'),
    icon: Bell,
    items: [
      { id: 'new_order_alerts', label: localizedText('تنبيهات الطلبات الجديدة', 'New order alerts') },
      { id: 'low_stock_alerts', label: localizedText('تنبيهات انخفاض المخزون', 'Low stock alerts') },
      { id: 'customer_reviews', label: localizedText('مراجعات العملاء', 'Customer reviews') },
    ],
  },
  {
    key: 'security',
    title: localizedText('الأمان والحساب', 'Security & account'),
    icon: Lock,
    items: [
      { id: 'two_factor', label: localizedText('تأكيد بخطوتين', 'Two-factor authentication') },
      { id: 'staff_permissions', label: localizedText('صلاحيات الموظفين', 'Staff permissions') },
      { id: 'recent_logins', label: localizedText('تسجيلات الدخول الحديثة', 'Recent sign-ins') },
    ],
  },
];

function Field({ label, value }) {
  const { text } = useLocalizedContent();

  return (
    <div className="rounded-2xl border border-[#e4eeee] bg-white p-4">
      <div className="text-[10px] text-slate-400">{text(label)}</div>
      <div className="mt-1 text-[13px] font-bold text-[#084036]">{text(value)}</div>
    </div>
  );
}

export default function PharmacySettings() {
  const { text } = useLocalizedContent();
  const [settings, setSettings] = useState({
    instant_orders: true,
    show_inventory: true,
    new_order_alerts: true,
    low_stock_alerts: true
  });

  const toggleSetting = (id) => {
    setSettings(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <PharmacyLayout title={COPY.title} subtitle={COPY.subtitle}>
      <div className="grid gap-5 md:grid-cols-2">
        {SETTINGS_GROUPS.map((group) => {
          const Icon = group.icon;
          return (
            <SectionCard key={group.key} title={group.title} icon={Icon}>
              <div className="flex flex-col gap-3">
                {group.items.map((item) => (
                  <label key={item.id} className="flex cursor-pointer items-center justify-between rounded-2xl border border-[#e4eeee] bg-[#f7fbfb] px-4 py-3 transition hover:border-[#14b8a6]">
                    <input 
                      type="checkbox" 
                      className="h-4 w-4 accent-[#14b8a6]" 
                      checked={!!settings[item.id]}
                      onChange={() => toggleSetting(item.id)}
                    />
                    <span className="text-[12px] font-bold text-[#084036]">{text(item.label)}</span>
                  </label>
                ))}
              </div>
            </SectionCard>
          );
        })}

        <SectionCard title={COPY.generalSettings} icon={Globe} className="md:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={COPY.defaultLanguage} value={COPY.arabic} />
            <Field label={COPY.currency} value={COPY.egyptianPound} />
            <Field label={COPY.timezone} value="Africa/Cairo" />
          </div>
        </SectionCard>
      </div>
    </PharmacyLayout>
  );
}
