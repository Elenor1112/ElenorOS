"use client";
import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { Download, FileText, Printer, Send } from "lucide-react";
import { apiGet, apiSend } from "@/lib/fetcher";
import { companyToday } from "@/lib/timezone";
import { useCan } from "@/components/session-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";
import { StatTile, SectionCard, EmptyState } from "@/components/sales/sales-bits";
import {
  DateRangeControls, PeoplePicker, presetRange, useSetParams, ymdDate,
} from "@/components/reports/report-filters";

type DailyReport = { id: string; reportDate: string; body: string; createdAt: string };
type PersonReports = {
  userId: string; name: string; firstName: string; lastName: string;
  roleName: string; avatarUrl: string | null; days: number; reports: DailyReport[];
};
type DailyData = {
  range: { from: string; to: string };
  scope: "all" | "self";
  options: { users: { id: string; name: string }[] };
  total: number;
  people: PersonReports[];
};

/**
 * Daily reports tab: every salesperson writes up their day; managers generate a
 * per-person roll-up of what was submitted over a day, week, month or custom range.
 */
export function DailyReports() {
  const can = useCan();
  const isManager = can("Sales.ViewTeam") || can("Sales.ViewAll");

  return (
    <div className="space-y-4 print:space-y-3">
      <SubmitReport />
      {isManager ? <TeamReport /> : <MyReports />}
    </div>
  );
}

