"use client";
import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Download, Printer } from "lucide-react";
import { apiGet } from "@/lib/fetcher";
import { companyToday } from "@/lib/timezone";
import { useCan } from "@/components/session-context";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile, SectionCard, EmptyState } from "@/components/sales/sales-bits";
import {
  PeopleStackedBar, OnTimeDonut, DoneTrend, INVOLVEMENT_SERIES, DELIVERY_SERIES,
} from "@/components/charts/report-charts";
import {
  DateRangeControls, PeoplePicker, presetRange, useSetParams, ymdDate,
} from "@/components/reports/report-filters";
import { SortableTable, numCol, pctCol } from "@/components/reports/sortable-table";

type PersonRow = {
  userId: string; name: string; roleKey: string; roleName: string;
  created: number; assigned: number; worker: number; total: number;
  done: number; onTime: number; late: number; noDeadline: number;
  waitingApproval: number; openOverdue: number;
  onTimeRate: number | null;
};

type ReportData = {
  range: { from: string; to: string; bucket: "day" | "week" };
  scope: "all" | "team" | "self";
  options: {
    roles: { key: string; name: string }[];
    users: { id: string; name: string; roleKey: string }[];
  };
  summary: Omit<PersonRow, "userId" | "name" | "roleKey" | "roleName">;
  people: PersonRow[];
  trend: { key: string; done: number; late: number }[];
};

export function ReportsClient() {
  const params = useSearchParams();
  const setParams = useSetParams();
  const can = useCan();
  // Leaders can narrow by role and person; the API bounds it to their scope.
  const canFilter = can("Reports.View") || can("Reports.ViewTeam");
  const today = React.useMemo(() => companyToday(), []);

  const defaults = presetRange("this-month", today);
  const from = params.get("from") ?? defaults.from;
  const to = params.get("to") ?? defaults.to;
  const role = params.get("role") ?? "";
  const users = React.useMemo(
    () => (params.get("users") ?? "").split(",").filter(Boolean),
    [params]
  );
  // The URL is the single source of filter state, so a report can be shared by link.

  const query = new URLSearchParams({ from, to });
  if (canFilter && role) query.set("role", role);
  if (canFilter && users.length) query.set("users", users.join(","));
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
        <DateRangeControls from={from} to={to} today={today} onChange={setParams} />

        {canFilter && data && (
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
          {" · "}{selectedNames.length ? selectedNames.join(", ") : data?.scope === "all" ? "All people" : data?.scope === "team" ? "My team" : data?.people[0]?.name}
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 print:grid-cols-5 print:break-inside-avoid">
        <StatTile label="Total tasks" value={s.total} hint={`${s.created} created · ${s.assigned} assigned · ${s.worker} worker`} icon="ListChecks" color="#06B6D4" />
        <StatTile label="Done" value={s.done} hint={`${s.noDeadline} without deadline`} icon="CircleCheck" color="#22C55E" />
        <StatTile label="On-time rate" value={s.onTimeRate === null ? "—" : `${s.onTimeRate}%`} hint={`${s.onTime} on time · ${s.late} late`} icon="Timer" color="#8B5CF6" />
        <StatTile label="Waiting approval" value={s.waitingApproval} hint="Submitted, not yet signed off" icon="Hourglass" color="#0EA5E9" />
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
        <SortableTable rows={data.people} columns={COLUMNS} />
      </SectionCard>
    </div>
  );
}

// ── Table ──

const COLUMNS: ColumnDef<PersonRow>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "roleName", header: "Role" },
  numCol("created", "Created"),
  numCol("assigned", "Assigned"),
  numCol("worker", "Worker"),
  numCol("total", "Total"),
  numCol("done", "Done"),
  numCol("onTime", "On time"),
  numCol("late", "Late"),
  numCol("waitingApproval", "Waiting approval"),
  numCol("openOverdue", "Open overdue"),
  pctCol("onTimeRate", "On-time %"),
];
