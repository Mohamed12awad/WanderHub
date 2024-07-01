import { GenericTable } from "@/components/common/GenericTable";
import BookingRow from "./ExpenseRow";
import { deleteExpense, getExpenses } from "@/utils/api";

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
  return (
    <GenericTable<ExpenseReportData>
      queryKey="expenses"
      fetchData={getExpenses}
      deleteData={deleteExpense}
      headers={["Report Title", "Total", "Approved", "Owner", "Created At"]}
      renderRow={(item, handleDelete) => (
        <BookingRow
          key={item._id}
          name={item.title}
          state={item.approved ? "Approved" : "Pending"}
          price={item.expenses.reduce((total, item) => total + item.amount, 0)}
          totalSales={item.userId ? item.userId.name : "No Title"}
          date={new Date(item.createdAt).toLocaleString()}
          id={item._id}
          handleDelete={handleDelete}
        />
      )}
      title="Expenses"
      description="Manage your Expenses and view their Status."
      addLink="/expenses/add"
      isDownloadEnabled={false}
    />
  );
}
