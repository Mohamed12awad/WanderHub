import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BookText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDocumentJournalEntries } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";

interface JLine {
  _id: string;
  debit: string | number;
  credit: string | number;
  account?: { code: string; name: string };
}
interface JEntry {
  _id: string;
  entryNumber: string;
  date: string;
  memo?: string | null;
  sourceType: string;
  status: string;
  lines: JLine[];
}

/**
 * The GL footprint of a document — its own posting plus any payment postings.
 * Renders nothing when the document has no journal entries (e.g. a draft, or
 * GL posting disabled), so it never clutters a document that hasn't posted.
 */
export function DocumentJournalEntries({ model, id }: { model: "Invoice" | "VendorBill" | "ExpenseReport"; id: string }) {
  const { tr, formatDate, formatNumber } = useLanguage();
  const fmt = (v: string | number) =>
    formatNumber(typeof v === "number" ? v : parseFloat(v) || 0, { minimumFractionDigits: 2 });
  const a = tr.accounting;
  const { data } = useQuery({
    queryKey: ["doc-journal", model, id],
    queryFn: () => getDocumentJournalEntries(model, id),
    enabled: !!id,
  });
  const entries: JEntry[] = data?.data ?? [];
  if (entries.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BookText className="h-4 w-4 text-muted-foreground" />
          {a.journalEntries}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {entries.map((e) => (
          <div key={e._id} className="border-b last:border-0 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Link to={`/accounting/journal/${e._id}`} className="font-mono text-xs text-primary hover:underline shrink-0">
                  {e.entryNumber}
                </Link>
                <span className="text-[11px] rounded bg-muted px-1.5 py-0.5 text-muted-foreground shrink-0">
                  {a.sources[e.sourceType] ?? e.sourceType}
                </span>
                {e.memo && <span className="text-xs text-muted-foreground truncate">{e.memo}</span>}
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{formatDate(e.date, { day: "2-digit", month: "short", year: "numeric" })}</span>
            </div>
            <table className="w-full mt-2 text-xs">
              <tbody>
                {e.lines.map((l) => {
                  const dr = typeof l.debit === "number" ? l.debit : parseFloat(l.debit) || 0;
                  const cr = typeof l.credit === "number" ? l.credit : parseFloat(l.credit) || 0;
                  return (
                    <tr key={l._id}>
                      <td className="py-0.5 text-muted-foreground">
                        <span className="font-mono me-1.5">{l.account?.code}</span>{l.account?.name}
                      </td>
                      <td className="py-0.5 text-right font-mono tabular-nums w-24">{dr ? fmt(dr) : ""}</td>
                      <td className="py-0.5 text-right font-mono tabular-nums w-24">{cr ? fmt(cr) : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
