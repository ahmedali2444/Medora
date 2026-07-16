import { toDateKey } from './professionalApiMappers';

export function getWeekDateRange(referenceDate = new Date()) {
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);
  const dayOffset = (start.getDay() + 1) % 7;
  start.setDate(start.getDate() - dayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { dateFrom: toDateKey(start), dateTo: toDateKey(end) };
}

export function canPatientCancelAppointment(scheduledAt) {
  if (!scheduledAt) return false;
  const appointmentTime = new Date(scheduledAt);
  if (Number.isNaN(appointmentTime.getTime())) return false;
  const hoursUntil = (appointmentTime.getTime() - Date.now()) / (1000 * 60 * 60);
  return hoursUntil > 0;
}

export function hoursUntilAppointment(scheduledAt) {
  if (!scheduledAt) return null;
  const appointmentTime = new Date(scheduledAt);
  if (Number.isNaN(appointmentTime.getTime())) return null;
  return (appointmentTime.getTime() - Date.now()) / (1000 * 60 * 60);
}

const STATUS_API_MAP = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function buildDoctorAppointmentQuery({
  tab,
  dateKeys,
  status = 'all',
  search = '',
  page = 1,
  pageSize = 25,
}) {
  const params = { page, pageSize, sort: tab === 'past' ? 'desc' : 'asc' };

  if (tab === 'today') {
    params.dateFrom = dateKeys.today;
    params.dateTo = dateKeys.today;
  } else if (tab === 'tomorrow') {
    params.dateFrom = dateKeys.tomorrow;
    params.dateTo = dateKeys.tomorrow;
  } else if (tab === 'past') {
    params.beforeDate = dateKeys.today;
    params.sort = 'desc';
  }

  if (status !== 'all' && STATUS_API_MAP[status]) {
    params.status = STATUS_API_MAP[status];
  }

  const trimmedSearch = String(search || '').trim();
  if (trimmedSearch) params.search = trimmedSearch;

  return params;
}

export async function fetchAllPaginated(fetchPage, { pageSize = 500, maxPages = 20 } = {}) {
  let page = 1;
  const all = [];
  let total = Infinity;

  while (all.length < total && page <= maxPages) {
    const data = await fetchPage(page, pageSize);
    const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    total = Number.isFinite(Number(data?.total)) ? Number(data.total) : items.length;
    all.push(...items);
    if (items.length < pageSize || all.length >= total) break;
    page += 1;
  }

  return { items: all, total };
}
