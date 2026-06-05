import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ApprovalStepsTimeline } from "@/components/common/ApprovalStepsTimeline";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSalesOrderById, approveSalesOrder, rejectSalesOrder,
  updateSalesOrderStatus, deleteSalesOrder, createInvoiceFromSalesOrder,
  getSalesOrderPurchaseOrderPrefill, getNotes, getActivities,
} from "@/utils/api";
import { RecordTimeline } from "@/components/common/RecordTimeline";
import { NotesPanel } from "@/components/common/NotesPanel";
import { AttachmentsPanel } from "@/components/common/AttachmentsPanel";
import { ActivityList } from "@/components/Activities/ActivityList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CircleArrowLeft, Edit, CheckCircle, XCircle, Clock, MoreVertical, Receipt, ShoppingCart, Copy } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/authContext";
import { useToast } from "@/components/ui/use-toast";
import LoadingSpinner from "@/components/common/spinner";
import { RejectDialog } from "@/components/common/RejectDialog";
import { ApprovalBadge } from "@/components/Finance/FinanceStatusBadge";

const NEXT_STATUS: Record<string, { next: string; label: string }> = {
  draft: { next: "confirmed", label: "Mark as Confirmed" },
  confirmed: { next: "fulfilled", label: "Mark as Fulfilled" },
};

function statusColor(status: string) {
  switch (status) {
    case "draft": return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    case "confirmed": return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400";
    case "fulfilled": return "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400";
    case "invoiced": return "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400";
    case "cancelled": return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400";
    default: return "bg-gray-100 text-gray-700";
  }
}

