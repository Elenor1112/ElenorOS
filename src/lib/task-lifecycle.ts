import "server-only";
import { db } from "./db";
import { ApiError } from "./api";
import { logActivity } from "./tasks";
import { notifyMany } from "./notify";
import {
  canSubmitForApproval, isApproverFor, wouldSelfApprove, taskWorkerIds,
  approvalChain, currentApprovers, isFinalStage, isChainOverride,
  taskFollowUpIds,
  type ApprovableTask, type SessionUser,
} from "./rbac";
import {
  APPROVAL_STATUS, REWORK_STATUS, SUBMITTABLE_FROM, DIRECTLY_SETTABLE_STATUSES,
} from "./task-status";
import type { Prisma, TaskStatus } from "@prisma/client";

/**
 * The task approval lifecycle: EDITING → WAITING_APPROVAL → DONE (or back).
 *
 * Everything that decides whether a status move is legal, who may make it, and
 * what evidence it requires lives here, so the rules hold for any caller — the
 * task drawer, the Kanban drag handler, a direct API call or a future importer.
 * The routes are thin: they authenticate, then delegate to this module.
 *
 * Approval is a CHAIN, not a single gate: work climbs from the people executing
 * it to the people accountable for it to the person who briefed it —
 * Designer submits → Art Director approves → Account Manager approves → DONE.
 * The chain is derived from the task's own people (see `approvalChain` in
 * lib/rbac.ts), so delegating a task lengthens it automatically and a task with
 * no delegation collapses to a single approval.
 *
 * Three rules are absolute and worth stating up front, because they are what the
 * whole workflow exists to guarantee:
 *
 *  1. NOBODY reaches DONE by setting the status. Not the worker, not the
 *     assignee, not the CEO. DONE is only ever written by `approveTask` below,
 *     which requires a submission under review. This is why the generic PATCH
 *     route rejects `status: "DONE"` outright rather than permission-checking it.
 *  2. A task cannot enter WAITING_APPROVAL without evidence attached. The check
 *     is here, not in the form, so an API caller cannot skip it.
 *  3. Only the approver whose TURN it is may decide. An approval part-way up the
 *     chain advances the stage and leaves the task in WAITING_APPROVAL; only the
 *     last one closes it. Super admins may decide out of turn, recorded as an
 *     override, so a chain never deadlocks on somebody's absence.
 */

// ─── Statuses ────────────────────────────────────────────────

// The status facts live in lib/task-status.ts so the client UI can share them —
// see the note there. Re-exported so server callers have a single import.
export { APPROVAL_STATUS, REWORK_STATUS, SUBMITTABLE_FROM, DIRECTLY_SETTABLE_STATUSES };

// ─── Evidence ────────────────────────────────────────────────

/** One piece of deliverable evidence, as accepted from a submitter. */
export type EvidenceInput = {
  notes?: string | null;
  url?: string | null;
  /** Ids of files already uploaded against this task's draft submission. */
  fileIds?: string[];
};

/** Normalized evidence, with blank strings collapsed to null. */
export type NormalizedEvidence = {
  notes: string | null;
  url: string | null;
  fileIds: string[];
};

/**
 * Validate and normalize submission evidence.
 *
 * The requirement is "at least one of image, document, URL or notes", so this
 * rejects a submission carrying none of them. Whitespace-only notes count as
 * nothing — otherwise a single space would satisfy a rule meant to guarantee the
 * approver has something to look at.
 *
 * A URL must be http(s) and parseable. Anything else (a bare "tbd", a
 * `javascript:` payload) is rejected rather than stored: the approver's UI
 * renders this as a link, so an unvalidated scheme here becomes a click target
 * there.
 */
export function normalizeEvidence(input: EvidenceInput): NormalizedEvidence {
  const notes = input.notes?.trim() ? input.notes.trim() : null;
  const rawUrl = input.url?.trim() ? input.url.trim() : null;
  const fileIds = input.fileIds?.filter(Boolean) ?? [];

  let url: string | null = null;
  if (rawUrl) {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new ApiError(400, "That link is not a valid URL. Include the full address, e.g. https://drive.google.com/…");
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new ApiError(400, "Links must start with http:// or https://");
    }
    url = parsed.toString();
  }

  if (!notes && !url && fileIds.length === 0) {
    throw new ApiError(
      400,
      "Before submitting for approval you must attach proof of completion: upload an image or document, paste a link, or write a note describing the deliverable."
    );
  }

  return { notes, url, fileIds };
}

