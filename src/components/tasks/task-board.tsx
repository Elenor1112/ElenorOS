"use client";
import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutGrid, List as ListIcon, Table2, Calendar as CalendarIcon,
  Plus, Search, SlidersHorizontal, ChevronDown,
} from "lucide-react";
import { apiGet } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover } from "@/components/ui/popover";
import { useCan } from "@/components/session-context";
import { KanbanView } from "./kanban-view";
import { ListView } from "./list-view";
import { TableView } from "./table-view";
import { CalendarView } from "./calendar-view";
import { TaskDetail } from "./task-detail";
import { CreateTaskDialog } from "./create-task-dialog";
import { DatePicker } from "@/components/ui/deadline-picker";
import { PRIORITY_META } from "@/lib/constants";
import type { TaskListItem } from "./task-bits";
import type { TaskStatus } from "@prisma/client";

type DateField = "deadline" | "created" | "started" | "waiting" | "editing" | "hold" | "approved";
const DATE_FIELDS: { key: DateField; label: string }[] = [
  { key: "deadline", label: "Deadline" },
  { key: "created", label: "Created" },
  { key: "started", label: "Started" },
  { key: "waiting", label: "Waiting Approval" },
  { key: "editing", label: "Editing" },
  { key: "hold", label: "Hold" },
  { key: "approved", label: "Approved" },
];
// The board column each field corresponds to. Deadline and Created are dates
// every task can have, so they have no column of their own.
const STATUS_FOR_FIELD: Partial<Record<DateField, TaskStatus>> = {
  started: "IN_PROGRESS",
  waiting: "WAITING_APPROVAL",
  editing: "EDITING",
  hold: "HOLD",
  approved: "DONE",
};

type View = "kanban" | "list" | "table" | "calendar";
const VIEWS: { key: View; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: "kanban", label: "Board", icon: LayoutGrid },
  { key: "list", label: "List", icon: ListIcon },
  { key: "table", label: "Table", icon: Table2 },
  { key: "calendar", label: "Calendar", icon: CalendarIcon },
];

