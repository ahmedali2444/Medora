import React, { useCallback, useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertTriangle,
  CheckCircle2,
  LocateFixed,
  Loader2,
  MapPin,
  Search,
  X,
} from 'lucide-react';
import {
  EGYPT_CENTER,
  GEOLOCATION_ERROR_CODES,
  isValidLatLng,
  normalizeLocation,
  readSessionLocation,
  requestBrowserLocation,
  saveSessionLocation,
} from '../../utils/locationUtils';

const MAP_PICKER_LOCATION_KEY = 'medora_map_picker_location_v1';
const DEFAULT_ZOOM = 6;
const SELECTED_ZOOM = 16;
const SEARCH_DEBOUNCE_MS = 450;
const DEFAULT_TILE_URL = import.meta.env.VITE_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const DEFAULT_TILE_ATTRIBUTION = import.meta.env.VITE_MAP_ATTRIBUTION || '&copy; OpenStreetMap contributors';
const GEOCODING_ENDPOINT = import.meta.env.VITE_GEOCODING_ENDPOINT || 'https://nominatim.openstreetmap.org/search';

function scopedLocationKey(storageKey) {
  const scope = String(storageKey || '').trim();
  return scope ? `${MAP_PICKER_LOCATION_KEY}:${scope}` : '';
}

function formatCoord(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(6) : '';
}

function geolocationMessage(error, isRtl) {
  switch (error?.code) {
    case GEOLOCATION_ERROR_CODES.INSECURE_CONTEXT:
      return isRtl
        ? 'تحديد الموقع يحتاج اتصال HTTPS آمن.'
        : 'Location access requires a secure HTTPS connection.';
    case GEOLOCATION_ERROR_CODES.UNSUPPORTED:
      return isRtl
        ? 'متصفحك لا يدعم تحديد الموقع الجغرافي.'
        : 'Your browser does not support geolocation.';
    case GEOLOCATION_ERROR_CODES.PERMISSION_DENIED:
      return isRtl
        ? 'تم رفض إذن الموقع. يمكنك اختيار الموقع يدويًا على الخريطة.'
        : 'Location permission was denied. You can pick the location manually on the map.';
    case GEOLOCATION_ERROR_CODES.TIMEOUT:
      return isRtl
        ? 'انتهت مهلة تحديد الموقع. حاول مرة أخرى أو اختره يدويًا.'
        : 'Location lookup timed out. Try again or pick it manually.';
    case GEOLOCATION_ERROR_CODES.UNAVAILABLE:
      return isRtl
        ? 'موقعك غير متاح حاليًا من المتصفح.'
        : 'Your location is currently unavailable from the browser.';
    default:
      return isRtl
        ? 'تعذر تحديد موقعك. اختر الموقع يدويًا أو حاول مرة أخرى.'
        : 'Unable to read your location. Pick it manually or try again.';
  }
}

function buildGeocodingUrl(query, lang) {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '5',
    countrycodes: 'eg',
    'accept-language': lang || 'ar',
  });
  const separator = GEOCODING_ENDPOINT.includes('?') ? '&' : '?';
  return `${GEOCODING_ENDPOINT}${separator}${params.toString()}`;
}

