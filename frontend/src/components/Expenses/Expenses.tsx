import { GenericTable } from "@/components/common/GenericTable";
import BookingRow from "./ExpenseRow";
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

export function Expenses() {
  const { tr } = useLanguage();
  const e = tr.expenses;

  return (
    <GenericTable<ExpenseReportData>
      queryKey="expenses"
      fetchData={getExpenses}
      deleteData={deleteExpense}
      headers={e.headers}
      renderRow={(item, handleDelete) => (
        <BookingRow
          key={item._id}
          name={item.title}
          state={item.approved ? "Approved" : "Pending"}
          price={item.expenses.reduce((t, i) => t + i.amount, 0)}
          totalSales={item.userId?.name ?? "—"}
          date={new Date(item.createdAt).toLocaleString()}
          id={item._id}
          handleDelete={handleDelete}
        />
      )}
      title={e.title}
      description={e.description}
      addLink="/expenses/add"
      addLabel={e.add}
      emptyMessage={e.empty}
      noSearchMessage={e.noSearch}
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
