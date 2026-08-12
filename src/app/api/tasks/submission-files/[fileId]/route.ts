import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, audit, toErrorResponse, ApiError } from "@/lib/api";
import { canViewTask } from "@/lib/tasks";
import { canSubmitForApproval } from "@/lib/rbac";

/**
 * Serve or delete one piece of uploaded evidence.
 *
 * Served THROUGH the app rather than from a public URL, like job description
 * files and sales attachments, so every read is authorized against the same task
 * visibility rules as the rest of the workspace and there is no forwardable
 * unguarded link to a client deliverable.
 */

async function loadFile(fileId: string) {
  const row = await db.taskSubmissionFile.findUnique({
    where: { id: fileId },
    select: {
      id: true, name: true, mimeType: true, size: true, checksum: true,
      taskId: true, uploadedById: true, submissionId: true,
    },
  });
  if (!row) throw new ApiError(404, "File not found.");
  return row;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  try {
    const user = await requireUser();
    const { fileId } = await params;
    const meta = await loadFile(fileId);

    // Anyone who can see the task can see its evidence — that is the point of
    // submitting it, and the approver reaches it this way.
    if (!(await canViewTask(user, meta.taskId))) throw new ApiError(404, "File not found.");

    // Evidence is immutable once uploaded (a replacement is a new row), so an
    // ETag match is always safe to serve from cache.
    if (req.headers.get("if-none-match") === `"${meta.checksum}"`) {
      return new NextResponse(null, { status: 304 });
    }

    const payload = await db.taskSubmissionFile.findUnique({
      where: { id: fileId },
      select: { data: true },
    });
    if (!payload) throw new ApiError(404, "File payload is missing.");

    const download = req.nextUrl.searchParams.get("download") === "1";
    // Quotes and non-ASCII would break the header, so send an ASCII fallback
    // alongside the RFC 5987 encoded form.
    const asciiName = meta.name.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'");

    return new NextResponse(new Uint8Array(payload.data), {
      status: 200,
      headers: {
        "Content-Type": meta.mimeType,
        "Content-Length": String(payload.data.byteLength),
        "Content-Disposition":
          `${download ? "attachment" : "inline"}; filename="${asciiName}"; ` +
          `filename*=UTF-8''${encodeURIComponent(meta.name)}`,
        // Private: per-user authorized content, never held by a shared cache.
        "Cache-Control": "private, max-age=0, must-revalidate",
        ETag: `"${meta.checksum}"`,
        "X-Content-Type-Options": "nosniff",
        // User-supplied content: deny it any ability to frame or script against
        // the app's own origin.
        "Content-Security-Policy": "default-src 'none'; object-src 'none'; sandbox",
      },
    });
  } catch (e) {
    return toErrorResponse(e);
  }
}

/**
 * Remove an attachment before it has been submitted.
 *
 * Only the uploader, and only while the file is still a draft: once it is part of
 * a submission it is evidence somebody has reviewed or will review, and deleting
 * it would rewrite the audit trail.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  try {
    const user = await requireUser();
    const { fileId } = await params;
    const meta = await loadFile(fileId);

    if (!(await canViewTask(user, meta.taskId))) throw new ApiError(404, "File not found.");

    if (meta.submissionId !== null) {
      throw new ApiError(
        409,
        "This file has already been submitted for approval and is part of the record. It cannot be removed."
      );
    }
    if (meta.uploadedById !== user.id) {
      throw new ApiError(403, "You can only remove files you uploaded.");
    }
    // Belt-and-braces: the uploader must still be entitled to submit at all.
    const task = await db.task.findUnique({
      where: { id: meta.taskId },
      select: {
        status: true, createdById: true,
        assignees: { select: { userId: true } },
        workers: { select: { userId: true } },
      },
    });
    if (!task || !canSubmitForApproval(user, task)) {
      throw new ApiError(403, "You can only remove files you uploaded.");
    }

    await db.taskSubmissionFile.delete({ where: { id: fileId } });

    await audit({
      actorId: user.id,
      action: "task.submissionFile.delete",
      entity: "taskSubmissionFile",
      entityId: fileId,
      oldValue: { taskId: meta.taskId, name: meta.name },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
