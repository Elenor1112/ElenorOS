import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, requirePermission, audit, toErrorResponse, ApiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { isProCoder } from "@/lib/eotm-pro";

const schema = z.object({
  period: z.string(),
  userId: z.string(),
  justification: z.string().min(3),
  reward: z.string().optional(),
});

// Pro Coder picks with no conditions — justification optional.
const proSchema = schema.extend({ justification: z.string().optional() });

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await requireUser();
    const pro = isProCoder(sessionUser);
    const actor = pro ? sessionUser : await requirePermission("Eotm.Manage");
    const data = (pro ? proSchema : schema).parse(await req.json());
    if (pro) {
      const target = await db.user.findUnique({ where: { id: data.userId }, select: { id: true } });
      if (!target) throw new ApiError(404, "Employee not found");
    }
    const score = await db.eotmScore.findUnique({ where: { userId_period: { userId: data.userId, period: data.period } } });

    const winner = await db.eotmWinner.upsert({
      where: { period: data.period },
      update: { userId: data.userId, total: score?.total ?? 0, overridden: true, justification: data.justification || null, reward: data.reward },
      create: { period: data.period, userId: data.userId, total: score?.total ?? 0, overridden: true, justification: data.justification || null, reward: data.reward },
    });

    // award achievement + notify
    await db.achievement.create({
      data: { userId: data.userId, badge: "eotm", title: `Employee of the Month — ${data.period}` },
    });
    await notify({
      userId: data.userId,
      type: "EOTM",
      title: "You're Employee of the Month! 🏆",
      body: data.reward ? `Reward: ${data.reward}` : "Congratulations on your recognition.",
      link: "/eotm",
    });

    await audit({ actorId: actor.id, action: "eotm.override", entity: "eotm", entityId: winner.id, newValue: { userId: data.userId, justification: data.justification } });
    return NextResponse.json({ winner });
  } catch (e) {
    return toErrorResponse(e);
  }
}

const cfgSchema = z.object({
  taskCompletionWeight: z.number().int().min(0).max(100),
  deadlineWeight: z.number().int().min(0).max(100),
  qualityWeight: z.number().int().min(0).max(100),
  attendanceWeight: z.number().int().min(0).max(100),
  collaborationWeight: z.number().int().min(0).max(100),
  initiativeWeight: z.number().int().min(0).max(100),
});

export async function PATCH(req: NextRequest) {
  try {
    const actor = await requirePermission("Eotm.Manage");
    const data = cfgSchema.parse(await req.json());
    const existing = await db.eotmConfig.findFirst();
    const cfg = existing
      ? await db.eotmConfig.update({ where: { id: existing.id }, data })
      : await db.eotmConfig.create({ data });
    await audit({ actorId: actor.id, action: "eotm.config", entity: "eotm", newValue: data });
    return NextResponse.json({ config: cfg });
  } catch (e) {
    return toErrorResponse(e);
  }
}
