import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  BarChart2,
  CalendarCheck,
  ClipboardList,
  DollarSign,
  MessagesSquare,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react';
import DoctorLayout from '../../components/doctor/layout/DoctorLayout';
import KpiCard from '../../components/doctor/shared/KpiCard';
import SectionCard from '../../components/doctor/shared/SectionCard';
import StatusPill from '../../components/doctor/shared/StatusPill';
import { useLocalizedContent } from '../../hooks/useLocalizedContent';
import {
  formatLocalizedDate,
  formatLocalizedNumber,
  localizedText,
} from '../../utils/localization';
import {
  DOCTOR_KPIS,
  computeRatingBreakdown,
} from '../../components/doctor/data/doctorData';
import { fetchAllPaginated } from '../../utils/appointmentHelpers';
import { medoraApi } from '../../api/medoraApi';
import {
  mapAppointment,
  mapDoctorProfile,
  mapReview,
  offsetDateKey,
  toDateKey,
} from '../../utils/professionalApiMappers';

const COPY = {
  title: localizedText('لوحة التحكم', 'Dashboard'),
  subtitle: localizedText('مرحبًا بعودتك · إليك نظرة سريعة على يومك', 'Welcome back · Here\'s a quick overview of your day'),
  hello: localizedText('مرحبًا', 'Hello'),
  todayScheduleBtn: localizedText('جدول اليوم', 'Today\'s schedule'),
  patients: localizedText('المرضى', 'Patients'),
  weeklyAppts: localizedText('المواعيد الأسبوعية', 'Weekly appointments'),
  weeklyApptsDesc: localizedText('عدد المواعيد المؤكّدة لكل يوم خلال الأسبوع الحالي', 'Confirmed appointments per day this week'),
  viewAll: localizedText('عرض الكل', 'View all'),
  recentActivity: localizedText('النشاط الأخير', 'Recent activity'),
  recentActivityDesc: localizedText('تحديثات لحظية على المواعيد والتقييمات', 'Real-time updates on appointments and reviews'),
  todaySchedule: localizedText('جدول اليوم', 'Today\'s schedule'),
  todayScheduleDesc: localizedText('مواعيد اليوم بترتيب زمني', 'Today\'s appointments in chronological order'),
  allAppointments: localizedText('كل المواعيد', 'All appointments'),
  patientReviews: localizedText('تقييمات المرضى', 'Patient reviews'),
  reviewsSummary: localizedText('ملخّص لتقييماتك الأخيرة', 'Summary of your recent reviews'),
  allReviews: localizedText('كل التقييمات', 'All reviews'),
  timeLabel: localizedText('الساعة', 'Time'),
  reviewsCount: localizedText('تقييم', 'reviews'),
  noAppointments: localizedText('لا توجد مواعيد اليوم', 'No appointments today'),
  analyticsTitle: localizedText('تحليلات متقدمة', 'Advanced Analytics'),
  analyticsDesc: localizedText('مقارنة أداء العيادة وأوقات الذروة', 'Clinic performance comparison and peak hours'),
  thisWeek: localizedText('هذا الأسبوع', 'This week'),
  lastWeek: localizedText('الأسبوع الماضي', 'Last week'),
  peakHours: localizedText('أوقات الذروة', 'Peak hours'),
  morning: localizedText('صباح', 'Morning'),
  afternoon: localizedText('ظهر', 'Afternoon'),
  evening: localizedText('مساء', 'Evening'),
  night: localizedText('ليل', 'Night'),
  newPatients: localizedText('مرضى جدد', 'New patients'),
  returningPatients: localizedText('متابعون', 'Returning'),
  patientsMix: localizedText('توزيع المرضى', 'Patient mix'),
};

const KPI_ICONS = {
  'patients-today': Users,
  appointments: CalendarCheck,
  revenue: DollarSign,
  rating: Star,
};

const KPI_TONES = {
  'patients-today': '#14b8a6',
  appointments: '#6366f1',
  revenue: '#f59e0b',
  rating: '#ec4899',
};

