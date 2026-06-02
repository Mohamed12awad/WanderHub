import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createPurchaseOrder, updatePurchaseOrder, getPurchaseOrderById, getSuppliers } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LineItemsTable, { LineItemRow } from "@/components/Finance/LineItemsTable";

const CURRENCIES = ["EGP", "USD", "EUR", "GBP", "AED", "SAR"];

export default function PurchaseOrderForm({ mode }: { mode: "add" | "edit" }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const { tr } = useLanguage();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    supplierId: "",
    status: "draft",
    currency: "EGP",
    issueDate: new Date().toISOString().split("T")[0],
    expectedDeliveryDate: "",
    notes: "",
    items: [] as LineItemRow[],
    subtotal: 0,
    taxRate: 14,
    tax: 0,
    total: 0,
  });

  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers-all"],
    queryFn: () => getSuppliers({ limit: 1000 })
  });
  const suppliers = suppliersData?.data?.data || [];

  const { data: poData, isPending: isFetching } = useQuery({
    queryKey: ["purchase-order", id],
    queryFn: () => getPurchaseOrderById(id!),
    enabled: mode === "edit" && !!id,
  });

  // v5 removed useQuery onSuccess — prefill the form from the fetched record.
  useEffect(() => {
    if (!poData) return;
    const d = poData.data;
    setFormData({
      supplierId: d.supplier?._id || "",
      status: d.status || "draft",
      currency: d.currency || "EGP",
      issueDate: d.issueDate ? new Date(d.issueDate).toISOString().split("T")[0] : "",
      expectedDeliveryDate: d.expectedDeliveryDate ? new Date(d.expectedDeliveryDate).toISOString().split("T")[0] : "",
      notes: d.notes || "",
      items: d.items || [],
      subtotal: d.subtotal || 0,
      taxRate: d.taxRate || 14,
      tax: d.tax || 0,
      total: d.total || 0,
    });
  }, [poData]);

  const mutation = useMutation({
    mutationFn: (data: any) => (mode === "add" ? createPurchaseOrder(data) : updatePurchaseOrder(id!, data)),

    onSuccess: () => {
      toast({ title: "Success", description: "Purchase Order saved successfully." });
      navigate("/procurement/purchase-orders");
    },

    onError: () => {
      toast({ title: "Error", description: "Failed to save Purchase Order.", variant: "destructive" });
    }
  });

  const handleChange = (field: string, value: any) => {
    setFormData((p) => ({ ...p, [field]: value }));
  };

  const handleItemsChange = (items: LineItemRow[]) => {
    setFormData((prev) => ({ ...prev, items }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierId) {
      toast({ title: "Validation Error", description: "Please select a supplier.", variant: "destructive" });
      return;
    }
    if (formData.items.length === 0) {
      toast({ title: "Validation Error", description: "Please add at least one item.", variant: "destructive" });
      return;
    }
    
    const subtotal = formData.items.reduce((s, it) => s + it.quantity * it.unitPrice * (1 - (it.discount ?? 0) / 100), 0);
    const tax = subtotal * (formData.taxRate / 100);
    const total = subtotal + tax;
    const payload = { ...formData, supplier: formData.supplierId, subtotal, tax, total };
    mutation.mutate(payload);
  };

  if (isFetching) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {mode === "add" ? "New Purchase Order" : "Edit Purchase Order"}
        </h1>
        <Button variant="outline" onClick={() => navigate("/procurement/purchase-orders")}>
          {tr.common.cancel}
        </Button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Supplier *</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.supplierId}
                      onChange={(e) => handleChange("supplierId", e.target.value)}
                      required
                    >
                      <option value="">Select Supplier</option>
                      {suppliers.map((sup: any) => (
                        <option key={sup._id} value={sup._id}>{sup.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.currency}
                      onChange={(e) => handleChange("currency", e.target.value)}
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Issue Date</Label>
                    <Input type="date" value={formData.issueDate} onChange={(e) => handleChange("issueDate", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Expected Delivery Date</Label>
                    <Input type="date" value={formData.expectedDeliveryDate} onChange={(e) => handleChange("expectedDeliveryDate", e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Label>Notes</Label>
                  <Textarea value={formData.notes} onChange={(e) => handleChange("notes", e.target.value)} placeholder="Terms, conditions, or shipping notes..." />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <LineItemsTable
                  items={formData.items}
                  currency={formData.currency}
                  onChange={handleItemsChange}
                />
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
              <CardHeader>
                <CardTitle className="text-lg">Status & Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.status}
                    onChange={(e) => handleChange("status", e.target.value)}
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="received">Received</option>
                    <option value="cancelled">Cancelled</option>
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