// ─── Transition guards ───────────────────────────────────────

/**
 * The task shape the guards need. Wider than ApprovableTask because the DB-side
 * rules also consult the open submission.
 */
export type LifecycleTask = ApprovableTask & { id: string; title: string; code: string };

/**
 * Assert that a plain status PATCH is allowed to write `next`.
 *
 * Throws a message that tells the caller what to do instead, rather than just
 * refusing — "you can't do that" on a status dropdown is a support ticket, while
 * "submit it for approval" is an instruction.
 */
export function assertDirectStatusChange(current: TaskStatus, next: TaskStatus): void {
  if (next === current) return;

  if (next === "DONE") {
    throw new ApiError(
      403,
      "A task cannot be marked Done directly — it has to be submitted for approval and approved. Submit it for approval, then an approver can sign it off."
    );
  }

  if (next === APPROVAL_STATUS) {
    throw new ApiError(
      400,
      "Submitting for approval requires proof of completion. Use the Submit for approval action so the evidence is attached."
    );
  }

  // Leaving an open review by editing the status would strand the submission
  // (still PENDING, no longer under review) and silently discard the approver's
  // queue entry. Rejection is the supported way back to EDITING.
  if (current === APPROVAL_STATUS && next !== "CANCELLED") {
    throw new ApiError(
      403,
      "This task is waiting for approval. An approver has to approve it or request changes — its status cannot be moved by hand while a review is open."
    );
  }

  if (!DIRECTLY_SETTABLE_STATUSES.includes(next)) {
    throw new ApiError(400, `Status cannot be set to ${next} directly.`);
  }

  // Reopening finished work is an approval decision that was already made, so it
  // does not get undone by a status edit either. CANCELLED is the exception:
  // retiring a completed task is a bookkeeping action, not a reopening.
  if (current === "DONE" && next !== "CANCELLED") {
    throw new ApiError(
      403,
      "This task has been approved and closed. Reopening it means submitting new work for approval, not editing its status."
    );
  }
}

// ─── Operations ──────────────────────────────────────────────

/** The submission shape returned to callers, including its files' metadata. */
const submissionSelect = {
  id: true, notes: true, url: true, decision: true, comment: true,
  createdAt: true, decidedAt: true,
  submittedBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  decidedBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  // Deliberately never selects `data` — payloads are streamed by the file route,
  // so listing evidence cannot accidentally pull megabytes into a JSON response.
  files: { select: { id: true, name: true, mimeType: true, size: true, createdAt: true } },
  // The stage sign-offs collected so far, oldest first, so the panel can show
  // "Art Director approved · waiting on Account Manager" while the review is
  // still open.
  approvals: {
    orderBy: { stage: "asc" as const },
    select: {
      id: true, stage: true, comment: true, isOverride: true, createdAt: true,
      approvedBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
    },
  },
} satisfies Prisma.TaskSubmissionSelect;

/**
 * Hand a task in for review: EDITING → WAITING_APPROVAL, with evidence.
 *
 * Creates the submission, attaches any already-uploaded files to it, moves the
 * status and notifies the people who can act on it. Runs in a transaction so a
 * task can never end up in WAITING_APPROVAL with no submission attached (or a
 * submission with no task pointing at it).
 */
