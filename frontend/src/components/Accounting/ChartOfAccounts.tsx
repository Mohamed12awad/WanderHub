import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TableCell, TableRow } from "@/components/ui/table";
import { Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { GenericTable } from "@/components/common/GenericTable";
import { queryKeys } from "@/lib/queryKeys";
import {
  getChartOfAccounts, createChartOfAccount, updateChartOfAccount, deleteChartOfAccount,
  type ChartAccountPayload,
} from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";

const ACCOUNT_TYPES = ["asset", "liability", "equity", "income", "expense"] as const;
type AccountType = (typeof ACCOUNT_TYPES)[number];

const TYPE_BADGE: Record<AccountType, string> = {
  asset: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  liability: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  equity: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
  income: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  expense: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};

interface CoaRow {
  _id: string;
  createdAt: string;
  code: string;
  name: string;
  type: AccountType;
  normalBalance: "debit" | "credit";
  parentId: string | null;
  currency: string;
  isActive: boolean;
  cashAccount?: { _id: string; name: string } | null;
}

interface FormState { code: string; name: string; type: AccountType; parentId: string; currency: string; isActive: boolean }
const emptyForm = (): FormState => ({ code: "", name: "", type: "asset", parentId: "", currency: "EGP", isActive: true });

export default function ChartOfAccounts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { tr } = useLanguage();
  const a = tr.accounting;
  const headers = useMemo(
    () => [a.headers.code, a.headers.name, a.headers.type, a.headers.normal, a.headers.currency, a.headers.linkedCash],
    [a],
  );
  const typeOptions = useMemo(
    () => ACCOUNT_TYPES.map((value) => ({ value, label: a.accountTypes[value] })),
    [a],
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CoaRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  // Full list (unpaginated) for the parent-account picker.
  const { data: allData } = useQuery({ queryKey: queryKeys.accounting.chartOfAccounts, queryFn: () => getChartOfAccounts(), staleTime: 60000 });
  const allAccounts: CoaRow[] = allData?.data ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["coa"] });
    queryClient.invalidateQueries({ queryKey: queryKeys.accounting.chartOfAccounts });
  };

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setDialogOpen(true); };
  const openEdit = (a: CoaRow) => {
    setEditing(a);
    setForm({ code: a.code, name: a.name, type: a.type, parentId: a.parentId ?? "", currency: a.currency, isActive: a.isActive });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) return;
    setSaving(true);
    const payload: Partial<ChartAccountPayload> = {
      name: form.name.trim(), type: form.type, parentId: form.parentId || null,
      currency: form.currency.trim() || "EGP", isActive: form.isActive,
    };
    try {
      if (editing) { await updateChartOfAccount(editing._id, payload); toast({ title: a.accountUpdated }); }
      else { await createChartOfAccount({ ...payload, code: form.code.trim() } as ChartAccountPayload); toast({ title: a.accountCreated }); }
      invalidate();
      setDialogOpen(false);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: msg ?? a.accountSaveFailed, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <>
      <GenericTable<CoaRow>
        queryKey="coa"
        fetchData={({ page, limit, q, filters }) => getChartOfAccounts({ page, limit, q, ...filters })}
        deleteData={async (id) => { await deleteChartOfAccount(id); invalidate(); }}
        headers={headers}
        title={a.chartOfAccounts}
        description={a.chartDescription}
        addLabel={a.addAccount}
        onAdd={openCreate}
        quickStatusFilter={{ field: "type", options: typeOptions }}
        emptyMessage={a.noAccounts}
        importConfig={{ entity: "chart-of-accounts", title: a.chartOfAccounts }}
        exportConfig={{ entity: "chart-of-accounts", filename: "chart-of-accounts" }}
        renderRow={(row, handleDelete) => (
          <TableRow
            key={row._id}
            className={`cursor-pointer hover:bg-muted/40 ${row.isActive ? "" : "opacity-50"}`}
            onClick={() => navigate(`/accounting/chart-of-accounts/${row._id}`)}
            title={a.viewAccountLedger}
          >
            <TableCell className="font-mono text-xs">{row.code}</TableCell>
            <TableCell className={row.parentId ? "ps-6" : "font-semibold"}>
              {row.name}{!row.isActive && <span className="ms-2 text-[10px] text-muted-foreground">({a.statuses.inactive})</span>}
            </TableCell>
            <TableCell><Badge variant="outline" className={`capitalize border-0 ${TYPE_BADGE[row.type]}`}>{a.accountTypes[row.type]}</Badge></TableCell>
            <TableCell className="capitalize text-xs text-muted-foreground">{a.normalBalances[row.normalBalance]}</TableCell>
            <TableCell className="text-xs">{row.currency}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{row.cashAccount?.name ?? "—"}</TableCell>
            <TableCell onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(row._id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </TableCell>
          </TableRow>
        )}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? a.editAccount : a.addAccount}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{a.fields.code}</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="1200" disabled={!!editing} required />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>{a.fields.name}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={a.placeholders.accountName} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{a.fields.type}</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as AccountType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ACCOUNT_TYPES.map((t) => <SelectItem key={t} value={t}>{a.accountTypes[t]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{a.fields.currency}</Label>
                <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} maxLength={3} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{a.fields.parentAccount}</Label>
              <Select value={form.parentId || "none"} onValueChange={(v) => setForm({ ...form, parentId: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder={a.placeholders.none} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{a.placeholders.topLevel}</SelectItem>
                  {allAccounts.filter((acc) => acc._id !== editing?._id).map((acc) => (
                    <SelectItem key={acc._id} value={acc._id}>{acc.code} — {acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              {a.fields.active}
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{tr.common.cancel}</Button>
              <Button type="submit" disabled={saving}>{saving ? tr.common.loading : tr.common.save}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
