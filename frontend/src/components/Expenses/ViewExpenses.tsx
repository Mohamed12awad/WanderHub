import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  getExpenseById, deleteExpenseReportItem, approveExpenseReport, rejectExpenseReport, deleteExpense,
} from "@/utils/api";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ApprovalStepsTimeline } from "@/components/common/ApprovalStepsTimeline";
import { Edit, CheckCircle, XCircle, Clock, Trash2, Copy } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import LoadingSpinner from "../common/spinner";
import { useAuth } from "@/contexts/authContext";
import { DetailPageLayout } from "@/components/common/DetailPageLayout";
import { DetailHeader, DetailMenuItem } from "@/components/common/DetailHeader";
import { RecordContextPanel } from "@/components/common/RecordContextPanel";
import { ApprovalBadge } from "@/components/Finance/FinanceStatusBadge";
import { RejectDialog } from "@/components/common/RejectDialog";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { toast } from "@/components/ui/use-toast";
import type { ApprovalStatus } from "@/types/types";
import { useApprovalConfig } from "@/hooks/useApprovalConfig";
import { InfoRow } from "@/components/common/InfoRow";
import { AuditRows } from "@/components/common/AuditRows";

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
  project?: { _id: string; name: string } | null;
  expenses: ExpenseItem[];
  approved: boolean;
  approvalStatus?: ApprovalStatus;
  approvedBy?: { _id: string; name: string };
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt?: string;
  updatedBy?: { _id: string; name: string };
}

