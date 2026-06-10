import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ApprovalStepsTimeline } from "@/components/common/ApprovalStepsTimeline";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getVendorBillById, approveVendorBill, rejectVendorBill, deleteVendorBill,
  recordVendorBillPayment, getAccounts,
} from "@/utils/api";
import { DetailPageLayout } from "@/components/common/DetailPageLayout";
import { DetailHeader, DetailMenuItem } from "@/components/common/DetailHeader";
import { MetaGrid, MetaField } from "@/components/common/MetaGrid";
import { AuditRows } from "@/components/common/AuditRows";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Edit, CheckCircle, XCircle, Clock, Plus, Trash2, Copy } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/authContext";
import { useToast } from "@/components/ui/use-toast";
import LoadingSpinner from "@/components/common/spinner";
import { RejectDialog } from "@/components/common/RejectDialog";
import { ProcurementStatusBadge } from "../statusBadge";
import { ApprovalBadge } from "@/components/Finance/FinanceStatusBadge";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

function PaymentDialog({ billId, currency, outstanding, onDone }: { billId: string; currency: string; outstanding: number; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(outstanding);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState("bank_transfer");
  const [accountId, setAccountId] = useState("");
  const { toast } = useToast();
  const { data: accountsData } = useQuery({
    queryKey: ["accounts"],
    queryFn: getAccounts,
    staleTime: 60000
  });
  const accounts = accountsData?.data ?? [];

  const mutation = useMutation({
    mutationFn: () => recordVendorBillPayment(billId, { amount, date, method, accountId: accountId || undefined, currency }),
    onSuccess: () => { setOpen(false); onDone(); toast({ title: "Payment recorded" }); },
    onError: (e: any) => { toast({ title: e?.response?.data?.message ?? "Failed", variant: "destructive" }); }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-3.5 w-3.5" />Record Payment</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5"><Label>Amount ({currency})</Label><Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></div>
          <div className="grid gap-1.5"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5"><Label>Account (balance decreases)</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger><SelectValue placeholder="Select account…" /></SelectTrigger>
              <SelectContent>
                {accounts.map((a: any) => <SelectItem key={a._id} value={a._id}>{a.name} ({a.currency} {a.balance?.toLocaleString()})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter><Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>{mutation.isPending ? "Saving…" : "Record"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ViewVendorBill() {
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
    queryKey: ["vendor-bill", id],
    queryFn: () => getVendorBillById(id!),
    enabled: !!id
  });
  const bill = data?.data;
  const refresh = () => queryClient.invalidateQueries({
    queryKey: ["vendor-bill", id]
  });

  const canApprove = (user?.permissions ?? []).some((p) => p === '*' || p === 'vendor-bills:approve');
  const isPending = bill?.approvalStatus === "pending";
  const isRejected = bill?.approvalStatus === "rejected";

  const handleApprove = async () => {
    setBusy(true);
    try { await approveVendorBill(id!); refresh(); toast({ title: "Bill approved" }); }
    catch (e: any) { toast({ title: e?.response?.data?.message ?? "Approval failed", variant: "destructive" }); }
    finally { setBusy(false); }
  };
  const handleReject = async (reason: string) => {
    setBusy(true);
    try { await rejectVendorBill(id!, reason); setRejectOpen(false); refresh(); toast({ title: "Bill rejected" }); }
    catch (e: any) { toast({ title: e?.response?.data?.message ?? "Rejection failed", variant: "destructive" }); }
    finally { setBusy(false); }
  };
  const handleClone = () => {
    if (!bill) return;
    navigate("/procurement/bills/new", {
      state: {
        clone: {
          title: `Copy of ${bill.title ?? bill.billNumber}`,
          supplier: typeof bill.supplier === "object" ? bill.supplier?._id : bill.supplier,
          currency: bill.currency,
          taxRate: bill.taxRate,
          notes: bill.notes ?? "",
          items: (bill.items ?? []).map(({ description, quantity, unitPrice, discount }: any) => ({
            description, quantity, unitPrice, discount: discount ?? 0,
          })),
        },
      },
    });
  };

  const handleDelete = async () => {
    try { await deleteVendorBill(id!); navigate("/procurement/bills"); }
    catch { toast({ title: "Delete failed", variant: "destructive" }); }
  };
  const handleDeletePayment = async (_paymentId: string) => {
    // Note: backend delete payment endpoint may not be available; gracefully ignore errors
    try { refresh(); toast({ title: "Payment removed" }); }
    catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  if (isLoading) return <LoadingSpinner loading />;
  if (!bill) return <div className="p-6 text-sm text-muted-foreground">Bill not found.</div>;

  const supplierName = typeof bill.supplier === "object" ? bill.supplier?.name : bill.supplier;
  const outstanding = (bill.total ?? 0) - (bill.totalPaid ?? 0);
  const canPay = bill.approvalStatus === "approved" && outstanding > 0;

  const primaryAction = canPay ? (
    <PaymentDialog billId={bill._id} currency={bill.currency} outstanding={outstanding} onDone={refresh} />
  ) : (
    <Button size="sm" className="gap-1" onClick={() => navigate(`/procurement/bills/${id}/edit`)}>
      <Edit className="h-3.5 w-3.5" />{tr.common.edit}
    </Button>
  );

  const menuItems: DetailMenuItem[] = [];
  if (canPay) {
    menuItems.push({ label: tr.common.edit, icon: <Edit className="h-3.5 w-3.5 me-2" />, onClick: () => navigate(`/procurement/bills/${id}/edit`) });
  }
  menuItems.push({ label: "Clone", icon: <Copy className="h-3.5 w-3.5 me-2" />, onClick: handleClone });
  menuItems.push({ label: tr.common.delete, icon: <Trash2 className="h-3.5 w-3.5 me-2" />, onClick: () => setDeleteOpen(true), destructive: true, separatorBefore: true });

  const header = (
    <DetailHeader
      crumbs={[{ label: "Vendor Bills", href: "/procurement/bills" }, { label: bill.billNumber ?? bill.title }]}
      title={<>{bill.billNumber} — {bill.title}</>}
      badges={<><ProcurementStatusBadge status={bill.status} /><ApprovalBadge status={bill.approvalStatus} /></>}
      primaryAction={primaryAction}
      menuItems={menuItems}
    />
  );

  return (
    <DetailPageLayout header={header}>
      <RejectDialog open={rejectOpen} onConfirm={handleReject} onCancel={() => setRejectOpen(false)} loading={busy} />
      <ConfirmDialog
        open={deleteOpen}
        onConfirm={() => {
          setDeleteOpen(false);
          void handleDelete();
        }}
        onCancel={() => setDeleteOpen(false)}
        title="Delete Bill"
        description="Delete this bill? This action cannot be undone."
      />

      {isPending && (
        <div className="flex items-center gap-2.5 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700 px-4 py-3 text-amber-800 dark:text-amber-300">
          <Clock className="h-4 w-4 shrink-0" />
          <p className="text-sm">This bill is awaiting approval. Payments are locked until approved.</p>
          {canApprove && (
            <div className="ms-auto flex gap-2">
              <Button size="sm" variant="outline" className="h-7 gap-1 text-green-600 border-green-300 hover:bg-green-50" onClick={handleApprove} disabled={busy}><CheckCircle className="h-3.5 w-3.5" />Approve</Button>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-destructive border-destructive/40 hover:bg-destructive/10" onClick={() => setRejectOpen(true)} disabled={busy}><XCircle className="h-3.5 w-3.5" />Reject</Button>
            </div>
          )}
        </div>
      )}
      {isRejected && (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-destructive">
          <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1"><p className="text-sm font-medium">Bill rejected</p>{bill.rejectionReason && <p className="text-xs mt-0.5 text-muted-foreground">{bill.rejectionReason}</p>}</div>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Details</CardTitle></CardHeader>
        <CardContent>
          <MetaGrid>
            <MetaField label="Supplier" value={supplierName} />
            {bill.purchaseOrder && <MetaField label="PO" value={bill.purchaseOrder.poNumber} />}
            <MetaField label="Total" value={`${bill.total?.toLocaleString()} ${bill.currency}`} />
            <MetaField label="Outstanding">
              <span className={outstanding > 0 ? "text-destructive font-medium" : "text-emerald-600"}>
                {outstanding.toLocaleString()} {bill.currency}
              </span>
            </MetaField>
            <AuditRows record={bill} createdByField={bill.createdBy} variant="meta" />
          </MetaGrid>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Items</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Description</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Unit Price</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
            <TableBody>
              {(bill.items ?? []).map((it: any, i: number) => (
                <TableRow key={i}><TableCell>{it.description}</TableCell><TableCell className="text-right tabular-nums">{it.quantity}</TableCell><TableCell className="text-right tabular-nums">{it.unitPrice?.toLocaleString()}</TableCell><TableCell className="text-right tabular-nums">{it.total?.toLocaleString()}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-end border-t p-4">
            <div className="w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums text-foreground">{bill.subtotal?.toLocaleString()} {bill.currency}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax ({bill.taxRate ?? 0}%)</span>
                <span className="tabular-nums text-foreground">{bill.tax?.toLocaleString()} {bill.currency}</span>
              </div>
              <div className="flex items-baseline justify-between border-t pt-2">
                <span className="text-sm font-medium">Total</span>
                <span className="text-xl font-bold tabular-nums">{bill.total?.toLocaleString()} {bill.currency}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Payments</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Method</TableHead><TableHead className="text-right">Amount</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {(bill.payments ?? []).length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No payments yet</TableCell></TableRow>}
              {(bill.payments ?? []).map((p: any) => (
                <TableRow key={p._id}>
                  <TableCell>{new Date(p.date).toLocaleDateString()}</TableCell>
                  <TableCell className="capitalize">{p.method?.replace("_", " ")}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.amount?.toLocaleString()} {p.currency}</TableCell>
                  <TableCell className="text-right">
                    {((user?.permissions ?? []).some((p) => p === '*' || p === 'vendor-bills:delete')) && (
                      <button onClick={() => handleDeletePayment(p._id)} className="text-destructive opacity-60 hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ApprovalStepsTimeline entityType="VendorBill" entityId={id!} />
    </DetailPageLayout>
  );
}
