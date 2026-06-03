import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProjectById, deleteProject, getProjectInvoices, getProjectExpenses,
  getProjectTasks, getProjectMilestones, createMilestone, updateMilestone, deleteMilestone,
  getProjectMembers, addProjectMember, removeProjectMember, getUsers,
  getNotes, getActivities, createProject,
} from "@/utils/api";
import { RecordTimeline } from "@/components/common/RecordTimeline";
import { NotesPanel } from "@/components/common/NotesPanel";
import { ActivityList } from "@/components/Activities/ActivityList";
import { AddTaskPanel } from "@/components/Tasks/AddTaskPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import {
  CircleArrowLeft, Edit, Plus, Trash2, CheckCircle2, Circle, Clock,
  Copy, MoreHorizontal, Check, PlusCircle, Pencil, CalendarDays, User,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/components/ui/use-toast";
import LoadingSpinner from "@/components/common/spinner";
import { completeTask, deleteTask } from "@/utils/api";
import { cn } from "@/lib/utils";
import { Task } from "@/types/types";

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-slate-400 text-white", active: "bg-blue-500 text-white",
  on_hold: "bg-amber-500 text-white", completed: "bg-emerald-500 text-white", cancelled: "bg-red-500 text-white",
};
const MILESTONE_ICON: Record<string, any> = { pending: Circle, in_progress: Clock, completed: CheckCircle2 };

const PRIORITY_STYLE: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-50 text-blue-700",
  high: "bg-amber-50 text-amber-700",
  urgent: "bg-red-50 text-red-700",
};

