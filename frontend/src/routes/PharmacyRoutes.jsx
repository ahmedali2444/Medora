import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import RequireRole from '../components/auth/RequireRole';
import RequireVerifiedProfessional from '../components/auth/RequireVerifiedProfessional';
import { lazyWithRetry } from '../utils/lazyWithRetry';

const PharmacyOverview      = lazyWithRetry(() => import('../pages/pharmacy/PharmacyOverview'));
const PharmacyOrders        = lazyWithRetry(() => import('../pages/pharmacy/PharmacyOrders'));
const PharmacyDelivery      = lazyWithRetry(() => import('../pages/pharmacy/PharmacyDelivery'));
const PharmacyOrderDetail   = lazyWithRetry(() => import('../pages/pharmacy/PharmacyOrderDetail'));
const PharmacyInventory     = lazyWithRetry(() => import('../pages/pharmacy/PharmacyInventory'));
const PharmacyPrescriptions = lazyWithRetry(() => import('../pages/pharmacy/PharmacyPrescriptions'));
const PharmacyCustomers     = lazyWithRetry(() => import('../pages/pharmacy/PharmacyCustomers'));

const PharmacyReviews       = lazyWithRetry(() => import('../pages/pharmacy/PharmacyReviews'));
const PharmacyReports       = lazyWithRetry(() => import('../pages/pharmacy/PharmacyReports'));
const PharmacyProfile       = lazyWithRetry(() => import('../pages/pharmacy/PharmacyProfile'));
const PharmacySettings      = lazyWithRetry(() => import('../pages/pharmacy/PharmacySettings'));

function PharmacyLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#eaf3f4]">
      <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function PharmacyRoutes() {
  return (
    <RequireRole role="pharmacy">
      <RequireVerifiedProfessional role="pharmacy">
      <Suspense fallback={<PharmacyLoader />}>
        <Routes>
          <Route index element={<Navigate to="/pharmacy/overview" replace />} />
          <Route path="overview"      element={<PharmacyOverview />} />
          <Route path="orders"        element={<PharmacyOrders />} />
          <Route path="orders/:id"    element={<PharmacyOrderDetail />} />
          <Route path="delivery"      element={<PharmacyDelivery />} />
          <Route path="inventory"     element={<PharmacyInventory />} />
          <Route path="prescriptions" element={<PharmacyPrescriptions />} />
          <Route path="customers"     element={<PharmacyCustomers />} />

          <Route path="reviews"       element={<PharmacyReviews />} />
          <Route path="reports"       element={<PharmacyReports />} />
          <Route path="profile"       element={<PharmacyProfile />} />
          <Route path="settings"      element={<PharmacySettings />} />
          <Route path="*"             element={<Navigate to="/pharmacy/overview" replace />} />
        </Routes>
      </Suspense>
      </RequireVerifiedProfessional>
    </RequireRole>
  );
}
