import { GenericTable } from "@/components/common/GenericTable";
import ExpenseRow from "./ExpenseRow";
import { deleteExpense, getExpenses } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";

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
  approved: boolean;
  total: number;
  createdAt: string;
}

const EXPENSE_FILTERS = [
  { label: "Created Date", field: "createdAt", type: "date-range" as const },
];

export function Expenses() {
  const { tr } = useLanguage();
  const e = tr.expenses;

  return (
    <GenericTable<ExpenseReportData>
      queryKey="expenses"
      fetchData={({ page, limit, q, filters, sort, dir }) => getExpenses({ page, limit, q, ...(sort ? { sort, dir } : {}), ...filters })}
      deleteData={deleteExpense}
      headers={e.headers}
      sortableHeaders={["Report", "Total", "Created"]}
      quickStatusFilter={{
        field: "approved",
        options: [
          { value: "true",  label: "Approved" },
          { value: "false", label: "Pending" },
        ],
      }}
      renderRow={(item, handleDelete) => (
        <ExpenseRow
          key={item._id}
          id={item._id}
          title={item.title}
          total={item.expenses.reduce((t, i) => t + i.amount, 0)}
          approved={item.approved}
          owner={item.userId?.name ?? "—"}
          date={new Date(item.createdAt).toLocaleDateString()}
          handleDelete={handleDelete}
        />
      )}
      title={e.title}
      description={e.description}
      addLink="/expenses/add"
      addLabel={e.add}
      emptyMessage={e.empty}
      noSearchMessage={e.noSearch}
      filterConfigs={EXPENSE_FILTERS}
      module="expenses"
      exportConfig={{
        filename: "expenses",
        getRow: (ex) => ({
          Title: ex.title,
          Total: ex.expenses.reduce((s, i) => s + i.amount, 0),
          Approved: ex.approved ? "Yes" : "No",
          Owner: ex.userId?.name ?? "",
          "Created At": new Date(ex.createdAt).toLocaleDateString(),
        }),
      }}
    />
  );
}
