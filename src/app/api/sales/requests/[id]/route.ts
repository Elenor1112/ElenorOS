import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, audit, toErrorResponse, ApiError } from "@/lib/api";
import {
  leadVisibilityFilter, assertCanEditLead, logSalesActivity, SALES_ACTIVITY,
  requireSalesModule,
} from "@/lib/sales";
import { formatMoney } from "@/lib/sales-constants";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireSalesModule(await requireUser());
    const { id } = await params;
    const visibility = leadVisibilityFilter(user);

    const request = await db.leadRequest.findFirst({
      where: { id, ...(visibility ? { lead: visibility } : {}) },
      include: { lead: { select: { id: true, ownerId: true, createdById: true } } },
    });
    if (!request) throw new ApiError(404, "Request not found.");
    assertCanEditLead(user, request.lead, "Sales.LeadEdit");

    // Requests never touch the lead's deal value, so deleting one is just the delete.
    const amount = Number(request.amount);
    await db.leadRequest.delete({ where: { id } });

    await logSalesActivity({
      leadId: request.leadId, actorId: user.id, verb: SALES_ACTIVITY.REQUEST_DELETED,
      summary: `${request.services.join(", ")} — ${formatMoney(amount, request.currency)}`,
      meta: { requestId: id, amount },
    });

    await audit({
      actorId: user.id, action: "sales.request.delete", entity: "leadRequest", entityId: id,
      oldValue: {
        leadId: request.leadId, services: request.services, amount,
        currency: request.currency, poNumber: request.poNumber,
      },
    });

    return NextResponse.json({ ok: true, message: "Request deleted" });
  } catch (e) {
    return toErrorResponse(e);
  }
}
