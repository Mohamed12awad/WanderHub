import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Boxes, SlidersHorizontal, History, ChevronDown } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getInventory, adjustInventory, updateInventoryDetails, getInventoryMovementsPaged,
} from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";
import LoadingSpinner from "@/components/common/spinner";

const ADJUSTMENT_REASONS = [
  { value: "recount",    label: "Recount" },
  { value: "damage",     label: "Damage" },
  { value: "theft",      label: "Theft / Loss" },
  { value: "expiry",     label: "Expiry" },
  { value: "write_off",  label: "Write-off" },
  { value: "return",     label: "Customer Return" },
  { value: "correction", label: "Correction" },
];

const REASON_STYLE: Record<string, string> = {
  recount:    "bg-slate-100 text-slate-700",
  damage:     "bg-amber-50 text-amber-700",
  theft:      "bg-red-50 text-red-700",
  expiry:     "bg-orange-50 text-orange-700",
  write_off:  "bg-rose-50 text-rose-700",
  return:     "bg-teal-50 text-teal-700",
  correction: "bg-blue-50 text-blue-700",
};

interface StockItem {
  _id: string;
  productId: string;
  quantityOnHand: number;
  reorderLevel: number;
  location?: string | null;
  lowStock: boolean;
  product?: { _id: string; name: string; type?: string | null } | null;
}

const PAGE_SIZE = 50;

export function Inventory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [adjustItem, setAdjustItem]     = useState<StockItem | null>(null);
  const [qty, setQty]                   = useState("");
  const [note, setNote]                 = useState("");
  const [reason, setReason]             = useState("");
  const [reorder, setReorder]           = useState("");
  const [location, setLocation]         = useState("");
  const [saving, setSaving]             = useState(false);
  const [movementsFor, setMovementsFor] = useState<StockItem | null>(null);
  const [movePage, setMovePage]         = useState(0);

  const { data, isLoading } = useQuery({ queryKey: ["inventory"], queryFn: getInventory, staleTime: 15000 });
  const items: StockItem[] = data?.data ?? [];

  const movSkip = movePage * PAGE_SIZE;
  const { data: movesData } = useQuery({
    queryKey: ["inventory-movements", movementsFor?.productId, movePage],
    queryFn: () => getInventoryMovementsPaged(movementsFor!.productId, movSkip, PAGE_SIZE),
    enabled: !!movementsFor,
  });
  const movements: any[]  = movesData?.data?.data ?? [];
  const movTotal: number  = movesData?.data?.total ?? 0;

  const openAdjust = (it: StockItem) => {
    setAdjustItem(it);
    setQty("");
    setNote("");
    setReason("");
    setReorder(String(it.reorderLevel ?? 0));
    setLocation(it.location ?? "");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustItem) return;
    setSaving(true);
    try {
      const q = parseFloat(qty);
      if (q) await adjustInventory(adjustItem.productId, { qty: q, note: note.trim() || undefined, reason: reason || undefined });

      const detailsData: { reorderLevel?: number; location?: string } = {};
      const rl = parseFloat(reorder);
      if (!Number.isNaN(rl) && rl !== adjustItem.reorderLevel) detailsData.reorderLevel = rl;
      const trimmedLoc = location.trim();
      if (trimmedLoc !== (adjustItem.location ?? "")) detailsData.location = trimmedLoc;
      if (Object.keys(detailsData).length) await updateInventoryDetails(adjustItem.productId, detailsData);

      toast({ title: "Inventory updated." });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setAdjustItem(null);
    } catch (err: any) {
      toast({ title: err?.response?.data?.message ?? "Failed to update inventory", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <LoadingSpinner loading />;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Boxes className="h-5 w-5 text-muted-foreground" />
        <div>
          <h1 className="text-xl font-bold">Inventory</h1>
          <p className="text-sm text-muted-foreground">{items.length} stocked product(s)</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No stock yet. Receiving a product-linked purchase order will create stock here.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">On hand</TableHead>
                  <TableHead className="text-right">Reorder level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it._id}>
                    <TableCell className="font-medium">{it.product?.name ?? it.productId}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{it.location ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono">{it.quantityOnHand}</TableCell>
                    <TableCell className="text-right font-mono">{it.reorderLevel}</TableCell>
                    <TableCell>
                      {it.lowStock
                        ? <Badge variant="destructive">Low stock</Badge>
                        : <Badge variant="outline">OK</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Adjust" onClick={() => openAdjust(it)}>
                          <SlidersHorizontal className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Movements" onClick={() => { setMovementsFor(it); setMovePage(0); }}>
                          <History className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Adjust dialog */}
      <Dialog open={!!adjustItem} onOpenChange={(o) => !o && setAdjustItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust — {adjustItem?.product?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Qty change (+ in / − out)</Label>
                <Input type="number" step="any" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="e.g. -2 or 10" />
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                  <SelectContent>
                    {ADJUSTMENT_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Note</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Reorder level</Label>
                <Input type="number" step="any" min="0" value={reorder} onChange={(e) => setReorder(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Warehouse A" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAdjustItem(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Movements dialog */}
      <Dialog open={!!movementsFor} onOpenChange={(o) => !o && setMovementsFor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Movements — {movementsFor?.product?.name}</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto">
            {movements.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No movements recorded.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Reason / Ref</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m._id}>
                      <TableCell className="text-xs">{new Date(m.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="capitalize text-xs">{m.type}</TableCell>
                      <TableCell className={`text-right font-mono text-xs ${m.qty < 0 ? "text-destructive" : "text-emerald-600"}`}>
                        {m.qty > 0 ? `+${m.qty}` : m.qty}
                      </TableCell>
                      <TableCell className="text-xs">
                        {m.adjustmentReason ? (
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${REASON_STYLE[m.adjustmentReason] ?? "bg-muted text-muted-foreground"}`}>
                            {ADJUSTMENT_REASONS.find((r) => r.value === m.adjustmentReason)?.label ?? m.adjustmentReason}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{m.refType ?? m.note ?? "—"}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          {movTotal > PAGE_SIZE && (
            <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
              <span>{movSkip + 1}–{Math.min(movSkip + PAGE_SIZE, movTotal)} of {movTotal}</span>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="h-7 text-xs" disabled={movePage === 0} onClick={() => setMovePage((p) => p - 1)}>Prev</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={movSkip + PAGE_SIZE >= movTotal} onClick={() => setMovePage((p) => p + 1)}>
                  Next <ChevronDown className="h-3 w-3 rotate-270" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Inventory;
