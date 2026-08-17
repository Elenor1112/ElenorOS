import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, toErrorResponse } from "@/lib/api";
import { isApproverFor, wouldSelfApprove, type ApprovableTask } from "@/lib/rbac";
import { taskVisibilityFilter } from "@/lib/tasks";

// All requests awaiting THIS user's decision (current pending step assigned to them
// or their role), across leave / permission / resignation / tasks.
export async function GET() {
  try {
    const user = await requireUser();

    const pendingSteps = await db.approvalStep.findMany({
      where: {
        decision: "PENDING",
        OR: [
          { approverId: user.id },
          ...(user.isSuperAdmin ? [{}] : [{ roleKey: user.roleKey }]),
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    // only the *current* (lowest-order pending) step per entity is actionable
    const byEntity = new Map<string, (typeof pendingSteps)[number]>();
    for (const s of pendingSteps) {
      const key = `${s.kind}:${s.entityId}`;
      const cur = byEntity.get(key);
      if (!cur || s.order < cur.order) byEntity.set(key, s);
    }

    const leaveIds: string[] = [];
    const permIds: string[] = [];
    const resignIds: string[] = [];
    for (const s of byEntity.values()) {
      if (s.kind === "LEAVE") leaveIds.push(s.entityId);
      else if (s.kind === "PERMISSION") permIds.push(s.entityId);
      else if (s.kind === "RESIGNATION") resignIds.push(s.entityId);
    }

    // Tasks are a different approval mechanism (a sequential chain derived from
    // the task's own people, not a role/approverId table — see approvalStages()
    // in lib/rbac.ts), so they cannot be joined into the ApprovalStep query
    // above. Narrowed to WAITING_APPROVAL tasks the user could plausibly act on
    // (own/created/followed/department, mirroring taskVisibilityFilter) before
    // the authoritative per-row check below, so this never scans every
    // in-review task in the agency.
    const visibility = taskVisibilityFilter(user);
    const candidateTasks = await db.task.findMany({
      where: {
        status: "WAITING_APPROVAL",
        ...(visibility ? visibility : {}),
      },
      select: {
        id: true, code: true, title: true, status: true, createdById: true, approvalStage: true,
        submittedAt: true,
        assignees: { select: { userId: true } },
        workers: { select: { userId: true } },
        followUps: { select: { userId: true } },
        submissions: {
          where: { decision: "PENDING" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            submittedBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, jobTitle: true } },
          },
        },
      },
      orderBy: { submittedAt: "asc" },
    });

    // The authoritative filter: is it actually this user's turn? Reuses the same
    // predicates the per-task approval panel renders its controls with
    // (isApproverFor / wouldSelfApprove), so the inbox and that panel can never
    // disagree about whose turn a task is on — see task-approval.tsx.
    const tasks = candidateTasks.filter((t) => {
      const submission = t.submissions[0];
      if (!submission) return false;
      const shape: ApprovableTask = {
        status: t.status,
        assignees: t.assignees,
        workers: t.workers,
        followUps: t.followUps,
        createdById: t.createdById,
        approvalStage: t.approvalStage,
      };
      if (!isApproverFor(user, shape, submission.submittedBy.id)) return false;
      return !wouldSelfApprove(user, { submittedById: submission.submittedBy.id });
    });

    const [leaves, perms, resigns] = await Promise.all([
      db.leaveRequest.findMany({
        where: { id: { in: leaveIds }, status: "PENDING" },
        include: { requester: { select: { firstName: true, lastName: true, avatarUrl: true, jobTitle: true } } },
      }),
      db.permissionRequest.findMany({
        where: { id: { in: permIds }, status: "PENDING" },
        include: { requester: { select: { firstName: true, lastName: true, avatarUrl: true, jobTitle: true } } },
      }),
      db.resignation.findMany({
        where: { id: { in: resignIds }, status: "PENDING" },
        include: { employee: { select: { firstName: true, lastName: true, avatarUrl: true, jobTitle: true } } },
      }),
    ]);

    return NextResponse.json({
      leaves,
      permissions: perms,
      resignations: resigns,
      tasks: tasks.map((t) => ({
        id: t.id,
        code: t.code,
        title: t.title,
        submittedAt: t.submittedAt,
        submittedBy: t.submissions[0].submittedBy,
      })),
      total: leaves.length + perms.length + resigns.length + tasks.length,
    });
  } catch (e) {
    return toErrorResponse(e);
  }
}
