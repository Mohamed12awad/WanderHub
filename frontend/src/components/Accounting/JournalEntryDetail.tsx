import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ChevronLeft, Undo2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/authContext";
import { useToast } from "@/components/ui/use-toast";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { queryKeys } from "@/lib/queryKeys";
import { getJournalEntry, reverseJournalEntry } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";

interface Line {
  _id: string;
  debit: string;
  credit: string;
  currency: string;
  memo?: string | null;
  account?: { code: string; name: string; type: string };
}
interface Entry {
  _id: string;
  entryNumber: string;
  date: string;
  memo?: string | null;
  sourceType: string;
  sourceId: string;
  status: string;
  lines: Line[];
  createdBy?: { name: string } | null;
  reversesEntry?: { _id: string; entryNumber: string } | null;
  reversedBy?: { _id: string; entryNumber: string } | null;
}

const fmt = (v: string) => {
  const n = parseFloat(v) || 0;
  return n ? n.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "";
};

export default function JournalEntryDetail() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { tr } = useLanguage();
  const a = tr.accounting;
  const [confirmReverse, setConfirmReverse] = useState(false);
  const [reversing, setReversing] = useState(false);
  const canManage = (user?.permissions ?? []).some((p) => p === "*" || p === "accounting:manage");

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.accounting.journalEntry(id),
    queryFn: () => getJournalEntry(id),
    enabled: !!id,
  });
  const entry: Entry | undefined = data?.data;

  const handleReverse = async () => {
    setReversing(true);
    try {
      await reverseJournalEntry(id);
      toast({ title: a.entryReversed });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.journalEntry(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.journal() });
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: msg ?? a.reverseEntryFailed, variant: "destructive" });
    } finally {
      setReversing(false);
      setConfirmReverse(false);
    }
  };

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">{a.loading}</div>;
  if (!entry) return <div className="p-6 text-sm text-muted-foreground">{a.entryNotFound}</div>;

  const canReverse = canManage && entry.status === "posted" && entry.sourceType !== "Reversal" && !entry.reversedBy;

  const totalDebit = entry.lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = entry.lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <Link to="/accounting/journal" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" />{a.backToJournal}
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold font-mono">{entry.entryNumber}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(entry.date).toLocaleDateString()} · {a.sources[entry.sourceType] ?? entry.sourceType}
            {entry.createdBy ? ` · ${a.byUser(entry.createdBy.name)}` : ""}
          </p>
          {entry.memo && <p className="mt-1 text-sm">{entry.memo}</p>}
        </div>
        <div className="flex items-center gap-2">
          {canReverse && (
            <Button variant="outline" size="sm" onClick={() => setConfirmReverse(true)}>
              <Undo2 className="h-3.5 w-3.5 me-1" />{a.reverse}
            </Button>
          )}
          <Badge variant="outline" className="capitalize">{a.statuses[entry.status] ?? entry.status}</Badge>
        </div>
      </div>

      {(entry.reversesEntry || entry.reversedBy) && (
        <div className="text-xs text-muted-foreground space-x-3">
          {entry.reversesEntry && (
            <Link to={`/accounting/journal/${entry.reversesEntry._id}`} className="text-primary hover:underline">
              {a.reverses(entry.reversesEntry.entryNumber)}
            </Link>
          )}
          {entry.reversedBy && (
            <Link to={`/accounting/journal/${entry.reversedBy._id}`} className="text-primary hover:underline">
              {a.reversedBy(entry.reversedBy.entryNumber)}
            </Link>
          )}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">{a.headers.code}</TableHead>
                <TableHead>{a.headers.account}</TableHead>
                <TableHead>{a.headers.memo}</TableHead>
                <TableHead className="text-right">{a.headers.debit}</TableHead>
                <TableHead className="text-right">{a.headers.credit}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entry.lines.map((l) => (
                <TableRow key={l._id}>
                  <TableCell className="font-mono text-xs">{l.account?.code}</TableCell>
                  <TableCell dir="auto">{l.account?.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.memo ?? ""}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(l.debit)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(l.credit)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3} className="font-medium">{tr.finance.total}</TableCell>
                <TableCell className="text-right font-mono font-semibold">
                  {totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right font-mono font-semibold">
                  {totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmReverse}
        onConfirm={() => { if (!reversing) void handleReverse(); }}
        onCancel={() => setConfirmReverse(false)}
        title={a.reverseJournalEntry}
        description={a.reverseDescription(entry.entryNumber)}
      />
    </div>
  );
}
