import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, toErrorResponse, ApiError } from "@/lib/api";
import { can, REPORT_TEAM_ROLES } from "@/lib/rbac";
import { tableResponse, type Table } from "@/lib/export";
import { fullName } from "@/lib/utils";
import { companyToday, isDateOnly, requireUserDateTime, zonedParts } from "@/lib/timezone";
import type { Prisma, RoleKey, TaskStatus } from "@prisma/client";

/**
 * Per-employee task report.
 *
 * Two clocks, deliberately:
 *  - Involvement (created / assigned / worker) counts tasks CREATED in the range.
 *  - Delivery (done / on time / late) counts tasks DELIVERED in the range, so a
 *    task briefed last month and finished this month is this month's delivery.
 *  - Waiting approval counts tasks SUBMITTED in the range that are still with
 *    the approver. They are handed in, so they never count as open overdue —
 *    a slow sign-off is not the doer's lateness.
 *  - Open overdue counts unfinished, unsubmitted tasks whose deadline falls in
 *    the range and has already passed.
 *
 * Delivery is credited to the people executing the work — assignees and
 * workers — not the creator, so a manager who briefs forty tasks is not charged
 * with forty late deliveries. Cancelled tasks are excluded throughout.
 *
 * Scope: Reports.View sees everyone; Reports.ViewTeam (Art Director) sees
 * themselves and their team; anyone else only themselves — whatever the query
 * string asks for. `?export=csv` returns the per-employee table, same scope.
 */

const OPEN: TaskStatus[] = ["TODO", "IN_PROGRESS", "HOLD", "WAITING_APPROVAL", "EDITING"];
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 366;

function shiftYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function ymdOf(instant: Date): string {
  const p = zonedParts(instant);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** Week buckets start on Sunday, the first day of the office week. */
function weekStart(ymd: string): string {
  const dow = new Date(`${ymd}T00:00:00Z`).getUTCDay();
  return shiftYmd(ymd, -dow);
}

/**
 * A date-only deadline stores company-zone midnight and means "end of that
 * day" — the same rule the analytics overview applies to "overdue".
 */
function effectiveDeadline(deadline: Date): Date {
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
function deliveredAt(t: { submittedAt: Date | null; approvedAt: Date | null; updatedAt: Date }): Date {
  return t.submittedAt ?? t.approvedAt ?? t.updatedAt;
}

type Row = {
  userId: string; name: string; roleKey: RoleKey; roleName: string;
  created: number; assigned: number; worker: number; total: number;
  done: number; onTime: number; late: number; noDeadline: number;
  waitingApproval: number; openOverdue: number;
  onTimeRate: number | null;
};

const rate = (onTime: number, late: number) =>
  onTime + late ? Math.round((onTime / (onTime + late)) * 100) : null;

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    // all: Reports.View (Account / Operations / PR & Sales managers, CEO).
    // team: Reports.ViewTeam — self + REPORT_TEAM_ROLES + direct reports.
    // self: everyone else.
    const scope: "all" | "team" | "self" = can(user, "Reports.View")
      ? "all"
      : can(user, "Reports.ViewTeam") ? "team" : "self";
    const sp = req.nextUrl.searchParams;

    // ── Range ──
    const today = companyToday();
    const to = sp.get("to") ?? today;
    const from = sp.get("from") ?? `${today.slice(0, 8)}01`;
    if (!YMD.test(from) || !YMD.test(to)) throw new ApiError(400, "from/to must be yyyy-MM-dd");
    const span = daysBetween(from, to);
    if (span < 0) throw new ApiError(400, "from must be on or before to");
    if (span >= MAX_RANGE_DAYS) throw new ApiError(400, `Range is limited to ${MAX_RANGE_DAYS} days`);
    const rangeStart = requireUserDateTime(from, "from");
    const rangeEnd = requireUserDateTime(shiftYmd(to, 1), "to");
    const inRange = (d: Date) => d >= rangeStart && d < rangeEnd;
    const bucket: "day" | "week" = span <= 45 ? "day" : "week";

    // ── Who the report covers ──
    // Filters can only narrow within the scope — the user list below is the
    // hard boundary, whatever the query string asks for.
    const role = scope !== "self" ? (sp.get("role") || null) as RoleKey | null : null;
    const requestedIds = scope !== "self"
      ? (sp.get("users") ?? "").split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const visible: Prisma.UserWhereInput =
      scope === "all"
        ? { status: "ACTIVE" }
        : scope === "team"
          ? {
              OR: [
                { id: user.id },
                {
                  status: "ACTIVE",
                  OR: [
                    { role: { key: { in: REPORT_TEAM_ROLES[user.roleKey] ?? [] } } },
                    { managerId: user.id },
                  ],
                },
              ],
            }
          : { id: user.id };

    const [allRoles, users] = await Promise.all([
      db.role.findMany({ select: { key: true, name: true }, orderBy: { level: "asc" } }),
      db.user.findMany({
        where: visible,
        select: { id: true, firstName: true, lastName: true, role: { select: { key: true, name: true } } },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      }),
    ]);
    // Only offer roles that someone in scope actually holds.
    const roles = allRoles.filter((r) => users.some((u) => u.role.key === r.key));

    const subjects = users.filter((u) =>
      (!role || u.role.key === role) &&
      (!requestedIds.length || requestedIds.includes(u.id))
    );
    const ids = subjects.map((u) => u.id);

    // ── Tasks ──
    // The DB filter is a superset (any of the three clocks may land in range);
    // the precise per-metric checks happen below.
    const involves: Prisma.TaskWhereInput = {
      OR: [
        { createdById: { in: ids } },
        { assignees: { some: { userId: { in: ids } } } },
        { workers: { some: { userId: { in: ids } } } },
      ],
    };
    const range = { gte: rangeStart, lt: rangeEnd };
    const tasks = ids.length
      ? await db.task.findMany({
          where: {
            status: { not: "CANCELLED" },
            AND: [
              involves,
              {
                OR: [
                  { createdAt: range },
                  { status: "DONE", OR: [{ submittedAt: range }, { approvedAt: range }, { updatedAt: range }] },
                  { status: "WAITING_APPROVAL", submittedAt: range },
                  { status: { in: OPEN }, deadline: range },
                ],
              },
            ],
          },
          select: {
            id: true, status: true, createdAt: true, updatedAt: true, deadline: true,
            submittedAt: true, approvedAt: true, createdById: true,
            assignees: { select: { userId: true } },
            workers: { select: { userId: true } },
          },
        })
      : [];

    const now = new Date();
    const rows = new Map<string, Row>(
      subjects.map((u) => [u.id, {
        userId: u.id, name: fullName(u), roleKey: u.role.key, roleName: u.role.name,
        created: 0, assigned: 0, worker: 0, total: 0,
        done: 0, onTime: 0, late: 0, noDeadline: 0, waitingApproval: 0, openOverdue: 0, onTimeRate: null,
      }])
    );

    // Team totals count each task once, however many subjects share it.
    const totals = { created: 0, assigned: 0, worker: 0, total: 0, done: 0, onTime: 0, late: 0, noDeadline: 0, waitingApproval: 0, openOverdue: 0 };
    const trend = new Map<string, { done: number; late: number }>();

    for (const t of tasks) {
      const creator = rows.has(t.createdById) ? t.createdById : null;
      const assignees = t.assignees.map((a) => a.userId).filter((id) => rows.has(id));
      const workers = t.workers.map((w) => w.userId).filter((id) => rows.has(id));
      const doers = new Set([...assignees, ...workers]);

      if (inRange(t.createdAt)) {
        const involved = new Set<string>();
        if (creator) { rows.get(creator)!.created++; involved.add(creator); }
        for (const id of assignees) { rows.get(id)!.assigned++; involved.add(id); }
        for (const id of workers) { rows.get(id)!.worker++; involved.add(id); }
        for (const id of involved) rows.get(id)!.total++;
        if (creator) totals.created++;
        if (assignees.length) totals.assigned++;
        if (workers.length) totals.worker++;
        if (involved.size) totals.total++;
      }

      if (!doers.size) continue;
      const due = t.deadline ? effectiveDeadline(t.deadline) : null;

      if (t.status === "DONE") {
        const at = deliveredAt(t);
        if (!inRange(at)) continue;
        const outcome = !due ? "noDeadline" : at <= due ? "onTime" : "late";
        for (const id of doers) {
          const r = rows.get(id)!;
          r.done++;
          r[outcome]++;
        }
        totals.done++;
        totals[outcome]++;

        const day = ymdOf(at);
        const key = bucket === "day" ? day : weekStart(day);
        const point = trend.get(key) ?? { done: 0, late: 0 };
        point.done++;
        if (outcome === "late") point.late++;
        trend.set(key, point);
      } else if (t.status === "WAITING_APPROVAL") {
        if (!t.submittedAt || !inRange(t.submittedAt)) continue;
        for (const id of doers) rows.get(id)!.waitingApproval++;
        totals.waitingApproval++;
      } else if (OPEN.includes(t.status) && t.deadline && inRange(t.deadline) && due! < now) {
        for (const id of doers) rows.get(id)!.openOverdue++;
        totals.openOverdue++;
      }
    }

    const people = [...rows.values()]
      .map((r) => ({ ...r, onTimeRate: rate(r.onTime, r.late) }))
      .sort((a, b) => b.total - a.total || b.done - a.done || a.name.localeCompare(b.name));
    const summary = { ...totals, onTimeRate: rate(totals.onTime, totals.late) };

    if (sp.get("export") === "csv") {
      const table: Table = {
        name: `task-report ${from} to ${to}`,
        columns: [
          "Name", "Role", "Created", "Assigned", "Worker", "Total",
          "Done", "On time", "Late", "Waiting approval", "No deadline", "Open overdue", "On-time %",
        ],
        rows: [
          ...people.map((r) => [
            r.name, r.roleName, r.created, r.assigned, r.worker, r.total,
            r.done, r.onTime, r.late, r.waitingApproval, r.noDeadline, r.openOverdue, r.onTimeRate ?? "",
          ]),
          [
            "Total (distinct tasks)", "", summary.created, summary.assigned, summary.worker, summary.total,
            summary.done, summary.onTime, summary.late, summary.waitingApproval, summary.noDeadline,
            summary.openOverdue, summary.onTimeRate ?? "",
          ],
        ],
      };
      return tableResponse(table);
    }

    // Fill empty buckets so the trend line reads as a timeline, not a scatter.
    const trendPoints: { key: string; done: number; late: number }[] = [];
    const step = bucket === "day" ? 1 : 7;
    for (let k = bucket === "day" ? from : weekStart(from); k <= to; k = shiftYmd(k, step)) {
      trendPoints.push({ key: k, ...(trend.get(k) ?? { done: 0, late: 0 }) });
    }

    return NextResponse.json({
      range: { from, to, bucket },
      scope,
      options: {
        roles,
        users: users.map((u) => ({ id: u.id, name: fullName(u), roleKey: u.role.key })),
      },
      summary,
      people,
      trend: trendPoints,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
