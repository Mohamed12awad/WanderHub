import { Link } from "react-router-dom";
import { List, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

/** Generic List/Board switch. Reusable across any module that has both views. */
export function ViewToggle({
  active, listPath, boardPath,
}: { active: "list" | "board"; listPath: string; boardPath: string }) {
  const cls = (on: boolean) =>
    cn("p-1.5 rounded transition-colors", on ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground");
  return (
    <div className="flex items-center gap-1 rounded-lg border bg-muted/50 p-0.5">
      <Link to={listPath} className={cls(active === "list")} title="List view"><List className="h-3.5 w-3.5" /></Link>
      <Link to={boardPath} className={cls(active === "board")} title="Board view"><LayoutGrid className="h-3.5 w-3.5" /></Link>
    </div>
  );
}
