import { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RequireRole from '../components/auth/RequireRole';
import { ImagePreviewProvider } from '../components/admin/shared/ImagePreview';
import { lazyWithRetry } from '../utils/lazyWithRetry';

const AdminOverview      = lazyWithRetry(() => import('../pages/admin/AdminOverview'));
const AdminUsers         = lazyWithRetry(() => import('../pages/admin/AdminUsers'));
const AdminDoctors       = lazyWithRetry(() => import('../pages/admin/AdminDoctors'));
const AdminPharmacies    = lazyWithRetry(() => import('../pages/admin/AdminPharmacies'));
const AdminMedicines     = lazyWithRetry(() => import('../pages/admin/AdminMedicines'));
const AdminAppointments  = lazyWithRetry(() => import('../pages/admin/AdminAppointments'));
const AdminOrders        = lazyWithRetry(() => import('../pages/admin/AdminOrders'));
const AdminArticles      = lazyWithRetry(() => import('../pages/admin/AdminArticles'));
const AdminReviews       = lazyWithRetry(() => import('../pages/admin/AdminReviews'));
const AdminReports       = lazyWithRetry(() => import('../pages/admin/AdminReports'));
const AdminSettings      = lazyWithRetry(() => import('../pages/admin/AdminSettings'));
const AdminLookups       = lazyWithRetry(() => import('../pages/admin/AdminLookups'));

function AdminLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#eaf3f4]">
      <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function AdminRoutes() {
  return (
    <RequireRole role="admin">
      <ImagePreviewProvider>
        <Suspense fallback={<AdminLoader />}>
          <Routes>
            <Route index element={<Navigate to="/admin/overview" replace />} />
            <Route path="overview"     element={<AdminOverview />} />
            <Route path="users"        element={<AdminUsers />} />
            <Route path="doctors"      element={<AdminDoctors />} />
            <Route path="pharmacies"   element={<AdminPharmacies />} />
            <Route path="medicines"    element={<AdminMedicines />} />
            <Route path="appointments" element={<AdminAppointments />} />
            <Route path="orders"       element={<AdminOrders />} />
            <Route path="articles"     element={<AdminArticles />} />
            <Route path="reviews"      element={<AdminReviews />} />
            <Route path="reports"      element={<AdminReports />} />
            <Route path="lookups"      element={<AdminLookups />} />
            <Route path="settings"     element={<AdminSettings />} />
            <Route path="*"            element={<Navigate to="/admin/overview" replace />} />
          </Routes>
        </Suspense>
      </ImagePreviewProvider>
    </RequireRole>
  );
}
