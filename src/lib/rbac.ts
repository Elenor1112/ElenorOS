import type { RoleKey, TaskStatus } from "@prisma/client";

/**
 * Enterprise RBAC for Elenor OS.
 *
 * Permissions are granular, grouped by domain. A user's effective permission
 * set = (their role's permissions) + per-user ALLOW grants − per-user DENY grants.
 * Super-admin roles (CEO, Operations Manager) implicitly hold every permission.
 */

// ─── Permission catalog ───────────────────────────────────────

export const PERMISSIONS = {
  // Tasks
  "Task.View": "View tasks",
  "Task.ViewAll": "View every task in the agency (not just your own)",
  "Task.ViewDepartment": "View all tasks in your own department",
  "Task.Create": "Create tasks",
  "Task.Edit": "Edit tasks",
  "Task.EditDetails": "Edit task priority, deadline, title & description",
  "Task.Delete": "Delete tasks",
  "Task.Assign": "Assign tasks to others",
  // Deliberately separate from Task.EditDetails: changing WHO is accountable for
  // a task after it exists is an ownership decision, not an editing one, and is
  // held by fewer roles. An Art Director can retitle and re-deadline their
  // department's work (Task.EditDetails) but cannot move accountability off the
  // person it was handed to — that stays with CEO, Operations Manager, PR &
  // Sales Manager and Account Management.
  "Task.EditAssignees": "Change a task's assignees after it has been created",
  "Task.Approve": "Approve tasks / content / designs",
  "Task.ChangeStatus": "Change task status",
  // Worker = who executes, as opposed to assignees, who stay accountable.
  "Task.AssignWorker": "Set the worker executing a task",
  "Task.ChangeWorker": "Replace or remove a task's worker once one is set",
  "Task.DelegateOwnTasks": "Delegate execution of tasks you are assigned to your own team",
  // Projects
  "Project.View": "View projects",
  "Project.Create": "Create projects",
  "Project.Edit": "Edit projects",
  "Project.Delete": "Delete projects",
  // Clients
  "Client.View": "View clients",
  "Client.Create": "Create clients",
  "Client.Edit": "Edit clients",
  "Client.Delete": "Delete clients",
  // Employees / users
  "Employee.View": "View employee profiles",
  "Employee.Create": "Create / invite users",
  "Employee.Edit": "Edit employees",
  "Employee.Delete": "Delete / deactivate users",
  "Employee.EditPermissions": "Edit user permissions",
  // Departments
  "Department.View": "View departments",
  "Department.Create": "Create departments",
  "Department.Edit": "Edit / archive departments",
  "Department.Delete": "Delete departments",
  // Leave & permission requests
  "Leave.Request": "Submit leave requests",
  "Leave.ViewAll": "View all leave requests",
  "Leave.Approve": "Approve leave (manager level)",
  "Leave.ApproveFinal": "Final approval (operations level)",
  "Permission.Request": "Submit permission requests",
  "Permission.Approve": "Approve permission requests",
  // Resignation
  "Resignation.Submit": "Submit resignation",
  "Resignation.Manage": "Manage resignation & offboarding",
  // Performance / discipline
  "Performance.View": "View performance dashboards",
  "Performance.Review": "Write performance reviews",
  "Warning.Issue": "Issue disciplinary warnings",
  "Eotm.Manage": "Manage Employee of the Month",
  // Reports / analytics
  "Reports.View": "View reports & analytics",
  "Analytics.Company": "View company-wide analytics",
  // Audit & settings
  "Audit.View": "View audit logs",
  "Settings.Edit": "Edit company settings",
  "Policy.Manage": "Manage company policies",
  // Sales — leads & pipeline
  // Gates the Sales workspace itself: the sidebar section, every /sales route
  // and the sales quick-actions. Held by the sales roles only — see
  // canSeeSalesModule(). Granting this to anyone else makes the module visible
  // to them, which is exactly the intended (and only) way to widen it.
  "Sales.View": "Access the Sales workspace",
  "Sales.ViewAll": "View every lead in the pipeline (not just your own)",
  "Sales.LeadCreate": "Create leads",
  "Sales.LeadEdit": "Edit leads you can see",
  "Sales.LeadDelete": "Delete leads",
  "Sales.Assign": "Assign leads and change lead ownership",
  "Sales.ChangeStage": "Move leads between pipeline stages",
  "Sales.Convert": "Convert a won lead into a client and project",
  // Sales — activity objects
  "Sales.MeetingManage": "Schedule and manage sales meetings",
  "Sales.DiscoverySubmit": "Fill in and submit discovery briefs",
  "Sales.FeedbackSubmit": "Submit post-meeting sales feedback",
  "Sales.ProposalManage": "Create, send and track proposals",
  "Sales.IdeaManage": "Create and manage sales ideas",
  // Sales — oversight
  "Sales.ViewReports": "View sales reports and the sales dashboard",
  "Sales.ViewTeam": "View salesperson performance and the leaderboard",
  /// Granted to Account Management. Unlocks the sales history (brief, feedback,
  /// proposals) of leads that have ALREADY become clients, without exposing the
  /// live pipeline. Deliberately does NOT make the Sales module visible — it
  /// carries no navigation and no /sales route access, only the right to read
  /// closed-deal history for an account being managed.
  "Sales.ViewConverted": "Read the sales history of converted clients (no Sales workspace access)",
  // Job descriptions
  "JobDescription.ViewOwn": "View your own job description",
  "JobDescription.ViewAll": "View every employee's job description",
  "JobDescription.Upload": "Upload / replace job description documents",
  "JobDescription.Delete": "Delete a job description and its history",
  "JobDescription.ViewAcknowledgments": "View job description acknowledgment status",
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export const PERMISSION_GROUPS: Record<string, PermissionKey[]> = Object.keys(
  PERMISSIONS
).reduce((acc, key) => {
  const group = key.split(".")[0];
  (acc[group] ??= []).push(key as PermissionKey);
  return acc;
}, {} as Record<string, PermissionKey[]>);

// ─── Role definitions (hierarchy + super-admin) ──────────────

export const ROLE_META: Record<
  RoleKey,
  { name: string; level: number; isSuperAdmin: boolean; description: string }
> = {
  CEO: { name: "CEO", level: 0, isSuperAdmin: true, description: "Super admin — full access." },
  OPERATIONS_MANAGER: {
    name: "Operations Manager",
    level: 1,
    isSuperAdmin: true,
    description: "Super admin. Second-level approver for leave & permissions.",
  },
  ACCOUNT_MANAGER: {
    name: "Account Manager",
    level: 2,
    isSuperAdmin: false,
    description: "Owns client relationships, projects and task assignment.",
  },
  SALES_MANAGER: {
    name: "PR & Sales Manager",
    level: 2,
    isSuperAdmin: false,
    description: "Owns the sales pipeline, assigns leads and converts won deals into clients.",
  },
  SALES_MEMBER: {
    name: "Sales Member",
    level: 4,
    isSuperAdmin: false,
    description: "Works their own assigned leads through the acquisition lifecycle.",
  },
  ART_DIRECTOR: {
    name: "Art Director",
    level: 3,
    isSuperAdmin: false,
    description: "Breaks down creative work and reviews designers.",
  },
  DESIGNER: {
    name: "Designer",
    level: 4,
    isSuperAdmin: false,
    description: "Executes design subtasks.",
  },
  CONTENT_CREATOR: {
    name: "Content Creator",
    level: 4,
    isSuperAdmin: false,
    description: "Produces content deliverables.",
  },
  COMMUNICATION_SPECIALIST: {
    name: "Communication Specialist",
    level: 4,
    isSuperAdmin: false,
    description: "Handles communication deliverables.",
  },
  DEVELOPER: {
    name: "Developer",
    level: 4,
    isSuperAdmin: false,
    description: "Development team (configurable).",
  },
};

// ─── Role → permission matrix ────────────────────────────────

const ALL = Object.keys(PERMISSIONS) as PermissionKey[];

const baseEmployee: PermissionKey[] = [
  "Task.View",
  "Task.ChangeStatus",
  "Project.View",
  "Client.View",
  "Employee.View",
  "Department.View",
  "Leave.Request",
  "Permission.Request",
  "Resignation.Submit",
  // Every employee can read and acknowledge the job description assigned to
  // them — reach beyond their own document requires JobDescription.ViewAll.
  "JobDescription.ViewOwn",
];

export const ROLE_PERMISSIONS: Record<RoleKey, PermissionKey[]> = {
  CEO: ALL,
  OPERATIONS_MANAGER: ALL,
  ACCOUNT_MANAGER: [
    ...baseEmployee,
    "Task.Create",
    "Task.Edit",
    "Task.EditDetails",
    "Task.ViewAll",
    "Task.Assign",
    // Owns task assignment (see the role description), so it can also change who
    // is accountable after the task exists — not only at creation time, and can
    // retire work that should no longer be tracked.
    "Task.EditAssignees",
    "Task.Delete",
    "Task.Approve",
    // Can set and change the worker on any task it can see, for the cases where
    // Account Management needs to redirect execution itself.
    "Task.AssignWorker",
    "Task.ChangeWorker",
    "Project.Create",
    "Project.Edit",
    "Project.Delete",
    "Client.Create",
    "Client.Edit",
    "Client.Delete",
    // Can edit departments, but deleting one is an org-structure change that
    // stays with the CEO / Operations Manager.
    "Department.Edit",
    "Employee.Create",
    "Employee.Edit",
    "Employee.Delete",
    "Leave.Approve",
    "Permission.Approve",
    "Reports.View",
    "Performance.View",
    // Owns the employee lifecycle (Employee.Create/Edit/Delete above), so it
    // owns the document attached to it too.
    "JobDescription.ViewAll",
    "JobDescription.Upload",
    "JobDescription.Delete",
    "JobDescription.ViewAcknowledgments",
    // Operations and Account Management pick the relationship up AFTER the
    // handover: they can read the discovery brief, feedback and proposals of a
    // lead that has already become a client, but the live pipeline stays with
    // Sales. Deliberately not Sales.ViewAll.
    "Sales.ViewConverted",
    "Sales.IdeaManage",
  ],
  SALES_MANAGER: [
    ...baseEmployee,
    "Client.Create",
    "Client.Edit",
    "Task.Create",
    // Owns work handoff as well as the pipeline: briefs the delivery teams for a
    // deal and hands internal work to their own sales members. Task.EditAssignees
    // is what the PATCH route gates `assigneeIds` behind, so without it the role
    // could only pick assignees at creation time and never reassign afterwards.
    "Task.Assign",
    "Task.EditAssignees",
    "Task.Delete",
    "Task.Edit",
    "Task.EditDetails",
    // Reach to see (and therefore re-brief) their own department's tasks, not the
    // whole agency — the same scoping the Art Director gets. Task.ViewAll stays
    // with Operations / Account Management.
    "Task.ViewDepartment",
    "Leave.Approve",
    "Permission.Approve",
    "Reports.View",
    // Full reach over the pipeline: sees every lead regardless of owner, moves
    // ownership around, and is the role that closes the loop by converting a
    // won lead into a client + project.
    "Sales.View",
    "Sales.ViewAll",
    "Sales.LeadCreate",
    "Sales.LeadEdit",
    "Sales.LeadDelete",
    "Sales.Assign",
    "Sales.ChangeStage",
    "Sales.Convert",
    "Sales.MeetingManage",
    "Sales.DiscoverySubmit",
    "Sales.FeedbackSubmit",
    "Sales.ProposalManage",
    "Sales.IdeaManage",
    "Sales.ViewReports",
    "Sales.ViewTeam",
    "Sales.ViewConverted",
    // Needed to nominate the account manager / project manager during
    // conversion, and to build the owner dropdown.
    "Project.Create",
  ],
  SALES_MEMBER: [
    ...baseEmployee,
    // Deliberately WITHOUT Sales.ViewAll: the visibility filter in lib/sales.ts
    // narrows every query to leads this person owns. Widening one individual is
    // a per-user ALLOW grant, not a role change.
    "Sales.View",
    "Sales.LeadCreate",
    "Sales.LeadEdit",
    "Sales.ChangeStage",
    "Sales.MeetingManage",
    "Sales.DiscoverySubmit",
    "Sales.FeedbackSubmit",
    "Sales.ProposalManage",
    "Sales.IdeaManage",
    // Their own numbers only — the reports API scopes by the same filter.
    "Sales.ViewReports",
  ],
  ART_DIRECTOR: [
    ...baseEmployee,
    "Task.Create",
    "Task.Edit",
    "Task.EditDetails",
    // Sees their own department's work rather than the whole agency — an Art
    // Director needs reach over their designers' tasks to set priorities and
    // deadlines on them.
    "Task.ViewDepartment",
    "Task.Assign",
    "Task.Approve",
    // The delegation case this whole flow exists for: an Art Director handed a
    // task picks which designer executes it, while staying the assignee.
    "Task.AssignWorker",
    "Task.ChangeWorker",
    "Task.DelegateOwnTasks",
    // Runs creative work end-to-end, so it can open a project to hang that work
    // off. Editing and deleting projects stay with Account Management.
    "Project.Create",
    "Leave.Approve",
    "Permission.Approve",
    // Sees acknowledgment state for the people who report to them (scoped by
    // jobDescriptionScope), but cannot upload or replace documents — that
    // stays with HR / Account Management.
    "JobDescription.ViewAcknowledgments",
  ],
  DESIGNER: [...baseEmployee, "Task.Edit"],
  CONTENT_CREATOR: [...baseEmployee, "Task.Edit"],
  COMMUNICATION_SPECIALIST: [...baseEmployee, "Task.Edit"],
  DEVELOPER: [...baseEmployee],
};

/**
 * Roles allowed to assign tasks to which roles (workflow constraint).
 *
 * Account Management briefs the Design Team directly — an Account Manager can
 * hand work to the Art Director or straight to a designer, rather than every
 * design task having to route through the Art Director first.
 *
 * The PR & Sales Manager gets the same delivery-team reach plus their own sales
 * members: work that comes out of a deal (a pitch deck, launch content) is
 * briefed directly, and internal sales work goes to the team they manage. They
 * additionally reach UPWARD to the CEO, Operations Manager and Account Manager,
 * because a live deal generates work for those roles (approve this quote,
 * introduce me to this contact) that has to be tracked like any other task.
 * This is the only actor below level 1 with upward reach, and it is scoped to
 * task assignment alone.
 */
export const ASSIGNMENT_MATRIX: Partial<Record<RoleKey, RoleKey[]>> = {
  CEO: Object.keys(ROLE_META) as RoleKey[],
  OPERATIONS_MANAGER: Object.keys(ROLE_META) as RoleKey[],
  ACCOUNT_MANAGER: ["ART_DIRECTOR", "DESIGNER", "CONTENT_CREATOR", "COMMUNICATION_SPECIALIST"],
  SALES_MANAGER: [
    // Upward reach is deliberate: a deal in the pipeline routinely needs
    // something from leadership or the account owner — an approval, a pricing
    // call, a client introduction — and the PR & Sales Manager books that as a
    // task rather than chasing it off-system. Assigning upward hands over the
    // work item only; it confers no permission over those roles anywhere else.
    "CEO",
    "OPERATIONS_MANAGER",
    "ACCOUNT_MANAGER",
    "SALES_MEMBER",
    "ART_DIRECTOR",
    "DESIGNER",
    "CONTENT_CREATOR",
    "COMMUNICATION_SPECIALIST",
  ],
  ART_DIRECTOR: ["DESIGNER"],
};

/**
 * Departments a role may assign into regardless of the assignee's role.
 *
 * The role matrix above cannot express "anyone on the Design Team", which is
 * what the business actually means — a new role added to that department (a
 * Motion Designer, say) should be briefable by Account Management on day one,
 * without a code change here. Matched by department *name*, so it survives the
 * id differing between environments.
 *
 * A user is assignable if they clear EITHER this or the role matrix.
 */
export const ASSIGNABLE_DEPARTMENTS: Partial<Record<RoleKey, string[]>> = {
  ACCOUNT_MANAGER: ["Design Team"],
  SALES_MANAGER: ["Design Team"],
  ART_DIRECTOR: ["Design Team"],
};

// ─── Runtime helpers ─────────────────────────────────────────

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleKey: RoleKey;
  isSuperAdmin: boolean;
  /** Needed to scope Task.ViewDepartment. */
  departmentId: string | null;
  avatarUrl: string | null;
  permissions: string[]; // effective, resolved
};

