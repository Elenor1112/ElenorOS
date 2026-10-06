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

    // Reverse the deal-value bump made on create, in the same write as the
    // delete. Clamped at 0 in case the estimate was edited down meanwhile.
    const amount = Number(request.amount);
    await db.$transaction([
      db.leadRequest.delete({ where: { id } }),
      db.$executeRaw`
        UPDATE "Lead"
        SET "estimatedValue" = GREATEST(COALESCE("estimatedValue", 0) - ${amount}::numeric, 0), "updatedAt" = NOW()
        WHERE "id" = ${request.leadId}`,
    ]);

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
