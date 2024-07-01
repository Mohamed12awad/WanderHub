import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { getExpenseById, deleteExpenseReportItem } from "@/utils/api";
import { Link, useParams } from "react-router-dom";
import { CircleArrowLeft, Edit } from "lucide-react";
import { useQuery, useQueryClient } from "react-query";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "../common/spinner";
import { useAuth } from "@/contexts/authContext";

interface ExpenseData {
  _id: string;
  title: string;
  userId: string;
  expenses: ExpenseItem[];
  approved: boolean;
  createdAt: string;
}

interface ExpenseItem {
  _id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  beneficiary: string;
}

const ViewExpense = () => {
  const { user } = useAuth();

  const queryClient = useQueryClient();
  const { id: expenseId } = useParams<{ id: string }>();

  const {
    data: expenseData,
    isLoading,
    error,
  } = useQuery(["expenses", expenseId], async () => {
    const response = await getExpenseById(expenseId!);
    return response.data; // Access the data property directly
  });

  const handleDelete = async (reportId: string, itemId: string) => {
    if (reportId) {
      await deleteExpenseReportItem(reportId, itemId);
      queryClient.invalidateQueries(["expenses", expenseId]);
    }
  };

  const [formData, setFormData] = useState<ExpenseData | null>(null);

  useEffect(() => {
    if (expenseData) {
      setFormData(expenseData); // Directly set the expense data
    }
  }, [expenseData]);

  if (isLoading) {
    return <LoadingSpinner loading={isLoading} />;
  }

  if (error) {
    return <div>Error loading expense data</div>;
  }

  if (!formData) {
    return <div>No expense data found</div>;
  }

  return (
    <main className="p-4">
      <LoadingSpinner loading={isLoading} />
      <Card className="print:hidden">
        <CardHeader className="flex flex-row justify-between">
          <CardTitle className="flex items-center space-x-3">
            <Link to="/expenses">
              <CircleArrowLeft className="me-3" />
            </Link>
            View Expense Report
          </CardTitle>
          <div className="buttons flex flex-wrap gap-1 md:gap-3">
            <Link to={`/expenses/${expenseId}/edit`}>
              <Button size="sm" className="h-8 px-3 md:px-5">
                <Edit className="h-3.5 w-3.5 me-1" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Edit
                </span>
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h2 className="text-lg font-semibold mb-2">
                Expense Report Information
              </h2>
              <div className="grid grid-cols-2">
                <Label className="my-3">Title</Label>
                <p>{formData.title}</p>
              </div>
              <div className="grid grid-cols-2">
                <Label className="my-3">Approved</Label>
                <p>{formData.approved ? "Yes" : "No"}</p>
              </div>
              <div className="grid grid-cols-2">
                <Label className="my-3">Total</Label>
                <p>
                  {formData.expenses.reduce(
                    (total, item) => total + item.amount,
                    0
                  )}
                </p>
              </div>
              <div className="grid grid-cols-2">
                <Label className="my-3">Created At</Label>
                <p>{new Date(formData.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="mt-5 print:hidden">
        <CardContent className="py-5">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Category
                  </TableHead>
                  <TableHead>Beneficiary</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formData.expenses.map((expense, index) => (
                  <TableRow key={index}>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell>{expense.amount}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {new Date(expense.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {expense.category}
                    </TableCell>
                    <TableCell>{expense.beneficiary}</TableCell>
                    {["admin", "super admin"].includes(user!.role) && (
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(expenseId!, expense._id)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default ViewExpense;
