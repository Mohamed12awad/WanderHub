import { List, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

/** Compact in-place List/Board switch (state-based — no navigation). */
export function ViewSwitch({ active, onChange }: { active: "list" | "board"; onChange: (v: "list" | "board") => void }) {
  const cls = (on: boolean) =>
    cn("p-1.5 rounded transition-colors", on ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground");
  return (
    <div className="flex items-center gap-1 rounded-lg border bg-muted/50 p-0.5 h-8">
      <button type="button" onClick={() => onChange("list")} className={cls(active === "list")} title="List view"><List className="h-3.5 w-3.5" /></button>
      <button type="button" onClick={() => onChange("board")} className={cls(active === "board")} title="Board view"><LayoutGrid className="h-3.5 w-3.5" /></button>
    </div>
  );
}
