import React from "react";
import { Badge } from "@/components/ui/badge";
import { QuoteStatus, InvoiceStatus, ApprovalStatus } from "@/types/types";
import { useLanguage } from "@/contexts/LanguageContext";

const QUOTE_COLORS: Record<QuoteStatus, string> = {
  draft:    "bg-slate-400  text-white border-slate-400  dark:bg-slate-600  dark:border-slate-600",
  sent:     "bg-blue-500   text-white border-blue-500   dark:bg-blue-600   dark:border-blue-600",
  accepted: "bg-emerald-500 text-white border-emerald-500 dark:bg-emerald-600 dark:border-emerald-600",
  rejected: "bg-rose-500   text-white border-rose-500   dark:bg-rose-600   dark:border-rose-600",
  expired:  "bg-orange-500 text-white border-orange-500 dark:bg-orange-600 dark:border-orange-600",
};

const INVOICE_COLORS: Record<InvoiceStatus, string> = {
  draft:         "bg-slate-400   text-white border-slate-400   dark:bg-slate-600   dark:border-slate-600",
  sent:          "bg-blue-500    text-white border-blue-500    dark:bg-blue-600    dark:border-blue-600",
  partially_paid:"bg-amber-500   text-white border-amber-500   dark:bg-amber-600   dark:border-amber-600",
  paid:          "bg-emerald-500 text-white border-emerald-500 dark:bg-emerald-600 dark:border-emerald-600",
  overdue:       "bg-rose-500    text-white border-rose-500    dark:bg-rose-600    dark:border-rose-600",
  cancelled:     "bg-slate-400   text-white border-slate-400   dark:bg-slate-600   dark:border-slate-600",
};

const APPROVAL_COLORS: Record<ApprovalStatus, string> = {
  pending:  "bg-amber-500   text-white border-amber-500   dark:bg-amber-600   dark:border-amber-600",
  approved: "bg-emerald-500 text-white border-emerald-500 dark:bg-emerald-600 dark:border-emerald-600",
  rejected: "bg-rose-500    text-white border-rose-500    dark:bg-rose-600    dark:border-rose-600",
};

const APPROVAL_LABELS: Record<ApprovalStatus, string> = {
  pending:  "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
};

interface Props {
  status: string;
  type: "quote" | "invoice";
}

export const FinanceStatusBadge: React.FC<Props> = ({ status, type }) => {
  const { tr } = useLanguage();
  const label =
    type === "quote"
      ? tr.finance.quoteStatuses[status] ?? status
      : tr.finance.invoiceStatuses[status] ?? status;

  const colorMap = type === "quote" ? QUOTE_COLORS : INVOICE_COLORS;
  const color = colorMap[status as QuoteStatus & InvoiceStatus]
    ?? "bg-slate-400 text-white border-slate-400 dark:bg-slate-600 dark:border-slate-600";

  return (
    <Badge variant="outline" className={color}>
      {label}
    </Badge>
  );
};

interface ApprovalBadgeProps {
  status?: ApprovalStatus;
  rejectionReason?: string;
}

export const ApprovalBadge: React.FC<ApprovalBadgeProps> = ({ status, rejectionReason }) => {
  const resolvedStatus: ApprovalStatus = status ?? "pending";
  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <Badge variant="outline" className={APPROVAL_COLORS[resolvedStatus]}>
        {APPROVAL_LABELS[resolvedStatus]}
      </Badge>
      {status === "rejected" && rejectionReason && (
        <span className="text-xs text-muted-foreground italic">"{rejectionReason}"</span>
      )}
    </span>
  );
};
