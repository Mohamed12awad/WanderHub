import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTaxRates } from "@/utils/api";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TaxRate {
  _id: string;
  name: string;
  rate: number;
  isDefault?: boolean;
}

const CUSTOM = "__custom__";

/**
 * Tax-rate picker sourced from the configured rates at /settings/tax-rates.
 * Selecting a rate emits its numeric percentage; "Custom…" reveals a number
 * input for one-off values. The value/onChange contract is a plain number so it
 * drops straight into existing `taxRate` form state.
 */
export function TaxRateSelect({
  value,
  onChange,
  disabled,
  className,
  compact,
}: {
  value: number;
  onChange: (rate: number) => void;
  disabled?: boolean;
  className?: string;
  /** Tighter sizing for use inside a table cell. */
  compact?: boolean;
}) {
  const { data } = useQuery({ queryKey: ["tax-rates"], queryFn: getTaxRates, staleTime: 60_000 });
  const rates: TaxRate[] = data?.data ?? [];

  const getId = (r: TaxRate) => (r as any)._id ?? (r as any).id ?? "";
  const matched = rates.find((r) => r.rate === value);
  const [customMode, setCustomMode] = useState(false);
  // Treat as custom when explicitly chosen, or when the current value doesn't
  // match any configured rate (e.g. a legacy bill saved with an ad-hoc rate).
  const isCustom = customMode || (rates.length > 0 && !matched);
  const selectValue = !isCustom && matched ? (getId(matched) || CUSTOM) : CUSTOM;

  const h = compact ? "h-8" : "h-9";

  return (
    <div className={cn("flex gap-1.5", className)}>
      <Select
        value={selectValue}
        disabled={disabled}
        onValueChange={(v) => {
          if (v === CUSTOM) { setCustomMode(true); return; }
          const r = rates.find((x) => getId(x) === v);
          if (r) { setCustomMode(false); onChange(r.rate); }
        }}
      >
        <SelectTrigger className={cn(h, compact && "min-w-[7rem]")}>
          <SelectValue placeholder="Tax" />
        </SelectTrigger>
        <SelectContent>
          {rates.map((r) => (
            <SelectItem key={getId(r)} value={getId(r)}>
              {r.name} ({r.rate}%)
            </SelectItem>
          ))}
          <SelectItem value={CUSTOM}>Custom…</SelectItem>
        </SelectContent>
      </Select>
      {isCustom && (
        <Input
          type="number"
          min={0}
          max={100}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className={cn(h, "w-16 text-right")}
        />
      )}
    </div>
  );
}
