import { isDateOnly, requireUserDateTime } from "@/lib/timezone";
import { shiftYmd, ymdOf } from "@/lib/report-range";

/**
 * Delivery rules shared by every per-person task metric (the task report, the
 * department view), so "on time" means the same thing on every screen.
 */

/**
 * A date-only deadline stores company-zone midnight and means "end of that
 * day" — the same rule the analytics overview applies to "overdue".
 */
export function effectiveDeadline(deadline: Date): Date {
  return isDateOnly(deadline)
    ? requireUserDateTime(shiftYmd(ymdOf(deadline), 1), "deadline")
    : deadline;
}

/**
 * When the work was handed in. `submittedAt` is re-stamped on every
 * resubmission, so it is the hand-in of the version that was finally accepted;
 * tasks closed without an approval cycle fall back to the approval stamp and
 * then to the last update.
 */
export function deliveredAt(t: { submittedAt: Date | null; approvedAt: Date | null; updatedAt: Date }): Date {
  return t.submittedAt ?? t.approvedAt ?? t.updatedAt;
}

export const onTimeRate = (onTime: number, late: number) =>
  onTime + late ? Math.round((onTime / (onTime + late)) * 100) : null;
