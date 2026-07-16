import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canAccessPatientPortal, getUserRoles } from '../../utils/userDestination';

export default function RequireRole({ role, children }) {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace state={{ from: location }} />;
  }

  const requestedRole = role?.toLowerCase();
  const roles = getUserRoles(user);
  const allowed =
    !requestedRole ||
    roles.includes(requestedRole) ||
    (requestedRole === 'patient' && canAccessPatientPortal(user));

  if (!allowed) {
    return <Navigate to="/sign-in" replace state={{ from: location }} />;
  }

  return children;
}
