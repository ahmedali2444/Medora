import { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RequireRole from '../components/auth/RequireRole';
import RequireVerifiedProfessional from '../components/auth/RequireVerifiedProfessional';
import { lazyWithRetry } from '../utils/lazyWithRetry';

const DoctorOverview       = lazyWithRetry(() => import('../pages/doctor/DoctorOverview'));
const DoctorAppointments   = lazyWithRetry(() => import('../pages/doctor/DoctorAppointments'));
const DoctorPatients       = lazyWithRetry(() => import('../pages/doctor/DoctorPatients'));
const DoctorPrescriptions  = lazyWithRetry(() => import('../pages/doctor/DoctorPrescriptions'));
const DoctorReviews        = lazyWithRetry(() => import('../pages/doctor/DoctorReviews'));
const DoctorClinics        = lazyWithRetry(() => import('../pages/doctor/DoctorClinics'));
const DoctorProfile        = lazyWithRetry(() => import('../pages/doctor/DoctorProfile'));
const DoctorSettings       = lazyWithRetry(() => import('../pages/doctor/DoctorSettings'));

function DoctorLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#eaf3f4]">
      <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const DoctorRoutes = () => {
  return (
    <RequireRole role="doctor">
      <RequireVerifiedProfessional role="doctor">
      <Suspense fallback={<DoctorLoader />}>
        <Routes>
          <Route index element={<Navigate to="/doctor/overview" replace />} />
          <Route path="overview"      element={<DoctorOverview />} />
          <Route path="appointments"  element={<DoctorAppointments />} />
          <Route path="patients"      element={<DoctorPatients />} />
          <Route path="prescriptions" element={<DoctorPrescriptions />} />
          <Route path="reviews"       element={<DoctorReviews />} />
          <Route path="clinics"       element={<DoctorClinics />} />
          <Route path="profile"       element={<DoctorProfile />} />
          <Route path="settings"      element={<DoctorSettings />} />
          <Route path="edit"          element={<Navigate to="/doctor/settings" replace />} />
          <Route path="*"             element={<Navigate to="/doctor/overview" replace />} />
        </Routes>
      </Suspense>
      </RequireVerifiedProfessional>
    </RequireRole>
  );
};

export default DoctorRoutes;