export function can(user: Pick<SessionUser, "isSuperAdmin" | "permissions">, permission: PermissionKey) {
  if (user.isSuperAdmin) return true;
  return user.permissions.includes(permission);
}

export function canAny(user: Pick<SessionUser, "isSuperAdmin" | "permissions">, perms: PermissionKey[]) {
  if (user.isSuperAdmin) return true;
  return perms.some((p) => user.permissions.includes(p));
}

/**
 * A task as the ownership rules need to see it: who is accountable, and who is
 * executing.
 *
 * `workers` is the real set. `workerId` is the pre-multi-worker single pointer,
 * still accepted so a caller holding an old row or an old API response gets the
 * right answer instead of silently reading as unassigned.
 */
export type TaskOwnership = {
  assignees: { userId: string }[];
  workers?: { userId: string }[];
  /**
   * People holding the creator's authority by delegation — see
   * `isTaskCreatorEquivalent`. Optional so every caller written before follow-ups
   * existed keeps compiling and reads as "none", which is the correct answer for
   * a task that has none.
   */
  followUps?: { userId: string }[];
  /** @deprecated superseded by `workers`; read only as a fallback. */
  workerId?: string | null;
};

/**
 * The ids of everyone executing a task, from whichever shape the caller has.
 *
 * Single place where the legacy pointer is folded in, so no rule has to
 * remember the fallback and none of them can disagree about it.
 */
