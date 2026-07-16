import React, { useEffect, useState } from 'react';
import { Clock, DollarSign, Edit2, MapPin, Phone, Plus, Stethoscope, Trash2 } from 'lucide-react';
import DoctorLayout from '../../components/doctor/layout/DoctorLayout';
import SectionCard from '../../components/doctor/shared/SectionCard';
import { WEEK_DAYS } from '../../components/doctor/data/doctorData';
import { useLocalizedContent } from '../../hooks/useLocalizedContent';
import { localizedText } from '../../utils/localization';
import { medoraApi } from '../../api/medoraApi';
import { mapClinic } from '../../utils/professionalApiMappers';
import ClinicFormModal from '../../components/doctor/forms/ClinicFormModal';

const COPY = {
  title: localizedText('العيادات', 'Clinics'),
  subtitle: localizedText('إدارة فروع العيادات ومواعيد العمل بكل فرع', 'Manage clinic branches and working hours'),
  myClinicTitle: localizedText('عياداتي', 'My clinics'),
  clinicAvail: localizedText('متاحة اليوم', 'Available today'),
  addClinic: localizedText('إضافة عيادة', 'Add clinic'),
  available: localizedText('متاحة اليوم', 'Available today'),
  unavailable: localizedText('مغلقة اليوم', 'Closed today'),
  feeSuffix: localizedText('ج.م / كشف', 'EGP / visit'),
  callToBook: localizedText('اتصل للحجز', 'Call to book'),
  weeklyScheduleTitle: localizedText('الجدول الأسبوعي', 'Weekly schedule'),
  weeklyScheduleDesc: localizedText('توزيع أيام العمل على العيادات', 'Work days distribution across clinics'),
  tipsTitle: localizedText('نصائح إدارة العيادة', 'Clinic management tips'),
  clinicCol: localizedText('العيادة', 'Clinic'),
  tip1: localizedText(
    'راجع جدول كل عيادة بانتظام واضبط الأيام المتاحة قبل بداية الأسبوع.',
    'Review each clinic schedule regularly and update available days before the week starts.',
  ),
  tip2: localizedText(
    'حدّث رسوم الكشف بشكل دوري ليتطابق مع تكلفة الخدمات الفعلية.',
    'Update consultation fees periodically to match the actual cost of services.',
  ),
  tip3: localizedText(
    'تأكد من وجود رقم تواصل مباشر لكل فرع ليسهل على المرضى الحجز.',
    'Make sure each branch has a direct contact number to make booking easier for patients.',
  ),
  clinicFormsUnsupported: localizedText(
    'يمكنك عرض عياداتك وإدارتها من هنا.',
    'You can view and manage your clinic list here.',
  ),
  deleteConfirm: localizedText('هل أنت متأكد من حذف هذه العيادة نهائياً؟', 'Are you sure you want to permanently delete this clinic?'),
  countDesc: (count, avail) => ({
    ar: `${count} عيادات · ${avail} متاحة اليوم`,
    en: `${count} clinics · ${avail} available today`,
  }),
};

export default function DoctorClinics() {
  const { text } = useLocalizedContent();
  const [clinics, setClinics] = useState([]);
  const [ui, setUi] = useState({ loading: true, error: '', notice: '' });
  const [editingClinic, setEditingClinic] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const loadClinics = () => {
    setUi({ loading: true, error: '', notice: '' });
    medoraApi.doctorClinics()
      .then((items) => {
        setClinics(Array.isArray(items) ? items.map(mapClinic) : []);
        setUi({ loading: false, error: '', notice: '' });
      })
      .catch((error) => {
        setClinics([]);
        setUi({ loading: false, error: error.message || 'Unable to load clinics', notice: '' });
      });
  };

  useEffect(() => {
    queueMicrotask(() => loadClinics());
  }, []);

  const handleAdd = () => {
    setEditingClinic(null);
    setShowForm(true);
  };

  const handleEdit = (clinic) => {
    setEditingClinic(clinic);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(text(COPY.deleteConfirm))) return;
    
    setUi({ loading: true, error: '', notice: '' });
    try {
      await medoraApi.deleteDoctorClinic(id);
      loadClinics();
    } catch (error) {
      setUi({ loading: false, error: error.message || 'Unable to delete clinic', notice: '' });
    }
  };

  const availCount = clinics.filter((c) => c.status === 'available').length;
  const descObj = COPY.countDesc(clinics.length, availCount);

  return (
    <DoctorLayout title={COPY.title} subtitle={COPY.subtitle}>
      <SectionCard
        title={COPY.myClinicTitle}
        description={text(descObj)}
        icon={Stethoscope}
        action={
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#14b8a6] px-4 py-2 text-[12px] font-bold text-white shadow-[0_8px_20px_rgba(20,184,166,0.3)] transition hover:bg-[#119a8a]"
          >
            <Plus size={13} />
            {text(COPY.addClinic)}
          </button>
        }
      >
        {ui.error && <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">{ui.error}</div>}
        {ui.notice && <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">{ui.notice}</div>}
        {ui.loading && <div className="mb-4 rounded-xl bg-[#e6f7f7] px-4 py-3 text-xs font-semibold text-[#0e7c6e]">...</div>}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {clinics.map((clinic) => (
            <ClinicCard
              key={clinic.id}
              clinic={clinic}
              onEdit={() => handleEdit(clinic)}
              onDelete={() => handleDelete(clinic.id)}
            />
          ))}
        </div>
        {clinics.length === 0 && !ui.loading && (
          <div className="rounded-2xl border border-dashed border-[#cfe4e2] bg-[#f7fbfb] p-6 text-center text-[12px] font-bold text-[#486466]">
            {text(localizedText('لا توجد عيادات مسجلة حتى الآن.', 'No clinics registered yet.'))}
          </div>
        )}
      </SectionCard>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <SectionCard title={COPY.weeklyScheduleTitle} description={COPY.weeklyScheduleDesc} icon={Clock}>
          <WeeklySchedule clinics={clinics} />
        </SectionCard>

        <SectionCard title={COPY.tipsTitle} icon={Stethoscope}>
          <ul className="flex flex-col gap-3 text-[12px] leading-7 text-slate-600">
            {[
              { num: 1, bg: '#e6f7f7', color: '#0e7c6e', text: COPY.tip1 },
              { num: 2, bg: '#eef4ff', color: '#2465b6', text: COPY.tip2 },
              { num: 3, bg: '#fff4e6', color: '#a35a00', text: COPY.tip3 },
            ].map((tip) => (
              <TipItem key={tip.num} {...tip} />
            ))}
          </ul>
        </SectionCard>
      </div>

      {showForm && (
        <ClinicFormModal
          clinic={editingClinic}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            loadClinics();
          }}
        />
      )}
    </DoctorLayout>
  );
}

