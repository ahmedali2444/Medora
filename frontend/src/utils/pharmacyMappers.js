function formatPharmacyHours(pharmacy) {
  if (pharmacy?.is24Hours) return { ar: '24 ساعة', en: '24 hours' };
  if (pharmacy?.openFrom && pharmacy?.openTo) {
    const hours = `${pharmacy.openFrom} - ${pharmacy.openTo}`;
    return { ar: hours, en: hours };
  }
  return { ar: '', en: '' };
}

function isWithinOpeningHours(pharmacy) {
  if (pharmacy?.is24Hours) return true;
  if (!pharmacy?.openFrom || !pharmacy?.openTo) return null;

  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const [fromH, fromM] = String(pharmacy.openFrom).split(':').map(Number);
  const [toH, toM] = String(pharmacy.openTo).split(':').map(Number);
  if (!Number.isFinite(fromH) || !Number.isFinite(toH)) return null;

  const openMinutes = fromH * 60 + (fromM || 0);
  const closeMinutes = toH * 60 + (toM || 0);
  if (closeMinutes <= openMinutes) {
    return current >= openMinutes || current < closeMinutes;
  }
  return current >= openMinutes && current < closeMinutes;
}

export function isPharmacyOpen(pharmacy) {
  if (!pharmacy) return false;

  const status = pharmacy.status ? String(pharmacy.status).toLowerCase() : null;
  if (status === 'closed') return false;

  const withinHours = isWithinOpeningHours(pharmacy);
  if (withinHours === false) return false;
  if (withinHours === true) return true;
  if (status === 'open') return true;
  if (typeof pharmacy.open === 'boolean') return pharmacy.open;
  return false;
}

export function mapApiPharmacy(item) {
  if (!item) return null;

  const status = item.status ?? (item.isOpen === false ? 'closed' : 'open');
  const name = item.pharmacyName || item.name || '';
  const address = item.addressLine || item.area || '';

  return {
    id: item.pharmacyId ?? item.id,
    name: typeof name === 'object' ? name : { ar: name, en: name },
    area: typeof address === 'object' ? address : { ar: address, en: address },
    phone: item.phone || '',
    hours: item.hours || formatPharmacyHours(item),
    openFrom: item.openFrom ?? null,
    openTo: item.openTo ?? null,
    is24Hours: Boolean(item.is24Hours),
    open: isPharmacyOpen({
      status,
      open: item.open,
      openFrom: item.openFrom,
      openTo: item.openTo,
      is24Hours: item.is24Hours,
    }),
    status,
    distanceKm: Number.isFinite(Number(item.distanceKm)) ? Number(item.distanceKm) : null,
    price: item.price ?? null,
    latitude: item.latitude ?? null,
    longitude: item.longitude ?? null,
  };
}

export function mapApiPharmacies(items) {
  return (Array.isArray(items) ? items : []).map(mapApiPharmacy).filter(Boolean);
}
