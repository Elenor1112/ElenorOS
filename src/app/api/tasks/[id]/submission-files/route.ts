import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { requireUser, audit, toErrorResponse, ApiError } from "@/lib/api";
import { canViewTask } from "@/lib/tasks";
import { canSubmitForApproval } from "@/lib/rbac";

/**
 * Upload an image or document as proof of completion.
 *
 * Two-step by necessity: the file is uploaded here BEFORE the submission exists
 * (the user is still filling in the form), so it lands parented to the task with
 * a null submissionId and is claimed when they submit. See TaskSubmissionFile in
 * the schema for why the draft state is modelled rather than avoided.
 *
 * Payloads are stored as bytes in the row, mirroring SalesAttachmentFile and
 * JobDescriptionFile — the platform deliberately has no external object store.
 */

/** Generous enough for a design export, small enough to protect the DB. */
const MAX_BYTES = 10 * 1024 * 1024;

/** Drafts a single user may hold on one task, so uploads cannot be used as storage. */
const MAX_DRAFTS = 20;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const task = await db.task.findUnique({
      where: { id },
      select: {
        id: true, status: true, createdById: true, workerId: true,
        assignees: { select: { userId: true } },
      },
    });
    if (!task) throw new ApiError(404, "Task not found");
    if (!(await canViewTask(user, id))) throw new ApiError(404, "Task not found");

    // Evidence is uploaded by the people who do the work — the same gate that
    // guards submitting, checked here too so an unauthorized caller cannot use
    // the endpoint as free file storage against a task they can merely see.
    if (!canSubmitForApproval(user, task)) {
      throw new ApiError(
        403,
        "Only the person the task is assigned to — its assignee or its worker — can upload deliverables for approval."
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "No file was uploaded.");
    if (file.size === 0) throw new ApiError(400, "The uploaded file is empty.");
    if (file.size > MAX_BYTES) {
      throw new ApiError(413, `Files must be ${MAX_BYTES / 1024 / 1024}MB or smaller.`);
    }

    const drafts = await db.taskSubmissionFile.count({
      where: { taskId: id, uploadedById: user.id, submissionId: null },
    });
    if (drafts >= MAX_DRAFTS) {
      throw new ApiError(409, `You can attach at most ${MAX_DRAFTS} files to one submission.`);
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const checksum = createHash("sha256").update(bytes).digest("hex");

    const created = await db.taskSubmissionFile.create({
      data: {
        taskId: id,
        uploadedById: user.id,
        name: file.name || "Deliverable",
        mimeType: file.type || "application/octet-stream",
        size: bytes.byteLength,
        checksum,
        data: bytes,
      },
      select: { id: true, name: true, mimeType: true, size: true, createdAt: true },
    });

    await audit({
      actorId: user.id,
      action: "task.submissionFile.create",
      entity: "taskSubmissionFile",
      entityId: created.id,
      newValue: { taskId: id, name: created.name, size: created.size },
    });

    return NextResponse.json({ file: created }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}

/**
 * The caller's unclaimed uploads for this task.
 *
 * Lets the submit form recover its attachments after a reload instead of
 * silently losing them (and leaving orphaned rows behind).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!(await canViewTask(user, id))) throw new ApiError(404, "Task not found");

    const files = await db.taskSubmissionFile.findMany({
      where: { taskId: id, uploadedById: user.id, submissionId: null },
      select: { id: true, name: true, mimeType: true, size: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ files });
  } catch (e) {
    return toErrorResponse(e);
  }
}
