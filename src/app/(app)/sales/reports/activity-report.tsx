"use client";
import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Download, Printer } from "lucide-react";
import { apiGet } from "@/lib/fetcher";
import { companyToday } from "@/lib/timezone";
import { formatCompactMoney, formatMoney } from "@/lib/sales-constants";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile, SectionCard, EmptyState } from "@/components/sales/sales-bits";
import {
  PeopleStackedBar, RateDonut, MultiTrend,
  SALES_ACTIVITY_SERIES, SALES_OUTCOME_SERIES, SALES_TREND_SERIES,
} from "@/components/charts/report-charts";
import {
  DateRangeControls, PeoplePicker, presetRange, useSetParams, ymdDate,
} from "@/components/reports/report-filters";
import { SortableTable, numCol, pctCol } from "@/components/reports/sortable-table";

type Counts = {
  leadsCreated: number; leadsReceived: number; stageMoves: number;
  meetingsScheduled: number; meetingsHeld: number; meetingsNoShow: number; meetingsCancelled: number;
  briefsSubmitted: number; feedbackLogged: number;
  proposalsSent: number; proposalsAccepted: number; proposalsRejected: number;
  won: number; lost: number; revenueWon: number;
  openLeads: number; pipelineValue: number; overdueFollowUps: number; staleLeads: number;
  winRate: number | null; acceptanceRate: number | null; showRate: number | null;
};
type PersonRow = Counts & { userId: string; name: string; roleName: string };

type ActivityData = {
  range: { from: string; to: string; bucket: "day" | "week" };
  scope: "all" | "self";
  staleDays: number;
  options: { users: { id: string; name: string }[] };
  summary: Counts;
  people: PersonRow[];
  trend: { key: string; leadsCreated: number; meetingsHeld: number; proposalsSent: number; won: number }[];
};

/** "What did each salesperson do in this range?" — the sales twin of the task report. */
export function ActivityReport() {
  const params = useSearchParams();
  const setParams = useSetParams();
  const today = React.useMemo(() => companyToday(), []);

  const defaults = presetRange("this-month", today);
  const from = params.get("from") ?? defaults.from;
  const to = params.get("to") ?? defaults.to;
  const users = React.useMemo(
    () => (params.get("users") ?? "").split(",").filter(Boolean),
    [params]
  );

  const query = new URLSearchParams({ from, to });
  if (users.length) query.set("users", users.join(","));
  const qs = query.toString();

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["sales-activity-report", qs],
    queryFn: () => apiGet<ActivityData>(`/api/sales/reports/activity?${qs}`),
    placeholderData: keepPreviousData,
  });

  const selectedNames = data?.options.users.filter((u) => users.includes(u.id)).map((u) => u.name) ?? [];

  return (
    <div className="space-y-4 print:space-y-3">
      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <DateRangeControls from={from} to={to} today={today} onChange={setParams} />
        {data?.scope === "all" && (
          <PeoplePicker
            options={data.options.users}
            selected={users}
            onChange={(ids) => setParams({ users: ids.length ? ids.join(",") : null })}
          />
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
          onClick={() => { window.location.href = `/api/sales/reports/activity?${qs}&export=csv`; }}
        >
          <Download className="size-4" /> Export CSV
        </Button>
      </div>

      {/* ── Print-only header ── */}
      <div className="hidden border-b border-border pb-3 print:block">
        <h2 className="text-lg font-bold">Sales activity report</h2>
        <p className="text-sm">
          {format(ymdDate(from), "d MMM yyyy")} – {format(ymdDate(to), "d MMM yyyy")}
          {" · "}{selectedNames.length ? selectedNames.join(", ") : data?.scope === "all" ? "Whole sales team" : data?.people[0]?.name}
        </p>
        <p className="text-xs text-muted-foreground">Generated {format(new Date(), "d MMM yyyy, HH:mm")}</p>
      </div>

      {error ? (
        <EmptyState icon="TriangleAlert" title="Could not load the report" description={(error as Error).message} />
      ) : isLoading || !data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-80 rounded-xl" />
        </div>
      ) : (
        <Report data={data} stale={isFetching} selected={users} />
      )}
    </div>
  );
}

