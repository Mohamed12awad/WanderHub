import React, { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { CircleArrowLeft, Edit, ArrowRightLeft, CheckCircle, XCircle } from "lucide-react";
import { useQuery, useQueryClient } from "react-query";
import { getQuoteById, deleteQuote, convertQuoteToInvoice, approveQuote, rejectQuote } from "@/utils/api";
import { FinanceStatusBadge, ApprovalBadge } from "./FinanceStatusBadge";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import LoadingSpinner from "@/components/common/spinner";
import { Quote } from "@/types/types";
import { RejectDialog } from "@/components/common/RejectDialog";
import { PermissionGate } from "@/components/common/PermissionGate";
import { useApprovalConfig } from "@/hooks/useApprovalConfig";

const InfoRow: React.FC<{ label: string; value?: string | number | React.ReactNode }> = ({ label, value }) => (
  <div className="grid grid-cols-2 mb-2">
    <Label className="my-1 text-muted-foreground">{label}</Label>
    <p className="my-1">{value ?? "—"}</p>
  </div>
);

const QuoteDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { tr } = useLanguage();
  const f = tr.finance;
  const [converting, setConverting] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const { isApprovalEnabled } = useApprovalConfig();
  const { data, isLoading } = useQuery(["quotes", id], () => getQuoteById(id!));
  const quote: Quote | undefined = data?.data;

  if (isLoading) return <LoadingSpinner loading />;
  if (!quote) return <div className="p-4">Quote not found.</div>;

  const approvalEnabled = isApprovalEnabled("quotes");
  const canEdit = !approvalEnabled || quote.approvalStatus === "approved" || quote.approvalStatus === "rejected";
  const canConvert = !approvalEnabled || quote.approvalStatus === "approved";

  const handleConvert = async () => {
    setConverting(true);
    try {
      const res = await convertQuoteToInvoice(id!);
      queryClient.invalidateQueries(["quotes", id]);
      toast({ title: "Converted to invoice successfully." });
      navigate(`/finance/invoices/${res.data._id}`);
    } catch {
      toast({ title: "Conversion failed", variant: "destructive" });
    } finally {
      setConverting(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await approveQuote(id!);
      queryClient.invalidateQueries(["quotes", id]);
      toast({ title: "Quote approved." });
    } catch {
      toast({ title: "Approval failed", variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  const handleReject = async (reason: string) => {
    setActionLoading(true);
    try {
      await rejectQuote(id!, reason);
      queryClient.invalidateQueries(["quotes", id]);
      setRejectOpen(false);
      toast({ title: "Quote rejected." });
    } catch {
      toast({ title: "Rejection failed", variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this quote?")) return;
    try {
      await deleteQuote(id!);
      navigate("/finance/quotes");
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  return (
    <main className="p-4">
      <RejectDialog
        open={rejectOpen}
        onConfirm={handleReject}
        onCancel={() => setRejectOpen(false)}
        loading={actionLoading}
      />
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <CardTitle className="flex items-center gap-3">
            <Link to="/finance/quotes"><CircleArrowLeft /></Link>
            {quote.quoteNumber} — {quote.title}
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            <PermissionGate require="finance:approve">
              {quote.approvalStatus !== "approved" && (
                <Button size="sm" variant="outline" className="h-8 gap-1 text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20" onClick={handleApprove} disabled={actionLoading}>
                  <CheckCircle className="h-3.5 w-3.5" />Approve
                </Button>
              )}
              {quote.approvalStatus !== "rejected" && (
                <Button size="sm" variant="outline" className="h-8 gap-1 text-destructive border-destructive/40 hover:bg-destructive/10" onClick={() => setRejectOpen(true)} disabled={actionLoading}>
                  <XCircle className="h-3.5 w-3.5" />Reject
                </Button>
              )}
            </PermissionGate>
            <Link to={canEdit ? `/finance/quotes/${id}/edit` : "#"}>
              <Button size="sm" variant="outline" className="h-8 px-4" disabled={!canEdit} title={!canEdit ? "Pending approval — cannot edit." : undefined}>
                <Edit className="h-3.5 w-3.5 me-1" />Edit
              </Button>
            </Link>
            {!quote.convertedToInvoice ? (
              <Button size="sm" className="h-8 px-4" onClick={handleConvert} disabled={converting || !canConvert} title={!canConvert ? "Approve the quote before converting." : undefined}>
                <ArrowRightLeft className="h-3.5 w-3.5 me-1" />
                {converting ? "Converting…" : f.convertToInvoice}
              </Button>
            ) : (
              <Link to={`/finance/invoices/${quote.convertedToInvoice._id}`}>
                <Button size="sm" variant="outline" className="h-8 px-4">
                  {f.alreadyConverted}: {quote.convertedToInvoice.invoiceNumber}
                </Button>
              </Link>
            )}
            <Button size="sm" variant="destructive" className="h-8 px-4" onClick={handleDelete}>
              {tr.common.delete}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <section>
              <h2 className="font-semibold mb-3">Quote Information</h2>
              <InfoRow label={f.quoteNumber} value={quote.quoteNumber} />
              <InfoRow label={f.customer} value={
                <Link to={`/customers/${quote.customer._id}`} className="text-blue-500">
                  {quote.customer.name}
                </Link>
              } />
              <InfoRow label="Deal" value={
                quote.deal ? (
                  <Link to={`/deals/${quote.deal._id}`} className="text-blue-500">{quote.deal.title}</Link>
                ) : "—"
              } />
              <InfoRow label={f.status} value={<FinanceStatusBadge status={quote.status} type="quote" />} />
              <InfoRow label="Approval" value={<ApprovalBadge status={quote.approvalStatus} rejectionReason={quote.rejectionReason} />} />
              <InfoRow label={f.currency} value={quote.currency} />
              <InfoRow label={f.validUntil} value={quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : "—"} />
              <InfoRow label={f.notes} value={quote.notes} />
              <InfoRow label={f.terms} value={quote.terms} />
            </section>
            <section>
              <h2 className="font-semibold mb-3">Totals</h2>
              <InfoRow label={f.subtotal} value={`${quote.subtotal.toLocaleString()} ${quote.currency}`} />
              <InfoRow label={f.taxRate} value={`${quote.taxRate}%`} />
              <InfoRow label={f.tax} value={`${quote.tax.toLocaleString()} ${quote.currency}`} />
              <InfoRow label={f.total} value={
                <span className="font-semibold text-lg">
                  {quote.total.toLocaleString()} {quote.currency}
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
              {quote.items.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.unitPrice.toLocaleString()}</TableCell>
                  <TableCell>{item.discount}%</TableCell>
                  <TableCell className="text-right">{item.total.toLocaleString()} {quote.currency}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
};

export default QuoteDetail;
