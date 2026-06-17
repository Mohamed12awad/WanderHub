import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ApprovalStepsTimeline } from "@/components/common/ApprovalStepsTimeline";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPurchaseOrderById, approvePurchaseOrder, rejectPurchaseOrder,
  updatePurchaseOrderStatus, deletePurchaseOrder, createBillFromPO, receivePurchaseOrder,
} from "@/utils/api";
import { DetailPageLayout } from "@/components/common/DetailPageLayout";
import { DetailHeader, DetailMenuItem } from "@/components/common/DetailHeader";
import { MetaGrid, MetaField } from "@/components/common/MetaGrid";
import { AuditRows } from "@/components/common/AuditRows";
import { RecordContextPanel } from "@/components/common/RecordContextPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, CheckCircle, XCircle, Clock, Receipt, Copy, Trash2, PackageCheck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/authContext";
import { useToast } from "@/components/ui/use-toast";
import LoadingSpinner from "@/components/common/spinner";
import { RejectDialog } from "@/components/common/RejectDialog";
import { ProcurementStatusBadge } from "../statusBadge";
import { ApprovalBadge } from "@/components/Finance/FinanceStatusBadge";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

const NEXT_STATUS: Record<string, { next: string; label: string }> = {
  draft: { next: "sent", label: "Mark as Sent" },
  sent: { next: "confirmed", label: "Mark as Confirmed" },
  confirmed: { next: "received", label: "Mark as Received" },
};