const ViewExpense = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { id: expenseId } = useParams<{ id: string }>();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const { isApprovalEnabled, canUserApprove } = useApprovalConfig();
  const perms = user?.permissions ?? [];
  const hasPerm = (p: string) => perms.includes('*') || perms.includes(p);
  const canDelete = hasPerm('expenses:delete');

  const { data: expenseData, isLoading, error } = useQuery({
    queryKey: ["expenses", expenseId],
    queryFn: async () => (await getExpenseById(expenseId!)).data
  });
  const [formData, setFormData] = useState<ExpenseData | null>(null);
  useEffect(() => { if (expenseData) setFormData(expenseData); }, [expenseData]);

  const handleDeleteItem = async (reportId: string, itemId: string) => {
    await deleteExpenseReportItem(reportId, itemId);
    queryClient.invalidateQueries({
      queryKey: ["expenses", expenseId]
    });
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await approveExpenseReport(expenseId!);
      queryClient.invalidateQueries({
        queryKey: ["expenses", expenseId]
      });
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
      queryClient.invalidateQueries({
        queryKey: ["expenses", expenseId]
      });
      setRejectOpen(false);
      toast({ title: "Expense report rejected." });
    } catch {
      toast({ title: "Rejection failed", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleClone = () => {
    if (!formData) return;
    navigate("/expenses/add", {
      state: {
        clone: {
          title: `Copy of ${formData.title}`,
          expenses: formData.expenses.map(({ _id, ...item }) => item),
        },
      },
    });
  };

  const handleDelete = async () => {
    try {
      await deleteExpense(expenseId!);
      navigate("/expenses");
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  if (isLoading) return <LoadingSpinner loading />;
  if (error || !formData) return <div className="p-4 text-sm text-destructive">Could not load expense report.</div>;

  const canDeleteItem = hasPerm('expenses:edit');
  const approvalStatus = formData.approvalStatus ?? (formData.approved ? "approved" : "pending");
  const approvalEnabled = isApprovalEnabled("expenses");
  const isPending = approvalStatus === "pending";
  const isRejected = approvalStatus === "rejected";
  const canEdit = hasPerm('expenses:edit') || !approvalEnabled || isRejected;
  const userCanApprove = canUserApprove("expenses", user!.role, perms);

  const menuItems: DetailMenuItem[] = [
    { label: "Clone", icon: <Copy className="h-3.5 w-3.5 me-2" />, onClick: handleClone },
  ];
  if (userCanApprove && approvalStatus === "approved") {
    menuItems.push({ label: "Reject", icon: <XCircle className="h-3.5 w-3.5 me-2" />, onClick: () => setRejectOpen(true), destructive: true, separatorBefore: true });
  }
  if (canDelete) {
    menuItems.push({ label: "Delete", icon: <Trash2 className="h-3.5 w-3.5 me-2" />, onClick: () => setConfirmOpen(true), destructive: true, separatorBefore: true });
  }

  const header = (
    <DetailHeader
      crumbs={[{ label: "Expenses", href: "/expenses" }, { label: formData.title }]}
      title={formData.title}
      badges={approvalEnabled ? <ApprovalBadge status={approvalStatus} rejectionReason={formData.rejectionReason} /> : undefined}
      primaryAction={
        <Button size="sm" className="gap-1" disabled={!canEdit} title={isPending ? "Pending approval — cannot edit." : undefined} onClick={() => canEdit && navigate(`/expenses/${expenseId}/edit`)}>
          <Edit className="h-3.5 w-3.5" />Edit
        </Button>
      }
      menuItems={menuItems}
    />
  );

  const contextPanel = expenseId ? (
    <RecordContextPanel
      linkedTo={expenseId}
      linkedModel="Expense"
      filesModel="ExpenseReport"
      showActivities={false}
      approvalsContent={approvalEnabled ? (
        <ApprovalStepsTimeline
          entityType="ExpenseReport"
          entityId={expenseId}
          embedded
          outcome={{
            status: approvalStatus,
            actorName: typeof formData.approvedBy === "object" ? formData.approvedBy?.name : undefined,
            actedAt: formData.approvedAt,
            reason: approvalStatus === "rejected" ? formData.rejectionReason : undefined,
          }}
        />
      ) : undefined}
    />
  ) : undefined;

  return (
    <DetailPageLayout header={header} contextPanel={contextPanel}>
      {/* Approval pending banner */}
      {approvalEnabled && isPending && (
        <div className="flex items-center gap-2.5 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700 px-4 py-3 text-amber-800 dark:text-amber-300">
          <Clock className="h-4 w-4 shrink-0" />
          <p className="text-sm">This expense report is awaiting approval. Editing is locked until approved or rejected.</p>
          {userCanApprove && (
            <div className="ms-auto flex gap-2">
              <Button size="sm" variant="outline" className="h-7 gap-1 text-green-600 border-green-300 hover:bg-green-50" onClick={handleApprove} disabled={actionLoading}>
                <CheckCircle className="h-3.5 w-3.5" />Approve
              </Button>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-destructive border-destructive/40 hover:bg-destructive/10" onClick={() => setRejectOpen(true)} disabled={actionLoading}>
                <XCircle className="h-3.5 w-3.5" />Reject
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Rejection banner */}
      {approvalEnabled && isRejected && (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/5 dark:bg-destructive/10 px-4 py-3 text-destructive">
          <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Expense report rejected</p>
            {formData.rejectionReason && <p className="text-xs mt-0.5 text-muted-foreground">{formData.rejectionReason}</p>}
            <p className="text-xs mt-1">Edit the report to fix the issues and it will be resubmitted for approval.</p>
          </div>
          {userCanApprove && (
            <Button size="sm" variant="outline" className="h-7 gap-1 text-green-600 border-green-300 hover:bg-green-50 shrink-0" onClick={handleApprove} disabled={actionLoading}>
              <CheckCircle className="h-3.5 w-3.5" />Approve anyway
            </Button>
          )}
        </div>
      )}

      <RejectDialog
        open={rejectOpen}
        onConfirm={handleReject}
        onCancel={() => setRejectOpen(false)}
        loading={actionLoading}
      />
      <ConfirmDialog
        open={confirmOpen}
        onConfirm={() => { setConfirmOpen(false); handleDelete(); }}
        onCancel={() => setConfirmOpen(false)}
        title="Delete Expense Report"
        description="Delete this expense report? This action cannot be undone."
      />

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Report Information</h2>
              <InfoRow label="Title" value={formData.title} />
              {formData.project && (
                <InfoRow label="Project">
                  <Link to={`/projects/${formData.project._id}`} className="text-sm text-blue-500 hover:underline">{formData.project.name}</Link>
                </InfoRow>
              )}
              {approvalEnabled && (
                <>
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
                </>
              )}
              <InfoRow label="Total">
                <span className="text-sm font-semibold">
                  {formData.expenses.reduce((t, i) => t + i.amount, 0).toLocaleString()}
                </span>
              </InfoRow>
              <AuditRows record={formData} createdByField={formData.userId} />
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
                  <TableHead className="">Date</TableHead>
                  <TableHead className="">Category</TableHead>
                  <TableHead>Beneficiary</TableHead>
                  {canDeleteItem && <TableHead><span className="sr-only">Actions</span></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {formData.expenses.map((expense) => (
                  <TableRow key={expense._id}>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell className="tabular-nums">{expense.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(expense.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="capitalize">{expense.category}</TableCell>
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
    </DetailPageLayout>
  );
};

export default ViewExpense;
