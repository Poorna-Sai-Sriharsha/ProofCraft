export type WarrantyStatus = 'ACTIVE' | 'EXPIRED' | 'NONE' | 'UNKNOWN';

/**
 * Normalizes any Date or string to a UTC Date object representing 00:00:00.000 UTC
 */
export function normalizeDateOnlyToUtc(dateInput: Date | string): Date {
  if (typeof dateInput === 'string') {
    // If it's a YYYY-MM-DD format string
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // 0-indexed
      const day = parseInt(match[3], 10);
      return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    }
  }

  const d = new Date(dateInput);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Returns formatted date string 'YYYY-MM-DD' from a Date or ISO string
 */
export function formatDateToDateOnly(dateInput: Date | string): string {
  const d = normalizeDateOnlyToUtc(dateInput);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Gets the number of days in a given year and month (0-indexed month)
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/**
 * Adds calendar months to a date with end-of-month clamping.
 * E.g., Jan 31 + 1 month = Feb 28 (or Feb 29 in leap year).
 */
export function addMonthsClamped(baseDate: Date | string, monthsToAdd: number): Date {
  const normalized = normalizeDateOnlyToUtc(baseDate);
  const currentYear = normalized.getUTCFullYear();
  const currentMonth = normalized.getUTCMonth();
  const currentDay = normalized.getUTCDate();

  const totalMonths = currentMonth + monthsToAdd;
  const targetYear = currentYear + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;

  const maxDaysInTargetMonth = getDaysInMonth(targetYear, targetMonth);
  const targetDay = Math.min(currentDay, maxDaysInTargetMonth);

  return new Date(Date.UTC(targetYear, targetMonth, targetDay, 0, 0, 0, 0));
}

/**
 * Adds whole calendar days in UTC
 */
export function addDaysUtc(baseDate: Date | string, daysToAdd: number): Date {
  const normalized = normalizeDateOnlyToUtc(baseDate);
  normalized.setUTCDate(normalized.getUTCDate() + daysToAdd);
  return normalized;
}

/**
 * Calculates warranty expiry date:
 * Explicit date takes precedence.
 * Otherwise base is (warrantyStartDate || purchaseDate) + warrantyDurationMonths.
 */
export function calculateWarrantyExpiry(options: {
  purchaseDate: Date | string;
  warrantyStartDate?: Date | string;
  warrantyDurationMonths?: number;
  explicitExpiryDate?: Date | string;
}): Date | undefined {
  if (options.explicitExpiryDate) {
    return normalizeDateOnlyToUtc(options.explicitExpiryDate);
  }

  if (options.warrantyDurationMonths && options.warrantyDurationMonths > 0) {
    const baseDate = options.warrantyStartDate || options.purchaseDate;
    return addMonthsClamped(baseDate, options.warrantyDurationMonths);
  }

  return undefined;
}

/**
 * Calculates return deadline:
 * Explicit deadline takes precedence.
 * Otherwise purchaseDate + returnWindowDays.
 */
export function calculateReturnDeadline(options: {
  purchaseDate: Date | string;
  returnWindowDays?: number;
  explicitReturnDeadline?: Date | string;
}): Date | undefined {
  if (options.explicitReturnDeadline) {
    return normalizeDateOnlyToUtc(options.explicitReturnDeadline);
  }

  if (options.returnWindowDays && options.returnWindowDays > 0) {
    return addDaysUtc(options.purchaseDate, options.returnWindowDays);
  }

  return undefined;
}

/**
 * Calculates current warranty status:
 * Policy: Inclusive expiry day.
 * If today (ref) <= expiryDate, status is ACTIVE.
 * If today > expiryDate, status is EXPIRED.
 */
export function calculateWarrantyStatus(options: {
  storedStatus?: WarrantyStatus;
  warrantyExpiryDate?: Date | string;
  referenceDate?: Date | string;
}): WarrantyStatus {
  if (options.storedStatus === 'NONE') return 'NONE';

  if (!options.warrantyExpiryDate) {
    return options.storedStatus || 'UNKNOWN';
  }

  const expiryUtc = normalizeDateOnlyToUtc(options.warrantyExpiryDate).getTime();
  const refUtc = normalizeDateOnlyToUtc(options.referenceDate || new Date()).getTime();

  // Active through the full stated day (refUtc <= expiryUtc)
  if (refUtc <= expiryUtc) {
    return 'ACTIVE';
  } else {
    return 'EXPIRED';
  }
}

/**
 * Calculates days remaining until target date relative to reference date.
 * Positive = future, 0 = today, Negative = past
 */
export function getDaysRemaining(
  targetDate: Date | string,
  referenceDate: Date | string = new Date()
): number {
  const targetUtc = normalizeDateOnlyToUtc(targetDate).getTime();
  const refUtc = normalizeDateOnlyToUtc(referenceDate).getTime();
  const diffMs = targetUtc - refUtc;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}
