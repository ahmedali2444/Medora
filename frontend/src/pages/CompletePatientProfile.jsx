import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { medoraApi } from '../api/medoraApi';
import { useLang } from '../context/LanguageContext';
import { User, Globe, Phone, Calendar, Stethoscope } from 'lucide-react';

const COPY = {
  title: { ar: 'أكمل بياناتك الشخصية', en: 'Complete Your Profile' },
  subtitle: { 
    ar: 'لتقديم تجربة أفضل وتسهيل عملية حجز المواعيد، يرجى إكمال هذه البيانات السريعة.', 
    en: 'To provide a better experience and streamline booking, please complete these quick details.' 
  },
  nameAr: { ar: 'الاسم بالعربية', en: 'Arabic Name' },
  nameEn: { ar: 'الاسم بالإنجليزية', en: 'English Name' },
  phone: { ar: 'رقم الهاتف', en: 'Phone Number' },
  dob: { ar: 'تاريخ الميلاد', en: 'Date of Birth' },
  notes: { ar: 'ملاحظات طبية (اختياري)', en: 'Medical Notes (Optional)' },
  notesPlaceholder: { ar: 'مثل: أعاني من حساسية البنسلين، مريض سكري...', en: 'e.g., Penicillin allergy, Diabetic...' },
  submit: { ar: 'حفظ ومتابعة', en: 'Save & Continue' },
  saving: { ar: 'جاري الحفظ...', en: 'Saving...' },
};

export default function CompletePatientProfile() {
  const { user, refreshMe, login } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();
  const isRtl = lang !== 'en';

  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    fullNameEn: user?.fullNameEn || '',
    phoneNumber: user?.phoneNumber || '',
    dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
    medicalNotes: user?.medicalNotes || '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName || !form.fullNameEn || !form.phoneNumber || !form.dateOfBirth) {
      setError(isRtl ? 'يرجى تعبئة جميع الحقول الإلزامية' : 'Please fill all required fields');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const authData = await medoraApi.updatePatientProfile({
        fullName: form.fullName,
        fullNameEn: form.fullNameEn,
        phoneNumber: form.phoneNumber,
        dateOfBirth: form.dateOfBirth,
        medicalNotes: form.medicalNotes,
      });
      if (authData && authData.token) {
        login(authData);
      }
      await refreshMe();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Error saving profile');
    } finally {
      setLoading(false);
    }
  };

  const getText = (key) => COPY[key]?.[lang] || COPY[key]?.ar;

  return (
    <div className="min-h-screen bg-[#f3fafa] flex items-center justify-center py-12 px-4" style={{ fontFamily: 'Cairo, sans-serif' }}>
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-[0_8px_30px_rgba(8,64,54,0.04)] overflow-hidden">
        <div className="p-8 text-center bg-gradient-to-br from-[#14b8a6]/10 to-[#14b8a6]/5 border-b border-[#e4eeee]">
          <div className="mx-auto w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
            <User className="text-[#14b8a6]" size={32} />
          </div>
          <h1 className="text-2xl font-black text-[#084036] mb-2">{getText('title')}</h1>
          <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
            {getText('subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5" dir={isRtl ? 'rtl' : 'ltr'}>
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">{getText('nameAr')} *</label>
              <div className="relative">
                <User size={16} className={`absolute top-3 text-slate-400 ${isRtl ? 'right-3' : 'left-3'}`} />
                <input
                  type="text"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  dir="rtl"
                  placeholder="محمد أحمد"
                  className={`w-full h-11 bg-[#f7fbfb] border border-[#e4eeee] rounded-xl text-sm font-bold text-[#084036] outline-none focus:border-[#14b8a6] focus:ring-2 focus:ring-[#14b8a6]/20 transition ${isRtl ? 'pr-10 pl-3' : 'pl-10 pr-3'}`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">{getText('nameEn')} *</label>
              <div className="relative">
                <Globe size={16} className={`absolute top-3 text-slate-400 ${isRtl ? 'right-3' : 'left-3'}`} />
                <input
                  type="text"
                  name="fullNameEn"
                  value={form.fullNameEn}
                  onChange={handleChange}
                  dir="ltr"
                  placeholder="Mohamed Ahmed"
                  className={`w-full h-11 bg-[#f7fbfb] border border-[#e4eeee] rounded-xl text-sm font-bold text-[#084036] outline-none focus:border-[#14b8a6] focus:ring-2 focus:ring-[#14b8a6]/20 transition ${isRtl ? 'pr-10 pl-3' : 'pl-10 pr-3'}`}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">{getText('phone')} *</label>
              <div className="relative">
                <Phone size={16} className={`absolute top-3 text-slate-400 ${isRtl ? 'right-3' : 'left-3'}`} />
                <input
                  type="tel"
                  name="phoneNumber"
                  value={form.phoneNumber}
                  onChange={handleChange}
                  dir="ltr"
                  placeholder="01xxxxxxxxx"
                  className={`w-full h-11 bg-[#f7fbfb] border border-[#e4eeee] rounded-xl text-sm font-bold text-[#084036] outline-none focus:border-[#14b8a6] focus:ring-2 focus:ring-[#14b8a6]/20 transition ${isRtl ? 'pr-10 pl-3' : 'pl-10 pr-3'}`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">{getText('dob')} *</label>
              <div className="relative">
                <Calendar size={16} className={`absolute top-3 text-slate-400 ${isRtl ? 'right-3' : 'left-3'}`} />
                <input
                  type="date"
                  name="dateOfBirth"
                  value={form.dateOfBirth}
                  onChange={handleChange}
                  className={`w-full h-11 bg-[#f7fbfb] border border-[#e4eeee] rounded-xl text-sm font-bold text-[#084036] outline-none focus:border-[#14b8a6] focus:ring-2 focus:ring-[#14b8a6]/20 transition ${isRtl ? 'pr-10 pl-3' : 'pl-10 pr-3'}`}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">{getText('notes')}</label>
            <div className="relative">
              <Stethoscope size={16} className={`absolute top-3 text-slate-400 ${isRtl ? 'right-3' : 'left-3'}`} />
              <textarea
                name="medicalNotes"
                value={form.medicalNotes}
                onChange={handleChange}
                placeholder={getText('notesPlaceholder')}
                className={`w-full h-24 bg-[#f7fbfb] border border-[#e4eeee] rounded-xl py-3 text-sm font-bold text-[#084036] outline-none focus:border-[#14b8a6] focus:ring-2 focus:ring-[#14b8a6]/20 transition resize-none ${isRtl ? 'pr-10 pl-3' : 'pl-10 pr-3'}`}
              ></textarea>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 mt-4 bg-[#14b8a6] text-white rounded-xl font-black text-sm hover:bg-[#0e9e8d] shadow-lg shadow-[#14b8a6]/25 transition disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {loading && <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
            {loading ? getText('saving') : getText('submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
