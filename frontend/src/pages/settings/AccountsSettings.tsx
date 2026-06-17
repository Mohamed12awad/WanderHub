import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Landmark, Wallet, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAccounts, createAccount, updateAccount, deleteAccount, getChartOfAccounts } from "@/utils/api";
import { queryKeys } from "@/lib/queryKeys";
import { CURRENCIES } from "@/utils/constants";
import { useToast } from "@/components/ui/use-toast";
import { Account, AccountType } from "@/types/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

const TYPE_ICONS: Record<AccountType, React.ElementType> = {
  bank: Landmark,
  cash: Wallet,
  safe: Lock,
};

const TYPE_LABELS: Record<AccountType, string> = {
  bank: "Bank",
  cash: "Cash",
  safe: "Safe",
};

interface FormState {
  name: string;
  type: AccountType;
  currency: string;
  balance: string;
  notes: string;
  glAccountId: string;
}

const emptyForm = (): FormState => ({
  name: "",
  type: "cash",
  currency: "USD",
  balance: "0",
  notes: "",
  glAccountId: "",
});

export default function AccountsSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Account | null>(null);

  const { data } = useQuery({
    queryKey: ["accounts"],
    queryFn: getAccounts,
    staleTime: 30000
  });
  const accounts: Account[] = data?.data ?? [];

  const { data: coaData } = useQuery({ queryKey: queryKeys.accounting.chartOfAccounts, queryFn: () => getChartOfAccounts(), staleTime: 60000 });
  const assetAccounts: { _id: string; code: string; name: string; cashAccount?: { _id: string } | null }[] =
    (coaData?.data ?? []).filter((c: any) => c.type === "asset");

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (acc: Account) => {
    setEditing(acc);
    setForm({
      name: acc.name,
      type: acc.type,
      currency: acc.currency,
      balance: String(acc.balance),
      notes: acc.notes ?? "",
      glAccountId: (acc as any).chartOfAccount?._id ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      type: form.type,
      currency: form.currency.trim() || "USD",
      balance: parseFloat(form.balance) || 0,
      notes: form.notes.trim() || undefined,
      chartOfAccountId: form.glAccountId || undefined,
    };
    try {
      if (editing) {
        await updateAccount(editing._id, payload);
        toast({ title: "Account updated." });
      } else {
        await createAccount(payload);
        toast({ title: "Account created." });
      }
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setDialogOpen(false);
    } catch {
      toast({ title: "Failed to save account", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (acc: Account) => {
    try {
      await deleteAccount(acc._id);
      toast({ title: "Account deleted." });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    } catch {
      toast({ title: "Failed to delete account", variant: "destructive" });
    }
  };

  return (
    <div className="page-w-narrow page-pad page-gap">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Accounts</h2>
          <p className="text-sm text-muted-foreground">Manage bank, cash, and safe accounts for payment tracking.</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 me-1" />Add Account
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {accounts.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No accounts yet. Add one to start tracking payments by account.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>GL Account</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="w-20"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((acc) => {
                  const Icon = TYPE_ICONS[acc.type];
                  return (
                    <TableRow
                      key={acc._id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => navigate(`/settings/accounts/${acc._id}`)}
                      title="View transactions"
                    >
                      <TableCell className="font-medium flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        {acc.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{TYPE_LABELS[acc.type]}</Badge>
                      </TableCell>
                      <TableCell>{acc.currency}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {(acc as any).chartOfAccount
                          ? `${(acc as any).chartOfAccount.code} — ${(acc as any).chartOfAccount.name}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono">{acc.balance.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEdit(acc); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setPendingDelete(acc); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Account" : "Add Account"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Main Checking, Petty Cash"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as AccountType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Bank</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="safe">Safe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Opening Balance</Label>
              <Input
                type="number"
                step="0.01"
                value={form.balance}
                onChange={(e) => setForm({ ...form, balance: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="Optional notes"
              />
            </div>
            <div className="space-y-2">
              <Label>GL Account</Label>
              <Select value={form.glAccountId || "auto"} onValueChange={(v) => setForm({ ...form, glAccountId: v === "auto" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-create under 1100 Cash &amp; Bank</SelectItem>
                  {assetAccounts.map((a) => (
                    <SelectItem
                      key={a._id}
                      value={a._id}
                      disabled={!!a.cashAccount && a.cashAccount._id !== editing?._id}
                    >
                      {a.code} — {a.name}{a.cashAccount && a.cashAccount._id !== editing?._id ? " (linked)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Pick an existing GL account, or leave on auto to create one automatically.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={pendingDelete !== null}
        onConfirm={() => {
          const acc = pendingDelete;
          setPendingDelete(null);
          if (acc) void handleDelete(acc);
        }}
        onCancel={() => setPendingDelete(null)}
        title="Delete Account"
        description={pendingDelete ? `Delete account "${pendingDelete.name}"? This cannot be undone.` : undefined}
      />
    </div>
  );
}
