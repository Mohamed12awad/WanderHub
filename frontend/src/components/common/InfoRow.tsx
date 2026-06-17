import { ReactNode } from "react";
import { Label } from "@/components/ui/label";

interface InfoRowProps {
  label: string;
  value?: ReactNode;
  children?: ReactNode;
}

/**
 * Single detail-view row: fixed 160px label column, value on the right.
 * The label is ALWAYS rendered; when the value is empty a muted "—" placeholder
 * is shown so the field stays visible (labels must not disappear when empty).
 *
 * Usage:
 *   <InfoRow label="Status" value={customer.status} />
 *   <InfoRow label="Address"><Badge>...</Badge></InfoRow>
 */
export function InfoRow({ label, value, children }: InfoRowProps) {
  const content = children ?? value;
  const isEmpty = content == null || content === "";

  return (
    <div className="mb-2 grid grid-cols-[160px_1fr] items-start gap-2">
      <Label className="text-sm font-medium text-foreground/60 pt-0.5">
        {label}
      </Label>
      <div className="text-sm text-foreground">
        {isEmpty ? <span className="text-muted-foreground/60">—</span> : content}
      </div>
    </div>
  );
}
