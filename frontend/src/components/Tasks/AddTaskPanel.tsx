import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTask, updateTask, getUsers } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { Task, TaskFormData, TaskPriority, TaskStatus } from "@/types/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
}

const PRIORITIES: TaskPriority[] = ["low", "medium", "high", "urgent"];
const STATUSES: TaskStatus[] = ["todo", "in_progress", "review", "done", "cancelled"];

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "bg-slate-100 text-slate-700 border-slate-300",
  medium: "bg-blue-50 text-blue-700 border-blue-300",
  high: "bg-amber-50 text-amber-700 border-amber-300",
  urgent: "bg-red-50 text-red-700 border-red-300",
};

export function AddTaskPanel({ open, onClose, task }: Props) {
  const { tr } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const t = tr.tasks;
  const isEdit = !!task;

  const [form, setForm] = useState<TaskFormData>({
    title: "",
    description: "",
    priority: "medium",
    status: "todo",
    dueDate: "",
    assignedTo: "",
    tags: [],
  });
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description ?? "",
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate ? task.dueDate.substring(0, 10) : "",
        assignedTo: task.assignedTo?._id ?? "",
        tags: task.tags ?? [],
      });
    } else {
      setForm({ title: "", description: "", priority: "medium", status: "todo", dueDate: "", assignedTo: "", tags: [] });
    }
    setTagInput("");
  }, [task, open]);

  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers()
  });
  const users: { _id: string; name: string }[] = Array.isArray(usersData?.data)
    ? usersData.data
    : [];

  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    toast({ title: isEdit ? "Task updated." : "Task created." });
    onClose();
  };

  const createMut = useMutation({
    mutationFn: (data: TaskFormData) => createTask(data),
    onSuccess
  });
  const updateMut = useMutation({
    mutationFn: (data: Partial<TaskFormData>) => updateTask(task!._id, data),
    onSuccess
  });

  const saving = createMut.isPending || updateMut.isPending;

  const set = <K extends keyof TaskFormData>(k: K, v: TaskFormData[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !form.tags?.includes(tag)) {
      set("tags", [...(form.tags ?? []), tag]);
    }
    setTagInput("");
  };

  const removeTag = (tag: string) =>
    set("tags", (form.tags ?? []).filter((t) => t !== tag));

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    const payload: TaskFormData = {
      ...form,
      assignedTo: form.assignedTo || undefined,
      dueDate: form.dueDate || undefined,
    };
    if (isEdit) updateMut.mutate(payload);
    else createMut.mutate(payload);
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-full max-w-md bg-background border-l shadow-2xl flex flex-col transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-base">
            {isEdit ? "Edit Task" : t.add}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title *</Label>
            <Input
              id="task-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="task-desc">Description</Label>
            <textarea
              id="task-desc"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              placeholder="Optional details…"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Priority + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t.priority}</Label>
              <div className="flex flex-wrap gap-1.5">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    onClick={() => set("priority", p)}
                    className={cn(
                      "px-2 py-0.5 rounded border text-xs font-medium capitalize transition-all",
                      form.priority === p
                        ? PRIORITY_COLORS[p] + " ring-1 ring-offset-1 ring-current"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    {t.priorities[p]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t.status}</Label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value as TaskStatus)}
                className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{t.statuses[s]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Due date + Assigned to */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-due">{t.dueDate}</Label>
              <Input
                id="task-due"
                type="date"
                value={form.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="task-assignee">{t.assignedTo}</Label>
              <select
                id="task-assignee"
                value={form.assignedTo}
                onChange={(e) => set("assignedTo", e.target.value)}
                className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">{t.unassigned}</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label>{t.tags}</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="Add tag…"
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag}>
                Add
              </Button>
            </div>
            {(form.tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {(form.tags ?? []).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="hover:text-destructive"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-4 border-t flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>{tr.common.cancel}</Button>
          <Button
            disabled={!form.title.trim() || saving}
            onClick={handleSubmit}
          >
            {saving ? tr.common.loading : isEdit ? tr.common.save : "Create"}
          </Button>
        </div>
      </aside>
    </>
  );
}
