import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, audit, toErrorResponse, ApiError } from "@/lib/api";
import { canViewTask } from "@/lib/tasks";
import { forceCompleteTask } from "@/lib/task-lifecycle";

/**
 * Operations Manager / CEO shortcut: mark a task Done from any status,
 * without submitting evidence or waiting on the approval chain.
 *
 * Separate from the approval route on purpose — that endpoint enforces "only
 * the approver whose turn it is may decide", and this one deliberately
 * bypasses that rule for super admins only. Keeping them apart means the
 * ordinary approval path never grows a bypass flag to get this wrong.
 */

const bodySchema = z.object({
  comment: z.string().max(5000).optional().nullable(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = bodySchema.parse(await req.json().catch(() => ({})));

    const task = await db.task.findUnique({
      where: { id },
      select: {
        id: true, code: true, title: true, status: true, createdById: true,
        approvalStage: true,
        workers: { select: { userId: true } },
        assignees: { select: { userId: true } },
        followUps: { select: { userId: true } },
      },
    });
    if (!task) throw new ApiError(404, "Task not found");
    if (!(await canViewTask(user, id))) throw new ApiError(404, "Task not found");

    await forceCompleteTask({ user, task, comment: body.comment });

    const fresh = await db.task.findUnique({
      where: { id },
      select: {
        id: true, status: true, approvalStatus: true, approvedAt: true, submittedAt: true,
        approvalStage: true,
        approvedBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    await audit({
      actorId: user.id,
      action: "task.force_complete",
      entity: "task",
      entityId: id,
      oldValue: { status: task.status },
      newValue: { status: fresh?.status, comment: body.comment?.trim() || undefined },
    });

    return NextResponse.json({ task: fresh });
  } catch (e) {
    return toErrorResponse(e);
  }
}