function PickByClick({ onPick }) {
  useMapEvents({
    click(event) {
      onPick({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

function RecenterMap({ center, zoom, nonce }) {
  const map = useMap();

  useEffect(() => {
    if (!center) return;
    map.flyTo([center.lat, center.lng], zoom, { duration: 0.35 });
  }, [center, map, nonce, zoom]);

  return null;
}

function ResizeMap() {
  const map = useMap();

  useEffect(() => {
    const first = window.setTimeout(() => map.invalidateSize(), 80);
    const second = window.setTimeout(() => map.invalidateSize(), 320);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(second);
    };
  }, [map]);

  return null;
}

export default function MapPicker({
  open,
  value,
  title,
  isRtl = true,
  storageKey = '',
  onClose,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <MapPickerDialog
      key={`${value?.lat ?? value?.latitude ?? 'default'}:${value?.lng ?? value?.longitude ?? 'default'}:${storageKey}`}
      value={value}
      title={title}
      isRtl={isRtl}
      storageKey={storageKey}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}

function MapPickerDialog({ value, title, isRtl, storageKey, onClose, onConfirm }) {
  const storageLocationKey = useMemo(() => scopedLocationKey(storageKey), [storageKey]);
  const storedLocation = useMemo(
    () => (storageLocationKey ? readSessionLocation(storageLocationKey) : null),
    [storageLocationKey],
  );
  const initialLocation = useMemo(() => normalizeLocation(value) || storedLocation, [storedLocation, value]);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [manual, setManual] = useState({
    lat: initialLocation ? formatCoord(initialLocation.lat) : '',
    lng: initialLocation ? formatCoord(initialLocation.lng) : '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSelectedSearch, setLastSelectedSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [recenterNonce, setRecenterNonce] = useState(0);
  const lang = isRtl ? 'ar' : 'en';
  const mapCenter = selectedLocation || EGYPT_CENTER;
  const mapZoom = selectedLocation ? SELECTED_ZOOM : DEFAULT_ZOOM;
  const hasValidSelection = isValidLatLng(selectedLocation?.lat, selectedLocation?.lng);
  const markerIcon = useMemo(() => L.divIcon({
    className: 'medora-map-marker',
    html: '<span></span>',
    iconSize: [32, 42],
    iconAnchor: [16, 39],
  }), []);

  const setPickedLocation = useCallback((location, options = {}) => {
    const normalized = normalizeLocation(location);
    if (!normalized) {
      setError(isRtl ? 'إحداثيات غير صحيحة.' : 'Invalid coordinates.');
      return;
    }

    setSelectedLocation({
      ...normalized,
      address: location?.address || location?.displayName || normalized.address,
    });
    if (options.syncManual !== false) {
      setManual({ lat: formatCoord(normalized.lat), lng: formatCoord(normalized.lng) });
    }
    setError('');
    if (options.notice) setNotice(options.notice);
    if (options.recenter !== false) setRecenterNonce((value) => value + 1);
  }, [isRtl]);

  const searchAddress = useCallback(async (query, signal) => {
    const term = query.trim();
    if (term.length < 3) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    setError('');

    try {
      const response = await fetch(buildGeocodingUrl(term, lang), {
        signal,
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('search-failed');
      const data = await response.json();
      const results = Array.isArray(data)
        ? data.map((item) => {
          const location = normalizeLocation({ lat: item.lat, lng: item.lon });
          if (!location) return null;
          return {
            ...location,
            id: item.place_id || `${item.lat}:${item.lon}:${item.display_name}`,
            address: item.display_name || '',
          };
        }).filter(Boolean)
        : [];
      setSearchResults(results);
      if (!results.length) {
        setNotice(isRtl ? 'لم نجد عنوانًا مطابقًا. جرّب كتابة منطقة أو شارع أقرب.' : 'No matching address found. Try a nearby area or street.');
      } else {
        setNotice('');
      }
    } catch (searchError) {
      if (searchError?.name !== 'AbortError') {
        setSearchResults([]);
        setError(isRtl ? 'تعذر البحث عن العنوان الآن.' : 'Unable to search for the address right now.');
      }
    } finally {
      if (!signal?.aborted) setSearchLoading(false);
    }
  }, [isRtl, lang]);

  useEffect(() => {
    const term = searchQuery.trim();
    if (term && term === lastSelectedSearch) {
      setSearchResults([]);
      setSearchLoading(false);
      return undefined;
    }
    if (term.length < 3) {
      setSearchResults([]);
      setSearchLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => searchAddress(term, controller.signal), SEARCH_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [lastSelectedSearch, searchAddress, searchQuery]);

  const useCurrentLocation = async () => {
    setLocationLoading(true);
    setError('');
    setNotice('');
    try {
      const location = await requestBrowserLocation({ timeout: 12000, maximumAge: 0 });
      setPickedLocation(location, {
        notice: isRtl ? 'تم تحديد موقعك الحالي.' : 'Current location selected.',
      });
    } catch (locationError) {
      setError(geolocationMessage(locationError, isRtl));
    } finally {
      setLocationLoading(false);
    }
  };

  const handleManualChange = (field, nextValue) => {
    const nextManual = { ...manual, [field]: nextValue };
    setManual(nextManual);

    if (isValidLatLng(nextManual.lat, nextManual.lng)) {
      setPickedLocation({ lat: nextManual.lat, lng: nextManual.lng }, { recenter: false, syncManual: false });
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const controller = new AbortController();
    searchAddress(searchQuery, controller.signal);
  };

  const selectSearchResult = (result) => {
    setLastSelectedSearch(result.address);
    setSearchQuery(result.address);
    setSearchResults([]);
    setPickedLocation(result, {
      notice: isRtl ? 'تم اختيار الموقع من نتيجة البحث.' : 'Location selected from search result.',
    });
  };

  const confirm = () => {
    const normalized = normalizeLocation(selectedLocation);
    if (!normalized) {
      setError(isRtl ? 'اختر موقعًا صالحًا على الخريطة أولاً.' : 'Pick a valid map location first.');
      return;
    }

    if (storageLocationKey) saveSessionLocation(normalized, storageLocationKey);
    onConfirm?.({
      lat: normalized.lat,
      lng: normalized.lng,
      address: selectedLocation?.address || '',
    });
  };

  return (
    <div className="medora-modal-overlay medora-modal-overlay--top medora-modal-overlay--center" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="medora-modal-panel medora-map-picker-panel" role="dialog" aria-modal="true">
        <div className="medora-modal-header">
          <div className="flex items-start justify-between gap-4">
            <div className="text-start">
              <h3 className="flex items-center gap-2 text-base font-black text-[#084036]">
                <MapPin size={19} className="text-[#14b8a6]" />
                {title || (isRtl ? 'حدد الموقع' : 'Pick location')}
              </h3>
              <p className="mt-1 text-[11px] font-semibold text-[#6b8385]">
                {isRtl ? 'ابحث عن العنوان أو اضغط على الخريطة أو حرّك العلامة.' : 'Search an address, tap the map, or drag the marker.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d7e7e5] bg-white text-[#486466] transition hover:border-[#14b8a6] hover:text-[#119a8a]"
              aria-label={isRtl ? 'إغلاق' : 'Close'}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="medora-modal-body space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-2 sm:flex-row">
            <label className="relative min-w-0 flex-1">
              <Search size={15} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[#14b8a6]" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  setLastSelectedSearch('');
                  setSearchQuery(event.target.value);
                }}
                placeholder={isRtl ? 'ابحث باسم الشارع أو المنطقة...' : 'Search street or area...'}
                className="h-10 w-full rounded-xl border border-[#d7e7e5] bg-white px-3 pe-9 text-[12px] text-[#084036] outline-none transition focus:border-[#14b8a6] focus:ring-4 focus:ring-[#14b8a6]/10"
              />
            </label>
            <button
              type="submit"
              disabled={searchLoading || searchQuery.trim().length < 3}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#14b8a6] px-4 text-[12px] font-extrabold text-[#0e7c6e] transition hover:bg-[#f0fbfa] disabled:opacity-50"
            >
              {searchLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              {isRtl ? 'بحث' : 'Search'}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="max-h-36 overflow-y-auto rounded-xl border border-[#d7e7e5] bg-white shadow-sm">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => selectSearchResult(result)}
                  className="flex w-full items-start gap-2 border-b border-[#eef5f4] px-3 py-2 text-start text-[12px] text-[#295d60] transition last:border-b-0 hover:bg-[#f7fbfb]"
                >
                  <MapPin size={13} className="mt-1 shrink-0 text-[#14b8a6]" />
                  <span className="line-clamp-2">{result.address}</span>
                </button>
              ))}
            </div>
          )}

          <div className="relative overflow-hidden rounded-2xl border border-[#d7e7e5] bg-[#e6f7f7]">
            <MapContainer
              center={[mapCenter.lat, mapCenter.lng]}
              zoom={mapZoom}
              scrollWheelZoom
              className="h-[300px] w-full sm:h-[360px]"
              zoomControl={!window.matchMedia?.('(max-width: 640px)').matches}
            >
              <TileLayer
                attribution={DEFAULT_TILE_ATTRIBUTION}
                url={DEFAULT_TILE_URL}
                eventHandlers={{ tileerror: () => setTileError(true) }}
              />
              <PickByClick onPick={(location) => setPickedLocation(location, {
                notice: isRtl ? 'تم اختيار الموقع من الخريطة.' : 'Location selected on the map.',
              })}
              />
              <ResizeMap />
              <RecenterMap center={mapCenter} zoom={mapZoom} nonce={recenterNonce} />
              {hasValidSelection && (
                <Marker
                  position={[selectedLocation.lat, selectedLocation.lng]}
                  icon={markerIcon}
                  draggable
                  eventHandlers={{
                    dragend(event) {
                      const marker = event.target;
                      const next = marker.getLatLng();
                      setPickedLocation({ lat: next.lat, lng: next.lng }, {
                        notice: isRtl ? 'تم تحديث موقع العلامة.' : 'Marker location updated.',
                      });
                    },
                  }}
                />
              )}
            </MapContainer>
            {!hasValidSelection && (
              <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-xl bg-white/95 px-3 py-2 text-center text-[12px] font-bold text-[#486466] shadow-sm">
                {isRtl ? 'اضغط على الخريطة لاختيار الموقع.' : 'Tap the map to choose a location.'}
              </div>
            )}
            {tileError && (
              <div className="absolute inset-x-3 top-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-700 shadow-sm">
                {isRtl ? 'تعذر تحميل بعض مربعات الخريطة. تحقق من الاتصال.' : 'Some map tiles could not load. Check your connection.'}
              </div>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-start text-[11px] font-bold text-[#486466]">
              Latitude
              <input
                type="number"
                step="any"
                value={manual.lat}
                onChange={(event) => handleManualChange('lat', event.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-[#d7e7e5] px-3 text-[12px] outline-none transition focus:border-[#14b8a6] focus:ring-4 focus:ring-[#14b8a6]/10"
                dir="ltr"
              />
            </label>
            <label className="block text-start text-[11px] font-bold text-[#486466]">
              Longitude
              <input
                type="number"
                step="any"
                value={manual.lng}
                onChange={(event) => handleManualChange('lng', event.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-[#d7e7e5] px-3 text-[12px] outline-none transition focus:border-[#14b8a6] focus:ring-4 focus:ring-[#14b8a6]/10"
                dir="ltr"
              />
            </label>
          </div>

          <div className={`flex items-start gap-2 rounded-xl px-3 py-2 text-[12px] font-bold ${hasValidSelection ? 'bg-[#e6f7f7] text-[#0e7c6e]' : 'bg-amber-50 text-amber-700'}`}>
            {hasValidSelection ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <AlertTriangle size={15} className="mt-0.5 shrink-0" />}
            <div className="min-w-0">
              <div>{hasValidSelection ? (isRtl ? 'تم اختيار موقع صالح.' : 'A valid location is selected.') : (isRtl ? 'لم يتم اختيار موقع بعد.' : 'No location selected yet.')}</div>
              {hasValidSelection && (
                <div className="mt-0.5 font-mono text-[11px]" dir="ltr">
                  {formatCoord(selectedLocation.lat)}, {formatCoord(selectedLocation.lng)}
                </div>
              )}
            </div>
          </div>

          {notice && <div className="rounded-xl bg-[#f7fbfb] px-3 py-2 text-[11px] font-bold text-[#486466]">{notice}</div>}
          {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-[11px] font-bold leading-6 text-red-600">{error}</div>}
        </div>

        <div className="medora-modal-footer flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={locationLoading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#14b8a6] bg-white px-4 py-2.5 text-[12px] font-extrabold text-[#0e7c6e] transition hover:bg-[#f0fbfa] disabled:opacity-60"
          >
            {locationLoading ? <Loader2 size={15} className="animate-spin" /> : <LocateFixed size={15} />}
            {locationLoading ? (isRtl ? 'جار تحديد الموقع...' : 'Locating...') : (isRtl ? 'استخدم موقعي الحالي' : 'Use my current location')}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#d7e7e5] bg-white px-4 py-2.5 text-[12px] font-bold text-[#486466] transition hover:border-[#14b8a6]"
            >
              {isRtl ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={!hasValidSelection}
              className="rounded-xl bg-[#14b8a6] px-5 py-2.5 text-[12px] font-extrabold text-white transition hover:bg-[#119a8a] disabled:opacity-50"
            >
              {isRtl ? 'تأكيد الموقع' : 'Confirm location'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
