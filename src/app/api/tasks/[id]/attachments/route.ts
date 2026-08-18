import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { requireUser, audit, toErrorResponse, ApiError } from "@/lib/api";
import { canViewTask } from "@/lib/tasks";

/**
 * General-purpose files attached to a task — reference material handed in at
 * creation or added later, as distinct from TaskSubmissionFile (proof of
 * completion, scoped to the approval flow).
 *
 * Payloads are stored as bytes in TaskAttachmentFile, mirroring SalesAttachment
 * — the platform deliberately has no external object store.
 */

/** Generous enough for a brief or a deck, small enough to protect the DB. */
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!(await canViewTask(user, id))) throw new ApiError(404, "Task not found");

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "No file was uploaded.");
    if (file.size === 0) throw new ApiError(400, "The uploaded file is empty.");
    if (file.size > MAX_BYTES) {
      throw new ApiError(413, `Files must be ${MAX_BYTES / 1024 / 1024}MB or smaller.`);
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const checksum = createHash("sha256").update(bytes).digest("hex");

    const attachment = await db.taskAttachment.create({
      data: {
        taskId: id,
        name: file.name || "Attachment",
        mimeType: file.type || "application/octet-stream",
        size: bytes.byteLength,
        checksum,
        uploadedById: user.id,
        file: { create: { data: bytes } },
      },
      select: {
        id: true, name: true, mimeType: true, size: true, createdAt: true,
        uploadedBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    await audit({
      actorId: user.id,
      action: "task.attachment.create",
      entity: "taskAttachment",
      entityId: attachment.id,
      newValue: { taskId: id, name: attachment.name, size: attachment.size },
    });

    return NextResponse.json({ attachment }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!(await canViewTask(user, id))) throw new ApiError(404, "Task not found");

    const attachments = await db.taskAttachment.findMany({
      where: { taskId: id },
      select: {
        id: true, name: true, mimeType: true, size: true, createdAt: true,
        uploadedBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ attachments });
  } catch (e) {
    return toErrorResponse(e);
  }
}