function TipItem({ num, bg, color, text: tipText }) {
  const { text } = useLocalizedContent();
  return (
    <li className="flex items-start gap-2">
      <span
        className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black"
        style={{ background: bg, color }}
      >
        {num}
      </span>
      {text(tipText)}
    </li>
  );
}

function ClinicCard({ clinic, onEdit, onDelete }) {
  const { text } = useLocalizedContent();
  const dayLabels = clinic.days
    .map((d) => WEEK_DAYS.find((w) => w.id === d)?.label)
    .filter(Boolean);
  const available = clinic.status === 'available';

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#e4eeee] bg-white shadow-[0_8px_24px_rgba(41,93,96,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(41,93,96,0.12)]">
      <div
        className="border-b border-[#e4eeee] px-4 py-3"
        style={{
          background: `linear-gradient(135deg, ${available ? 'rgba(20,184,166,0.08)' : 'rgba(100,116,139,0.08)'} 0%, rgba(255,255,255,1) 100%)`,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 text-start">
            <div className="flex items-center justify-start gap-2">
              <h3 className="text-[14px] font-black text-[#084036]">{text(clinic.name)}</h3>
              {clinic.type && (
                <span className="rounded-full bg-[#14b8a6] px-2 py-0.5 text-[10px] font-bold text-white">
                  {text(clinic.type)}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold transition"
            style={
              available
                ? { background: 'rgba(20,184,166,0.15)', color: '#0e7c6e' }
                : { background: '#f3f4f6', color: '#64748b' }
            }
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: available ? '#0e7c6e' : '#64748b' }} />
            {text(available ? COPY.available : COPY.unavailable)}
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4 py-4">
        <div className="flex items-start gap-2">
          <MapPin size={13} className="mt-0.5 shrink-0 text-[#14b8a6]" />
          <p className="text-[11px] leading-6 text-slate-600">{text(clinic.address)}</p>
        </div>

        <div className="flex items-center gap-2">
          <Clock size={13} className="text-[#14b8a6]" />
          <p className="text-[11px] font-bold text-[#084036]" dir="ltr">
            {text(clinic.workingHours)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <DollarSign size={13} className="text-[#14b8a6]" />
          <p className="text-[11px] font-bold text-[#084036]">{clinic.fee} {text(COPY.feeSuffix)}</p>
        </div>

        <div className="flex flex-wrap justify-end gap-1 pt-1">
          {dayLabels.map((day, i) => (
            <span
              key={i}
              className="rounded-full bg-[#e6f7f7] px-2 py-0.5 text-[10px] font-bold text-[#0e7c6e]"
            >
              {text(day)}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-[#e4eeee] bg-[#f7fbfb] px-4 py-3">
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#e4eeee] bg-white text-[#d14f4f] transition hover:border-[#d14f4f]"
        >
          <Trash2 size={13} />
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#e4eeee] bg-white text-[#295d60] transition hover:border-[#14b8a6]"
        >
          <Edit2 size={13} />
        </button>
        <a
          href={`tel:${clinic.phone}`}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#14b8a6] py-2 text-[12px] font-extrabold text-white transition hover:bg-[#119a8a]"
        >
          <Phone size={13} />
          {text(COPY.callToBook)}
        </a>
      </div>
    </div>
  );
}

function WeeklySchedule({ clinics }) {
  const { text } = useLocalizedContent();

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#e4eeee]">
      <table className="w-full min-w-[760px] table-fixed border-collapse">
        <colgroup>
          <col style={{ width: '15.66%' }} />
          {WEEK_DAYS.map((day) => (
            <col key={day.id} style={{ width: '12.05%' }} />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b border-[#e4eeee] bg-[#f7fbfb] text-[10px] font-extrabold text-[#486466]">
            <th className="px-3 py-2 text-start">{text(COPY.clinicCol)}</th>
            {WEEK_DAYS.map((day) => (
              <th key={day.id} className="px-2 py-2 text-center">
                {text(day.label)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {clinics.map((clinic) => (
            <tr key={clinic.id} className="border-b border-[#f1f7f7] last:border-b-0">
              <td className="px-3 py-3 text-start text-[11px] font-extrabold text-[#084036]">
                {text(clinic.name)}
              </td>
              {WEEK_DAYS.map((day) => {
                const active = clinic.days.includes(day.id);
                return (
                  <td key={day.id} className="px-2 py-3 text-center align-middle">
                  <span
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black"
                    style={
                      active
                        ? { background: '#14b8a6', color: '#ffffff' }
                        : { background: '#f1f7f7', color: '#cbd4d5' }
                    }
                  >
                    {active ? '✓' : '—'}
                  </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
