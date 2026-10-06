"use client";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  useReactTable, getCoreRowModel, getSortedRowModel, flexRender,
  type ColumnDef, type SortingState,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { ArrowDown, ArrowUp, ChevronDown, Download, Printer, Search } from "lucide-react";
import { apiGet } from "@/lib/fetcher";
import { companyToday } from "@/lib/timezone";
import { useCan } from "@/components/session-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover } from "@/components/ui/popover";
import { StatTile, SectionCard, EmptyState } from "@/components/sales/sales-bits";
import {
  PeopleStackedBar, OnTimeDonut, DoneTrend, INVOLVEMENT_SERIES, DELIVERY_SERIES,
} from "@/components/charts/report-charts";

type PersonRow = {
  userId: string; name: string; roleKey: string; roleName: string;
  created: number; assigned: number; worker: number; total: number;
  done: number; onTime: number; late: number; noDeadline: number; openOverdue: number;
  onTimeRate: number | null;
};

type ReportData = {
  range: { from: string; to: string; bucket: "day" | "week" };
  canViewAll: boolean;
  options: {
    roles: { key: string; name: string }[];
    users: { id: string; name: string; roleKey: string }[];
  };
  summary: Omit<PersonRow, "userId" | "name" | "roleKey" | "roleName">;
  people: PersonRow[];
  trend: { key: string; done: number; late: number }[];
};

// ── Date presets (company calendar) ──

function shiftYmd(ymd: string, days: number) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
function ymdDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const PRESETS = ["this-week", "this-month", "last-month", "last-30", "custom"] as const;
type Preset = (typeof PRESETS)[number];
const PRESET_LABEL: Record<Preset, string> = {
  "this-week": "This week",
  "this-month": "This month",
  "last-month": "Last month",
  "last-30": "Last 30 days",
  custom: "Custom",
};

function presetRange(p: Exclude<Preset, "custom">, today: string): { from: string; to: string } {
  const monthStart = `${today.slice(0, 8)}01`;
  switch (p) {
    case "this-week": {
      const dow = new Date(`${today}T00:00:00Z`).getUTCDay();
      return { from: shiftYmd(today, -dow), to: today };
    }
    case "this-month":
      return { from: monthStart, to: today };
    case "last-month": {
      const end = shiftYmd(monthStart, -1);
      return { from: `${end.slice(0, 8)}01`, to: end };
    }
    case "last-30":
      return { from: shiftYmd(today, -29), to: today };
  }
}

function detectPreset(from: string, to: string, today: string): Preset {
  for (const p of PRESETS) {
    if (p === "custom") continue;
    const r = presetRange(p, today);
    if (r.from === from && r.to === to) return p;
  }
  return "custom";
}