export function taskWorkerIds(task: TaskOwnership): string[] {
  if (task.workers) return task.workers.map((w) => w.userId);
  return task.workerId ? [task.workerId] : [];
}

/** The ids of everyone holding delegated creator authority on a task. */
export function taskFollowUpIds(task: TaskOwnership): string[] {
  return task.followUps?.map((f) => f.userId) ?? [];
}

/**
 * Whether this user holds the CREATOR's authority on this task.
 *
 * True for the creator themselves and for every follow-up, which is the whole
 * point of the role: an assignee who needs somebody else to carry the briefing
 * side of a task — because they are going on leave, or because the person who
 * briefed it has moved on — nominates a follow-up, and that person can then do
 * everything the creator could.
 *
 * THE single definition of "creator-level on this task". Every rule that used to
 * compare against `createdById` asks this instead, so there is no way for one of
 * them to be taught about follow-ups and another to be missed.
 *
 * Note this is an OWNERSHIP test, not a permission test: it says who stands in
 * the creator's shoes, not what the creator may do. Callers still combine it
 * with the relevant `can()` check where the underlying action needs one — being
 * the creator of a task has never by itself granted Task.Delete, and being a
 * follow-up must not either.
 */
export function isTaskCreatorEquivalent(
  user: Pick<SessionUser, "id">,
  task: { createdById: string } & TaskOwnership
): boolean {
  if (task.createdById === user.id) return true;
  return taskFollowUpIds(task).includes(user.id);
}

