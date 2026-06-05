import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createSalesOrder, updateSalesOrder, getSalesOrderById,
  getCustomers, getDeals, getProjects,
} from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LineItemsTable, { LineItemRow, computeTotals } from "@/components/Finance/LineItemsTable";
import DynamicFields from "@/components/common/DynamicFields";
import { toCustomFieldValues } from "@/utils/customFields";

const CURRENCIES = ["EGP", "USD", "EUR", "GBP", "AED", "SAR"];

export default function SalesOrderForm({ mode }: { mode: "add" | "edit" }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const clone = mode === "add" ? (location.state as any)?.clone : undefined;
  const { tr } = useLanguage();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: clone?.title ?? "",
    customerId: clone?.customerId ?? "",
    dealId: clone?.dealId ?? "",
    projectId: clone?.projectId ?? "",
    status: "draft",
    currency: clone?.currency ?? "EGP",
    expectedDate: "",
    notes: clone?.notes ?? "",
    terms: clone?.terms ?? "",
    items: (clone?.items ?? []) as LineItemRow[],
    taxRate: clone?.taxRate ?? 14,
  });
  const [customFields, setCustomFields] = useState<Record<string, string>>({});

  const { data: customersData } = useQuery({ queryKey: ["customers-all"], queryFn: () => getCustomers({ limit: 1000 }) });
  const { data: dealsData } = useQuery({ queryKey: ["deals-all"], queryFn: () => getDeals({ limit: 1000 }) });
  const { data: projectsData } = useQuery({ queryKey: ["projects-all"], queryFn: () => getProjects({ limit: 1000 }) });
  // Customers always come back paginated ({ data: { data } }); deals/projects
  // return a bare array when no page is requested — handle both shapes.
  const asList = (res: any) => (Array.isArray(res?.data) ? res.data : res?.data?.data ?? []);
  const customers = asList(customersData);
  const deals = asList(dealsData);
  const projects = asList(projectsData);

  const { data: soData, isPending: isFetching } = useQuery({
    queryKey: ["sales-order", id],
    queryFn: () => getSalesOrderById(id!),
    enabled: mode === "edit" && !!id,
  });

  useEffect(() => {
    if (!soData) return;
    const d = soData.data;
    setFormData({
      title: d.title || "",
      customerId: d.customer?._id || "",
      dealId: d.deal?._id || "",
      projectId: d.project?._id || "",
      status: d.status || "draft",
      currency: d.currency || "EGP",
      expectedDate: d.expectedDate ? new Date(d.expectedDate).toISOString().split("T")[0] : "",
      notes: d.notes || "",
      terms: d.terms || "",
      items: d.items || [],
      taxRate: d.taxRate ?? 14,
    });
    setCustomFields(toCustomFieldValues(d.customFields));
  }, [soData]);

  const mutation = useMutation({
    mutationFn: (data: any) => (mode === "add" ? createSalesOrder(data) : updateSalesOrder(id!, data)),
    onSuccess: (res: any) => {
      toast({ title: "Sales order saved successfully." });
      navigate(`/sales-orders/${res?.data?._id ?? ""}`);
    },
    onError: (e: any) => {
      toast({ title: e?.response?.data?.message ?? "Failed to save sales order.", variant: "destructive" });
    },
  });

  const handleChange = (field: string, value: any) => setFormData((p) => ({ ...p, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast({ title: "Please enter a title.", variant: "destructive" });
      return;
    }
    if (!formData.customerId) {
      toast({ title: "Please select a customer.", variant: "destructive" });
      return;
    }
    if (formData.items.length === 0) {
      toast({ title: "Please add at least one item.", variant: "destructive" });
      return;
    }
    const { subtotal, tax, total } = computeTotals(formData.items, formData.taxRate);
    const payload = {
      title: formData.title.trim(),
      customer: formData.customerId,
      ...(formData.dealId ? { deal: formData.dealId } : {}),
      ...(formData.projectId ? { project: formData.projectId } : {}),
      status: formData.status,
      currency: formData.currency,
      ...(formData.expectedDate ? { expectedDate: formData.expectedDate } : {}),
      notes: formData.notes,
      terms: formData.terms,
      items: formData.items,
      taxRate: formData.taxRate,
      subtotal, tax, total,
      customFields,
    };
    mutation.mutate(payload);
  };

  if (mode === "edit" && isFetching) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{mode === "add" ? "New Sales Order" : "Edit Sales Order"}</h1>
        <Button variant="outline" onClick={() => navigate("/sales-orders")}>{tr.common.cancel}</Button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input value={formData.title} onChange={(e) => handleChange("title", e.target.value)} placeholder="e.g. Q3 hardware order" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Customer *</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.customerId}
                      onChange={(e) => handleChange("customerId", e.target.value)}
                      required
                    >
                      <option value="">Select Customer</option>
                      {customers.map((c: any) => (<option key={c._id} value={c._id}>{c.name}</option>))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.currency}
                      onChange={(e) => handleChange("currency", e.target.value)}
                    >
                      {CURRENCIES.map((c) => (<option key={c} value={c}>{c}</option>))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Deal</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.dealId}
                      onChange={(e) => handleChange("dealId", e.target.value)}
                    >
                      <option value="">None</option>
                      {deals.map((d: any) => (<option key={d._id} value={d._id}>{d.title}</option>))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Project</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.projectId}
                      onChange={(e) => handleChange("projectId", e.target.value)}
                    >
                      <option value="">None</option>
                      {projects.map((p: any) => (<option key={p._id} value={p._id}>{p.name}</option>))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Expected Date</Label>
                    <Input type="date" value={formData.expectedDate} onChange={(e) => handleChange("expectedDate", e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Label>Notes</Label>
                  <Textarea value={formData.notes} onChange={(e) => handleChange("notes", e.target.value)} placeholder="Order notes..." />
                </div>
                <div className="space-y-2">
                  <Label>Terms</Label>
                  <Textarea value={formData.terms} onChange={(e) => handleChange("terms", e.target.value)} placeholder="Terms & conditions..." />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DynamicFields module="salesOrders" values={customFields} onChange={(k, v) => setCustomFields((prev) => ({ ...prev, [k]: v }))} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <LineItemsTable items={formData.items} currency={formData.currency} onChange={(items) => handleChange("items", items)} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Label className="shrink-0">Tax Rate (%)</Label>
                  <input
                    type="number"
                    className="flex h-9 w-24 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={formData.taxRate}
                    onChange={(e) => handleChange("taxRate", Number(e.target.value))}
                    min={0}
                    max={100}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Status & Actions</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.status}
                    onChange={(e) => handleChange("status", e.target.value)}
                  >
                    <option value="draft">Draft</option>
                    <option value="confirmed">Confirmed</option>
                  </select>
                </div>
                <div className="pt-4 border-t">
                  <Button type="submit" className="w-full" disabled={mutation.isPending}>
                    {mutation.isPending ? "Saving..." : tr.common.save}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
