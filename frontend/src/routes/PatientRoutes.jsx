import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PatientLayout from '../components/patient/PatientLayout';
import PatientAppointments from '../pages/patient/PatientAppointments';
import PatientSettings from '../pages/patient/PatientSettings';
import PatientPrescriptions from '../pages/patient/PatientPrescriptions';
import PatientOrders from '../pages/patient/PatientOrders';
import PatientFavorites from '../pages/patient/PatientFavorites';

export default function PatientRoutes() {
  return (
    <PatientLayout>
      <Routes>
        <Route path="appointments" element={<PatientAppointments />} />
        <Route path="orders" element={<PatientOrders />} />
        <Route path="favorites" element={<PatientFavorites />} />
        <Route path="prescriptions" element={<PatientPrescriptions />} />
        <Route path="settings" element={<PatientSettings />} />
        <Route path="*" element={<Navigate to="appointments" replace />} />
      </Routes>
    </PatientLayout>
  );
}