/**
 * Who may add or remove a task's follow-ups.
 *
 * The people accountable for the task: its assignees (the requirement is
 * "as the assignee we need to add a Follow Up"), its creator, and anyone already
 * holding the creator's authority — a follow-up can nominate another, exactly as
 * the creator can, because the role is a full stand-in.
 *
 * Super admins are included so a delegation can be corrected when the people on
 * the task are unavailable, matching the escape hatch in `isApproverFor`.
 *
 * WORKERS are deliberately excluded. Execution was delegated to them; the
 * oversight side of the task was not, and letting a worker appoint their own
 * reviewer would let them choose who signs off their work.
 */
export function canManageFollowUp(
  user: Pick<SessionUser, "id" | "isSuperAdmin" | "permissions">,
  task: { createdById: string } & TaskOwnership
): boolean {
  if (user.isSuperAdmin) return true;
  if (isTaskCreatorEquivalent(user, task)) return true;
  return task.assignees.some((a) => a.userId === user.id);
}

/**
 * Whether this user may change a task's STATUS.
 *
 * Status reports how the work itself is going, so it belongs to the person
 * doing the work and to nobody else. Managers and administrators — including
 * the CEO and Operations Manager — can see the status and still edit every
 * other field, but they cannot move a task through its workflow on someone
 * else's behalf. Super-admin is deliberately NOT a bypass here; that is the
 * entire point of the restriction, so `can()` is not consulted for an assigned
 * task at all.
 *
 * "The assigned employee" means either:
 *  - an ASSIGNEE, who is accountable for the outcome, or
 *  - a WORKER, one of the people execution was delegated to.
 *
 * Workers are included because delegation moves the doing without moving the
 * accountability: once an Art Director hands execution to a designer, the
 * designer is the only one who knows when the work actually started. Excluding
 * them would leave a delegated task with nobody able to report on it.
 *
 * A task may have several workers, and they are equal — ANY of them may report
 * status. Two designers sharing a task both know how it is going, and making one
 * of them ask the other to move it would put a person in the way of the work.
 *
 * An UNASSIGNED task has no such owner, so it falls back to the ordinary
 * permission — otherwise a task nobody is on could never be moved or cancelled.
 *
 * Lives here rather than in lib/tasks.ts because that module is server-only:
 * the task drawer needs the same answer to decide whether to render a dropdown
 * or read-only text, and one definition is what keeps the two in agreement.
 */
