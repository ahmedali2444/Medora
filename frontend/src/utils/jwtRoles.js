function decodeJwtPayload(token) {
  try {
    const payload = token?.split('.')?.[1];
    if (!payload || typeof window === 'undefined') return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(window.atob(padded));
  } catch {
    return null;
  }
}

export function getJwtRoles(token) {
  const payload = decodeJwtPayload(token);
  const roleClaims = [
    payload?.role,
    payload?.roles,
    payload?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'],
  ];
  return roleClaims.flatMap((value) => Array.isArray(value) ? value : value ? [value] : []).map((role) => String(role).toLowerCase());
}
