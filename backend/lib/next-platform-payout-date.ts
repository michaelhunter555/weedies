/** Platform-initiated Connect payouts run Mon & Thu 09:00 UTC (see `app.ts` cron). */
const PAYOUT_UTC_HOUR = 9;
const PAYOUT_WEEKDAYS = new Set([1, 4]); // Monday, Thursday

/**
 * Next scheduled platform payout window (Mon/Thu 09:00 UTC) strictly after `from`.
 */
export function getNextPlatformPayoutDate(from: Date = new Date()): Date {
  const start = new Date(from);
  for (let offset = 0; offset <= 14; offset++) {
    const candidate = new Date(start);
    candidate.setUTCDate(start.getUTCDate() + offset);
    if (!PAYOUT_WEEKDAYS.has(candidate.getUTCDay())) continue;
    candidate.setUTCHours(PAYOUT_UTC_HOUR, 0, 0, 0);
    if (candidate.getTime() > from.getTime()) {
      return candidate;
    }
  }
  const fallback = new Date(from);
  fallback.setUTCDate(fallback.getUTCDate() + 7);
  fallback.setUTCHours(PAYOUT_UTC_HOUR, 0, 0, 0);
  return fallback;
}

/** Stripe often holds the first Connect payout ~7 days for risk review. */
export const FIRST_CONNECT_PAYOUT_HOLD_DAYS = 7;

export function isWithinFirstPayoutHold(
  accountCreatedUnix: number | undefined,
  from: Date = new Date(),
): boolean {
  if (!accountCreatedUnix) return true;
  const createdMs = accountCreatedUnix * 1000;
  const holdMs = FIRST_CONNECT_PAYOUT_HOLD_DAYS * 24 * 60 * 60 * 1000;
  return from.getTime() - createdMs < holdMs;
}