function Report({ data, stale, selected }: { data: ActivityData; stale: boolean; selected: string[] }) {
  const s = data.summary;
  // When the report is about one person, the lead lists open filtered to them.
  const onePerson = data.scope === "self" ? data.people[0]?.userId : selected.length === 1 ? selected[0] : undefined;
  const leadsHref = (filter: Record<string, string> = {}) => {
    const qs = new URLSearchParams(filter);
    if (onePerson) qs.set("owner", onePerson);
    const str = qs.toString();
    return str ? `/sales/leads?${str}` : "/sales/leads";
  };
  const trend = data.trend.map((p) => ({
    ...p,
    label: data.range.bucket === "day"
      ? format(ymdDate(p.key), "d MMM")
      : `Wk ${format(ymdDate(p.key), "d MMM")}`,
  }));

  if (!data.people.length) {
    return <EmptyState icon="Users" title="No salespeople match these filters" />;
  }

  return (
    <div className={`space-y-4 transition-opacity print:space-y-3 ${stale ? "opacity-60" : ""}`}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 print:grid-cols-6 print:break-inside-avoid">
        <StatTile label="Leads created" value={s.leadsCreated} hint={`${s.leadsReceived} received · ${s.stageMoves} stage moves`} icon="UserPlus" color="#06B6D4" href={leadsHref()} />
        <StatTile label="Meetings held" value={s.meetingsHeld} hint={`${s.meetingsScheduled} booked · ${s.meetingsNoShow} no-show`} icon="CalendarCheck" color="#8B5CF6" href="/sales/meetings?range=past&status=COMPLETED" />
        <StatTile label="Proposals sent" value={s.proposalsSent} hint={`${s.proposalsAccepted} accepted · ${s.proposalsRejected} rejected`} icon="FileBadge" color="#0EA5E9" href="/sales/proposals" />
        <StatTile label="Deals won" value={s.won} hint={`${formatCompactMoney(s.revenueWon)} revenue`} icon="Trophy" color="#22C55E" href={leadsHref({ stage: "WON" })} />
        <StatTile label="Win rate" value={s.winRate === null ? "—" : `${s.winRate}%`} hint={`${s.won}W / ${s.lost}L`} icon="Percent" color="#22C55E" href="/sales/reports?tab=pipeline" />
        <StatTile label="Overdue follow-ups" value={s.overdueFollowUps} hint={`Now · ${s.staleLeads} stale >${data.staleDays}d`} icon="AlarmClock" color="#EF4444" href={leadsHref({ followup: "due" })} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="Activity by person"
          description="Leads created, meetings held, briefs and proposals in the range."
          className="print:break-inside-avoid"
        >
          <PeopleStackedBar data={data.people} series={SALES_ACTIVITY_SERIES} />
        </SectionCard>
        <SectionCard
          title="Outcomes & follow-up health"
          description="Deals closed in the range; overdue and stale leads as of now."
          className="print:break-inside-avoid"
        >
          <PeopleStackedBar data={data.people} series={SALES_OUTCOME_SERIES} />
        </SectionCard>
        <SectionCard title="Won vs lost" description="Deals closed in the range." className="print:break-inside-avoid">
          {s.won + s.lost ? (
            <RateDonut good={{ name: "Won", value: s.won }} bad={{ name: "Lost", value: s.lost }} rate={s.winRate} caption="win rate" />
          ) : (
            <EmptyState icon="ChartPie" title="No deals closed in this range" />
          )}
        </SectionCard>
        <SectionCard
          title="Activity over time"
          description={data.range.bucket === "day" ? "Per day." : "Per week (weeks start Sunday)."}
          className="print:break-inside-avoid"
        >
          <MultiTrend data={trend} series={SALES_TREND_SERIES} />
        </SectionCard>
      </div>

      <SectionCard title="Per-salesperson breakdown" className="print:break-inside-avoid">
        <SortableTable rows={data.people} columns={COLUMNS} />
      </SectionCard>
    </div>
  );
}

const COLUMNS: ColumnDef<PersonRow>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "roleName", header: "Role" },
  numCol("leadsCreated", "Leads created"),
  numCol("leadsReceived", "Received"),
  numCol("stageMoves", "Stage moves"),
  numCol("meetingsHeld", "Meetings held"),
  numCol("meetingsNoShow", "No-shows"),
  numCol("briefsSubmitted", "Briefs"),
  numCol("feedbackLogged", "Feedback"),
  numCol("proposalsSent", "Proposals sent"),
  pctCol("acceptanceRate", "Acceptance %"),
  numCol("won", "Won"),
  numCol("lost", "Lost"),
  pctCol("winRate", "Win %"),
  {
    ...numCol<PersonRow>("revenueWon", "Revenue won"),
    cell: ({ getValue }) => formatMoney(getValue<number>()),
  },
  numCol("openLeads", "Open leads"),
  numCol("overdueFollowUps", "Overdue follow-ups"),
  numCol("staleLeads", "Stale"),
];
