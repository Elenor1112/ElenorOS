import type { TaskStatus } from "@prisma/client";

/**
 * Status facts shared by the server rules and the client UI.
 *
 * Split out of lib/task-lifecycle.ts because that module is server-only (it
 * touches the database), while the task drawer and Kanban need the same answer
 * to decide which options to render. One definition is what keeps the dropdown
 * from offering a status the API would refuse.
 */

/** Under review — the only status an approval decision can be made from. */
export const APPROVAL_STATUS: TaskStatus = "WAITING_APPROVAL";

/**
 * Where a rejected task lands, and the status work is done in.
 *
 * EDITING rather than IN_PROGRESS: "editing" is the workflow's own word for
 * "being worked on / reworked", and a rejected task returning to EDITING reads
 * correctly whether it is the first attempt or the fourth.
 */
export const REWORK_STATUS: TaskStatus = "EDITING";

/**
 * Statuses a task may be submitted for approval FROM.
 *
 * The canonical flow is EDITING → WAITING_APPROVAL, but a task being worked in
 * IN_PROGRESS (the status the rest of the app stamps `startedAt` on) must be
 * submittable too — otherwise every worker would have to make a meaningless stop
 * in EDITING first. TODO and HOLD are admitted for the small-task case where the
 * work was finished without anyone maintaining the status.
 */
export const SUBMITTABLE_FROM: readonly TaskStatus[] = ["EDITING", "IN_PROGRESS", "TODO", "HOLD"];

/**
 * Statuses that may be set by an ordinary status change.
 *
 * DONE is absent because approval is the only way to reach it, and
 * WAITING_APPROVAL because entering review requires evidence a status change
 * cannot carry — it goes through the submit action instead. Used by the API to
 * refuse, and by the UI to build the dropdown, so the two cannot disagree.
 */
export const DIRECTLY_SETTABLE_STATUSES: readonly TaskStatus[] = [
  "TODO", "IN_PROGRESS", "HOLD", "EDITING", "CANCELLED",
];
