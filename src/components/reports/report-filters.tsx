"use client";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Popover } from "@/components/ui/popover";

/**
 * Filter controls shared by the per-person reports (tasks, sales activity).
 * Filter state lives in the URL so any report can be shared by link.
 */

// ── Date presets (company calendar) ──

export function shiftYmd(ymd: string, days: number) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
export function ymdDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const PRESETS = ["this-week", "this-month", "last-month", "last-30", "custom"] as const;
export type Preset = (typeof PRESETS)[number];
const PRESET_LABEL: Record<Preset, string> = {
  "this-week": "This week",
  "this-month": "This month",
  "last-month": "Last month",
  "last-30": "Last 30 days",
  custom: "Custom",
};

export function presetRange(p: Exclude<Preset, "custom">, today: string): { from: string; to: string } {
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

export function detectPreset(from: string, to: string, today: string): Preset {
  for (const p of PRESETS) {
    if (p === "custom") continue;
    const r = presetRange(p, today);
    if (r.from === from && r.to === to) return p;
  }
  return "custom";
}

/** Patch the query string in place; null/empty removes a key. */
export function useSetParams() {
  const router = useRouter();
  const params = useSearchParams();
  return (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    router.replace(`?${next.toString()}`, { scroll: false });
  };
}

/** Preset select plus from/to inputs. */
export function DateRangeControls({
  from,
  to,
  today,
  onChange,
}: {
  from: string;
  to: string;
  today: string;
  onChange: (patch: { from?: string; to?: string }) => void;
}) {
  const preset = detectPreset(from, to, today);
  return (
    <>
      <Select
        value={preset}
        onChange={(e) => {
          const p = e.target.value as Preset;
          if (p !== "custom") onChange(presetRange(p, today));
        }}
        className="w-40"
        aria-label="Date range"
      >
        {PRESETS.map((p) => <option key={p} value={p}>{PRESET_LABEL[p]}</option>)}
      </Select>
      <Input
        type="date" value={from} max={to} className="w-40" aria-label="From"
        onChange={(e) => e.target.value && onChange({ from: e.target.value })}
      />
      <span className="text-sm text-muted-foreground">→</span>
      <Input
        type="date" value={to} min={from} max={today} className="w-40" aria-label="To"
        onChange={(e) => e.target.value && onChange({ to: e.target.value })}
      />
    </>
  );
}

// ── People multi-select ──

export function PeoplePicker({
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
