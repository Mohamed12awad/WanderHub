import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ApprovalStepsTimeline } from "@/components/common/ApprovalStepsTimeline";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSalesOrderById, approveSalesOrder, rejectSalesOrder,
  updateSalesOrderStatus, deleteSalesOrder, createInvoiceFromSalesOrder,
  getSalesOrderPurchaseOrderPrefill,
} from "@/utils/api";
import { DetailPageLayout } from "@/components/common/DetailPageLayout";
import { DetailHeader, DetailMenuItem } from "@/components/common/DetailHeader";
import { MetaGrid, MetaField } from "@/components/common/MetaGrid";
import { AuditRows } from "@/components/common/AuditRows";
import { RecordContextPanel } from "@/components/common/RecordContextPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, CheckCircle, XCircle, Clock, Receipt, ShoppingCart, Copy, Trash2, Ban } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/authContext";
import { useToast } from "@/components/ui/use-toast";
import LoadingSpinner from "@/components/common/spinner";
import { RejectDialog } from "@/components/common/RejectDialog";
import { ApprovalBadge } from "@/components/Finance/FinanceStatusBadge";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const perms: string[] = user?.permissions ?? [];
  const can = (p: string) => perms.includes("*") || perms.some((x) => x === p || x.startsWith(`${p}:`));

  const { data, isLoading } = useQuery({
    queryKey: ["sales-order", id],
    queryFn: () => getSalesOrderById(id!),
    enabled: !!id,
  });
  const so = data?.data;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["sales-order", id] });

  const canApprove = (user?.permissions ?? []).some((p) => p === '*' || p === 'sales-orders:approve');
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
          customerLabel: so.customer?.name ?? "",
          dealId: so.deal?._id ?? "",
          dealLabel: so.deal?.title ?? "",
          projectId: so.project?._id ?? "",
          projectLabel: so.project?.name ?? "",
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

  // One state-dependent primary action; everything else goes in the ⋮ menu.
  let primaryAction: React.ReactNode = null;
  if (transition && isEditable) {
    primaryAction = (
      <Button size="sm" onClick={() => statusMutation.mutate(transition.next)} disabled={statusMutation.isPending}>
        {transition.label}
      </Button>
    );
  } else if (canInvoice) {
    primaryAction = (
      <Button size="sm" className="gap-1" disabled={busy} onClick={handleCreateInvoice}>
        <Receipt className="h-3.5 w-3.5" />Create Invoice
      </Button>
    );
  } else if (isEditable) {
    primaryAction = (
      <Button size="sm" onClick={() => navigate(`/sales-orders/${id}/edit`)} className="gap-1">
        <Edit className="h-3.5 w-3.5" />{tr.common.edit}
      </Button>
    );
  }

  const menuItems: DetailMenuItem[] = [];
  if (isEditable && primaryAction !== null && transition) {
    // primary is the status transition → keep Edit accessible in the menu
    menuItems.push({ label: tr.common.edit, icon: <Edit className="h-3.5 w-3.5 me-2" />, onClick: () => navigate(`/sales-orders/${id}/edit`) });
  }
  if (canInvoice && transition) {
    menuItems.push({ label: "Create Invoice", icon: <Receipt className="h-3.5 w-3.5 me-2" />, onClick: handleCreateInvoice });
  }
  if (can("purchase-orders:create") && isEditable) {
    menuItems.push({ label: "Create PO", icon: <ShoppingCart className="h-3.5 w-3.5 me-2" />, onClick: handleCreatePO });
  }
  menuItems.push({ label: "Clone", icon: <Copy className="h-3.5 w-3.5 me-2" />, onClick: handleClone });
  if (isEditable) {
    menuItems.push({ label: "Cancel order", icon: <Ban className="h-3.5 w-3.5 me-2" />, onClick: () => statusMutation.mutate("cancelled") });
  }
  menuItems.push({ label: tr.common.delete, icon: <Trash2 className="h-3.5 w-3.5 me-2" />, onClick: () => setDeleteOpen(true), destructive: true, separatorBefore: true });

  const header = (
    <DetailHeader
      crumbs={[{ label: "Sales Orders", href: "/sales-orders" }, { label: so.orderNumber ?? so.title }]}
      title={<>{so.orderNumber} — {so.title}</>}
      badges={
        <>
          <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColor(so.status)}`}>{so.status}</span>
          <ApprovalBadge status={so.approvalStatus} />
        </>
      }
      primaryAction={primaryAction}
      menuItems={menuItems}
    />
  );

  const contextPanel = (
    <RecordContextPanel
      linkedTo={id!}
      linkedModel="SalesOrder"
      approvalsContent={<ApprovalStepsTimeline entityType="SalesOrder" entityId={id!} embedded />}
    />
  );

  return (
    <DetailPageLayout header={header} contextPanel={contextPanel}>
      <RejectDialog open={rejectOpen} onConfirm={handleReject} onCancel={() => setRejectOpen(false)} loading={busy} />
      <ConfirmDialog
        open={deleteOpen}
        onConfirm={() => {
          setDeleteOpen(false);
          void handleDelete();
        }}
        onCancel={() => setDeleteOpen(false)}
        title="Delete Sales Order"
        description="Delete this sales order? This action cannot be undone."
      />

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
        <CardHeader className="pb-3"><CardTitle className="text-base">Details</CardTitle></CardHeader>
        <CardContent>
          <MetaGrid>
            <MetaField label="Customer" value={so.customer?.name} />
            <MetaField label="Currency" value={so.currency} />
            {so.expectedDate && <MetaField label="Expected" value={new Date(so.expectedDate).toLocaleDateString()} />}
            {so.deal && <MetaField label="Deal" value={so.deal.title} />}
            {so.project && (
              <MetaField label="Project">
                <Link className="text-primary hover:underline" to={`/projects/${so.project._id}`}>{so.project.name}</Link>
              </MetaField>
            )}
            {so.fromQuote && (
              <MetaField label="From quote">
                <Link className="text-primary hover:underline" to={`/finance/quotes/${so.fromQuote._id}`}>{so.fromQuote.quoteNumber}</Link>
              </MetaField>
            )}
            {so.invoices?.length > 0 && (
              <MetaField label="Invoice">
                {so.invoices.map((inv: any) => (
                  <Link key={inv._id} className="text-primary hover:underline me-2" to={`/finance/invoices/${inv._id}`}>{inv.invoiceNumber}</Link>
                ))}
              </MetaField>
            )}
            <AuditRows record={so} variant="meta" />
          </MetaGrid>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Items</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Description</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Unit Price</TableHead><TableHead className="text-right">Disc %</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
            <TableBody>
              {(so.items ?? []).map((it: any, i: number) => (
                <TableRow key={it.id ?? it._id ?? i}>
                  <TableCell>{it.description}</TableCell>
                  <TableCell className="text-right tabular-nums">{it.quantity}</TableCell>
                  <TableCell className="text-right tabular-nums">{it.unitPrice?.toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">{it.discount ?? 0}</TableCell>
                  <TableCell className="text-right tabular-nums">{it.total?.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-end border-t p-4">
            <div className="w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums text-foreground">{so.subtotal?.toLocaleString()} {so.currency}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax ({so.taxRate}%)</span>
                <span className="tabular-nums text-foreground">{so.tax?.toLocaleString()} {so.currency}</span>
              </div>
              <div className="flex items-baseline justify-between border-t pt-2">
                <span className="text-sm font-medium">Total</span>
                <span className="text-xl font-bold tabular-nums">{so.total?.toLocaleString()} {so.currency}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {so.notes && (
        <Card>
          <CardContent className="pt-4 text-sm">
            <span className="text-muted-foreground">Notes: </span>{so.notes}
          </CardContent>
        </Card>
      )}
    </DetailPageLayout>
  );
}