export default function ViewProject() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { tr } = useLanguage();
  const { toast } = useToast();

  const { data, isPending } = useQuery({ queryKey: ["project", id], queryFn: () => getProjectById(id!), enabled: !!id });
  const project = data?.data;

  const { data: invData }  = useQuery({ queryKey: ["project-invoices",   id], queryFn: () => getProjectInvoices(id!),  enabled: !!id });
  const { data: expData }  = useQuery({ queryKey: ["project-expenses",   id], queryFn: () => getProjectExpenses(id!),  enabled: !!id });
  const { data: taskData } = useQuery({ queryKey: ["project-tasks",      id], queryFn: () => getProjectTasks(id!),     enabled: !!id });
  const { data: msData }   = useQuery({ queryKey: ["project-milestones", id], queryFn: () => getProjectMilestones(id!), enabled: !!id });
  const { data: memData }  = useQuery({ queryKey: ["project-members",    id], queryFn: () => getProjectMembers(id!),   enabled: !!id });
  const { data: usersData } = useQuery({ queryKey: ["users-all"], queryFn: () => getUsers() });
  const { data: notesData }      = useQuery({ queryKey: ["notes", id, "Project"],  queryFn: () => getNotes({ linkedTo: id!, linkedModel: "Project" }), enabled: !!id });
  const { data: activitiesData } = useQuery({ queryKey: ["activities", id],        queryFn: () => getActivities(id!, "Project"),                      enabled: !!id });

  const notesCount      = ((notesData?.data)      as any[])?.length ?? 0;
  const activitiesCount = ((activitiesData?.data) as any[])?.length ?? 0;

  const invoices   = invData?.data  ?? [];
  const expenses   = expData?.data  ?? [];
  const tasks: Task[] = taskData?.data ?? [];
  const milestones = msData?.data   ?? [];
  const members    = memData?.data  ?? [];
  const users      = usersData?.data?.data ?? usersData?.data ?? [];

  const [newMilestone, setNewMilestone]     = useState("");
  const [newMember, setNewMember]           = useState("");
  const [editingMs, setEditingMs]           = useState<{ id: string; title: string; description?: string; dueDate?: string } | null>(null);
  const [deleteMsId, setDeleteMsId]         = useState<string | null>(null);
  const [taskPanelOpen, setTaskPanelOpen]   = useState(false);
  const [editTask, setEditTask]             = useState<Task | null>(null);

  const refresh = (key: string) => queryClient.invalidateQueries({ queryKey: [key, id] });

  const addMsMutation    = useMutation({ mutationFn: () => createMilestone(id!, { title: newMilestone }), onSuccess: () => { setNewMilestone(""); refresh("project-milestones"); } });
  const toggleMsMutation = useMutation({ mutationFn: ({ msId, status }: { msId: string; status: string }) => updateMilestone(id!, msId, { status }), onSuccess: () => refresh("project-milestones") });
  const saveMsMutation   = useMutation({
    mutationFn: (ms: { id: string; title: string; description?: string; dueDate?: string }) =>
      updateMilestone(id!, ms.id, { title: ms.title, description: ms.description || undefined, dueDate: ms.dueDate || undefined }),
    onSuccess: () => { setEditingMs(null); refresh("project-milestones"); },
  });
  const delMsMutation = useMutation({ mutationFn: (msId: string) => deleteMilestone(id!, msId), onSuccess: () => { setDeleteMsId(null); refresh("project-milestones"); } });

  const addMemberMutation    = useMutation({ mutationFn: () => addProjectMember(id!, { userId: newMember }), onSuccess: () => { setNewMember(""); refresh("project-members"); } });
  const removeMemberMutation = useMutation({ mutationFn: (userId: string) => removeProjectMember(id!, userId), onSuccess: () => refresh("project-members") });

  const completeMut = useMutation({
    mutationFn: (taskId: string) => completeTask(taskId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["project-tasks", id] }); queryClient.invalidateQueries({ queryKey: ["tasks"] }); },
  });
  const deleteTaskMut = useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["project-tasks", id] }); queryClient.invalidateQueries({ queryKey: ["tasks"] }); toast({ title: "Task deleted." }); },
  });

  const handleClone = async () => {
    if (!project) return;
    try {
      const newProject = await createProject({
        name: `Copy of ${project.name}`,
        description: project.description ?? undefined,
        status: "planning",
        priority: project.priority ?? "medium",
        budget: project.budget ?? undefined,
        currency: project.currency ?? "EGP",
        customer: project.customer?._id ?? undefined,
        manager: project.manager?._id ?? undefined,
      });
      const newId = newProject.data?._id ?? newProject.data?.id;
      if (newId && milestones.length) {
        await Promise.all(milestones.map((m: any) =>
          createMilestone(newId, { title: m.title, description: m.description, dueDate: m.dueDate })
        ));
      }
      toast({ title: `Project cloned${milestones.length ? ` with ${milestones.length} milestone(s)` : ""}.` });
      navigate(`/projects/${newId}`);
    } catch {
      toast({ title: "Clone failed", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this project?")) return;
    try { await deleteProject(id!); navigate("/projects"); }
    catch { toast({ title: "Delete failed", variant: "destructive" }); }
  };

  if (isPending) return <LoadingSpinner loading />;
  if (!project) return <div className="p-6 text-sm text-muted-foreground">Project not found.</div>;

  const fin = project.financials ?? { budget: 0, billed: 0, collected: 0, costs: 0, profit: 0, budgetUsed: 0, currency: project.currency };
  const doneMs = milestones.filter((m: any) => m.status === "completed").length;
  const doneTasks  = tasks.filter((t) => t.status === "done").length;
  const taskProgress = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;

  return (
    <main className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link to="/projects"><CircleArrowLeft /></Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              {project.name}
              <Badge variant="outline" className={`${STATUS_COLORS[project.status] ?? ""} capitalize`}>{project.status?.replace("_", " ")}</Badge>
            </h1>
            {project.customer && <p className="text-sm text-muted-foreground">{project.customer.name}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/projects/${id}/edit`}>
            <Button size="sm" variant="outline"><Edit className="h-3.5 w-3.5 me-1" />{tr.common.edit}</Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleClone}><Copy className="h-3.5 w-3.5 me-2" />Clone</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={handleDelete}><Trash2 className="h-3.5 w-3.5 me-2" />{tr.common.delete}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="overview"  className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="tasks"     className="text-xs">Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="finance"   className="text-xs">Finance</TabsTrigger>
          <TabsTrigger value="team"      className="text-xs">Team ({members.length})</TabsTrigger>
          <TabsTrigger value="timeline"  className="text-xs">Timeline</TabsTrigger>
          <TabsTrigger value="notes"     className="text-xs">Notes{notesCount > 0 && ` (${notesCount})`}</TabsTrigger>
          <TabsTrigger value="activities" className="text-xs">Activities{activitiesCount > 0 && ` (${activitiesCount})`}</TabsTrigger>
        </TabsList>

        {/* ── Overview ──────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="mt-5 space-y-5">
          <div className="grid sm:grid-cols-4 gap-4">
            {[
              { label: "Budget", value: `${(fin.budget ?? 0).toLocaleString()} ${fin.currency}` },
              { label: "Costs",  value: `${(fin.costs  ?? 0).toLocaleString()} ${fin.currency}`, color: "text-amber-600" },
              { label: "Billed", value: `${(fin.billed ?? 0).toLocaleString()} ${fin.currency}` },
              { label: "Profit", value: `${(fin.profit ?? 0).toLocaleString()} ${fin.currency}`, color: (fin.profit ?? 0) >= 0 ? "text-emerald-600" : "text-destructive" },
            ].map((s) => (
              <Card key={s.label}><CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-lg font-bold tabular-nums ${s.color ?? ""}`}>{s.value}</p>
              </CardContent></Card>
            ))}
          </div>

          {fin.budget > 0 && (
            <Card><CardContent className="pt-4">
              <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Budget used</span><span className="font-medium">{fin.budgetUsed}%</span></div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full ${fin.budgetUsed > 100 ? "bg-destructive" : "bg-primary"}`} style={{ width: `${Math.min(100, fin.budgetUsed)}%` }} />
              </div>
            </CardContent></Card>
          )}

          {/* Task progress */}
          {tasks.length > 0 && (
            <Card><CardContent className="pt-4">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Task progress</span>
                <span className="font-medium">{doneTasks}/{tasks.length} done ({taskProgress}%)</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${taskProgress}%` }} />
              </div>
            </CardContent></Card>
          )}

          {/* Milestones */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Milestones ({doneMs}/{milestones.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {milestones.map((m: any) => {
                const Icon = MILESTONE_ICON[m.status] ?? Circle;
                const nextStatus = m.status === "pending" ? "in_progress" : m.status === "in_progress" ? "completed" : "pending";
                const msTasksDone  = tasks.filter((t) => t.milestone?._id === m._id && t.status === "done").length;
                const msTotalTasks = tasks.filter((t) => t.milestone?._id === m._id).length;
                const isOverdue    = m.dueDate && m.status !== "completed" && new Date(m.dueDate) < new Date();

                if (editingMs?.id === m._id) {
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  const ms = editingMs!;
                  return (
                    <div key={m._id} className="rounded-lg border border-primary/40 px-3 py-2 space-y-2">
                      <Input
                        value={ms.title}
                        onChange={(e) => setEditingMs((prev) => prev ? { ...prev, title: e.target.value } : prev)}
                        className="h-7 text-sm"
                        autoFocus
                      />
                      <Input
                        value={ms.description ?? ""}
                        onChange={(e) => setEditingMs((prev) => prev ? { ...prev, description: e.target.value } : prev)}
                        placeholder="Description (optional)"
                        className="h-7 text-sm"
                      />
                      <Input
                        type="date"
                        value={ms.dueDate ?? ""}
                        onChange={(e) => setEditingMs((prev) => prev ? { ...prev, dueDate: e.target.value } : prev)}
                        className="h-7 text-sm"
                      />
                      <div className="flex gap-1.5">
                        <Button size="sm" className="h-6 text-xs" onClick={() => saveMsMutation.mutate(ms)} disabled={!ms.title.trim()}>Save</Button>
                        <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setEditingMs(null)}>Cancel</Button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={m._id} className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2 group">
                    <button onClick={() => toggleMsMutation.mutate({ msId: m._id, status: nextStatus })} className="shrink-0">
                      <Icon className={`h-4 w-4 ${m.status === "completed" ? "text-emerald-500" : m.status === "in_progress" ? "text-amber-500" : "text-muted-foreground"}`} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm ${m.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{m.title}</span>
                      {m.description && <p className="text-xs text-muted-foreground truncate">{m.description}</p>}
                    </div>
                    {msTotalTasks > 0 && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{msTasksDone}/{msTotalTasks}</span>
                    )}
                    {m.dueDate && (
                      <span className={`text-xs whitespace-nowrap ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                        {new Date(m.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => setEditingMs({ id: m._id, title: m.title, description: m.description ?? "", dueDate: m.dueDate ? m.dueDate.substring(0, 10) : "" })}
                        className="p-1 rounded hover:bg-muted"
                      >
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </button>
                      <button onClick={() => setDeleteMsId(m._id)} className="p-1 rounded hover:bg-muted text-destructive opacity-60 hover:opacity-100">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
              <form className="flex gap-2 pt-1" onSubmit={(e) => { e.preventDefault(); if (newMilestone.trim()) addMsMutation.mutate(); }}>
                <Input value={newMilestone} onChange={(e) => setNewMilestone(e.target.value)} placeholder="New milestone…" className="h-8" />
                <Button type="submit" size="sm" className="h-8 gap-1"><Plus className="h-3.5 w-3.5" />Add</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tasks ─────────────────────────────────────────────────────── */}
        <TabsContent value="tasks" className="mt-5 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5" onClick={() => { setEditTask(null); setTaskPanelOpen(true); }}>
              <PlusCircle className="h-3.5 w-3.5" />New Task
            </Button>
          </div>

          {tasks.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No tasks linked to this project. Add the first one above.</div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => {
                const isOverdue = task.dueDate && task.status !== "done" && task.status !== "cancelled" && new Date(task.dueDate) < new Date();
                return (
                  <div key={task._id} className={cn("group flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 hover:shadow-sm transition-all", task.status === "done" && "opacity-60")}>
                    <button
                      onClick={() => completeMut.mutate(task._id)}
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        task.status === "done" ? "border-emerald-500 bg-emerald-500" : "border-muted-foreground/40 hover:border-primary"
                      )}
                    >
                      {task.status === "done" && <Check className="h-2.5 w-2.5 text-white" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <span
                        className={cn("text-sm font-medium cursor-pointer hover:underline", task.status === "done" && "line-through text-muted-foreground")}
                        onClick={() => { setEditTask(task); setTaskPanelOpen(true); }}
                      >
                        {task.title}
                      </span>
                      {task.milestone && (
                        <span className="ms-2 text-xs text-muted-foreground">· {task.milestone.title}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {task.priority && (
                        <Badge variant="secondary" className={cn("text-xs px-1.5 py-0", PRIORITY_STYLE[task.priority] ?? "")}>
                          {task.priority}
                        </Badge>
                      )}
                      {task.dueDate && (
                        <span className={cn("text-xs flex items-center gap-0.5", isOverdue ? "text-destructive" : "text-muted-foreground")}>
                          <CalendarDays className="h-3 w-3" />
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {task.assignedTo && (
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <User className="h-3 w-3" />{task.assignedTo.name}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditTask(task); setTaskPanelOpen(true); }} className="p-1 rounded hover:bg-muted">
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </button>
                      <button onClick={() => deleteTaskMut.mutate(task._id)} className="p-1 rounded hover:bg-muted text-destructive opacity-60 hover:opacity-100">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Finance ───────────────────────────────────────────────────── */}
        <TabsContent value="finance" className="mt-5 space-y-5">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Linked Invoices</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Invoice #</TableHead><TableHead>Total</TableHead><TableHead>Paid</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {invoices.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No invoices</TableCell></TableRow>}
                  {invoices.map((inv: any) => (
                    <TableRow key={inv._id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/finance/invoices/${inv._id}`)}>
                      <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                      <TableCell className="tabular-nums">{inv.total?.toLocaleString()} {inv.currency}</TableCell>
                      <TableCell className="tabular-nums">{inv.totalPaid?.toLocaleString()}</TableCell>
                      <TableCell className="capitalize">{inv.status?.replace("_", " ")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Linked Expenses</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Report</TableHead><TableHead>Items</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {expenses.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No expenses</TableCell></TableRow>}
                  {expenses.map((ex: any) => (
                    <TableRow key={ex._id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/expenses/${ex._id}`)}>
                      <TableCell className="font-medium">{ex.title}</TableCell>
                      <TableCell className="tabular-nums">{(ex.expenses ?? []).reduce((s: number, i: any) => s + (i.amount ?? 0), 0).toLocaleString()}</TableCell>
                      <TableCell className="capitalize">{ex.approvalStatus}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Timeline ──────────────────────────────────────────────────── */}
        <TabsContent value="timeline"   className="mt-5"><RecordTimeline linkedTo={id!} linkedModel="Project" /></TabsContent>
        <TabsContent value="notes"      className="mt-5"><NotesPanel     linkedTo={id!} linkedModel="Project" /></TabsContent>
        <TabsContent value="activities" className="mt-5"><ActivityList   linkedTo={id!} linkedModel="Project" /></TabsContent>

        {/* ── Team ──────────────────────────────────────────────────────── */}
        <TabsContent value="team" className="mt-5 space-y-4">
          <Card><CardContent className="pt-4">
            <div className="flex gap-2 mb-4">
              <Select value={newMember} onValueChange={setNewMember}>
                <SelectTrigger className="max-w-xs"><SelectValue placeholder="Add team member…" /></SelectTrigger>
                <SelectContent>
                  {users.filter((u: any) => !members.some((m: any) => m.user?._id === u._id)).map((u: any) => (
                    <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" disabled={!newMember} onClick={() => addMemberMutation.mutate()}><Plus className="h-3.5 w-3.5 me-1" />Add</Button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {members.length === 0 && <p className="text-sm text-muted-foreground">No team members yet.</p>}
              {members.map((m: any) => (
                <div key={m._id} className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2">
                  <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold">
                    {m.user?.name?.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.user?.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{m.role}</p>
                  </div>
                  <button onClick={() => removeMemberMutation.mutate(m.user?._id)} className="text-destructive opacity-50 hover:opacity-100">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Milestone delete confirm */}
      <ConfirmDialog
        open={!!deleteMsId}
        title="Delete milestone?"
        description="This action cannot be undone."
        onConfirm={() => delMsMutation.mutate(deleteMsId!)}
        onCancel={() => setDeleteMsId(null)}
      />

      {/* Task panel — locked to this project */}
      <AddTaskPanel
        open={taskPanelOpen}
        onClose={() => { setTaskPanelOpen(false); setEditTask(null); }}
        task={editTask}
        projectId={id}
        projectName={project?.name}
      />
    </main>
  );
}
