import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppBreadcrumb } from "@/components/common/AppBreadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  getExpenseById, deleteExpenseReportItem, approveExpenseReport, rejectExpenseReport, deleteExpense,
} from "@/utils/api";
import { Link, useParams, useNavigate } from "react-router-dom";
import { CircleArrowLeft, Edit, CheckCircle, XCircle, MoreHorizontal, Trash2 } from "lucide-react";
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
  const navigate = useNavigate();
  const { id: expenseId } = useParams<{ id: string }>();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const { isApprovalEnabled } = useApprovalConfig();
  const canDelete = ["admin", "super admin"].includes(user!.role);

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

  const handleDelete = async () => {
    if (!confirm("Delete this expense report? This action cannot be undone.")) return;
    try {
      await deleteExpense(expenseId!);
      navigate("/expenses");
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
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
          <div className="min-w-0">
            <AppBreadcrumb crumbs={[{ label: "Expenses", href: "/expenses" }, { label: formData.title }]} />
            <CardTitle className="flex items-center gap-2 mt-1">
              <Link to="/expenses"><CircleArrowLeft /></Link>
              {formData.title}
            </CardTitle>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link to={canEdit ? `/expenses/${expenseId}/edit` : "#"}>
              <Button size="sm" className="h-8 px-4" disabled={!canEdit} title={!canEdit ? "Record is pending approval and cannot be edited." : undefined}>
                <Edit className="h-3.5 w-3.5 me-1" />Edit
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">More actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <PermissionGate require="expenses:approve">
                  {approvalStatus !== "approved" && (
                    <DropdownMenuItem onClick={handleApprove} disabled={actionLoading} className="text-green-600 focus:text-green-600">
                      <CheckCircle className="h-3.5 w-3.5 me-2" />Approve
                    </DropdownMenuItem>
                  )}
                  {approvalStatus !== "rejected" && (
                    <DropdownMenuItem onClick={() => setRejectOpen(true)} disabled={actionLoading} className="text-destructive focus:text-destructive">
                      <XCircle className="h-3.5 w-3.5 me-2" />Reject
                    </DropdownMenuItem>
                  )}
                </PermissionGate>
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                      <Trash2 className="h-3.5 w-3.5 me-2" />Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Report Information</h2>
              <InfoRow label="Title" value={formData.title} />
              <InfoRow label="Approval">
                <ApprovalBadge status={approvalStatus} rejectionReason={formData.rejectionReason} />
              </InfoRow>
              {formData.approvedBy && (
                <InfoRow label={approvalStatus === "rejected" ? "Rejected by" : "Approved by"}>
                  <span className="text-sm">
                    {typeof formData.approvedBy === "object" ? formData.approvedBy.name : "—"}
                    {formData.approvedAt && (
                      <span className="text-muted-foreground ms-1">· {new Date(formData.approvedAt).toLocaleDateString()}</span>
                    )}
                  </span>
                </InfoRow>
              )}
              <InfoRow label="Total">
                <span className="text-sm font-semibold">
                  {formData.expenses.reduce((t, i) => t + i.amount, 0).toLocaleString()}
                </span>
              </InfoRow>
              <InfoRow label="Created At" value={new Date(formData.createdAt).toLocaleDateString()} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Expense Items</h2>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead>Beneficiary</TableHead>
                  {canDeleteItem && <TableHead><span className="sr-only">Actions</span></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {formData.expenses.map((expense) => (
                  <TableRow key={expense._id}>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell className="tabular-nums">{expense.amount.toLocaleString()}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                      {new Date(expense.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="hidden md:table-cell capitalize">{expense.category}</TableCell>
                    <TableCell>{expense.beneficiary}</TableCell>
                    {canDeleteItem && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteItem(expenseId!, expense._id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

const InfoRow: React.FC<{ label: string; value?: string | number | null; children?: React.ReactNode }> = ({ label, value, children }) => (
  <div className="mb-2 grid grid-cols-[160px_1fr] items-start gap-2">
    <Label className="text-sm font-medium text-foreground/60 pt-0.5">{label}</Label>
    <div className="flex items-start">
      {children ?? <p className="text-sm text-foreground">{value ?? "—"}</p>}
    </div>
  </div>
);

export default ViewExpense;
