import { describe, it, expect } from 'vitest';
import {
  normalizeDateOnlyToUtc,
  formatDateToDateOnly,
  addMonthsClamped,
  addDaysUtc,
  calculateWarrantyExpiry,
  calculateReturnDeadline,
  calculateWarrantyStatus,
  getDaysRemaining,
} from './dateUtils.js';

describe('dateUtils Unit Tests', () => {
  describe('normalizeDateOnlyToUtc and formatDateToDateOnly', () => {
    it('should normalize string YYYY-MM-DD to UTC midnight Date object', () => {
      const d = normalizeDateOnlyToUtc('2026-03-15');
      expect(d.getUTCFullYear()).toBe(2026);
      expect(d.getUTCMonth()).toBe(2); // March is 0-indexed 2
      expect(d.getUTCDate()).toBe(15);
      expect(d.getUTCHours()).toBe(0);
      expect(d.getUTCMinutes()).toBe(0);
      expect(d.getUTCSeconds()).toBe(0);
    });

    it('should format Date back to YYYY-MM-DD accurately', () => {
      const formatted = formatDateToDateOnly('2026-10-09T18:45:00.000Z');
      expect(formatted).toBe('2026-10-09');
    });
  });

  describe('Month-End and Leap-Year Calculations (addMonthsClamped)', () => {
    it('should clamp January 31 + 1 month to February 28 in non-leap year (2026)', () => {
      const result = addMonthsClamped('2026-01-31', 1);
      expect(formatDateToDateOnly(result)).toBe('2026-02-28');
    });

    it('should clamp January 31 + 1 month to February 29 in leap year (2024)', () => {
      const result = addMonthsClamped('2024-01-31', 1);
      expect(formatDateToDateOnly(result)).toBe('2024-02-29');
    });

    it('should clamp August 31 + 1 month to September 30', () => {
      const result = addMonthsClamped('2026-08-31', 1);
      expect(formatDateToDateOnly(result)).toBe('2026-09-30');
    });

    it('should handle multi-year addition accurately (e.g. 24 months)', () => {
      const result = addMonthsClamped('2026-01-15', 24);
      expect(formatDateToDateOnly(result)).toBe('2028-01-15');
    });
  });

  describe('calculateWarrantyExpiry', () => {
    it('should prioritize explicit expiry date over duration calculation', () => {
      const expiry = calculateWarrantyExpiry({
        purchaseDate: '2026-01-01',
        warrantyDurationMonths: 12,
        explicitExpiryDate: '2027-06-30',
      });
      expect(formatDateToDateOnly(expiry!)).toBe('2027-06-30');
    });

    it('should compute expiry using warrantyStartDate when supplied', () => {
      const expiry = calculateWarrantyExpiry({
        purchaseDate: '2026-01-01',
        warrantyStartDate: '2026-01-15',
        warrantyDurationMonths: 6,
      });
      expect(formatDateToDateOnly(expiry!)).toBe('2026-07-15');
    });

    it('should return undefined when no duration or explicit date provided', () => {
      const expiry = calculateWarrantyExpiry({
        purchaseDate: '2026-01-01',
      });
      expect(expiry).toBeUndefined();
    });
  });

  describe('calculateReturnDeadline', () => {
    it('should prioritize explicit return deadline', () => {
      const deadline = calculateReturnDeadline({
        purchaseDate: '2026-01-01',
        returnWindowDays: 14,
        explicitReturnDeadline: '2026-01-20',
      });
      expect(formatDateToDateOnly(deadline!)).toBe('2026-01-20');
    });

    it('should add returnWindowDays to purchaseDate', () => {
      const deadline = calculateReturnDeadline({
        purchaseDate: '2026-01-01',
        returnWindowDays: 10,
      });
      expect(formatDateToDateOnly(deadline!)).toBe('2026-01-11');
    });
  });

  describe('calculateWarrantyStatus and Inclusive Expiry Day Policy', () => {
    const today = '2026-10-09';

    it('should mark as ACTIVE when expiry is tomorrow (1 day remaining)', () => {
      const status = calculateWarrantyStatus({
        warrantyExpiryDate: '2026-10-10',
        referenceDate: today,
      });
      expect(status).toBe('ACTIVE');
      expect(getDaysRemaining('2026-10-10', today)).toBe(1);
    });

    it('should mark as ACTIVE when expiry is today (inclusive expiry policy: 0 days remaining)', () => {
      const status = calculateWarrantyStatus({
        warrantyExpiryDate: '2026-10-09',
        referenceDate: today,
      });
      expect(status).toBe('ACTIVE');
      expect(getDaysRemaining('2026-10-09', today)).toBe(0);
    });

    it('should mark as EXPIRED when expiry was yesterday (-1 days remaining)', () => {
      const status = calculateWarrantyStatus({
        warrantyExpiryDate: '2026-10-08',
        referenceDate: today,
      });
      expect(status).toBe('EXPIRED');
      expect(getDaysRemaining('2026-10-08', today)).toBe(-1);
    });

    it('should respect NONE status without marking as expired', () => {
      const status = calculateWarrantyStatus({
        storedStatus: 'NONE',
        referenceDate: today,
      });
      expect(status).toBe('NONE');
    });

    it('should respect UNKNOWN status when expiry details are missing', () => {
      const status = calculateWarrantyStatus({
        storedStatus: 'UNKNOWN',
        referenceDate: today,
      });
      expect(status).toBe('UNKNOWN');
    });
  });
});
