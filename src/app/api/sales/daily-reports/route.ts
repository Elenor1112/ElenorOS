import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, audit, toErrorResponse, ApiError } from "@/lib/api";
import { can } from "@/lib/rbac";
import { requireSalesModule } from "@/lib/sales";
import { parseReportRange } from "@/lib/report-range";
import { companyToday } from "@/lib/timezone";
import { tableResponse, type Table } from "@/lib/export";
import { fullName } from "@/lib/utils";

/**
 * Daily reports — free-text end-of-day write-ups from the sales team.
 *
 * POST: any salesperson submits a report for today (or a past day they missed).
 * GET:  reports between `from` and `to`, grouped by author.
 *
 * Scope mirrors /api/sales/reports/activity: Sales.ViewTeam / Sales.ViewAll see
 * every salesperson and may narrow with `users=`; everyone else only their own.
 * `?export=csv` returns one row per report, same scope.
 */

const YMD = /^\d{4}-\d{2}-\d{2}$/;

const createSchema = z.object({
  body: z.string().trim().min(1, "Write something before submitting.").max(10_000),
  reportDate: z.string().regex(YMD, "reportDate must be yyyy-MM-dd").optional(),
});

const authorPick = {
  select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: { select: { name: true } } },
};

export async function GET(req: NextRequest) {
  try {
    const user = requireSalesModule(await requireUser());
    if (!can(user, "Sales.ViewReports")) {
      throw new ApiError(403, "Missing permission: Sales.ViewReports");
    }
    const scope: "all" | "self" =
      can(user, "Sales.ViewTeam") || can(user, "Sales.ViewAll") ? "all" : "self";
    const sp = req.nextUrl.searchParams;
    const { from, to } = parseReportRange(sp);

    // ── Who the report covers ── (same roster rule as the activity report)
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
      select: { id: true, firstName: true, lastName: true, status: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });
    const requestedIds = scope === "all"
      ? (sp.get("users") ?? "").split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const ids = roster
      .filter((u) => !requestedIds.length || requestedIds.includes(u.id))
      .map((u) => u.id);

    // reportDate is a yyyy-MM-dd string, so lexical comparison is date order.
    const reports = ids.length
      ? await db.salesDailyReport.findMany({
          where: { authorId: { in: ids }, reportDate: { gte: from, lte: to } },
          include: { author: authorPick },
          orderBy: [{ reportDate: "desc" }, { createdAt: "desc" }],
          take: 5000,
        })
      : [];

    if (sp.get("export") === "csv") {
      const table: Table = {
        name: `sales-daily-reports ${from} to ${to}`,
        columns: ["Date", "Name", "Role", "Submitted at", "Report"],
        rows: reports.map((r) => [
          r.reportDate, fullName(r.author), r.author.role.name, r.createdAt.toISOString(), r.body,
        ]),
      };
      return tableResponse(table);
    }

    // Group per author so the manager reads one person at a time.
    const byAuthor = new Map<string, {
      userId: string; name: string; firstName: string; lastName: string;
      roleName: string; avatarUrl: string | null;
      days: number; reports: { id: string; reportDate: string; body: string; createdAt: Date }[];
    }>();
    for (const r of reports) {
      let p = byAuthor.get(r.authorId);
      if (!p) {
        p = {
          userId: r.authorId, name: fullName(r.author),
          firstName: r.author.firstName, lastName: r.author.lastName, roleName: r.author.role.name,
          avatarUrl: r.author.avatarUrl, days: 0, reports: [],
        };
        byAuthor.set(r.authorId, p);
      }
      p.reports.push({ id: r.id, reportDate: r.reportDate, body: r.body, createdAt: r.createdAt });
    }
    const people = [...byAuthor.values()]
      .map((p) => ({ ...p, days: new Set(p.reports.map((r) => r.reportDate)).size }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      range: { from, to },
      scope,
      options: {
        users: roster
          .filter((u) => u.status === "ACTIVE" || u.id === user.id)
          .map((u) => ({ id: u.id, name: fullName(u) })),
      },
      total: reports.length,
      people,
    });
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = requireSalesModule(await requireUser());
    if (!can(user, "Sales.ViewReports")) {
      throw new ApiError(403, "Missing permission: Sales.ViewReports");
    }
    const data = createSchema.parse(await req.json());
    const today = companyToday();
    const reportDate = data.reportDate ?? today;
    if (reportDate > today) throw new ApiError(400, "You cannot submit a report for a future day.");

    const report = await db.salesDailyReport.create({
      data: { authorId: user.id, reportDate, body: data.body },
    });

    await audit({
      actorId: user.id, action: "sales.dailyReport.create", entity: "salesDailyReport", entityId: report.id,
      newValue: { reportDate },
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
