import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, requirePermission, audit, toErrorResponse, ApiError } from "@/lib/api";
import { can } from "@/lib/rbac";
import {
  nextTaskCode, logActivity, taskVisibilityFilter, parseDeadline, lifecycleStamps,
  isAssignableBy, resolveTaskClientId,
} from "@/lib/tasks";
import { notifyMany } from "@/lib/notify";
import { parseUserDateTime } from "@/lib/timezone";
import type { Prisma, TaskStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const sp = req.nextUrl.searchParams;
    const q = sp.get("q")?.trim();
    const status = sp.getAll("status");
    const group = sp.get("group"); // open | closed
    const assignedTo = sp.get("assignedTo");
    const department = sp.get("department");
    const project = sp.get("project");
    const client = sp.get("client");
    const priority = sp.get("priority");
    const createdBy = sp.get("createdBy");
    const mine = sp.get("mine");

    const openStatuses: TaskStatus[] = ["TODO", "IN_PROGRESS", "HOLD", "WAITING_APPROVAL", "EDITING"];
    const closedStatuses: TaskStatus[] = ["DONE", "CANCELLED"];

    // Scope to what this user is allowed to see before any other filter.
    const visibility = taskVisibilityFilter(user);

    // `mine` and `q` would both want the top-level OR key and the second would
    // clobber the first, so scoping predicates go into AND where they compose.
    const and: Prisma.TaskWhereInput[] = [];
    if (visibility) and.push(visibility);
    if (mine) {
      // "Mine" covers both accountability and execution, so a delegated task
      // shows up for the designer actually doing it.
      and.push({
        OR: [
          { assignees: { some: { userId: user.id } } },
          { workers: { some: { userId: user.id } } },
        ],
      });
    }

    // Date range, in company-zone days. `to` is inclusive, so its bound is the
    // following midnight, exclusive. Unparseable values are ignored.
    const dayKey = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
    const fromKey = dayKey(sp.get("from"));
    const toKey = dayKey(sp.get("to"));
    const from = fromKey ? parseUserDateTime(fromKey) : null;
    const toNext = toKey ? parseUserDateTime(addDaysKey(toKey, 1)) : null;
    const dateFields = sp.getAll("dateField").filter(Boolean);
    if (from || toNext) {
      const range: { gte?: Date; lt?: Date } = {
        ...(from ? { gte: from } : {}),
        ...(toNext ? { lt: toNext } : {}),
      };
      // Waiting Approval, Editing and Hold have no stamp column, so they match
      // on the activity log: any entry into that status within the range, via
      // a manual status change or the submit / request-changes flow.
      const enteredStatus = (status: TaskStatus, ...verbs: string[]): Prisma.TaskWhereInput => ({
        activities: {
          some: {
            createdAt: range,
            OR: [
              { verb: "changed status", meta: { path: ["to"], equals: status } },
              ...verbs.map((verb) => ({ verb })),
            ],
          },
        },
      });
      const columns = {
        deadline: { deadline: range },
        created: { createdAt: range },
        started: { startedAt: range },
        waiting: enteredStatus("WAITING_APPROVAL", "submitted for approval"),
        editing: enteredStatus("EDITING", "requested changes"),
        hold: enteredStatus("HOLD"),
        approved: { approvedAt: range },
      } satisfies Record<string, Prisma.TaskWhereInput>;
      // Several fields match any of them; none (or none known) means all.
      const picked = dateFields
        .filter((f): f is keyof typeof columns => Object.hasOwn(columns, f))
        .map((f) => columns[f]);
      // Into AND, not the top-level OR, for the same reason as `mine` above.
      and.push({ OR: picked.length ? picked : Object.values(columns) });
    } else {
      // No dates picked: the same selection filters on where the task is now.
      const current: Record<string, Prisma.TaskWhereInput> = {
        deadline: { deadline: { not: null } },
        started: { status: "IN_PROGRESS" },
        waiting: { status: "WAITING_APPROVAL" },
        editing: { status: "EDITING" },
        hold: { status: "HOLD" },
        approved: { status: "DONE" },
      };
      // A picked field with no current-state predicate (Created) restricts
      // nothing, so OR-ing it in means no restriction at all.
      if (dateFields.length && dateFields.every((f) => Object.hasOwn(current, f))) {
        and.push({ OR: dateFields.map((f) => current[f]) });
      }
    }

    const where: Prisma.TaskWhereInput = {
      ...(and.length ? { AND: and } : {}),
      parentId: sp.get("includeSubtasks") ? undefined : null,
      // Search spans the hierarchy: typing a client or project name finds that
      // account's work without having to know a task code.
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { code: { contains: q, mode: "insensitive" as const } },
              { client: { company: { contains: q, mode: "insensitive" as const } } },
              { project: { name: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
      ...(status.length ? { status: { in: status as TaskStatus[] } } : {}),
      ...(group === "open" ? { status: { in: openStatuses } } : {}),
      ...(group === "closed" ? { status: { in: closedStatuses } } : {}),
      ...(department ? { departmentId: department } : {}),
      ...(project ? { projectId: project } : {}),
      ...(client ? { clientId: client } : {}),
      ...(priority ? { priority: priority as never } : {}),
      ...(createdBy ? { createdById: createdBy } : {}),
      ...(assignedTo ? { assignees: { some: { userId: assignedTo } } } : {}),
    };

    const tasks = await db.task.findMany({
      where,
      include: {
        assignees: { include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } } },
        workers: {
          include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
          orderBy: { assignedAt: "asc" },
        },
        labels: { include: { label: true } },
        project: { select: { id: true, name: true } },
        client: { select: { id: true, company: true } },
        department: { select: { id: true, name: true, color: true } },
        _count: { select: { subtasks: true, comments: true } },
      },
      orderBy: [{ priority: "desc" }, { deadline: "asc" }],
    });

    return NextResponse.json({ tasks });
  } catch (e) {
    return toErrorResponse(e);
  }
}

