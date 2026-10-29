"use client";
import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ChevronDown, Network, Users } from "lucide-react";
import { apiGet, apiSend } from "@/lib/fetcher";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, PriorityFlag, DeadlinePill } from "@/components/tasks/task-bits";
import { cn } from "@/lib/utils";
import type { TaskPriority, TaskStatus } from "@prisma/client";

type Person = { id: string; firstName: string; lastName: string; avatarUrl?: string | null };

type Member = Person & {
  jobTitle?: string | null;
  role: { name: string };
  /** Present only for roles allowed to see tasks and performance. */
  openTasks?: {
    id: string; code: string; title: string; status: TaskStatus;
    priority: TaskPriority; deadline: string | null;
  }[];
  performance?: {
    open: number; overdue: number; waitingApproval: number;
    done: number; onTime: number; late: number; onTimeRate: number | null;
  };
};

type DepartmentResponse = {
  department: {
    id: string; name: string; description?: string | null; color: string;
    head: Person | null;
    members: Member[];
  };
  canSeeInsights: boolean;
  canAssignHead: boolean;
  performanceDays?: number;
};

export function DepartmentDetailClient({ id }: { id: string }) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["department", id],
    queryFn: () => apiGet<DepartmentResponse>(`/api/departments/${id}`),
  });

  const setHead = useMutation({
    mutationFn: (headId: string) => apiSend(`/api/departments/${id}`, "PATCH", { headId: headId || null }),
    onSuccess: () => {
      toast.success("Department head updated");
      qc.invalidateQueries({ queryKey: ["department", id] });
      qc.invalidateQueries({ queryKey: ["departments-full"] });
      qc.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const back = (
    <Link
      href="/departments"
      className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" /> Departments
    </Link>
  );

  if (isLoading) {
    return (
      <div>
        {back}
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="mt-4 h-64 rounded-xl" />
      </div>
    );
  }
  if (error || !data) {
    return <div>{back}<p className="text-sm text-muted-foreground">Department not found.</p></div>;
  }

  const { department: d, canSeeInsights, canAssignHead, performanceDays } = data;

  return (
    <div>
      {back}

      <Card className="overflow-hidden">
        <div className="h-1.5" style={{ backgroundColor: d.color }} />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${d.color}1A`, color: d.color }}>
              <Network className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">{d.name}</h1>
              {d.description && <p className="mt-1 text-sm text-muted-foreground">{d.description}</p>}
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="size-3" /> {d.members.length} member{d.members.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className="min-w-56">
            <div className="text-xs text-muted-foreground">Department head</div>
            {canAssignHead ? (
              <Select
                value={d.head?.id ?? ""}
                onChange={(e) => setHead.mutate(e.target.value)}
                disabled={setHead.isPending}
                className="mt-1 h-9 text-sm"
                aria-label="Department head"
              >
                <option value="">No head</option>
                {d.members.map((m) => (
                  <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                ))}
              </Select>
            ) : d.head ? (
              <div className="mt-1 flex items-center gap-2">
                <Avatar firstName={d.head.firstName} lastName={d.head.lastName} src={d.head.avatarUrl} size={24} />
                <span className="text-sm font-medium">{d.head.firstName} {d.head.lastName}</span>
              </div>
            ) : (
              <div className="mt-1 text-sm text-muted-foreground">No head assigned</div>
            )}
          </div>
        </div>
      </Card>

      <h2 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Employees
        {canSeeInsights && (
          <span className="ml-2 font-normal normal-case tracking-normal">
            · performance over the last {performanceDays} days
          </span>
        )}
      </h2>

      {d.members.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No employees in this department yet.</Card>
      ) : (
        <div className="space-y-2">
          {d.members.map((m) => (
            <MemberRow key={m.id} member={m} isHead={d.head?.id === m.id} showInsights={canSeeInsights} />
          ))}
        </div>
      )}
    </div>
  );
}

function MemberRow({ member: m, isHead, showInsights }: { member: Member; isHead: boolean; showInsights: boolean }) {
  const [open, setOpen] = React.useState(false);
  const p = m.performance;
  const tasks = m.openTasks ?? [];

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <Link href={`/employees/${m.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar firstName={m.firstName} lastName={m.lastName} src={m.avatarUrl} size={36} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 truncate font-medium hover:underline">
              {m.firstName} {m.lastName}
              {isHead && (
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">Head</span>
              )}
            </div>
            <div className="truncate text-xs text-muted-foreground">{m.jobTitle || m.role.name}</div>
          </div>
        </Link>

        {showInsights && p && (
          <>
            <div className="flex flex-wrap gap-4 text-center">
              <Stat label="Open" value={p.open} />
              <Stat label="Overdue" value={p.overdue} tone={p.overdue ? "bad" : undefined} />
              <Stat label="Awaiting approval" value={p.waitingApproval} />
              <Stat label="Done" value={p.done} />
              <Stat
                label="On time"
                value={p.onTimeRate == null ? "—" : `${p.onTimeRate}%`}
                tone={p.onTimeRate == null ? undefined : p.onTimeRate >= 80 ? "good" : p.onTimeRate < 50 ? "bad" : undefined}
              />
            </div>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              disabled={!tasks.length}
              aria-expanded={open}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
            >
              {tasks.length} task{tasks.length === 1 ? "" : "s"}
              <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
            </button>
          </>
        )}
      </div>

      {showInsights && open && tasks.length > 0 && (
        <ul className="divide-y divide-border border-t border-border bg-muted/30">
          {tasks.map((t) => (
            <li key={t.id}>
              <Link href={`/tasks?task=${t.id}`} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent/50">
                <PriorityFlag priority={t.priority} />
                <span className="font-mono text-xs text-muted-foreground">{t.code}</span>
                <span className="min-w-0 flex-1 truncate">{t.title}</span>
                <StatusBadge status={t.status} />
                <DeadlinePill deadline={t.deadline} status={t.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: "good" | "bad" }) {
  return (
    <div className="min-w-12">
      <div className={cn("text-sm font-semibold tabular-nums", tone === "good" && "text-success", tone === "bad" && "text-destructive")}>
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
