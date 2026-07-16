import { useEffect, useState } from 'react';
import { medoraApi } from '../api/medoraApi';
import { mapApiPharmacies } from '../utils/pharmacyMappers';

export function useMedicinePharmacies(medicineId, userLocation = null) {
  const [state, setState] = useState({ loading: false, error: '', pharmacies: [] });

  useEffect(() => {
    if (!medicineId) {
      queueMicrotask(() => setState({ loading: false, error: '', pharmacies: [] }));
      return undefined;
    }

    let mounted = true;
    queueMicrotask(() => {
      if (mounted) setState((current) => ({ ...current, loading: true, error: '' }));
    });

    const params = { page: 1, pageSize: 50 };
    if (userLocation?.lat != null && userLocation?.lng != null) {
      params.lat = userLocation.lat;
      params.lng = userLocation.lng;
    }

    medoraApi.medicinePharmacies(medicineId, params)
      .then((data) => {
        if (!mounted) return;
        setState({
          loading: false,
          error: '',
          pharmacies: mapApiPharmacies(data?.items),
        });
      })
      .catch((error) => {
        if (!mounted) return;
        setState({
          loading: false,
          error: error.message || 'Unable to load pharmacies',
          pharmacies: [],
        });
      });

    return () => { mounted = false; };
  }, [medicineId, userLocation?.lat, userLocation?.lng]);

  return state;
}

export function useCartPharmacies(cartItems, userLocation = null, enabled = true) {
  const [pharmaciesByMedicine, setPharmaciesByMedicine] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !Array.isArray(cartItems) || cartItems.length === 0) {
      queueMicrotask(() => {
        setPharmaciesByMedicine({});
        setLoading(false);
      });
      return undefined;
    }

    let mounted = true;
    const medicineIds = [...new Set(cartItems.map((item) => item.id).filter(Boolean))];
    queueMicrotask(() => {
      if (mounted) setLoading(true);
    });

    const params = { page: 1, pageSize: 50 };
    if (userLocation?.lat != null && userLocation?.lng != null) {
      params.lat = userLocation.lat;
      params.lng = userLocation.lng;
    }

    Promise.all(
      medicineIds.map((medicineId) =>
        medoraApi.medicinePharmacies(medicineId, params)
          .then((data) => [medicineId, mapApiPharmacies(data?.items)])
          .catch(() => [medicineId, []]),
      ),
    )
      .then((entries) => {
        if (!mounted) return;
        setPharmaciesByMedicine(Object.fromEntries(entries));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, [cartItems, enabled, userLocation?.lat, userLocation?.lng]);

  return { pharmaciesByMedicine, loading };
}
