import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTasks, getProjects, deleteTask, completeTask } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { Task } from "@/types/types";
import type { ReactNode } from "react";
import { GenericTable, type FilterConfig } from "@/components/common/GenericTable";
import { AddTaskPanel } from "@/components/Tasks/AddTaskPanel";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Check, Pencil, Copy, Trash2, FolderKanban } from "lucide-react";

const STATUS_BADGE: Record<string, string> = {
  todo: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  review: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};
const PRIORITY_STYLE: Record<string, string> = {
  low: "bg-slate-100 text-slate-600", medium: "bg-blue-50 text-blue-700",
  high: "bg-amber-50 text-amber-700", urgent: "bg-red-50 text-red-700",
};

export function TasksList({ headerExtra }: { headerExtra?: ReactNode }) {
  const { tr, formatDate } = useLanguage();
  const t = tr.tasks;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [panelOpen, setPanelOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [cloneTask, setCloneTask] = useState<Task | null>(null);

  const { data: projectsData } = useQuery({ queryKey: ["projects-select"], queryFn: () => getProjects({ limit: 200 }), staleTime: 60000 });
  const projects: { _id: string; name: string }[] = projectsData?.data?.data ?? projectsData?.data ?? [];

  const refetch = () => queryClient.invalidateQueries({ queryKey: ["tasks"] });
  const openEdit = (task: Task) => { setCloneTask(null); setEditTask(task); setPanelOpen(true); };
  const openClone = (task: Task) => { setEditTask(null); setCloneTask(task); setPanelOpen(true); };
  const complete = async (id: string) => { try { await completeTask(id); refetch(); } catch { toast({ title: "Failed to update task.", variant: "destructive" }); } };

  const filterConfigs = useMemo<FilterConfig[]>(() => [
    { field: "projectId", label: "Project", type: "select", options: projects.map((p) => ({ value: p._id, label: p.name })) },
    { field: "priority", label: "Priority", type: "select", options: Object.entries(t.priorities).map(([value, label]) => ({ value, label: label as string })) },
    { field: "mine", label: "Scope", type: "select", options: [{ value: "true", label: "My tasks" }] },
    { field: "overdue", label: "Overdue", type: "select", options: [{ value: "true", label: "Overdue only" }] },
  ], [projects, t.priorities]);

  return (
    <div className="p-4 md:p-6">
      <GenericTable<Task>
        queryKey="tasks"
        headerExtra={headerExtra}
        fetchData={({ page, limit, q, filters }) => getTasks({ page, limit, q, ...filters })}
        deleteData={async (id) => { await deleteTask(id); refetch(); }}
        columns={[
          {
            id: "completion",
            header: "",
            mobileLabel: "Complete",
            kind: "actions",
            hideable: false,
            cell: (task) => (
              <button
                type="button"
                aria-label={`${task.status === "done" ? "Mark incomplete" : "Mark complete"}: ${task.title}`}
                onClick={() => complete(task._id)}
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors",
                  task.status === "done" ? "border-emerald-500 bg-emerald-500" : "border-muted-foreground/40 hover:border-primary",
                )}
              >
                {task.status === "done" && <Check className="h-2.5 w-2.5 text-white" />}
              </button>
            ),
          },
          { id: "title", header: "Task", kind: "text", hideable: false, cell: (task) => <span className={cn("font-medium max-w-xs truncate", task.status === "done" && "line-through text-muted-foreground")}>{task.title}</span> },
          { id: "status", header: "Status", kind: "status", cell: (task) => <Badge variant="outline" className={cn("border-0", STATUS_BADGE[task.status])}>{t.statuses[task.status] ?? task.status}</Badge> },
          { id: "priority", header: "Priority", kind: "status", cell: (task) => <Badge variant="secondary" className={cn("text-xs", PRIORITY_STYLE[task.priority])}>{t.priorities[task.priority]}</Badge> },
          {
            id: "project",
            header: "Project",
            kind: "text",
            cell: (task) => task.project ? (
              <Link to={`/projects/${task.project._id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary hover:underline">
                <FolderKanban className="h-3 w-3" />{task.project.name}
              </Link>
            ) : "—",
          },
          {
            id: "dueDate",
            header: "Due",
            kind: "date",
            cell: (task) => {
              const overdue = task.dueDate && task.status !== "done" && task.status !== "cancelled" && new Date(task.dueDate) < new Date();
              return <span className={cn("text-xs", overdue ? "text-destructive font-medium" : "text-muted-foreground")}>{task.dueDate ? formatDate(task.dueDate) : "—"}</span>;
            },
          },
          { id: "assignee", header: "Assignee", kind: "text", cell: (task) => <span className="text-xs text-muted-foreground">{task.assignedTo?.name ?? "—"}</span> },
        ]}
        renderActions={(task, handleDelete) => (
          <div className="flex gap-0.5">
            <button type="button" onClick={() => openEdit(task)} className="p-1 rounded hover:bg-muted" aria-label={`Edit ${task.title}`} title="Edit"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
            <button type="button" onClick={() => openClone(task)} className="p-1 rounded hover:bg-muted" aria-label={`Clone ${task.title}`} title="Clone"><Copy className="h-3.5 w-3.5 text-muted-foreground" /></button>
            <button type="button" onClick={() => handleDelete(task._id)} className="p-1 rounded hover:bg-muted hover:text-destructive" aria-label={`Delete ${task.title}`} title="Delete"><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></button>
          </div>
        )}
        title={t.title}
        description={t.description}
        addLabel={t.add}
        onAdd={() => { setEditTask(null); setCloneTask(null); setPanelOpen(true); }}
        emptyMessage={t.empty}
        quickStatusFilter={{ field: "status", options: Object.entries(t.statuses).map(([value, label]) => ({ value, label: label as string })) }}
        filterConfigs={filterConfigs}
        module="tasks"
        importConfig={{ entity: "tasks", title: "Tasks", permission: "tasks:create" }}
        exportConfig={{ entity: "tasks", filename: "tasks" }}
        bulkConfig={{
          entity: "tasks",
          statusOptions: Object.entries(t.statuses).map(([value, label]) => ({ value, label: label as string })),
        }}
      />

      <AddTaskPanel
        open={panelOpen}
        onClose={() => { setPanelOpen(false); setEditTask(null); setCloneTask(null); }}
        task={editTask}
        cloneData={cloneTask ? {
          title: `Copy of ${cloneTask.title}`, description: cloneTask.description ?? "",
          priority: cloneTask.priority, assignedTo: cloneTask.assignedTo?._id ?? "",
          project: cloneTask.project?._id ?? "", tags: cloneTask.tags ?? [],
        } : null}
      />
    </div>
  );
}

export default TasksList;
