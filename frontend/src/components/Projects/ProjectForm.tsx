import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createProject, updateProject, getProjectById, getCustomers, getDeals, getUsers,
} from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CURRENCIES = ["EGP", "USD", "EUR", "GBP", "AED", "SAR"];

export default function ProjectForm({ mode }: { mode: "add" | "edit" }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { tr } = useLanguage();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "", description: "", status: "planning", priority: "medium",
    budget: "", currency: "EGP", startDate: "", endDate: "",
    customer: "", deal: searchParams.get("deal") ?? "", manager: "",
  });

  const { data: customersData } = useQuery({
    queryKey: ["customers-all"],
    queryFn: () => getCustomers()
  });
  const customers = customersData?.data?.data ?? customersData?.data ?? [];
  const { data: dealsData } = useQuery({
    queryKey: ["deals-all"],
    queryFn: () => getDeals()
  });
  const deals = dealsData?.data?.data ?? dealsData?.data ?? [];
  const { data: usersData } = useQuery({
    queryKey: ["users-all"],
    queryFn: () => getUsers()
  });
  const users = usersData?.data?.data ?? usersData?.data ?? [];

  const { data } = useQuery({
    queryKey: ["project", id],
    queryFn: () => getProjectById(id!),
    enabled: mode === "edit" && !!id
  });
  useEffect(() => {
    if (data?.data) {
      const p = data.data;
      setForm({
        name: p.name ?? "", description: p.description ?? "", status: p.status ?? "planning",
        priority: p.priority ?? "medium", budget: p.budget?.toString() ?? "", currency: p.currency ?? "EGP",
        startDate: p.startDate ? p.startDate.split("T")[0] : "", endDate: p.endDate ? p.endDate.split("T")[0] : "",
        customer: p.customer?._id ?? "", deal: p.deal?._id ?? "", manager: p.manager?._id ?? "",
      });
    }
  }, [data]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        name: form.name, description: form.description, status: form.status, priority: form.priority,
        currency: form.currency,
        budget: form.budget ? Number(form.budget) : undefined,
        startDate: form.startDate || undefined, endDate: form.endDate || undefined,
        customer: form.customer || undefined, deal: form.deal || undefined, manager: form.manager || undefined,
      };
      return mode === "edit" ? updateProject(id!, payload) : createProject(payload);
    },

    onSuccess: () => { toast({ title: mode === "edit" ? "Project updated" : "Project created" }); navigate("/projects"); },
    onError: (e: any) => { toast({ title: e?.response?.data?.message ?? "Failed to save", variant: "destructive" }); }
  });

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <Card>
        <CardHeader><CardTitle>{mode === "edit" ? ((tr as any).projects?.edit ?? "Edit Project") : ((tr as any).projects?.add ?? "New Project")}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </div>
            <div className="grid gap-1.5">
              <Label>Description</Label>
              <textarea className="border rounded-md p-2 text-sm min-h-[70px] bg-background" value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="grid gap-1.5">
                <Label>Status</Label>
                <select className="border rounded-md h-10 px-3 text-sm bg-background" value={form.status} onChange={(e) => set("status", e.target.value)}>
                  <option value="planning">Planning</option><option value="active">Active</option><option value="on_hold">On Hold</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Priority</Label>
                <select className="border rounded-md h-10 px-3 text-sm bg-background" value={form.priority} onChange={(e) => set("priority", e.target.value)}>
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Manager</Label>
                <select className="border rounded-md h-10 px-3 text-sm bg-background" value={form.manager} onChange={(e) => set("manager", e.target.value)}>
                  <option value="">Unassigned</option>
                  {users.map((u: any) => <option key={u._id} value={u._id}>{u.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>Customer</Label>
                <select className="border rounded-md h-10 px-3 text-sm bg-background" value={form.customer} onChange={(e) => set("customer", e.target.value)}>
                  <option value="">None</option>
                  {customers.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Linked Deal</Label>
                <select className="border rounded-md h-10 px-3 text-sm bg-background" value={form.deal} onChange={(e) => set("deal", e.target.value)}>
                  <option value="">None</option>
                  {deals.map((d: any) => <option key={d._id} value={d._id}>{d.title}</option>)}
                </select>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="grid gap-1.5">
                <Label>Budget</Label>
                <Input type="number" value={form.budget} onChange={(e) => set("budget", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Currency</Label>
                <select className="border rounded-md h-10 px-3 text-sm bg-background" value={form.currency} onChange={(e) => set("currency", e.target.value)}>
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>End Date</Label>
                <Input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate("/projects")}>{tr.common.cancel}</Button>
              <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? tr.common.loading : tr.common.save}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