export function ReportsClient() {
  const router = useRouter();
  const params = useSearchParams();
  const canViewAll = useCan()("Reports.View");
  const today = React.useMemo(() => companyToday(), []);

  const defaults = presetRange("this-month", today);
  const from = params.get("from") ?? defaults.from;
  const to = params.get("to") ?? defaults.to;
  const role = params.get("role") ?? "";
  const users = React.useMemo(
    () => (params.get("users") ?? "").split(",").filter(Boolean),
    [params]
  );
  const preset = detectPreset(from, to, today);

  // The URL is the single source of filter state, so a report can be shared by link.
  const setParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    router.replace(`?${next.toString()}`, { scroll: false });
  };

  const query = new URLSearchParams({ from, to });
  if (canViewAll && role) query.set("role", role);
  if (canViewAll && users.length) query.set("users", users.join(","));
  const qs = query.toString();

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["task-report", qs],
    queryFn: () => apiGet<ReportData>(`/api/reports/tasks?${qs}`),
    placeholderData: keepPreviousData,
  });

  const roleName = data?.options.roles.find((r) => r.key === role)?.name;
  const selectedNames = data?.options.users.filter((u) => users.includes(u.id)).map((u) => u.name) ?? [];

  return (
    <div className="space-y-4 print:space-y-3">
      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Select
          value={preset}
          onChange={(e) => {
            const p = e.target.value as Preset;
            if (p !== "custom") setParams(presetRange(p, today));
          }}
          className="w-40"
          aria-label="Date range"
        >
          {PRESETS.map((p) => <option key={p} value={p}>{PRESET_LABEL[p]}</option>)}
        </Select>
        <Input
          type="date" value={from} max={to} className="w-40" aria-label="From"
          onChange={(e) => e.target.value && setParams({ from: e.target.value })}
        />
        <span className="text-sm text-muted-foreground">→</span>
        <Input
          type="date" value={to} min={from} max={today} className="w-40" aria-label="To"
          onChange={(e) => e.target.value && setParams({ to: e.target.value })}
        />

        {canViewAll && data && (
          <>
            <Select
              value={role}
              onChange={(e) => setParams({ role: e.target.value || null, users: null })}
              className="w-48"
              aria-label="Role"
            >
              <option value="">All roles</option>
              {data.options.roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
            </Select>
            <PeoplePicker
              options={data.options.users.filter((u) => !role || u.roleKey === role)}
              selected={users}
              onChange={(ids) => setParams({ users: ids.length ? ids.join(",") : null })}
            />
          </>
        )}

        <div className="flex-1" />
        <Button variant="outline" onClick={() => window.print()} disabled={!data}>
          <Printer className="size-4" /> Export PDF
        </Button>
        <Button
          variant="outline"
          disabled={!data}
          // A plain navigation, so the browser handles the download and the
          // session cookie rides along.
          onClick={() => { window.location.href = `/api/reports/tasks?${qs}&export=csv`; }}
        >
          <Download className="size-4" /> Export CSV
        </Button>
      </div>

      {/* ── Print-only header ── */}
      <div className="hidden border-b border-border pb-3 print:block">
        <h2 className="text-lg font-bold">Task report</h2>
        <p className="text-sm">
          {format(ymdDate(from), "d MMM yyyy")} – {format(ymdDate(to), "d MMM yyyy")}
          {" · "}{roleName ?? "All roles"}
          {" · "}{selectedNames.length ? selectedNames.join(", ") : canViewAll ? "All people" : data?.people[0]?.name}
        </p>
        <p className="text-xs text-muted-foreground">Generated {format(new Date(), "d MMM yyyy, HH:mm")}</p>
      </div>

      {error ? (
        <EmptyState icon="TriangleAlert" title="Could not load the report" description={(error as Error).message} />
      ) : isLoading || !data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-80 rounded-xl" />
        </div>
      ) : (
        <Report data={data} stale={isFetching} />
      )}
    </div>
  );
}

function Report({ data, stale }: { data: ReportData; stale: boolean }) {
  const s = data.summary;
  const trend = data.trend.map((p) => ({
    ...p,
    label: data.range.bucket === "day"
      ? format(ymdDate(p.key), "d MMM")
      : `Wk ${format(ymdDate(p.key), "d MMM")}`,
  }));

  if (!data.people.length) {
    return <EmptyState icon="Users" title="No people match these filters" />;
  }

  return (
    <div className={`space-y-4 transition-opacity print:space-y-3 ${stale ? "opacity-60" : ""}`}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:break-inside-avoid">
        <StatTile label="Total tasks" value={s.total} hint={`${s.created} created · ${s.assigned} assigned · ${s.worker} worker`} icon="ListChecks" color="#06B6D4" />
        <StatTile label="Done" value={s.done} hint={`${s.noDeadline} without deadline`} icon="CircleCheck" color="#22C55E" />
        <StatTile label="On-time rate" value={s.onTimeRate === null ? "—" : `${s.onTimeRate}%`} hint={`${s.onTime} on time · ${s.late} late`} icon="Timer" color="#8B5CF6" />
        <StatTile label="Open overdue" value={s.openOverdue} hint="Past deadline, not done" icon="AlarmClock" color="#EF4444" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="Tasks by involvement"
          description="Tasks created in the range, by how each person is on them."
          className="print:break-inside-avoid"
        >
          <PeopleStackedBar data={data.people} series={INVOLVEMENT_SERIES} />
        </SectionCard>
        <SectionCard
          title="Delivery vs deadline"
          description="Tasks delivered in the range, credited to assignees and workers."
          className="print:break-inside-avoid"
        >
          <PeopleStackedBar data={data.people} series={DELIVERY_SERIES} />
        </SectionCard>
        <SectionCard title="On time vs late" description="Delivered tasks that had a deadline." className="print:break-inside-avoid">
          {s.onTime + s.late ? (
            <OnTimeDonut onTime={s.onTime} late={s.late} rate={s.onTimeRate} />
          ) : (
            <EmptyState icon="ChartPie" title="No deadlined deliveries in this range" />
          )}
        </SectionCard>
        <SectionCard
          title="Tasks done over time"
          description={data.range.bucket === "day" ? "Per day." : "Per week (weeks start Sunday)."}
          className="print:break-inside-avoid"
        >
          <DoneTrend data={trend} />
        </SectionCard>
      </div>

      <SectionCard title="Per-employee breakdown" className="print:break-inside-avoid">
        <PeopleTable rows={data.people} />
      </SectionCard>
    </div>
  );
}

