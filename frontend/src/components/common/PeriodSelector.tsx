import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type PeriodPreset = "week" | "month" | "quarter" | "custom";

export interface PeriodValue {
  preset: PeriodPreset;
  /** Resolved range; always present (computed for presets, user-set for custom). */
  startDate: string;
  endDate: string;
}

const PRESETS: { key: PeriodPreset; label: string }[] = [
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "quarter", label: "Quarter" },
  { key: "custom", label: "Custom" },
];

const iso = (d: Date) => d.toISOString().split("T")[0];

/** Resolve a preset to a concrete [start, end] range (end = today). */
export function resolveRange(preset: Exclude<PeriodPreset, "custom">): { startDate: string; endDate: string } {
  const now = new Date();
  const end = iso(now);
  if (preset === "week") {
    const s = new Date(now);
    s.setDate(now.getDate() - 7);
    return { startDate: iso(s), endDate: end };
  }
  if (preset === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    return { startDate: iso(new Date(now.getFullYear(), q * 3, 1)), endDate: end };
  }
  return { startDate: iso(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: end };
}

export function defaultPeriod(preset: Exclude<PeriodPreset, "custom"> = "month"): PeriodValue {
  return { preset, ...resolveRange(preset) };
}

/**
 * Segmented Week/Month/Quarter/Custom control. Presets resolve to a concrete
 * date range; Custom reveals two date inputs applied on demand. Shared by the
 * Dashboard and the Reports filter bar.
 */
export function PeriodSelector({
  value,
  onChange,
}: {
  value: PeriodValue;
  onChange: (v: PeriodValue) => void;
}) {
  const [draft, setDraft] = useState({ startDate: value.startDate, endDate: value.endDate });

  const pick = (preset: PeriodPreset) => {
    if (preset === "custom") {
      setDraft({ startDate: value.startDate, endDate: value.endDate });
      onChange({ preset, startDate: value.startDate, endDate: value.endDate });
    } else {
      onChange({ preset, ...resolveRange(preset) });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg border bg-muted/50 p-0.5">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => pick(p.key)}
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
              value.preset === p.key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {value.preset === "custom" && (
        <div className="flex items-end gap-2">
          <Input
            type="date"
            aria-label="From"
            className="h-8 text-sm w-36"
            value={draft.startDate}
            onChange={(e) => setDraft((d) => ({ ...d, startDate: e.target.value }))}
          />
          <Input
            type="date"
            aria-label="To"
            className="h-8 text-sm w-36"
            value={draft.endDate}
            onChange={(e) => setDraft((d) => ({ ...d, endDate: e.target.value }))}
          />
          <Button
            size="sm"
            className="h-8"
            onClick={() => onChange({ preset: "custom", startDate: draft.startDate, endDate: draft.endDate })}
          >
            Apply
          </Button>
        </div>
      )}
    </div>
  );
}
