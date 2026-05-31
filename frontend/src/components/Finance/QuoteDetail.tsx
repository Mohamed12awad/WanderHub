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
import { CircleArrowLeft, Edit, ArrowRightLeft, CheckCircle, XCircle, Printer, Clock, MoreHorizontal, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "react-query";
import { getQuoteById, deleteQuote, convertQuoteToInvoice, approveQuote, rejectQuote, getActivities } from "@/utils/api";
import { ActivityList } from "@/components/Activities/ActivityList";
import { FinanceStatusBadge, ApprovalBadge } from "./FinanceStatusBadge";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import LoadingSpinner from "@/components/common/spinner";
import { Quote } from "@/types/types";
import { RejectDialog } from "@/components/common/RejectDialog";
import { NotesPanel } from "@/components/common/NotesPanel";
import { RecordTimeline } from "@/components/common/RecordTimeline";
import { useApprovalConfig } from "@/hooks/useApprovalConfig";
import { useAuth } from "@/contexts/authContext";

const InfoRow: React.FC<{ label: string; value?: string | number | React.ReactNode }> = ({ label, value }) => (
  <div className="grid grid-cols-2 mb-2">
    <Label className="my-1 font-medium">{label}</Label>
    <p className="my-1">{value ?? "—"}</p>
  </div>
);

const QuoteDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { tr } = useLanguage();
  const { user } = useAuth();
  const f = tr.finance;
  const [converting, setConverting] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const isAdmin = ["admin", "super admin"].includes(user!.role);
  const canDelete = isAdmin;
  const { isApprovalEnabled, canUserApprove } = useApprovalConfig();
  const { data, isLoading } = useQuery(["quotes", id], () => getQuoteById(id!));
  const quote: Quote | undefined = data?.data;
  const { data: activitiesData } = useQuery(["activities", id], () => getActivities(id!, "Quote"), { enabled: !!id });
  const activitiesCount = ((activitiesData?.data) as any[])?.length ?? 0;

  if (isLoading) return <LoadingSpinner loading />;
  if (!quote) return <div className="p-4">Quote not found.</div>;

  const approvalEnabled = isApprovalEnabled("quotes");
  const approvalStatus = quote.approvalStatus;
  const isPending = approvalStatus === "pending";
  const isRejected = approvalStatus === "rejected";
  const canEdit = isAdmin || !approvalEnabled || isRejected;
  const canConvert = isAdmin || !approvalEnabled || approvalStatus === "approved";
  const userCanApprove = canUserApprove("quotes", user!.role);

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
        <CardHeader className="flex flex-row items-start justify-between print:hidden">
          <CardTitle className="flex items-center gap-3">
            <Link to="/finance/quotes"><CircleArrowLeft /></Link>
            {quote.quoteNumber} — {quote.title}
          </CardTitle>
          <div className="flex gap-2 items-center">
            <Link to={canEdit ? `/finance/quotes/${id}/edit` : "#"}>
              <Button size="sm" variant="outline" className="h-8 px-4" disabled={!canEdit} title={isPending ? "Pending approval — cannot edit." : undefined}>
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
              <h1 className="text-2xl font-bold">Quote</h1>
              <p className="text-sm text-gray-500 mt-1">{quote.quoteNumber}</p>
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold">{quote.customer.name}</p>
              {quote.validUntil && <p className="text-gray-500">Valid until: {new Date(quote.validUntil).toLocaleDateString()}</p>}
            </div>
          </div>
        </div>

        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Quote Information</h2>
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
              {approvalEnabled && <InfoRow label="Approval" value={<ApprovalBadge status={quote.approvalStatus} rejectionReason={quote.rejectionReason} />} />}
              <InfoRow label={f.currency} value={quote.currency} />
              <InfoRow label={f.validUntil} value={quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : "—"} />
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
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.unitPrice.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.discount}%</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{item.total.toLocaleString()} {quote.currency}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end mt-4">
            <div className="w-72 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{f.subtotal}</span>
                <span className="font-medium tabular-nums">{quote.subtotal.toLocaleString()} {quote.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{f.taxRate}</span>
                <span className="tabular-nums">{quote.taxRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{f.tax}</span>
                <span className="tabular-nums">{quote.tax.toLocaleString()} {quote.currency}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>{f.total}</span>
                <span className="text-base tabular-nums">{quote.total.toLocaleString()} {quote.currency}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="print:hidden">
        <CardContent className="py-5">
          <Tabs defaultValue="timeline">
            <TabsList className="mb-4">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="activities">Activities{activitiesCount > 0 && ` (${activitiesCount})`}</TabsTrigger>
            </TabsList>
            <TabsContent value="timeline">
              <RecordTimeline linkedTo={id!} linkedModel="Quote" />
            </TabsContent>
            <TabsContent value="notes">
              <NotesPanel linkedTo={id!} linkedModel="Quote" />
            </TabsContent>
            <TabsContent value="activities">
              <ActivityList linkedTo={id!} linkedModel="Quote" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  );
};

export default QuoteDetail;
