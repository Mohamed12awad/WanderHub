import { GenericTable } from "@/components/common/GenericTable";
import ExpenseActions from "./ExpenseActions";
import { deleteExpense, getExpenses } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

export interface ExpenseItem {
  _id: string;
  description: string;
  amount: number;
  date: Date | string;
  category: string;
  beneficiary: string;
}

export interface ExpenseReportData {
  _id: string;
  title: string;
  userId: { name: string };
  expenses: ExpenseItem[];
  approvalStatus: "pending" | "approved" | "rejected";
  total: number;
  createdAt: string;
}

const EXPENSE_FILTERS = [
  { label: "Created Date", field: "createdAt", type: "date-range" as const },
];

const STATUS_CLASS: Record<string, string> = {
  approved: "bg-emerald-500 text-white border-emerald-500 dark:bg-emerald-600 dark:border-emerald-600",
  rejected: "bg-red-500 text-white border-red-500 dark:bg-red-600 dark:border-red-600",
  pending: "bg-amber-500 text-white border-amber-500 dark:bg-amber-600 dark:border-amber-600",
};

export function Expenses() {
  const { tr, formatDate, formatNumber } = useLanguage();
  const navigate = useNavigate();
  const e = tr.expenses;

  return (
    <GenericTable<ExpenseReportData>
      queryKey="expenses"
      fetchData={({ page, limit, q, filters, sort, dir }) => getExpenses({ page, limit, q, ...(sort ? { sort, dir } : {}), ...filters })}
      deleteData={deleteExpense}
      columns={[
        { id: "report", header: e.headers[0], kind: "text", hideable: false, cell: (item) => <span className="font-medium">{item.title}</span> },
        { id: "total", header: e.headers[1], kind: "number", cell: (item) => <span className="font-medium">{formatNumber(item.expenses.reduce((total, expense) => total + expense.amount, 0))}</span> },
        {
          id: "approvalStatus",
          header: e.headers[2],
          kind: "status",
          cell: (item) => <Badge variant="outline" className={STATUS_CLASS[item.approvalStatus] ?? STATUS_CLASS.pending}>{item.approvalStatus === "approved" ? "Approved" : item.approvalStatus === "rejected" ? "Rejected" : "Pending"}</Badge>,
        },
        { id: "owner", header: e.headers[3], kind: "text", cell: (item) => <span className="text-foreground/70">{item.userId?.name ?? "—"}</span> },
        { id: "createdAt", header: e.headers[4], kind: "date", cell: (item) => <span className="text-muted-foreground text-xs tabular-nums">{formatDate(item.createdAt, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span> },
      ]}
      onRowClick={(item) => navigate(`/expenses/${item._id}`)}
      renderActions={(item, handleDelete) => <ExpenseActions item={item} handleDelete={handleDelete} />}
      quickStatusFilter={{
        field: "approvalStatus",
        options: [
          { value: "approved", label: "Approved" },
          { value: "pending",  label: "Pending" },
          { value: "rejected", label: "Rejected" },
        ],
      }}
      title={e.title}
      description={e.description}
      addLink="/expenses/add"
      addLabel={e.add}
      emptyMessage={e.empty}
      noSearchMessage={e.noSearch}
      filterConfigs={EXPENSE_FILTERS}
      module="expenses"
      exportConfig={{
        entity: "expenses",
        filename: "expenses",
        getRow: (ex) => ({
          Title: ex.title,
          Total: ex.expenses.reduce((s, i) => s + i.amount, 0),
          Status: ex.approvalStatus,
          Owner: ex.userId?.name ?? "",
          "Created At": new Date(ex.createdAt).toISOString().slice(0, 10),
        }),
      }}
    />
  );
}
