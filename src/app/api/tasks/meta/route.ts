import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, toErrorResponse } from "@/lib/api";
import {
  ASSIGNMENT_MATRIX, ASSIGNABLE_DEPARTMENTS, ROLE_PERMISSIONS, can,
} from "@/lib/rbac";
import type { Prisma, RoleKey } from "@prisma/client";

// Options needed to build task create/edit forms, scoped to the actor's role.
export async function GET() {
  try {
    const user = await requireUser();

    const [projects, clients, labels, departments] = await Promise.all([
      db.project.findMany({ where: { status: { not: "CANCELLED" } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
      db.client.findMany({ where: { status: { not: "ARCHIVED" } }, select: { id: true, company: true }, orderBy: { company: "asc" } }),
      db.label.findMany({ orderBy: { name: "asc" } }),
      db.department.findMany({ where: { archived: false }, select: { id: true, name: true, color: true }, orderBy: { name: "asc" } }),
    ]);

    // Who this user may assign tasks to. Mirrors canAssignTo(): a role in the
    // matrix OR anyone in a department this role may brief directly, so the
    // dropdown and the API agree on one rule.
    const allowedRoles = ASSIGNMENT_MATRIX[user.roleKey] ?? [];
    const allowedDepartments = ASSIGNABLE_DEPARTMENTS[user.roleKey] ?? [];
    const assignableScope: Prisma.UserWhereInput = user.isSuperAdmin
      ? {}
      : {
          OR: [
            { role: { key: { in: allowedRoles } } },
            ...(allowedDepartments.length
              ? [{ department: { name: { in: allowedDepartments } } }]
              : []),
          ],
        };

    const personSelect = {
      id: true, firstName: true, lastName: true, avatarUrl: true, jobTitle: true,
      role: { select: { name: true, key: true } },
    } as const;

    const assignable = await db.user.findMany({
      where: { status: "ACTIVE", ...assignableScope },
      select: personSelect,
      orderBy: [{ role: { level: "asc" } }, { firstName: "asc" }],
    });

    // Who this user may set as a *worker*.
    //
    // A delegator (Art Director) is capped at their own department — the "only
    // my team" rule — and that cap wins even when they ALSO hold the general
    // grant, matching workerAuthorization(). Without that precedence someone
    // holding both roles would see an unscoped list the API would then reject.
    const hasGeneralWorkerGrant = can(user, "Task.AssignWorker") || can(user, "Task.ChangeWorker");
    const canDelegate = can(user, "Task.DelegateOwnTasks");
    const workerScope: Prisma.UserWhereInput | null = user.isSuperAdmin
      ? {}
      : canDelegate
        ? { departmentId: user.departmentId ?? "__none__" }
        : hasGeneralWorkerGrant
          ? assignableScope
          : null;

    const workerCandidates = workerScope
      ? await db.user.findMany({
          where: { status: "ACTIVE", ...workerScope },
          select: personSelect,
          orderBy: [{ role: { level: "asc" } }, { firstName: "asc" }],
        })
      : [];

    // Who may be nominated as a FOLLOW-UP: anyone active who is allowed to
    // approve tasks. Mirrors canBeFollowUp() in lib/tasks.ts, which is the gate
    // the API actually applies.
    //
    // Deliberately NOT scoped by the assignment matrix. A follow-up stands in on
    // the briefing side, so the usual case is nominating someone at or above your
    // own level — filtering by "who may you hand work to" would hide exactly the
    // people this list exists to offer.
    //
    // Role defaults are read from ROLE_PERMISSIONS (the same source the session
    // resolver uses) and then corrected by per-user overrides, so a person
    // individually granted or denied Task.Approve appears correctly either way.
    const approverRoles = (Object.keys(ROLE_PERMISSIONS) as RoleKey[]).filter(
      (key) => ROLE_PERMISSIONS[key].includes("Task.Approve")
    );
    const followUpCandidates = await db.user.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { role: { key: { in: approverRoles } } },
          // Individually granted, whatever their role says.
          { permissions: { some: { effect: "ALLOW", permission: { key: "Task.Approve" } } } },
        ],
        // …minus anyone whose grant was individually revoked.
        NOT: { permissions: { some: { effect: "DENY", permission: { key: "Task.Approve" } } } },
      },
      select: personSelect,
      orderBy: [{ role: { level: "asc" } }, { firstName: "asc" }],
    });

    return NextResponse.json({
      projects, clients, labels, departments, assignable, workerCandidates,
      followUpCandidates,
    });
  } catch (e) {
    return toErrorResponse(e);
  }
}
