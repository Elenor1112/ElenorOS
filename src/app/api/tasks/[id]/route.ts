import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, requirePermission, audit, toErrorResponse, ApiError } from "@/lib/api";
import {
  logActivity, rollupSubtaskProgress, statusDefaultProgress, canViewTask,
  parseDeadline, formatDeadlineText, lifecycleStamps,
  workerAuthorization, isAssignableBy, recordWorkerChange, resolveTaskClientId,
  recordFollowUpChange, canBeFollowUp,
} from "@/lib/tasks";
import {
  can, canChangeTaskStatus, canManageFollowUp, isTaskCreatorEquivalent,
} from "@/lib/rbac";
import { assertDirectStatusChange, submissionInclude } from "@/lib/task-lifecycle";
import { notifyMany } from "@/lib/notify";
import type { TaskStatus } from "@prisma/client";

const taskInclude = {
  assignees: { include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, jobTitle: true } } } },
  followers: { include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } } },
  followUps: {
    include: {
      user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, jobTitle: true } },
      addedBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { addedAt: "asc" as const },
  },
  workers: {
    include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, jobTitle: true } } },
    orderBy: { assignedAt: "asc" as const },
  },
  workerHistory: {
    include: {
      worker: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      assignedBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { assignedAt: "desc" as const },
    take: 20,
  },
  labels: { include: { label: true } },
  project: { select: { id: true, name: true } },
  client: { select: { id: true, company: true } },
  department: { select: { id: true, name: true, color: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  parent: { select: { id: true, code: true, title: true } },
  subtasks: {
    include: { assignees: { include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } } } },
    orderBy: { createdAt: "asc" as const },
  },
  checklist: { orderBy: { order: "asc" as const } },
  comments: {
    include: { author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
    orderBy: { createdAt: "asc" as const },
  },
  activities: {
    include: { actor: { select: { firstName: true, lastName: true, avatarUrl: true } } },
    orderBy: { createdAt: "desc" as const },
    take: 30,
  },
  attachments: {
    include: { uploadedBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
    orderBy: { createdAt: "asc" as const },
  },
  dependsOn: { include: { prerequisite: { select: { id: true, code: true, title: true, status: true } } } },
  // The approval evidence trail, newest first. Every attempt is returned, not
  // just the open one, so the approver can compare a resubmission against what
  // was rejected last time.
  submissions: submissionInclude,
  approvedBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
} as const;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const task = await db.task.findUnique({ where: { id }, include: taskInclude });
    if (!task) throw new ApiError(404, "Task not found");
    // 404 rather than 403 so an unrelated task's existence is not disclosed.
    if (!(await canViewTask(user, id))) throw new ApiError(404, "Task not found");
    return NextResponse.json({ task });
  } catch (e) {
    return toErrorResponse(e);
  }
}

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "HOLD", "WAITING_APPROVAL", "EDITING", "DONE", "CANCELLED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  deadline: z.string().optional().nullable(),
  estimatedHours: z.number().optional().nullable(),
  actualHours: z.number().optional().nullable(),
  projectId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  assigneeIds: z.array(z.string()).optional(),
  // The worker set. Empty array clears it; undefined leaves it untouched.
  workerIds: z.array(z.string()).optional(),
  // Superseded by `workerIds`, still accepted so a client from before the
  // multi-worker change keeps working: it means "make this the only worker",
  // and null still means "clear". Normalized into `workerIds` below, which is
  // the only form the rest of this handler sees.
  workerId: z.string().optional().nullable(),
  // The follow-up set — people carrying the creator's authority. Empty array
  // clears it; undefined leaves it untouched, same convention as workerIds.
  followUpIds: z.array(z.string()).optional(),
  labelIds: z.array(z.string()).optional(),
  // Still accepted so an older client sending it gets the explanatory 403 below
  // rather than a silent no-op; the approval flow owns this field.
  approvalStatus: z.enum(["NOT_REQUIRED", "PENDING", "APPROVED", "REJECTED"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const data = updateSchema.parse(await req.json());

    const before = await db.task.findUnique({
      where: { id },
      include: { assignees: true, workers: true, followUps: true },
    });
    if (!before) throw new ApiError(404, "Task not found");

    if (!(await canViewTask(user, id))) throw new ApiError(404, "Task not found");

    // Title, description, priority, deadline, assignment and project/department
    // placement are management decisions: CEO, Operations Manager, Account
    // Manager and Art Director only. Everyone else on a task may still move it
    // through statuses, log progress and work the checklist.
    const PRIVILEGED_FIELDS = [
      "title", "description", "priority", "deadline",
      "estimatedHours", "projectId", "departmentId", "labelIds",
    ] as const;
    // A follow-up holds the creator's authority on this ONE task, which is the
    // whole point of the role — so they edit it on the same footing, without
    // needing the agency-wide Task.EditDetails grant. Scoped to this task only:
    // it never leaks into any other row, because it is derived from this task's
    // own follow-up set.
    const creatorEquivalent = isTaskCreatorEquivalent(user, before);
    const attempted = PRIVILEGED_FIELDS.filter((f) => data[f] !== undefined);
    if (attempted.length && !can(user, "Task.EditDetails") && !creatorEquivalent) {
      throw new ApiError(
        403,
        `You can update status, progress and the checklist, but not: ${attempted.join(", ")}.`
      );
    }

    // Assignees carry their own permission rather than riding on EditDetails:
    // moving accountability off the person a task was handed to is a narrower
    // decision than editing its title or deadline. Held by the CEO, Operations
    // Manager, PR & Sales Manager and Account Management — an Art Director can
    // edit their department's tasks but not reassign them.
    const changingAssignees =
      data.assigneeIds !== undefined &&
      (data.assigneeIds.length !== before.assignees.length ||
        data.assigneeIds.some((uid) => !before.assignees.some((a) => a.userId === uid)));
    // Creator-equivalence extends here for the same reason it extends to the
    // privileged fields: a follow-up covering for the person who briefed the work
    // must be able to move it to someone else when the assignee falls through.
    // The per-candidate matrix check below still applies to whoever they pick,
    // so this widens WHO may reassign, never WHOM they may reassign to.
    if (changingAssignees && !can(user, "Task.EditAssignees") && !creatorEquivalent) {
      throw new ApiError(403, "You are not allowed to change who this task is assigned to.");
    }

    // Status belongs to the person doing the work. Everyone else — managers,
    // administrators, the CEO — may read it but never set it, which is why this
    // check has no super-admin bypass. Enforced here rather than only in the UI
    // so a direct API call cannot get around it.
    const changingStatus = data.status !== undefined && data.status !== before.status;
    if (changingStatus && !canChangeTaskStatus(user, before)) {
      throw new ApiError(
        403,
        "Only the employee assigned to this task can change its status."
      );
    }

    // The approval lifecycle is not reachable through a plain status edit. DONE
    // is only ever written by the approve endpoint, and entering WAITING_APPROVAL
    // requires evidence this payload cannot carry — so both are refused here with
    // a message naming the action to use instead. Checked after the permission
    // gate above so an outsider gets "not yours" rather than a workflow lecture.
    if (changingStatus) {
      assertDirectStatusChange(before.status, data.status!);
    }

    // approvalStatus mirrors the approval flow's own decisions; letting a client
    // set it directly would let a task read APPROVED without ever being reviewed.
    if (data.approvalStatus !== undefined && data.approvalStatus !== before.approvalStatus) {
      throw new ApiError(
        403,
        "Approval status is set by approving or rejecting the task, not edited directly."
      );
    }

    // Workers are deliberately NOT a privileged field: delegating execution is
    // exactly what an Art Director without Task.EditDetails must be able to do.
    // It carries its own permission check instead.
    //
    // Collapse the legacy single `workerId` into the set form first, so there is
    // exactly one code path below. `workerIds` wins if a client somehow sends
    // both — it is the field that can express what the caller actually wants.
    const requestedWorkerIds =
      data.workerIds !== undefined
        ? [...new Set(data.workerIds)]
        : data.workerId !== undefined
          ? data.workerId
            ? [data.workerId]
            : []
          : undefined;

    const beforeWorkerIds = before.workers.map((w) => w.userId);
    const addedWorkers = requestedWorkerIds?.filter((id) => !beforeWorkerIds.includes(id)) ?? [];
    const removedWorkers = requestedWorkerIds
      ? beforeWorkerIds.filter((id) => !requestedWorkerIds.includes(id))
      : [];
    const changingWorkers = addedWorkers.length > 0 || removedWorkers.length > 0;

    if (changingWorkers) {
      const authz = workerAuthorization(user, before, {
        // Only a task with nobody on it is a "first" assignment; adding a second
        // worker to a staffed task is a change to existing delegation.
        settingFirstWorker: beforeWorkerIds.length === 0,
      });
      if (!authz.allowed) throw new ApiError(403, authz.reason ?? "Not allowed to set the worker");

      // Only NEWLY added people are validated. Re-sending someone already on the
      // task must not fail because the actor's scope narrowed since — otherwise
      // removing one worker could be blocked by an unrelated existing one.
      for (const workerId of addedWorkers) {
        // The candidate must be someone this user may put on work at all…
        if (!(await isAssignableBy(user, workerId))) {
          throw new ApiError(403, "You cannot assign that person as the worker.");
        }
        // …and must fall inside the narrower delegation scope when it applies
        // (an Art Director delegating is limited to their own department).
        const candidate = await db.user.findFirst({
          where: { id: workerId, ...authz.candidates },
          select: { id: true },
        });
        if (!candidate) {
          throw new ApiError(403, "You can only assign a worker from your own team.");
        }
      }
    }

    // Follow-ups: who may change the set, and who may be put in it.
    //
    // Like workers, this is NOT a privileged field — an assignee with no
    // Task.EditDetails must be able to nominate cover, which is the requirement
    // the feature exists for — so it carries its own permission check instead.
    const beforeFollowUpIds = before.followUps.map((f) => f.userId);
    const requestedFollowUpIds =
      data.followUpIds !== undefined ? [...new Set(data.followUpIds)] : undefined;
    const addedFollowUps = requestedFollowUpIds?.filter((uid) => !beforeFollowUpIds.includes(uid)) ?? [];
    const removedFollowUps = requestedFollowUpIds
      ? beforeFollowUpIds.filter((uid) => !requestedFollowUpIds.includes(uid))
      : [];
    const changingFollowUps = addedFollowUps.length > 0 || removedFollowUps.length > 0;

    if (changingFollowUps) {
      if (!canManageFollowUp(user, before)) {
        throw new ApiError(
          403,
          "Only the people accountable for this task can change its follow-ups."
        );
      }
      // Only NEW nominations are validated, so removing somebody is never blocked
      // by an existing entry that would no longer qualify — same rule as workers.
      for (const uid of addedFollowUps) {
        if (uid === before.createdById) {
          throw new ApiError(
            400,
            "That person created this task and already has full authority over it."
          );
        }
        if (!(await canBeFollowUp(uid))) {
          throw new ApiError(
            403,
            "A follow-up must be an active employee who is allowed to approve tasks."
          );
        }
      }
    }

    // New assignees are validated against the same rules, so the API enforces
    // the assignment matrix rather than trusting the filtered UI dropdown.
    if (data.assigneeIds) {
      const added = data.assigneeIds.filter((uid) => !before.assignees.some((a) => a.userId === uid));
      for (const uid of added) {
        if (!(await isAssignableBy(user, uid))) {
          throw new ApiError(403, "You cannot assign tasks to one of the selected people.");
        }
      }
    }

    // A deadline may not be moved into the past. Parsed once here and reused
    // below so the rule is applied in exactly one place.
    //
    // An UNCHANGED deadline is allowed through even when it is already past:
    // editing the title of a task that ran over last week must not be blocked
    // by a date the user is not touching. Only an actual move is validated,
    // which is what keeps existing historical records editable.
    let nextDeadline: Date | null | undefined;
    if (data.deadline === null) {
      nextDeadline = null;
    } else if (data.deadline !== undefined) {
      const unchanged = parseDeadline(data.deadline, { allowPast: true });
      nextDeadline =
        unchanged.getTime() === before.deadline?.getTime()
          ? unchanged
          : parseDeadline(data.deadline);
    }

    // progress auto-set on status change unless explicitly provided
    let progress = data.progress;
    if (data.status && data.status !== before.status && progress === undefined) {
      progress = statusDefaultProgress(data.status, before.progress);
    }

    // Lifecycle stamps — server clock, write-once, never accepted from the client.
    // Computed before the write so the assignee reconcile below can't race it.
    const now = new Date();
    const willHaveAssignees = data.assigneeIds
      ? data.assigneeIds.length > 0
      : before.assignees.length > 0;
    const stamps = lifecycleStamps(
      { assignedAt: before.assignedAt, startedAt: before.startedAt, status: before.status },
      { status: data.status, hasAssignees: willHaveAssignees },
      now
    );

    // Moving a task to another project moves it to that project's client too.
    // Recomputed here so the response is correct immediately; the DB trigger
    // guarantees it regardless of how the row is written.
    const nextClientId =
      data.projectId === undefined
        ? undefined
        : await resolveTaskClientId(data.projectId, before.clientId);

    await db.task.update({
      where: { id },
      data: {
        ...stamps,
        clientId: nextClientId,
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        progress,
        deadline: nextDeadline,
        estimatedHours: data.estimatedHours,
        actualHours: data.actualHours,
        projectId: data.projectId === undefined ? undefined : data.projectId || null,
        departmentId: data.departmentId === undefined ? undefined : data.departmentId || null,
      },
    });

    // Worker set, history, activity and notification. recordWorkerChange does the
    // reconcile and returns who actually moved, so only real changes are logged
    // and only the people affected are notified.
    if (changingWorkers) {
      await recordWorkerChange({
        taskId: id,
        workerIds: requestedWorkerIds!,
        actorId: user.id,
        at: now,
      });

      // One lookup covers both the activity meta and the notification text.
      const movedUsers = await db.user.findMany({
        where: { id: { in: [...addedWorkers, ...removedWorkers] } },
        select: { id: true, firstName: true, lastName: true },
      });
      const nameOf = (uid: string) => {
        const u = movedUsers.find((m) => m.id === uid);
        return u ? `${u.firstName} ${u.lastName}` : "someone";
      };

      if (addedWorkers.length) {
        await logActivity({
          actorId: user.id,
          taskId: id,
          verb: beforeWorkerIds.length ? "added worker" : "assigned worker",
          meta: {
            workerIds: addedWorkers,
            // Kept singular as well so existing activity rendering — which reads
            // meta.workerName — still shows a name on a single-worker change.
            workerName: addedWorkers.map(nameOf).join(", "),
            previousWorkerIds: beforeWorkerIds,
          },
        });
        await notifyMany(
          addedWorkers.filter((uid) => uid !== user.id),
          {
            type: "TASK_ASSIGNED",
            title: "You've been assigned to execute a task",
            body: `${user.firstName} ${user.lastName} assigned you as a worker on "${before.title}" (${before.code}).`,
            link: `/tasks?task=${id}`,
            meta: { taskId: id, assignedBy: `${user.firstName} ${user.lastName}`, role: "worker" },
          }
        );
      }

      if (removedWorkers.length) {
        await logActivity({
          actorId: user.id,
          taskId: id,
          verb: "removed worker",
          meta: {
            workerIds: removedWorkers,
            workerName: removedWorkers.map(nameOf).join(", "),
            previousWorkerIds: beforeWorkerIds,
          },
        });
      }
    }

    // Follow-up set, activity and notification. Reconciled the same way workers
    // are, so an unchanged list neither churns rows nor notifies anybody.
    if (changingFollowUps) {
      await recordFollowUpChange({
        taskId: id,
        followUpIds: requestedFollowUpIds!,
        actorId: user.id,
        at: now,
      });

      const movedFollowUps = await db.user.findMany({
        where: { id: { in: [...addedFollowUps, ...removedFollowUps] } },
        select: { id: true, firstName: true, lastName: true },
      });
      const followUpName = (uid: string) => {
        const u = movedFollowUps.find((m) => m.id === uid);
        return u ? `${u.firstName} ${u.lastName}` : "someone";
      };

      if (addedFollowUps.length) {
        await logActivity({
          actorId: user.id,
          taskId: id,
          verb: "added follow-up",
          meta: {
            followUpIds: addedFollowUps,
            followUpName: addedFollowUps.map(followUpName).join(", "),
          },
        });
        // Being made a follow-up hands somebody authority over work they may not
        // have been watching, so they are told even though nothing was assigned
        // to them — otherwise the first they hear of it is an approval request.
        await notifyMany(addedFollowUps.filter((uid) => uid !== user.id), {
          type: "TASK_ASSIGNED",
          title: "You've been added as a follow-up",
          body: `${user.firstName} ${user.lastName} made you a follow-up on "${before.title}" (${before.code}). You have the same authority as the person who created it.`,
          link: `/tasks?task=${id}`,
          meta: { taskId: id, addedBy: `${user.firstName} ${user.lastName}`, role: "followUp" },
        });
      }

      if (removedFollowUps.length) {
        await logActivity({
          actorId: user.id,
          taskId: id,
          verb: "removed follow-up",
          meta: {
            followUpIds: removedFollowUps,
            followUpName: removedFollowUps.map(followUpName).join(", "),
          },
        });
      }
    }

    // reconcile assignees — only when the set actually differs, so resubmitting
    // an unchanged list doesn't churn the rows or log a phantom "reassigned".
    if (data.assigneeIds && changingAssignees) {
      await db.taskAssignee.deleteMany({ where: { taskId: id } });
      await db.taskAssignee.createMany({ data: data.assigneeIds.map((userId) => ({ taskId: id, userId })) });
      const added = data.assigneeIds.filter((uid) => !before.assignees.some((a) => a.userId === uid));
      if (stamps.assignedAt) {
        // First time this task has had anyone on it.
        await logActivity({
          actorId: user.id,
          taskId: id,
          verb: "assigned",
          meta: { assignedAt: stamps.assignedAt, assigneeIds: data.assigneeIds },
        });
      } else if (added.length) {
        await logActivity({
          actorId: user.id,
          taskId: id,
          verb: "reassigned",
          meta: { assigneeIds: data.assigneeIds },
        });
      }
      if (added.length) {
        await notifyMany(added.filter((uid) => uid !== user.id), {
          type: "TASK_ASSIGNED",
          title: "New Task Assigned",
          body: `${user.firstName} ${user.lastName} assigned "${before.title}" to you.`,
          link: `/tasks?task=${id}`,
          meta: { taskId: id, assignedBy: `${user.firstName} ${user.lastName}` },
        });
      }
    }

    if (data.labelIds) {
      await db.taskLabel.deleteMany({ where: { taskId: id } });
      await db.taskLabel.createMany({ data: data.labelIds.map((labelId) => ({ taskId: id, labelId })) });
    }

    // activity log for deadline changes
    if (data.deadline !== undefined) {
      if (nextDeadline?.getTime() !== before.deadline?.getTime()) {
        await logActivity({
          actorId: user.id,
          taskId: id,
          verb: "changed deadline",
          meta: { from: before.deadline, to: nextDeadline },
        });
        // let assignees know the date moved
        const others = before.assignees.map((a) => a.userId).filter((uid) => uid !== user.id);
        if (others.length) {
          await notifyMany(others, {
            type: "DEADLINE_REMINDER",
            title: `Deadline changed: ${before.title}`,
            body: `${user.firstName} moved ${before.code} to ${nextDeadline ? formatDeadlineText(nextDeadline) : "no deadline"}`,
            link: `/tasks?task=${id}`,
          });
        }
      }
    }

    // activity log for status/progress
    if (data.status && data.status !== before.status) {
      await logActivity({ actorId: user.id, taskId: id, verb: "changed status", meta: { from: before.status, to: data.status } });
      if (stamps.startedAt) {
        await logActivity({
          actorId: user.id,
          taskId: id,
          verb: "started work",
          meta: { startedAt: stamps.startedAt },
        });
      }
      // Entering approval and reaching DONE are unreachable here (see
      // assertDirectStatusChange), so their notifications live with the actions
      // that perform them in lib/task-lifecycle.ts.
      await rollupSubtaskProgress(id);
    }
    if (progress !== undefined && progress !== before.progress) {
      await rollupSubtaskProgress(id);
    }

    await audit({
      actorId: user.id, action: "task.update", entity: "task", entityId: id,
      oldValue: {
        status: before.status, progress: before.progress,
        assignedAt: before.assignedAt, startedAt: before.startedAt,
        workerIds: beforeWorkerIds,
        // Granting somebody creator-level authority is a privilege change, so it
        // belongs in the audit trail and not only in the activity feed.
        followUpIds: beforeFollowUpIds,
      },
      newValue: {
        status: data.status ?? before.status,
        progress: progress ?? before.progress,
        assignedAt: stamps.assignedAt ?? before.assignedAt,
        startedAt: stamps.startedAt ?? before.startedAt,
        workerIds: changingWorkers ? requestedWorkerIds! : beforeWorkerIds,
        followUpIds: changingFollowUps ? requestedFollowUpIds! : beforeFollowUpIds,
      },
    });

    const fresh = await db.task.findUnique({ where: { id }, include: taskInclude });
    return NextResponse.json({ task: fresh });
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("Task.Delete");
    const { id } = await params;
    const task = await db.task.findUnique({ where: { id } });
    if (!task) throw new ApiError(404, "Task not found");
    await db.task.delete({ where: { id } });
    await audit({ actorId: user.id, action: "task.delete", entity: "task", entityId: id, oldValue: { code: task.code } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
