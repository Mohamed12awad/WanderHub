import { useMemo } from "react";
import { GenericTable } from "@/components/common/GenericTable";
import { getProjects, deleteProject } from "@/utils/api";
import { ViewToggle } from "./ViewToggle";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Project } from "@/types/types";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/authContext";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-slate-400 text-white border-slate-400",
  active: "bg-blue-500 text-white border-blue-500",
  on_hold: "bg-amber-500 text-white border-amber-500",
  completed: "bg-emerald-500 text-white border-emerald-500",
  cancelled: "bg-red-500 text-white border-red-500",
};

export function Projects() {
  const { tr, formatCurrency, formatDate } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const p = tr.projects;
  const canDelete = (user?.permissions ?? []).some((permission) => permission === "*" || permission === "projects:delete");

  // Status options reuse the shared project status labels; memoized on `tr` so
  // they re-localize on language change without reallocating each render.
  const statusOptions = useMemo(
    () => ["planning", "active", "on_hold", "completed", "cancelled"]
      .map((value) => ({ value, label: p.statuses[value] })),
    [p],
  );

  return (
    <GenericTable<Project>
      queryKey="projects"
      fetchData={({ page, limit, q, filters, sort, dir }) =>
        getProjects({ page, limit, q, ...(sort ? { sort, dir } : {}), ...(filters ?? {}) })
      }
      deleteData={deleteProject}
      columns={[
        { id: "title", header: p.headers[0], kind: "text", hideable: false, cell: (project) => <span className="font-medium">{project.title}</span> },
        { id: "customer", header: p.headers[1], kind: "text", cell: (project) => <span className="text-muted-foreground">{project.customer?.name ?? "—"}</span> },
        { id: "manager", header: p.headers[2], kind: "text", cell: (project) => <span className="text-muted-foreground">{project.manager?.name ?? "—"}</span> },
        { id: "status", header: p.headers[3], kind: "status", cell: (project) => <Badge variant="outline" className={`${STATUS_COLORS[project.status] ?? ""} capitalize`}>{p.statuses[project.status] ?? project.status.replace("_", " ")}</Badge> },
        { id: "budget", header: p.headers[4], kind: "number", cell: (project) => project.budget ? formatCurrency(project.budget, project.currency) : "—" },
        { id: "createdAt", header: p.headers[5], kind: "date", cell: (project) => <span className="text-muted-foreground text-xs">{formatDate(project.createdAt)}</span> },
      ]}
      onRowClick={(project) => navigate(`/projects/${project._id}`)}
      renderActions={(project, handleDelete) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label={tr.common.actions}><MoreHorizontal className="h-4 w-4" /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <Link to={`/projects/${project._id}`}><DropdownMenuItem>{tr.common.view ?? "View"}</DropdownMenuItem></Link>
            <Link to={`/projects/${project._id}/edit`}><DropdownMenuItem>{tr.common.edit}</DropdownMenuItem></Link>
            {canDelete && <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(project._id)}>{tr.common.delete}</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      title={p.title}
      description={p.description}
      addLink="/projects/new"
      addLabel={p.add}
      module="projects"
      importConfig={{ entity: "projects", title: "Projects", permission: "projects:create" }}
      exportConfig={{ entity: "projects", filename: "projects" }}
      topContent={<div className="flex justify-end"><ViewToggle active="list" /></div>}
      quickStatusFilter={{ field: "status", options: statusOptions }}
    />
  );
}
