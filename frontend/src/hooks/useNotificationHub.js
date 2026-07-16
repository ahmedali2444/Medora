import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { API_BASE_URL, getToken } from '../api/client';

let connection = null;
let startPromise = null;
let subscriberCount = 0;
const subscribers = new Set();

function notifySubscribers(payload) {
  subscribers.forEach((callback) => {
    try {
      callback(payload);
    } catch (error) {
      console.warn('Notification subscriber failed', error);
    }
  });
}

export function subscribeNotifications(callback) {
  subscribers.add(callback);
  subscriberCount += 1;
  ensureNotificationHub();

  return () => {
    subscribers.delete(callback);
    subscriberCount = Math.max(0, subscriberCount - 1);
    if (subscriberCount === 0) {
      stopNotificationHub();
    }
  };
}

export async function stopNotificationHub() {
  startPromise = null;
  if (!connection) return;
  try {
    await connection.stop();
  } catch (error) {
    console.warn('Failed to stop notification hub', error);
  } finally {
    connection = null;
  }
}

export async function ensureNotificationHub() {
  const token = getToken();
  if (!token) {
    await stopNotificationHub();
    return null;
  }

  if (connection?.state === 'Connected') return connection;
  if (startPromise) return startPromise;

  const hubUrl = `${API_BASE_URL}/hubs/notifications?access_token=${encodeURIComponent(token)}`;
  connection = new HubConnectionBuilder()
    .withUrl(hubUrl)
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(LogLevel.Warning)
    .build();

  connection.on('notification', (payload) => notifySubscribers(payload));

  startPromise = connection.start()
    .then(() => connection)
    .catch((error) => {
      console.warn('Notification hub connection failed', error);
      connection = null;
      return null;
    })
    .finally(() => {
      startPromise = null;
    });

  return startPromise;
}
