import React from "react";

const BADGE_STYLES: Record<string, string> = {
  // PO statuses
  draft:           "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  sent:            "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  confirmed:       "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  received:        "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  // Bill statuses
  partially_paid:  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  paid:            "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  overdue:         "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  cancelled:       "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

const STATUS_LABELS: Record<string, string> = {
  draft:          "Draft",
  sent:           "Sent",
  confirmed:      "Confirmed",
  received:       "Received",
  partially_paid: "Partially Paid",
  paid:           "Paid",
  overdue:        "Overdue",
  cancelled:      "Cancelled",
};

interface Props {
  status: string;
}

export const ProcurementStatusBadge: React.FC<Props> = ({ status }) => {
  const styles = BADGE_STYLES[status] ?? "bg-gray-100 text-gray-700";
  const label  = STATUS_LABELS[status] ?? status;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles}`}>
      {label}
    </span>
  );
};

export default ProcurementStatusBadge;
