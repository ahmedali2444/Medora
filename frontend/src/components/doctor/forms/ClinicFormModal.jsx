import React, { useState, useEffect } from 'react';
import { MapPin, X } from 'lucide-react';
import { medoraApi } from '../../../api/medoraApi';
import { useLocalizedContent } from '../../../hooks/useLocalizedContent';
import { getLocalizedText, localizedText } from '../../../utils/localization';
import { isValidLatLng } from '../../../utils/locationUtils';
import WorkingHoursSelector from './WorkingHoursSelector';
import MapPicker from '../../location/MapPicker';

const EMPTY_FORM = {
  nameAr: '',
  nameEn: '',
  addressLine: '',
  phone: '',
  consultationFee: 0,
  reconsultationFee: 0,
  governorateAr: '',
  governorateEn: '',
  cityAr: '',
  cityEn: '',
  latitude: '',
  longitude: '',
  workingHours: [],
  appointmentDurationMinutes: 15,
};

export default function ClinicFormModal({ clinic, onClose, onSuccess }) {
  const { lang, text } = useLocalizedContent();
  const [form, setForm] = useState(EMPTY_FORM);
  const [ui, setUi] = useState({ loading: false, error: '' });
  const [lookups, setLookups] = useState({ governorates: [], cities: [] });
  const [mapOpen, setMapOpen] = useState(false);

  useEffect(() => {
    let active = true;
    medoraApi.governorates().then((res) => {
      if (active && res) setLookups(p => ({ ...p, governorates: res.items || res }));
    }).catch(console.error);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const gov = lookups.governorates.find(g => g.nameEn === form.governorateEn || g.nameAr === form.governorateAr);
    if (gov && gov.id) {
      medoraApi.cities(gov.id).then((res) => {
        if (active && res) setLookups(p => ({ ...p, cities: res.items || res }));
      }).catch(console.error);
    } else {
      queueMicrotask(() => {
        if (active) setLookups(p => ({ ...p, cities: [] }));
      });
    }
    return () => { active = false; };
  }, [form.governorateEn, form.governorateAr, lookups.governorates]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      if (!clinic) {
        setForm(EMPTY_FORM);
        return;
      }

      const raw = clinic.raw || {};
      setForm({
        nameAr: raw.nameAr || getLocalizedText(clinic.nameAr, lang, ''),
        nameEn: raw.nameEn || getLocalizedText(clinic.nameEn, lang, ''),
        addressLine: raw.addressLine || '',
        phone: raw.phone || clinic.phone || '',
        consultationFee: raw.consultationFee ?? clinic.fee ?? 0,
        reconsultationFee: raw.reconsultationFee ?? clinic.reconsultationFee ?? 0,
        governorateAr: raw.governorateAr || '',
        governorateEn: raw.governorateEn || '',
        cityAr: raw.cityAr || '',
        cityEn: raw.cityEn || '',
        latitude: raw.latitude ?? '',
        longitude: raw.longitude ?? '',
        workingHours: raw.workingHours || clinic.workingHours || [],
        appointmentDurationMinutes: raw.appointmentDurationMinutes ?? clinic.appointmentDurationMinutes ?? 15,
      });
    });

    return () => { active = false; };
  }, [clinic, lang]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'governorate') {
      const gov = lookups.governorates.find(g => g.id.toString() === value.toString());
      setForm(f => ({ ...f, governorateAr: gov?.nameAr || '', governorateEn: gov?.nameEn || '', cityAr: '', cityEn: '' }));
    } else if (name === 'city') {
      const city = lookups.cities.find(c => c.id.toString() === value.toString());
      setForm(f => ({ ...f, cityAr: city?.nameAr || '', cityEn: city?.nameEn || '' }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const fieldClass = 'medora-field';
  const labelClass = 'medora-label';
  const labelTextClass = 'medora-label-text';
  const hasValidLocation = isValidLatLng(form.latitude, form.longitude);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasValidLocation) {
      setUi({ loading: false, error: text(localizedText('حدد موقع العيادة على الخريطة أولاً.', 'Pick the clinic location on the map first.')) });
      return;
    }
    setUi({ loading: true, error: '' });
    try {
      const payload = {
        nameAr: form.nameAr,
        nameEn: form.nameEn,
        addressLine: form.addressLine,
        phone: form.phone,
        consultationFee: Number(form.consultationFee),
        reconsultationFee: Number(form.reconsultationFee),
        governorate: form.governorateEn || form.governorateAr,
        city: form.cityEn || form.cityAr,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        appointmentDurationMinutes: Number(form.appointmentDurationMinutes) || 15,
      };
      if (!clinic) {
        payload.workingHours = form.workingHours;
      } else {
        payload.workingHours = form.workingHours;
      }

      if (clinic) {
        await medoraApi.updateDoctorClinic(clinic.id, payload);
      } else {
        await medoraApi.createDoctorClinic(payload);
      }
      onSuccess();
    } catch (error) {
      setUi({ loading: false, error: error.message || 'Unable to save clinic' });
    }
  };

  return (
    <div className="medora-modal-overlay">
      <div
        className="medora-modal-panel medora-modal-panel--md"
        role="dialog"
        aria-modal="true"
      >
        <div className="medora-modal-header">
          <div className="flex items-start justify-between gap-4">
            <div className="text-start">
              <div className="text-[15px] font-black text-[#084036]">
                {clinic ? text(localizedText('تعديل عيادة', 'Edit Clinic')) : text(localizedText('إضافة عيادة', 'Add Clinic'))}
              </div>
              <div className="mt-1 text-[11px] font-semibold text-[#6b8385]">
                {text(localizedText('أدخل بيانات العيادة ومواعيد العمل.', 'Enter clinic details and working hours.'))}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d7e7e5] bg-white text-[#486466] transition hover:border-[#14b8a6] hover:text-[#119a8a]"
              aria-label={text(localizedText('إغلاق', 'Close'))}
            >
              <X size={15} />
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="medora-modal-body">
          {ui.error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600">{ui.error}</div>}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              <span className={labelTextClass}>{text(localizedText('اسم العيادة (عربي)', 'Clinic Name (AR)'))}</span>
              <input required name="nameAr" value={form.nameAr} onChange={handleChange} className={fieldClass} />
            </label>
            <label className={labelClass}>
              <span className={labelTextClass}>{text(localizedText('اسم العيادة (إنجليزي)', 'Clinic Name (EN)'))}</span>
              <input required name="nameEn" value={form.nameEn} onChange={handleChange} dir="ltr" className={fieldClass} />
            </label>
            <label className={labelClass}>
              <span className={labelTextClass}>{text(localizedText('رقم العيادة', 'Clinic Phone'))}</span>
              <input required name="phone" value={form.phone} onChange={handleChange} dir="ltr" className={fieldClass} />
            </label>
            <label className={labelClass}>
              <span className={labelTextClass}>{text(localizedText('رسوم الكشف', 'Consultation Fee'))}</span>
              <input required type="number" step="50" min="0" name="consultationFee" value={form.consultationFee} onChange={handleChange} className={fieldClass} />
            </label>
            <label className={labelClass}>
              <span className={labelTextClass}>{text(localizedText('رسوم إعادة الكشف', 'Re-consultation Fee'))}</span>
              <input required type="number" step="50" min="0" name="reconsultationFee" value={form.reconsultationFee} onChange={handleChange} className={fieldClass} />
            </label>
            <label className={labelClass}>
              <span className={labelTextClass}>{text(localizedText('مدة الكشف (دقيقة)', 'Appointment Duration (min)'))}</span>
              <select
                name="appointmentDurationMinutes"
                value={form.appointmentDurationMinutes}
                onChange={handleChange}
                className={fieldClass}
              >
                {[15, 20, 30, 45, 60].map((min) => (
                  <option key={min} value={min}>
                    {min} {text(localizedText('دقيقة', 'min'))}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              <span className={labelTextClass}>{text(localizedText('المحافظة', 'Governorate'))}</span>
              <select required name="governorate" value={lookups.governorates.find(g => g.nameAr === form.governorateAr || g.nameEn === form.governorateEn)?.id || ''} onChange={handleChange} className={fieldClass}>
                <option value="" disabled>{text(localizedText('اختر المحافظة', 'Select Governorate'))}</option>
                {lookups.governorates.map(g => (
                  <option key={g.id} value={g.id}>{text(localizedText(g.nameAr, g.nameEn || g.nameAr))}</option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              <span className={labelTextClass}>{text(localizedText('المدينة', 'City'))}</span>
              <select name="city" value={lookups.cities.find(c => c.nameAr === form.cityAr || c.nameEn === form.cityEn)?.id || ''} onChange={handleChange} className={fieldClass} disabled={!lookups.cities.length}>
                <option value="" disabled>{text(localizedText('اختر المدينة', 'Select City'))}</option>
                {lookups.cities.map(c => (
                  <option key={c.id} value={c.id}>{text(localizedText(c.nameAr, c.nameEn || c.nameAr))}</option>
                ))}
              </select>
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              <span className={labelTextClass}>{text(localizedText('العنوان تفصيلاً', 'Full Address'))}</span>
              <input required name="addressLine" value={form.addressLine} onChange={handleChange} className={fieldClass} />
            </label>
            <div className="rounded-2xl border border-[#d7e7e5] bg-[#f7fbfb] p-3 sm:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-start">
                  <div className="flex items-center gap-2 text-[12px] font-black text-[#084036]">
                    <MapPin size={15} className="text-[#14b8a6]" />
                    {text(localizedText('موقع العيادة على الخريطة', 'Clinic map location'))}
                    <span className="text-red-500">*</span>
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-slate-500" dir="ltr">
                    {hasValidLocation ? `${Number(form.latitude).toFixed(6)}, ${Number(form.longitude).toFixed(6)}` : text(localizedText('لم يتم تحديد الموقع بعد', 'No location selected yet'))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMapOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#14b8a6] px-3.5 py-2 text-[12px] font-bold text-white transition hover:bg-[#119a8a]"
                >
                  <MapPin size={14} />
                  {text(localizedText('تحديد الموقع', 'Pick location'))}
                </button>
              </div>
            </div>
            <div className="sm:col-span-2">
              <WorkingHoursSelector 
                workingHours={form.workingHours} 
                onChange={(wh) => setForm(f => ({ ...f, workingHours: wh }))} 
              />
            </div>
          </div>
          </div>
          <div className="medora-modal-footer flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-[#d7e7e5] bg-white px-4 py-2.5 text-[12px] font-bold text-[#486466] transition hover:border-[#14b8a6]">
              {text(localizedText('إلغاء', 'Cancel'))}
            </button>
            <button disabled={ui.loading} type="submit" className="rounded-xl bg-[#14b8a6] px-5 py-2.5 text-[12px] font-extrabold text-white transition hover:bg-[#119a8a] disabled:opacity-60">
              {ui.loading ? '...' : text(localizedText('حفظ', 'Save'))}
            </button>
          </div>
        </form>
      </div>
      <MapPicker
        open={mapOpen}
        isRtl={lang === 'ar'}
        storageKey="doctor-clinic-location"
        value={hasValidLocation ? { lat: Number(form.latitude), lng: Number(form.longitude) } : null}
        title={text(localizedText('حدد موقع العيادة', 'Pick clinic location'))}
        onClose={() => setMapOpen(false)}
        onConfirm={(location) => {
          setForm((current) => ({
            ...current,
            latitude: location.lat,
            longitude: location.lng,
            addressLine: current.addressLine || location.address || '',
          }));
          setUi({ loading: false, error: '' });
          setMapOpen(false);
        }}
      />
    </div>
  );
}
