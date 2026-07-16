import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';
import { medoraApi } from '../../api/medoraApi';
import { User, Phone, Globe, Lock, CheckCircle, Calendar, Stethoscope, Eye, EyeOff } from 'lucide-react';

const COPY = {
  title: { ar: 'إعدادات الحساب', en: 'Account Settings' },
  subtitle: { ar: 'تحديث بياناتك الشخصية وكلمة المرور', en: 'Update your personal info and password' },
  profileInfo: { ar: 'البيانات الشخصية', en: 'Personal Information' },
  nameAr: { ar: 'الاسم بالعربية', en: 'Arabic Name' },
  nameEn: { ar: 'الاسم بالإنجليزية', en: 'English Name' },
  phone: { ar: 'رقم الهاتف', en: 'Phone Number' },
  dob: { ar: 'تاريخ الميلاد', en: 'Date of Birth' },
  notes: { ar: 'ملاحظات طبية', en: 'Medical Notes' },
  saveProfile: { ar: 'حفظ البيانات', en: 'Save Profile' },
  changePassword: { ar: 'تغيير كلمة المرور', en: 'Change Password' },
  currentPassword: { ar: 'كلمة المرور الحالية', en: 'Current Password' },
  newPassword: { ar: 'كلمة المرور الجديدة', en: 'New Password' },
  updatePassword: { ar: 'تحديث كلمة المرور', en: 'Update Password' },
  successProfile: { ar: 'تم تحديث البيانات بنجاح', en: 'Profile updated successfully' },
  successPassword: { ar: 'تم تغيير كلمة المرور بنجاح', en: 'Password changed successfully' },
  saving: { ar: 'جاري الحفظ...', en: 'Saving...' },
};

