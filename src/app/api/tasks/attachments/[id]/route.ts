import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, audit, toErrorResponse, ApiError } from "@/lib/api";
import { canViewTask } from "@/lib/tasks";
import { can } from "@/lib/rbac";

/**
 * Serve or delete one task attachment.
 *
 * Like sales attachments, the payload is served THROUGH the app rather than
 * from a public URL, so every read is authorized against the same task
 * visibility as the rest of the workspace and there is no forwardable
 * unguarded link.
 */

async function loadAttachment(id: string) {
  const row = await db.taskAttachment.findUnique({
    where: { id },
    select: { id: true, name: true, mimeType: true, size: true, checksum: true, taskId: true, uploadedById: true },
  });
  if (!row) throw new ApiError(404, "Attachment not found.");
  return row;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const attachment = await loadAttachment(id);
    if (!(await canViewTask(user, attachment.taskId))) throw new ApiError(404, "Attachment not found.");

    // Attachments are immutable once uploaded (a replacement is a new row), so
    // an ETag match is always safe to serve from cache.
    if (req.headers.get("if-none-match") === `"${attachment.checksum}"`) {
      return new NextResponse(null, { status: 304 });
    }

    const payload = await db.taskAttachmentFile.findUnique({
      where: { attachmentId: id },
      select: { data: true },
    });
    if (!payload) throw new ApiError(404, "Attachment file is missing.");

    const download = req.nextUrl.searchParams.get("download") === "1";
    const asciiName = attachment.name.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'");

    return new NextResponse(new Uint8Array(payload.data), {
      status: 200,
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Length": String(payload.data.byteLength),
        "Content-Disposition":
          `${download ? "attachment" : "inline"}; filename="${asciiName}"; ` +
          `filename*=UTF-8''${encodeURIComponent(attachment.name)}`,
        "Cache-Control": "private, max-age=0, must-revalidate",
        ETag: `"${attachment.checksum}"`,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; object-src 'none'; sandbox",
      },
    });
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const attachment = await loadAttachment(id);
    if (!(await canViewTask(user, attachment.taskId))) throw new ApiError(404, "Attachment not found.");

    // The person who uploaded it can remove it; otherwise it takes the same
    // permission that lets someone edit the task's own details.
    if (attachment.uploadedById !== user.id && !can(user, "Task.EditDetails")) {
      throw new ApiError(403, "You cannot delete this attachment.");
    }

    // The blob row cascades with the metadata row.
    await db.taskAttachment.delete({ where: { id } });

    await audit({
      actorId: user.id, action: "task.attachment.delete", entity: "taskAttachment", entityId: id,
      oldValue: { name: attachment.name, taskId: attachment.taskId },
    });

    return NextResponse.json({ ok: true, message: "Attachment deleted" });
  } catch (e) {
    return toErrorResponse(e);
  }
}
