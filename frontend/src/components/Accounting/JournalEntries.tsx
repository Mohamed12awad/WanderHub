import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TableCell, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { queryKeys } from "@/lib/queryKeys";
import {
  getJournalEntries, createJournalEntry, getChartOfAccounts,
  type JournalLinePayload,
} from "@/utils/api";
import { GenericTable } from "@/components/common/GenericTable";
import { useLanguage } from "@/contexts/LanguageContext";

interface JournalLine {
  _id: string;
  debit: string;
  credit: string;
  account?: { code: string; name: string };
}
interface JournalEntry {
  _id: string;
  createdAt: string;
  entryNumber: string;
  date: string;
  memo?: string | null;
  sourceType: string;
  status: "draft" | "posted" | "reversed";
  lines: JournalLine[];
}
interface CoaOption { _id: string; code: string; name: string; isActive: boolean }

const STATUS_BADGE: Record<string, string> = {
  posted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  reversed: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  draft: "bg-muted text-muted-foreground",
};

const SOURCE_KEYS = ["Manual", "Invoice", "InvoicePayment", "VendorBill", "VendorBillPayment", "StockCogs", "StockReceipt", "StockCogsReversal", "Reversal"];
const STATUS_KEYS = ["posted", "reversed", "draft"];

type FormLine = { id: string; accountId: string; debit: string; credit: string };
const blankLine = (): FormLine => ({ id: crypto.randomUUID(), accountId: "", debit: "", credit: "" });

export default function JournalEntries() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { tr } = useLanguage();
  const a = tr.accounting;
  const headers = useMemo(
    () => [a.headers.entryNumber, a.headers.date, a.headers.memo, a.headers.source, a.headers.status, a.headers.amount],
    [a],
  );
  const sourceOptions = useMemo(() => SOURCE_KEYS.map((value) => ({ value, label: a.sources[value] })), [a]);
  const statusOptions = useMemo(() => STATUS_KEYS.map((value) => ({ value, label: a.statuses[value] })), [a]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState("");
  const [lines, setLines] = useState<FormLine[]>([blankLine(), blankLine()]);

  const { data: coaData } = useQuery({
    queryKey: queryKeys.accounting.chartOfAccounts,
    queryFn: () => getChartOfAccounts(),
    staleTime: 60000,
    enabled: open,
  });
  const coa: CoaOption[] = coaData?.data ?? [];

  const totals = useMemo(() => {
    const debit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
    const credit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
    return { debit, credit, balanced: Math.abs(debit - credit) < 0.005 && debit > 0 };
  }, [lines]);

  const reset = () => {
    setDate(new Date().toISOString().slice(0, 10));
    setMemo("");
    setLines([blankLine(), blankLine()]);
  };

  const updateLine = (i: number, patch: Partial<FormLine>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const handleSave = async () => {
    const payloadLines: JournalLinePayload[] = lines
      .filter((l) => l.accountId && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0))
      .map((l) => ({
        accountId: l.accountId,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
      }));
    if (payloadLines.length < 2) {
      toast({ title: a.addAtLeastTwoLines, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await createJournalEntry({ date, memo: memo.trim() || undefined, lines: payloadLines });
      toast({ title: a.journalPosted });
      queryClient.invalidateQueries({ queryKey: ["journal"] });
      setOpen(false);
      reset();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: msg ?? a.journalPostFailed, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <GenericTable<JournalEntry>
        queryKey="journal"
        fetchData={({ page, limit, q, filters }) =>
          getJournalEntries({
            page, limit, q,
            status: filters?.status || undefined,
            sourceType: filters?.sourceType || undefined,
          })
        }
        headers={headers}
        title={a.journal}
        description={a.journalDescription}
        addLabel={a.newEntry}
        onAdd={() => setOpen(true)}
        quickStatusFilter={{ field: "status", options: statusOptions }}
        filterConfigs={[
          { label: a.headers.source, field: "sourceType", type: "select", options: sourceOptions },
        ]}
        emptyMessage={a.noJournalEntries}
        renderRow={(e) => {
          const amount = e.lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
          return (
            <TableRow
              key={e._id}
              className="cursor-pointer hover:bg-muted/40"
              onClick={() => navigate(`/accounting/journal/${e._id}`)}
            >
              <TableCell className="font-mono text-xs">
                <Link
                  to={`/accounting/journal/${e._id}`}
                  className="text-primary hover:underline"
                  onClick={(ev) => ev.stopPropagation()}
                >
                  {e.entryNumber}
                </Link>
              </TableCell>
              <TableCell className="text-xs">{new Date(e.date).toLocaleDateString()}</TableCell>
              <TableCell className="text-sm">{e.memo ?? <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{a.sources[e.sourceType] ?? e.sourceType}</TableCell>
              <TableCell>
                <Badge variant="outline" className={`capitalize border-0 ${STATUS_BADGE[e.status] ?? ""}`}>{a.statuses[e.status] ?? e.status}</Badge>
              </TableCell>
              <TableCell className="text-right font-mono text-sm tabular-nums">
                {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell />
            </TableRow>
          );
        }}
      />

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{a.newJournalEntry}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{a.fields.date}</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{a.fields.memo}</Label>
                <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder={a.placeholders.optionalDescription} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_120px_120px_32px] gap-2 px-1 text-[11px] font-medium uppercase text-muted-foreground">
                <span>{a.fields.account}</span><span className="text-right">{a.fields.debit}</span><span className="text-right">{a.fields.credit}</span><span />
              </div>
              {lines.map((l, i) => (
                <div key={l.id} className="grid grid-cols-[1fr_120px_120px_32px] gap-2 items-center">
                  <Select value={l.accountId} onValueChange={(v) => updateLine(i, { accountId: v })}>
                    <SelectTrigger><SelectValue placeholder={a.placeholders.selectAccount} /></SelectTrigger>
                    <SelectContent>
                      {coa.filter((acc) => acc.isActive).map((acc) => (
                        <SelectItem key={acc._id} value={acc._id}>{acc.code} — {acc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number" step="0.01" className="text-right"
                    value={l.debit}
                    onChange={(e) => updateLine(i, { debit: e.target.value, credit: e.target.value ? "" : l.credit })}
                  />
                  <Input
                    type="number" step="0.01" className="text-right"
                    value={l.credit}
                    onChange={(e) => updateLine(i, { credit: e.target.value, debit: e.target.value ? "" : l.debit })}
                  />
                  <Button
                    type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                    disabled={lines.length <= 2}
                    onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setLines((prev) => [...prev, blankLine()])}>
                <Plus className="h-3.5 w-3.5 me-1" />{a.addLine}
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
              <span className="font-medium">{a.totals}</span>
              <div className="flex items-center gap-4 font-mono">
                <span>{a.debitShort} {totals.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span>{a.creditShort} {totals.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <Badge variant="outline" className={totals.balanced
                  ? "border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                  : "border-0 bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"}>
                  {totals.balanced ? a.balanced : a.unbalanced}
                </Badge>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setOpen(false); reset(); }}>{tr.common.cancel}</Button>
              <Button type="button" disabled={saving || !totals.balanced} onClick={handleSave}>
                {saving ? a.posting : a.postEntry}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
