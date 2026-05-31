import React, { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CircleArrowLeft, Edit, Trash2, CheckCircle, XCircle, Pencil, Printer, Clock, MoreHorizontal } from "lucide-react";
import { useQuery, useQueryClient } from "react-query";
import { getInvoiceById, deleteInvoice, deleteInvoicePayment, approveInvoice, rejectInvoice } from "@/utils/api";
import { FinanceStatusBadge, ApprovalBadge } from "./FinanceStatusBadge";
import { RejectDialog } from "@/components/common/RejectDialog";
import RecordPaymentDialog from "./RecordPaymentDialog";
import { NotesPanel } from "@/components/common/NotesPanel";
import { RecordTimeline } from "@/components/common/RecordTimeline";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import LoadingSpinner from "@/components/common/spinner";
import { Invoice, InvoicePayment } from "@/types/types";
import { useAuth } from "@/contexts/authContext";
import { useApprovalConfig } from "@/hooks/useApprovalConfig";

const InfoRow: React.FC<{ label: string; value?: string | number | React.ReactNode }> = ({ label, value }) => (
  <div className="grid grid-cols-2 mb-2">
    <Label className="my-1 font-medium">{label}</Label>
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

  const isAdmin = ["admin", "super admin"].includes(user!.role);
  const canDelete = isAdmin;
  const [rejectOpen, setRejectOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [editingPayment, setEditingPayment] = useState<InvoicePayment | null>(null);
  const { isApprovalEnabled, canUserApprove } = useApprovalConfig();

  const { data, isLoading } = useQuery(["invoices", id], () => getInvoiceById(id!));
  const invoice: Invoice | undefined = data?.data?.invoice;
  const payments: InvoicePayment[] = data?.data?.payments ?? [];

  if (isLoading) return <LoadingSpinner loading />;
  if (!invoice) return <div className="p-4">Invoice not found.</div>;

  const outstanding = invoice.total - invoice.totalPaid;
  const approvalEnabled = isApprovalEnabled("invoices");
  const approvalStatus = invoice.approvalStatus;
  const isPending = approvalStatus === "pending";
  const isRejected = approvalStatus === "rejected";
  const canEdit = isAdmin || !approvalEnabled || isRejected;
  const isPaid = outstanding <= 0;
  const canRecordPayment = !isPaid && (isAdmin || !approvalEnabled || approvalStatus === "approved");
  const userCanApprove = canUserApprove("invoices", user!.role);

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
    <main className="p-4 max-w-7xl mx-auto space-y-5">
      <RejectDialog
        open={rejectOpen}
        onConfirm={handleReject}
        onCancel={() => setRejectOpen(false)}
        loading={actionLoading}
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
        <CardHeader className="flex flex-row items-start justify-between print:hidden">
          <CardTitle className="flex items-center gap-3">
            <Link to="/finance/invoices"><CircleArrowLeft /></Link>
            {invoice.invoiceNumber} — {invoice.title}
          </CardTitle>
          <div className="flex gap-2 items-center">
            <Link to={canEdit ? `/finance/invoices/${id}/edit` : "#"}>
              <Button size="sm" variant="outline" className="h-8 px-4" disabled={!canEdit} title={isPending ? "Pending approval — cannot edit." : undefined}>
                <Edit className="h-3.5 w-3.5 me-1" />Edit
              </Button>
            </Link>
            {!isPaid && (
              <RecordPaymentDialog
                invoiceId={id!}
                currency={invoice.currency}
                outstanding={Math.max(0, outstanding)}
                disabled={!canRecordPayment}
                disabledTitle={!canRecordPayment ? "Approve the invoice before recording payment." : undefined}
                onSuccess={() => queryClient.invalidateQueries(["invoices", id])}
              />
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">More actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => window.print()}>
                  <Printer className="h-3.5 w-3.5 me-2" />Print
                </DropdownMenuItem>
                {userCanApprove && approvalStatus === "approved" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setRejectOpen(true)} disabled={actionLoading} className="text-destructive focus:text-destructive">
                      <XCircle className="h-3.5 w-3.5 me-2" />Reject
                    </DropdownMenuItem>
                  </>
                )}
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                      <Trash2 className="h-3.5 w-3.5 me-2" />{tr.common.delete}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

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

        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Invoice Information</h2>
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
              {approvalEnabled && <InfoRow label="Approval" value={<ApprovalBadge status={invoice.approvalStatus} rejectionReason={invoice.rejectionReason} />} />}
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
            <div className="w-72 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{f.subtotal}</span>
                <span className="font-medium tabular-nums">{invoice.subtotal.toLocaleString()} {invoice.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{f.taxRate}</span>
                <span className="tabular-nums">{invoice.taxRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{f.tax}</span>
                <span className="tabular-nums">{invoice.tax.toLocaleString()} {invoice.currency}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>{f.total}</span>
                <span className="text-base tabular-nums">{invoice.total.toLocaleString()} {invoice.currency}</span>
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
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeletePayment(p._id)}>
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

      {/* Notes & Timeline */}
      <Card className="print:hidden">
        <CardContent className="py-5">
          <Tabs defaultValue="timeline">
            <TabsList className="mb-4">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>
            <TabsContent value="timeline">
              <RecordTimeline linkedTo={id!} linkedModel="Invoice" />
            </TabsContent>
            <TabsContent value="notes">
              <NotesPanel linkedTo={id!} linkedModel="Invoice" />
            </TabsContent>
          </Tabs>
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
            queryClient.invalidateQueries(["invoices", id]);
          }}
        />
      )}
    </main>
  );
};

export default InvoiceDetail;
