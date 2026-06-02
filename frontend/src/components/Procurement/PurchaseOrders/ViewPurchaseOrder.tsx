import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPurchaseOrderById, approvePurchaseOrder, rejectPurchaseOrder,
  updatePurchaseOrderStatus, deletePurchaseOrder, createBillFromPO,
  getNotes, getActivities,
} from "@/utils/api";
import { RecordTimeline } from "@/components/common/RecordTimeline";
import { NotesPanel } from "@/components/common/NotesPanel";
import { ActivityList } from "@/components/Activities/ActivityList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CircleArrowLeft, Edit, CheckCircle, XCircle, Clock, MoreVertical, Receipt } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/authContext";
import { useToast } from "@/components/ui/use-toast";
import LoadingSpinner from "@/components/common/spinner";
import { RejectDialog } from "@/components/common/RejectDialog";
import { ProcurementStatusBadge } from "../statusBadge";
import { ApprovalBadge } from "@/components/Finance/FinanceStatusBadge";

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
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["purchase-order", id],
    queryFn: () => getPurchaseOrderById(id!),
    enabled: !!id
  });
  const po = data?.data;

  const { data: notesData }      = useQuery({
    queryKey: ["notes", id, "PurchaseOrder"],
    queryFn: () => getNotes({ linkedTo: id!, linkedModel: "PurchaseOrder" }),
    enabled: !!id
  });
  const { data: activitiesData } = useQuery({
    queryKey: ["activities", id],
    queryFn: () => getActivities(id!, "PurchaseOrder"),
    enabled: !!id
  });
  const notesCount      = ((notesData?.data)      as any[])?.length ?? 0;
  const activitiesCount = ((activitiesData?.data) as any[])?.length ?? 0;

  const refresh = () => queryClient.invalidateQueries({
    queryKey: ["purchase-order", id]
  });

  const canApprove = ["admin", "super admin", "manager"].includes(user?.role ?? "");
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

  const handleDelete = async () => {
    if (!confirm("Delete this purchase order?")) return;
    try { await deletePurchaseOrder(id!); navigate("/procurement/purchase-orders"); }
    catch { toast({ title: "Delete failed", variant: "destructive" }); }
  };

  if (isLoading) return <LoadingSpinner loading />;
  if (!po) return <div className="p-6 text-sm text-muted-foreground">Purchase order not found.</div>;

  const supplierName = typeof po.supplier === "object" ? po.supplier?.name : po.supplier;
  const transition = NEXT_STATUS[po.status];

  return (
    <main className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <RejectDialog open={rejectOpen} onConfirm={handleReject} onCancel={() => setRejectOpen(false)} loading={busy} />
      {/* Approval banners */}
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
        <CardHeader className="flex flex-row items-start justify-between">
          <CardTitle className="flex items-center gap-3 flex-wrap">
            <Link to="/procurement/purchase-orders"><CircleArrowLeft /></Link>
            {po.poNumber} — {po.title}
            <ProcurementStatusBadge status={po.status} />
            <ApprovalBadge status={po.approvalStatus} />
          </CardTitle>
          <div className="flex gap-2 items-center">
            {transition && (
              <Button size="sm" onClick={() => statusMutation.mutate(transition.next)} disabled={statusMutation.isPending}>
                {transition.label}
              </Button>
            )}
            {po.status === "received" && po.approvalStatus === "approved" && (
              <Button size="sm" variant="outline" className="gap-1" disabled={busy} onClick={async () => {
                setBusy(true);
                try {
                  const res = await createBillFromPO(id!);
                  toast({ title: "Vendor bill created from PO." });
                  navigate(`/procurement/bills/${res.data._id}`);
                } catch (e: any) {
                  toast({ title: e?.response?.data?.message ?? "Failed to create bill.", variant: "destructive" });
                } finally { setBusy(false); }
              }}>
                <Receipt className="h-3.5 w-3.5" />Create Bill
              </Button>
            )}
            <Link to={`/procurement/purchase-orders/${id}/edit`}>
              <Button size="sm" variant="outline"><Edit className="h-3.5 w-3.5 me-1" />{tr.common.edit}</Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button size="sm" variant="outline" className="h-8 w-8 p-0"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-destructive" onClick={handleDelete}>{tr.common.delete}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-3 text-sm">
          <div><span className="text-muted-foreground">Supplier:</span> {supplierName}</div>
          <div><span className="text-muted-foreground">Currency:</span> {po.currency}</div>
          {po.expectedDeliveryDate && <div><span className="text-muted-foreground">Expected:</span> {new Date(po.expectedDeliveryDate).toLocaleDateString()}</div>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Items</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Description</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Unit Price</TableHead><TableHead className="text-right">Disc %</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
            <TableBody>
              {(po.items ?? []).map((it: any, i: number) => (
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
              <div className="text-muted-foreground">Subtotal: <span className="text-foreground tabular-nums">{po.subtotal?.toLocaleString()} {po.currency}</span></div>
              <div className="text-muted-foreground">Tax ({po.taxRate}%): <span className="text-foreground tabular-nums">{po.tax?.toLocaleString()} {po.currency}</span></div>
              <div className="font-semibold text-base">Total: <span className="tabular-nums">{po.total?.toLocaleString()} {po.currency}</span></div>
            </div>
          </div>
        </CardContent>
      </Card>
      {po.notes && <Card><CardContent className="pt-4 text-sm"><span className="text-muted-foreground">Notes: </span>{po.notes}</CardContent></Card>}
      <Card>
        <CardContent className="py-5">
          <Tabs defaultValue="timeline">
            <TabsList className="mb-4 flex-wrap h-auto">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="notes">Notes{notesCount > 0 && ` (${notesCount})`}</TabsTrigger>
              <TabsTrigger value="activities">Activities{activitiesCount > 0 && ` (${activitiesCount})`}</TabsTrigger>
            </TabsList>
            <TabsContent value="timeline">
              <RecordTimeline linkedTo={id!} linkedModel="PurchaseOrder" />
            </TabsContent>
            <TabsContent value="notes">
              <NotesPanel linkedTo={id!} linkedModel="PurchaseOrder" />
            </TabsContent>
            <TabsContent value="activities">
              <ActivityList linkedTo={id!} linkedModel="PurchaseOrder" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  );
}
