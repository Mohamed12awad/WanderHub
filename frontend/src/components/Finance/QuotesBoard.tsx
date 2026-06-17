import type React from "react";
import { Link } from "react-router-dom";
import { KanbanBoardPage } from "@/components/common/KanbanBoardPage";
import type { KanbanColumn } from "@/components/common/GenericKanban";
import { getQuotes, updateQuote } from "@/utils/api";

interface Quote { _id: string; quoteNumber: string; title: string; status: string; total?: number; currency?: string; customer?: { name: string } | null }

const COLUMNS: KanbanColumn[] = [
  { key: "draft", label: "Draft", color: "#94a3b8" },
  { key: "sent", label: "Sent", color: "#3b82f6" },
  { key: "accepted", label: "Accepted", color: "#10b981" },
  { key: "rejected", label: "Rejected", color: "#f43f5e" },
  { key: "expired", label: "Expired", color: "#f59e0b" },
];

function Card({ quote }: { quote: Quote }) {
  return (
    <div className="bg-card border border-border/60 rounded-xl p-3 shadow-sm hover:shadow-md transition-all">
      <Link to={`/finance/quotes/${quote._id}`} onClick={(e) => e.stopPropagation()} className="block text-sm font-semibold hover:text-primary truncate">{quote.quoteNumber}</Link>
      <p className="text-xs text-muted-foreground truncate mt-0.5">{quote.title}{quote.customer?.name ? ` · ${quote.customer.name}` : ""}</p>
      {(quote.total ?? 0) > 0 && <p className="text-sm font-bold tabular-nums mt-2">{quote.total!.toLocaleString()} {quote.currency ?? "EGP"}</p>}
    </div>
  );
}

export default function QuotesBoard({ headerExtra }: { headerExtra?: React.ReactNode }) {
  return (
    <KanbanBoardPage<Quote>
      title="Quotes" description="Drag a quote between stages to update its status."
      queryKey="quotes-gt" columns={COLUMNS} fetchAll={() => getQuotes({ limit: 200 } as never)}
      updateStatus={(id, status) => updateQuote(id, { status: status as never })}
      renderCard={(quote) => <Card quote={quote} />} emptyColumnLabel="No quotes"
      headerExtra={headerExtra}
    />
  );
}
