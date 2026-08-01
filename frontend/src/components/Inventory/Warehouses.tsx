import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TableCell, TableRow } from "@/components/ui/table";
import { Pencil, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { GenericTable } from "@/components/common/GenericTable";
import { getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse, type WarehousePayload } from "@/utils/api";

interface Warehouse { _id: string; createdAt: string; name: string; code: string; isDefault: boolean; isActive: boolean }
interface FormState { name: string; code: string; isDefault: boolean; isActive: boolean }
const emptyForm = (): FormState => ({ name: "", code: "", isDefault: false, isActive: true });

const HEADERS = ["Code", "Name", "Flags"];

export default function Warehouses() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["warehouses"] });
    queryClient.invalidateQueries({ queryKey: ["warehouses-all"] });
  };

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setOpen(true); };
  const openEdit = (w: Warehouse) => { setEditing(w); setForm({ name: w.name, code: w.code, isDefault: w.isDefault, isActive: w.isActive }); setOpen(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) return;
    setSaving(true);
    try {
      const payload: WarehousePayload = { name: form.name.trim(), code: form.code.trim().toUpperCase(), isDefault: form.isDefault, isActive: form.isActive };
      if (editing) await updateWarehouse(editing._id, payload);
      else await createWarehouse(payload);
      toast({ title: editing ? "Warehouse updated." : "Warehouse created." });
      invalidate();
      setOpen(false);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: msg ?? "Failed to save warehouse", variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <>
      <GenericTable<Warehouse>
        queryKey="warehouses"
        fetchData={({ page, limit, q, filters }) => getWarehouses({ page, limit, q, ...filters })}
        deleteData={async (id) => { await deleteWarehouse(id); invalidate(); }}
        headers={HEADERS}
        title="Warehouses"
        description="Physical stock locations. Stock is held per (product, warehouse)."
        addLabel="Add Warehouse"
        onAdd={openCreate}
        quickStatusFilter={{
          field: "active",
          options: [
            { value: "true", label: "Active" },
            { value: "false", label: "Inactive" },
          ],
        }}
        emptyMessage="No warehouses yet."
        renderRow={(w, handleDelete) => (
          <TableRow key={w._id} className={w.isActive ? "" : "opacity-50"}>
            <TableCell dir="auto" className="font-mono text-xs">{w.code}</TableCell>
            <TableCell dir="auto" className="font-medium">{w.name}</TableCell>
            <TableCell className="space-x-1">
              {w.isDefault && <Badge variant="outline" className="border-0 bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">Default</Badge>}
              {!w.isActive && <Badge variant="outline">Inactive</Badge>}
            </TableCell>
            <TableCell onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Edit ${w.code} ${w.name}`} onClick={() => openEdit(w)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label={`Delete ${w.code} ${w.name}`} disabled={w.isDefault} onClick={() => handleDelete(w._id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </TableCell>
          </TableRow>
        )}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Warehouse" : "Add Warehouse"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="MAIN" disabled={!!editing} required /></div>
              <div className="space-y-2 col-span-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Main Warehouse" required /></div>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />Default warehouse</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />Active</label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
