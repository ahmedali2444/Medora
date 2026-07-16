import { getToken } from '../api/client';
import { getJwtRoles } from './jwtRoles';

export const PATIENT_PROFILE_PATH = '/patient/settings';

export function getUserRoles(user) {
  return [
    user?.role,
    user?.accountType,
    ...(Array.isArray(user?.roles) ? user.roles : []),
    ...getJwtRoles(user?.token || getToken()),
  ]
    .filter(Boolean)
    .map((role) => String(role).toLowerCase());
}

export function getPrimaryDashboardRole(user) {
  const roles = getUserRoles(user);
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('doctor')) return 'doctor';
  if (roles.includes('pharmacy') || roles.includes('pharmacist')) return 'pharmacy';
  return null;
}

export function canAccessPatientPortal(user) {
  const roles = getUserRoles(user);
  return Boolean(user) && (roles.includes('patient') || (!roles.includes('admin') && !roles.includes('doctor') && !roles.includes('pharmacy') && !roles.includes('pharmacist')));
}

export function shouldShowPatientProfileLink(user) {
  if (!user) return false;
  const dashboardRole = getPrimaryDashboardRole(user);
  return !dashboardRole && canAccessPatientPortal(user);
}

export function getUserDestination(user) {
  const dashboardRole = getPrimaryDashboardRole(user);
  if (dashboardRole === 'admin') return '/admin/overview';
  if (dashboardRole === 'doctor') return '/doctor/overview';
  if (dashboardRole === 'pharmacy') return '/pharmacy/overview';
  if (canAccessPatientPortal(user)) return PATIENT_PROFILE_PATH;
  return '/';
}

export function getDashboardMenuItem(user, isRtl = false) {
  const dashboardRole = getPrimaryDashboardRole(user);
  if (!dashboardRole) return null;
  const copy = {
    admin: isRtl ? 'لوحة الإدارة' : 'Admin dashboard',
    doctor: isRtl ? 'لوحة الطبيب' : 'Doctor dashboard',
    pharmacy: isRtl ? 'لوحة الصيدلي' : 'Pharmacist dashboard',
  };
  return { role: dashboardRole, href: getUserDestination(user), label: copy[dashboardRole] };
}

export function hasDashboardDestination(user) {
  return Boolean(getPrimaryDashboardRole(user));
}
