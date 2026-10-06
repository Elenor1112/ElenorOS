/**
 * Take New Request amounts back out of their lead's deal value.
 *
 * A request used to be added onto `Lead.estimatedValue` when it was logged. It
 * is now its own entry in Sales > Clients with its own amount, and the lead's
 * original deal value is left alone. This subtracts every request that was
 * logged under the old rule from its lead.
 *
 * Only requests created before the cutoff are subtracted — requests logged
 * after the new code is live never bumped the value. The cutoff defaults to
 * now, so run this right after deploying; pass --before=<ISO date> otherwise.
 *
 * Safe to re-run: each corrected lead gets a `sales.request.unbump` audit row,
 * and leads that already have one are skipped. Clamped at 0, the same way the
 * old delete path clamped.
 *
 * Usage:
 *   npx tsx prisma/unbump-request-values.ts                       # dry run (default)
 *   npx tsx prisma/unbump-request-values.ts --apply               # writes
 *   npx tsx prisma/unbump-request-values.ts --before=2026-10-06T12:00:00Z --apply
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const beforeArg = process.argv.find((a) => a.startsWith("--before="))?.slice("--before=".length);
const BEFORE = beforeArg ? new Date(beforeArg) : new Date();
const ACTION = "sales.request.unbump";

async function main() {
  if (Number.isNaN(BEFORE.getTime())) throw new Error(`Invalid --before date: ${beforeArg}`);
  console.log(APPLY ? "MODE: APPLY" : "MODE: DRY RUN (pass --apply to write)");
  console.log(`cutoff: requests created before ${BEFORE.toISOString()}\n`);

  const done = new Set(
    (await db.auditLog.findMany({ where: { action: ACTION, entity: "lead" }, select: { entityId: true } }))
      .map((a) => a.entityId)
  );

  const sums = await db.leadRequest.groupBy({
    by: ["leadId"],
    where: { createdAt: { lt: BEFORE } },
    _sum: { amount: true },
    _count: true,
  });

  const pending = sums.filter((s) => !done.has(s.leadId));
  const leads = await db.lead.findMany({
    where: { id: { in: pending.map((p) => p.leadId) } },
    select: { id: true, code: true, estimatedValue: true },
  });
  const byId = new Map(leads.map((l) => [l.id, l]));

  const plan = pending.map((p) => {
    const lead = byId.get(p.leadId)!;
    const before = Number(lead.estimatedValue ?? 0);
    const sub = Number(p._sum.amount ?? 0);
    return { lead, before, sub, after: Math.max(before - sub, 0), count: p._count };
  });

  console.log(`leads to correct: ${plan.length} (already corrected: ${sums.length - pending.length})`);
  for (const p of plan) {
    console.log(`   ${p.lead.code.padEnd(10)} ${p.before} - ${p.sub} (${p.count} request(s)) -> ${p.after}`);
  }

  if (!plan.length) {
    console.log("\n✓ nothing to do");
    return;
  }
  if (!APPLY) {
    console.log("\nDry run: nothing written. Re-run with --apply.");
    return;
  }

  for (const p of plan) {
    await db.$transaction([
      db.lead.update({ where: { id: p.lead.id }, data: { estimatedValue: p.after } }),
      db.auditLog.create({
        data: {
          action: ACTION, entity: "lead", entityId: p.lead.id,
          oldValue: { estimatedValue: p.before },
          newValue: { estimatedValue: p.after, subtracted: p.sub, cutoff: BEFORE.toISOString() },
        },
      }),
    ]);
  }
  console.log(`\n✓ corrected ${plan.length} lead(s)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
