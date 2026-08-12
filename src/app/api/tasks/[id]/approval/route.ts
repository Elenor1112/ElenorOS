import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, audit, toErrorResponse, ApiError } from "@/lib/api";
import { canViewTask } from "@/lib/tasks";
import { approveTask, rejectTask } from "@/lib/task-lifecycle";

/**
 * Decide an open approval: WAITING_APPROVAL → DONE, or back to EDITING.
 *
 * One endpoint for both outcomes because they are the same decision with
 * opposite results, and because it keeps the "only from WAITING_APPROVAL, only by
 * an approver, never by the submitter" gate in a single place.
 *
 * This is the ONLY route in the app that can write DONE to a task.
 */

const decisionSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  /** Optional when approving; required when rejecting (enforced in rejectTask). */
  comment: z.string().max(5000).optional().nullable(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = decisionSchema.parse(await req.json());

    const task = await db.task.findUnique({
      where: { id },
      select: {
        id: true, code: true, title: true, status: true, createdById: true,
        approvalStage: true,
        workers: { select: { userId: true } },
        assignees: { select: { userId: true } },
      },
    });
    if (!task) throw new ApiError(404, "Task not found");
    if (!(await canViewTask(user, id))) throw new ApiError(404, "Task not found");

    if (body.decision === "approve") {
      await approveTask({ user, task, comment: body.comment });
    } else {
      await rejectTask({ user, task, comment: body.comment ?? "" });
    }

    const fresh = await db.task.findUnique({
      where: { id },
      select: {
        id: true, status: true, approvalStatus: true, approvedAt: true, submittedAt: true,
        approvalStage: true,
        approvedBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    // Audited from the row as it actually ended up, not from the decision:
    // approving part-way up the chain leaves the task in WAITING_APPROVAL, so
    // assuming "approve means DONE" here would write a false audit entry.
    await audit({
      actorId: user.id,
      action: body.decision === "approve" ? "task.approve" : "task.reject",
      entity: "task",
      entityId: id,
      oldValue: { status: task.status, approvalStage: task.approvalStage },
      newValue: {
        status: fresh?.status,
        approvalStage: fresh?.approvalStage,
        comment: body.comment?.trim() || undefined,
      },
    });

    return NextResponse.json({ task: fresh });
  } catch (e) {
    return toErrorResponse(e);
  }
}