// ── Table ──

const num = (key: keyof PersonRow, header: string): ColumnDef<PersonRow> => ({
  accessorKey: key,
  header,
  sortDescFirst: true,
  sortUndefined: "last",
  meta: { numeric: true },
});

const COLUMNS: ColumnDef<PersonRow>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "roleName", header: "Role" },
  num("created", "Created"),
  num("assigned", "Assigned"),
  num("worker", "Worker"),
  num("total", "Total"),
  num("done", "Done"),
  num("onTime", "On time"),
  num("late", "Late"),
  num("openOverdue", "Open overdue"),
  {
    ...num("onTimeRate", "On-time %"),
    // Nobody with no deadlined deliveries should sort above a real 0%.
    accessorFn: (r) => r.onTimeRate ?? undefined,
    cell: ({ getValue }) => {
      const v = getValue<number | undefined>();
      return v === undefined ? "—" : `${v}%`;
    },
  },
];

function PeopleTable({ rows }: { rows: PersonRow[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const table = useReactTable({
    data: rows,
    columns: COLUMNS,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b border-border text-xs text-muted-foreground">
              {hg.headers.map((h) => {
                const numeric = (h.column.columnDef.meta as { numeric?: boolean } | undefined)?.numeric;
                const dir = h.column.getIsSorted();
                return (
                  <th key={h.id} className={`whitespace-nowrap px-2 py-2 font-medium ${numeric ? "text-end" : "text-start"}`}>
                    <button
                      onClick={h.column.getToggleSortingHandler()}
                      className="inline-flex items-center gap-1 hover:text-foreground print:pointer-events-none"
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {dir === "asc" && <ArrowUp className="size-3" />}
                      {dir === "desc" && <ArrowDown className="size-3" />}
                    </button>
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b border-border/60 last:border-0">
              {row.getVisibleCells().map((cell) => {
                const numeric = (cell.column.columnDef.meta as { numeric?: boolean } | undefined)?.numeric;
                return (
                  <td key={cell.id} className={`whitespace-nowrap px-2 py-2 ${numeric ? "text-end tabular-nums" : ""}`}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── People multi-select ──

function PeoplePicker({
  options,
  selected,
  onChange,
}: {
  options: { id: string; name: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const anchorRef = React.useRef<HTMLButtonElement>(null);
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const visible = options.filter((o) => o.name.toLowerCase().includes(q.trim().toLowerCase()));
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  const label = !selected.length
    ? "All people"
    : selected.length === 1
      ? options.find((o) => o.id === selected[0])?.name ?? "1 person"
      : `${selected.length} people`;

  return (
    <>
      <Button ref={anchorRef} variant="outline" onClick={() => setOpen((o) => !o)} className="w-52 justify-between">
        <span className="truncate">{label}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </Button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={anchorRef} className="w-72 p-2">
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people…" className="ps-8" />
        </div>
        <div className="max-h-72 overflow-y-auto">
          {visible.map((o) => (
            <label key={o.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
              <input type="checkbox" checked={selected.includes(o.id)} onChange={() => toggle(o.id)} className="accent-primary" />
              <span className="truncate">{o.name}</span>
            </label>
          ))}
          {!visible.length && <div className="px-2 py-4 text-center text-sm text-muted-foreground">No matches</div>}
        </div>
        {selected.length > 0 && (
          <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => onChange([])}>
            Clear selection
          </Button>
        )}
      </Popover>
    </>
  );
}
