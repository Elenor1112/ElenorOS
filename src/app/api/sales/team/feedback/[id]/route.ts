import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, audit, toErrorResponse, ApiError } from "@/lib/api";
import { can } from "@/lib/rbac";
import { requireSalesModule } from "@/lib/sales";

/** Remove a feedback entry — only its author or a super admin. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireSalesModule(await requireUser());
    if (!can(user, "Sales.ViewTeam")) {
      throw new ApiError(403, "Missing permission: Sales.ViewTeam");
    }
    const { id } = await params;

    const feedback = await db.salesMemberFeedback.findUnique({ where: { id } });
    if (!feedback) throw new ApiError(404, "Feedback not found.");
    if (feedback.authorId !== user.id && !user.isSuperAdmin) {
      throw new ApiError(403, "Only the author can delete this feedback.");
    }

    await db.salesMemberFeedback.delete({ where: { id } });
    await audit({
      actorId: user.id, action: "sales.memberFeedback.delete", entity: "salesMemberFeedback",
      entityId: id,
      oldValue: { subjectId: feedback.subjectId, period: feedback.period, rating: feedback.rating },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