export async function submitForApproval(opts: {
  user: SessionUser;
  task: LifecycleTask;
  evidence: EvidenceInput;
}) {
  const { user, task } = opts;

  if (!canSubmitForApproval(user, task)) {
    throw new ApiError(
      403,
      "Only the person the task is assigned to — its assignee or its worker — can submit it for approval."
    );
  }

  if (task.status === APPROVAL_STATUS) {
    throw new ApiError(409, "This task is already waiting for approval.");
  }
  if (task.status === "DONE") {
    throw new ApiError(409, "This task has already been approved.");
  }
  if (!SUBMITTABLE_FROM.includes(task.status)) {
    throw new ApiError(400, `A task with status ${task.status} cannot be submitted for approval.`);
  }

  const evidence = normalizeEvidence(opts.evidence);

  // Files are uploaded before the submission exists (the user picks them in the
  // form), so they arrive parented to the task with no submission id yet. Claim
  // only THIS task's still-unclaimed uploads belonging to THIS user: that is what
  // stops someone attaching another task's evidence, or re-attaching a file that
  // already belongs to an earlier decided submission, by guessing ids.
  const claimable = evidence.fileIds.length
    ? await db.taskSubmissionFile.findMany({
        where: {
          id: { in: evidence.fileIds },
          taskId: task.id,
          uploadedById: user.id,
          submissionId: null,
        },
        select: { id: true },
      })
    : [];

  // A referenced id that resolved to nothing means the draft expired or never
  // belonged to this user. Failing loudly beats silently submitting without the
  // file the worker believes they attached.
  if (claimable.length !== evidence.fileIds.length) {
    throw new ApiError(
      400,
      "Some of the uploaded files could not be found. Re-upload them and submit again."
    );
  }

  const now = new Date();

  const submission = await db.$transaction(async (tx) => {
    const created = await tx.taskSubmission.create({
      data: {
        taskId: task.id,
        submittedById: user.id,
        notes: evidence.notes,
        url: evidence.url,
      },
      select: { id: true },
    });

    if (claimable.length) {
      await tx.taskSubmissionFile.updateMany({
        where: { id: { in: claimable.map((f) => f.id) } },
        data: { submissionId: created.id },
      });
    }

    await tx.task.update({
      where: { id: task.id },
      data: {
        status: APPROVAL_STATUS,
        approvalStatus: "PENDING",
        activeSubmissionId: created.id,
        submittedAt: now,
        // Every submission climbs the chain from the bottom.
        approvalStage: 0,
        // A resubmission must not keep the previous approval stamps, or a task
        // bounced after being approved would still name an approver.
        approvedById: null,
        approvedAt: null,
      },
    });

    return tx.taskSubmission.findUniqueOrThrow({ where: { id: created.id }, select: submissionSelect });
  });

  await logActivity({
    actorId: user.id,
    taskId: task.id,
    verb: "submitted for approval",
    meta: {
      submissionId: submission.id,
      hasNotes: Boolean(evidence.notes),
      hasUrl: Boolean(evidence.url),
      fileCount: claimable.length,
    },
  });

  // Stage 0 explicitly: `task` is the pre-submit row, whose approvalStage may
  // still carry a value from an earlier review.
  await notifyMany(await approverIdsFor({ ...task, approvalStage: 0 }, user.id, user.id), {
    type: "APPROVAL_REQUIRED",
    title: "Approval needed",
    body: `${user.firstName} ${user.lastName} submitted "${task.title}" (${task.code}) for your approval.`,
    link: `/tasks?task=${task.id}`,
    meta: { taskId: task.id, submissionId: submission.id },
  });

  return submission;
}

/**
 * Approve at the current stage of a task's approval chain.
 *
 * Two possible outcomes, and which one happens depends on where in the chain the
 * task is:
 *
 *  - NOT the last stage → the task STAYS in WAITING_APPROVAL, `approvalStage`
 *    advances, and the next approver is notified. Nothing about the task reads as
 *    finished, because it is not.
 *  - the LAST stage → WAITING_APPROVAL → DONE. This is the only path to DONE in
 *    the entire codebase.
 *
 * Every sign-off, intermediate or final, is recorded as a TaskApprovalStep, so
 * "the Art Director approved this on Tuesday" survives the Account Manager's
 * later decision instead of being overwritten by it.
 */
