import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, audit, toErrorResponse, ApiError } from "@/lib/api";
import {
  leadVisibilityFilter, assertCanEditLead, logSalesActivity, SALES_ACTIVITY,
  notifySales, requireSalesModule,
} from "@/lib/sales";
import { leadRequestCreateSchema } from "@/lib/sales-schemas";
import { formatMoney } from "@/lib/sales-constants";

const userPick = { select: { id: true, firstName: true, lastName: true, avatarUrl: true } };

export async function POST(req: NextRequest) {
  try {
    const user = requireSalesModule(await requireUser());
    const data = leadRequestCreateSchema.parse(await req.json());

    const lead = await db.lead.findFirst({
      where: { id: data.leadId, ...leadVisibilityFilter(user) },
      select: { id: true, code: true, companyName: true, ownerId: true, createdById: true },
    });
    if (!lead) throw new ApiError(404, "Lead not found.");
    assertCanEditLead(user, lead, "Sales.LeadEdit");

    // "Others" is only meaningful with its description.
    const servicesOther = data.services.includes("Others") ? data.servicesOther : undefined;

    // A request is its own deal: it surfaces as a separate entry in Sales >
    // Clients carrying its own amount, and leaves the lead's original deal
    // value untouched.
    const request = await db.leadRequest.create({
      data: {
        leadId: lead.id,
        services: data.services,
        servicesOther: servicesOther ?? null,
        details: data.details ?? null,
        amount: data.amount,
        currency: data.currency,
        poNumber: data.poNumber ?? null,
        createdById: user.id,
      },
      include: { createdBy: userPick },
    });

    const amountLabel = formatMoney(data.amount, data.currency);
    await logSalesActivity({
      leadId: lead.id, actorId: user.id, verb: SALES_ACTIVITY.REQUEST_CREATED,
      summary: `${data.services.join(", ")} — ${amountLabel}`,
      meta: { requestId: request.id, amount: data.amount },
    });

    await audit({
      actorId: user.id, action: "sales.request.create", entity: "leadRequest", entityId: request.id,
      newValue: {
        leadId: lead.id, services: data.services, servicesOther: servicesOther ?? null,
        amount: data.amount, currency: data.currency, poNumber: data.poNumber ?? null,
      },
    });

    await notifySales({
      ownerId: lead.ownerId, excludeActorId: user.id,
      type: "PROJECT_UPDATED",
      title: `New request — ${lead.companyName}`,
      body: `${user.firstName} ${user.lastName} added a request worth ${amountLabel}.`,
      link: `/sales/leads/${lead.id}?tab=new-request`,
      meta: { leadId: lead.id, requestId: request.id },
    });

    return NextResponse.json(
      { request: { ...request, amount: Number(request.amount) } },
      { status: 201 }
    );
  } catch (e) {
    return toErrorResponse(e);
  }
}