export function TaskBoard({
  scope,
  fixedProjectId,
  title,
  /**
   * Let the parent own the detail panel instead of rendering our own.
   *
   * Two boards on one page (see TasksWorkspace) both read `?task=` and would
   * each mount a TaskDetail portal, stacking two identical drawers. The page
   * hoists a single panel and opts both boards out.
   */
  renderDetail = true,
}: {
  scope?: "mine" | "all";
  fixedProjectId?: string;
  title?: string;
  renderDetail?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const can = useCan();

  const [view, setView] = React.useState<View>("kanban");
  const [q, setQ] = React.useState("");
  const [priority, setPriority] = React.useState("");
  const [client, setClient] = React.useState("");
  // Empty means "Any Status"; several are OR-ed on the server.
  const [dateFields, setDateFields] = React.useState<DateField[]>([]);
  const toggleDateField = (key: DateField) =>
    setDateFields((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
  const dateAnchorRef = React.useRef<HTMLButtonElement>(null);
  const [dateOpen, setDateOpen] = React.useState(false);
  const dateFieldLabel = !dateFields.length
    ? "Any Status"
    : dateFields.length === 1
      ? DATE_FIELDS.find((f) => f.key === dateFields[0])?.label
      : `${dateFields.length} statuses`;
  // Board columns for the picked statuses move to the front, so they are on
  // screen without scrolling the strip.
  const leadingStatuses = dateFields.flatMap((f) => (STATUS_FOR_FIELD[f] ? [STATUS_FOR_FIELD[f]] : []));
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);

  // Client list for the filter. Shares the task-meta cache the create dialog
  // already populates, so this adds no extra request in the common case.
  const { data: meta } = useQuery({
    queryKey: ["task-meta"],
    queryFn: () => apiGet<{ clients: { id: string; company: string }[] }>("/api/tasks/meta"),
    staleTime: 5 * 60_000,
  });

  const openTaskId = params.get("task");
  const setOpenTask = (id: string | null) => {
    const sp = new URLSearchParams(params.toString());
    if (id) sp.set("task", id);
    else sp.delete("task");
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  };

  const qp = new URLSearchParams();
  if (q) qp.set("q", q);
  if (priority) qp.set("priority", priority);
  if (client) qp.set("client", client);
  // Sent even without dates: on its own the selection filters by status.
  dateFields.forEach((f) => qp.append("dateField", f));
  if (from) qp.set("from", from);
  if (to) qp.set("to", to);
  if (scope === "mine") qp.set("mine", "1");
  if (fixedProjectId) qp.set("project", fixedProjectId);

  const queryKey = [
    "tasks", scope ?? "all", fixedProjectId ?? "", q, priority, client,
    dateFields.join(","), from, to,
  ];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => apiGet<{ tasks: TaskListItem[] }>(`/api/tasks?${qp.toString()}`),
    // Tasks assigned by someone else should show up without a reload. The
    // notification bell also invalidates ["tasks"] the moment a new
    // notification lands; this poll is the fallback when none is sent.
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const tasks = data?.tasks ?? [];

  return (
    <div>
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-lg border border-border p-0.5">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                view === v.key ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <v.icon className="size-4" />
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>

        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks…" className="pl-9" />
        </div>

        <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-36">
          <option value="">Any priority</option>
          {Object.entries(PRIORITY_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
        </Select>
        {/* Filtering by client hits Task.clientId directly — the denormalized
            copy exists precisely so this needs no join through Project.
            Hidden on a project board, where the client is already fixed. */}
        {!fixedProjectId && (
          <Select value={client} onChange={(e) => setClient(e.target.value)} className="w-40">
            <option value="">Any client</option>
            {meta?.clients?.map((c) => (
              <option key={c.id} value={c.id}>{c.company}</option>
            ))}
          </Select>
        )}

        {/* Date range. "Any Status" matches a task when any of the dates below
            falls inside the range; picking several matches any of them. The
            To day is inclusive. */}
        <Button
          ref={dateAnchorRef}
          variant="outline"
          onClick={() => setDateOpen((o) => !o)}
          className="w-44 justify-between"
          aria-label="Filter date by"
        >
          <span className="truncate">{dateFieldLabel}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </Button>
        <Popover open={dateOpen} onClose={() => setDateOpen(false)} anchorRef={dateAnchorRef} className="w-56 p-2">
          {DATE_FIELDS.map((f) => (
            <label key={f.key} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
              <input type="checkbox" checked={dateFields.includes(f.key)} onChange={() => toggleDateField(f.key)} className="accent-primary" />
              <span className="truncate">{f.label}</span>
            </label>
          ))}
          {dateFields.length > 0 && (
            <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => setDateFields([])}>
              Any Status
            </Button>
          )}
        </Popover>
        <DatePicker value={from} onChange={setFrom} placeholder="From" ariaLabel="From date" />
        <DatePicker value={to} onChange={setTo} placeholder="To" ariaLabel="To date" />

        {can("Task.Create") && (
          <Button onClick={() => setCreateOpen(true)}><Plus className="size-4" /> New task</Button>
        )}
      </div>

      {/* body */}
      <div className="mt-4">
        {isLoading ? (
          <div className="flex gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-96 w-72 rounded-xl" />)}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
            <SlidersHorizontal className="size-9 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">No tasks match your filters.</p>
            {can("Task.Create") && (
              <Button className="mt-3" size="sm" onClick={() => setCreateOpen(true)}><Plus className="size-4" /> Create the first task</Button>
            )}
          </div>
        ) : (
          <>
            {view === "kanban" && <KanbanView tasks={tasks} onOpen={setOpenTask} queryKey={queryKey} leadingStatuses={leadingStatuses} />}
            {view === "list" && <ListView tasks={tasks} onOpen={setOpenTask} />}
            {view === "table" && <TableView tasks={tasks} onOpen={setOpenTask} />}
            {view === "calendar" && <CalendarView tasks={tasks} onOpen={setOpenTask} />}
          </>
        )}
      </div>

      {renderDetail && <TaskDetail taskId={openTaskId} onClose={() => setOpenTask(null)} />}
      <CreateTaskDialog open={createOpen} onClose={() => setCreateOpen(false)} defaultProjectId={fixedProjectId} />
    </div>
  );
}
