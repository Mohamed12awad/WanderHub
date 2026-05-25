import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  getExpenseById, deleteExpenseReportItem, approveExpenseReport, rejectExpenseReport,
} from "@/utils/api";
import { Link, useParams } from "react-router-dom";
import { CircleArrowLeft, Edit, CheckCircle, XCircle } from "lucide-react";
import { useQuery, useQueryClient } from "react-query";
import LoadingSpinner from "../common/spinner";
import { useAuth } from "@/contexts/authContext";
import { NotesPanel } from "@/components/common/NotesPanel";
import { ApprovalBadge } from "@/components/Finance/FinanceStatusBadge";
import { RejectDialog } from "@/components/common/RejectDialog";
import { PermissionGate } from "@/components/common/PermissionGate";
import { toast } from "@/components/ui/use-toast";
import type { ApprovalStatus } from "@/types/types";
import { useApprovalConfig } from "@/hooks/useApprovalConfig";

interface ExpenseItem {
  _id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  beneficiary: string;
}

interface ExpenseData {
  _id: string;
  title: string;
  userId: { _id: string; name: string } | string;
  expenses: ExpenseItem[];
  approved: boolean;
  approvalStatus?: ApprovalStatus;
  approvedBy?: { _id: string; name: string };
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

const ViewExpense = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { id: expenseId } = useParams<{ id: string }>();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const { isApprovalEnabled } = useApprovalConfig();

  const { data: expenseData, isLoading, error } = useQuery(
    ["expenses", expenseId],
    async () => (await getExpenseById(expenseId!)).data
  );

  const [formData, setFormData] = useState<ExpenseData | null>(null);
  useEffect(() => { if (expenseData) setFormData(expenseData); }, [expenseData]);

  const handleDeleteItem = async (reportId: string, itemId: string) => {
    await deleteExpenseReportItem(reportId, itemId);
    queryClient.invalidateQueries(["expenses", expenseId]);
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await approveExpenseReport(expenseId!);
      queryClient.invalidateQueries(["expenses", expenseId]);
      toast({ title: "Expense report approved." });
    } catch {
      toast({ title: "Approval failed", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (reason: string) => {
    setActionLoading(true);
    try {
      await rejectExpenseReport(expenseId!, reason);
      queryClient.invalidateQueries(["expenses", expenseId]);
      setRejectOpen(false);
      toast({ title: "Expense report rejected." });
    } catch {
      toast({ title: "Rejection failed", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) return <LoadingSpinner loading />;
  if (error || !formData) return <div className="p-4 text-sm text-destructive">Could not load expense report.</div>;

  const canDeleteItem = ["admin", "super admin"].includes(user!.role);
  const approvalStatus = formData.approvalStatus ?? (formData.approved ? "approved" : "pending");
  const approvalEnabled = isApprovalEnabled("expenses");
  const canEdit = !approvalEnabled || approvalStatus === "approved" || approvalStatus === "rejected";

  return (
    <main className="p-4 space-y-5">
      <RejectDialog
        open={rejectOpen}
        onConfirm={handleReject}
        onCancel={() => setRejectOpen(false)}
        loading={actionLoading}
      />

      <Card>
        <CardHeader className="flex flex-row items-start justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <Link to="/expenses"><CircleArrowLeft /></Link>
            View Expense Report
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <PermissionGate require="expenses:approve">
              {approvalStatus !== "approved" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20"
                  onClick={handleApprove}
                  disabled={actionLoading}
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Approve
                </Button>
              )}
              {approvalStatus !== "rejected" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 text-destructive border-destructive/40 hover:bg-destructive/10"
                  onClick={() => setRejectOpen(true)}
                  disabled={actionLoading}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Reject
                </Button>
              )}
            </PermissionGate>
            <Link to={canEdit ? `/expenses/${expenseId}/edit` : "#"}>
              <Button size="sm" className="h-8 px-3" disabled={!canEdit} title={!canEdit ? "Record is pending approval and cannot be edited." : undefined}>
                <Edit className="h-3.5 w-3.5 me-1" />Edit
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h2 className="text-base font-semibold mb-3">Report Information</h2>
              <div className="grid grid-cols-2 mb-2">
                <Label className="my-1 text-muted-foreground">Title</Label>
                <p className="my-1">{formData.title}</p>
              </div>
              <div className="grid grid-cols-2 mb-2">
                <Label className="my-1 text-muted-foreground">Approval</Label>
                <div className="my-1">
                  <ApprovalBadge status={approvalStatus} rejectionReason={formData.rejectionReason} />
                </div>
              </div>
              {formData.approvedBy && (
                <div className="grid grid-cols-2 mb-2">
                  <Label className="my-1 text-muted-foreground">
                    {approvalStatus === "rejected" ? "Rejected by" : "Approved by"}
                  </Label>
                  <p className="my-1 text-sm">
                    {typeof formData.approvedBy === "object" ? formData.approvedBy.name : "—"}
                    {formData.approvedAt && (
                      <span className="text-muted-foreground ms-1">
                        · {new Date(formData.approvedAt).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 mb-2">
                <Label className="my-1 text-muted-foreground">Total</Label>
                <p className="my-1 font-semibold">
                  {formData.expenses.reduce((t, i) => t + i.amount, 0).toLocaleString()}
                </p>
              </div>
              <div className="grid grid-cols-2 mb-2">
                <Label className="my-1 text-muted-foreground">Created At</Label>
                <p className="my-1">{new Date(formData.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-5">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead>Beneficiary</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formData.expenses.map((expense) => (
                  <TableRow key={expense._id}>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell>{expense.amount.toLocaleString()}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {new Date(expense.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="hidden md:table-cell capitalize">{expense.category}</TableCell>
                    <TableCell>{expense.beneficiary}</TableCell>
                    {canDeleteItem && (
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteItem(expenseId!, expense._id)}
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

      <Card>
        <CardContent className="py-5">
          <Tabs defaultValue="notes">
            <TabsList className="mb-4">
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>
            <TabsContent value="notes">
              {expenseId && <NotesPanel linkedTo={expenseId} linkedModel="Expense" />}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  );
};

export default ViewExpense;
