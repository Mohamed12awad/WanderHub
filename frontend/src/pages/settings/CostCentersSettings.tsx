import React, { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { AsyncSearchableSelect } from "@/components/common/combobox";
import { GenericTable } from "@/components/common/GenericTable";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import {
  createCostCenter,
  deleteCostCenter,
  getCostCenters,
  updateCostCenter,
  type CostCenterPayload,
} from "@/utils/api";
import type { CostCenter } from "@/types/types";

interface FormState {
  code: string;
  name: string;
  parentId: string;
  parentLabel: string;
  isActive: string;
}

const emptyForm = (): FormState => ({
  code: "",
  name: "",
  parentId: "",
  parentLabel: "",
  isActive: "true",
});

const HEADERS = ["Code", "Name", "Parent", "Status"];

export default function CostCentersSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CostCenter | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["cost-centers"] });

  const fetchParentCostCenters = useCallback(
    (q: string) =>
      getCostCenters({ q, isActive: true }).then((r) => [
        { value: "", label: "None" },
        ...(r.data ?? [])
          .filter((cc) => cc._id !== editing?._id)
          .map((cc) => ({ value: cc._id, label: `${cc.code} — ${cc.name}` })),
      ]),
    [editing?._id],
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (costCenter: CostCenter) => {
    setEditing(costCenter);
    setForm({
      code: costCenter.code,
      name: costCenter.name,
      parentId: costCenter.parent?._id ?? "",
      parentLabel: costCenter.parent ? `${costCenter.parent.code} — ${costCenter.parent.name}` : "None",
      isActive: costCenter.isActive === false ? "false" : "true",
    });
    setOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) return;
    setSaving(true);
    try {
      const payload: CostCenterPayload = {
        code: form.code.trim(),
        name: form.name.trim(),
        parentId: form.parentId || null,
        isActive: form.isActive === "true",
      };
      if (editing) await updateCostCenter(editing._id, payload);
      else await createCostCenter(payload);
      toast({ title: editing ? "Cost center updated." : "Cost center created." });
      invalidate();
      setOpen(false);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: msg ?? "Failed to save cost center", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <GenericTable<CostCenter>
        queryKey="cost-centers"
        fetchData={({ q }) => getCostCenters({ q })}
        deleteData={async (id) => {
          await deleteCostCenter(id);
          invalidate();
        }}
        headers={HEADERS}
        title="Cost Centers"
        description="Manage analytic cost centers used on invoices, vendor bills, expense reports, and GL lines."
        addLabel="Add Cost Center"
        onAdd={openCreate}
        emptyMessage="No cost centers yet."
        quickStatusFilter={{
          field: "isActive",
          options: [
            { value: "true", label: "Active" },
            { value: "false", label: "Inactive" },
          ],
        }}
        renderRow={(costCenter, handleDelete) => (
          <TableRow key={costCenter._id}>
            <TableCell className="font-mono text-xs font-medium">{costCenter.code}</TableCell>
            <TableCell dir="auto" className="font-medium">{costCenter.name}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {costCenter.parent ? `${costCenter.parent.code} — ${costCenter.parent.name}` : "—"}
            </TableCell>
            <TableCell>
              <Badge variant={costCenter.isActive === false ? "outline" : "default"}>
                {costCenter.isActive === false ? "Inactive" : "Active"}
              </Badge>
            </TableCell>
            <TableCell onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Edit ${costCenter.name}`} onClick={() => openEdit(costCenter)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label={`Delete ${costCenter.name}`} onClick={() => handleDelete(costCenter._id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        )}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Cost Center" : "Add Cost Center"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="mt-2 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="CC-100"
                  required
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Operations"
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Parent</Label>
                <AsyncSearchableSelect
                  value={form.parentId}
                  onChange={(parentId) => setForm({ ...form, parentId })}
                  fetchFn={fetchParentCostCenters}
                  selectedLabel={form.parentLabel}
                  placeholder="None"
                  searchPlaceholder="Search cost centers..."
                  onSelectItem={(item) => setForm((prev) => ({ ...prev, parentLabel: item.label }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.isActive} onValueChange={(isActive) => setForm({ ...form, isActive })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
