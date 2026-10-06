import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, toErrorResponse } from "@/lib/api";
import { salesScope, canViewClientContact } from "@/lib/rbac";
import { leadVisibilityFilter } from "@/lib/sales";
import type { Prisma } from "@prisma/client";

const userPick = { select: { id: true, firstName: true, lastName: true, avatarUrl: true } };

/**
 * Clients that came through the sales pipeline.
 *
 * Distinct from /api/clients, which lists every client the agency has: this one
 * is the sales view, keyed on the originating lead so the discovery brief,
 * feedback and proposal history stay one click away after the handover.
 *
 * Access works for BOTH sides of that handover — a sales member sees the
 * accounts they closed (their leads), while Account Management sees converted
 * accounts through the `converted` scope. Both resolve through the same lead
 * visibility filter.
 *
 * Every New Request logged on a lead is listed as an extra row (kind
 * "request") carrying the request's own amount; the lead row keeps its
 * original deal value.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const visibility = leadVisibilityFilter(user);
    const scope = salesScope(user);
    const q = req.nextUrl.searchParams.get("q")?.trim();

    const search: Prisma.LeadWhereInput[] = q
      ? [{
          OR: [
            { companyName: { contains: q, mode: "insensitive" as const } },
            { code: { contains: q, mode: "insensitive" as const } },
            { contactPerson: { contains: q, mode: "insensitive" as const } },
          ],
        }]
      : [];

    const where: Prisma.LeadWhereInput = {
      AND: [
        ...(visibility ? [visibility] : []),
        { convertedClientId: { not: null } },
        ...search,
      ],
    };

    const leadSelect = {
      id: true, code: true, companyName: true, brandName: true, industry: true,
      contactPerson: true, email: true, phone: true, estimatedValue: true,
      wonAt: true, convertedAt: true, source: true,
      owner: userPick,
      convertedClient: {
        select: {
          id: true, company: true, status: true, industry: true,
          accountManager: userPick,
          _count: { select: { projects: true, tasks: true } },
          projects: {
            select: { id: true, name: true, status: true, deadline: true },
            orderBy: { createdAt: "desc" as const },
            take: 5,
          },
        },
      },
      _count: { select: { briefs: true, feedback: true, proposals: true, meetings: true } },
    } satisfies Prisma.LeadSelect;

    const [leads, requests] = await Promise.all([
      db.lead.findMany({
        where,
        select: leadSelect,
        orderBy: { convertedAt: "desc" },
        take: 200,
      }),
      // Each New Request is its own client entry: the parent lead's client data
      // repeated, with the request's own value, services and details. Shown
      // whether or not the lead has converted yet.
      db.leadRequest.findMany({
        where: { lead: { AND: [...(visibility ? [visibility] : []), ...search] } },
        select: {
          id: true, services: true, servicesOther: true, details: true,
          amount: true, currency: true, poNumber: true, createdAt: true,
          lead: { select: leadSelect },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    ]);

    // A converted lead carries the SAME contact details as the client it became,
    // so this route has to honour the same restriction — otherwise the sales
    // clients view would be a way to read a phone number that /api/clients
    // masks. Entitlement is judged against the client the lead converted into,
    // which is where the account manager is recorded. A request on a lead that
    // has not converted yet shows what the lead page itself already shows.
    const entitledFor = (l: { convertedClient: { accountManager: { id: string } | null } | null }) =>
      l.convertedClient === null
        ? true
        : canViewClientContact(user, { accountManagerId: l.convertedClient.accountManager?.id ?? null });

    const leadRows = leads.map((l) => {
      const entitled = entitledFor(l);
      return {
        ...l,
        kind: "lead" as const,
        email: entitled ? l.email : null,
        phone: entitled ? l.phone : null,
        contactVisible: entitled,
        estimatedValue: l.estimatedValue ? Number(l.estimatedValue) : null,
        sortAt: l.convertedAt,
      };
    });

    const requestRows = requests.map((r) => {
      const l = r.lead;
      const entitled = entitledFor(l);
      return {
        ...l,
        kind: "request" as const,
        requestId: r.id,
        services: r.services,
        servicesOther: r.servicesOther,
        details: r.details,
        currency: r.currency,
        poNumber: r.poNumber,
        email: entitled ? l.email : null,
        phone: entitled ? l.phone : null,
        contactVisible: entitled,
        estimatedValue: Number(r.amount),
        wonAt: r.createdAt,
        sortAt: r.createdAt,
      };
    });

    const clients = [...leadRows, ...requestRows]
      .sort((a, b) => (b.sortAt?.getTime() ?? 0) - (a.sortAt?.getTime() ?? 0))
      .map(({ sortAt: _sortAt, ...row }) => row);

    return NextResponse.json({ clients, scope: scope.kind });
  } catch (e) {
    return toErrorResponse(e);
  }
}
