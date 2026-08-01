import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { GenericTable } from "@/components/common/GenericTable";
import { getProductCategories, createProductCategory, updateProductCategory, deleteProductCategory } from "@/utils/api";

interface Category { _id: string; createdAt: string; name: string; code?: string | null; costMethod?: string | null; _count?: { products: number } }
interface FormState { name: string; code: string; costMethod: string }
const emptyForm = (): FormState => ({ name: "", code: "", costMethod: "" });
const METHOD_LABEL: Record<string, string> = { weighted_average: "Weighted Avg", fifo: "FIFO" };

export default function ProductCategoriesSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["product-categories"] });
  };

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setOpen(true); };
  const openEdit = (c: Category) => { setEditing(c); setForm({ name: c.name, code: c.code ?? "", costMethod: c.costMethod ?? "" }); setOpen(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), code: form.code.trim() || null, costMethod: form.costMethod || null };
      if (editing) await updateProductCategory(editing._id, payload);
      else await createProductCategory(payload);
      toast({ title: editing ? "Category updated." : "Category created." });
      invalidate();
      setOpen(false);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: msg ?? "Failed to save category", variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div className="p-4 md:p-6">
      <GenericTable<Category>
        queryKey="product-categories"
        fetchData={({ page, limit, q, filters }) => getProductCategories({ page, limit, q, ...filters })}
        deleteData={async (id) => { await deleteProductCategory(id); invalidate(); }}
        columns={[
          { id: "name", header: "Name", kind: "text", hideable: false, cell: (category) => <span className="font-medium">{category.name}{category.code && <span className="ms-2 font-mono text-xs text-muted-foreground">{category.code}</span>}</span> },
          { id: "costMethod", header: "Cost method", kind: "status", cell: (category) => category.costMethod ? <Badge variant="outline">{METHOD_LABEL[category.costMethod] ?? category.costMethod}</Badge> : <span className="text-xs text-muted-foreground">Org default</span> },
          { id: "productCount", header: "Products", kind: "number", cell: (category) => <span className="text-sm text-muted-foreground">{category._count?.products ?? 0}</span> },
        ]}
        renderActions={(category, handleDelete) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Edit ${category.name}`} onClick={() => openEdit(category)}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label={`Delete ${category.name}`} onClick={() => handleDelete(category._id)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        )}
        title="Product Categories"
        description="Group products and set their inventory cost method (overrides the org default)."
        addLabel="Add Category"
        onAdd={openCreate}
        quickStatusFilter={{
          field: "costMethod",
          options: [
            { value: "weighted_average", label: "Weighted Avg" },
            { value: "fifo", label: "FIFO" },
          ],
        }}
        emptyMessage="No categories yet."
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Category" : "Add Category"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2 col-span-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="optional" /></div>
            </div>
            <div className="space-y-2">
              <Label>Cost method</Label>
              <Select value={form.costMethod || "default"} onValueChange={(x) => setForm({ ...form, costMethod: x === "default" ? "" : x })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Inherit org default</SelectItem>
                  <SelectItem value="weighted_average">Weighted Average</SelectItem>
                  <SelectItem value="fifo">FIFO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
