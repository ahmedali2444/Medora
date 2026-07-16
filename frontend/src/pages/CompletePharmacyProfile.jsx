import { useEffect, useRef, useState } from "react";
import Logo from "../assets/images/Logo.png";
import { useNavigate } from "react-router-dom";
import { ChevronDown, MapPin, Upload, X } from "lucide-react";
import { useLang } from "../context/LanguageContext";
import { medoraApi } from "../api/medoraApi";
import MapPicker from "../components/location/MapPicker";
import { isValidLatLng } from "../utils/locationUtils";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const toApiTime = (value) => {
  if (!value) return null;
  return /^\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
};

export default function CompletePharmacyProfile() {
  const navigate = useNavigate();
  const { t } = useLang();
  const isRtl = t.dir === "rtl";
  const fileInputRef = useRef();
  const licenseInputRef = useRef();
  const pharmacistCardInputRef = useRef();

  const [form, setForm] = useState({
    name: "", license: "", governorate: "", city: "",
    phone: "", address: "", bio: "",
    open24: null,
    openFrom: "09:00", openTo: "22:00",
    latitude: "", longitude: "",
    photo: null, licenseImage: null, pharmacistIdCard: null,
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [documentPreviews, setDocumentPreviews] = useState({ licenseImage: null, pharmacistIdCard: null });
  const [lookups, setLookups] = useState({ governorates: [], cities: [] });
  const [lookupError, setLookupError] = useState("");
  const [ui, setUi] = useState({ loading: false, error: "" });
  const [errors, setErrors] = useState({});
  const [mapOpen, setMapOpen] = useState(false);
  const hasValidLocation = isValidLatLng(form.latitude, form.longitude);
  const lookupUnavailableMessage = isRtl
    ? "تعذر تحميل بيانات المحافظات والمدن من المنصة. حاول مرة أخرى لاحقاً."
    : "Unable to load governorates and cities from the platform. Please try again later.";

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: "" }));
  };

  const setGovernorate = (gov) => {
    setForm((p) => ({ ...p, governorate: gov, city: "" }));
    setErrors((p) => ({ ...p, governorate: "", city: "" }));
  };

  useEffect(() => {
    let mounted = true;
    medoraApi.governorates()
      .then((data) => {
        if (!mounted) return;
        const items = Array.isArray(data) ? data : [];
        setLookups((p) => ({ ...p, governorates: items }));
        setLookupError(items.length ? "" : lookupUnavailableMessage);
      })
      .catch(() => {
        if (!mounted) return;
        setLookups((p) => ({ ...p, governorates: [], cities: [] }));
        setLookupError(lookupUnavailableMessage);
      });
    return () => { mounted = false; };
  }, [lookupUnavailableMessage]);

  useEffect(() => {
    const governorateId = typeof form.governorate === "object" ? form.governorate?.id : null;
    if (!governorateId) {
      queueMicrotask(() => setLookups((p) => ({ ...p, cities: [] })));
      return;
    }

    let mounted = true;
    medoraApi.cities(governorateId)
      .then((data) => {
        if (!mounted) return;
        const items = Array.isArray(data) ? data : [];
        setLookups((p) => ({ ...p, cities: items }));
        setLookupError(items.length ? "" : lookupUnavailableMessage);
      })
      .catch(() => {
        if (!mounted) return;
        setLookups((p) => ({ ...p, cities: [] }));
        setLookupError(lookupUnavailableMessage);
      });
    return () => { mounted = false; };
  }, [form.governorate, lookupUnavailableMessage]);

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      e.target.value = "";
      setErrors((p) => ({ ...p, photo: isRtl ? "حجم الصورة يجب ألا يتجاوز 5MB" : "Image size must not exceed 5MB" }));
      return;
    }

    setErrors((p) => ({ ...p, photo: "" }));
    set("photo", file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    set("photo", null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDocument = (field, e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      e.target.value = "";
      setErrors((p) => ({ ...p, [field]: isRtl ? "حجم الصورة يجب ألا يتجاوز 5MB" : "Image size must not exceed 5MB" }));
      return;
    }

    setErrors((p) => ({ ...p, [field]: "" }));
    set(field, file);
    const reader = new FileReader();
    reader.onloadend = () => setDocumentPreviews((p) => ({ ...p, [field]: reader.result }));
    reader.readAsDataURL(file);
  };

  const removeDocument = (field, inputRef) => {
    set(field, null);
    setDocumentPreviews((p) => ({ ...p, [field]: null }));
    if (inputRef.current) inputRef.current.value = "";
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = t.ph_err_name;
    if (!form.license.trim()) e.license = t.ph_err_license;
    if (!lookups.governorates.length) e.governorate = lookupUnavailableMessage;
    else if (!form.governorate) e.governorate = t.ph_err_governorate;
    if (form.governorate && !lookups.cities.length) e.city = lookupUnavailableMessage;
    else if (!form.city) e.city = t.ph_err_city;
    if (!form.phone.trim()) e.phone = t.ph_err_phone;
    if (!form.address.trim()) e.address = t.ph_err_address;
    if (!hasValidLocation) e.location = isRtl ? "حدد موقع الصيدلية على الخريطة" : "Pick the pharmacy location on the map";
    if (!form.licenseImage) e.licenseImage = isRtl ? "صورة ترخيص الصيدلية مطلوبة" : "Pharmacy license image is required";
    if (!form.pharmacistIdCard) e.pharmacistIdCard = isRtl ? "صورة بطاقة الصيدلي مطلوبة" : "Pharmacist ID card image is required";
    return e;
  };

  const optionLabel = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    return (isRtl ? value.nameAr : value.nameEn) || value.nameAr || value.nameEn || "";
  };

  const handleSave = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setUi({ loading: true, error: "" });
    try {
      const uploads = await Promise.all([
        form.photo ? medoraApi.uploadImage(form.photo) : Promise.resolve(null),
        form.licenseImage ? medoraApi.uploadImage(form.licenseImage, "verification") : Promise.resolve(null),
        form.pharmacistIdCard ? medoraApi.uploadImage(form.pharmacistIdCard, "verification") : Promise.resolve(null),
      ]);
      const [photoUpload, licenseUpload, pharmacistIdUpload] = uploads;

      await medoraApi.setupPharmacy({
        pharmacyName: form.name,
        licenseNumber: form.license,
        bio: form.bio || null,
        governorate: optionLabel(form.governorate),
        city: optionLabel(form.city),
        addressLine: form.address,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        phone: form.phone,
        profileImageUrl: photoUpload?.url || null,
        openFrom: form.open24 === true ? null : toApiTime(form.openFrom),
        openTo: form.open24 === true ? null : toApiTime(form.openTo),
        is24Hours: form.open24 === true,
      });
      await medoraApi.verifyPharmacy({
        licenseImageUrl: licenseUpload?.url,
        pharmacistIdCardUrl: pharmacistIdUpload?.url,
      });
      navigate("/pharmacy/overview", { replace: true });
    } catch (error) {
      setUi({ loading: false, error: error.message || "Unable to save pharmacy profile" });
    }
  };

  const governorates = lookups.governorates;
  const cities = lookups.cities;
  const textAlign = isRtl ? "text-right" : "text-left";

  return (
    <div dir={t.dir} className="min-h-screen bg-gradient-to-b from-[#eef7f7] via-[#f6fbfb] to-white">
      <div className="mx-auto max-w-3xl px-4 py-8">

        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2">
            <img src={Logo} alt="Medora" className="h-10 w-10 object-contain" />
            <div className="text-2xl font-extrabold text-[#0ea5a5]">{t.brand}</div>
          </div>
          <h1 className="mt-2 text-xl sm:text-2xl font-extrabold text-slate-900">{t.ph_title}</h1>
          <p className="mt-1 text-sm text-slate-600">{t.ph_sub}</p>
        </div>

        <div className="rounded-2xl bg-white shadow-xl border border-slate-100 p-5 sm:p-8 space-y-5">
          {lookupError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
              {lookupError}
            </div>
          )}

          <div className="flex flex-col items-center gap-2">
            <label className={`text-sm font-semibold text-slate-700 ${textAlign} w-full`}>
              {t.ph_photo} <span className="text-slate-400 font-normal text-xs">{t.ph_optional}</span>
            </label>
            {photoPreview ? (
              <div className="relative w-full max-w-sm rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                <img src={photoPreview} alt="Preview" className="w-full h-40 object-cover" />
                <button type="button" onClick={removePhoto}
                  className="absolute top-2 left-2 h-7 w-7 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition shadow">
                  <X className="h-3.5 w-3.5" />
                </button>
                <div className="absolute bottom-2 right-2 bg-[#0da694] text-white text-[10px] px-2 py-0.5 rounded-full font-medium">✓ {t.ph_upload_photo}</div>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-sm h-32 rounded-xl border-2 border-dashed border-[#0da694] bg-[#0da694]/5 flex flex-col items-center justify-center gap-2 hover:bg-[#0da694]/10 transition cursor-pointer">
                <Upload className="h-6 w-6 text-[#0da694]" />
                <span className="text-sm font-medium text-[#0da694]">{t.ph_upload_photo}</span>
                <span className="text-[11px] text-slate-400">PNG, JPG max 5MB</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
            {errors.photo && <p className="text-red-500 text-xs mt-1">{errors.photo}</p>}
          </div>

          <div className="border-t border-slate-100" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t.ph_name} value={form.name} onChange={(v) => set("name", v)} error={errors.name} textAlign={textAlign} required />
            <Field label={t.ph_license} value={form.license} onChange={(v) => set("license", v)} error={errors.license} textAlign={textAlign} required dir="ltr" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Dropdown
              label={t.ph_governorate} placeholder={t.ph_governorate_ph}
              value={form.governorate} options={governorates}
              onChange={setGovernorate} error={errors.governorate}
              isRtl={isRtl} textAlign={textAlign} required
              disabled={!governorates.length}
            />
            <Dropdown
              label={t.ph_city} placeholder={form.governorate ? t.ph_city_ph : (isRtl ? "اختر المحافظة أولاً" : "Select governorate first")}
              value={form.city} options={cities}
              onChange={(v) => set("city", v)} error={errors.city}
              isRtl={isRtl} textAlign={textAlign} required
              disabled={!form.governorate}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t.ph_phone} value={form.phone} onChange={(v) => set("phone", v)} error={errors.phone} textAlign={textAlign} required type="tel" dir="ltr" />
            <Field label={t.ph_address} value={form.address} onChange={(v) => set("address", v)} error={errors.address} textAlign={textAlign} required />
          </div>

          <div className="rounded-2xl border border-[#d7e7e5] bg-[#f7fbfb] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className={`${textAlign}`}>
                <div className="flex items-center gap-2 text-sm font-extrabold text-[#084036]">
                  <MapPin size={16} className="text-[#14b8a6]" />
                  {isRtl ? "موقع الصيدلية على الخريطة" : "Pharmacy map location"}
                  <span className="text-red-500">*</span>
                </div>
                <div className="mt-1 font-mono text-[11px] text-slate-500" dir="ltr">
                  {hasValidLocation ? `${Number(form.latitude).toFixed(6)}, ${Number(form.longitude).toFixed(6)}` : (isRtl ? "لم يتم تحديد الموقع بعد" : "No location selected yet")}
                </div>
                {errors.location && <p className="mt-1 text-xs font-semibold text-red-500">{errors.location}</p>}
              </div>
              <button
                type="button"
                onClick={() => setMapOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-[#14b8a6] px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#119a8a]"
              >
                <MapPin size={14} />
                {isRtl ? "تحديد الموقع" : "Pick location"}
              </button>
            </div>
          </div>

          <div>
            <label className={`block ${textAlign} text-sm font-semibold text-slate-700`}>{t.ph_bio}</label>
            <textarea value={form.bio} onChange={(e) => set("bio", e.target.value)}
              placeholder={t.ph_bio_ph} rows={3}
              className={`mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 ${textAlign} text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#14b8a6] resize-none transition`} />
          </div>

          <div className="border-t border-slate-100" />

          <div>
            <p className={`text-sm font-semibold text-slate-700 ${textAlign}`}>{t.ph_open24}</p>
            <div className="mt-3 flex gap-3">
              <button type="button" onClick={() => set("open24", true)}
                className={`flex-1 h-11 rounded-xl border-2 font-bold text-sm transition ${form.open24 === true ? "border-[#0da694] bg-[#0da694]/10 text-[#0da694]" : "border-slate-200 text-slate-600 hover:border-[#0da694]/50"}`}>
                {t.ph_yes}
              </button>
              <button type="button" onClick={() => set("open24", false)}
                className={`flex-1 h-11 rounded-xl border-2 font-bold text-sm transition ${form.open24 === false ? "border-red-400 bg-red-50 text-red-500" : "border-slate-200 text-slate-600 hover:border-red-300"}`}>
                {t.ph_no}
              </button>
            </div>

            {form.open24 === false && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block ${textAlign} text-xs font-semibold text-slate-700 mb-1.5`}>{t.ph_open_from}</label>
                  <input type="time" value={form.openFrom}
                    onChange={(e) => set("openFrom", e.target.value)}
                    className="mt-1 w-full h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-[#14b8a6] transition text-center" />
                </div>
                <div>
                  <label className={`block ${textAlign} text-xs font-semibold text-slate-700 mb-1.5`}>{t.ph_open_to}</label>
                  <input type="time" value={form.openTo}
                    onChange={(e) => set("openTo", e.target.value)}
                    className="mt-1 w-full h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-[#14b8a6] transition text-center" />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DocumentUpload
              label={isRtl ? "صورة ترخيص الصيدلية" : "Pharmacy license image"}
              preview={documentPreviews.licenseImage}
              error={errors.licenseImage}
              inputRef={licenseInputRef}
              onUploadClick={() => licenseInputRef.current?.click()}
              onChange={(e) => handleDocument("licenseImage", e)}
              onRemove={() => removeDocument("licenseImage", licenseInputRef)}
              uploadText={t.ph_upload_photo}
            />
            <DocumentUpload
              label={isRtl ? "صورة بطاقة الصيدلي" : "Pharmacist ID card image"}
              preview={documentPreviews.pharmacistIdCard}
              error={errors.pharmacistIdCard}
              inputRef={pharmacistCardInputRef}
              onUploadClick={() => pharmacistCardInputRef.current?.click()}
              onChange={(e) => handleDocument("pharmacistIdCard", e)}
              onRemove={() => removeDocument("pharmacistIdCard", pharmacistCardInputRef)}
              uploadText={t.ph_upload_photo}
            />
          </div>

          {ui.error && <div className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{ui.error}</div>}

          <button type="button" onClick={handleSave} disabled={ui.loading}
            className="w-full h-12 rounded-xl bg-[#0da694] text-white text-base font-extrabold hover:brightness-95 active:scale-[0.99] transition shadow-md shadow-[#0da694]/20">
            {ui.loading ? "..." : t.ph_save}
          </button>
        </div>
        <MapPicker
          open={mapOpen}
          isRtl={isRtl}
          storageKey="pharmacy-profile-location"
          value={hasValidLocation ? { lat: Number(form.latitude), lng: Number(form.longitude) } : null}
          title={isRtl ? "حدد موقع الصيدلية" : "Pick pharmacy location"}
          onClose={() => setMapOpen(false)}
          onConfirm={(location) => {
            set("latitude", location.lat);
            set("longitude", location.lng);
            if (!form.address.trim() && location.address) set("address", location.address);
            setMapOpen(false);
          }}
        />
      </div>
    </div>
  );
}

function Field({ label, value, onChange, error, textAlign, required, type = "text", dir }) {
  return (
    <div>
      <label className={`block ${textAlign} text-sm font-semibold text-slate-700`}>
        {label}{required && <span className="text-red-500 mx-1">*</span>}
      </label>
      <input type={type} dir={dir} value={value} onChange={(e) => onChange(e.target.value)}
        className={`mt-2 w-full h-11 rounded-xl border px-4 ${textAlign} text-sm text-[16px] sm:text-sm outline-none focus:ring-2 focus:ring-[#14b8a6] transition ${error ? "border-red-500" : "border-slate-200"}`} />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

function Dropdown({ label, value, onChange, options, error, placeholder, isRtl, textAlign, required, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const optionKey = (option) => typeof option === "object" ? option.id : option;
  const optionLabel = (option) => {
    if (!option) return "";
    if (typeof option === "string") return option;
    return (isRtl ? option.nameAr : option.nameEn) || option.nameAr || option.nameEn || "";
  };
  const selectedLabel = optionLabel(value);
  const isSelected = (option) => optionKey(option) === optionKey(value);

  useEffect(() => {
    const onDocDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <label className={`block ${textAlign} text-sm font-semibold text-slate-700`}>
        {label}{required && <span className="text-red-500 mx-1">*</span>}
      </label>
      <button type="button" disabled={disabled} onClick={() => !disabled && setOpen((p) => !p)}
        className={`relative mt-2 w-full h-11 rounded-xl border px-4 ${isRtl ? "pl-10" : "pr-10"} ${textAlign} bg-white text-sm outline-none focus:ring-2 focus:ring-[#14b8a6] transition
          ${error ? "border-red-500" : "border-slate-200"}
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
        <ChevronDown className={`absolute ${isRtl ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        <span className={`block w-full truncate ${selectedLabel ? "text-slate-900" : "text-slate-400"}`}>{selectedLabel || placeholder}</span>
      </button>
      {open && !disabled && (
        <div className="absolute top-full mt-1.5 w-full rounded-xl border border-slate-200 bg-white shadow-lg z-50 max-h-52 overflow-y-auto">
          {options.map((opt) => (
            <div key={optionKey(opt)} onClick={() => { onChange(opt); setOpen(false); }}
              className={`px-4 py-2.5 ${textAlign} text-sm cursor-pointer hover:bg-[#0da694]/10 hover:text-[#0da694] transition ${isSelected(opt) ? "bg-[#0da694]/10 text-[#0da694] font-semibold" : "text-slate-700"}`}>
              {optionLabel(opt)}
            </div>
          ))}
        </div>
      )}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

function DocumentUpload({ label, preview, error, inputRef, onUploadClick, onChange, onRemove, uploadText }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700">
        {label}<span className="text-red-500 mx-1">*</span>
      </label>
      {preview ? (
        <div className="relative mt-2 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
          <img src={preview} alt="Preview" className="w-full h-32 object-cover" />
          <button type="button" onClick={onRemove}
            className="absolute top-2 left-2 h-7 w-7 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition shadow">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button type="button" onClick={onUploadClick}
          className={`mt-2 w-full h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition ${error ? "border-red-400 bg-red-50" : "border-[#0da694] bg-[#0da694]/5 hover:bg-[#0da694]/10"}`}>
          <Upload className={`h-6 w-6 ${error ? "text-red-400" : "text-[#0da694]"}`} />
          <span className={`text-sm font-medium ${error ? "text-red-400" : "text-[#0da694]"}`}>{uploadText}</span>
          <span className="text-[11px] text-slate-400">PNG, JPG max 5MB</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={onChange} className="hidden" />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