export default function ViewSalesOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { tr } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const perms: string[] = user?.permissions ?? [];
  const can = (p: string) => perms.includes("*") || perms.some((x) => x === p || x.startsWith(`${p}:`));

  const { data, isLoading } = useQuery({
    queryKey: ["sales-order", id],
    queryFn: () => getSalesOrderById(id!),
    enabled: !!id,
  });
  const so = data?.data;

  const { data: notesData } = useQuery({
    queryKey: ["notes", id, "SalesOrder"],
    queryFn: () => getNotes({ linkedTo: id!, linkedModel: "SalesOrder" }),
    enabled: !!id,
  });
  const { data: activitiesData } = useQuery({
    queryKey: ["activities", id],
    queryFn: () => getActivities(id!, "SalesOrder"),
    enabled: !!id,
  });
  const notesCount = ((notesData?.data) as any[])?.length ?? 0;
  const activitiesCount = ((activitiesData?.data) as any[])?.length ?? 0;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["sales-order", id] });

  const canApprove = ["admin", "super admin", "manager"].includes(user?.role ?? "");
  const isPending = so?.approvalStatus === "pending";
  const isRejected = so?.approvalStatus === "rejected";

  const statusMutation = useMutation({
    mutationFn: (status: string) => updateSalesOrderStatus(id!, status),
    onSuccess: () => { refresh(); toast({ title: "Status updated" }); },
    onError: (e: any) => { toast({ title: e?.response?.data?.message ?? "Failed to update status.", variant: "destructive" }); },
  });

  const handleApprove = async () => {
    setBusy(true);
    try { await approveSalesOrder(id!); refresh(); toast({ title: "Sales order approved" }); }
    catch (e: any) { toast({ title: e?.response?.data?.message ?? "Approval failed", variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const handleReject = async (reason: string) => {
    setBusy(true);
    try { await rejectSalesOrder(id!, reason); setRejectOpen(false); refresh(); toast({ title: "Sales order rejected" }); }
    catch (e: any) { toast({ title: e?.response?.data?.message ?? "Rejection failed", variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const handleCreateInvoice = async () => {
    setBusy(true);
    try {
      const res = await createInvoiceFromSalesOrder(id!);
      toast({ title: "Invoice created from sales order." });
      navigate(`/finance/invoices/${res.data._id}`);
    } catch (e: any) {
      toast({ title: e?.response?.data?.message ?? "Failed to create invoice.", variant: "destructive" });
    } finally { setBusy(false); }
  };

  // Prefill (does NOT create) a purchase order with the items we can't fulfil
  // from stock. The user picks a supplier and saves on the PO form.
  const handleCreatePO = async () => {
    setBusy(true);
    try {
      const res = await getSalesOrderPurchaseOrderPrefill(id!);
      const prefill = res.data;
      navigate("/procurement/purchase-orders/new", {
        state: {
          clone: {
            currency: prefill.currency,
            taxRate: 0,
            notes: `Purchase order for sales order ${prefill.salesOrderNumber}`,
            status: "draft",
            items: prefill.items.map((it: any) => ({
              description: it.description,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              discount: it.discount ?? 0,
              productId: it.productId,
            })),
          },
        },
      });
    } catch (e: any) {
      toast({ title: e?.response?.data?.message ?? "Failed to prepare purchase order.", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this sales order?")) return;
    try { await deleteSalesOrder(id!); navigate("/sales-orders"); }
    catch { toast({ title: "Delete failed", variant: "destructive" }); }
  };

  // Prefill a brand-new sales order from this one (allowed regardless of status).
  const handleClone = () => {
    if (!so) return;
    navigate("/sales-orders/new", {
      state: {
        clone: {
          title: `Copy of ${so.title}`,
          customerId: so.customer?._id ?? "",
          dealId: so.deal?._id ?? "",
          projectId: so.project?._id ?? "",
          currency: so.currency,
          taxRate: so.taxRate,
          notes: so.notes ?? "",
          terms: so.terms ?? "",
          items: (so.items ?? []).map(({ description, quantity, unitPrice, discount, productId }: any) => ({
            description, quantity, unitPrice, discount: discount ?? 0, productId,
          })),
        },
      },
    });
  };

  if (isLoading) return <LoadingSpinner loading />;
  if (!so) return <div className="p-6 text-sm text-muted-foreground">Sales order not found.</div>;

  const transition = NEXT_STATUS[so.status];
  const canInvoice = so.approvalStatus === "approved" && ["confirmed", "fulfilled"].includes(so.status);
  const isEditable = !["invoiced", "cancelled"].includes(so.status);

  return (
    <main className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <ApprovalStepsTimeline entityType="SalesOrder" entityId={id!} />
      <RejectDialog open={rejectOpen} onConfirm={handleReject} onCancel={() => setRejectOpen(false)} loading={busy} />

      {isPending && (
        <div className="flex items-center gap-2.5 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700 px-4 py-3 text-amber-800 dark:text-amber-300">
          <Clock className="h-4 w-4 shrink-0" />
          <p className="text-sm">This sales order is awaiting approval.</p>
          {canApprove && (
            <div className="ms-auto flex gap-2">
              <Button size="sm" variant="outline" className="h-7 gap-1 text-green-600 border-green-300 hover:bg-green-50" onClick={handleApprove} disabled={busy}>
                <CheckCircle className="h-3.5 w-3.5" />Approve
              </Button>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-destructive border-destructive/40 hover:bg-destructive/10" onClick={() => setRejectOpen(true)} disabled={busy}>
                <XCircle className="h-3.5 w-3.5" />Reject
              </Button>
            </div>
          )}
        </div>
      )}
      {isRejected && (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-destructive">
          <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">Sales order rejected</p>
            {so.rejectionReason && <p className="text-xs mt-0.5 text-muted-foreground">{so.rejectionReason}</p>}
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <CardTitle className="flex items-center gap-3 flex-wrap">
            <Link to="/sales-orders"><CircleArrowLeft /></Link>
            {so.orderNumber} — {so.title}
            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColor(so.status)}`}>{so.status}</span>
            <ApprovalBadge status={so.approvalStatus} />
          </CardTitle>
          <div className="flex gap-2 items-center">
            {transition && isEditable && (
              <Button size="sm" onClick={() => statusMutation.mutate(transition.next)} disabled={statusMutation.isPending}>
                {transition.label}
              </Button>
            )}
            {canInvoice && (
              <Button size="sm" variant="outline" className="gap-1" disabled={busy} onClick={handleCreateInvoice}>
                <Receipt className="h-3.5 w-3.5" />Create Invoice
              </Button>
            )}
            {can("purchase-orders:create") && isEditable && (
              <Button size="sm" variant="outline" className="gap-1" disabled={busy} onClick={handleCreatePO} title="Create a purchase order from this sales order">
                <ShoppingCart className="h-3.5 w-3.5" />Create PO
              </Button>
            )}
            {isEditable && (
              <Link to={`/sales-orders/${id}/edit`}>
                <Button size="sm" variant="outline"><Edit className="h-3.5 w-3.5 me-1" />{tr.common.edit}</Button>
              </Link>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button size="sm" variant="outline" className="h-8 w-8 p-0"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleClone}>
                  <Copy className="h-3.5 w-3.5 me-2" />Clone
                </DropdownMenuItem>
                {isEditable && (
                  <DropdownMenuItem onClick={() => statusMutation.mutate("cancelled")}>Cancel order</DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={handleDelete}>{tr.common.delete}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-3 text-sm">
          <div><span className="text-muted-foreground">Customer:</span> {so.customer?.name}</div>
          <div><span className="text-muted-foreground">Currency:</span> {so.currency}</div>
          {so.expectedDate && <div><span className="text-muted-foreground">Expected:</span> {new Date(so.expectedDate).toLocaleDateString()}</div>}
          {so.deal && <div><span className="text-muted-foreground">Deal:</span> {so.deal.title}</div>}
          {so.project && <div><span className="text-muted-foreground">Project:</span> <Link className="text-primary hover:underline" to={`/projects/${so.project._id}`}>{so.project.name}</Link></div>}
          {so.fromQuote && (
            <div><span className="text-muted-foreground">From quote:</span>{" "}
              <Link className="text-primary hover:underline" to={`/finance/quotes/${so.fromQuote._id}`}>{so.fromQuote.quoteNumber}</Link>
            </div>
          )}
          {so.invoices?.length > 0 && (
            <div><span className="text-muted-foreground">Invoice:</span>{" "}
              {so.invoices.map((inv: any) => (
                <Link key={inv._id} className="text-primary hover:underline me-2" to={`/finance/invoices/${inv._id}`}>{inv.invoiceNumber}</Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Items</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Description</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Unit Price</TableHead><TableHead className="text-right">Disc %</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
            <TableBody>
              {(so.items ?? []).map((it: any, i: number) => (
                <TableRow key={i}>
                  <TableCell>{it.description}</TableCell>
                  <TableCell className="text-right tabular-nums">{it.quantity}</TableCell>
                  <TableCell className="text-right tabular-nums">{it.unitPrice?.toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">{it.discount ?? 0}</TableCell>
                  <TableCell className="text-right tabular-nums">{it.total?.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-end p-4">
            <div className="text-sm space-y-1 text-right">
              <div className="text-muted-foreground">Subtotal: <span className="text-foreground tabular-nums">{so.subtotal?.toLocaleString()} {so.currency}</span></div>
              <div className="text-muted-foreground">Tax ({so.taxRate}%): <span className="text-foreground tabular-nums">{so.tax?.toLocaleString()} {so.currency}</span></div>
              <div className="font-semibold text-base">Total: <span className="tabular-nums">{so.total?.toLocaleString()} {so.currency}</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {so.notes && <Card><CardContent className="pt-4 text-sm"><span className="text-muted-foreground">Notes: </span>{so.notes}</CardContent></Card>}

      <Card>
        <CardContent className="py-5">
          <Tabs defaultValue="timeline">
            <TabsList className="mb-4 flex-wrap h-auto">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="notes">Notes{notesCount > 0 && ` (${notesCount})`}</TabsTrigger>
              <TabsTrigger value="activities">Activities{activitiesCount > 0 && ` (${activitiesCount})`}</TabsTrigger>
              <TabsTrigger value="attachments">Attachments</TabsTrigger>
            </TabsList>
            <TabsContent value="timeline">
              <RecordTimeline linkedTo={id!} linkedModel="SalesOrder" />
            </TabsContent>
            <TabsContent value="notes">
              <NotesPanel linkedTo={id!} linkedModel="SalesOrder" />
            </TabsContent>
            <TabsContent value="activities">
              <ActivityList linkedTo={id!} linkedModel="SalesOrder" />
            </TabsContent>
            <TabsContent value="attachments">
              <AttachmentsPanel linkedModel="SalesOrder" linkedToId={id!} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  );
}
