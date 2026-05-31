import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import {
  getProjectById, deleteProject, getProjectInvoices, getProjectExpenses,
  getProjectTasks, getProjectMilestones, createMilestone, updateMilestone, deleteMilestone,
  getProjectMembers, addProjectMember, removeProjectMember, getUsers,
  getNotes, getActivities,
} from "@/utils/api";
import { RecordTimeline } from "@/components/common/RecordTimeline";
import { NotesPanel } from "@/components/common/NotesPanel";
import { ActivityList } from "@/components/Activities/ActivityList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CircleArrowLeft, Edit, Plus, Trash2, CheckCircle2, Circle, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/components/ui/use-toast";
import LoadingSpinner from "@/components/common/spinner";

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-slate-400 text-white", active: "bg-blue-500 text-white",
  on_hold: "bg-amber-500 text-white", completed: "bg-emerald-500 text-white", cancelled: "bg-red-500 text-white",
};
const MILESTONE_ICON: Record<string, any> = { pending: Circle, in_progress: Clock, completed: CheckCircle2 };

export default function ViewProject() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { tr } = useLanguage();
  const { toast } = useToast();

  const { data, isLoading } = useQuery(["project", id], () => getProjectById(id!), { enabled: !!id });
  const project = data?.data;

  const { data: invData } = useQuery(["project-invoices", id], () => getProjectInvoices(id!), { enabled: !!id });
  const { data: expData } = useQuery(["project-expenses", id], () => getProjectExpenses(id!), { enabled: !!id });
  const { data: taskData } = useQuery(["project-tasks", id], () => getProjectTasks(id!), { enabled: !!id });
  const { data: msData } = useQuery(["project-milestones", id], () => getProjectMilestones(id!), { enabled: !!id });
  const { data: memData } = useQuery(["project-members", id], () => getProjectMembers(id!), { enabled: !!id });
  const { data: usersData } = useQuery("users-all", () => getUsers());
  const { data: notesData }      = useQuery(["notes", id, "Project"],      () => getNotes({ linkedTo: id!, linkedModel: "Project" }),      { enabled: !!id });
  const { data: activitiesData } = useQuery(["activities", id],             () => getActivities(id!, "Project"),                           { enabled: !!id });
  const notesCount      = ((notesData?.data)      as any[])?.length ?? 0;
  const activitiesCount = ((activitiesData?.data) as any[])?.length ?? 0;

  const invoices = invData?.data ?? [];
  const expenses = expData?.data ?? [];
  const tasks = taskData?.data ?? [];
  const milestones = msData?.data ?? [];
  const members = memData?.data ?? [];
  const users = usersData?.data?.data ?? usersData?.data ?? [];

  const [newMilestone, setNewMilestone] = useState("");
  const [newMember, setNewMember] = useState("");

  const refresh = (key: string) => queryClient.invalidateQueries([key, id]);

  const addMsMutation = useMutation(() => createMilestone(id!, { title: newMilestone }), {
    onSuccess: () => { setNewMilestone(""); refresh("project-milestones"); },
  });
  const toggleMsMutation = useMutation(
    ({ msId, status }: { msId: string; status: string }) => updateMilestone(id!, msId, { status }),
    { onSuccess: () => refresh("project-milestones") }
  );
  const delMsMutation = useMutation((msId: string) => deleteMilestone(id!, msId), { onSuccess: () => refresh("project-milestones") });
  const addMemberMutation = useMutation(() => addProjectMember(id!, { userId: newMember }), {
    onSuccess: () => { setNewMember(""); refresh("project-members"); },
  });
  const removeMemberMutation = useMutation((userId: string) => removeProjectMember(id!, userId), { onSuccess: () => refresh("project-members") });

  const handleDelete = async () => {
    if (!confirm("Delete this project?")) return;
    try { await deleteProject(id!); navigate("/projects"); }
    catch { toast({ title: "Delete failed", variant: "destructive" }); }
  };

  if (isLoading) return <LoadingSpinner loading />;
  if (!project) return <div className="p-6 text-sm text-muted-foreground">Project not found.</div>;

  const fin = project.financials ?? { budget: 0, billed: 0, collected: 0, costs: 0, profit: 0, budgetUsed: 0, currency: project.currency };
  const doneMs = milestones.filter((m: any) => m.status === "completed").length;

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
          <Link to={`/projects/${id}/edit`}><Button size="sm" variant="outline"><Edit className="h-3.5 w-3.5 me-1" />{tr.common.edit}</Button></Link>
          <Button size="sm" variant="outline" className="text-destructive" onClick={handleDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs">Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="finance" className="text-xs">Finance</TabsTrigger>
          <TabsTrigger value="team" className="text-xs">Team ({members.length})</TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs">Timeline</TabsTrigger>
          <TabsTrigger value="notes" className="text-xs">Notes{notesCount > 0 && ` (${notesCount})`}</TabsTrigger>
          <TabsTrigger value="activities" className="text-xs">Activities{activitiesCount > 0 && ` (${activitiesCount})`}</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-5 space-y-5">
          <div className="grid sm:grid-cols-4 gap-4">
            {[
              { label: "Budget", value: `${(fin.budget ?? 0).toLocaleString()} ${fin.currency}` },
              { label: "Costs", value: `${(fin.costs ?? 0).toLocaleString()} ${fin.currency}`, color: "text-amber-600" },
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

          {/* Milestones */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Milestones ({doneMs}/{milestones.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {milestones.map((m: any) => {
                const Icon = MILESTONE_ICON[m.status] ?? Circle;
                const nextStatus = m.status === "pending" ? "in_progress" : m.status === "in_progress" ? "completed" : "pending";
                return (
                  <div key={m._id} className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2">
                    <button onClick={() => toggleMsMutation.mutate({ msId: m._id, status: nextStatus })} className="shrink-0">
                      <Icon className={`h-4 w-4 ${m.status === "completed" ? "text-emerald-500" : m.status === "in_progress" ? "text-amber-500" : "text-muted-foreground"}`} />
                    </button>
                    <span className={`text-sm flex-1 ${m.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{m.title}</span>
                    {m.dueDate && <span className="text-xs text-muted-foreground">{new Date(m.dueDate).toLocaleDateString()}</span>}
                    <button onClick={() => delMsMutation.mutate(m._id)} className="text-destructive opacity-50 hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
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

        {/* Tasks */}
        <TabsContent value="tasks" className="mt-5">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Task</TableHead><TableHead>Status</TableHead><TableHead>Assigned</TableHead><TableHead>Due</TableHead></TableRow></TableHeader>
              <TableBody>
                {tasks.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No tasks linked to this project</TableCell></TableRow>}
                {tasks.map((t: any) => (
                  <TableRow key={t._id}>
                    <TableCell>{t.title}</TableCell>
                    <TableCell className="capitalize">{t.status?.replace("_", " ")}</TableCell>
                    <TableCell className="text-muted-foreground">{t.assignedTo?.name ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* Finance */}
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

        {/* Timeline */}
        <TabsContent value="timeline" className="mt-5">
          <RecordTimeline linkedTo={id!} linkedModel="Project" />
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes" className="mt-5">
          <NotesPanel linkedTo={id!} linkedModel="Project" />
        </TabsContent>

        {/* Activities */}
        <TabsContent value="activities" className="mt-5">
          <ActivityList linkedTo={id!} linkedModel="Project" />
        </TabsContent>

        {/* Team */}
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
                  <button onClick={() => removeMemberMutation.mutate(m.user?._id)} className="text-destructive opacity-50 hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
