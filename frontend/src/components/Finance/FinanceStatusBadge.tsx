import React from "react";
import { Badge } from "@/components/ui/badge";
import { QuoteStatus, InvoiceStatus } from "@/types/types";
import { useLanguage } from "@/contexts/LanguageContext";

const QUOTE_COLORS: Record<QuoteStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-orange-100 text-orange-700",
};

const INVOICE_COLORS: Record<InvoiceStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  partially_paid: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
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
  const color = colorMap[status as QuoteStatus & InvoiceStatus] ?? "bg-gray-100 text-gray-600";

  return (
    <Badge variant="outline" className={color}>
      {label}
    </Badge>
  );
};
