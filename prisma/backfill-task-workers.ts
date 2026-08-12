/**
 * Move single-worker tasks onto the multi-worker join table.
 *
 * A task's worker used to be one nullable FK (`Task.workerId`). It is now a set
 * of `TaskWorker` rows so two or three people can execute the same task. This
 * copies every existing pointer into that table.
 *
 * Run AFTER `npm run db:push` has created the TaskWorker table, and before the
 * app is serving the new code — until this runs, a pre-existing task's worker is
 * only in the old column and the drawer would show it as unassigned.
 *
 * Safe to re-run: it inserts only pointers that have no matching TaskWorker row
 * yet, so a second pass reports 0 and writes nothing. It never deletes, and it
 * leaves `Task.workerId` in place — that column is the rollback path.
 *
 * Usage:
 *   npx tsx prisma/backfill-task-workers.ts           # dry run (default)
 *   npx tsx prisma/backfill-task-workers.ts --apply   # writes
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const APPLY = process.argv.includes("--apply");

async function main() {
  console.log(APPLY ? "MODE: APPLY\n" : "MODE: DRY RUN (pass --apply to write)\n");

  // Raw SQL rather than the Prisma client: `Task.workerId` is deprecated in the
  // schema and this script must keep working after the column is eventually
  // dropped from the model (it just finds nothing then).
  const pending = await db.$queryRawUnsafe<
    { id: string; code: string; workerId: string; worker: string }[]
  >(
    `select t.id, t.code, t."workerId", (u."firstName" || ' ' || u."lastName") as worker
     from "Task" t
     join "User" u on u.id = t."workerId"
     where t."workerId" is not null
       and not exists (
         select 1 from "TaskWorker" tw
         where tw."taskId" = t.id and tw."userId" = t."workerId"
       )
     order by t.code`
  );

  console.log(`tasks with a worker to migrate: ${pending.length}`);
  for (const p of pending.slice(0, 20)) {
    console.log(`   ${p.code.padEnd(10)} -> ${p.worker}`);
  }
  if (pending.length > 20) console.log(`   … ${pending.length - 20} more`);

  if (!pending.length) {
    console.log("\n✓ nothing to do — every worker pointer already has a TaskWorker row");
    return;
  }

  if (!APPLY) {
    console.log("\nDry run: nothing written. Re-run with --apply.");
    return;
  }

  // `assignedAt` comes from the task's own assignment stamp where there is one,
  // so a migrated worker does not read as "added today" in the drawer's ordering.
  // ON CONFLICT keeps the re-run safe even if a row appears between the read
  // above and this write.
  const result = await db.$executeRawUnsafe(
    `insert into "TaskWorker" ("taskId", "userId", "assignedAt")
     select t.id, t."workerId", coalesce(t."assignedAt", t."createdAt")
     from "Task" t
     where t."workerId" is not null
     on conflict ("taskId", "userId") do nothing`
  );

  console.log(`\n✓ inserted ${result} TaskWorker row(s)`);
  console.log("  Task.workerId left untouched as the rollback path.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
