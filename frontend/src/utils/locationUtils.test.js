import { describe, expect, it } from 'vitest';
import { isValidLatLng, normalizeLocation } from './locationUtils';

describe('locationUtils', () => {
  it('normalizes valid latitude and longitude values from common shapes', () => {
    expect(normalizeLocation({ latitude: '30.0444', longitude: '31.2357', accuracy: '12' })).toEqual({
      lat: 30.0444,
      lng: 31.2357,
      accuracy: 12,
    });
    expect(normalizeLocation({ lat: 29.9792, lng: 31.1342 })).toEqual({
      lat: 29.9792,
      lng: 31.1342,
    });
  });

  it('rejects incomplete, out-of-range, and null-island coordinates', () => {
    expect(normalizeLocation({ lat: 91, lng: 31 })).toBeNull();
    expect(normalizeLocation({ lat: 30, lng: 181 })).toBeNull();
    expect(normalizeLocation({ lat: 0, lng: 0 })).toBeNull();
    expect(isValidLatLng('', 31)).toBe(false);
  });
});