const COUNTED_APPOINTMENT_STATUSES = new Set(['confirmed', 'completed']);
const REVENUE_APPOINTMENT_STATUSES = new Set(['completed']);

const ACTIVITY_META = {
  appointment: { bg: '#e6f7f7', color: '#0e7c6e', Icon: CalendarCheck },
  review: { bg: '#fff4e6', color: '#a35a00', Icon: Star },
  prescription: { bg: '#eef4ff', color: '#2465b6', Icon: ClipboardList },
  cancel: { bg: '#fdecec', color: '#c2362f', Icon: Activity },
};

function percentDelta(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0 || current === previous) {
    return { delta: '', positive: current >= previous };
  }

  const diff = ((current - previous) / previous) * 100;
  const rounded = Math.round(Math.abs(diff));
  if (rounded === 0) return { delta: '', positive: current >= previous };

  return {
    delta: `${diff > 0 ? '+' : '-'}${rounded}%`,
    positive: diff >= 0,
  };
}

function shiftDateKey(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

function weekBounds(dateKey, offsetWeeks = 0) {
  const current = new Date(`${dateKey}T00:00:00`);
  const start = new Date(current);
  const dayOffset = (current.getDay() + 1) % 7;
  start.setDate(current.getDate() - dayOffset + (offsetWeeks * 7));
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { startKey: toDateKey(start), endKey: toDateKey(end) };
}

function monthBounds(dateKey, offsetMonths = 0) {
  const current = new Date(`${dateKey}T00:00:00`);
  const start = new Date(current.getFullYear(), current.getMonth() + offsetMonths, 1);
  const end = new Date(current.getFullYear(), current.getMonth() + offsetMonths + 1, 1);
  return { startKey: toDateKey(start), endKey: toDateKey(end) };
}

function inRange(dateKey, startKey, endKey) {
  return dateKey >= startKey && dateKey < endKey;
}

function isCountedAppointment(appointment) {
  return COUNTED_APPOINTMENT_STATUSES.has(appointment.status);
}

function isRevenueAppointment(appointment) {
  return REVENUE_APPOINTMENT_STATUSES.has(appointment.status);
}

function countUniquePatients(appointments, predicate) {
  return new Set(
    appointments
      .filter((appointment) => predicate(appointment))
      .map((appointment) => appointment.patientId)
      .filter(Boolean),
  ).size;
}

function sumRevenue(appointments, predicate) {
  return appointments
    .filter((appointment) => predicate(appointment))
    .reduce((total, appointment) => total + (Number(appointment.price) || 0), 0);
}

function WeeklyBars({ data }) {
  const { text } = useLocalizedContent();
  const max = Math.max(1, ...data.map((d) => d.count));
  const minBarHeight = 26;
  const maxBarHeight = 156;

  return (
    <div className="grid grid-cols-7 items-end gap-2 px-1 sm:gap-3 sm:px-2">
      {data.map((d, i) => {
        const ratio = max > 0 ? d.count / max : 0;
        const barHeight = d.count > 0
          ? Math.round(minBarHeight + ratio * (maxBarHeight - minBarHeight))
          : minBarHeight;

        return (
          <div key={d.id || i} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-40 w-full items-end rounded-[18px] bg-gradient-to-t from-[#edf6f5] to-transparent px-1 sm:h-44">
              <div
                className="flex w-full items-start justify-center rounded-t-[14px] bg-gradient-to-b from-[#18c2b0] via-[#12ad9d] to-[#0e7c6e] pt-2 shadow-[0_10px_22px_rgba(20,184,166,0.22)] transition-all duration-300 hover:from-[#1bd1be] hover:to-[#119a8a]"
                style={{ height: `${barHeight}px` }}
              >
                <div className="text-center text-[10px] font-black text-white">{d.count}</div>
              </div>
            </div>
            <div className="text-[10px] font-bold text-[#486466] sm:text-[11px]">{text(d.day)}</div>
          </div>
        );
      })}
    </div>
  );
}

// SVG Dual‑Line Chart (this week vs last week)
function DualLineChart({ thisWeek, lastWeek, labels }) {
  const { text } = useLocalizedContent();
  const W = 320; const H = 110; const PAD = 16;
  const maxVal = Math.max(1, ...thisWeek, ...lastWeek);
  const pts = (arr) => arr.map((v, i) => {
    const x = PAD + (i / (arr.length - 1 || 1)) * (W - PAD * 2);
    const y = H - PAD - (v / maxVal) * (H - PAD * 2);
    return `${x},${y}`;
  }).join(' ');
  const circles = (arr, color) => arr.map((v, i) => {
    const x = PAD + (i / (arr.length - 1 || 1)) * (W - PAD * 2);
    const y = H - PAD - (v / maxVal) * (H - PAD * 2);
    return <circle key={i} cx={x} cy={y} r={3.5} fill={color} stroke="white" strokeWidth={1.5} />;
  });
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 110 }}>
        <defs>
          <linearGradient id="lgThis" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
          <line key={i} x1={PAD} y1={PAD + f * (H - PAD * 2)} x2={W - PAD} y2={PAD + f * (H - PAD * 2)}
            stroke="#e4eeee" strokeWidth={1} />
        ))}
        {/* area fill this week */}
        {thisWeek.length > 1 && (
          <polygon
            points={`${PAD},${H - PAD} ${pts(thisWeek)} ${W - PAD},${H - PAD}`}
            fill="url(#lgThis)"
          />
        )}
        {/* lines */}
        {thisWeek.length > 1 && <polyline points={pts(thisWeek)} fill="none" stroke="#14b8a6" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}
        {lastWeek.length > 1 && <polyline points={pts(lastWeek)} fill="none" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5,4" strokeLinejoin="round" strokeLinecap="round" />}
        {circles(thisWeek, '#14b8a6')}
        {circles(lastWeek, '#94a3b8')}
      </svg>
      {/* x-axis labels */}
      <div className="flex justify-between px-4 mt-1">
        {labels.map((l, i) => <span key={i} className="text-[9px] font-bold text-slate-400">{text(l)}</span>)}
      </div>
      <div className="mt-2 flex items-center gap-4 px-1">
        <span className="flex items-center gap-1 text-[10px] font-bold text-[#14b8a6]"><span className="inline-block h-1.5 w-4 rounded-full bg-[#14b8a6]" />{text({ ar: 'هذا الأسبوع', en: 'This week' })}</span>
        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400"><span className="inline-block h-1.5 w-4 rounded-full bg-slate-300" />{text({ ar: 'الأسبوع الماضي', en: 'Last week' })}</span>
      </div>
    </div>
  );
}

