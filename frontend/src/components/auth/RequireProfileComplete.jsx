import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getUserRoles } from "../../utils/userDestination";

function patientProfileIncomplete(user) {
  if (user?.needsProfileCompletion != null) return user.needsProfileCompletion;
  return !user?.fullName || !user?.fullNameEn || !user?.phoneNumber || !user?.dateOfBirth;
}

export default function RequireProfileComplete({ children }) {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) return children;
  if (location.pathname.startsWith("/complete-profile")) return children;

  const roles = getUserRoles(user);
  const role = (roles[0] || user?.role || "").toLowerCase();
  if (role !== "patient") return children;

  if (patientProfileIncomplete(user)) {
    return <Navigate to="/complete-profile/patient" replace state={{ from: location }} />;
  }

  return children;
}
