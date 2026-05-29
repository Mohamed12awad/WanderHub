import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createLead, getUsers } from "@/utils/api";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "react-query";
import { CircleArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

const LEAD_SOURCES = ["Website", "Referral", "Cold Call", "Email", "Social Media", "Walk-in", "Other"];

interface User { _id: string; name: string }

const initialFormData = {
  name: "",
  phone: "",
  mobile: "",
  email: "",
  source: "",
  status: "new",
  notes: "",
  owner: "",
};

export function AddLead() {
  const { tr } = useLanguage();
  const [formData, setFormData] = useState(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const { data: usersData } = useQuery("users", () => getUsers());
  const users: User[] = (usersData?.data ?? []) as User[];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await createLead(formData);
      toast({ title: "Lead created successfully" });
      navigate("/leads");
    } catch (err: any) {
      toast({ title: err?.response?.data?.message ?? "Failed to create lead", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-4">
        <Link to="/leads" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <CircleArrowLeft className="h-4 w-4" />
          {tr.leads.title}
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{tr.leads.add}</CardTitle>
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
              <Button type="submit" disabled={isLoading}>
                {isLoading ? tr.common.loading : tr.common.save}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/leads")}>
                {tr.common.cancel}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
