import React from "react";
import { Badge } from "@/components/ui/badge";
import { QuoteStatus, InvoiceStatus, ApprovalStatus } from "@/types/types";
import { useLanguage } from "@/contexts/LanguageContext";

const QUOTE_COLORS: Record<QuoteStatus, string> = {
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  accepted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  expired: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

const INVOICE_COLORS: Record<InvoiceStatus, string> = {
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  partially_paid: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

const APPROVAL_COLORS: Record<ApprovalStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const APPROVAL_LABELS: Record<ApprovalStatus, string> = {
  pending: "Pending Approval",
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
  const color = colorMap[status as QuoteStatus & InvoiceStatus] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";

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
  if (!status || status === "pending") {
    return (
      <Badge variant="outline" className={APPROVAL_COLORS.pending}>
        {APPROVAL_LABELS.pending}
      </Badge>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <Badge variant="outline" className={APPROVAL_COLORS[status]}>
        {APPROVAL_LABELS[status]}
      </Badge>
      {status === "rejected" && rejectionReason && (
        <span className="text-xs text-muted-foreground italic">"{rejectionReason}"</span>
      )}
    </span>
  );
};
