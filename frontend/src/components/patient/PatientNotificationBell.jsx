import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { useNotifications } from '../../hooks/useNotifications';

export default function PatientNotificationBell({ variant = 'panel' }) {
  const { lang } = useLang();
  const isRtl = lang !== 'en';
  const { notifications, unreadCount, markAllAsRead, markAsRead, error } = useNotifications();
  const [open, setOpen] = useState(false);
  const dropdownSideClass = isRtl ? 'left-0' : 'right-0';
  const wrapperClass = variant === 'navbar' ? 'relative' : 'relative mb-4 flex justify-end';

  return (
    <div className={wrapperClass}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#e4eeee] bg-white text-[#295d60] shadow-sm transition hover:border-[#14b8a6] hover:text-[#119a8a]"
        aria-label={isRtl ? 'إشعارات' : 'Notifications'}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 end-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ef4444] px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label={isRtl ? 'إغلاق' : 'Close'}
            onClick={() => setOpen(false)}
          />
          <div className={`absolute top-12 z-50 w-80 overflow-hidden rounded-2xl border border-[#e4eeee] bg-white shadow-[0_24px_50px_rgba(8,64,54,0.18)] ${dropdownSideClass}`}>
            <div className="flex items-center justify-between border-b border-[#e4eeee] px-4 py-3">
              <button type="button" onClick={markAllAsRead} className="text-[11px] font-bold text-[#14b8a6] hover:underline">
                {isRtl ? 'تعليم الكل كمقروء' : 'Mark all as read'}
              </button>
              <span className="text-[12px] font-extrabold text-[#084036]">
                {isRtl ? 'الإشعارات' : 'Notifications'}
              </span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {error ? (
                <div className="p-4 text-center text-[12px] text-[#d14f4f]">{error}</div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-[12px] text-slate-500">
                  {isRtl ? 'لا توجد إشعارات' : 'No notifications'}
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => {
                      if (!notification.isRead) markAsRead(notification.id);
                    }}
                    className={`flex items-start gap-3 border-b border-[#f3f7f7] px-4 py-3 last:border-b-0 ${!notification.isRead ? 'cursor-pointer bg-[#f7fbfb] hover:bg-[#eaf4f4]' : ''}`}
                  >
                    {!notification.isRead ? (
                      <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-[#14b8a6]" />
                    ) : (
                      <span className="mt-1 inline-block h-2 w-2 shrink-0" />
                    )}
                    <div className="flex-1 text-start">
                      <div className={`text-[12px] text-[#084036] ${!notification.isRead ? 'font-extrabold' : 'font-semibold'}`}>
                        {notification.title}
                      </div>
                      <div className="mt-0.5 text-[11px] leading-6 text-slate-500">{notification.desc}</div>
                    </div>
                    <span className="shrink-0 text-[10px] text-slate-400">{notification.time}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
