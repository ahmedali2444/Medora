import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { AlertTriangle, MapPin, Phone, Stethoscope } from 'lucide-react';
import { useLocalizedContent } from '../../../hooks/useLocalizedContent';
import { localizedText } from '../../../utils/localization';

export default function PrintablePrescriptionTemplate({ prescription, doctorProfile }) {
  const { text, lang } = useLocalizedContent();
  
  // Format Date and Time
  const dateObj = new Date(prescription.date);
  const formattedDate = dateObj.toLocaleDateString('en-GB'); // DD/MM/YYYY
  const formattedTime = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  
  // Checking for allergy warning in notes
  const notesText = text(prescription.notes) || '';
  const hasWarning = /حساسية|allergy|تحذير|warning|تنبيه/i.test(notesText);
  const warningMatch = notesText.match(/(?:حساسية|allergy|تحذير|warning|تنبيه)[\s:]*([^\n.]*)/i);
  const warningText = warningMatch ? warningMatch[0] : text(localizedText('يوجد تحذير طبي، يرجى مراجعة الطبيب.', 'There is a medical warning, please review.'));
  
  // Clean notes
  const displayNotes = notesText;

  const docName = doctorProfile ? text(doctorProfile.name) : text(localizedText('د. طبيب غير محدد', 'Dr. Unspecified'));
  const docTitle = doctorProfile ? text(doctorProfile.title) : text(localizedText('أخصائي', 'Specialist'));
  const docLicense = doctorProfile?.license || '-';
  const docPhone = doctorProfile?.phone || '-';
  const docAddress = doctorProfile ? text(doctorProfile.location) : '-';
  const rxId = prescription.id || prescription.prescriptionNumber || `RX-${prescription.rawId || 'pending'}`;

  // Patient info defaults
  const patName = text(prescription.patient);
  const patPhone = prescription.patientPhone || '-';
  const patAge = '-';
  const patGender = '-';

  return (
    <div id="printable-prescription" className="w-full max-w-[210mm] mx-auto bg-white text-[#334155] p-8 print:p-8" dir={lang === 'ar' ? 'rtl' : 'ltr'} style={{ fontFamily: 'Cairo, sans-serif' }}>
       <style>{`
         @media print {
           @page { margin: 0 !important; }
           body { -webkit-print-color-adjust: exact; }
         }
       `}</style>
       
       {/* 1. Header */}
       <header className="flex justify-between items-start border-b-2 border-[#14b8a6] pb-4 mb-4">
          <div className="flex items-center gap-4">

             <div>
                <h1 className="text-2xl font-black text-[#0f172a]">{docName}</h1>
                <h2 className="text-sm font-bold text-[#14b8a6] mt-1">{docTitle}</h2>
                <div className="text-xs text-slate-500 mt-2 space-y-1">
                   {docLicense !== '-' && <div>{text(localizedText('ترخيص طبي رقم:', 'Medical License No:'))} <span className="font-bold">{docLicense}</span></div>}
                   <div className="flex items-center gap-1"><Phone size={12}/> <span dir="ltr">{docPhone}</span></div>
                   <div className="flex items-center gap-1"><MapPin size={12}/> {docAddress}</div>
                </div>
             </div>
          </div>
          <div className="text-left flex flex-col items-end">
             <div className="text-3xl font-black text-[#0f172a] tracking-tight">Medora</div>
             <div className="text-xs font-bold text-[#14b8a6] tracking-widest uppercase mt-1">E-Prescription</div>
          </div>
       </header>

       {/* 2. Document Row */}
       <div className="flex justify-between items-center bg-[#f8fafc] rounded-xl p-4 mb-4 border border-[#e2e8f0]">
          <div className="flex gap-8">

             <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">{text(localizedText('تاريخ الإصدار', 'Issue Date'))}</div>
                <div className="font-bold text-[#0f172a] text-sm" dir="ltr">{formattedDate}</div>
             </div>
             <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">{text(localizedText('الوقت', 'Time'))}</div>
                <div className="font-bold text-[#0f172a] text-sm" dir="ltr">{formattedTime}</div>
             </div>
          </div>
          <div>
             <QRCodeSVG value={`https://medora.local/verify/${rxId}`} size={48} level="M" />
          </div>
       </div>

       {/* 3. Patient Info */}
       <section className="mb-4">
          <div className="text-sm font-bold text-[#14b8a6] mb-3 border-b border-slate-100 pb-1">{text(localizedText('بيانات المريض', 'Patient Information'))}</div>
          <div className="grid grid-cols-3 gap-y-4 gap-x-2 text-sm">
             <div>
                <span className="text-slate-400 text-xs block mb-1">{text(localizedText('الاسم الرباعي', 'Full Name'))}</span>
                <span className="font-extrabold text-[#0f172a]">{patName}</span>
             </div>
             <div>
                <span className="text-slate-400 text-xs block mb-1">{text(localizedText('العمر / تاريخ الميلاد', 'Age / DOB'))}</span>
                <span className="font-bold text-[#334155]" dir="ltr">{patAge}</span>
             </div>
             <div>
                <span className="text-slate-400 text-xs block mb-1">{text(localizedText('النوع', 'Gender'))}</span>
                <span className="font-bold text-[#334155]">{patGender}</span>
             </div>
             <div>
                <span className="text-slate-400 text-xs block mb-1">{text(localizedText('رقم الهاتف', 'Phone'))}</span>
                <span className="font-bold text-[#334155]" dir="ltr">{patPhone}</span>
             </div>

          </div>
       </section>

       {/* 4. Diagnosis */}
       <section className="mb-4">
          <div className="text-sm font-bold text-[#14b8a6] mb-3 border-b border-slate-100 pb-1">{text(localizedText('التشخيص', 'Diagnosis'))} (Diagnosis)</div>
          <div className="flex justify-between items-start bg-[#f8fafc] p-4 rounded-xl border border-slate-100">
             <div className="font-bold text-[#0f172a] leading-relaxed text-sm">{text(prescription.diagnosis) || '-'}</div>
             <div className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-500 font-bold" dir="ltr">ICD-10: -</div>
          </div>
       </section>

       {/* 5. Warning Bar */}
       {hasWarning && (
         <div className="mb-6 bg-red-50 border-r-4 border-red-500 p-3 rounded-l-xl flex items-center gap-3">
            <AlertTriangle className="text-red-500" size={20} />
            <div className="text-red-700 font-bold text-sm">
               {warningText}
            </div>
         </div>
       )}

       {/* 6. Medicines Table */}
       <section className="mb-4">
          <div className="text-sm font-bold text-[#14b8a6] mb-3 border-b border-slate-100 pb-1">{text(localizedText('الخطة العلاجية', 'Medications'))} (Medications)</div>
          <table className="w-full text-sm border-collapse">
             <thead>
                <tr className="bg-[#f8fafc] border-y border-slate-200">
                   <th className={`py-2 px-2 ${lang === 'ar' ? 'text-right' : 'text-left'} font-bold text-slate-500 text-xs w-8`}>#</th>
                   <th className={`py-2 px-2 ${lang === 'ar' ? 'text-right' : 'text-left'} font-bold text-slate-500 text-xs w-2/5`}>{text(localizedText('اسم الدواء (التركيز والشكل)', 'Medicine (Dose & Form)'))}</th>
                   <th className={`py-2 px-2 ${lang === 'ar' ? 'text-right' : 'text-left'} font-bold text-slate-500 text-xs`}>{text(localizedText('الجرعة', 'Dose'))}</th>
                   <th className={`py-2 px-2 ${lang === 'ar' ? 'text-right' : 'text-left'} font-bold text-slate-500 text-xs`}>{text(localizedText('التكرار والمدة', 'Frequency & Duration'))}</th>
                   <th className="py-2 px-2 text-center font-bold text-slate-500 text-xs w-16">{text(localizedText('الكمية', 'Qty'))}</th>
                </tr>
             </thead>
             <tbody>
                {prescription.items.map((item, index) => (
                  <tr key={index} className="border-b border-slate-100 last:border-b-2 last:border-[#14b8a6]">
                     <td className="py-4 px-2 font-black text-slate-300">{index + 1}</td>
                     <td className="py-4 px-2">
                        <div className="font-extrabold text-[#0f172a] text-[15px]">{text(item.name)}</div>
                     </td>
                     <td className="py-4 px-2 font-bold text-[#0e7c6e]">{text(item.dose) || '-'}</td>
                     <td className="py-4 px-2 text-slate-600 font-medium">{text(item.frequency) || '-'}</td>
                     <td className="py-4 px-2 text-center font-bold text-[#334155]" dir="ltr">{item.quantity || 1}</td>
                  </tr>
                ))}
             </tbody>
          </table>
       </section>

       {/* 7. Notes */}
       {displayNotes && (
         <section className="mb-4">
            <div className="text-sm font-bold text-[#14b8a6] mb-2 border-b border-slate-100 pb-1">{text(localizedText('ملاحظات وتعليمات عامة', 'General Instructions & Notes'))}</div>
            <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
               {displayNotes}
            </div>
         </section>
       )}

       {/* 8. Signature/Stamp */}
       <section className="mt-8 pt-4 flex justify-between items-end">
          <div className="w-1/3 text-center">
             <div className="border-b-2 border-dashed border-slate-300 mb-2 h-16 relative">
                {/* Space for stamp */}
                <div className="absolute inset-0 flex items-center justify-center opacity-10">
                   <span className="text-2xl font-black rotate-[-15deg] uppercase">Stamp Here</span>
                </div>
             </div>
             <div className="text-xs text-slate-400 font-bold">{text(localizedText('ختم العيادة', 'Clinic Stamp'))}</div>
          </div>
          <div className="w-1/3 text-center">
             <div className="border-b-2 border-slate-800 mb-2 h-16">
                {/* Space for signature */}
             </div>
             <div className="font-bold text-[#0f172a]">{docName}</div>
             <div className="text-xs text-slate-400 mt-1">{text(localizedText('توقيع الطبيب المعالج', 'Doctor Signature'))}</div>
          </div>
       </section>

       {/* 9. Footer */}
       <footer className="mt-6 pt-4 border-t border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-3 text-xs text-slate-400">
             <QRCodeSVG value={`https://medora.local`} size={24} level="L" />
             <div>
                <div className="font-bold text-slate-500">Medora E-Prescription System</div>
                <div>{text(localizedText('تم الإنشاء تلقائياً وموثق إلكترونياً', 'Automatically generated & electronically verified'))}</div>
             </div>
          </div>
          <div className="text-xs text-slate-400 font-bold" dir="ltr">
             Page 1 of 1
          </div>
       </footer>
    </div>
  );
}
