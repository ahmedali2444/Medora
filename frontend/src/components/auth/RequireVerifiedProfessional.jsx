import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { medoraApi } from '../../api/medoraApi';

function isApproved(status) {
  return String(status || '').toLowerCase() === 'approved';
}

export default function RequireVerifiedProfessional({ role, children }) {
  const location = useLocation();
  const [gate, setGate] = useState({ loading: true, redirect: null, error: '' });

  useEffect(() => {
    let mounted = true;
    const loadProfile = role === 'doctor' ? medoraApi.doctorMe : medoraApi.pharmacyMe;

    loadProfile()
      .then((profile) => {
        if (!mounted) return;

        if (profile?.isActive === false) {
          setGate({ loading: false, redirect: '/', error: '' });
          return;
        }

        if (!isApproved(profile?.verificationStatus)) {
          setGate({
            loading: false,
            redirect: role === 'doctor' ? '/doctor/verification' : '/complete-profile/pharmacy',
            error: '',
          });
          return;
        }

        setGate({ loading: false, redirect: null, error: '' });
      })
      .catch((error) => {
        if (!mounted) return;
        const notFound = error?.status === 404
          || String(error?.message || '').toLowerCase().includes('not found');
        setGate({
          loading: false,
          redirect: notFound ? `/complete-profile/${role}` : null,
          error: notFound ? '' : (error?.message || 'Unable to verify professional profile'),
        });
      });

    return () => { mounted = false; };
  }, [role]);

  if (gate.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#eaf3f4]">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (gate.redirect) {
    return <Navigate to={gate.redirect} replace state={{ from: location }} />;
  }

  if (gate.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#eaf3f4] px-4">
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{gate.error}</p>
      </div>
    );
  }

  return children;
}
