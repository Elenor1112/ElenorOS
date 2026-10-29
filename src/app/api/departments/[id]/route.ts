import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, requirePermission, audit, toErrorResponse, ApiError } from "@/lib/api";
import { DEPARTMENT_HEAD_ROLES, DEPARTMENT_INSIGHT_ROLES } from "@/lib/rbac";
import { effectiveDeadline, deliveredAt, onTimeRate } from "@/lib/task-metrics";
import type { TaskStatus } from "@prisma/client";

const OPEN: TaskStatus[] = ["TODO", "IN_PROGRESS", "HOLD", "WAITING_APPROVAL", "EDITING"];
/** Window the performance numbers cover. */
const PERFORMANCE_DAYS = 30;

/**
 * One department with its members.
 *
 * Tasks and performance are attached only for DEPARTMENT_INSIGHT_ROLES — the
 * data is left out of the response for everyone else, not merely hidden in the
 * UI. Performance follows the task report's rules: delivery is credited to
 * assignees and workers, and a task waiting on approval is never overdue.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const department = await db.department.findUnique({
      where: { id },
      include: {
        head: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        members: {
          where: { status: "ACTIVE" },
          select: {
            id: true, firstName: true, lastName: true, avatarUrl: true, jobTitle: true,
            role: { select: { name: true } },
          },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        },
        _count: { select: { members: true, tasks: true } },
      },
    });
    if (!department) throw new ApiError(404, "Department not found");

    const canSeeInsights = DEPARTMENT_INSIGHT_ROLES.includes(user.roleKey);
    const canAssignHead = DEPARTMENT_HEAD_ROLES.includes(user.roleKey);
    if (!canSeeInsights) {
      return NextResponse.json({ department, canSeeInsights, canAssignHead });
    }

    const ids = department.members.map((m) => m.id);
    const now = new Date();
    const since = new Date(now.getTime() - PERFORMANCE_DAYS * 864e5);
    const tasks = ids.length
      ? await db.task.findMany({
          where: {
            OR: [
              { assignees: { some: { userId: { in: ids } } } },
              { workers: { some: { userId: { in: ids } } } },
            ],
            AND: [{
              OR: [
                { status: { in: OPEN } },
                { status: "DONE", OR: [{ submittedAt: { gte: since } }, { approvedAt: { gte: since } }, { updatedAt: { gte: since } }] },
              ],
            }],
          },
          select: {
            id: true, code: true, title: true, status: true, priority: true, deadline: true,
            submittedAt: true, approvedAt: true, updatedAt: true,
            assignees: { select: { userId: true } },
            workers: { select: { userId: true } },
          },
          orderBy: [{ deadline: { sort: "asc", nulls: "last" } }],
        })
      : [];

    const stats = new Map(ids.map((mid) => [mid, {
      open: 0, overdue: 0, waitingApproval: 0, done: 0, onTime: 0, late: 0,
      tasks: [] as { id: string; code: string; title: string; status: TaskStatus; priority: string; deadline: Date | null }[],
    }]));

    for (const t of tasks) {
      const doers = new Set([...t.assignees, ...t.workers].map((x) => x.userId).filter((u) => stats.has(u)));
      const due = t.deadline ? effectiveDeadline(t.deadline) : null;
      if (t.status === "DONE") {
        const at = deliveredAt(t);
        if (at < since) continue;
        for (const u of doers) {
          const s = stats.get(u)!;
          s.done++;
          if (due) s[at <= due ? "onTime" : "late"]++;
        }
        continue;
      }
      for (const u of doers) {
        const s = stats.get(u)!;
        s.open++;
        if (t.status === "WAITING_APPROVAL") s.waitingApproval++;
        else if (due && due < now) s.overdue++;
        s.tasks.push({ id: t.id, code: t.code, title: t.title, status: t.status, priority: t.priority, deadline: t.deadline });
      }
    }

    const members = department.members.map((m) => {
      const { tasks: openTasks, ...s } = stats.get(m.id)!;
      return { ...m, openTasks, performance: { ...s, onTimeRate: onTimeRate(s.onTime, s.late) } };
    });

    return NextResponse.json({
      department: { ...department, members },
      canSeeInsights,
      canAssignHead,
      performanceDays: PERFORMANCE_DAYS,
    });
  } catch (e) {
    return toErrorResponse(e);
  }
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  color: z.string().optional(),
  headId: z.string().optional().nullable(),
  archived: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("Department.Edit");
    const { id } = await params;
    const data = updateSchema.parse(await req.json());

    const before = await db.department.findUnique({ where: { id } });
    if (!before) throw new ApiError(404, "Department not found");

    const headChanging = data.headId !== undefined && (data.headId || null) !== before.headId;
    if (headChanging && !DEPARTMENT_HEAD_ROLES.includes(actor.roleKey)) {
      throw new ApiError(403, "Only the CEO can assign a department head.");
    }

    // A department head must actually belong to the department they lead.
    if (headChanging && data.headId) {
      const head = await db.user.findUnique({
        where: { id: data.headId },
        select: { departmentId: true },
      });
      if (!head) throw new ApiError(400, "Selected head does not exist");
      if (head.departmentId && head.departmentId !== id) {
        throw new ApiError(400, "Selected head belongs to a different department");
      }
    }

    const department = await db.department.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        color: data.color,
        headId: headChanging ? data.headId || null : undefined,
        archived: data.archived,
      },
    });

    await audit({
      actorId: actor.id, action: "department.update", entity: "department", entityId: id,
      oldValue: { name: before.name, headId: before.headId, archived: before.archived },
      newValue: { name: department.name, headId: department.headId, archived: department.archived },
    });
    return NextResponse.json({ department });
  } catch (e) {
    return toErrorResponse(e);
  }
}

/**
 * Delete a department.
 *
 * Restricted to Department.Delete (CEO / Operations Manager) — removing a unit
 * of the org chart is not an Account Manager action.
 *
 * A department with members or tasks is archived rather than destroyed: those
 * rows reference it without onDelete:Cascade, so a hard delete would be
 * rejected, and detaching staff from their department would lose reporting
 * history.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("Department.Delete");
    const { id } = await params;

    const department = await db.department.findUnique({
      where: { id },
      select: { id: true, name: true, archived: true, _count: { select: { members: true, tasks: true } } },
    });
    if (!department) throw new ApiError(404, "Department not found");

    const inUse = department._count.members + department._count.tasks;
    if (inUse > 0) {
      const updated = await db.department.update({ where: { id }, data: { archived: true } });
      await audit({
        actorId: actor.id, action: "department.archive", entity: "department", entityId: id,
        oldValue: { archived: department.archived },
        newValue: { archived: true, members: department._count.members, tasks: department._count.tasks },
      });
      return NextResponse.json({
        ok: true, archived: true, department: updated,
        message: `${department.name} archived — it still has ${department._count.members} member(s) and ${department._count.tasks} task(s).`,
      });
    }

    // Clear the head reference first so the self-referencing FK cannot block
    // the delete.
    await db.department.update({ where: { id }, data: { headId: null } });
    await db.department.delete({ where: { id } });
    await audit({
      actorId: actor.id, action: "department.delete", entity: "department", entityId: id,
      oldValue: { name: department.name },
    });
    return NextResponse.json({ ok: true, archived: false });
  } catch (e) {
    return toErrorResponse(e);
  }
}
