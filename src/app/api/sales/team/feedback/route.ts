import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, audit, toErrorResponse, ApiError } from "@/lib/api";
import { can, type SessionUser } from "@/lib/rbac";
import { requireSalesModule } from "@/lib/sales";
import { tableResponse } from "@/lib/export";

/**
 * Manager feedback on salespeople.
 *
 * A private evaluation: gated on Sales.ViewTeam, the same permission as the
 * team performance view it lives in, so the person being evaluated never reads
 * it. `?userId=` narrows to one person; `?export=1` returns a CSV.
 */

const text = z.string().trim().max(4000).optional().nullable();

const feedbackSchema = z.object({
  subjectId: z.string().min(1),
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Period must be YYYY-MM"),
  rating: z.coerce.number().int().min(1).max(5),
  strengths: text,
  improvements: text,
  actionItems: text,
});

const personPick = { select: { id: true, firstName: true, lastName: true } };

function requireTeamViewer(user: SessionUser) {
  if (!can(user, "Sales.ViewTeam")) {
    throw new ApiError(403, "Missing permission: Sales.ViewTeam");
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = requireSalesModule(await requireUser());
    requireTeamViewer(user);

    const sp = req.nextUrl.searchParams;
    const userId = sp.get("userId");

    const feedback = await db.salesMemberFeedback.findMany({
      where: userId ? { subjectId: userId } : {},
      include: { subject: personPick, author: personPick },
      orderBy: { createdAt: "desc" },
    });

    if (sp.get("export")) {
      const name = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`;
      let title = "Sales team feedback";
      if (userId) {
        const person = await db.user.findUnique({ where: { id: userId }, ...personPick });
        if (!person) throw new ApiError(404, "Salesperson not found.");
        title = `Sales feedback ${name(person)}`;
      }
      return tableResponse({
        name: title,
        columns: [
          "Employee", "Period", "Rating (1-5)", "Strengths", "Areas to improve",
          "Action items", "Author", "Date",
        ],
        rows: feedback.map((f) => [
          name(f.subject),
          f.period,
          f.rating,
          f.strengths,
          f.improvements,
          f.actionItems,
          name(f.author),
          f.createdAt.toISOString().slice(0, 10),
        ]),
      });
    }

    return NextResponse.json({ feedback });
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = requireSalesModule(await requireUser());
    requireTeamViewer(user);
    const data = feedbackSchema.parse(await req.json());

    const subject = await db.user.findUnique({ where: { id: data.subjectId }, select: { id: true } });
    if (!subject) throw new ApiError(404, "Salesperson not found.");

    const feedback = await db.salesMemberFeedback.create({
      data: {
        subjectId: subject.id,
        authorId: user.id,
        period: data.period,
        rating: data.rating,
        strengths: data.strengths || null,
        improvements: data.improvements || null,
        actionItems: data.actionItems || null,
      },
      include: { subject: personPick, author: personPick },
    });

    await audit({
      actorId: user.id, action: "sales.memberFeedback.create", entity: "salesMemberFeedback",
      entityId: feedback.id,
      newValue: { subjectId: subject.id, period: data.period, rating: data.rating },
    });

    return NextResponse.json({ feedback }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
