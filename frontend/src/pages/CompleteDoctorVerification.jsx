import Logo from "../assets/images/Logo.png";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, X } from "lucide-react";
import { useLang } from "../context/LanguageContext";
import { medoraApi } from "../api/medoraApi";

const MAX_DOCUMENT_IMAGE_BYTES = 5 * 1024 * 1024;

export default function CompleteDoctorVerification() {
    const navigate = useNavigate();
    const { t } = useLang();
    const isRtl = t.dir === "rtl";

    const [form, setForm] = useState({ syndicateCard: null, selfieWithCard: null });
    const [previews, setPreviews] = useState({ syndicateCard: null, selfieWithCard: null });
    const [errors, setErrors] = useState({});
    const [ui, setUi] = useState({ loading: false, error: "" });
    const syndicateCardRef = useRef();
    const selfieWithCardRef = useRef();

    const handleImageChange = (field, e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > MAX_DOCUMENT_IMAGE_BYTES) {
            e.target.value = "";
            setErrors((prev) => ({
                ...prev,
                [field]: isRtl ? "حجم الصورة يجب ألا يتجاوز 5MB" : "Image size must not exceed 5MB",
            }));
            return;
        }

        setErrors((prev) => ({ ...prev, [field]: "" }));
        setForm((prev) => ({ ...prev, [field]: file }));
        const reader = new FileReader();
        reader.onloadend = () => setPreviews((prev) => ({ ...prev, [field]: reader.result }));
        reader.readAsDataURL(file);
    };

    const removeImage = (field, inputRef) => {
        setForm((prev) => ({ ...prev, [field]: null }));
        setPreviews((prev) => ({ ...prev, [field]: null }));
        if (inputRef.current) inputRef.current.value = "";
    };

    const validate = () => {
        const newErrors = {};
        if (!form.syndicateCard) newErrors.syndicateCard = t.ver_err_card;
        if (!form.selfieWithCard) newErrors.selfieWithCard = t.ver_err_selfie;
        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newErrors = validate();
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        setUi({ loading: true, error: "" });
        try {
            const [cardUpload, selfieUpload] = await Promise.all([
                medoraApi.uploadImage(form.syndicateCard, "verification"),
                medoraApi.uploadImage(form.selfieWithCard, "verification"),
            ]);

            await medoraApi.verifyDoctor({
                syndicateCardImageUrl: cardUpload?.url,
                selfieWithCardUrl: selfieUpload?.url,
            });
            navigate("/doctor/overview", { replace: true });
        } catch (error) {
            setUi({ loading: false, error: error.message || "Unable to submit verification" });
        }
    };

    return (
        <div dir={t.dir}
            className="min-h-screen bg-gradient-to-b from-[#eef7f7] via-[#f6fbfb] to-white flex items-center justify-center p-4">
            <div className="w-full max-w-lg flex flex-col gap-5 py-6">
                <div className="text-center">
                    <div className="flex items-center justify-center gap-2">
                        <img src={Logo} alt="Medora" className="h-10 w-10 sm:h-12 sm:w-12" />
                        <div className="text-xl sm:text-2xl font-extrabold text-[#0ea5a5]">{t.brand}</div>
                    </div>
                    <h1 className="mt-2 text-lg sm:text-xl font-extrabold text-slate-900">{t.ver_title}</h1>
                    <p className="mt-1 text-xs text-slate-500">{t.ver_sub}</p>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                    <StepBadge number={1} label={t.ver_step1} done />
                    <div className="w-8 h-px bg-slate-300" />
                    <StepBadge number={2} label={t.ver_step2} done />
                    <div className="w-8 h-px bg-slate-300" />
                    <StepBadge number={3} label={t.ver_step3} />
                </div>

                <form onSubmit={handleSubmit} className="bg-white p-5 sm:p-6 rounded-2xl shadow-xl space-y-5">
                    <UploadField
                        label={t.ver_card_label} hint={t.ver_card_hint}
                        preview={previews.syndicateCard} error={errors.syndicateCard}
                        onUploadClick={() => syndicateCardRef.current?.click()}
                        onRemove={() => removeImage("syndicateCard", syndicateCardRef)}
                        inputRef={syndicateCardRef} onChange={(e) => handleImageChange("syndicateCard", e)}
                        icon="🪪" uploadText={t.ver_upload} uploadedText={t.ver_uploaded}
                    />
                    <div className="border-t border-slate-100" />
                    <UploadField
                        label={t.ver_selfie_label} hint={t.ver_selfie_hint}
                        preview={previews.selfieWithCard} error={errors.selfieWithCard}
                        onUploadClick={() => selfieWithCardRef.current?.click()}
                        onRemove={() => removeImage("selfieWithCard", selfieWithCardRef)}
                        inputRef={selfieWithCardRef} onChange={(e) => handleImageChange("selfieWithCard", e)}
                        icon="🤳" uploadText={t.ver_upload} uploadedText={t.ver_uploaded}
                    />

                    {ui.error && <div className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{ui.error}</div>}

                    <button type="submit"
                        disabled={ui.loading}
                        className="w-full h-11 rounded-xl bg-[#0da694] text-white font-bold hover:brightness-95 active:scale-[0.98] transition text-sm shadow-md shadow-[#0da694]/20">
                        {ui.loading ? "..." : t.ver_submit}
                    </button>
                    <p className="text-center text-[10px] text-slate-400">{t.ver_review_note}</p>
                </form>
            </div>
        </div>
    );
}

function UploadField({ label, hint, preview, error, onUploadClick, onRemove, inputRef, onChange, icon, uploadText, uploadedText }) {
    return (
        <div>
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <span>{icon}</span>{label}<span className="text-red-500 mr-1">*</span>
            </label>
            {hint && <p className="text-[10px] text-slate-400 mb-2">{hint}</p>}
            {preview ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                    <img src={preview} alt="Preview" className="w-full h-40 sm:h-48 object-cover" />
                    <button type="button" onClick={onRemove}
                        className="absolute top-2 left-2 h-7 w-7 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition shadow">
                        <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="absolute bottom-2 right-2 bg-[#0da694] text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                        {uploadedText}
                    </div>
                </div>
            ) : (
                <button type="button" onClick={onUploadClick}
                    className={`w-full h-36 sm:h-40 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition cursor-pointer ${error ? "border-red-400 bg-red-50" : "border-[#0da694] bg-[#0da694]/5 hover:bg-[#0da694]/10"}`}>
                    <Upload className={`h-7 w-7 ${error ? "text-red-400" : "text-[#0da694]"}`} />
                    <span className={`text-xs font-medium ${error ? "text-red-400" : "text-[#0da694]"}`}>{uploadText}</span>
                    <span className="text-[10px] text-slate-400">PNG, JPG max 5MB</span>
                </button>
            )}
            <input ref={inputRef} type="file" accept="image/*" onChange={onChange} className="hidden" />
            {error && <p className="text-red-500 text-[10px] mt-1">{error}</p>}
        </div>
    );
}

function StepBadge({ number, label, done }) {
    return (
        <div className="flex flex-col items-center gap-1">
            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold transition ${done ? "bg-[#0da694] text-white" : "bg-slate-100 text-slate-400 border border-slate-300"}`}>
                {number}
            </div>
            <span className={`text-[9px] ${done ? "text-[#0da694] font-semibold" : "text-slate-400"}`}>{label}</span>
        </div>
    );
}
