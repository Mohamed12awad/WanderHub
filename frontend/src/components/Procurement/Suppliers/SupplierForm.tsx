import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createSupplier, updateSupplier, getSupplierById } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import DynamicFields from "@/components/common/DynamicFields";
import { toCustomFieldValues } from "@/utils/customFields";

export default function SupplierForm({ mode }: { mode: "add" | "edit" }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const { tr } = useLanguage();
  const { toast } = useToast();
  const s = tr.suppliers || { add: "Add Supplier", title: "Suppliers" };

  const [formData, setFormData] = useState({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    status: "active",
    taxId: "",
    address: { street: "", city: "", state: "", zip: "", country: "" },
    notes: "",
  });
  const [customFields, setCustomFields] = useState<Record<string, string>>({});

  const { data: supplierData, isPending: isFetching } = useQuery({
    queryKey: ["supplier", id],
    queryFn: () => getSupplierById(id!),
    enabled: mode === "edit" && !!id,
  });

  // v5 removed useQuery onSuccess — prefill the form from the fetched record.
  useEffect(() => {
    if (!supplierData) return;
    const d = supplierData.data;
    setFormData({
      name: d.name || "",
      contactName: d.contactName || "",
      email: d.email || "",
      phone: d.phone || "",
      status: d.status || "active",
      taxId: d.taxId || "",
      address: d.address || { street: "", city: "", state: "", zip: "", country: "" },
      notes: d.notes || "",
    });
    setCustomFields(toCustomFieldValues(d.customFields));
  }, [supplierData]);

  const mutation = useMutation({
    mutationFn: (data: any) => (mode === "add" ? createSupplier(data) : updateSupplier(id!, data)),

    onSuccess: () => {
      toast({ title: "Success", description: "Supplier saved successfully." });
      navigate("/procurement/suppliers");
    },

    onError: () => {
      toast({ title: "Error", description: "Failed to save supplier.", variant: "destructive" });
    }
  });

  const handleChange = (field: string, value: any) => {
    if (field.startsWith("address.")) {
      const addrField = field.split(".")[1];
      setFormData((p) => ({ ...p, address: { ...p.address, [addrField]: value } }));
    } else {
      setFormData((p) => ({ ...p, [field]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ ...formData, customFields });
  };

  if (isFetching) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {mode === "add" ? s.add || "Add Supplier" : "Edit Supplier"}
        </h1>
        <Button variant="outline" onClick={() => navigate("/procurement/suppliers")}>
          {tr.common.cancel}
        </Button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6 bg-card p-6 rounded-xl border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Supplier Name *</Label>
            <Input required value={formData.name} onChange={(e) => handleChange("name", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Contact Name</Label>
            <Input value={formData.contactName} onChange={(e) => handleChange("contactName", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={formData.phone} onChange={(e) => handleChange("phone", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Tax ID</Label>
            <Input value={formData.taxId} onChange={(e) => handleChange("taxId", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.status}
              onChange={(e) => handleChange("status", e.target.value)}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="pt-4 border-t">
          <h3 className="text-lg font-medium mb-4">Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Street</Label>
              <Input value={formData.address.street} onChange={(e) => handleChange("address.street", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={formData.address.city} onChange={(e) => handleChange("address.city", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>State/Province</Label>
              <Input value={formData.address.state} onChange={(e) => handleChange("address.state", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>ZIP/Postal Code</Label>
              <Input value={formData.address.zip} onChange={(e) => handleChange("address.zip", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input value={formData.address.country} onChange={(e) => handleChange("address.country", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t space-y-2">
          <Label>Notes</Label>
          <Textarea
            className="min-h-[100px]"
            value={formData.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
          />
        </div>

        <div className="pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
          <DynamicFields module="suppliers" values={customFields} onChange={(k, v) => setCustomFields((prev) => ({ ...prev, [k]: v }))} />
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : tr.common.save}
          </Button>
        </div>
      </form>
    </div>
  );
}
