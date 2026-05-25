import React, { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { CircleArrowLeft, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";
import { useQuery, useQueryClient } from "react-query";
import { getInvoiceById, deleteInvoice, deleteInvoicePayment, approveInvoice, rejectInvoice } from "@/utils/api";
import { FinanceStatusBadge, ApprovalBadge } from "./FinanceStatusBadge";
import { RejectDialog } from "@/components/common/RejectDialog";
import { PermissionGate } from "@/components/common/PermissionGate";
import RecordPaymentDialog from "./RecordPaymentDialog";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import LoadingSpinner from "@/components/common/spinner";
import { Invoice, InvoicePayment } from "@/types/types";
import { useAuth } from "@/contexts/authContext";
import { useApprovalConfig } from "@/hooks/useApprovalConfig";

const InfoRow: React.FC<{ label: string; value?: string | number | React.ReactNode }> = ({ label, value }) => (
  <div className="grid grid-cols-2 mb-2">
    <Label className="my-1 text-muted-foreground">{label}</Label>
    <p className="my-1">{value ?? "—"}</p>
  </div>
);

const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { tr } = useLanguage();
  const { user } = useAuth();
  const f = tr.finance;

  const canDelete = ["admin", "super admin"].includes(user!.role);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const { isApprovalEnabled } = useApprovalConfig();

  const { data, isLoading } = useQuery(["invoices", id], () => getInvoiceById(id!));
  const invoice: Invoice | undefined = data?.data?.invoice;
  const payments: InvoicePayment[] = data?.data?.payments ?? [];

  if (isLoading) return <LoadingSpinner loading />;
  if (!invoice) return <div className="p-4">Invoice not found.</div>;

  const outstanding = invoice.total - invoice.totalPaid;
  const approvalEnabled = isApprovalEnabled("invoices");
  const canEdit = !approvalEnabled || invoice.approvalStatus === "approved" || invoice.approvalStatus === "rejected";
  const canRecordPayment = !approvalEnabled || invoice.approvalStatus === "approved";

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await approveInvoice(id!);
      queryClient.invalidateQueries(["invoices", id]);
      toast({ title: "Invoice approved." });
    } catch {
      toast({ title: "Approval failed", variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  const handleReject = async (reason: string) => {
    setActionLoading(true);
    try {
      await rejectInvoice(id!, reason);
      queryClient.invalidateQueries(["invoices", id]);
      setRejectOpen(false);
      toast({ title: "Invoice rejected." });
    } catch {
      toast({ title: "Rejection failed", variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this invoice and all its payments?")) return;
    try {
      await deleteInvoice(id!);
      navigate("/finance/invoices");
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm("Delete this payment?")) return;
    try {
      await deleteInvoicePayment(id!, paymentId);
      queryClient.invalidateQueries(["invoices", id]);
      toast({ title: "Payment deleted." });
    } catch {
      toast({ title: "Failed to delete payment", variant: "destructive" });
    }
  };

  return (
    <main className="p-4 space-y-5">
      <RejectDialog
        open={rejectOpen}
        onConfirm={handleReject}
        onCancel={() => setRejectOpen(false)}
        loading={actionLoading}
      />
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <CardTitle className="flex items-center gap-3">
            <Link to="/finance/invoices"><CircleArrowLeft /></Link>
            {invoice.invoiceNumber} — {invoice.title}
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            <PermissionGate require="finance:approve">
              {invoice.approvalStatus !== "approved" && (
                <Button size="sm" variant="outline" className="h-8 gap-1 text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20" onClick={handleApprove} disabled={actionLoading}>
                  <CheckCircle className="h-3.5 w-3.5" />Approve
                </Button>
              )}
              {invoice.approvalStatus !== "rejected" && (
                <Button size="sm" variant="outline" className="h-8 gap-1 text-destructive border-destructive/40 hover:bg-destructive/10" onClick={() => setRejectOpen(true)} disabled={actionLoading}>
                  <XCircle className="h-3.5 w-3.5" />Reject
                </Button>
              )}
            </PermissionGate>
            <Link to={canEdit ? `/finance/invoices/${id}/edit` : "#"}>
              <Button size="sm" variant="outline" className="h-8 px-4" disabled={!canEdit} title={!canEdit ? "Pending approval — cannot edit." : undefined}>
                <Edit className="h-3.5 w-3.5 me-1" />Edit
              </Button>
            </Link>
            <RecordPaymentDialog
              invoiceId={id!}
              currency={invoice.currency}
              disabled={!canRecordPayment}
              disabledTitle={!canRecordPayment ? "Approve the invoice before recording payment." : undefined}
              onSuccess={() => queryClient.invalidateQueries(["invoices", id])}
            />
            {canDelete && (
              <Button size="sm" variant="destructive" className="h-8 px-4" onClick={handleDelete}>
                {tr.common.delete}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <section>
              <h2 className="font-semibold mb-3">Invoice Information</h2>
              <InfoRow label={f.invoiceNumber} value={invoice.invoiceNumber} />
              <InfoRow label={f.customer} value={
                <Link to={`/customers/${invoice.customer._id}`} className="text-blue-500">
                  {invoice.customer.name}
                </Link>
              } />
              <InfoRow label="Deal" value={
                invoice.deal ? (
                  <Link to={`/deals/${invoice.deal._id}`} className="text-blue-500">{invoice.deal.title}</Link>
                ) : "—"
              } />
              {invoice.quote && (
                <InfoRow label="From Quote" value={
                  <Link to={`/finance/quotes/${invoice.quote._id}`} className="text-blue-500">
                    {invoice.quote.quoteNumber}
                  </Link>
                } />
              )}
              <InfoRow label={f.status} value={<FinanceStatusBadge status={invoice.status} type="invoice" />} />
              <InfoRow label="Approval" value={<ApprovalBadge status={invoice.approvalStatus} rejectionReason={invoice.rejectionReason} />} />
              <InfoRow label={f.currency} value={invoice.currency} />
              <InfoRow label={f.issueDate} value={new Date(invoice.issueDate).toLocaleDateString()} />
              <InfoRow label={f.dueDate} value={invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "—"} />
              <InfoRow label={f.notes} value={invoice.notes} />
              <InfoRow label={f.terms} value={invoice.terms} />
            </section>
            <section>
              <h2 className="font-semibold mb-3">Financial Summary</h2>
              <InfoRow label={f.subtotal} value={`${invoice.subtotal.toLocaleString()} ${invoice.currency}`} />
              <InfoRow label={f.taxRate} value={`${invoice.taxRate}%`} />
              <InfoRow label={f.tax} value={`${invoice.tax.toLocaleString()} ${invoice.currency}`} />
              <InfoRow label={f.total} value={
                <span className="font-semibold text-lg">
                  {invoice.total.toLocaleString()} {invoice.currency}
                </span>
              } />
              <InfoRow label={f.totalPaid} value={
                <span className="text-green-600 font-medium">
                  {invoice.totalPaid.toLocaleString()} {invoice.currency}
                </span>
              } />
              <InfoRow label={f.outstanding} value={
                <span className={outstanding > 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                  {outstanding.toLocaleString()} {invoice.currency}
                </span>
              } />
            </section>
          </div>

          <h2 className="font-semibold mb-3">{f.items}</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{f.description}</TableHead>
                <TableHead className="w-20">{f.quantity}</TableHead>
                <TableHead className="w-28">{f.unitPrice}</TableHead>
                <TableHead className="w-24">{f.discount}</TableHead>
                <TableHead className="w-28 text-right">{f.itemTotal}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.unitPrice.toLocaleString()}</TableCell>
                  <TableCell>{item.discount}%</TableCell>
                  <TableCell className="text-right">{item.total.toLocaleString()} {invoice.currency}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{f.payments}</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-muted-foreground text-sm">{f.noPayments}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{f.paymentDate}</TableHead>
                  <TableHead>{f.amount}</TableHead>
                  <TableHead className="hidden md:table-cell">{f.paymentMethod}</TableHead>
                  <TableHead className="hidden md:table-cell">{f.paymentReference}</TableHead>
                  <TableHead className="hidden md:table-cell">Created By</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p._id}>
                    <TableCell>{new Date(p.date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{p.amount.toLocaleString()} {p.currency}</TableCell>
                    <TableCell className="hidden md:table-cell capitalize">
                      {f.paymentMethods[p.method] ?? p.method}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{p.reference ?? "—"}</TableCell>
                    <TableCell className="hidden md:table-cell">{p.createdBy?.name}</TableCell>
                    {canDelete && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeletePayment(p._id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default InvoiceDetail;
