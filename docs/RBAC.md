# RBAC & Authorization

## Model

A user's **effective permissions** are computed as:

```
effective = rolePermissions(role)
          + userOverrides where effect = ALLOW
          − userOverrides where effect = DENY
```

Super-admin roles (**CEO**, **Operations Manager**) implicitly hold **every**
permission; overrides don't apply to them.

Permissions are checked:
- **Server:** `requirePermission("Task.Create")` in route handlers (throws 403).
- **Client:** `useCan()("Task.Create")` to gate UI affordances.

Source of truth: [`src/lib/rbac.ts`](../src/lib/rbac.ts).

## Roles (hierarchy)

| Level | Role | Super admin |
|---|---|---|
| 0 | CEO | ✅ |
| 1 | Operations Manager | ✅ |
| 2 | Account Manager | — |
| 2 | Sales Manager | — |
| 3 | Art Director | — |
| 4 | Designer / Content Creator / Communication Specialist / Developer | — |

## Permission Catalog (groups)

`Task` · `Project` · `Client` · `Employee` · `Department` · `Leave` ·
`Permission` · `Resignation` · `Performance` · `Warning` · `Eotm` · `Reports` ·
`Analytics` · `Audit` · `Settings` · `Policy` · `JobDescription`

## Role → Permission Matrix (summary)

| Permission | CEO | Ops | Acct Mgr | Sales Mgr | Art Dir | Designer | Content/Comms | Dev |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Task.View | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Task.Create | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — |
| Task.Assign | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — |
| Task.Approve | ✅ | ✅ | ✅ | — | ✅ | — | — | — |
| Task.Edit / Task.EditDetails | ✅ | ✅ | ✅ | ✅ | ✅ | ✅(Edit) | ✅(Edit) | — |
| Task.ViewDepartment | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — |
| Task.ChangeStatus | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Project.Create/Edit | ✅ | ✅ | ✅ | — | — | — | — | — |
| Client.Create/Edit | ✅ | ✅ | ✅ | ✅ | — | — | — | — |
| Employee.Create/Edit/Delete | ✅ | ✅ | — | — | — | — | — | — |
| Employee.EditPermissions | ✅ | ✅ | — | — | — | — | — | — |
| Department.* | ✅ | ✅ | — | — | — | — | — | — |
| Leave.Request | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Leave.Approve | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — |
| Leave.ApproveFinal | ✅ | ✅ | — | — | — | — | — | — |
| Permission.Approve | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — |
| Reports.View / Performance.View | ✅ | ✅ | ✅ | ✅(R) | — | — | — | — |
| Eotm.Manage | ✅ | ✅ | — | — | — | — | — | — |
| Audit.View | ✅ | ✅ | — | — | — | — | — | — |
| Settings.Edit / Policy.Manage | ✅ | ✅ | — | — | — | — | — | — |
| JobDescription.ViewOwn | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| JobDescription.ViewAll | ✅ | ✅ | ✅ | — | — | — | — | — |
| JobDescription.Upload / .Delete | ✅ | ✅ | ✅ | — | — | — | — | — |
| JobDescription.ViewAcknowledgments | ✅ | ✅ | ✅ | — | ✅(dept) | — | — | — |

*(Base employee permissions — View across Task/Project/Client/Employee/Department,
plus Leave/Permission/Resignation requests and JobDescription.ViewOwn — are held
by every role.)*

### Job Description visibility

Reach beyond your own document resolves through `jobDescriptionScope()` in
[`src/lib/rbac.ts`](../src/lib/rbac.ts) — one helper used by every route that can
expose another employee's document:

| Scope | Who | Sees |
|---|---|---|
| `all` | Super admins, `JobDescription.ViewAll` | Every employee |
| `department` | `JobDescription.ViewAcknowledgments` + a department | Their own department (+ themselves) |
| `self` | Everyone else | Their own document only |

Acknowledgment is always self-service: `POST .../ack` refuses a version that
belongs to anyone but the caller, regardless of permissions.

## Task-Assignment Matrix

Who may assign tasks **to** whom (a workflow constraint enforced in
`/api/tasks/meta` and `canAssignTo`):

| Actor | May assign to |
|---|---|
| CEO / Operations Manager | Anyone |
| Account Manager | Art Director, Designer, Content Creator, Communication Specialist, + anyone in Design Team |
| PR & Sales Manager | CEO, Operations Manager, Account Manager, Sales Member, Art Director, Designer, Content Creator, Communication Specialist, + anyone in Design Team |
| Art Director | Designers only, + anyone in Design Team |
| Others | (cannot assign) |

A user is assignable if they clear **either** the role matrix
(`ASSIGNMENT_MATRIX`) **or** the department carve-out (`ASSIGNABLE_DEPARTMENTS`),
so a new role added to the Design Team is briefable without a code change.

The PR & Sales Manager is the one actor below level 1 that assigns **upward**
(CEO, Operations Manager, Account Manager). A live deal produces work for those
roles — approve a quote, make an introduction, sign off on scope — and this
keeps it tracked in the system. The reach is task assignment only: it grants no
visibility, approval or edit rights over those roles anywhere else.

## Approval Routing

Leave / Permission / Resignation route through
[`src/lib/approvals.ts`](../src/lib/approvals.ts):

```
Employee → Direct Manager → Operations Manager → (CEO, resignations only)
```

- A rejection at any step short-circuits the request and notifies the requester
  with the reason and who rejected it.
- Each approval advances to and notifies the next approver.
- If no approvers resolve (e.g. the CEO submits), the request auto-approves.

## Task Approval Chain

Tasks use a separate, sequential chain derived from the task's own people —
`approvalStages()` in [`src/lib/rbac.ts`](../src/lib/rbac.ts) — rather than the
routing above: `workers → assignees → creator (+ follow-ups)`, submitter excluded,
each person appearing once at their earliest stage. Enforced server-side in
[`src/lib/task-lifecycle.ts`](../src/lib/task-lifecycle.ts) (`submitForApproval` /
`approveTask` / `rejectTask`), which is the only place a task can reach `DONE`.

Some tasks additionally guarantee an Account Manager stage: on submission,
`submitForApproval` adds the relevant Account Manager as a `TaskFollowUp` (if not
already on the chain), which gives them creator-level approval authority — see
`isTaskCreatorEquivalent`. Two independent triggers add this seat (either is
sufficient, and both are checked on every submission):

1. **Design Team tasks** — the task's `Client.accountManagerId`, i.e. whoever
   briefs that client's work.
2. **Direct reports of an Account Manager** — whenever the *submitter's own*
   `User.managerId` points at a user whose role is `ACCOUNT_MANAGER`, that manager
   is added, whatever department the task is in. This generalizes the guarantee
   beyond Design Team: anyone who reports directly to an Account Manager gets
   that manager as their task's final approval stage.

This makes the flow `Worker → [department lead] → Account Manager → Done` hold
even when the Account Manager is neither the task's creator nor an assignee.
