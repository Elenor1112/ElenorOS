import { ApiError } from "./api";
import { companyToday, requireUserDateTime, zonedParts } from "./timezone";

/**
 * Date-range plumbing shared by the per-person reports (tasks, sales activity).
 *
 * Ranges are whole company-calendar days, given as inclusive yyyy-MM-dd bounds,
 * and turned into a half-open instant range [start, end) in APP_TIMEZONE.
 */

const YMD = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_RANGE_DAYS = 366;

export function shiftYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function ymdOf(instant: Date): string {
  const p = zonedParts(instant);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** Week buckets start on Sunday, the first day of the office week. */
export function weekStart(ymd: string): string {
  const dow = new Date(`${ymd}T00:00:00Z`).getUTCDay();
  return shiftYmd(ymd, -dow);
}

export type ReportRange = {
  from: string;
  to: string;
  start: Date;
  end: Date;
  /** Day buckets up to ~6 weeks, week buckets beyond — keeps trends legible. */
  bucket: "day" | "week";
  inRange: (d: Date | null | undefined) => d is Date;
  /** Trend bucket key for an instant. */
  bucketKey: (d: Date) => string;
  /** Every bucket key in the range, in order, so trends read as a timeline. */
  bucketKeys: () => string[];
};

/** Parse `?from=&to=` (defaults: this month to today), or throw 400. */
export function parseReportRange(sp: URLSearchParams): ReportRange {
  const today = companyToday();
  const to = sp.get("to") ?? today;
  const from = sp.get("from") ?? `${today.slice(0, 8)}01`;
  if (!YMD.test(from) || !YMD.test(to)) throw new ApiError(400, "from/to must be yyyy-MM-dd");
  const span = daysBetween(from, to);
  if (span < 0) throw new ApiError(400, "from must be on or before to");
  if (span >= MAX_RANGE_DAYS) throw new ApiError(400, `Range is limited to ${MAX_RANGE_DAYS} days`);

  const start = requireUserDateTime(from, "from");
  const end = requireUserDateTime(shiftYmd(to, 1), "to");
  const bucket: "day" | "week" = span <= 45 ? "day" : "week";

  return {
    from, to, start, end, bucket,
    inRange: (d): d is Date => !!d && d >= start && d < end,
    bucketKey: (d) => (bucket === "day" ? ymdOf(d) : weekStart(ymdOf(d))),
    bucketKeys: () => {
      const keys: string[] = [];
      const step = bucket === "day" ? 1 : 7;
      for (let k = bucket === "day" ? from : weekStart(from); k <= to; k = shiftYmd(k, step)) keys.push(k);
      return keys;
    },
  };
}
