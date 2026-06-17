import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { queryKeys } from "@/lib/queryKeys";
import { getWarehouses, getProducts, transferStock } from "@/utils/api";
import { PageShell } from "@/components/common/PageShell";
import { PageHeader } from "@/components/common/PageHeader";

interface Warehouse { _id: string; name: string; code: string; isActive: boolean }
interface Product { _id: string; name: string }

export default function StockTransfer() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [productId, setProductId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: whData } = useQuery({ queryKey: queryKeys.warehouses.all, queryFn: () => getWarehouses(), staleTime: 60000 });
  const warehouses: Warehouse[] = (whData?.data ?? []).filter((w: Warehouse) => w.isActive);
  const { data: prodData } = useQuery({ queryKey: queryKeys.products.all, queryFn: () => getProducts({ limit: 1000 }), staleTime: 60000 });
  const products: Product[] = prodData?.data?.data ?? prodData?.data ?? [];

  const submit = async () => {
    const q = parseFloat(qty);
    if (!productId || !from || !to || !q) { toast({ title: "Fill all fields with a positive quantity.", variant: "destructive" }); return; }
    if (from === to) { toast({ title: "Source and destination must differ.", variant: "destructive" }); return; }
    setBusy(true);
    try {
      await transferStock({ productId, fromWarehouseId: from, toWarehouseId: to, qty: q, note: note.trim() || undefined });
      toast({ title: "Stock transferred." });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      setQty(""); setNote("");
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: msg ?? "Transfer failed", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell width="narrow">
      <PageHeader title="Stock Transfer" />

      <Card>
        <CardHeader><CardTitle className="text-base">Move stock between warehouses</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Product</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
              <SelectContent>{products.map((p) => <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>From</Label>
              <Select value={from} onValueChange={setFrom}>
                <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                <SelectContent>{warehouses.map((w) => <SelectItem key={w._id} value={w._id}>{w.code} — {w.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Select value={to} onValueChange={setTo}>
                <SelectTrigger><SelectValue placeholder="Destination" /></SelectTrigger>
                <SelectContent>{warehouses.map((w) => <SelectItem key={w._id} value={w._id}>{w.code} — {w.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Quantity</Label><Input type="number" step="any" min="0" value={qty} onChange={(e) => setQty(e.target.value)} /></div>
            <div className="space-y-2"><Label>Note</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" /></div>
          </div>
          <div className="flex justify-end">
            <Button onClick={submit} disabled={busy}>{busy ? "Transferring…" : "Transfer"}</Button>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