function SubmitReport() {
  const qc = useQueryClient();
  const today = React.useMemo(() => companyToday(), []);
  const [reportDate, setReportDate] = React.useState(today);
  const [body, setBody] = React.useState("");

  const submit = useMutation({
    mutationFn: () => apiSend("/api/sales/daily-reports", "POST", { body, reportDate }),
    onSuccess: () => {
      toast.success("Daily report submitted");
      setBody("");
      setReportDate(today);
      qc.invalidateQueries({ queryKey: ["sales-daily-reports"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <SectionCard
      title="Submit your daily report"
      description="What you worked on today — calls, meetings, follow-ups, blockers."
      className="print:hidden"
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (body.trim()) submit.mutate();
        }}
      >
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          maxLength={10_000}
          placeholder="Today I…"
          aria-label="Daily report"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={reportDate}
            max={today}
            className="w-40"
            aria-label="Report date"
            onChange={(e) => e.target.value && setReportDate(e.target.value)}
          />
          <div className="flex-1" />
          <Button type="submit" disabled={!body.trim() || submit.isPending}>
            <Send className="size-4" /> {submit.isPending ? "Submitting…" : "Submit report"}
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}

/** A member's own history, shown straight away for the chosen range. */
function MyReports() {
  const today = React.useMemo(() => companyToday(), []);
  const [range, setRange] = React.useState(() => presetRange("this-week", today));
  const qs = new URLSearchParams(range).toString();

  const { data, isLoading, error } = useQuery({
    queryKey: ["sales-daily-reports", qs],
    queryFn: () => apiGet<DailyData>(`/api/sales/daily-reports?${qs}`),
    placeholderData: keepPreviousData,
  });

  return (
    <SectionCard
      title="My submitted reports"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeControls
            from={range.from} to={range.to} today={today}
            onChange={(patch) => setRange((r) => ({ ...r, ...patch }))}
          />
        </div>
      }
    >
      {error ? (
        <EmptyState icon="TriangleAlert" title="Could not load your reports" description={(error as Error).message} />
      ) : isLoading || !data ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : data.people[0]?.reports.length ? (
        <ReportList reports={data.people[0].reports} />
      ) : (
        <EmptyState icon="FileText" title="No reports in this range" />
      )}
    </SectionCard>
  );
}

/**
 * Manager view. Filters are drafted locally and only applied — and written to the
 * URL, so the generated report can be shared by link — when "Generate report" is
 * pressed.
 */
function TeamReport() {
  const params = useSearchParams();
  const setParams = useSetParams();
  const today = React.useMemo(() => companyToday(), []);

  const applied = params.get("daily") === "1"
    ? {
        from: params.get("from") ?? today,
        to: params.get("to") ?? today,
        users: (params.get("users") ?? "").split(",").filter(Boolean),
      }
    : null;

  const [draft, setDraft] = React.useState(() => ({
    ...(applied ?? presetRange("today", today)),
    users: applied?.users ?? [],
  }));

  const query = applied ? new URLSearchParams({ from: applied.from, to: applied.to }) : null;
  if (query && applied?.users.length) query.set("users", applied.users.join(","));
  const qs = query?.toString() ?? "";

  // Loaded once up front for the people picker, before anything is generated.
  const { data: roster } = useQuery({
    queryKey: ["sales-daily-reports", "roster", today],
    queryFn: () => apiGet<DailyData>(`/api/sales/daily-reports?from=${today}&to=${today}`),
    enabled: !applied,
  });

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["sales-daily-reports", qs],
    queryFn: () => apiGet<DailyData>(`/api/sales/daily-reports?${qs}`),
    enabled: Boolean(applied),
    placeholderData: keepPreviousData,
  });

  const options = (data ?? roster)?.options.users ?? [];
  const generate = () =>
    setParams({
      daily: "1",
      from: draft.from,
      to: draft.to,
      users: draft.users.length ? draft.users.join(",") : null,
    });
  const selectedNames = options.filter((u) => applied?.users.includes(u.id)).map((u) => u.name);

  return (
    <div className="space-y-4 print:space-y-3">
      <SectionCard
        title="Generate team report"
        description="Pick a day, week, month or custom range, and the people to include."
        className="print:hidden"
      >
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeControls
            from={draft.from} to={draft.to} today={today}
            onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
          />
          <PeoplePicker
            options={options}
            selected={draft.users}
            onChange={(ids) => setDraft((d) => ({ ...d, users: ids }))}
          />
          <div className="flex-1" />
          <Button onClick={generate}>
            <FileText className="size-4" /> Generate report
          </Button>
        </div>
      </SectionCard>

      {applied && (
        <>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <p className="text-sm text-muted-foreground">
              {format(ymdDate(applied.from), "d MMM yyyy")} – {format(ymdDate(applied.to), "d MMM yyyy")}
              {" · "}{selectedNames.length ? selectedNames.join(", ") : "Whole sales team"}
            </p>
            <div className="flex-1" />
            <Button variant="outline" onClick={() => window.print()} disabled={!data}>
              <Printer className="size-4" /> Export PDF
            </Button>
            <Button
              variant="outline"
              disabled={!data}
              // A plain navigation, so the browser handles the download and the
              // session cookie rides along.
              onClick={() => { window.location.href = `/api/sales/daily-reports?${qs}&export=csv`; }}
            >
              <Download className="size-4" /> Export CSV
            </Button>
          </div>

          {/* ── Print-only header ── */}
          <div className="hidden border-b border-border pb-3 print:block">
            <h2 className="text-lg font-bold">Sales daily reports</h2>
            <p className="text-sm">
              {format(ymdDate(applied.from), "d MMM yyyy")} – {format(ymdDate(applied.to), "d MMM yyyy")}
              {" · "}{selectedNames.length ? selectedNames.join(", ") : "Whole sales team"}
            </p>
            <p className="text-xs text-muted-foreground">Generated {format(new Date(), "d MMM yyyy, HH:mm")}</p>
          </div>

          {error ? (
            <EmptyState icon="TriangleAlert" title="Could not generate the report" description={(error as Error).message} />
          ) : isLoading || !data ? (
            <Skeleton className="h-80 rounded-xl" />
          ) : (
            <div className={`space-y-4 transition-opacity print:space-y-3 ${isFetching ? "opacity-60" : ""}`}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 print:grid-cols-3">
                <StatTile label="Reports submitted" value={data.total} icon="FileText" color="#06B6D4" />
                <StatTile label="People reporting" value={data.people.length} icon="Users" color="#8B5CF6" />
                <StatTile
                  label="Not reporting"
                  value={Math.max(0, (applied.users.length || data.options.users.length) - data.people.length)}
                  hint="No report in this range"
                  icon="UserX"
                  color="#EF4444"
                />
              </div>
              {data.people.length ? (
                data.people.map((p) => (
                  <SectionCard
                    key={p.userId}
                    title={p.name}
                    description={`${p.roleName} · ${p.reports.length} report${p.reports.length === 1 ? "" : "s"} over ${p.days} day${p.days === 1 ? "" : "s"}`}
                    action={<Avatar firstName={p.firstName} lastName={p.lastName} src={p.avatarUrl} size={34} />}
                    className="print:break-inside-avoid"
                  >
                    <ReportList reports={p.reports} />
                  </SectionCard>
                ))
              ) : (
                <EmptyState icon="FileText" title="No daily reports submitted in this range" />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ReportList({ reports }: { reports: DailyReport[] }) {
  return (
    <ul className="divide-y divide-border">
      {reports.map((r) => (
        <li key={r.id} className="py-3 first:pt-0 last:pb-0">
          <div className="mb-1 flex items-baseline gap-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{format(ymdDate(r.reportDate), "EEE, d MMM yyyy")}</span>
            <span>Submitted {format(new Date(r.createdAt), "d MMM, HH:mm")}</span>
          </div>
          <p className="whitespace-pre-wrap break-words text-sm">{r.body}</p>
        </li>
      ))}
    </ul>
  );
}