export function canChangeTaskStatus(
  user: Pick<SessionUser, "id" | "isSuperAdmin" | "permissions">,
  task: TaskOwnership
): boolean {
  const workerIds = taskWorkerIds(task);
  const hasOwner = task.assignees.length > 0 || workerIds.length > 0;
  if (!hasOwner) return can(user, "Task.ChangeStatus") || can(user, "Task.EditDetails");
  return task.assignees.some((a) => a.userId === user.id) || workerIds.includes(user.id);
}

// ─── Task approval lifecycle ─────────────────────────────────

/**
 * The parties to a task's approval, as the lifecycle rules see it.
 *
 * Deliberately the minimum shape the rules need, so both the API (which has the
 * full Prisma row) and the task drawer (which has the JSON response) can ask the
 * same questions of the same function.
 */
export type ApprovableTask = TaskOwnership & {
  status: TaskStatus;
  createdById: string;
  /** How far the open review has climbed. Absent on old rows / old payloads = 0. */
  approvalStage?: number | null;
};

/**
 * The ordered approval chain for a task: who signs it off, in what order.
 *
 * DERIVED from the people already on the task rather than stored, so delegating
 * work automatically lengthens the chain and there is no separate chain editor to
 * keep in sync with the assignees.
 *
 * The order is execution → accountability → briefing:
 *
 *   workers (submit) → assignees (stage 0) → creator (stage 1)
 *
 * which is exactly the agency's flow: a Designer hands in work, the Art Director
 * who delegated it signs it off, and then the Account Manager who briefed it
 * gives final approval.
 *
 * Two rules shape the result, and both exist to stop the chain deadlocking:
 *
 *  1. The SUBMITTER is never in their own chain. A worker who is also an assignee
 *     would otherwise generate a stage that only they could fill, and nobody may
 *     approve their own submission — the review would be stuck forever.
 *  2. Each person appears ONCE, at their earliest position. A task where the Art
 *     Director is both creator and assignee is a one-stage chain, not a chain
 *     where the same person has to click Approve twice.
 *
 * A task with no delegation therefore collapses to a single stage automatically:
 * if the assignee submits their own work, the chain is just the creator.
 *
 * Returns user ids in stage order. An EMPTY chain means nobody on the task can
 * approve it — see `canDecideApproval`, which falls back to Task.Approve holders
 * so such a task is reviewable rather than stranded.
 *
 * This flat form is the REPRESENTATIVE of each stage — one id per stage, so the
 * historical `approvalStage` index still means what it always did. A stage may
 * now hold more than one eligible approver (the creator and their follow-ups
 * share one); use `approvalStages` when you need all of them.
 */
export function approvalChain(
  task: ApprovableTask,
  submitterId: string | null | undefined
): string[] {
  return approvalStages(task, submitterId).map((stage) => stage[0]);
}

