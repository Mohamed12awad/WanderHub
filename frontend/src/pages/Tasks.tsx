import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTasks, deleteTask, completeTask } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { Task, TaskPriority, TaskStatus } from "@/types/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { AddTaskPanel } from "@/components/Tasks/AddTaskPanel";
import {
  PlusCircle, List, LayoutGrid, Check,
  Pencil, Trash2, CalendarDays, User, Copy,
} from "lucide-react";

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  medium: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  high: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  urgent: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const STATUS_COLS: { key: TaskStatus; color: string }[] = [
  { key: "todo",        color: "border-t-slate-400" },
  { key: "in_progress", color: "border-t-blue-400" },
  { key: "review",      color: "border-t-amber-400" },
  { key: "done",        color: "border-t-emerald-500" },
  { key: "cancelled",   color: "border-t-rose-400" },
];

function TaskCard({
  task,
  onEdit,
  onDelete,
  onComplete,
  onClone,
  priorities,
}: {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  onComplete: () => void;
  onClone: () => void;
  statuses: Record<string, string>;
  priorities: Record<string, string>;
}) {
  const isOverdue =
    task.dueDate &&
    task.status !== "done" &&
    task.status !== "cancelled" &&
    new Date(task.dueDate) < new Date();

  return (
    <div
      className={cn(
        "group rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-all",
        task.status === "done" && "opacity-60"
      )}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={onComplete}
          className={cn(
            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            task.status === "done"
              ? "border-emerald-500 bg-emerald-500"
              : "border-muted-foreground/40 hover:border-primary"
          )}
        >
          {task.status === "done" && <Check className="h-2.5 w-2.5 text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm font-medium leading-snug",
              task.status === "done" && "line-through text-muted-foreground"
            )}
          >
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {task.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <Badge variant="secondary" className={cn("text-xs px-1.5 py-0", PRIORITY_STYLE[task.priority])}>
              {priorities[task.priority]}
            </Badge>

            {task.dueDate && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs",
                  isOverdue ? "text-destructive font-medium" : "text-muted-foreground"
                )}
              >
                <CalendarDays className="h-3 w-3" />
                {new Date(task.dueDate).toLocaleDateString()}
              </span>
            )}

            {task.assignedTo && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                {task.assignedTo.name}
              </span>
            )}

            {(task.tags ?? []).map((tag) => (
              <span
                key={tag}
                className="inline-flex px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={onEdit} className="p-1 rounded hover:bg-muted transition-colors" title="Edit">
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </button>
          <button onClick={onClone} className="p-1 rounded hover:bg-muted transition-colors" title="Clone">
            <Copy className="h-3 w-3 text-muted-foreground" />
          </button>
          <button onClick={onDelete} className="p-1 rounded hover:bg-muted hover:text-destructive transition-colors" title="Delete">
            <Trash2 className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}

type FilterKey = "all" | "mine" | "overdue";

export function Tasks() {
  const { tr } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const t = tr.tasks;

  const [view, setView] = useState<"list" | "board">("list");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [cloneTask, setCloneTask] = useState<Task | null>(null);

  const params: Record<string, string> = {};
  if (filter === "mine") params.mine = "true";
  if (filter === "overdue") params.overdue = "true";

  const { data, isPending } = useQuery({
    queryKey: ["tasks", filter],
    queryFn: () => getTasks(params)
  });
  const tasks: Task[] = data?.data?.data ?? [];

  const filtered = tasks.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTask(id),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Task deleted." });
    },

    onError: () => { toast({ title: "Failed to delete task.", variant: "destructive" }); }
  });

  const completeMut = useMutation({
    mutationFn: (id: string) => completeTask(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    onError: () => { toast({ title: "Failed to update task.", variant: "destructive" }); }
  });

  const openEdit = (task: Task) => {
    setCloneTask(null);
    setEditTask(task);
    setPanelOpen(true);
  };

  const openClone = (task: Task) => {
    setEditTask(null);
    setCloneTask(task);
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setEditTask(null);
    setCloneTask(null);
  };

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: "all", label: t.allTasks },
    { key: "mine", label: t.myTasks },
    { key: "overdue", label: t.overdue },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{t.title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t.description}</p>
        </div>
        <Button size="sm" className="gap-1.5 shrink-0" onClick={() => setPanelOpen(true)}>
          <PlusCircle className="h-3.5 w-3.5" />
          {t.add}
        </Button>
      </div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Filter tabs */}
        <div className="flex items-center rounded-lg border bg-muted/50 p-0.5 gap-0.5">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                filter === key
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <Input
          placeholder={tr.common.search + "…"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-48 text-sm"
        />

        <div className="ml-auto flex items-center gap-1 rounded-lg border bg-muted/50 p-0.5">
          <button
            onClick={() => setView("list")}
            className={cn(
              "p-1.5 rounded transition-colors",
              view === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
            )}
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setView("board")}
            className={cn(
              "p-1.5 rounded transition-colors",
              view === "board" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {/* Content */}
      {isPending ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground text-sm">
            {search ? t.noSearch(search) : t.empty}
          </p>
        </div>
      ) : view === "list" ? (
        <ListView
          tasks={filtered}
          onEdit={openEdit}
          onClone={openClone}
          onDelete={(id) => deleteMut.mutate(id)}
          onComplete={(id) => completeMut.mutate(id)}
          statuses={t.statuses}
          priorities={t.priorities}
        />
      ) : (
        <BoardView
          tasks={filtered}
          onEdit={openEdit}
          onClone={openClone}
          onDelete={(id) => deleteMut.mutate(id)}
          onComplete={(id) => completeMut.mutate(id)}
          statuses={t.statuses}
          priorities={t.priorities}
        />
      )}
      <AddTaskPanel
        open={panelOpen}
        onClose={closePanel}
        task={editTask}
        cloneData={cloneTask ? {
          title: `Copy of ${cloneTask.title}`,
          description: cloneTask.description ?? "",
          priority: cloneTask.priority,
          assignedTo: cloneTask.assignedTo?._id ?? "",
          tags: cloneTask.tags ?? [],
        } : null}
      />
    </div>
  );
}