/**
 * "yyyy-MM-dd" shifted by whole days. Calendar arithmetic on the key itself
 * (via UTC, which has no DST), so the result is converted to an instant in the
 * company zone afterwards and a DST change never makes a "day" 23 or 25 hours.
 */
function addDaysKey(key: string, days: number) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  /**
   * DONE and WAITING_APPROVAL are deliberately absent: a task cannot be born
   * complete or under review, because either would mean skipping the approval
   * flow that DONE is supposed to represent. New work starts open and earns its
   * way to DONE through submit → approve.
   */
  status: z.enum(["TODO", "IN_PROGRESS", "HOLD", "EDITING", "CANCELLED"]).default("TODO"),
  projectId: z.string().optional().nullable(),
  /**
   * Only honoured for tasks with NO project — a project's client always wins.
   * Still accepted so existing API callers do not break; it is simply ignored
   * when projectId is set.
   */
  clientId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),
  estimatedHours: z.number().optional().nullable(),
  assigneeIds: z.array(z.string()).default([]),
  // The worker set. `workerId` is the pre-multi-worker form, still accepted from
  // older clients and folded into `workerIds` below.
  workerIds: z.array(z.string()).optional(),
  workerId: z.string().optional().nullable(),
  labelIds: z.array(z.string()).default([]),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission("Task.Create");
    const data = createSchema.parse(await req.json());

    // Enforce the assignment matrix server-side rather than trusting the
    // filtered dropdown — same rule the meta route builds the dropdown from.
    for (const uid of data.assigneeIds) {
      if (!(await isAssignableBy(user, uid))) {
        throw new ApiError(403, "You cannot assign tasks to one of the selected people.");
      }
    }
    // Collapse the legacy single field into the set form, so everything below
    // works one way. `workerIds` wins if both are somehow sent.
    const workerIds = [
      ...new Set(data.workerIds ?? (data.workerId ? [data.workerId] : [])),
    ];

    if (workerIds.length) {
      if (!can(user, "Task.AssignWorker")) {
        throw new ApiError(403, "Missing permission: Task.AssignWorker");
      }
      for (const workerId of workerIds) {
        if (!(await isAssignableBy(user, workerId))) {
          throw new ApiError(403, "You cannot assign that person as the worker.");
        }
      }
    }

    // Client is DERIVED from the project, never taken from the payload when a
    // project is set — the user is not asked for it at all.
    const clientId = await resolveTaskClientId(data.projectId, data.clientId);

    const code = await nextTaskCode();

    // Server clock only — the client never supplies these.
    const now = new Date();
    const stamps = lifecycleStamps(
      { assignedAt: null, startedAt: null, status: "TODO" },
      { status: data.status, hasAssignees: data.assigneeIds.length > 0 },
      now
    );

    const task = await db.task.create({
      data: {
        code,
        ...stamps,
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
        projectId: data.projectId || null,
        clientId,
        departmentId: data.departmentId || null,
        parentId: data.parentId || null,
        deadline: data.deadline ? parseDeadline(data.deadline) : null,
        estimatedHours: data.estimatedHours ?? null,
        createdById: user.id,
        assignees: { create: data.assigneeIds.map((userId) => ({ userId })) },
        workers: { create: workerIds.map((userId) => ({ userId, assignedAt: now })) },
        labels: { create: data.labelIds.map((labelId) => ({ labelId })) },
      },
      include: { assignees: true, workers: true },
    });

    await logActivity({ actorId: user.id, taskId: task.id, verb: "created" });
    if (stamps.assignedAt) {
      await logActivity({
        actorId: user.id,
        taskId: task.id,
        verb: "assigned",
        meta: { assignedAt: stamps.assignedAt, assigneeIds: data.assigneeIds },
      });
    }
    if (stamps.startedAt) {
      await logActivity({
        actorId: user.id,
        taskId: task.id,
        verb: "started work",
        meta: { startedAt: stamps.startedAt },
      });
    }
    if (workerIds.length) {
      // The TaskWorker rows were created with the task above, so this only opens
      // the matching history rows — recordWorkerChange would diff to an empty
      // set and write nothing.
      await db.workerAssignment.createMany({
        data: workerIds.map((workerId) => ({
          taskId: task.id,
          workerId,
          assignedById: user.id,
          assignedAt: now,
        })),
      });
      await logActivity({
        actorId: user.id,
        taskId: task.id,
        verb: "assigned worker",
        meta: { workerIds },
      });
    }
    await audit({
      actorId: user.id, action: "task.create", entity: "task", entityId: task.id,
      newValue: {
        code, title: data.title,
        assignedAt: stamps.assignedAt ?? null, startedAt: stamps.startedAt ?? null,
        workerIds,
      },
    });

    const notifyWorkers = workerIds.filter((id) => id !== user.id);
    if (notifyWorkers.length) {
      await notifyMany(notifyWorkers, {
        type: "TASK_ASSIGNED",
        title: "You've been assigned to execute a task",
        body: `${user.firstName} ${user.lastName} assigned you as a worker on "${task.title}" (${code}).`,
        link: `/tasks?task=${task.id}`,
        meta: { taskId: task.id, assignedBy: `${user.firstName} ${user.lastName}`, role: "worker" },
      });
    }

    if (data.assigneeIds.length) {
      await notifyMany(data.assigneeIds.filter((id) => id !== user.id), {
        type: "TASK_ASSIGNED",
        title: "New Task Assigned",
        body: `${user.firstName} ${user.lastName} assigned "${task.title}" to you.`,
        link: `/tasks?task=${task.id}`,
        meta: { taskId: task.id, assignedBy: `${user.firstName} ${user.lastName}` },
      });
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
