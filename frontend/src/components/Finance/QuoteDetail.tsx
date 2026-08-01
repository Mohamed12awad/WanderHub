import React, { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ApprovalStepsTimeline } from "@/components/common/ApprovalStepsTimeline";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Edit, ArrowRightLeft, CheckCircle, XCircle, Printer, Clock, Trash2, Copy } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getQuoteById, deleteQuote, convertQuoteToInvoice, convertQuoteToSalesOrder, approveQuote, rejectQuote } from "@/utils/api";
import { FinanceStatusBadge, ApprovalBadge } from "./FinanceStatusBadge";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import LoadingSpinner from "@/components/common/spinner";
import { Quote } from "@/types/types";
import { RejectDialog } from "@/components/common/RejectDialog";
import { DetailPageLayout } from "@/components/common/DetailPageLayout";
import { DetailHeader, DetailMenuItem } from "@/components/common/DetailHeader";
import { RecordContextPanel } from "@/components/common/RecordContextPanel";
import { useApprovalConfig } from "@/hooks/useApprovalConfig";
import { useAuth } from "@/contexts/authContext";
import { InfoRow } from "@/components/common/InfoRow";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

const QuoteDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { tr, formatCurrency, formatDate, formatNumber } = useLanguage();
  const { user } = useAuth();
  const f = tr.finance;
  const [converting, setConverting] = useState(false);
  const [convertingSO, setConvertingSO] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const perms = user?.permissions ?? [];
  const hasPerm = (p: string) => perms.includes('*') || perms.includes(p);
  const canDelete = hasPerm('quotes:delete');
  const { isApprovalEnabled, canUserApprove } = useApprovalConfig();
  const { data, isLoading } = useQuery({
    queryKey: ["quotes", id],
    queryFn: () => getQuoteById(id!)
  });
  const quote: Quote | undefined = data?.data;

  if (isLoading) return <LoadingSpinner loading />;
  if (!quote) return <div className="p-4">Quote not found.</div>;

  const approvalEnabled = isApprovalEnabled("quotes");
  const approvalStatus = quote.approvalStatus;
  const isPending = approvalStatus === "pending";
  const isRejected = approvalStatus === "rejected";
  const canEdit = hasPerm('quotes:edit') || !approvalEnabled || isRejected;
  const canConvert = hasPerm('quotes:edit') || !approvalEnabled || approvalStatus === "approved";
  const userCanApprove = user ? canUserApprove("quotes", user.role, perms) : false;

  const handleConvert = async () => {
    setConverting(true);
    try {
      const res = await convertQuoteToInvoice(id!);
      queryClient.invalidateQueries({ queryKey: ["quotes", id] });
      toast({ title: "Converted to invoice successfully." });
      navigate(`/finance/invoices/${res.data._id}`);
    } catch {
      toast({ title: "Conversion failed", variant: "destructive" });
    } finally {
      setConverting(false);
    }
  };

  const handleConvertToSalesOrder = async () => {
    setConvertingSO(true);
    try {
      const res = await convertQuoteToSalesOrder(id!);
      queryClient.invalidateQueries({ queryKey: ["quotes", id] });
      toast({ title: "Converted to sales order successfully." });
      navigate(`/sales-orders/${res.data._id}`);
    } catch (e: any) {
      toast({ title: e?.response?.data?.message ?? "Conversion failed", variant: "destructive" });
    } finally {
      setConvertingSO(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await approveQuote(id!);
      queryClient.invalidateQueries({ queryKey: ["quotes", id] });
      toast({ title: "Quote approved." });
    } catch {
      toast({ title: "Approval failed", variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  const handleReject = async (reason: string) => {
    setActionLoading(true);
    try {
      await rejectQuote(id!, reason);
      queryClient.invalidateQueries({ queryKey: ["quotes", id] });
      setRejectOpen(false);
      toast({ title: "Quote rejected." });
    } catch {
      toast({ title: "Rejection failed", variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  const handleClone = () => {
    if (!quote) return;
    navigate("/finance/quotes/new", {
      state: {
        clone: {
          title: `Copy of ${quote.title}`,
          customer: quote.customer._id,
          deal: quote.deal?._id ?? "none",
          currency: quote.currency,
          taxRate: quote.taxRate,
          notes: quote.notes ?? "",
          terms: quote.terms ?? "",
          validUntil: "",
          status: "draft",
          items: quote.items.map(({ description, quantity, unitPrice, discount }: any) => ({
            description, quantity, unitPrice, discount,
          })),
        },
      },
    });
  };

  const handleDelete = async () => {
    try {
      await deleteQuote(id!);
      navigate("/finance/quotes");
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  // Primary action: convert to invoice when possible, otherwise edit.
  let primaryAction: React.ReactNode = undefined;
  if (!quote.convertedToInvoice) {
    primaryAction = (
      <Button size="sm" className="gap-1" onClick={handleConvert} disabled={converting || !canConvert} title={!canConvert ? "Approve the quote before converting." : undefined}>
        <ArrowRightLeft className="h-3.5 w-3.5" />
        {converting ? "Converting…" : f.convertToInvoice}
      </Button>
    );
  } else if (canEdit) {
    primaryAction = (
      <Button size="sm" className="gap-1" onClick={() => navigate(`/finance/quotes/${id}/edit`)}>
        <Edit className="h-3.5 w-3.5" />Edit
      </Button>
    );
  }

  const menuItems: DetailMenuItem[] = [];
  if (!quote.convertedToInvoice && canEdit) {
    menuItems.push({ label: "Edit", icon: <Edit className="h-3.5 w-3.5 me-2" />, onClick: () => navigate(`/finance/quotes/${id}/edit`) });
  }
  if (quote.convertedToInvoice) {
    menuItems.push({ label: `${f.alreadyConverted}: ${quote.convertedToInvoice.invoiceNumber}`, icon: <ArrowRightLeft className="h-3.5 w-3.5 me-2" />, onClick: () => navigate(`/finance/invoices/${quote.convertedToInvoice!._id}`) });
  }
  if (!quote.salesOrder) {
    menuItems.push({ label: convertingSO ? "Converting…" : "Convert to Sales Order", icon: <ArrowRightLeft className="h-3.5 w-3.5 me-2" />, onClick: handleConvertToSalesOrder });
  } else {
    menuItems.push({ label: `Sales Order: ${quote.salesOrder.orderNumber}`, icon: <ArrowRightLeft className="h-3.5 w-3.5 me-2" />, onClick: () => navigate(`/sales-orders/${quote.salesOrder!._id}`) });
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
        crumbs={[{ label: "Quotes", href: "/finance/quotes" }, { label: quote.quoteNumber }]}
        title={<>{quote.quoteNumber} — {quote.title}</>}
        badges={
          <>
            <FinanceStatusBadge status={quote.status} type="quote" />
            {approvalEnabled && <ApprovalBadge status={quote.approvalStatus} rejectionReason={quote.rejectionReason} />}
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
      linkedModel="Quote"
      approvalsContent={approvalEnabled ? <ApprovalStepsTimeline entityType="Quote" entityId={id!} embedded /> : undefined}
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
        title="Delete Quote"
        description="Delete this quote? This action cannot be undone."
      />

      {/* Approval pending banner */}
      {approvalEnabled && isPending && (
        <div className="flex items-center gap-2.5 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700 px-4 py-3 text-amber-800 dark:text-amber-300 print:hidden">
          <Clock className="h-4 w-4 shrink-0" />
          <p className="text-sm">This quote is awaiting approval. Editing and conversion are locked until approved.</p>
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
            <p className="text-sm font-medium">Quote rejected</p>
            {quote.rejectionReason && <p className="text-xs mt-0.5 text-muted-foreground">{quote.rejectionReason}</p>}
            <p className="text-xs mt-1">Edit the quote to fix the issues and it will be resubmitted for approval.</p>
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
              <h1 className="text-2xl font-bold">Quote</h1>
              <p className="text-sm text-gray-500 mt-1">{quote.quoteNumber}</p>
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold">{quote.customer.name}</p>
              {quote.validUntil && <p className="text-gray-500">Valid until: {formatDate(quote.validUntil)}</p>}
            </div>
          </div>
        </div>

        <CardContent className="pt-6">
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Quote Information</h2>
              <InfoRow label={f.quoteNumber} value={quote.quoteNumber} />
              <InfoRow label={f.customer} value={
                <Link to={`/customers/${quote.customer._id}`} className="text-primary hover:underline">
                  {quote.customer.name}
                </Link>
              } />
              <InfoRow label="Deal" value={
                quote.deal ? (
                  <Link to={`/deals/${quote.deal._id}`} className="text-primary hover:underline">{quote.deal.title}</Link>
                ) : "—"
              } />
              <InfoRow label={f.currency} value={quote.currency} />
              <InfoRow label={f.validUntil} value={quote.validUntil ? formatDate(quote.validUntil) : "—"} />
            </section>
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Notes & Terms</h2>
              {quote.notes ? (
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-1">{f.notes}</p>
                  <p className="text-sm whitespace-pre-wrap">{quote.notes}</p>
                </div>
              ) : null}
              {quote.terms ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">{f.terms}</p>
                  <p className="text-sm whitespace-pre-wrap">{quote.terms}</p>
                </div>
              ) : null}
              {!quote.notes && !quote.terms && (
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
                {quote.items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell dir="auto">{item.description}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(item.unitPrice)}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.discount}%</TableCell>
                    <TableCell dir="auto" className="text-right tabular-nums font-medium">{formatCurrency(item.total, quote.currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end mt-4">
            <div className="w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>{f.subtotal}</span>
                <span className="tabular-nums text-foreground">{formatCurrency(quote.subtotal, quote.currency)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{f.taxRate}</span>
                <span className="tabular-nums text-foreground">{quote.taxRate}%</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{f.tax}</span>
                <span className="tabular-nums text-foreground">{formatCurrency(quote.tax, quote.currency)}</span>
              </div>
              <div className="flex items-baseline justify-between border-t pt-2">
                <span className="text-sm font-medium">{f.total}</span>
                <span className="text-xl font-bold tabular-nums">{formatCurrency(quote.total, quote.currency)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </DetailPageLayout>
  );
};

export default QuoteDetail;