/**
 * The approval chain as STAGES, each holding everyone who may decide it.
 *
 * Same order and same rules as `approvalChain` — which is derived from this —
 * with one addition: the creator's stage also contains the task's follow-ups,
 * because a follow-up stands in for the creator (see `isTaskCreatorEquivalent`).
 *
 * Follow-ups share that stage rather than getting one of their own. Nominating
 * somebody to cover for you should give the review a second person who can
 * unblock it, not make the work climb an extra step it did not have before —
 * appointing help would otherwise slow the task down, which is the opposite of
 * what the assignee wanted.
 *
 * Within a stage the members are equal and it takes ONE of them to advance it,
 * exactly as multiple workers may each submit. The stage is ordered creator-first
 * so `approvalChain`'s representative — and therefore every "waiting on X" label
 * — still names the creator on a task that has one.
 *
 * The two chain-shaping rules are unchanged and apply across the whole result:
 * the submitter never appears (nobody reviews their own work), and each person
 * appears once, at their earliest position. A follow-up who is also an assignee
 * is therefore an assignee-stage approver and is NOT repeated on the creator's
 * stage — one person, one decision.
 */
export function approvalStages(
  task: ApprovableTask,
  submitterId: string | null | undefined
): string[][] {
  const seen = new Set<string>();
  if (submitterId) seen.add(submitterId);

  const take = (ids: string[]) => {
    const stage: string[] = [];
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      stage.push(id);
    }
    return stage;
  };

  const stages: string[][] = [];
  // Assignees are consumed one stage at a time, preserving the existing shape
  // where each accountable person is their own step.
  for (const a of task.assignees) {
    const stage = take([a.userId]);
    if (stage.length) stages.push(stage);
  }
  // The creator and their stand-ins form the last stage, as one group.
  const briefing = take([task.createdById, ...taskFollowUpIds(task)]);
  if (briefing.length) stages.push(briefing);

  return stages;
}

/**
 * Everyone who may decide the stage the task has currently reached.
 *
 * Empty when the chain is exhausted or empty — callers fall back to permission
 * holders. `stage` is clamped the same way `currentApprover` clamps it, so a
 * task whose people changed mid-review is never stranded past the end.
 */
export function currentApprovers(
  task: ApprovableTask,
  submitterId: string | null | undefined
): string[] {
  const stages = approvalStages(task, submitterId);
  if (stages.length === 0) return [];
  const stage = Math.max(0, task.approvalStage ?? 0);
  return stages[stage] ?? stages[stages.length - 1] ?? [];
}

/**
 * Whose turn it is right now, or null if the chain is exhausted / empty.
 *
 * `stage` is clamped rather than trusted: a task whose assignees changed while a
 * review was open can carry a stage past the end of its (re-derived) chain, and
 * returning null there would strand it. Callers treat null as "no named approver
 * — fall back to permission holders".
 *
 * Names ONE approver, for display and for the "it's your turn" notification. A
 * stage shared by a creator and their follow-ups has several eligible deciders;
 * this returns the creator-first representative, so use `currentApprovers` when
 * the answer must cover all of them (authorization, notifying the whole group).
 */
export function currentApprover(
  task: ApprovableTask,
  submitterId: string | null | undefined
): string | null {
  return currentApprovers(task, submitterId)[0] ?? null;
}

/**
 * Whether approving at the current stage would finish the task.
 *
 * The single place that answers "does this click write DONE?", so the API and
 * the button label cannot disagree about whether one more approval is coming.
 */
export function isFinalStage(
  task: ApprovableTask,
  submitterId: string | null | undefined
): boolean {
  const stages = approvalStages(task, submitterId);
  if (stages.length === 0) return true;
  return (Math.max(0, task.approvalStage ?? 0)) >= stages.length - 1;
}

/**
 * Who may hand a task in for review.
 *
 * The people doing the work: the workers execution was delegated to, and the
 * assignees who stay accountable for it. Mirrors canChangeTaskStatus — if you
 * are entitled to report on the work, you are entitled to submit it — with the
 * same deliberate absence of a super-admin bypass on an owned task.
 *
 * On a task with several workers any one of them may submit. The submission
 * records who did (`submittedById`), so shared work still has a named author on
 * every attempt.
 */
export function canSubmitForApproval(
  user: Pick<SessionUser, "id" | "isSuperAdmin" | "permissions">,
  task: ApprovableTask
): boolean {
  return canChangeTaskStatus(user, task);
}

/**
 * Who may approve or reject a task sitting in WAITING_APPROVAL, AT THE STAGE it
 * has currently reached.
 *
 * Approval is a sequential chain, not a pool of eligible managers — see
 * `approvalChain`. Only the approver whose turn it is may decide, which is what
 * makes "the Art Director sees it first, then the Account Manager" true rather
 * than advisory. Holding `Task.Approve` is NOT by itself sufficient: an unrelated
 * Account Manager elsewhere in the agency is not on this task's chain and cannot
 * short-circuit the Art Director's review.
 *
 * Two deliberate escapes from the strict chain:
 *
 *  - SUPER ADMINS (CEO, Operations Manager) may decide any stage. An approval
 *    nobody senior can unblock is how work gets stuck when someone is on leave.
 *    Their out-of-turn approvals are recorded as overrides — see
 *    `isChainOverride` and TaskApprovalStep.isOverride.
 *  - A task with an EMPTY chain (the submitter is the only person on it) falls
 *    back to `Task.Approve` holders, so it is reviewable rather than stranded.
 *
 * The one hard exclusion is self-approval, which no escape overrides — see
 * `wouldSelfApprove`. A worker cannot sign off their own submission, which is the
 * entire point of having an approval step.
 */
