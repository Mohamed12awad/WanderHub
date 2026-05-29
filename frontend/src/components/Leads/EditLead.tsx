import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getLeadById, updateLead, getUsers } from "@/utils/api";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "react-query";
import { CircleArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

const LEAD_SOURCES = ["Website", "Referral", "Cold Call", "Email", "Social Media", "Walk-in", "Other"];

interface User { _id: string; name: string }

export function EditLead() {
  const { tr } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: leadData, isLoading: loadingLead } = useQuery(["lead", id], () => getLeadById(id!), { enabled: !!id });
  const { data: usersData } = useQuery("users", () => getUsers());

  const [formData, setFormData] = useState({
    name: "", phone: "", mobile: "", email: "", source: "", status: "new", notes: "", owner: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const lead = leadData?.data;
  const users: User[] = (usersData?.data ?? []) as User[];

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name ?? "",
        phone: lead.phone ?? "",
        mobile: lead.mobile ?? "",
        email: lead.email ?? "",
        source: lead.source ?? "",
        status: lead.status ?? "new",
        notes: lead.notes ?? "",
        owner: lead.owner?._id ?? "",
      });
    }
  }, [lead]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      await updateLead(id!, formData);
      toast({ title: "Lead updated successfully" });
      navigate(`/leads/${id}`);
    } catch (err: any) {
      toast({ title: err?.response?.data?.message ?? "Failed to update lead", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingLead) return <div className="p-6 text-muted-foreground">{tr.common.loading}</div>;
  if (!lead) return <div className="p-6 text-destructive">{tr.common.errorLoading}</div>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-4">
        <Link to={`/leads/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <CircleArrowLeft className="h-4 w-4" />
          Back to Lead
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Edit Lead</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile</Label>
                <Input id="mobile" name="mobile" value={formData.mobile} onChange={handleChange} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Source</Label>
                <Select value={formData.source} onValueChange={(v) => setFormData((p) => ({ ...p, source: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData((p) => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(tr.leads.statuses).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Owner</Label>
              <Select value={formData.owner} onValueChange={(v) => setFormData((p) => ({ ...p, owner: v }))}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} rows={3} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? tr.common.loading : tr.common.save}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(`/leads/${id}`)}>
                {tr.common.cancel}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