export async function approveTask(opts: {
  user: SessionUser;
  task: LifecycleTask;
  comment?: string | null;
}) {
  const { user, task } = opts;
  const active = await requireOpenSubmission(task);

  assertCanDecide(user, task, active);

  const comment = opts.comment?.trim() || null;
  const stage = Math.max(0, task.approvalStage ?? 0);
  const final = isFinalStage(task, active.submittedById);
  const override = isChainOverride(user, task, active.submittedById);
  const now = new Date();

  await db.$transaction(async (tx) => {
    // The stage row is written FIRST and carries a unique [submissionId, stage]
    // constraint, so two approvers racing on the same stage cannot both advance
    // the chain — the second hits the constraint and the transaction unwinds.
    await tx.taskApprovalStep.create({
      data: {
        submissionId: active.id,
        stage,
        approvedById: user.id,
        comment,
        isOverride: override,
      },
    });

    if (!final) {
      // Mid-chain: the review stays open, and the ONLY thing that moves is whose
      // turn it is. Deliberately leaves status, approvalStatus, progress and
      // activeSubmissionId alone — the work is not approved yet, and a task that
      // reported 100% here would be lying to every dashboard that reads it.
      await tx.task.update({
        where: { id: task.id },
        data: { approvalStage: stage + 1 },
      });
      return;
    }

    await tx.taskSubmission.update({
      where: { id: active.id },
      data: {
        decision: "APPROVED",
        decidedById: user.id,
        decidedAt: now,
        comment,
      },
    });
    await tx.task.update({
      where: { id: task.id },
      data: {
        status: "DONE",
        approvalStatus: "APPROVED",
        progress: 100,
        approvedById: user.id,
        approvedAt: now,
        // The review is closed; the trail lives on in `submissions`.
        activeSubmissionId: null,
        approvalStage: 0,
      },
    });
  });

  await logActivity({
    actorId: user.id,
    taskId: task.id,
    verb: final ? "approved" : "approved (pending further approval)",
    meta: {
      submissionId: active.id,
      stage,
      final,
      override: override || undefined,
      comment: comment || undefined,
    },
  });

  if (final) {
    await notifyMany(submitterAndOwners(task, active.submittedById, user.id), {
      type: "TASK_APPROVED",
      title: "Task approved",
      body: `${user.firstName} ${user.lastName} approved "${task.title}" (${task.code}).`,
      link: `/tasks?task=${task.id}`,
      meta: { taskId: task.id },
    });
    return;
  }

  // Mid-chain: tell the NEXT approver it is their turn, and tell the submitter
  // their work cleared a stage — otherwise a task sitting at stage 1 looks
  // identical to one nobody has looked at.
  const nextTask = { ...task, approvalStage: stage + 1 };
  // Everyone who may decide the next stage, so a creator's follow-ups are told
  // it has reached them rather than only the creator.
  const nextApprovers = currentApprovers(nextTask, active.submittedById)
    .filter((id) => id !== user.id);

  if (nextApprovers.length) {
    await notifyMany(nextApprovers, {
      type: "APPROVAL_REQUIRED",
      title: "Approval needed",
      body: `${user.firstName} ${user.lastName} approved "${task.title}" (${task.code}) — it now needs your approval.`,
      link: `/tasks?task=${task.id}`,
      meta: { taskId: task.id, submissionId: active.id },
    });
  }

  await notifyMany(
    [active.submittedById].filter((id) => id !== user.id && !nextApprovers.includes(id)),
    {
      type: "TASK_APPROVED",
      title: "Approval step cleared",
      body: `${user.firstName} ${user.lastName} approved "${task.title}" (${task.code}). It is now waiting for final approval.`,
      link: `/tasks?task=${task.id}`,
      meta: { taskId: task.id },
    }
  );
}

/**
 * Reject a task under review: WAITING_APPROVAL → EDITING, from ANY stage.
 *
 * A rejection ends the review outright — it does not step back one stage. The
 * work returns to the worker and, when resubmitted, climbs the chain again from
 * the beginning (`approvalStage: 0`). That is deliberate: if the Account Manager
 * bounces work the Art Director already signed off, the Art Director needs to see
 * the correction before it comes back up, otherwise they are accountable for a
 * version they never reviewed.
 *
 * A reason is required. Bouncing work back without saying why forces the worker
 * to guess, and the rejection comment is the only channel the workflow gives the
 * approver to explain — so it is a 400, not an optional field.
 */
export async function rejectTask(opts: {
  user: SessionUser;
  task: LifecycleTask;
  comment: string;
}) {
  const { user, task } = opts;
  const active = await requireOpenSubmission(task);

  assertCanDecide(user, task, active);

  const comment = opts.comment?.trim();
  if (!comment) {
    throw new ApiError(400, "Say what needs changing — a rejection reason is required so the work can be fixed.");
  }

  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.taskSubmission.update({
      where: { id: active.id },
      data: { decision: "REJECTED", decidedById: user.id, decidedAt: now, comment },
    });
    await tx.task.update({
      where: { id: task.id },
      data: {
        status: REWORK_STATUS,
        approvalStatus: "REJECTED",
        activeSubmissionId: null,
        submittedAt: null,
        approvedById: null,
        approvedAt: null,
        // Back to the bottom of the chain — see the note above.
        approvalStage: 0,
      },
    });
  });

  await logActivity({
    actorId: user.id,
    taskId: task.id,
    verb: "requested changes",
    meta: { submissionId: active.id, comment },
  });

  await notifyMany(submitterAndOwners(task, active.submittedById, user.id), {
    type: "TASK_REJECTED",
    title: "Changes requested",
    body: `${user.firstName} ${user.lastName} sent "${task.title}" (${task.code}) back for changes: ${comment}`,
    link: `/tasks?task=${task.id}`,
    meta: { taskId: task.id },
  });
}

