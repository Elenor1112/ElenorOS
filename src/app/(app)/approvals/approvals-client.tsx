"use client";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CheckCheck, Plane, Clock, LogOut, Check, X, Inbox, ClipboardCheck } from "lucide-react";
import { apiGet, apiSend } from "@/lib/fetcher";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { LEAVE_TYPE_META } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

type ApprovalsData = {
  leaves: any[];
  permissions: any[];
  resignations: any[];
  tasks: any[];
  total: number;
};

export function ApprovalsClient() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["approvals"],
    queryFn: () => apiGet<ApprovalsData>("/api/approvals"),
    refetchInterval: 30_000,
  });

  const act = useMutation({
    mutationFn: (v: { url: string; body: any }) => apiSend(v.url, "PATCH", v.body),
    onSuccess: () => {
      toast.success("Decision recorded");
      qc.invalidateQueries({ queryKey: ["approvals"] });
      qc.invalidateQueries({ queryKey: ["leave"] });
      qc.invalidateQueries({ queryKey: ["perms"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function approve(url: string) { act.mutate({ url, body: { action: "approve" } }); }
  function reject(url: string) { const c = prompt("Rejection reason?"); if (c !== null) act.mutate({ url, body: { action: "reject", comment: c } }); }

  // Tasks go through the dedicated approval endpoint, whose contract is
  // {decision: "approve" | "reject"} rather than the {action} shape the requests
  // above use — see /api/tasks/[id]/approval, the only route allowed to write
  // DONE on a task.
  const decideTask = useMutation({
    mutationFn: (v: { taskId: string; body: { decision: "approve" | "reject"; comment?: string } }) =>
      apiSend(`/api/tasks/${v.taskId}/approval`, "POST", v.body),
    onSuccess: () => {
      toast.success("Decision recorded");
      qc.invalidateQueries({ queryKey: ["approvals"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function approveTask(taskId: string) { decideTask.mutate({ taskId, body: { decision: "approve" } }); }
  function rejectTask(taskId: string) {
    const c = prompt("What needs changing? This is required.");
    if (c !== null && c.trim()) decideTask.mutate({ taskId, body: { decision: "reject", comment: c } });
  }

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;

  if (!data || data.total === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
        <Inbox className="size-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm font-medium">Nothing awaiting your approval</p>
        <p className="text-sm text-muted-foreground">You&apos;re all caught up.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {data.tasks.length > 0 && (
        <Group icon={ClipboardCheck} title="Task approvals" count={data.tasks.length}>
          {data.tasks.map((t, i) => (
            <Row key={t.id} i={i} person={t.submittedBy}
              title={<>
                <Badge color="#8B5CF6">{t.code}</Badge>
                <span className="text-sm text-muted-foreground">{t.title}</span>
              </>}
              detail={t.submittedAt ? `Submitted ${formatDate(t.submittedAt)}` : "Submitted for approval"}
              onApprove={() => approveTask(t.id)}
              onReject={() => rejectTask(t.id)}
            />
          ))}
        </Group>
      )}

      {data.leaves.length > 0 && (
        <Group icon={Plane} title="Leave requests" count={data.leaves.length}>
          {data.leaves.map((r, i) => (
            <Row key={r.id} i={i} person={r.requester}
              title={<>
                <Badge color="#06B6D4">{LEAVE_TYPE_META[r.type as keyof typeof LEAVE_TYPE_META]?.label}</Badge>
                <span className="text-sm text-muted-foreground">{formatDate(r.startDate)} → {formatDate(r.endDate)} · {r.days}d</span>
              </>}
              detail={r.reason}
              onApprove={() => approve(`/api/leave/${r.id}`)}
              onReject={() => reject(`/api/leave/${r.id}`)}
            />
          ))}
        </Group>
      )}

      {data.permissions.length > 0 && (
        <Group icon={Clock} title="Permission requests" count={data.permissions.length}>
          {data.permissions.map((r, i) => (
            <Row key={r.id} i={i} person={r.requester}
              title={<><Badge color="#0EA5E9">{r.type.replace("_", " ")}</Badge><span className="text-sm text-muted-foreground">{formatDate(r.date)}</span></>}
              detail={r.reason}
              onApprove={() => approve(`/api/permissions-requests/${r.id}`)}
              onReject={() => reject(`/api/permissions-requests/${r.id}`)}
            />
          ))}
        </Group>
      )}

      {data.resignations.length > 0 && (
        <Group icon={LogOut} title="Resignations" count={data.resignations.length}>
          {data.resignations.map((r, i) => (
            <Row key={r.id} i={i} person={r.employee}
              title={<><Badge color="#EF4444">Resignation</Badge><span className="text-sm text-muted-foreground">Last day {formatDate(r.lastWorkingDay)}</span></>}
              detail={r.reason}
              onApprove={() => approve(`/api/resignations/${r.id}`)}
              onReject={() => reject(`/api/resignations/${r.id}`)}
            />
          ))}
        </Group>
      )}
    </div>
  );
}

function Group({ icon: Icon, title, count, children }: { icon: React.FC<{ className?: string }>; title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="rounded-full bg-secondary px-2 text-xs text-muted-foreground">{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ i, person, title, detail, onApprove, onReject }: {
  i: number; person: any; title: React.ReactNode; detail: string; onApprove: () => void; onReject: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <Avatar firstName={person.firstName} lastName={person.lastName} src={person.avatarUrl} size={40} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{person.firstName} {person.lastName}</span>
              {title}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{detail}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onReject}><X className="size-4" /> Reject</Button>
          <Button size="sm" onClick={onApprove}><Check className="size-4" /> Approve</Button>
        </div>
      </Card>
    </motion.div>
  );
}
