import { Link } from "react-router-dom";
import { List, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

/** List/Board switch shared by the Projects list and Kanban board. */
export function ViewToggle({ active }: { active: "list" | "board" }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border bg-muted/50 p-0.5">
      <Link
        to="/projects"
        className={cn("p-1.5 rounded transition-colors", active === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
        title="List view"
      >
        <List className="h-3.5 w-3.5" />
      </Link>
      <Link
        to="/projects/board"
        className={cn("p-1.5 rounded transition-colors", active === "board" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
        title="Board view"
      >
        <LayoutGrid className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