// ─── Internals ───────────────────────────────────────────────

/**
 * The submission currently under review, or a clear error.
 *
 * Reads the row rather than trusting the caller's copy of the task, so two
 * approvers clicking at once cannot both decide the same submission — the second
 * finds no open review.
 */
async function requireOpenSubmission(task: { id: string; status: TaskStatus }) {
  if (task.status !== APPROVAL_STATUS) {
    throw new ApiError(
      409,
      "This task is not waiting for approval, so there is nothing to approve or reject."
    );
  }
  const active = await db.taskSubmission.findFirst({
    where: { taskId: task.id, decision: "PENDING" },
    orderBy: { createdAt: "desc" },
    select: { id: true, submittedById: true },
  });
  if (!active) {
    throw new ApiError(409, "This task has no open submission to decide on.");
  }
  return active;
}

/** Approver authorization, including the no-self-approval rule. */
function assertCanDecide(
  user: SessionUser,
  task: ApprovableTask,
  submission: { submittedById: string }
) {
  // Self-approval is checked FIRST so the submitter always gets the reason that
  // actually applies to them. A worker who is not also an assignee fails both
  // gates; telling them "only the assigner can approve" would be true but
  // misleading — the point they need to understand is that their own work needs
  // somebody else's eyes.
  if (wouldSelfApprove(user, submission)) {
    throw new ApiError(
      403,
      "You submitted this work, so you cannot approve it yourself. It needs a decision from another approver."
    );
  }
  if (!isApproverFor(user, task, submission.submittedById)) {
    // Name the person it is actually waiting on. "You can't approve this" on a
    // task that plainly needs approving reads as a bug; "it is with the Art
    // Director first" explains the chain and tells them when to expect it.
    const chain = approvalChain(task, submission.submittedById);
    const pending = chain.length > 1 ? " This task needs approval in order." : "";
    throw new ApiError(
      403,
      `This task is not waiting on you right now.${pending} Only its current approver — or the Operations Manager / CEO — can approve or reject it.`
    );
  }
}

/**
 * Who to tell that a task needs a decision: the approver whose turn it is, and
 * nobody else.
 *
 * Only the FIRST link in the chain is notified on submission. Telling the
 * Account Manager at the same time as the Art Director is what made the old flow
 * a free-for-all — it invited whoever read the alert first to approve, which is
 * exactly the ordering this chain exists to impose. The later approvers are
 * notified as the work reaches them, in `approveTask`.
 *
 * Role-based approvers (Operations Manager, CEO) are deliberately NOT notified
 * individually — they hold Task.Approve over every task in the agency, so
 * notifying them on each submission would bury the alerts that are actually
 * theirs to action. They see the queue instead.
 *
 * Falls back to the creator and assignees when the chain is empty, matching the
 * fallback in `isApproverFor`: those tasks are decided by permission holders, and
 * silence would leave them with no prompt at all.
 */
async function approverIdsFor(
  task: ApprovableTask,
  actorId: string,
  submitterId: string
): Promise<string[]> {
  // The whole stage, not just its representative: a creator's stage shared with
  // follow-ups has several people who can act, and notifying only the creator
  // would leave the stand-in — often the one actually covering — unaware.
  const next = currentApprovers(task, submitterId).filter((id) => id !== actorId);
  if (next.length) return next;

  const ids = new Set<string>([
    task.createdById,
    ...taskFollowUpIds(task),
    ...task.assignees.map((a) => a.userId),
  ]);
  ids.delete(actorId);
  return [...ids];
}

/**
 * The submitter plus the task's owners, minus the actor — for decision news.
 *
 * Every worker is told, not just whoever submitted: on shared work an approval
 * or a bounce-back is news to all of them, and the one who did not click submit
 * would otherwise never hear that the task needs fixing.
 */
function submitterAndOwners(task: ApprovableTask, submitterId: string, actorId: string): string[] {
  const ids = new Set<string>([
    submitterId,
    ...task.assignees.map((a) => a.userId),
    ...taskWorkerIds(task),
    // Follow-ups stand in for the creator, so a decision on the work is theirs
    // to hear — especially a rejection they may have to chase.
    ...taskFollowUpIds(task),
  ]);
  ids.delete(actorId);
  return [...ids];
}

/** Shared include for returning a task's evidence trail to the client. */
export const submissionInclude = {
  orderBy: { createdAt: "desc" as const },
  select: submissionSelect,
};
