import Logo from "../assets/images/Logo.png";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, X } from "lucide-react";
import { useLang } from "../context/LanguageContext";
import LangToggleBtn from "../components/LangToggleBtn";
import { medoraApi } from "../api/medoraApi";

const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;

export default function CompleteDoctorProfile() {
  const navigate = useNavigate();
  const { t } = useLang();
  const isRtl = t.dir === "rtl";

  const [form, setForm] = useState({ fullName: "", specialty: "", licenseNumber: "", phone: "", bio: "", profileImage: null });
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [specialties, setSpecialties] = useState([]);
  const [ui, setUi] = useState({ loading: false, error: "" });
  const fileInputRef = useRef();
  const specialtiesUnavailableMessage = isRtl
    ? "تعذر تحميل التخصصات من المنصة. حاول مرة أخرى لاحقاً."
    : "Unable to load specialties from the platform. Please try again later.";

  useEffect(() => {
    medoraApi.specialties()
      .then((items) => setSpecialties(
        (Array.isArray(items) ? items : [])
          .map((item) => ({
            id: item.id,
            label: isRtl ? (item.nameAr || item.nameEn) : (item.nameEn || item.nameAr),
          }))
          .filter((s) => s.id && s.label)
      ))
      .catch(() => {
        setSpecialties([]);
        setUi({ loading: false, error: specialtiesUnavailableMessage });
      });
  }, [isRtl, specialtiesUnavailableMessage]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > MAX_PROFILE_IMAGE_BYTES) {
        e.target.value = "";
        setUi({ loading: false, error: isRtl ? "حجم الصورة يجب ألا يتجاوز 5MB" : "Image size must not exceed 5MB" });
        return;
      }

      setUi((current) => ({ ...current, error: "" }));
      setForm({ ...form, profileImage: file });
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setForm({ ...form, profileImage: null });
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.fullName.trim()) newErrors.fullName = t.doc_err_name;
    if (!specialties.length) newErrors.specialty = specialtiesUnavailableMessage;
    else if (!form.specialty.trim()) newErrors.specialty = t.doc_err_specialty;
    if (!form.licenseNumber.trim()) newErrors.licenseNumber = t.doc_err_license;
    if (!form.phone.trim()) newErrors.phone = t.doc_err_phone;
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      setUi({ loading: true, error: "" });
      try {
        let profileImageUrl = null;
        if (form.profileImage) {
          const upload = await medoraApi.uploadImage(form.profileImage);
          profileImageUrl = upload?.url || null;
        }

        await medoraApi.setupDoctor({
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          specialty: form.specialty,
          licenseNumber: form.licenseNumber.trim(),
          bio: form.bio?.trim() || null,
          profileImageUrl,
        });
        navigate("/doctor/verification", { replace: true });
      } catch (error) {
        setUi({ loading: false, error: error.message || "Failed to save profile" });
      }
    }
  };

  const SPECIALTIES = specialties;

  return (
    <div dir={t.dir}
      className="h-screen overflow-hidden bg-gradient-to-b from-[#eef7f7] via-[#f6fbfb] to-white flex items-center justify-center p-3">
      <LangToggleBtn variant="float" />
      <div className="w-full max-w-2xl flex flex-col justify-center">
        <div className="text-center mb-3">
          <div className="flex items-center justify-center gap-2">
            <img src={Logo} alt="Medora" className="h-8 w-8 sm:h-10 sm:w-10" />
            <div className="text-lg sm:text-xl font-extrabold text-[#0ea5a5]">{t.brand}</div>
          </div>
          <h1 className="mt-1.5 text-base sm:text-lg font-extrabold text-slate-900">{t.doc_profile_title}</h1>
          <p className="mt-0.5 text-[10px] sm:text-xs text-slate-600">{t.doc_profile_sub}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-3 sm:p-4 rounded-xl shadow-xl space-y-2.5">
          {ui.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {ui.error}
            </div>
          )}
          <div className="flex flex-col items-center gap-1.5">
            <label className="text-[10px] sm:text-xs font-semibold text-slate-700">
              {t.doc_photo} <span className="text-slate-400">{t.doc_optional}</span>
            </label>
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Preview"
                  className="h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover border-2 border-[#0da694]" />
                <button type="button" onClick={removeImage}
                  className="absolute -top-1 -left-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition">
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border-2 border-dashed border-[#0da694] bg-[#0da694]/5 flex flex-col items-center justify-center hover:bg-[#0da694]/10 transition cursor-pointer">
                <Upload className="h-4 w-4 sm:h-5 sm:w-5 text-[#0da694]" />
                <span className="text-[9px] sm:text-[10px] text-[#0da694] font-medium">{t.doc_upload_photo}</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </div>

          <div className="grid sm:grid-cols-2 gap-2.5">
            <InputField label={t.doc_fullname} value={form.fullName}
              onChange={(v) => setForm({ ...form, fullName: v })} error={errors.fullName} required />
            <InputField label={t.doc_phone} value={form.phone}
              onChange={(v) => setForm({ ...form, phone: v })} error={errors.phone} required type="tel" dir="ltr" />
          </div>

          <DropdownField label={t.doc_specialty} placeholder={t.doc_spec_select}
            value={form.specialty} options={SPECIALTIES.map((s) => s.label)}
            onChange={(v) => setForm({ ...form, specialty: v })} error={errors.specialty} required isRtl={isRtl}
            disabled={!SPECIALTIES.length} />

          <LicenseField label={t.doc_license_label} hint={t.doc_license_hint}
            value={form.licenseNumber} onChange={(v) => setForm({ ...form, licenseNumber: v })}
            placeholder={t.doc_license_ph} error={errors.licenseNumber} />

          <TextareaField label={t.doc_bio} value={form.bio}
            onChange={(v) => setForm({ ...form, bio: v })} placeholder={t.doc_bio_ph} optional optionalLabel={t.doc_optional} />

          <button type="submit"
            disabled={ui.loading}
            className="w-full h-9 sm:h-10 rounded-lg bg-[#0da694] text-white font-bold hover:brightness-95 transition text-xs sm:text-sm disabled:opacity-60">
            {ui.loading ? "..." : t.doc_save}
          </button>
        </form>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, error, required, type = "text", dir = "rtl" }) {
  return (
    <div>
      <label className="text-[10px] sm:text-xs font-semibold text-slate-700">
        {label}{required && <span className="text-red-500 mr-1">*</span>}
      </label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} dir={dir}
        className={`mt-1 w-full h-8 sm:h-9 rounded-lg border px-2.5 text-[11px] sm:text-xs outline-none focus:ring-2 focus:ring-[#0da694] transition ${error ? "border-red-500" : "border-slate-200"}`} />
      {error && <p className="text-red-500 text-[9px] mt-0.5">{error}</p>}
    </div>
  );
}

