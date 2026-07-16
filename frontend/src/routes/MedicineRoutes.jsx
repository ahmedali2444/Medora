import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ToastProvider } from '../components/medicine/layout/ToastContext';
import { CartProvider } from '../components/medicine/layout/CartContext';
import MedicinePage from '../pages/medicine/MedicinePage';
import MedicineDetailPage from '../pages/medicine/MedicineDetailPage';
import PharmacyDirectoryPage from '../pages/medicine/PharmacyDirectoryPage';
import PharmacyDetailPage from '../pages/medicine/PharmacyDetailPage';

export default function MedicineRoutes() {
  return (
    <ToastProvider>
      <CartProvider>
        <Routes>
          <Route index element={<MedicinePage />} />
          <Route path="pharmacies" element={<PharmacyDirectoryPage />} />
          <Route path="pharmacies/:id" element={<PharmacyDetailPage />} />
          <Route path=":id" element={<MedicineDetailPage />} />
        </Routes>
      </CartProvider>
    </ToastProvider>
  );
}