// SVG Peak‑Hours Bar Chart
function PeakHoursBar({ data }) {
  const { text } = useLocalizedContent();
  const maxV = Math.max(1, ...data.map((d) => d.count));
  const colors = ['#f59e0b', '#14b8a6', '#6366f1', '#0e7c6e'];
  return (
    <div className="flex items-end gap-3 pt-2">
      {data.map((d, i) => {
        const pct = (d.count / maxV) * 100;
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-[10px] font-black" style={{ color: colors[i] }}>{d.count}</span>
            <div className="w-full rounded-t-xl transition-all duration-500" style={{ height: `${Math.max(10, pct * 0.8)}px`, background: colors[i], opacity: 0.85 }} />
            <span className="text-[9px] font-bold text-slate-500">{text(d.label)}</span>
          </div>
        );
      })}
    </div>
  );
}

// SVG Donut Chart (new vs returning)
function DonutChart({ newCount, returningCount }) {
  const { text } = useLocalizedContent();
  const total = newCount + returningCount || 1;
  const r = 36; const cx = 50; const cy = 50;
  const circ = 2 * Math.PI * r;
  const newPct = newCount / total;
  const newDash = newPct * circ;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="w-20 h-20 shrink-0" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e4eeee" strokeWidth={12} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#14b8a6" strokeWidth={12}
          strokeDasharray={`${newDash} ${circ - newDash}`} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#6366f1" strokeWidth={12}
          strokeDasharray={`${circ - newDash} 0`} strokeDashoffset={-newDash} strokeLinecap="round" />
      </svg>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#14b8a6]" />
          <span className="text-[11px] font-bold text-slate-600">{text({ ar: 'جدد', en: 'New' })} — {newCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#6366f1]" />
          <span className="text-[11px] font-bold text-slate-600">{text({ ar: 'متابعون', en: 'Returning' })} — {returningCount}</span>
        </div>
      </div>
    </div>
  );
}