export function isApproverFor(
  user: Pick<SessionUser, "id" | "isSuperAdmin" | "permissions">,
  task: ApprovableTask,
  submitterId?: string | null
): boolean {
  const approvers = currentApprovers(task, submitterId);

  // Nobody on the task can review it — fall back to the permission so the work
  // is not stranded with no possible approver.
  if (approvers.length === 0) return can(user, "Task.Approve");

  // Any member of the current stage may decide it. On the creator's stage that
  // includes the follow-ups, which is what lets a nominated stand-in actually
  // unblock the review rather than merely watch it.
  if (approvers.includes(user.id)) return true;

  // The leave / absence escape hatch.
  return user.isSuperAdmin;
}

/**
 * Whether this user acting now would be jumping the queue — a super admin
 * deciding a stage that belongs to somebody else.
 *
 * Drives TaskApprovalStep.isOverride and the wording in the activity log, so an
 * override reads differently from the named approver having actually reviewed it.
 */
export function isChainOverride(
  user: Pick<SessionUser, "id" | "isSuperAdmin" | "permissions">,
  task: ApprovableTask,
  submitterId?: string | null
): boolean {
  const approvers = currentApprovers(task, submitterId);
  if (approvers.length === 0) return false;
  // Membership of the stage, not identity with its representative: a follow-up
  // deciding the creator's stage is taking their legitimate turn, so it must not
  // be logged as somebody jumping the queue.
  return !approvers.includes(user.id);
}

/**
 * Whether this user deciding this submission would be signing off their own
 * work.
 *
 * Kept separate from `isApproverFor` because the two answer different questions
 * and the UI needs both: "are you a reviewer here?" decides whether to render
 * the approve/reject controls at all, while this decides whether to disable them
 * with an explanation.
 *
 * A submission's AUTHOR may never decide it, even when they would otherwise
 * qualify as an approver (a creator who also did the work, a super admin who
 * submitted). Somebody else has to look at it.
 */
export function wouldSelfApprove(
  user: Pick<SessionUser, "id">,
  submission: { submittedById: string } | null | undefined
): boolean {
  return Boolean(submission && submission.submittedById === user.id);
}

/**
 * Whether this user can act on the approval right now — i.e. render the
 * Approve / Request changes buttons.
 *
 * Combines every gate: the task must be under review, the user must be a
 * reviewer, and it must not be their own submission.
 */
export function canDecideApproval(
  user: Pick<SessionUser, "id" | "isSuperAdmin" | "permissions">,
  task: ApprovableTask,
  activeSubmission: { submittedById: string } | null | undefined
): boolean {
  if (task.status !== "WAITING_APPROVAL") return false;
  if (!isApproverFor(user, task, activeSubmission?.submittedById)) return false;
  return !wouldSelfApprove(user, activeSubmission);
}

/**
 * Whether `actorRole` may assign a task to someone with `targetRole`, optionally
 * in `targetDepartmentName`.
 *
 * Either dimension is sufficient: a role listed in the matrix is assignable
 * anywhere, and anyone in a listed department is assignable whatever their role.
 * Super admins bypass this entirely at the call sites.
 */
export function canAssignTo(
  actorRole: RoleKey,
  targetRole: RoleKey,
  targetDepartmentName?: string | null
) {
  if (ASSIGNMENT_MATRIX[actorRole]?.includes(targetRole)) return true;
  if (targetDepartmentName && ASSIGNABLE_DEPARTMENTS[actorRole]?.includes(targetDepartmentName)) {
    return true;
  }
  return false;
}

/**
 * How far a viewer can see into other people's job descriptions.
 *
 * Single source of truth for job-description visibility — every route that
 * returns another employee's document or acknowledgment state resolves scope
 * through here rather than re-deriving the rules.
 *
 *  - `all`        — super admins and holders of JobDescription.ViewAll.
 *  - `department` — managers who can see acknowledgment status: limited to
 *                   their own department, mirroring Task.ViewDepartment.
 *  - `self`       — everyone else. Their own document only.
 */
export type JobDescriptionScope =
  | { kind: "all" }
  | { kind: "department"; departmentId: string }
  | { kind: "self" };

export function jobDescriptionScope(user: SessionUser): JobDescriptionScope {
  if (can(user, "JobDescription.ViewAll")) return { kind: "all" };
  if (can(user, "JobDescription.ViewAcknowledgments") && user.departmentId) {
    return { kind: "department", departmentId: user.departmentId };
  }
  return { kind: "self" };
}

