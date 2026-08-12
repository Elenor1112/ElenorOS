"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  X, Plus, Trash2, Send, Check, CheckCircle2, Circle, GitBranch,
  Clock, MessageSquare, Activity as ActivityIcon, Building2, FolderKanban,
} from "lucide-react";
import { apiGet, apiSend } from "@/lib/fetcher";
import { Avatar, AvatarGroup } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, TimestampValue, taskRef, isCodeRef } from "./task-bits";
import { TaskApproval } from "./task-approval";
import { TASK_STATUS_META, TASK_STATUS_ORDER, PRIORITY_META } from "@/lib/constants";
import { formatExactDateTime, fullName } from "@/lib/utils";
import { DeadlinePicker, toDeadlineInput } from "@/components/ui/deadline-picker";
import { useSession, useCan } from "@/components/session-context";
import { canChangeTaskStatus } from "@/lib/rbac";
import { DIRECTLY_SETTABLE_STATUSES } from "@/lib/task-status";
import type { TaskStatus } from "@prisma/client";

export function TaskDetail({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {taskId && <Panel taskId={taskId} onClose={onClose} />}
    </AnimatePresence>,
    document.body
  );
}

function Panel({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const me = useSession();
  const can = useCan();
  const listKeys = ["tasks"];

  const { data, isLoading } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => apiGet<{ task: any }>(`/api/tasks/${taskId}`),
  });
  const task = data?.task;

  const patch = useMutation({
    mutationFn: (body: any) => apiSend(`/api/tasks/${taskId}`, "PATCH", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task", taskId] });
      qc.invalidateQueries({ queryKey: listKeys });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Title, priority, deadline and description are management fields — the API
  // rejects them without Task.EditDetails, so render them read-only instead of
  // letting the user click into a guaranteed 403.
  const canEditDetails = can("Task.EditDetails");

  // Worker = who executes, as opposed to assignees, who stay accountable.
  // Delegation is scoped to your own tasks, so mirror the server's rule here to
  // avoid offering a control that would 403.
  const isAssignee = Boolean(task?.assignees?.some((a: any) => a.user.id === me.id));

  // Status is the assigned employee's to report — see canChangeTaskStatus in
  // lib/tasks.ts, which the API enforces. Mirrored here so a manager sees the
  // status as read-only text rather than a dropdown that would 403 on change.
  // The task's workers, oldest first — the order the API returns them in.
  const workers: any[] = React.useMemo(
    () => (task?.workers ?? []).map((w: any) => w.user),
    [task]
  );
  const workerIds: string[] = React.useMemo(() => workers.map((w) => w.id), [workers]);

  const canSetStatus = task
    ? canChangeTaskStatus(me, {
        assignees: (task.assignees ?? []).map((a: any) => ({ userId: a.user.id })),
        workers: workerIds.map((userId) => ({ userId })),
      })
    : false;
  // Adding a second worker to a staffed task is a CHANGE to existing delegation,
  // which is the same rule the API applies — mirrored here so the plus button
  // never offers something that would 403.
  const canSetWorker =
    can(workerIds.length ? "Task.ChangeWorker" : "Task.AssignWorker") ||
    (can("Task.DelegateOwnTasks") && isAssignee);

  // While a review is open (or the task is approved and closed) the status is not
  // hand-editable by anyone — it moves only through an approval decision. Mirrors
  // assertDirectStatusChange in lib/task-lifecycle.ts.
  const approvalLocked = task?.status === "WAITING_APPROVAL" || task?.status === "DONE";

  // Who is accountable can be changed after creation by the CEO, Operations
  // Manager, PR & Sales Manager and Account Management. Separate from
  // Task.EditDetails so an Art Director keeps title/deadline editing without
  // gaining the ability to move accountability — mirrors the API's own gate.
  const canEditAssignees = can("Task.EditAssignees");

  // Candidate lists are server-scoped (own department for delegators, the
  // assignment matrix for assignees), so neither picker can offer someone the
  // API would reject.
  const { data: meta } = useQuery({
    queryKey: ["task-meta"],
    queryFn: () => apiGet<{ workerCandidates: any[]; assignable: any[] }>("/api/tasks/meta"),
    enabled: canSetWorker || canEditAssignees,
    staleTime: 5 * 60_000,
  });
  const workerCandidates = meta?.workerCandidates ?? [];
  const assignableUsers = meta?.assignable ?? [];

  const assigneeIds: string[] = React.useMemo(
    () => (task?.assignees ?? []).map((a: any) => a.user.id),
    [task]
  );

  function toggleAssignee(userId: string) {
    const next = assigneeIds.includes(userId)
      ? assigneeIds.filter((id) => id !== userId)
      : [...assigneeIds, userId];
    patch.mutate({ assigneeIds: next });
  }

  // Moving to In Progress without a worker prompts for one, which is the
  // delegation moment the workflow is built around.
  const [promptWorker, setPromptWorker] = React.useState(false);
  // Whether the "add another worker" picker is open. Extra workers are the
  // exception, so the picker stays out of the way until asked for.
  const [addingWorker, setAddingWorker] = React.useState(false);

  function changeStatus(status: TaskStatus) {
    if (status === "IN_PROGRESS" && !workerIds.length && canSetWorker && workerCandidates.length) {
      setPromptWorker(true);
    }
    patch.mutate({ status });
  }

  function addWorker(userId: string) {
    setAddingWorker(false);
    setPromptWorker(false);
    if (!userId || workerIds.includes(userId)) return;
    patch.mutate({ workerIds: [...workerIds, userId] });
  }

  function removeWorker(userId: string) {
    patch.mutate({ workerIds: workerIds.filter((id) => id !== userId) });
  }

  // Only people not already on the task can be added.
  const addableWorkers = workerCandidates.filter((u: any) => !workerIds.includes(u.id));

  const [comment, setComment] = React.useState("");
  const addComment = useMutation({
    mutationFn: () => apiSend(`/api/tasks/${taskId}/comments`, "POST", { body: comment }),
    onSuccess: () => { setComment(""); qc.invalidateQueries({ queryKey: ["task", taskId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const [newItem, setNewItem] = React.useState("");
  const addChecklist = useMutation({
    mutationFn: () => apiSend(`/api/tasks/${taskId}/checklist`, "POST", { text: newItem }),
    onSuccess: () => { setNewItem(""); qc.invalidateQueries({ queryKey: ["task", taskId] }); },
  });
  const toggleChecklist = useMutation({
    mutationFn: (v: { itemId: string; done: boolean }) => apiSend(`/api/tasks/${taskId}/checklist`, "PATCH", v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["task", taskId] }),
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}
      />
      <motion.div
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative z-10 flex h-full w-full max-w-2xl flex-col border-l border-border bg-card shadow-2xl"
      >
        {isLoading || !task ? (
          <div className="space-y-4 p-6"><Skeleton className="h-8 w-40" /><Skeleton className="h-32" /><Skeleton className="h-48" /></div>
        ) : (
          <>
            {/* header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-3">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs text-muted-foreground ${isCodeRef(task) ? "font-mono" : "font-medium"}`}
                  title={task.code}
                >
                  {taskRef(task)}
                </span>
                <StatusBadge status={task.status} />
              </div>
              <div className="flex items-center gap-1">
                {can("Task.Delete") && (
                  <button
                    onClick={() => {
                      if (confirm("Delete this task?")) {
                        apiSend(`/api/tasks/${taskId}`, "DELETE").then(() => {
                          qc.invalidateQueries({ queryKey: listKeys }); onClose();
                        });
                      }
                    }}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
                <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent">
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {canEditDetails ? (
                <input
                  defaultValue={task.title}
                  onBlur={(e) => e.target.value !== task.title && patch.mutate({ title: e.target.value })}
                  className="w-full bg-transparent text-xl font-bold outline-none focus:bg-accent/30 rounded px-1 -mx-1"
                />
              ) : (
                <h2 className="px-1 -mx-1 text-xl font-bold">{task.title}</h2>
              )}

              {task.parent && (
                <a href={`/tasks?task=${task.parent.id}`} className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                  <GitBranch className="size-3" /> Subtask of {task.parent.code}
                </a>
              )}

              {/* meta grid */}
              {/* Single column on phones — the timestamp rows need the width. */}
              <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-border bg-background p-4 sm:grid-cols-2">
                {/* Only the assigned employee reports status. Everyone else,
                    managers included, sees it as a read-only badge. */}
                <MetaRow label="Status">
                  {/* Done and Waiting Approval are absent from the options: they
                      belong to the approval flow (the panel below), and the API
                      refuses them here. The current status is always listed even
                      when it is one of those, so a task under review still shows
                      what it is rather than snapping to another value. */}
                  {canSetStatus && !approvalLocked ? (
                    <Select
                      value={task.status}
                      onChange={(e) => changeStatus(e.target.value as TaskStatus)}
                      className="h-8"
                    >
                      {TASK_STATUS_ORDER.filter(
                        (s) => DIRECTLY_SETTABLE_STATUSES.includes(s) || s === task.status
                      ).map((s) => (
                        <option key={s} value={s}>{TASK_STATUS_META[s].label}</option>
                      ))}
                    </Select>
                  ) : approvalLocked ? (
                    <div>
                      <StatusBadge status={task.status} />
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {task.status === "DONE"
                          ? "Approved and closed."
                          : "Under review — an approver decides from here."}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <StatusBadge status={task.status} />
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Only the assigned employee can change this.
                      </p>
                    </div>
                  )}
                </MetaRow>
                <MetaRow label="Priority">
                  {canEditDetails ? (
                    <Select value={task.priority} onChange={(e) => patch.mutate({ priority: e.target.value })} className="h-8">
                      {Object.entries(PRIORITY_META).map(([k, m]) => (
                        <option key={k} value={k}>{m.label}</option>
                      ))}
                    </Select>
                  ) : (
                    <Badge color={PRIORITY_META[task.priority as keyof typeof PRIORITY_META]?.color}>
                      {PRIORITY_META[task.priority as keyof typeof PRIORITY_META]?.label ?? task.priority}
                    </Badge>
                  )}
                </MetaRow>
                {/* Assignees own the outcome; Worker does the work. Kept as two
                    rows so the distinction is visible at a glance. */}
                <MetaRow label="Assignees" wide={canEditAssignees && assignableUsers.length > 0}>
                  {canEditAssignees && assignableUsers.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {assignableUsers.map((u: any) => {
                        const active = assigneeIds.includes(u.id);
                        return (
                          <button
                            key={u.id}
                            type="button"
                            disabled={patch.isPending}
                            onClick={() => toggleAssignee(u.id)}
                            title={u.jobTitle ? `${fullName(u)} · ${u.jobTitle}` : fullName(u)}
                            className={`flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-xs transition-colors disabled:opacity-60 ${
                              active
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border hover:border-primary/40"
                            }`}
                          >
                            <Avatar
                              firstName={u.firstName}
                              lastName={u.lastName}
                              src={u.avatarUrl}
                              size={20}
                            />
                            {u.firstName} {active && <Check className="size-3" />}
                          </button>
                        );
                      })}
                    </div>
                  ) : task.assignees.length ? (
                    <AvatarGroup users={task.assignees.map((a: any) => a.user)} size={26} />
                  ) : <span className="text-sm text-muted-foreground">Unassigned</span>}
                </MetaRow>
                {/* A task can be executed by several people. They are equal —
                    any of them can report status and submit the work — so the
                    list is a flat set of chips with no "primary" slot. */}
                <MetaRow label={workers.length > 1 ? "Workers" : "Worker"} wide={canSetWorker}>
                  {canSetWorker ? (
                    <div
                      className={`flex flex-wrap items-center gap-1.5 ${
                        promptWorker && !workers.length ? "rounded-md p-1 ring-1 ring-warning" : ""
                      }`}
                    >
                      {workers.map((w: any) => (
                        <span
                          key={w.id}
                          title={w.jobTitle ? `${fullName(w)} · ${w.jobTitle}` : fullName(w)}
                          className="flex items-center gap-1.5 rounded-full border border-primary bg-primary/10 py-1 pl-1 pr-1.5 text-xs text-primary"
                        >
                          <Avatar
                            firstName={w.firstName}
                            lastName={w.lastName}
                            src={w.avatarUrl}
                            size={20}
                          />
                          {fullName(w)}
                          <button
                            type="button"
                            disabled={patch.isPending}
                            onClick={() => removeWorker(w.id)}
                            aria-label={`Remove ${fullName(w)}`}
                            className="rounded-full p-0.5 hover:bg-primary/20 disabled:opacity-60"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}

                      {/* The picker replaces the plus button while open, so the
                          row never grows two controls doing the same job. */}
                      {addingWorker ? (
                        <Select
                          autoFocus
                          value=""
                          disabled={patch.isPending}
                          onChange={(e) => addWorker(e.target.value)}
                          onBlur={() => setAddingWorker(false)}
                          className="h-8 w-auto"
                        >
                          <option value="">Select a person…</option>
                          {addableWorkers.map((u: any) => (
                            <option key={u.id} value={u.id}>
                              {fullName(u)}{u.jobTitle ? ` · ${u.jobTitle}` : ""}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        addableWorkers.length > 0 && (
                          <button
                            type="button"
                            disabled={patch.isPending}
                            onClick={() => setAddingWorker(true)}
                            title={workers.length ? "Add another worker" : "Assign a worker"}
                            className="flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-60"
                          >
                            <Plus className="size-3" />
                            {workers.length ? "Add" : "Assign"}
                          </button>
                        )
                      )}

                      {!workers.length && !addableWorkers.length && !addingWorker && (
                        <span className="text-sm text-muted-foreground">Not delegated</span>
                      )}
                    </div>
                  ) : workers.length ? (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      {workers.map((w: any) => (
                        <span key={w.id} className="flex items-center gap-2 text-sm">
                          <Avatar
                            firstName={w.firstName}
                            lastName={w.lastName}
                            src={w.avatarUrl}
                            size={24}
                          />
                          {fullName(w)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not delegated</span>
                  )}
                  {promptWorker && !workers.length && (
                    <p className="mt-1 text-[11px] text-warning">
                      Select who will carry out this work.
                    </p>
                  )}
                </MetaRow>
                {/* Lifecycle stamps are system-managed and read-only: assigned
                    on creation/first assignment, started on the first move into
                    In Progress. Neither is editable from here or via the API. */}
                <MetaRow label="Assigned Date">
                  <TimestampValue value={task.assignedAt} placeholder="Not assigned yet" />
                </MetaRow>
                <MetaRow label="Start Date">
                  <TimestampValue value={task.startedAt} placeholder="Not started yet" />
                </MetaRow>
                <MetaRow label="Deadline" wide={canEditDetails}>
                  {canEditDetails ? (
                    <DeadlinePicker
                      value={toDeadlineInput(task.deadline)}
                      onChange={(next) => patch.mutate({ deadline: next || null })}
                    />
                  ) : (
                    <TimestampValue value={task.deadline} placeholder="No deadline" />
                  )}
                </MetaRow>
                {/* Client above Project, mirroring the hierarchy. Client is
                    derived from the project and is never editable here. */}
                <MetaRow label="Client">
                  {task.client ? (
                    <span className="flex items-center gap-1.5 text-sm">
                      <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                      {task.client.company}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Internal</span>
                  )}
                </MetaRow>
                <MetaRow label="Project">
                  {task.project ? (
                    <span className="flex items-center gap-1.5 text-sm">
                      <FolderKanban className="size-3.5 shrink-0 text-muted-foreground" />
                      {task.project.name}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">No project</span>
                  )}
                </MetaRow>
              </div>

              {/* progress */}
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium">Progress</span>
                  <span className="text-muted-foreground">{task.progress}%</span>
                </div>
                <input
                  type="range" min={0} max={100} step={5} defaultValue={task.progress}
                  onMouseUp={(e) => patch.mutate({ progress: Number((e.target as HTMLInputElement).value) })}
                  className="w-full accent-primary"
                />
              </div>

              {/* Approval — submit evidence, and the approver's decision.
                  High in the panel because when a task is under review this is
                  the only thing anyone opening it wants to act on. */}
              <TaskApproval task={task} taskId={taskId} />

              {/* description */}
              <div className="mt-4">
                <div className="mb-1.5 text-sm font-medium">Description</div>
                {canEditDetails ? (
                  <Textarea
                    defaultValue={task.description ?? ""}
                    placeholder="Add a description…"
                    onBlur={(e) => e.target.value !== (task.description ?? "") && patch.mutate({ description: e.target.value })}
                  />
                ) : (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {task.description || "No description."}
                  </p>
                )}
              </div>

              {/* checklist */}
              <Section icon={CheckCircle2} title={`Checklist (${task.checklist.filter((c: any) => c.done).length}/${task.checklist.length})`}>
                {task.checklist.length > 0 && (
                  <Progress
                    value={task.checklist.length ? (task.checklist.filter((c: any) => c.done).length / task.checklist.length) * 100 : 0}
                    className="mb-2 h-1.5"
                  />
                )}
                <div className="space-y-1">
                  {task.checklist.map((item: any) => (
                    <button
                      key={item.id}
                      onClick={() => toggleChecklist.mutate({ itemId: item.id, done: !item.done })}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent/40"
                    >
                      {item.done ? <CheckCircle2 className="size-4 text-success" /> : <Circle className="size-4 text-muted-foreground" />}
                      <span className={item.done ? "text-muted-foreground line-through" : ""}>{item.text}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-1.5 flex gap-2">
                  <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Add item…"
                    onKeyDown={(e) => e.key === "Enter" && newItem && addChecklist.mutate()} className="h-8" />
                  <Button size="sm" variant="outline" onClick={() => newItem && addChecklist.mutate()}><Plus className="size-4" /></Button>
                </div>
              </Section>

              {/* subtasks */}
              {task.subtasks.length > 0 && (
                <Section icon={GitBranch} title={`Subtasks (${task.subtasks.length})`}>
                  <div className="space-y-1">
                    {task.subtasks.map((st: any) => (
                      <a key={st.id} href={`/tasks?task=${st.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent/40">
                        <span className="size-2 rounded-full" style={{ backgroundColor: TASK_STATUS_META[st.status as TaskStatus].color }} />
                        <span className="font-mono text-[11px] text-muted-foreground">{st.code}</span>
                        <span className="flex-1 truncate">{st.title}</span>
                        <AvatarGroup users={st.assignees.map((a: any) => a.user)} size={20} max={2} />
                      </a>
                    ))}
                  </div>
                </Section>
              )}

              {/* comments */}
              <Section icon={MessageSquare} title={`Comments (${task.comments.length})`}>
                <div className="space-y-3">
                  {task.comments.map((c: any) => (
                    <div key={c.id} className="flex gap-2.5">
                      <Avatar firstName={c.author.firstName} lastName={c.author.lastName} src={c.author.avatarUrl} size={30} />
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium">{fullName(c.author)}</span>
                          <span className="text-[11px] text-muted-foreground">{formatExactDateTime(c.createdAt)}</span>
                        </div>
                        <p className="text-sm text-foreground/90">{c.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <Avatar firstName={me.firstName} lastName={me.lastName} size={30} />
                  <div className="flex flex-1 gap-2">
                    <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment…"
                      onKeyDown={(e) => e.key === "Enter" && comment && addComment.mutate()} />
                    <Button size="icon" onClick={() => comment && addComment.mutate()} disabled={addComment.isPending}>
                      <Send className="size-4" />
                    </Button>
                  </div>
                </div>
              </Section>

              {/* activity */}
              <Section icon={ActivityIcon} title="Activity">
                <div className="space-y-2">
                  {/* Oldest first, so the delegation story reads top to bottom.
                      The API returns newest-first (it takes the latest 30). */}
                  {[...task.activities]
                    .sort((x: any, y: any) => +new Date(x.createdAt) - +new Date(y.createdAt))
                    .map((a: any) => (
                    <div key={a.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="size-3 shrink-0" />
                      <span className="font-medium text-foreground">{a.actor.firstName}</span>
                      {a.verb}
                      {/* Worker events carry the name, so the entry reads
                          "Salma assigned worker Youssef Tarek". */}
                      {a.meta?.workerName && (
                        <span className="font-medium text-foreground">{a.meta.workerName}</span>
                      )}
                      {a.meta?.to && <Badge color={TASK_STATUS_META[a.meta.to as TaskStatus]?.color}>{TASK_STATUS_META[a.meta.to as TaskStatus]?.label ?? a.meta.to}</Badge>}
                      <span className="ml-auto whitespace-nowrap">{formatExactDateTime(a.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

function MetaRow({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.FC<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 text-muted-foreground" /> {title}
      </div>
      {children}
    </div>
  );
}
