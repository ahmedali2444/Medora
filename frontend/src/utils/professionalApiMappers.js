import { localizedText } from './localization';
import { API_BASE_URL } from '../api/client';

const PLACEHOLDER = localizedText('—', '-');

export function avatarForName(name, background = '14b8a6') {
  const safeName = String(name || 'Medora').trim() || 'Medora';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(safeName)}&background=${background}&color=fff&size=200`;
}

export function resolveImageUrl(url, fallbackName, background = '14b8a6') {
  if (!url || typeof url !== 'string' || url.trim() === '' || url === 'null') {
    return avatarForName(fallbackName, background);
  }
  const trimmedUrl = url.trim();
  if (trimmedUrl.startsWith('http') || trimmedUrl.startsWith('data:')) {
    return trimmedUrl;
  }
  return `${API_BASE_URL}${trimmedUrl.startsWith('/') ? '' : '/'}${trimmedUrl}`;
}

export function toDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function offsetDateKey(days = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function toTime(value) {
  const raw = String(value || '');
  if (/^\d{2}:\d{2}/.test(raw)) return raw.slice(0, 5);
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function normalizeAppointmentStatus(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'confirmed') return 'confirmed';
  if (normalized === 'completed') return 'completed';
  if (normalized === 'cancelled' || normalized === 'canceled') return 'cancelled';
  return 'pending';
}

export function mapAppointment(item) {
  const patientName = item?.patientName || 'Patient';
  const clinicName = item?.clinicName || 'Clinic';
  const patientPhone = item?.contactPhone || '';
  const consultationFee = Number(item?.consultationFee ?? item?.ConsultationFee ?? 0);
  return {
    id: item?.id,
    patient: localizedText(patientName, patientName),
    patientId: item?.patientUserId || patientName,
    patientPhone,
    age: null,
    time: toTime(item?.scheduledAt),
    date: toDateKey(item?.scheduledAt),
    status: normalizeAppointmentStatus(item?.status),
    reason: localizedText(item?.reason || 'Consultation', item?.reason || 'Consultation'),
    price: Number.isFinite(consultationFee) ? consultationFee : 0,
    clinic: localizedText(clinicName, clinicName),
    notes: item?.notes,
    scheduledAt: item?.scheduledAt,
    createdAt: toDateKey(item?.createdAt),
    raw: item,
  };
}

export function mapPrescription(item) {
  const patientUserId = item.patientUserId || item.PatientUserId;
  const appointmentId = item.appointmentId ?? item.AppointmentId ?? null;
  const appointment = item.appointment || item.Appointment || null;
  const appointmentPatientName = appointment?.contactName || appointment?.ContactName || '';
  return {
    id: item.prescriptionNumber || `RX-${item.id}`,
    rawId: item.id,
    appointmentId,
    appointment: appointment
      ? {
          id: appointment.id ?? appointment.Id ?? appointmentId,
          patientName: appointmentPatientName,
          patientPhone: appointment.contactPhone || appointment.ContactPhone || '',
          scheduledAt: appointment.scheduledAt || appointment.ScheduledAt || null,
          status: appointment.status || appointment.Status || '',
          reason: appointment.reason || appointment.Reason || '',
          clinicName: appointment.clinicName || appointment.ClinicName || '',
        }
      : null,
    status: item.status || item.Status || 'New',
    pharmacyId: item.pharmacyId ?? item.PharmacyId ?? null,
    patient: localizedText(item.patientName || appointmentPatientName || '', item.patientName || appointmentPatientName || ''),
    patientId: patientUserId || item.patientName,
    date: item.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    diagnosis: localizedText(item.diagnosis || '', item.diagnosis || ''),
    notes: localizedText(item.notes || '', item.notes || ''),
    items: Array.isArray(item.items)
      ? item.items.map((rxItem) => ({
          name: localizedText(rxItem.medicineName || '', rxItem.medicineName || ''),
          medicineId: rxItem.medicineId ?? rxItem.MedicineId ?? null,
          dose: localizedText(rxItem.dosage || '', rxItem.dosage || ''),
          frequency: localizedText(rxItem.instructions || '', rxItem.instructions || ''),
          quantity: rxItem.quantity || 1,
        }))
      : [],
    raw: item,
  };
}

export function mapReview(item, nameKey = 'patient') {
  const reviewer = item?.reviewerName || (nameKey === 'customer' ? 'Customer' : 'Patient');
  return {
    id: item?.id,
    [nameKey]: localizedText(reviewer, reviewer),
    rating: Number(item?.rating || 0),
    date: toDateKey(item?.createdAt),
    comment: localizedText(item?.comment || '', item?.comment || ''),
    reply: item?.reply,
    replyCreatedAt: item?.replyCreatedAt ? toDateKey(item.replyCreatedAt) : null,
  };
}

const dayIdByDotNetDay = {
  0: 'sun',
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
  6: 'sat',
};

export function clinicWorkingDays(workingHours = []) {
  return workingHours
    .filter((hour) => !hour?.isClosed)
    .map((hour) => dayIdByDotNetDay[Number(hour.dayOfWeek)])
    .filter(Boolean);
}

export function dayIdForDate(date = new Date()) {
  return dayIdByDotNetDay[date.getDay()];
}

export function isClinicAvailableToday(item, date = new Date()) {
  const today = dayIdForDate(date);
  return clinicWorkingDays(item?.workingHours).includes(today);
}

export function clinicWorkingHoursLabel(workingHours = []) {
  const active = workingHours.find((hour) => !hour?.isClosed && (hour.openFrom || hour.openTo));
  if (!active) return PLACEHOLDER;
  const from = toTime(active.openFrom);
  const to = toTime(active.openTo);
  const value = [from, to].filter(Boolean).join(' - ') || '-';
  return localizedText(value, value);
}

export function mapClinic(item, index = 0) {
  const name = item?.nameAr || item?.nameEn || `Clinic ${index + 1}`;
  const city = item?.cityAr || item?.cityEn || '';
  const governorate = item?.governorateAr || item?.governorateEn || '';
  const addressParts = [item?.addressLine, city, governorate].filter(Boolean);
  const days = clinicWorkingDays(item?.workingHours);
  const availableToday = isClinicAvailableToday(item);
  return {
    id: item?.clinicId,
    name: localizedText(name, item?.nameEn || name),
    type: index === 0 ? localizedText('العيادة الرئيسية', 'Main clinic') : localizedText('فرع', 'Branch'),
    address: localizedText(addressParts.join('، ') || '-', addressParts.join(', ') || '-'),
    phone: item?.phone || '',
    addressLine: item?.addressLine || '',
    governorateAr: item?.governorateAr || '',
    governorateEn: item?.governorateEn || '',
    cityAr: item?.cityAr || '',
    cityEn: item?.cityEn || '',
    latitude: item?.latitude ?? null,
    longitude: item?.longitude ?? null,
    distanceKm: item?.distanceKm ?? null,
    days,
    availableToday,
    workingHours: clinicWorkingHoursLabel(item?.workingHours),
    fee: item?.consultationFee ?? 0,
    reconsultationFee: item?.reconsultationFee ?? 0,
    status: availableToday ? 'available' : 'unavailable',
    raw: item,
  };
}

export function mapDoctorProfile(profile, stats) {
  const primaryClinic = profile?.clinics?.[0];
  const fullName = profile?.fullName || 'Doctor';
  const specialty = profile?.specialtyNameAr || profile?.specialtyNameEn || '';
  const location = [primaryClinic?.cityAr || primaryClinic?.cityEn, primaryClinic?.governorateAr || primaryClinic?.governorateEn]
    .filter(Boolean)
    .join('، ');
  const workingDays = clinicWorkingDays(primaryClinic?.workingHours);
  const workingHours = primaryClinic?.workingHours?.find((hour) => !hour?.isClosed && (hour.openFrom || hour.openTo));

  const languages = String(profile?.languages || '')
    .split(/[،,·]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => localizedText(item, item));

  return {
    id: profile?.doctorId,
    name: localizedText(fullName, fullName),
    title: localizedText(specialty || '-', profile?.specialtyNameEn || specialty || '-'),
    email: profile?.email || '',
    phone: profile?.phone || '',
    location: localizedText(location || '-', location || '-'),
    hospital: localizedText(primaryClinic?.nameAr || '-', primaryClinic?.nameEn || primaryClinic?.nameAr || '-'),
    department: localizedText(specialty || '-', profile?.specialtyNameEn || specialty || '-'),
    license: profile?.licenseNumber || '',
    experienceYears: Number(profile?.experienceYears || 0),
    consultationPrice: primaryClinic?.consultationFee ?? 0,
    rating: Number(profile?.avgRating || stats?.avgRating || 0),
    reviewCount: Number(profile?.reviewsCount || stats?.reviewsCount || 0),
    totalPatients: Number(stats?.uniquePatientsCount ?? stats?.appointmentsCount ?? 0),
    bio: localizedText(profile?.bio || '', profile?.bio || ''),
    specialties: specialty ? [localizedText(specialty, profile?.specialtyNameEn || specialty)] : [],
    languages,
    education: [],
    workingHours: {
      from: toTime(workingHours?.openFrom) || '-',
      to: toTime(workingHours?.openTo) || '-',
    },
    workingDays,
    avatar: resolveImageUrl(profile?.profileImageUrl, fullName),
    raw: profile,
  };
}

export function mapPatientFromAppointments(appointments = []) {
  const patients = new Map();
  const todayKey = offsetDateKey(0);
  const monthKey = todayKey.slice(0, 7);
  appointments.forEach((appointment) => {
    const patientId = appointment.patientId || appointment.patient;
    const existing = patients.get(patientId);
    const isVisit = appointment.status === 'completed';
    const lastVisit = isVisit && (!existing?.lastVisit || appointment.date > existing.lastVisit)
      ? appointment.date
      : existing?.lastVisit;
    const firstSeen = !existing?.firstSeen || appointment.date < existing.firstSeen
      ? appointment.date
      : existing.firstSeen;
    const cancelledVisits = (existing?.cancelledVisits || 0) + (appointment.status === 'cancelled' ? 1 : 0);
    const completedVisits = (existing?.completedVisits || 0) + (isVisit ? 1 : 0);
    const status = firstSeen.startsWith(monthKey) ? 'new' : 'active';

    patients.set(patientId, {
      id: patientId,
      name: appointment.patient,
      age: null,
      gender: PLACEHOLDER,
      phone: appointment.patientPhone || existing?.phone || '',
      lastVisit: lastVisit || '',
      firstSeen,
      visits: completedVisits,
      appointmentsCount: (existing?.appointmentsCount || 0) + 1,
      completedVisits,
      cancelledVisits,
      status,
      tag: appointment.reason,
      bloodType: '-',
    });
  });
  return Array.from(patients.values());
}

export function mapPharmacyProfile(profile, stats) {
  const name = profile?.pharmacyName || 'Pharmacy';
  const city = profile?.cityAr || profile?.cityEn || '';
  const governorate = profile?.governorateAr || profile?.governorateEn || '';
  const address = [profile?.addressLine, city, governorate].filter(Boolean).join('، ');
  // BUG-15 FIX: extract owner from profile fields
  const ownerName = profile?.ownerName || profile?.owner || profile?.contactName || '';
  return {
    id: profile?.pharmacyId,
    name: localizedText(name, name),
    // BUG-15 FIX: use real owner name instead of PLACEHOLDER
    owner: ownerName ? localizedText(ownerName, ownerName) : PLACEHOLDER,
    // BUG-16 FIX: extract email and license from profile
    email: profile?.email || profile?.contactEmail || '',
    phone: profile?.phone || '',
    address: localizedText(address || '-', address || '-'),
    city: localizedText(city || governorate || '-', profile?.cityEn || profile?.governorateEn || city || governorate || '-'),
    // BUG-16 FIX: extract license from profile
    license: profile?.licenseNumber || profile?.license || '',
    workingHours: {
      from: profile?.is24Hours ? '24h' : toTime(profile?.openFrom) || '-',
      to: profile?.is24Hours ? '24h' : toTime(profile?.openTo) || '-',
    },
    open24: Boolean(profile?.is24Hours),
    isOpen: profile?.status === 'open',
    status: profile?.status || 'open',
    rating: Number(profile?.avgRating || stats?.avgRating || 0),
    reviewCount: Number(profile?.reviewsCount || stats?.reviewsCount || 0),
    totalOrders: Number(stats?.ordersCount ?? stats?.totalOrders ?? 0),
    logo: resolveImageUrl(profile?.profileImageUrl, name),
    raw: profile,
  };
}

export function mapPharmacyMedicine(item) {
  const quantity = item?.quantity ?? 0;
  const name = item?.name || 'Medicine';
  const category = item?.category || [item?.form, item?.strength].filter(Boolean).join(' ') || item?.activeIngredient || '-';
  return {
    id: item?.medicineId,
    name: localizedText(name, name),
    company: item?.company || item?.manufacturer || item?.activeIngredient || '-',
    category: localizedText(category, category),
    price: item?.price ?? 0,
    cost: item?.costPrice ?? item?.purchasePrice ?? item?.wholesalePrice ?? null,
    stock: item?.isAvailable ? quantity : 0,
    // BUG-14 FIX: use reorderLevel from API, not hardcoded 5
    reorder: item?.reorderLevel ?? item?.minStock ?? item?.minimumStock ?? 5,
    expiry: item?.expiryDate ? toDateKey(item.expiryDate) : '',
    batchNumber: item?.batchNumber || '-',
    batches: item?.batches || [],
    imageUrl: item?.imageUrl,
    raw: item,
  };
}
