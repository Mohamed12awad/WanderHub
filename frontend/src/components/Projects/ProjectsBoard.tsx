import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProjects, updateProject } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";
import { GenericKanban, type KanbanColumn } from "@/components/common/GenericKanban";
import { ViewToggle } from "./ViewToggle";
import { CalendarDays, User } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const COLUMN_KEYS = ["planning", "active", "on_hold", "completed", "cancelled"];
const COLUMN_COLORS: Record<string, string> = {
  planning: "#94a3b8", active: "#3b82f6", on_hold: "#f59e0b", completed: "#10b981", cancelled: "#f43f5e",
};

interface BoardProject {
  _id: string;
  name: string;
  status: string;
  customer?: { name: string } | null;
  manager?: { name: string } | null;
  budget?: number;
  currency?: string;
  endDate?: string;
}

function ProjectCard({ project }: { project: BoardProject }) {
  return (
    <div className="group bg-card border border-border/60 rounded-xl p-3 shadow-sm transition-all hover:shadow-md hover:border-border">
      <Link
        to={`/projects/${project._id}`}
        onClick={(e) => e.stopPropagation()}
        className="block text-sm font-semibold leading-snug hover:text-primary transition-colors truncate"
      >
        {project.name}
      </Link>
      {project.customer?.name && (
        <p className="text-xs text-muted-foreground truncate mt-0.5">{project.customer.name}</p>
      )}

      {(project.budget ?? 0) > 0 && (
        <p className="text-sm font-bold tabular-nums mt-2.5">
          {project.budget!.toLocaleString()} {project.currency ?? "EGP"}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 mt-2.5 pt-2.5 border-t border-border/40">
        {project.endDate ? (
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <CalendarDays className="h-3 w-3" />
            {new Date(project.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
          </span>
        ) : <span />}
        {project.manager?.name && (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground truncate" title={project.manager.name}>
            <User className="h-3 w-3 shrink-0" />
            {project.manager.name}
          </span>
        )}
      </div>
    </div>
  );
}

export function ProjectsBoard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tr } = useLanguage();
  const p = tr.projects;
  const columns = useMemo<KanbanColumn[]>(
    () => COLUMN_KEYS.map((key) => ({ key, label: p.statuses[key], color: COLUMN_COLORS[key] })),
    [p],
  );

  const { data, isPending } = useQuery({
    queryKey: ["projects-board"],
    queryFn: () => getProjects({ limit: 200 }),
  });

  const projects: BoardProject[] = useMemo(() => data?.data?.data ?? data?.data ?? [], [data]);

  const moveMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateProject(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects-board"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: () => toast({ title: p.moveFailed, variant: "destructive" }),
  });

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-start justify-between gap-4 px-6 py-4 border-b bg-card shrink-0">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight truncate">{p.title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5 truncate">{p.boardSubtitle}</p>
        </div>
        <ViewToggle active="board" />
      </div>

      <div className="flex-1 min-h-0 p-4 md:p-6">
        <GenericKanban<BoardProject>
          items={projects}
          columns={columns}
          groupBy={(proj) => proj.status}
          getId={(proj) => proj._id}
          isLoading={isPending}
          onMove={(id, status) => moveMut.mutate({ id, status })}
          renderCard={(project) => <ProjectCard project={project} />}
          emptyColumnLabel={p.noProjects}
        />
      </div>
    </div>
  );
}

export default ProjectsBoard;
