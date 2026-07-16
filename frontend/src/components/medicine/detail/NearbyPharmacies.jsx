import React from 'react';
import { Clock, MapPin, Navigation, Phone, Store } from 'lucide-react';
import { useLocalizedContent } from '../../../hooks/useLocalizedContent';
import { formatDistanceKm, getDirectionsUrl } from '../../../utils/locationUtils';
import { isPharmacyOpen } from '../../../utils/pharmacyMappers';

function calculateDistance(lat1, lon1, lat2, lon2) {
  const fromLat = Number(lat1);
  const fromLng = Number(lon1);
  const toLat = Number(lat2);
  const toLng = Number(lon2);
  const hasValidCoordinates = [fromLat, fromLng, toLat, toLng].every(Number.isFinite)
    && fromLat >= -90 && fromLat <= 90
    && toLat >= -90 && toLat <= 90
    && fromLng >= -180 && fromLng <= 180
    && toLng >= -180 && toLng <= 180
    && !(fromLat === 0 && fromLng === 0)
    && !(toLat === 0 && toLng === 0);

  if (!hasValidCoordinates) return null;

  const R = 6371; // km
  const dLat = (toLat - fromLat) * Math.PI / 180;
  const dLon = (toLng - fromLng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(fromLat * Math.PI / 180) * Math.cos(toLat * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

export default function NearbyPharmacies({ medicineName, pharmacies = [], loading = false, error = '', userLocation = null }) {
  const { isRtl, text } = useLocalizedContent();
  const items = Array.isArray(pharmacies) ? pharmacies : [];

  return (
    <div
      className="animate-fadeInUp rounded-2xl border border-[#e4eeee] bg-white p-6 shadow-[0_10px_28px_rgba(41,93,96,0.08)]"
      style={{ fontFamily: 'Cairo, sans-serif' }}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 rounded-full bg-[#eef8f7] px-3 py-1 text-[11px] font-bold text-[#119a8a]">
          <Navigation size={12} />
          {isRtl ? 'بيانات متاحة من الصيدليات' : 'Live pharmacy availability'}
        </div>
        <h2 className="flex items-center gap-2 text-[16px] font-extrabold text-[#295d60]">
          <span>{isRtl ? 'صيدليات توفر الدواء' : 'Pharmacies carrying this medicine'}</span>
          <Store size={16} className="text-[#14b8a6]" />
        </h2>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[#e4eeee] bg-[#f7fbfb] p-5 text-center text-[12px] font-bold text-[#486466]">
          ...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-center text-[12px] font-bold text-red-700">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#cfe4e2] bg-[#f7fbfb] p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-[0_8px_20px_rgba(41,93,96,0.08)]">
            <MapPin size={18} color="#14b8a6" />
          </div>
          <p className="text-[13px] font-bold text-[#295d60]">
            {isRtl
              ? 'لا توجد صيدليات متاحة لهذا الدواء حالياً.'
              : 'No pharmacies are currently available for this medicine.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((pharmacy, index) => {
            const pharmacyName = (lang === 'en' && pharmacy.pharmacyNameEn ? pharmacy.pharmacyNameEn : pharmacy.pharmacyName) || (isRtl ? 'صيدلية' : 'Pharmacy');
            const pharmacyArea = pharmacy.addressLine || '-';
            const mapUrl = getDirectionsUrl(pharmacy, [pharmacy.pharmacyName, pharmacy.addressLine].filter(Boolean).join(' '));
            const openNow = pharmacy?.status || pharmacy?.openFrom || pharmacy?.openTo || pharmacy?.is24Hours
              ? isPharmacyOpen(pharmacy)
              : null;
            const hoursLabel = pharmacy.is24Hours
              ? (isRtl ? '24 ساعة' : '24 hours')
              : [pharmacy.openFrom, pharmacy.openTo].filter(Boolean).join(' - ') || '-';
            const distance = Number.isFinite(Number(pharmacy.distanceKm))
                ? Number(pharmacy.distanceKm)
                : userLocation
                  ? calculateDistance(userLocation.lat, userLocation.lng, pharmacy.latitude, pharmacy.longitude)
                  : null;
            const distanceLabel = formatDistanceKm(distance, isRtl);

            return (
              <div
                key={pharmacy.pharmacyId}
                className="flex items-start justify-between gap-3 rounded-2xl border border-[#e4eeee] bg-white p-4 transition hover:border-[#14b8a6]"
                style={{ boxShadow: '0 4px 14px rgba(41,93,96,0.04)' }}
              >
                <div className="flex flex-col items-stretch gap-2">
                  {pharmacy.phone ? (
                    <a
                      href={`tel:${pharmacy.phone}`}
                      className="inline-flex items-center justify-center gap-1 rounded-full border border-[#d7e7e5] bg-white px-3 py-1.5 text-[11px] font-bold text-[#2d6669] transition hover:border-[#14b8a6]"
                    >
                      <Phone size={11} />
                      {isRtl ? 'اتصل' : 'Call'}
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex cursor-not-allowed items-center justify-center gap-1 rounded-full border border-[#d7e7e5] bg-white px-3 py-1.5 text-[11px] font-bold text-[#2d6669] opacity-50"
                    >
                      <Phone size={11} />
                      {isRtl ? 'اتصل' : 'Call'}
                    </button>
                  )}
                  {mapUrl ? (
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1 rounded-full border border-[#d7e7e5] bg-white px-3 py-1.5 text-[11px] font-bold text-[#2d6669] transition hover:border-[#14b8a6]"
                    >
                      <MapPin size={11} />
                      {isRtl ? 'الاتجاهات' : 'Directions'}
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex cursor-not-allowed items-center justify-center gap-1 rounded-full border border-[#d7e7e5] bg-white px-3 py-1.5 text-[11px] font-bold text-[#2d6669] opacity-50"
                    >
                      <MapPin size={11} />
                      {isRtl ? 'الاتجاهات' : 'Directions'}
                    </button>
                  )}
                </div>

                <div className="flex-1 text-right">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold"
                      style={{
                        background: index === 0 ? 'rgba(20,184,166,0.12)' : '#f7fbfb',
                        color: index === 0 ? '#0e7c6e' : '#2d6669',
                      }}
                    >
                      #{index + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      {distanceLabel && (
                        <span className="text-[11px] font-bold text-[#14b8a6]">
                          {distanceLabel}
                        </span>
                      )}
                      <span className="text-[11px] font-semibold text-slate-500">{pharmacyArea}</span>
                      <div className="text-[14px] font-extrabold text-[#084036]">{pharmacyName}</div>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center justify-end gap-2 text-[11px] text-slate-500">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold"
                      style={
                        openNow
                          ? { background: 'rgba(20,184,166,0.12)', color: '#0e7c6e' }
                          : { background: '#eef8f7', color: '#5e8e8e' }
                      }
                    >
                      <Clock size={10} />
                      {openNow === null ? hoursLabel : openNow ? (isRtl ? 'مفتوحة الآن' : 'Open now') : isRtl ? 'مغلقة' : 'Closed'}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#f1fbfa] px-2 py-0.5 font-bold text-[#2d6669]">
                      {Number(pharmacy.price || 0).toFixed(2)} {isRtl ? 'ج.م' : 'EGP'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {isRtl ? 'الكمية:' : 'Qty:'} {pharmacy.quantity ?? 0}
                    </span>
                    <span className="text-[10px] text-slate-400">{hoursLabel}</span>
                  </div>

                  {medicineName && (
                    <div className="mt-2 text-[11px] text-slate-500">
                      {isRtl ? 'الدواء المطلوب:' : 'Requested medicine:'}{' '}
                      <span className="font-bold text-[#295d60]">{text(medicineName)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
