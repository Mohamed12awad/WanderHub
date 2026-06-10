import React, { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ApprovalStepsTimeline } from "@/components/common/ApprovalStepsTimeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Edit, Trash2, CheckCircle, XCircle, Pencil, Printer, Clock, Copy, Send } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getInvoiceById, deleteInvoice, deleteInvoicePayment, approveInvoice, rejectInvoice, sendInvoice } from "@/utils/api";
import { FinanceStatusBadge, ApprovalBadge } from "./FinanceStatusBadge";
import { RejectDialog } from "@/components/common/RejectDialog";
import RecordPaymentDialog from "./RecordPaymentDialog";
import { DetailPageLayout } from "@/components/common/DetailPageLayout";
import { DetailHeader, DetailMenuItem } from "@/components/common/DetailHeader";
import { RecordContextPanel } from "@/components/common/RecordContextPanel";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import LoadingSpinner from "@/components/common/spinner";
import { Invoice, InvoicePayment } from "@/types/types";
import { useAuth } from "@/contexts/authContext";
import { useApprovalConfig } from "@/hooks/useApprovalConfig";
import { InfoRow } from "@/components/common/InfoRow";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { tr } = useLanguage();
  const { user } = useAuth();
  const f = tr.finance;

  const perms = user?.permissions ?? [];
  const hasPerm = (p: string) => perms.includes('*') || perms.includes(p);
  const canDelete = hasPerm('invoices:delete');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [editingPayment, setEditingPayment] = useState<InvoicePayment | null>(null);
  const { isApprovalEnabled, canUserApprove } = useApprovalConfig();

  const { data, isLoading } = useQuery({
    queryKey: ["invoices", id],
    queryFn: () => getInvoiceById(id!)
  });
  const invoice: Invoice | undefined = data?.data?.invoice;
  const payments: InvoicePayment[] = data?.data?.payments ?? [];

  if (isLoading) return <LoadingSpinner loading />;
  if (!invoice) return <div className="p-4">Invoice not found.</div>;

  const outstanding = invoice.total - invoice.totalPaid;
  const approvalEnabled = isApprovalEnabled("invoices");
  const approvalStatus = invoice.approvalStatus;
  const isPending = approvalStatus === "pending";
  const isRejected = approvalStatus === "rejected";
  const canEdit = hasPerm('invoices:edit') || !approvalEnabled || isRejected;
  const isPaid = outstanding <= 0;
  const canRecordPayment = !isPaid && (hasPerm('invoices:create') || !approvalEnabled || approvalStatus === "approved");
  const userCanApprove = canUserApprove("invoices", user!.role, perms);

  const handleSend = async () => {
    setActionLoading(true);
    try {
      await sendInvoice(id!);
      queryClient.invalidateQueries({ queryKey: ["invoices", id] });
      toast({ title: "Invoice marked as sent." });
    } catch {
      toast({ title: "Failed to mark as sent.", variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await approveInvoice(id!);
      queryClient.invalidateQueries({ queryKey: ["invoices", id] });
      toast({ title: "Invoice approved." });
    } catch {
      toast({ title: "Approval failed", variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  const handleReject = async (reason: string) => {
    setActionLoading(true);
    try {
      await rejectInvoice(id!, reason);
      queryClient.invalidateQueries({ queryKey: ["invoices", id] });
      setRejectOpen(false);
      toast({ title: "Invoice rejected." });
    } catch {
      toast({ title: "Rejection failed", variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  const handleClone = () => {
    if (!invoice) return;
    navigate("/finance/invoices/new", {
      state: {
        clone: {
          title: `Copy of ${invoice.title}`,
          customer: invoice.customer._id,
          deal: invoice.deal?._id ?? "none",
          currency: invoice.currency,
          taxRate: invoice.taxRate,
          notes: invoice.notes ?? "",
          terms: invoice.terms ?? "",
          status: "draft",
          items: invoice.items.map(({ description, quantity, unitPrice, discount }: any) => ({
            description, quantity, unitPrice, discount,
          })),
        },
      },
    });
  };

  const handleDelete = async () => {
    try {
      await deleteInvoice(id!);
      navigate("/finance/invoices");
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      await deleteInvoicePayment(id!, paymentId);
      queryClient.invalidateQueries({ queryKey: ["invoices", id] });
      toast({ title: "Payment deleted." });
    } catch {
      toast({ title: "Failed to delete payment", variant: "destructive" });
    }
  };

  // Action hierarchy: one primary action by state, the rest in the ⋮ menu.
  const primaryAction = !isPaid ? (
    <RecordPaymentDialog
      invoiceId={id!}
      currency={invoice.currency}
      outstanding={Math.max(0, outstanding)}
      disabled={!canRecordPayment}
      disabledTitle={!canRecordPayment ? "Approve the invoice before recording payment." : undefined}
      onSuccess={() => queryClient.invalidateQueries({ queryKey: ["invoices", id] })}
    />
  ) : canEdit ? (
    <Button size="sm" className="gap-1" onClick={() => navigate(`/finance/invoices/${id}/edit`)}>
      <Edit className="h-3.5 w-3.5" />Edit
    </Button>
  ) : undefined;

  const menuItems: DetailMenuItem[] = [];
  if (!isPaid && canEdit) {
    menuItems.push({ label: "Edit", icon: <Edit className="h-3.5 w-3.5 me-2" />, onClick: () => navigate(`/finance/invoices/${id}/edit`) });
  }
  if (invoice.status === "draft" && approvalStatus === "approved") {
    menuItems.push({ label: "Mark as Sent", icon: <Send className="h-3.5 w-3.5 me-2" />, onClick: handleSend });
  }
  menuItems.push({ label: "Clone", icon: <Copy className="h-3.5 w-3.5 me-2" />, onClick: handleClone });
  menuItems.push({ label: "Print", icon: <Printer className="h-3.5 w-3.5 me-2" />, onClick: () => window.print() });
  if (userCanApprove && approvalStatus === "approved") {
    menuItems.push({ label: "Reject", icon: <XCircle className="h-3.5 w-3.5 me-2" />, onClick: () => setRejectOpen(true), destructive: true, separatorBefore: true });
  }
  if (canDelete) {
    menuItems.push({ label: tr.common.delete, icon: <Trash2 className="h-3.5 w-3.5 me-2" />, onClick: () => setDeleteOpen(true), destructive: true, separatorBefore: true });
  }

  const header = (
    <div className="print:hidden">
      <DetailHeader
        crumbs={[{ label: "Invoices", href: "/finance/invoices" }, { label: invoice.invoiceNumber }]}
        title={<>{invoice.invoiceNumber} — {invoice.title}</>}
        badges={
          <>
            <FinanceStatusBadge status={invoice.status} type="invoice" />
            {approvalEnabled && <ApprovalBadge status={invoice.approvalStatus} rejectionReason={invoice.rejectionReason} />}
          </>
        }
        primaryAction={primaryAction}
        menuItems={menuItems}
      />
    </div>
  );

  const contextPanel = (
    <RecordContextPanel
      linkedTo={id!}
      linkedModel="Invoice"
      approvalsContent={approvalEnabled ? <ApprovalStepsTimeline entityType="Invoice" entityId={id!} embedded /> : undefined}
    />
  );

  return (
    <DetailPageLayout header={header} contextPanel={contextPanel}>
      <RejectDialog
        open={rejectOpen}
        onConfirm={handleReject}
        onCancel={() => setRejectOpen(false)}
        loading={actionLoading}
      />
      <ConfirmDialog
        open={deleteOpen}
        onConfirm={() => { setDeleteOpen(false); void handleDelete(); }}
        onCancel={() => setDeleteOpen(false)}
        title="Delete Invoice"
        description="Delete this invoice and all its payments? This action cannot be undone."
      />
      <ConfirmDialog
        open={deletePaymentId !== null}
        onConfirm={() => {
          const paymentId = deletePaymentId;
          setDeletePaymentId(null);
          if (paymentId) void handleDeletePayment(paymentId);
        }}
        onCancel={() => setDeletePaymentId(null)}
        title="Delete Payment"
        description="Delete this payment? This action cannot be undone."
      />

      {/* Approval pending banner */}
      {approvalEnabled && isPending && (
        <div className="flex items-center gap-2.5 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700 px-4 py-3 text-amber-800 dark:text-amber-300 print:hidden">
          <Clock className="h-4 w-4 shrink-0" />
          <p className="text-sm">This invoice is awaiting approval. Editing and recording payment are locked until approved.</p>
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
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/5 dark:bg-destructive/10 px-4 py-3 text-destructive print:hidden">
          <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Invoice rejected</p>
            {invoice.rejectionReason && <p className="text-xs mt-0.5 text-muted-foreground">{invoice.rejectionReason}</p>}
            <p className="text-xs mt-1">Edit the invoice to fix the issues and it will be resubmitted for approval.</p>
          </div>
          {userCanApprove && (
            <Button size="sm" variant="outline" className="h-7 gap-1 text-green-600 border-green-300 hover:bg-green-50 shrink-0" onClick={handleApprove} disabled={actionLoading}>
              <CheckCircle className="h-3.5 w-3.5" />Approve anyway
            </Button>
          )}
        </div>
      )}

      <Card>
        {/* Print-only header */}
        <div className="hidden print:block px-6 pt-6 pb-2 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">Invoice</h1>
              <p className="text-sm text-gray-500 mt-1">{invoice.invoiceNumber}</p>
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold">{invoice.customer.name}</p>
              <p className="text-gray-500">Issued: {new Date(invoice.issueDate).toLocaleDateString()}</p>
              {invoice.dueDate && <p className="text-gray-500">Due: {new Date(invoice.dueDate).toLocaleDateString()}</p>}
            </div>
          </div>
        </div>

        <CardContent className="pt-6">
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Invoice Information</h2>
              <InfoRow label={f.invoiceNumber} value={invoice.invoiceNumber} />
              <InfoRow label={f.customer} value={
                <Link to={`/customers/${invoice.customer._id}`} className="text-primary hover:underline">
                  {invoice.customer.name}
                </Link>
              } />
              <InfoRow label="Deal" value={
                invoice.deal ? (
                  <Link to={`/deals/${invoice.deal._id}`} className="text-primary hover:underline">{invoice.deal.title}</Link>
                ) : "—"
              } />
              {invoice.project && (
                <InfoRow label="Project" value={
                  <Link to={`/projects/${invoice.project._id}`} className="text-primary hover:underline">{invoice.project.name}</Link>
                } />
              )}
              {invoice.quote && (
                <InfoRow label="From Quote" value={
                  <Link to={`/finance/quotes/${invoice.quote._id}`} className="text-primary hover:underline">
                    {invoice.quote.quoteNumber}
                  </Link>
                } />
              )}
              <InfoRow label={f.currency} value={invoice.currency} />
              {invoice.exchangeRate != null && (
                <InfoRow label="Exchange Rate" value={`${invoice.exchangeRate.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${invoice.currency}`} />
              )}
              <InfoRow label={f.issueDate} value={new Date(invoice.issueDate).toLocaleDateString()} />
              <InfoRow label={f.dueDate} value={invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "—"} />
            </section>
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Notes & Terms</h2>
              {invoice.notes ? (
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-1">{f.notes}</p>
                  <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              ) : null}
              {invoice.terms ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">{f.terms}</p>
                  <p className="text-sm whitespace-pre-wrap">{invoice.terms}</p>
                </div>
              ) : null}
              {!invoice.notes && !invoice.terms && (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </section>
          </div>

          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{f.items}</h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{f.description}</TableHead>
                  <TableHead className="w-20 text-right">{f.quantity}</TableHead>
                  <TableHead className="w-28 text-right">{f.unitPrice}</TableHead>
                  <TableHead className="w-24 text-right">{f.discount}</TableHead>
                  <TableHead className="w-28 text-right">{f.itemTotal}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.unitPrice.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.discount}%</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{item.total.toLocaleString()} {invoice.currency}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end mt-4">
            <div className="w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>{f.subtotal}</span>
                <span className="tabular-nums text-foreground">{invoice.subtotal.toLocaleString()} {invoice.currency}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{f.taxRate}</span>
                <span className="tabular-nums text-foreground">{invoice.taxRate}%</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{f.tax}</span>
                <span className="tabular-nums text-foreground">{invoice.tax.toLocaleString()} {invoice.currency}</span>
              </div>
              <div className="flex items-baseline justify-between border-t pt-2">
                <span className="text-sm font-medium">{f.total}</span>
                <span className="text-xl font-bold tabular-nums">{invoice.total.toLocaleString()} {invoice.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{f.totalPaid}</span>
                <span className="text-green-600 font-medium tabular-nums">{invoice.totalPaid.toLocaleString()} {invoice.currency}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold">{f.outstanding}</span>
                <span className={`font-semibold tabular-nums ${outstanding > 0 ? "text-red-600" : "text-green-600"}`}>
                  {outstanding.toLocaleString()} {invoice.currency}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="text-base">{f.payments}</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-muted-foreground text-sm">{f.noPayments}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{f.paymentDate}</TableHead>
                  <TableHead className="text-right">{f.amount}</TableHead>
                  <TableHead className="">{f.paymentMethod}</TableHead>
                  <TableHead className="">{f.paymentReference}</TableHead>
                  <TableHead className="">Created By</TableHead>
                  <TableHead className="w-20"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p._id}>
                    <TableCell>{new Date(p.date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{p.amount.toLocaleString()} {p.currency}</TableCell>
                    <TableCell className="capitalize">
                      {f.paymentMethods[p.method] ?? p.method}
                    </TableCell>
                    <TableCell className="">{p.reference ?? "—"}</TableCell>
                    <TableCell className="">{p.createdBy?.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingPayment(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {canDelete && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletePaymentId(p._id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editingPayment && (
        <RecordPaymentDialog
          mode="edit"
          invoiceId={id!}
          currency={invoice.currency}
          payment={editingPayment}
          open={!!editingPayment}
          onOpenChange={(o) => { if (!o) setEditingPayment(null); }}
          onSuccess={() => {
            setEditingPayment(null);
            queryClient.invalidateQueries({ queryKey: ["invoices", id] });
          }}
        />
      )}
    </DetailPageLayout>
  );
};

export default InvoiceDetail;
