import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, toErrorResponse, ApiError } from "@/lib/api";
import { can } from "@/lib/rbac";
import { requireSalesModule, OPEN_STAGES } from "@/lib/sales";
import { parseReportRange } from "@/lib/report-range";
import { tableResponse, type Table } from "@/lib/export";
import { fullName } from "@/lib/utils";

/**
 * Per-salesperson activity report — the sales twin of /api/reports/tasks.
 *
 * Answers "what did each person do between `from` and `to`?". Every metric is
 * credited to the one person who did it, on that record's own clock:
 *  - Leads created      — Lead.createdById,  createdAt
 *  - Leads received     — LeadOwnerAssignment.ownerId, assignedAt, only when
 *                         someone else handed it over (self-owned new leads
 *                         already count as "created")
 *  - Stage moves        — LeadStageChange.actorId, changedAt (creation rows excluded)
 *  - Meetings           — organizer: scheduled on createdAt, held on
 *                         completedAt (falling back to scheduledAt), no-show and
 *                         cancelled on scheduledAt
 *  - Briefs submitted   — DiscoveryBrief.submittedById, submittedAt
 *  - Feedback logged    — SalesFeedback.authorId, createdAt
 *  - Proposals          — preparedById: sent / accepted / rejected on their own stamps
 *  - Won / lost         — current owner, wonAt / lostAt; revenue is estimatedValue
 *
 * Two columns are a snapshot of NOW rather than of the range — overdue
 * follow-ups and stale leads on the person's open pipeline — because "what is
 * slipping" only makes sense in the present.
 *
 * Because each record credits exactly one person, the team summary is the plain
 * sum of the rows: nothing is double counted.
 *
 * Scope: Sales.ViewTeam / Sales.ViewAll see every salesperson; everyone else
 * only themselves, whatever the query string asks for. `?export=csv` returns
 * the per-person table, same scope.
 */

/** Open leads untouched for this long count as stale. */
const STALE_DAYS = 14;

const METRICS = [
  "leadsCreated", "leadsReceived", "stageMoves",
  "meetingsScheduled", "meetingsHeld", "meetingsNoShow", "meetingsCancelled",
  "briefsSubmitted", "feedbackLogged",
  "proposalsSent", "proposalsAccepted", "proposalsRejected",
  "won", "lost", "revenueWon",
  "openLeads", "pipelineValue", "overdueFollowUps", "staleLeads",
] as const;
type Metric = (typeof METRICS)[number];
type Counts = Record<Metric, number>;

type Row = Counts & {
  userId: string; name: string; roleName: string;
  winRate: number | null; acceptanceRate: number | null; showRate: number | null;
};

const pct = (num: number, den: number) => (den ? Math.round((num / den) * 100) : null);
const zero = (): Counts => Object.fromEntries(METRICS.map((m) => [m, 0])) as Counts;

function withRates<T extends Counts>(c: T) {
  return {
    ...c,
    revenueWon: Math.round(c.revenueWon),
    pipelineValue: Math.round(c.pipelineValue),
    winRate: pct(c.won, c.won + c.lost),
    acceptanceRate: pct(c.proposalsAccepted, c.proposalsAccepted + c.proposalsRejected),
    showRate: pct(c.meetingsHeld, c.meetingsHeld + c.meetingsNoShow),
  };
}