export default function PatientSettings() {
  const { user, refreshMe, login } = useAuth();
  const { lang, toggleLang } = useLang();

  const [profile, setProfile] = useState({
    fullName: user?.fullName || '',
    fullNameEn: user?.fullNameEn || '',
    phoneNumber: user?.phoneNumber || '',
    dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
    medicalNotes: user?.medicalNotes || '',
  });

  const [password, setPassword] = useState({ currentPassword: '', newPassword: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });
  const [loading, setLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  useEffect(() => {
    setProfile({
      fullName: user?.fullName || '',
      fullNameEn: user?.fullNameEn || '',
      phoneNumber: user?.phoneNumber || '',
      dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
      medicalNotes: user?.medicalNotes || '',
    });
  }, [user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', msg: '' });

    try {
      const authData = await medoraApi.updatePatientProfile({
        fullName: profile.fullName,
        fullNameEn: profile.fullNameEn,
        phoneNumber: profile.phoneNumber,
        dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString() : new Date().toISOString(),
        medicalNotes: profile.medicalNotes
      });
      if (authData && authData.token) {
        login(authData);
      }
      await refreshMe();
      setStatus({ type: 'success', msg: COPY.successProfile[lang] || COPY.successProfile.ar });
    } catch (err) {
      setStatus({ type: 'error', msg: err.message || 'Unable to save profile' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setPassLoading(true);
    setStatus({ type: '', msg: '' });

    try {
      await medoraApi.changePassword({
        currentPassword: password.currentPassword,
        newPassword: password.newPassword,
      });
      setStatus({ type: 'success', msg: COPY.successPassword[lang] || COPY.successPassword.ar });
      setPassword({ currentPassword: '', newPassword: '' });
    } catch (err) {
      setStatus({ type: 'error', msg: err.message || 'Unable to save profile' });
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-[#14b8a6] to-[#0d9488] rounded-2xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black mb-2">{COPY.title[lang] || COPY.title.ar}</h1>
          <p className="text-white/80 text-sm">{COPY.subtitle[lang] || COPY.subtitle.ar}</p>
        </div>
        <button
          onClick={toggleLang}
          className="flex items-center gap-2 bg-white/20 hover:bg-white/30 transition px-4 py-2 rounded-xl text-sm font-bold backdrop-blur-sm"
        >
          <Globe size={18} />
          {lang === 'ar' ? 'English' : 'العربية'}
        </button>
      </div>

      {status.msg && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-bold ${
          status.type === 'success' ? 'bg-[#14b8a6]/10 text-[#14b8a6]' : 'bg-red-50 text-red-600'
        }`}>
          {status.type === 'success' ? <CheckCircle size={20} /> : null}
          <span>{status.msg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-[#e4eeee] p-6">
          <h2 className="text-lg font-bold text-[#084036] mb-6 flex items-center gap-2">
            <User className="text-[#14b8a6]" size={20} />
            {COPY.profileInfo[lang] || COPY.profileInfo.ar}
          </h2>
          
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">{COPY.nameAr[lang] || COPY.nameAr.ar}</label>
              <input
                type="text"
                value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                className="w-full h-11 px-4 bg-[#f7fbfb] border border-[#e4eeee] rounded-xl text-sm font-bold outline-none focus:border-[#14b8a6]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">{COPY.nameEn[lang] || COPY.nameEn.ar}</label>
              <input
                type="text"
                value={profile.fullNameEn}
                onChange={(e) => setProfile({ ...profile, fullNameEn: e.target.value })}
                className="w-full h-11 px-4 bg-[#f7fbfb] border border-[#e4eeee] rounded-xl text-sm font-bold outline-none focus:border-[#14b8a6]"
                dir="ltr"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">{COPY.phone[lang] || COPY.phone.ar}</label>
              <input
                type="tel"
                value={profile.phoneNumber}
                onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
                className="w-full h-11 px-4 bg-[#f7fbfb] border border-[#e4eeee] rounded-xl text-sm font-bold outline-none focus:border-[#14b8a6]"
                dir="ltr"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">{COPY.dob[lang] || COPY.dob.ar}</label>
              <input
                type="date"
                value={profile.dateOfBirth}
                onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
                className="w-full h-11 px-4 bg-[#f7fbfb] border border-[#e4eeee] rounded-xl text-sm font-bold outline-none focus:border-[#14b8a6]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">{COPY.notes[lang] || COPY.notes.ar}</label>
              <textarea
                value={profile.medicalNotes}
                onChange={(e) => setProfile({ ...profile, medicalNotes: e.target.value })}
                className="w-full h-24 p-4 bg-[#f7fbfb] border border-[#e4eeee] rounded-xl text-sm font-bold outline-none focus:border-[#14b8a6] resize-none"
              ></textarea>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#14b8a6] text-white rounded-xl font-bold text-sm hover:bg-[#0e9e8d] transition disabled:opacity-70"
            >
              {loading ? (COPY.saving[lang] || COPY.saving.ar) : (COPY.saveProfile[lang] || COPY.saveProfile.ar)}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[#e4eeee] p-6 h-fit">
          <h2 className="text-lg font-bold text-[#084036] mb-6 flex items-center gap-2">
            <Lock className="text-[#14b8a6]" size={20} />
            {COPY.changePassword[lang] || COPY.changePassword.ar}
          </h2>
          
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div className="relative">
              <label className="block text-xs font-bold text-slate-600 mb-1.5">{COPY.currentPassword[lang] || COPY.currentPassword.ar}</label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={password.currentPassword}
                  onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })}
                  className={`w-full h-11 bg-[#f7fbfb] border border-[#e4eeee] rounded-xl text-sm font-bold outline-none focus:border-[#14b8a6] px-4 ${lang === 'ar' ? 'pl-10' : 'pr-10'}`}
                  dir="ltr"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 ${lang === 'ar' ? 'left-3' : 'right-3'}`}
                >
                  {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="relative">
              <label className="block text-xs font-bold text-slate-600 mb-1.5">{COPY.newPassword[lang] || COPY.newPassword.ar}</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={password.newPassword}
                  onChange={(e) => setPassword({ ...password, newPassword: e.target.value })}
                  className={`w-full h-11 bg-[#f7fbfb] border border-[#e4eeee] rounded-xl text-sm font-bold outline-none focus:border-[#14b8a6] px-4 ${lang === 'ar' ? 'pl-10' : 'pr-10'}`}
                  dir="ltr"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 ${lang === 'ar' ? 'left-3' : 'right-3'}`}
                >
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={passLoading}
              className="w-full h-11 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-slate-700 transition disabled:opacity-70"
            >
              {passLoading ? (COPY.saving[lang] || COPY.saving.ar) : (COPY.updatePassword[lang] || COPY.updatePassword.ar)}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
