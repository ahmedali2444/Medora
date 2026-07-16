export const EGYPT_CENTER = { lat: 26.8206, lng: 30.8025 };
export const SESSION_LOCATION_KEY = 'medora_user_location_v1';

export const GEOLOCATION_ERROR_CODES = {
  UNSUPPORTED: 'unsupported',
  INSECURE_CONTEXT: 'insecure-context',
  PERMISSION_DENIED: 'permission-denied',
  TIMEOUT: 'timeout',
  UNAVAILABLE: 'unavailable',
  INVALID_POSITION: 'invalid-position',
  UNKNOWN: 'unknown',
};

function isBlankCoordinate(value) {
  return value == null || (typeof value === 'string' && value.trim() === '');
}

function createGeolocationError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function isValidLatLng(lat, lng) {
  if (isBlankCoordinate(lat) || isBlankCoordinate(lng)) return false;

  const latitude = Number(lat);
  const longitude = Number(lng);
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180
    && !(latitude === 0 && longitude === 0);
}

export function normalizeLocation(location) {
  const lat = Number(location?.lat ?? location?.latitude);
  const lng = Number(location?.lng ?? location?.longitude);
  if (!isValidLatLng(lat, lng)) return null;

  const normalized = { lat, lng };
  const accuracy = Number(location?.accuracy);
  if (Number.isFinite(accuracy)) normalized.accuracy = accuracy;
  return normalized;
}

export function hasCoordinates(item) {
  const lat = Number(item?.latitude);
  const lng = Number(item?.longitude);
  return isValidLatLng(lat, lng);
}

export function getDirectionsUrl(item, fallbackAddress = '') {
  if (hasCoordinates(item)) {
    return `https://www.google.com/maps/search/?api=1&query=${Number(item.latitude)},${Number(item.longitude)}`;
  }

  const address = fallbackAddress || [item?.name, item?.pharmacyName, item?.addressLine, item?.address]
    .filter(Boolean)
    .join(' ');
  return address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : '';
}

export function formatDistanceKm(distanceKm, isRtl = true) {
  const distance = Number(distanceKm);
  if (!Number.isFinite(distance) || distance < 1) return '';
  return `${distance.toFixed(distance < 10 ? 1 : 0)} ${isRtl ? 'كم' : 'km'}`;
}

export function readSessionLocation(storageKey = SESSION_LOCATION_KEY) {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return null;

    const location = normalizeLocation(JSON.parse(raw));
    if (!location) {
      clearSessionLocation(storageKey);
      return null;
    }

    return location;
  } catch {
    clearSessionLocation(storageKey);
    return null;
  }
}

export function saveSessionLocation(location, storageKey = SESSION_LOCATION_KEY) {
  if (typeof window === 'undefined') return null;

  const normalized = normalizeLocation(location);
  if (!normalized) {
    clearSessionLocation(storageKey);
    return null;
  }

  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(normalized));
  } catch {
    return null;
  }

  return normalized;
}

export function clearSessionLocation(storageKey = SESSION_LOCATION_KEY) {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.removeItem(storageKey);
  } catch {
    // Ignore storage access failures; location can still be used in memory.
  }
}

export function requestBrowserLocation(options = {}) {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    return Promise.reject(createGeolocationError(
      GEOLOCATION_ERROR_CODES.UNSUPPORTED,
      'Geolocation is not supported by this browser',
    ));
  }

  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return Promise.reject(createGeolocationError(
      GEOLOCATION_ERROR_CODES.INSECURE_CONTEXT,
      'Geolocation requires a secure context',
    ));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = normalizeLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });

        if (!location) {
          reject(createGeolocationError(
            GEOLOCATION_ERROR_CODES.INVALID_POSITION,
            'Browser returned an invalid location',
          ));
          return;
        }

        resolve(location);
      },
      (error) => {
        if (error?.code === error?.PERMISSION_DENIED || error?.code === 1) {
          reject(createGeolocationError(GEOLOCATION_ERROR_CODES.PERMISSION_DENIED, error.message));
          return;
        }
        if (error?.code === error?.POSITION_UNAVAILABLE || error?.code === 2) {
          reject(createGeolocationError(GEOLOCATION_ERROR_CODES.UNAVAILABLE, error.message));
          return;
        }
        if (error?.code === error?.TIMEOUT || error?.code === 3) {
          reject(createGeolocationError(GEOLOCATION_ERROR_CODES.TIMEOUT, error.message));
          return;
        }

        reject(createGeolocationError(
          GEOLOCATION_ERROR_CODES.UNKNOWN,
          error?.message || 'Unable to read browser location',
        ));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000,
        ...options,
      },
    );
  });
}
