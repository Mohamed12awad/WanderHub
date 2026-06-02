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
import { Boxes, SlidersHorizontal, History } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getInventory, adjustInventory, setReorderLevel, getInventoryMovements,
} from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";
import LoadingSpinner from "@/components/common/spinner";

interface StockItem {
  _id: string;
  productId: string;
  quantityOnHand: number;
  reorderLevel: number;
  location?: string | null;
  lowStock: boolean;
  product?: { _id: string; name: string; type?: string | null } | null;
}

export function Inventory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [adjustItem, setAdjustItem] = useState<StockItem | null>(null);
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [reorder, setReorder] = useState("");
  const [saving, setSaving] = useState(false);
  const [movementsFor, setMovementsFor] = useState<StockItem | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["inventory"], queryFn: getInventory, staleTime: 15000 });
  const items: StockItem[] = data?.data ?? [];

  const { data: movesData } = useQuery({
    queryKey: ["inventory-movements", movementsFor?.productId],
    queryFn: () => getInventoryMovements(movementsFor!.productId),
    enabled: !!movementsFor,
  });
  const movements: any[] = movesData?.data ?? [];

  const openAdjust = (it: StockItem) => {
    setAdjustItem(it);
    setQty("");
    setNote("");
    setReorder(String(it.reorderLevel ?? 0));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustItem) return;
    setSaving(true);
    try {
      const q = parseFloat(qty);
      if (q) await adjustInventory(adjustItem.productId, { qty: q, note: note.trim() || undefined });
      const rl = parseFloat(reorder);
      if (!Number.isNaN(rl) && rl !== adjustItem.reorderLevel) {
        await setReorderLevel(adjustItem.productId, rl);
      }
      toast({ title: "Inventory updated." });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setAdjustItem(null);
    } catch {
      toast({ title: "Failed to update inventory", variant: "destructive" });
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
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Movements" onClick={() => setMovementsFor(it)}>
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
            <div className="space-y-2">
              <Label>Quantity change (+ in / − out)</Label>
              <Input type="number" step="any" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="e.g. -2 or 10" />
            </div>
            <div className="space-y-2">
              <Label>Note</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason (recount, write-off…)" />
            </div>
            <div className="space-y-2">
              <Label>Reorder level</Label>
              <Input type="number" step="any" min="0" value={reorder} onChange={(e) => setReorder(e.target.value)} />
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
        <DialogContent>
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
                    <TableHead>Ref</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m._id}>
                      <TableCell>{new Date(m.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="capitalize">{m.type}</TableCell>
                      <TableCell className={`text-right font-mono ${m.qty < 0 ? "text-destructive" : "text-emerald-600"}`}>
                        {m.qty > 0 ? `+${m.qty}` : m.qty}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{m.refType ?? m.note ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Inventory;