function TextareaField({ label, value, onChange, placeholder, optional, optionalLabel }) {
  return (
    <div>
      <label className="text-[10px] sm:text-xs font-semibold text-slate-700">
        {label}{optional && <span className="text-slate-400 text-[9px] mr-1">{optionalLabel}</span>}
      </label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2}
        className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] sm:text-xs outline-none focus:ring-2 focus:ring-[#0da694] transition resize-none" />
    </div>
  );
}

function LicenseField({ label, hint, value, onChange, placeholder, error }) {
  return (
    <div>
      <label className="text-[10px] sm:text-xs font-semibold text-slate-700">
        {label}<span className="text-red-500 mr-1">*</span>
      </label>
      {hint && <p className="text-[10px] text-slate-400 mb-1">{hint}</p>}
      <input type="text" dir="ltr" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`mt-1 w-full h-8 sm:h-9 rounded-lg border px-2.5 text-[11px] sm:text-xs outline-none focus:ring-2 focus:ring-[#0da694] transition ${error ? "border-red-500" : "border-slate-200"}`} />
      {error && <p className="text-red-500 text-[9px] mt-0.5">{error}</p>}
    </div>
  );
}

function DropdownField({ label, value, onChange, options, error, required, placeholder, isRtl, disabled = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div ref={ref} className="relative">
      <label className="text-[10px] sm:text-xs font-semibold text-slate-700">
        {label}{required && <span className="text-red-500 mr-1">*</span>}
      </label>
      <button type="button" disabled={disabled} onClick={() => !disabled && setOpen((v) => !v)}
        className={`mt-1 w-full h-8 sm:h-9 rounded-lg border px-2.5 flex items-center justify-between text-[11px] sm:text-xs focus:ring-2 focus:ring-[#0da694] transition ${error ? "border-red-500" : "border-slate-200"} ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
        <span className={value ? "text-slate-900" : "text-slate-400"}>{value || placeholder}</span>
        <span className="text-slate-400 text-[10px]">▼</span>
      </button>
      {open && !disabled && (
        <div className={`absolute top-full ${isRtl ? "right-0" : "left-0"} mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-36 overflow-y-auto z-50`}>
          {options.map((opt) => (
            <button type="button" key={opt} onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full px-2.5 py-1.5 hover:bg-[#0da694]/10 cursor-pointer ${isRtl ? "text-right" : "text-left"} text-[11px] sm:text-xs transition`}>
              {opt}
            </button>
          ))}
        </div>
      )}
      {error && <p className="text-red-500 text-[9px] mt-0.5">{error}</p>}
    </div>
  );
}
