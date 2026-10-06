"use client";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { CATEGORICAL, STATUS } from "@/lib/charts";

const axisStyle = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };
const gridStroke = "hsl(var(--border))";

export const INVOLVEMENT_SERIES = [
  { key: "created", name: "Created", color: CATEGORICAL[0] },
  { key: "assigned", name: "Assigned", color: CATEGORICAL[1] },
  { key: "worker", name: "Worker", color: CATEGORICAL[2] },
] as const;

export const DELIVERY_SERIES = [
  { key: "onTime", name: "On time", color: STATUS.good },
  { key: "late", name: "Late", color: STATUS.critical },
  { key: "noDeadline", name: "No deadline", color: STATUS.neutral },
  { key: "openOverdue", name: "Open overdue", color: STATUS.warning },
] as const;

function TooltipBox({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      {label && <div className="mb-1 font-medium">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ backgroundColor: p.color ?? p.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Horizontal stacked bars, one row per person.
 *
 * Horizontal so names stay readable and the chart simply grows taller as the
 * selection grows, instead of squeezing labels on a crowded x-axis.
 */
export function PeopleStackedBar<T extends { name: string }>({
  data,
  series,
}: {
  data: T[];
  series: readonly { key: string; name: string; color: string }[];
}) {
  const height = Math.max(200, data.length * 30 + 60);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid horizontal={false} stroke={gridStroke} strokeDasharray="3 3" />
        <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} width={120} />
        <Tooltip content={<TooltipBox />} cursor={{ fill: "hsl(var(--accent))" }} />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name}
            stackId="a"
            fill={s.color}
            barSize={16}
            radius={i === series.length - 1 ? [0, 4, 4, 0] : 0}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function OnTimeDonut({ onTime, late, rate }: { onTime: number; late: number; rate: number | null }) {
  const data = [
    { name: "On time", value: onTime, color: STATUS.good },
    { name: "Late", value: late, color: STATUS.critical },
  ];
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={90} paddingAngle={2} stroke="hsl(var(--card))" strokeWidth={2} isAnimationActive={false}>
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
          <Tooltip content={<TooltipBox />} />
          <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex h-[196px] flex-col items-center justify-center">
        <span className="text-2xl font-bold">{rate === null ? "—" : `${rate}%`}</span>
        <span className="text-xs text-muted-foreground">on time</span>
      </div>
    </div>
  );
}

export function DoneTrend({ data }: { data: { label: string; done: number; late: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} minTickGap={16} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
        <Tooltip content={<TooltipBox />} />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
        <Line name="Done" type="monotone" dataKey="done" stroke={CATEGORICAL[0]} strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line name="Late" type="monotone" dataKey="late" stroke={STATUS.critical} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
