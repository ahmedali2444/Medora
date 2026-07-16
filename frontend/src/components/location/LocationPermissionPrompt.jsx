import { useCallback, useEffect, useState } from 'react';
import { LocateFixed, MapPin, X } from 'lucide-react';
import {
  GEOLOCATION_ERROR_CODES,
  readSessionLocation,
  requestBrowserLocation,
  saveSessionLocation,
  SESSION_LOCATION_KEY,
} from '../../utils/locationUtils';

const LOCATION_PROMPT_DISMISSED_KEY = 'medora_location_prompt_dismissed_v1';

function isPromptDismissed(storageKey) {
  if (typeof window === 'undefined') return false;

  try {
    return window.sessionStorage.getItem(storageKey) === '1';
  } catch {
    return false;
  }
}

function setPromptDismissed(storageKey) {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(storageKey, '1');
  } catch {
    // Ignore storage access failures; the current component state still closes the prompt.
  }
}

function clearPromptDismissed(storageKey) {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.removeItem(storageKey);
  } catch {
    // Ignore storage access failures.
  }
}

export default function LocationPermissionPrompt({
  isRtl = true,
  onLocation,
  locationScope = '',
  showRefreshButton = false,
  className = '',
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scope = String(locationScope || '').trim();
  const locationStorageKey = scope ? `${SESSION_LOCATION_KEY}:${scope}` : SESSION_LOCATION_KEY;
  const dismissedStorageKey = scope ? `${LOCATION_PROMPT_DISMISSED_KEY}:${scope}` : LOCATION_PROMPT_DISMISSED_KEY;

  const getErrorMessage = useCallback((locationError) => {
    switch (locationError?.code) {
      case GEOLOCATION_ERROR_CODES.INSECURE_CONTEXT:
        return isRtl
          ? 'لا يمكن قراءة موقعك من اتصال غير آمن. افتح الموقع عبر HTTPS ثم حاول مرة أخرى.'
          : 'Location requires a secure HTTPS connection. Open the site over HTTPS, then try again.';
      case GEOLOCATION_ERROR_CODES.UNSUPPORTED:
        return isRtl
          ? 'متصفحك لا يدعم تحديد الموقع الجغرافي.'
          : 'Your browser does not support geolocation.';
      case GEOLOCATION_ERROR_CODES.PERMISSION_DENIED:
        return isRtl
          ? 'تم رفض إذن الموقع. اسمح للموقع من إعدادات المتصفح ثم حاول مرة أخرى.'
          : 'Location permission was denied. Allow it from browser settings, then try again.';
      case GEOLOCATION_ERROR_CODES.TIMEOUT:
        return isRtl
          ? 'انتهت مهلة قراءة الموقع. تأكد من اتصالك وحاول مرة أخرى.'
          : 'Reading your location timed out. Check your connection and try again.';
      case GEOLOCATION_ERROR_CODES.UNAVAILABLE:
        return isRtl
          ? 'موقعك غير متاح حاليًا من المتصفح. حاول مرة أخرى بعد لحظات.'
          : 'Your location is currently unavailable from the browser. Try again in a moment.';
      case GEOLOCATION_ERROR_CODES.INVALID_POSITION:
        return isRtl
          ? 'أرسل المتصفح موقعًا غير صالح. حاول مرة أخرى.'
          : 'The browser returned an invalid location. Try again.';
      default:
        return isRtl
          ? 'تعذر الوصول لموقعك. تأكد من السماح للموقع من إعدادات المتصفح.'
          : 'Unable to read your location. Allow location from browser settings.';
    }
  }, [isRtl]);

  const acceptLocation = useCallback((location) => {
    const sessionLocation = saveSessionLocation(location, locationStorageKey) || location;
    clearPromptDismissed(dismissedStorageKey);
    onLocation(sessionLocation);
    setDialogOpen(false);
    setError('');
  }, [dismissedStorageKey, locationStorageKey, onLocation]);

  const allowLocation = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const location = await requestBrowserLocation();
      acceptLocation(location);
    } catch (locationError) {
      setDialogOpen(true);
      setError(getErrorMessage(locationError));
    } finally {
      setLoading(false);
    }
  }, [acceptLocation, getErrorMessage]);

  useEffect(() => {
    const storedLocation = readSessionLocation(locationStorageKey);
    if (storedLocation) {
      onLocation(storedLocation);
      setDialogOpen(false);
      setError('');
      return;
    }

    if (isPromptDismissed(dismissedStorageKey)) {
      setDialogOpen(false);
      return;
    }

    setDialogOpen(true);
  }, [dismissedStorageKey, locationStorageKey, onLocation]);

  const continueWithoutLocation = useCallback(() => {
    setPromptDismissed(dismissedStorageKey);
    setDialogOpen(false);
    setError('');
  }, [dismissedStorageKey]);

  const openLocationDialog = useCallback(() => {
    setError('');
    setDialogOpen(true);
  }, []);

  return (
    <>
      {showRefreshButton && (
        <div className={className}>
          <button
            type="button"
            onClick={openLocationDialog}
            className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#14b8a6]/30 bg-white px-3.5 py-2 text-xs font-extrabold text-[#0b7d70] shadow-sm transition hover:border-[#14b8a6] hover:bg-[#f0fbfa]"
          >
            <LocateFixed size={14} />
            {isRtl ? 'تحديث موقعي' : 'Update my location'}
          </button>
        </div>
      )}
      {dialogOpen && (
        <div className="medora-modal-overlay medora-modal-overlay--top medora-modal-overlay--center">
          <div
            dir={isRtl ? 'rtl' : 'ltr'}
            className="medora-modal-panel medora-modal-panel--sm animate-fadeInUp"
            role="dialog"
            aria-modal="true"
            aria-labelledby="location-permission-title"
          >
            <div className="medora-modal-header">
              <div className="flex items-start gap-3 text-start">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e6f7f7] text-[#119a8a]">
                  <MapPin size={20} />
                </div>
                <div>
                  <h2 id="location-permission-title" className="text-base font-black text-[#084036]">
                    {isRtl ? 'السماح بالوصول إلى الموقع الجغرافي' : 'Allow location access'}
                  </h2>
                  <p className="mt-1 text-xs leading-6 text-slate-500">
                    {isRtl
                      ? 'نحتاج موقعك لترتيب نتائج العيادات والأطباء والصيدليات حسب الأقرب لك.'
                      : 'We need your location to sort clinics, doctors, and pharmacies by nearest.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="medora-modal-body text-start">
              <p className="text-sm leading-7 text-[#486466]">
                {isRtl
                  ? 'اسمح للمنصة بقراءة موقعك الحالي لترتيب النتائج حسب الأقرب لك. يعمل ذلك بدون تسجيل دخول.'
                  : 'Allow the platform to read your current location to sort results by nearest. This works without sign-in.'}
              </p>
              {error && (
                <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold leading-6 text-red-600">
                  {error}
                </p>
              )}
            </div>

            <div className="medora-modal-footer flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={continueWithoutLocation}
                disabled={loading}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-extrabold text-red-600 transition hover:border-red-300 hover:bg-red-100 disabled:opacity-60"
              >
                <X size={14} />
                {isRtl ? 'عدم السماح' : 'Do not allow'}
              </button>
              <button
                type="button"
                onClick={allowLocation}
                disabled={loading}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#14b8a6] px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#119a8a] disabled:opacity-60"
              >
                <LocateFixed size={14} />
                {loading ? '...' : error ? (isRtl ? 'حاول مرة أخرى' : 'Try again') : isRtl ? 'استخدم موقعي' : 'Use my location'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