export default function ViewPurchaseOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { tr } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["purchase-order", id],
    queryFn: () => getPurchaseOrderById(id!),
    enabled: !!id
  });
  const po = data?.data;

  const refresh = () => queryClient.invalidateQueries({
    queryKey: ["purchase-order", id]
  });

  const canApprove = (user?.permissions ?? []).some((p) => p === '*' || p === 'purchase-orders:approve');
  const isPending = po?.approvalStatus === "pending";
  const isRejected = po?.approvalStatus === "rejected";

  const statusMutation = useMutation({
    mutationFn: (status: string) => updatePurchaseOrderStatus(id!, status),
    onSuccess: () => { refresh(); toast({ title: "Status updated" }); },
    onError: () => { toast({ title: "Failed to update status.", variant: "destructive" }); }
  });

  const handleApprove = async () => {
    setBusy(true);
    try { await approvePurchaseOrder(id!); refresh(); toast({ title: "Purchase order approved" }); }
    catch (e: any) { toast({ title: e?.response?.data?.message ?? "Approval failed", variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const handleReject = async (reason: string) => {
    setBusy(true);
    try { await rejectPurchaseOrder(id!, reason); setRejectOpen(false); refresh(); toast({ title: "Purchase order rejected" }); }
    catch (e: any) { toast({ title: e?.response?.data?.message ?? "Rejection failed", variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const handleReceive = async () => {
    setBusy(true);
    try {
      await receivePurchaseOrder(id!);
      refresh();
      toast({ title: "Received into stock — inventory and GRNI posted." });
    } catch (e: any) {
      toast({ title: e?.response?.data?.message ?? "Failed to receive purchase order.", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const handleCreateBill = async () => {
    setBusy(true);
    try {
      const res = await createBillFromPO(id!);
      toast({ title: "Vendor bill created from PO." });
      navigate(`/procurement/bills/${res.data._id}`);
    } catch (e: any) {
      toast({ title: e?.response?.data?.message ?? "Failed to create bill.", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const handleClone = () => {
    if (!po) return;
    navigate("/procurement/purchase-orders/new", {
      state: {
        clone: {
          supplierId: typeof po.supplier === "object" ? po.supplier?._id : po.supplier,
          currency: po.currency,
          taxRate: po.taxRate,
          notes: po.notes ?? "",
          status: "draft",
          items: (po.items ?? []).map(({ description, quantity, unitPrice, discount }: any) => ({
            description, quantity, unitPrice, discount: discount ?? 0,
          })),
        },
      },
    });
  };

  const handleDelete = async () => {
    try { await deletePurchaseOrder(id!); navigate("/procurement/purchase-orders"); }
    catch { toast({ title: "Delete failed", variant: "destructive" }); }
  };

  if (isLoading) return <LoadingSpinner loading />;
  if (!po) return <div className="p-6 text-sm text-muted-foreground">Purchase order not found.</div>;

  const supplierName = typeof po.supplier === "object" ? po.supplier?.name : po.supplier;
  const transition = NEXT_STATUS[po.status];
  const canBill = po.status === "received" && po.approvalStatus === "approved";
  const canReceive = po.approvalStatus === "approved" && po.status !== "received";

  const primaryAction: React.ReactNode = canReceive ? (
      <Button size="sm" className="gap-1" disabled={busy} onClick={handleReceive}>
        <PackageCheck className="h-3.5 w-3.5" />Receive
      </Button>
    ) : transition ? (
      <Button size="sm" onClick={() => statusMutation.mutate(transition.next)} disabled={statusMutation.isPending}>
        {transition.label}
      </Button>
    ) : canBill ? (
      <Button size="sm" className="gap-1" disabled={busy} onClick={handleCreateBill}>
        <Receipt className="h-3.5 w-3.5" />Create Bill
      </Button>
    ) : (
      <Button size="sm" className="gap-1" onClick={() => navigate(`/procurement/purchase-orders/${id}/edit`)}>
        <Edit className="h-3.5 w-3.5" />{tr.common.edit}
      </Button>
    );

  const menuItems: DetailMenuItem[] = [];
  if (transition || canBill || canReceive) {
    menuItems.push({ label: tr.common.edit, icon: <Edit className="h-3.5 w-3.5 me-2" />, onClick: () => navigate(`/procurement/purchase-orders/${id}/edit`) });
  }
  // When Receive takes the primary slot, keep the status transition reachable.
  if (canReceive && transition) {
    menuItems.push({ label: transition.label, icon: <Clock className="h-3.5 w-3.5 me-2" />, onClick: () => statusMutation.mutate(transition.next) });
  }
  if (canBill && transition) {
    menuItems.push({ label: "Create Bill", icon: <Receipt className="h-3.5 w-3.5 me-2" />, onClick: handleCreateBill });
  }
  menuItems.push({ label: "Clone", icon: <Copy className="h-3.5 w-3.5 me-2" />, onClick: handleClone });
  menuItems.push({ label: tr.common.delete, icon: <Trash2 className="h-3.5 w-3.5 me-2" />, onClick: () => setDeleteOpen(true), destructive: true, separatorBefore: true });

  const header = (
    <DetailHeader
      crumbs={[{ label: "Purchase Orders", href: "/procurement/purchase-orders" }, { label: po.poNumber ?? po.title }]}
      title={<>{po.poNumber} — {po.title}</>}
      badges={<><ProcurementStatusBadge status={po.status} /><ApprovalBadge status={po.approvalStatus} /></>}
      primaryAction={primaryAction}
      menuItems={menuItems}
    />
  );

  const contextPanel = (
    <RecordContextPanel
      linkedTo={id!}
      linkedModel="PurchaseOrder"
      approvalsContent={<ApprovalStepsTimeline entityType="PurchaseOrder" entityId={id!} embedded />}
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
        title="Delete Purchase Order"
        description="Delete this purchase order? This action cannot be undone."
      />
      {isPending && (
        <div className="flex items-center gap-2.5 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700 px-4 py-3 text-amber-800 dark:text-amber-300">
          <Clock className="h-4 w-4 shrink-0" />
          <p className="text-sm">This purchase order is awaiting approval.</p>
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
            <p className="text-sm font-medium">Purchase order rejected</p>
            {po.rejectionReason && <p className="text-xs mt-0.5 text-muted-foreground">{po.rejectionReason}</p>}
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Details</CardTitle></CardHeader>
        <CardContent>
          <MetaGrid>
            <MetaField label="Supplier" value={supplierName} />
            <MetaField label="Currency" value={po.currency} />
            {po.expectedDeliveryDate && <MetaField label="Expected" value={new Date(po.expectedDeliveryDate).toLocaleDateString()} />}
            <AuditRows record={po} createdByField={po.createdBy} variant="meta" />
          </MetaGrid>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Items</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Description</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Unit Price</TableHead><TableHead className="text-right">Disc %</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
            <TableBody>
              {(po.items ?? []).map((it: any, i: number) => (
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
                <span className="tabular-nums text-foreground">{po.subtotal?.toLocaleString()} {po.currency}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax ({po.taxRate}%)</span>
                <span className="tabular-nums text-foreground">{po.tax?.toLocaleString()} {po.currency}</span>
              </div>
              <div className="flex items-baseline justify-between border-t pt-2">
                <span className="text-sm font-medium">Total</span>
                <span className="text-xl font-bold tabular-nums">{po.total?.toLocaleString()} {po.currency}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {po.notes && (
        <Card>
          <CardContent className="pt-4 text-sm">
            <span className="text-muted-foreground">Notes: </span>{po.notes}
          </CardContent>
        </Card>
      )}
    </DetailPageLayout>
  );
}