export async function GET(req: NextRequest) {
  try {
    const user = requireSalesModule(await requireUser());
    if (!can(user, "Sales.ViewReports")) {
      throw new ApiError(403, "Missing permission: Sales.ViewReports");
    }
    const scope: "all" | "self" =
      can(user, "Sales.ViewTeam") || can(user, "Sales.ViewAll") ? "all" : "self";
    const sp = req.nextUrl.searchParams;
    const range = parseReportRange(sp);
    const { from, to, bucket, inRange } = range;
    const within = { gte: range.start, lt: range.end };

    // ── Who the report covers ──
    // The roster is the hard boundary; `users=` only narrows within it.
    const salesPermission = { permission: { key: { in: ["Sales.View", "Sales.ViewAll"] } } };
    const roster = await db.user.findMany({
      where: scope === "all"
        ? {
            OR: [
              { id: user.id },
              { role: { permissions: { some: salesPermission } } },
              { permissions: { some: { effect: "ALLOW", ...salesPermission } } },
            ],
          }
        : { id: user.id },
      select: {
        id: true, firstName: true, lastName: true, status: true,
        role: { select: { name: true } },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });
    const requestedIds = scope === "all"
      ? (sp.get("users") ?? "").split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const subjects = roster.filter((u) => !requestedIds.length || requestedIds.includes(u.id));
    const ids = subjects.map((u) => u.id);
    const mine = { in: ids };

    // ── Records ──
    // Each query is bounded by subject and by the metric's own date column.
    const now = new Date();
    const staleBefore = new Date(now.getTime() - STALE_DAYS * 86_400_000);
    const [
      created, received, moves, meetings, briefs, feedback, proposals, closed, open,
    ] = ids.length
      ? await Promise.all([
          db.lead.findMany({
            where: { createdById: mine, createdAt: within },
            select: { createdById: true, createdAt: true },
          }),
          db.leadOwnerAssignment.findMany({
            where: { ownerId: mine, assignedAt: within },
            select: { ownerId: true, assignedById: true },
          }),
          db.leadStageChange.findMany({
            where: { actorId: mine, changedAt: within, fromStage: { not: null } },
            select: { actorId: true },
          }),
          db.salesMeeting.findMany({
            where: {
              organizerId: mine,
              OR: [{ createdAt: within }, { scheduledAt: within }, { completedAt: within }],
            },
            select: { organizerId: true, status: true, createdAt: true, scheduledAt: true, completedAt: true },
          }),
          db.discoveryBrief.findMany({
            where: { submittedById: mine, status: "SUBMITTED", submittedAt: within },
            select: { submittedById: true },
          }),
          db.salesFeedback.findMany({
            where: { authorId: mine, createdAt: within },
            select: { authorId: true },
          }),
          db.proposal.findMany({
            where: {
              preparedById: mine,
              OR: [{ sentAt: within }, { acceptedAt: within }, { rejectedAt: within }],
            },
            select: { preparedById: true, sentAt: true, acceptedAt: true, rejectedAt: true },
          }),
          db.lead.findMany({
            where: {
              ownerId: mine,
              OR: [{ stage: "WON", wonAt: within }, { stage: "LOST", lostAt: within }],
            },
            select: { ownerId: true, stage: true, wonAt: true, estimatedValue: true },
          }),
          db.lead.findMany({
            where: { ownerId: mine, stage: { in: OPEN_STAGES } },
            select: {
              ownerId: true, estimatedValue: true, nextFollowUpAt: true,
              lastActivityAt: true, createdAt: true,
            },
          }),
        ])
      : [[], [], [], [], [], [], [], [], []];

    // ── Aggregate ──
    const counts = new Map<string, Counts>(subjects.map((u) => [u.id, zero()]));
    const bump = (id: string | null, metric: Metric, by = 1) => {
      const c = id ? counts.get(id) : undefined;
      if (c) c[metric] += by;
    };
    const trend = new Map(range.bucketKeys().map((k) => [k, { leadsCreated: 0, meetingsHeld: 0, proposalsSent: 0, won: 0 }]));
    const plot = (at: Date, key: "leadsCreated" | "meetingsHeld" | "proposalsSent" | "won") => {
      const p = trend.get(range.bucketKey(at));
      if (p) p[key]++;
    };

    for (const l of created) { bump(l.createdById, "leadsCreated"); plot(l.createdAt, "leadsCreated"); }
    for (const a of received) if (a.assignedById !== a.ownerId) bump(a.ownerId, "leadsReceived");
    for (const m of moves) bump(m.actorId, "stageMoves");
    for (const m of meetings) {
      if (inRange(m.createdAt)) bump(m.organizerId, "meetingsScheduled");
      if (m.status === "COMPLETED") {
        const heldAt = m.completedAt ?? m.scheduledAt;
        if (inRange(heldAt)) { bump(m.organizerId, "meetingsHeld"); plot(heldAt, "meetingsHeld"); }
      } else if (inRange(m.scheduledAt)) {
        if (m.status === "NO_SHOW") bump(m.organizerId, "meetingsNoShow");
        if (m.status === "CANCELLED") bump(m.organizerId, "meetingsCancelled");
      }
    }
    for (const b of briefs) bump(b.submittedById, "briefsSubmitted");
    for (const f of feedback) bump(f.authorId, "feedbackLogged");
    for (const p of proposals) {
      if (inRange(p.sentAt)) { bump(p.preparedById, "proposalsSent"); plot(p.sentAt, "proposalsSent"); }
      if (inRange(p.acceptedAt)) bump(p.preparedById, "proposalsAccepted");
      if (inRange(p.rejectedAt)) bump(p.preparedById, "proposalsRejected");
    }
    for (const l of closed) {
      if (l.stage === "WON") {
        bump(l.ownerId, "won");
        bump(l.ownerId, "revenueWon", Number(l.estimatedValue ?? 0));
        if (l.wonAt) plot(l.wonAt, "won");
      } else {
        bump(l.ownerId, "lost");
      }
    }
    for (const l of open) {
      bump(l.ownerId, "openLeads");
      bump(l.ownerId, "pipelineValue", Number(l.estimatedValue ?? 0));
      if (l.nextFollowUpAt && l.nextFollowUpAt < now) bump(l.ownerId, "overdueFollowUps");
      if ((l.lastActivityAt ?? l.createdAt) < staleBefore) bump(l.ownerId, "staleLeads");
    }

    // People who have left stay in the report only while they have something
    // to show for the range.
    const people: Row[] = subjects
      .map((u) => ({ u, c: counts.get(u.id)! }))
      .filter(({ u, c }) => u.status === "ACTIVE" || u.id === user.id || METRICS.some((m) => c[m] > 0))
      .map(({ u, c }) => ({ userId: u.id, name: fullName(u), roleName: u.role.name, ...withRates(c) }))
      .sort((a, b) => b.revenueWon - a.revenueWon || b.won - a.won || b.meetingsHeld - a.meetingsHeld || a.name.localeCompare(b.name));

    const totals = zero();
    for (const r of people) for (const m of METRICS) totals[m] += r[m];
    const summary = withRates(totals);

    if (sp.get("export") === "csv") {
      const line = (r: Counts & { winRate: number | null; acceptanceRate: number | null; showRate: number | null }) => [
        r.leadsCreated, r.leadsReceived, r.stageMoves,
        r.meetingsScheduled, r.meetingsHeld, r.meetingsNoShow, r.meetingsCancelled, r.showRate ?? "",
        r.briefsSubmitted, r.feedbackLogged,
        r.proposalsSent, r.proposalsAccepted, r.proposalsRejected, r.acceptanceRate ?? "",
        r.won, r.lost, r.winRate ?? "", Math.round(r.revenueWon),
        r.openLeads, Math.round(r.pipelineValue), r.overdueFollowUps, r.staleLeads,
      ];
      const table: Table = {
        name: `sales-activity-report ${from} to ${to}`,
        columns: [
          "Name", "Role",
          "Leads created", "Leads received", "Stage moves",
          "Meetings scheduled", "Meetings held", "No-shows", "Meetings cancelled", "Show rate %",
          "Briefs submitted", "Feedback logged",
          "Proposals sent", "Proposals accepted", "Proposals rejected", "Acceptance %",
          "Won", "Lost", "Win rate %", "Revenue won",
          "Open leads (now)", "Pipeline value (now)", "Overdue follow-ups (now)", `Stale leads >${STALE_DAYS}d (now)`,
        ],
        rows: [
          ...people.map((r) => [r.name, r.roleName, ...line(r)]),
          ["Team total", "", ...line(summary)],
        ],
      };
      return tableResponse(table);
    }

    return NextResponse.json({
      range: { from, to, bucket },
      scope,
      staleDays: STALE_DAYS,
      options: {
        users: roster
          .filter((u) => u.status === "ACTIVE" || u.id === user.id)
          .map((u) => ({ id: u.id, name: fullName(u) })),
      },
      summary,
      people,
      trend: [...trend.entries()].map(([key, v]) => ({ key, ...v })),
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