/**
 * How far a viewer can see into the sales pipeline.
 *
 * Single source of truth for lead visibility — every sales route and the global
 * search resolve scope through here rather than re-deriving the rules, which is
 * what keeps "sales members manage only assigned leads" true everywhere at once.
 *
 *  - `all`       — super admins and holders of Sales.ViewAll (PR & Sales Manager).
 *  - `own`       — sales members: leads they own or created.
 *  - `converted` — Operations / Account Management: only leads that have already
 *                  become clients, so the handover works without exposing the
 *                  live pipeline.
 *  - `none`      — no sales access at all.
 */
export type SalesScope =
  | { kind: "all" }
  | { kind: "own"; userId: string }
  | { kind: "converted" }
  | { kind: "none" };

export function salesScope(user: SessionUser): SalesScope {
  if (user.isSuperAdmin || can(user, "Sales.ViewAll")) return { kind: "all" };
  if (can(user, "Sales.View")) return { kind: "own", userId: user.id };
  if (can(user, "Sales.ViewConverted")) return { kind: "converted" };
  return { kind: "none" };
}

/**
 * Whether the Sales WORKSPACE is visible to this user — the sidebar section,
 * the /sales routes, and the sales quick-actions in the command palette.
 *
 * Deliberately narrower than `salesScope`, and the distinction matters:
 *
 *  - This answers "does the Sales module exist for you at all", and is true
 *    only for CEO, Operations Manager, PR & Sales Manager and Sales Members —
 *    i.e. holders of Sales.View (plus super admins).
 *  - `salesScope` answers "which lead ROWS may you read", and additionally
 *    admits the `converted` scope so Account Management can still open the
 *    discovery brief, feedback and proposals of a client they now own.
 *
 * Collapsing the two would force a choice between hiding the module and
 * keeping the post-handover history reachable; keeping them separate satisfies
 * both. Account Management therefore sees no Sales navigation and no pipeline,
 * while `/api/sales/clients` still answers for the accounts they manage.
 */
export function canSeeSalesModule(user: SessionUser) {
  return user.isSuperAdmin || can(user, "Sales.View");
}

// ─── Client contact confidentiality ──────────────────────────

/**
 * The confidential fields on a Client.
 *
 * Named once here so the API mask, the Prisma select and the UI all agree on
 * what "contact details" covers. Adding a sensitive column means adding it to
 * this list and nothing else.
 */
export const CLIENT_CONTACT_FIELDS = ["email", "phone", "whatsapp", "address"] as const;

export type ClientContactField = (typeof CLIENT_CONTACT_FIELDS)[number];

/**
 * Whether `viewer` may see a client's contact details.
 *
 * Deliberately narrower than Client.View: everyone who can see the client list
 * can see that a client EXISTS, its company, industry, status and the work
 * attached to it. Only three parties get the phone number, email, WhatsApp and
 * address:
 *
 *  - the CEO and the Operations Manager (the super admins), and
 *  - the account manager assigned to THAT client, not account managers at large.
 *
 * The last point is why this takes the client rather than just the user: holding
 * the ACCOUNT_MANAGER role is not sufficient, the row's accountManagerId has to
 * point at the viewer. A client with no account manager assigned is therefore
 * visible to the super admins only, which is the safe default.
 */
export function canViewClientContact(
  viewer: Pick<SessionUser, "id" | "isSuperAdmin" | "permissions">,
  client: { accountManagerId: string | null }
): boolean {
  if (viewer.isSuperAdmin) return true;
  return client.accountManagerId !== null && client.accountManagerId === viewer.id;
}

/**
 * Strip the confidential fields from a client unless the viewer is entitled.
 *
 * Returns the row with each restricted field replaced by null, plus a
 * `contactVisible` flag so the UI can render "Restricted" rather than an
 * ambiguous empty value — a masked phone number and an absent one look
 * identical otherwise.
 *
 * Applied in the API layer, so an unauthorised caller never receives the data
 * in the first place; hiding it only in the client would ship the secrets to
 * the browser and hide them with CSS.
 */
export function maskClientContact<T extends { accountManagerId: string | null }>(
  viewer: Pick<SessionUser, "id" | "isSuperAdmin" | "permissions">,
  client: T
): T & { contactVisible: boolean } {
  const visible = canViewClientContact(viewer, client);
  if (visible) return { ...client, contactVisible: true };
  const masked = { ...client, contactVisible: false };
  for (const field of CLIENT_CONTACT_FIELDS) {
    if (field in masked) (masked as Record<string, unknown>)[field] = null;
  }
  return masked;
}

/** Whether `viewer` may read `employeeId`'s job description. */
export function canViewJobDescriptionOf(
  viewer: SessionUser,
  employee: { id: string; departmentId: string | null }
) {
  if (viewer.id === employee.id) return can(viewer, "JobDescription.ViewOwn");
  const scope = jobDescriptionScope(viewer);
  if (scope.kind === "all") return true;
  if (scope.kind === "department") return employee.departmentId === scope.departmentId;
  return false;
}
