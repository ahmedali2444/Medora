import { useState, useEffect, useCallback } from 'react';
import { medoraApi } from '../api/medoraApi';
import { useLang } from '../context/LanguageContext';
import { subscribeNotifications } from './useNotificationHub';

const NOTIFICATION_PAGE_SIZE = 100;
const FALLBACK_POLL_MS = 120000;

export function formatTimeAgo(dateString, isRtl) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return isRtl ? 'الآن' : 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return isRtl ? `منذ ${diffInMinutes}د` : `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return isRtl ? `منذ ${diffInHours}س` : `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return isRtl ? `منذ ${diffInDays}يوم` : `${diffInDays}d ago`;
  return date.toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
}

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState(null);
  const { lang } = useLang();
  const isRtl = lang !== 'en';

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await medoraApi.notifications({ unreadOnly: false, page: 1, pageSize: NOTIFICATION_PAGE_SIZE });
      const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      const totalUnread = Number(data?.unreadCount ?? data?.totalUnread ?? items.filter((n) => !n.isRead).length);
      setNotifications(items);
      setUnreadCount(totalUnread);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
      setError(err?.message || (isRtl ? 'تعذر تحميل الإشعارات' : 'Failed to load notifications'));
    }
  }, [isRtl]);

  useEffect(() => {
    let mounted = true;
    const runFetch = () => { if (mounted) fetchNotifications(); };
    runFetch();
    const pollTimer = setInterval(runFetch, FALLBACK_POLL_MS);
    const unsubscribe = subscribeNotifications(runFetch);
    return () => { mounted = false; clearInterval(pollTimer); unsubscribe(); };
  }, [fetchNotifications]);

  const markAllAsRead = async () => {
    try {
      await medoraApi.readAllNotifications();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      setError(null);
    } catch (err) {
      setError(err?.message || (isRtl ? 'تعذر تعليم الإشعارات كمقروءة' : 'Failed to mark notifications as read'));
    }
  };

  const markAsRead = async (id) => {
    try {
      const wasUnread = notifications.some((n) => n.id === id && !n.isRead);
      await medoraApi.readNotification(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
      setError(null);
    } catch (err) {
      setError(err?.message || (isRtl ? 'تعذر تعليم الإشعار كمقروء' : 'Failed to mark notification as read'));
    }
  };

  return {
    notifications: notifications.map((n) => ({
      id: n.id,
      title: n.title || (isRtl ? 'إشعار جديد' : 'New Notification'),
      desc: n.body || n.message || '',
      time: formatTimeAgo(n.createdAt, isRtl),
      isRead: n.isRead,
    })),
    unreadCount,
    error,
    markAllAsRead,
    markAsRead,
    refresh: fetchNotifications,
  };
}
