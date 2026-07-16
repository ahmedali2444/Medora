import { describe, expect, it } from 'vitest';
import { isPharmacyOpen, mapApiPharmacy } from './pharmacyMappers';
import { lazyWithRetry } from './lazyWithRetry';

describe('pharmacyMappers', () => {
  it('maps open pharmacy status', () => {
    const pharmacy = mapApiPharmacy({
      pharmacyId: 12,
      pharmacyName: 'Test Pharmacy',
      addressLine: 'Cairo',
      phone: '0100',
      status: 'open',
      distanceKm: 2.5,
    });

    expect(pharmacy.id).toBe(12);
    expect(isPharmacyOpen(pharmacy)).toBe(true);
  });

  it('treats closed pharmacies as unavailable', () => {
    expect(isPharmacyOpen(mapApiPharmacy({ pharmacyId: 1, status: 'closed' }))).toBe(false);
  });
});

describe('lazyWithRetry', () => {
  it('exports a lazy helper', () => {
    expect(typeof lazyWithRetry).toBe('function');
  });
});