export default function DoctorOverview() {
  const navigate = useNavigate();
  const { lang, text } = useLocalizedContent();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [apiError, setApiError] = useState('');
  const [todayKey, setTodayKey] = useState(() => offsetDateKey(0));

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      medoraApi.doctorMe(),
      medoraApi.doctorStats(),
      fetchAllPaginated(
        (page, pageSize) => medoraApi.appointments({
          page,
          pageSize,
          dateFrom: shiftDateKey(offsetDateKey(0), -30),
          dateTo: shiftDateKey(offsetDateKey(0), 30),
          sort: 'desc',
        }),
        { pageSize: 500 },
      ),
      medoraApi.doctorReviews(),
    ]).then(([profileResult, statsResult, appointmentsResult, reviewsResult]) => {
      if (!mounted) return;
      if (profileResult.status === 'fulfilled') setProfile(profileResult.value);
      if (statsResult.status === 'fulfilled') setStats(statsResult.value);
      if (appointmentsResult.status === 'fulfilled') {
        setAppointments(appointmentsResult.value.items.map(mapAppointment));
      }
      if (reviewsResult.status === 'fulfilled') {
        setReviews(Array.isArray(reviewsResult.value) ? reviewsResult.value.map((review) => mapReview(review)) : []);
      }
      const failed = [profileResult, statsResult, appointmentsResult, reviewsResult].find((result) => result.status === 'rejected');
      if (failed?.reason?.status === 404 && failed.reason.message.toLowerCase().includes('not found')) {
        navigate('/complete-profile/doctor', { replace: true });
        return;
      }
      setApiError(failed?.reason?.message || '');
    });
    return () => { mounted = false; };
  }, [navigate]);

  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 1, 0);
    const timeout = window.setTimeout(() => {
      setTodayKey(offsetDateKey(0));
    }, Math.max(1000, nextMidnight.getTime() - now.getTime()));

    return () => window.clearTimeout(timeout);
  }, [todayKey]);

  const doctorProfile = useMemo(() => mapDoctorProfile(profile, stats), [profile, stats]);

  const kpis = useMemo(() => DOCTOR_KPIS.map((kpi) => {
    const yesterdayKey = shiftDateKey(todayKey, -1);
    const currentWeek = weekBounds(todayKey);
    const previousWeek = weekBounds(todayKey, -1);
    const currentMonth = monthBounds(todayKey);
    const previousMonth = monthBounds(todayKey, -1);

    const patientsToday = stats?.todayPatientsCount ?? countUniquePatients(
      appointments,
      (appointment) => appointment.date === todayKey && isCountedAppointment(appointment),
    );
    const patientsYesterday = countUniquePatients(
      appointments,
      (appointment) => appointment.date === yesterdayKey && isCountedAppointment(appointment),
    );
    const weeklyAppointments = stats?.weeklyAppointmentsCount ?? appointments.filter(
      (appointment) => inRange(appointment.date, currentWeek.startKey, currentWeek.endKey) && isCountedAppointment(appointment),
    ).length;
    const previousWeeklyAppointments = appointments.filter(
      (appointment) => inRange(appointment.date, previousWeek.startKey, previousWeek.endKey) && isCountedAppointment(appointment),
    ).length;
    const monthlyRevenue = Number(stats?.monthlyRevenue ?? sumRevenue(
      appointments,
      (appointment) => inRange(appointment.date, currentMonth.startKey, currentMonth.endKey) && isRevenueAppointment(appointment),
    ));
    const previousMonthlyRevenue = sumRevenue(
      appointments,
      (appointment) => inRange(appointment.date, previousMonth.startKey, previousMonth.endKey) && isRevenueAppointment(appointment),
    );

    const computed = {
      'patients-today': {
        value: patientsToday,
        ...percentDelta(patientsToday, patientsYesterday),
      },
      appointments: {
        value: weeklyAppointments,
        ...percentDelta(weeklyAppointments, previousWeeklyAppointments),
      },
      revenue: {
        value: monthlyRevenue,
        ...percentDelta(monthlyRevenue, previousMonthlyRevenue),
      },
      rating: {
        value: stats?.avgRating ?? 0,
        delta: '',
        positive: true,
      },
    };

    return { ...kpi, ...(computed[kpi.id] || {}) };
  }), [appointments, stats, todayKey]);

  const todaySchedule = useMemo(
    () => appointments
      .filter((a) => a.date === todayKey && a.status !== 'cancelled')
      .sort((a, b) => a.time.localeCompare(b.time))
      .slice(0, 5),
    [appointments, todayKey],
  );

  const weeklyChart = useMemo(() => {
    const now = new Date(`${todayKey}T00:00:00`);
    const start = new Date(now);
    const dayOffset = (now.getDay() + 1) % 7;
    start.setDate(now.getDate() - dayOffset); // Start on Saturday
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = toDateKey(date);
      return {
        id: key,
        day: localizedText(
          date.toLocaleDateString('ar-EG', { weekday: 'short' }),
          date.toLocaleDateString('en-US', { weekday: 'short' }),
        ),
        count: appointments.filter((a) => a.date === key && isCountedAppointment(a)).length,
      };
    });
  }, [appointments, todayKey]);

  const recentActivity = useMemo(() => {
    const recentAppointments = appointments
      .slice()
      .sort((a, b) => String(b.createdAt || b.date).localeCompare(String(a.createdAt || a.date)))
      .slice(0, 3)
      .map((appointment) => ({
      id: `appointment-${appointment.id}`,
      kind: appointment.status === 'cancelled' ? 'cancel' : 'appointment',
      text: localizedText(
        `${appointment.status === 'cancelled' ? 'إلغاء موعد' : 'موعد'} — ${appointment.patient.ar}`,
        `${appointment.status === 'cancelled' ? 'Cancelled appointment' : 'Appointment'} - ${appointment.patient.en}`,
      ),
      time: localizedText(formatLocalizedDate(appointment.date, 'ar'), formatLocalizedDate(appointment.date, 'en')),
    }));
    const recentReviews = reviews.slice(0, 2).map((review) => ({
      id: `review-${review.id}`,
      kind: 'review',
      text: localizedText(`تقييم جديد ${review.rating} نجوم`, `New ${review.rating}-star review`),
      time: localizedText(formatLocalizedDate(review.date, 'ar'), formatLocalizedDate(review.date, 'en')),
    }));
    return [...recentAppointments, ...recentReviews].slice(0, 5);
  }, [appointments, reviews]);

  const ratingBreakdown = useMemo(() => computeRatingBreakdown(reviews), [reviews]);
  const latestReview = reviews[0];

  const analyticsData = useMemo(() => {
    // Current week vs previous week
    const now = new Date(`${todayKey}T00:00:00`);
    const weekStart = new Date(now);
    const dayOffset = (now.getDay() + 1) % 7;
    weekStart.setDate(now.getDate() - dayOffset);
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(weekStart.getDate() - 7);

    const days7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
      const key = toDateKey(d);
      const label = localizedText(
        d.toLocaleDateString('ar-EG', { weekday: 'short' }),
        d.toLocaleDateString('en-US', { weekday: 'short' }),
      );
      const thisCount = appointments.filter((a) => a.date === key && isCountedAppointment(a)).length;
      const prevKey = toDateKey(new Date(prevWeekStart.getFullYear(), prevWeekStart.getMonth(), prevWeekStart.getDate() + i));
      const prevCount = appointments.filter((a) => a.date === prevKey && isCountedAppointment(a)).length;
      return { label, thisCount, prevCount };
    });

    // Peak hours
    const peakBuckets = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    appointments.forEach((a) => {
      const h = parseInt(a.time?.split(':')[0] || '0', 10);
      if (h >= 6 && h < 12) peakBuckets.morning++;
      else if (h >= 12 && h < 17) peakBuckets.afternoon++;
      else if (h >= 17 && h < 21) peakBuckets.evening++;
      else peakBuckets.night++;
    });
    const peakHours = [
      { label: localizedText('صباح', 'Morning'), count: peakBuckets.morning },
      { label: localizedText('ظهر', 'Afternoon'), count: peakBuckets.afternoon },
      { label: localizedText('مساء', 'Evening'), count: peakBuckets.evening },
      { label: localizedText('ليل', 'Night'), count: peakBuckets.night },
    ];

    // New vs returning patients
    const patientVisitCounts = {};
    appointments.filter(isCountedAppointment).forEach((a) => {
      if (a.patientId) patientVisitCounts[a.patientId] = (patientVisitCounts[a.patientId] || 0) + 1;
    });
    const newCount = Object.values(patientVisitCounts).filter((c) => c === 1).length;
    const returningCount = Object.values(patientVisitCounts).filter((c) => c > 1).length;

    return { days7, peakHours, newCount, returningCount };
  }, [appointments, todayKey]);

  return (
    <DoctorLayout title={COPY.title} subtitle={COPY.subtitle}>
      <div
        className="mb-6 overflow-hidden rounded-3xl border border-[#d7e7e5] bg-gradient-to-l from-[#0b5e52] via-[#119a8a] to-[#14b8a6] p-6 text-white shadow-[0_22px_60px_rgba(8,94,82,0.3)] sm:p-7"
        style={{ fontFamily: 'Cairo, sans-serif' }}
      >
        <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-2xl ring-4 ring-white/30">
              <img src={doctorProfile.avatar} alt="" className="h-full w-full object-cover" />
            </div>
            <div>
              <div className="text-[11px] text-white/70">{text(COPY.hello)}</div>
              <h2 className="text-[20px] font-black sm:text-[24px]">{text(doctorProfile.name)}</h2>
              <p className="mt-1 text-[12px] text-white/80">{text(doctorProfile.title)}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate('/doctor/appointments')}
              className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-[12px] font-bold text-white backdrop-blur transition hover:bg-white/25"
            >
              <CalendarCheck size={14} />
              {text(COPY.todayScheduleBtn)}
            </button>
            <button
              onClick={() => navigate('/doctor/patients')}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[12px] font-bold text-[#119a8a] transition hover:bg-[#f3fafa]"
            >
              <Users size={14} />
              {text(COPY.patients)}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const numericValue =
            typeof kpi.value === 'number'
              ? kpi.value
              : Number(String(kpi.value).replace(/,/g, ''));
          const value =
            Number.isFinite(numericValue) && String(kpi.value).trim() !== ''
              ? formatLocalizedNumber(numericValue, lang, {
                  maximumFractionDigits: kpi.id === 'rating' ? 1 : 0,
                  minimumFractionDigits: kpi.id === 'rating' ? 1 : 0,
                })
              : kpi.value;

          return (
            <KpiCard
              key={kpi.id}
              {...kpi}
              value={value}
              Icon={KPI_ICONS[kpi.id]}
              tone={KPI_TONES[kpi.id]}
            />
          );
        })}
      </div>

      {apiError && <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">{apiError}</div>}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <SectionCard
          className="min-w-0"
          title={COPY.weeklyAppts}
          description={COPY.weeklyApptsDesc}
          icon={Activity}
          action={
            <button
              onClick={() => navigate('/doctor/appointments')}
              className="inline-flex items-center gap-1 rounded-full bg-[#e6f7f7] px-3 py-1.5 text-[11px] font-bold text-[#119a8a] transition hover:bg-[#d0efed]"
            >
              {text(COPY.viewAll)}
              <ArrowUpRight size={11} />
            </button>
          }
        >
          <WeeklyBars data={weeklyChart} />
        </SectionCard>

        <SectionCard
          className="min-w-0"
          title={COPY.recentActivity}
          description={COPY.recentActivityDesc}
          icon={Activity}
        >
          <ul className="flex flex-col gap-3">
            {recentActivity.map((a) => {
              const meta = ACTIVITY_META[a.kind] || ACTIVITY_META.appointment;
              const ActIcon = meta.Icon;
              return (
                <li key={a.id} className="flex items-start gap-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: meta.bg, color: meta.color }}
                  >
                    <ActIcon size={14} />
                  </span>
                  <div className="flex-1 text-start">
                    <div className="text-[12px] font-bold text-[#084036]">{text(a.text)}</div>
                    <div className="mt-0.5 text-[10px] text-slate-400">{text(a.time)}</div>
                  </div>
                </li>
              );
            })}
            {recentActivity.length === 0 && (
              <li className="rounded-xl bg-[#e6f7f7] p-4 text-center text-[11px] font-bold text-[#0e7c6e]">
                {text(COPY.noAppointments)}
              </li>
            )}
          </ul>
        </SectionCard>
      </div>

      {/* ─── Advanced Analytics Section ─── */}
      <div className="mt-5">
        <SectionCard
          title={{ ar: 'تحليلات متقدمة', en: 'Advanced Analytics' }}
          description={{ ar: 'مقارنة أداء العيادة وأوقات الذروة', en: 'Clinic performance comparison & peak hours' }}
          icon={BarChart2}
        >
          <div className="grid gap-6 md:grid-cols-3">
            {/* Dual Line Chart */}
            <div className="md:col-span-2 min-w-0">
              <div className="mb-2 text-[11px] font-extrabold text-[#084036] flex items-center gap-1.5">
                <TrendingUp size={13} className="text-[#14b8a6]" />
                {text({ ar: 'مواعيد الأسبوع الحالي مقابل الماضي', en: 'This week vs last week' })}
              </div>
              <DualLineChart
                thisWeek={analyticsData.days7.map((d) => d.thisCount)}
                lastWeek={analyticsData.days7.map((d) => d.prevCount)}
                labels={analyticsData.days7.map((d) => d.label)}
              />
            </div>

            {/* Patient Mix Donut */}
            <div className="min-w-0">
              <div className="mb-3 text-[11px] font-extrabold text-[#084036] flex items-center gap-1.5">
                <Users size={13} className="text-[#6366f1]" />
                {text({ ar: 'توزيع المرضى', en: 'Patient mix' })}
              </div>
              <DonutChart
                newCount={analyticsData.newCount}
                returningCount={analyticsData.returningCount}
              />
            </div>
          </div>

          {/* Peak Hours */}
          <div className="mt-5">
            <div className="mb-2 text-[11px] font-extrabold text-[#084036] flex items-center gap-1.5">
              <BarChart2 size={13} className="text-[#f59e0b]" />
              {text({ ar: 'أوقات الذروة', en: 'Peak hours' })}
            </div>
            <div style={{ height: 100 }}>
              <PeakHoursBar data={analyticsData.peakHours} />
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <SectionCard
          className="min-w-0"
          title={COPY.todaySchedule}
          description={COPY.todayScheduleDesc}
          icon={CalendarCheck}
          action={
            <button
              onClick={() => navigate('/doctor/appointments')}
              className="inline-flex items-center gap-1 rounded-full bg-[#e6f7f7] px-3 py-1.5 text-[11px] font-bold text-[#119a8a] transition hover:bg-[#d0efed]"
            >
              {text(COPY.allAppointments)}
              <ArrowUpRight size={11} />
            </button>
          }
        >
          <div className="flex flex-col gap-3">
            {todaySchedule.length === 0 ? (
              <div className="rounded-xl bg-[#e6f7f7] p-4 text-center text-[11px] font-bold text-[#0e7c6e]">
                {text(COPY.noAppointments)}
              </div>
            ) : todaySchedule.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-4 rounded-2xl border border-[#e4eeee] bg-[#f7fbfb] p-3 transition hover:border-[#14b8a6] hover:bg-white"
                >
                  <div className="flex flex-col items-center rounded-xl bg-white px-3 py-2 text-center shadow-[0_4px_14px_rgba(41,93,96,0.06)]">
                    <span className="text-[10px] font-bold text-[#486466]">{text(COPY.timeLabel)}</span>
                    <span className="text-[14px] font-black text-[#119a8a]" dir="ltr">{a.time}</span>
                  </div>

                  <div className="flex-1 text-start">
                    <div className="text-[13px] font-extrabold text-[#084036]">{text(a.patient)}</div>
                    <div className="mt-1 text-[11px] text-slate-500">{text(a.reason)}</div>
                    <div className="mt-1 text-[10px] text-slate-400">{text(a.clinic)}</div>
                  </div>

                  <StatusPill status={a.status} />
                </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          className="min-w-0"
          title={COPY.patientReviews}
          description={COPY.reviewsSummary}
          icon={MessagesSquare}
          action={
            <button
              onClick={() => navigate('/doctor/reviews')}
              className="inline-flex items-center gap-1 rounded-full bg-[#e6f7f7] px-3 py-1.5 text-[11px] font-bold text-[#119a8a] transition hover:bg-[#d0efed]"
            >
              {text(COPY.allReviews)}
              <ArrowUpRight size={11} />
            </button>
          }
        >
          <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-l from-[#f7fbfb] to-white p-3">
            <div className="flex flex-col items-center">
              <div className="text-[30px] font-black text-[#084036]" dir="ltr">
                {formatLocalizedNumber(ratingBreakdown.average, lang, {
                  maximumFractionDigits: 1,
                  minimumFractionDigits: 1,
                })}
              </div>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    size={11}
                    fill={i <= Math.round(ratingBreakdown.average) ? '#f4a524' : '#e4eeee'}
                    color={i <= Math.round(ratingBreakdown.average) ? '#f4a524' : '#e4eeee'}
                  />
                ))}
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500">
                {formatLocalizedNumber(ratingBreakdown.total, lang)} {text(COPY.reviewsCount)}
              </div>
            </div>

            <div className="flex-1">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = ratingBreakdown.breakdown[star] || 0;
                const pct = ratingBreakdown.total > 0 ? (count / ratingBreakdown.total) * 100 : 0;
                return (
                  <div key={star} className="mb-1 flex items-center gap-2">
                    <span className="w-8 text-start text-[10px] font-bold text-[#486466]">
                      {star} ★
                    </span>
                    <div className="h-1.5 flex-1 rounded-full bg-[#eef2f2]">
                      <div
                        className="h-full rounded-full bg-[#14b8a6]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-6 text-start text-[10px] font-bold text-[#486466]">
                      {formatLocalizedNumber(count, lang)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {latestReview && (
            <div className="mt-4 rounded-2xl border border-[#e4eeee] bg-white p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                  {formatLocalizedDate(latestReview.date, lang)}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[12px] font-bold text-[#084036]">{text(latestReview.patient)}</span>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        size={10}
                        fill={i <= latestReview.rating ? '#f4a524' : '#e4eeee'}
                        color={i <= latestReview.rating ? '#f4a524' : '#e4eeee'}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-[11px] leading-6 text-slate-600">"{text(latestReview.comment)}"</p>
            </div>
          )}
        </SectionCard>
      </div>
    </DoctorLayout>
  );
}