function ListView({
  tasks, onEdit, onClone, onDelete, onComplete, statuses, priorities,
}: {
  tasks: Task[];
  onEdit: (t: Task) => void;
  onClone: (t: Task) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  statuses: Record<string, string>;
  priorities: Record<string, string>;
}) {
  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <TaskCard
          key={task._id}
          task={task}
          onEdit={() => onEdit(task)}
          onClone={() => onClone(task)}
          onDelete={() => onDelete(task._id)}
          onComplete={() => onComplete(task._id)}
          statuses={statuses}
          priorities={priorities}
        />
      ))}
    </div>
  );
}

function BoardView({
  tasks, onEdit, onClone, onDelete, onComplete, statuses, priorities,
}: {
  tasks: Task[];
  onEdit: (t: Task) => void;
  onClone: (t: Task) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  statuses: Record<string, string>;
  priorities: Record<string, string>;
}) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {STATUS_COLS.map(({ key, color }) => {
        const col = tasks.filter((t) => t.status === key);
        return (
          <div
            key={key}
            className={cn(
              "flex-shrink-0 w-64 rounded-xl border border-t-4 bg-muted/30",
              color
            )}
          >
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wide">
                {statuses[key]}
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                {col.length}
              </span>
            </div>
            <div className="px-2 pb-2 space-y-2 min-h-[80px]">
              {col.map((task) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  onEdit={() => onEdit(task)}
                  onClone={() => onClone(task)}
                  onDelete={() => onDelete(task._id)}
                  onComplete={() => onComplete(task._id)}
                  statuses={statuses}
                  priorities={priorities}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
