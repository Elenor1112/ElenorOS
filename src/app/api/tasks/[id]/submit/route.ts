import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, audit, toErrorResponse, ApiError } from "@/lib/api";
import { canViewTask } from "@/lib/tasks";
import { submitForApproval } from "@/lib/task-lifecycle";

/**
 * Hand a task in for approval: EDITING → WAITING_APPROVAL, with evidence.
 *
 * A separate endpoint from PATCH because entering approval is a transaction over
 * three things (the submission, its files, the status), not a field edit — and
 * because it is the one place evidence can be supplied, which is what makes the
 * "no submission without proof" rule enforceable at all.
 */

const submitSchema = z.object({
  notes: z.string().max(5000).optional().nullable(),
  url: z.string().max(2000).optional().nullable(),
  /** Ids from POST /api/tasks/[id]/submission-files. */
  fileIds: z.array(z.string()).max(20).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = submitSchema.parse(await req.json().catch(() => ({})));

    const task = await db.task.findUnique({
      where: { id },
      select: {
        id: true, code: true, title: true, status: true, createdById: true,
        assignees: { select: { userId: true } },
        workers: { select: { userId: true } },
        // Part of the approval chain, so it must be loaded for the submission to
        // notify the right people — see approvalStages() in lib/rbac.ts.
        followUps: { select: { userId: true } },
        // Design Team tasks auto-add the client's Account Manager as a follow-up
        // on submit — see submitForApproval in lib/task-lifecycle.ts.
        department: { select: { name: true } },
        client: { select: { accountManagerId: true } },
      },
    });
    if (!task) throw new ApiError(404, "Task not found");
    // 404 rather than 403 so an unrelated task's existence is not disclosed.
    if (!(await canViewTask(user, id))) throw new ApiError(404, "Task not found");

    const submission = await submitForApproval({ user, task, evidence: body });

    await audit({
      actorId: user.id,
      action: "task.submitForApproval",
      entity: "task",
      entityId: id,
      oldValue: { status: task.status },
      newValue: {
        status: "WAITING_APPROVAL",
        submissionId: submission.id,
        hasNotes: Boolean(submission.notes),
        hasUrl: Boolean(submission.url),
        fileCount: submission.files.length,
      },
    });

    return NextResponse.json({ submission }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
