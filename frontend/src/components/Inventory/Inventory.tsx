import { useMemo, useState } from "react";
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
import { SlidersHorizontal, History, ChevronDown, Undo2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getInventory, adjustInventory, updateInventoryDetails, getInventoryMovementsPaged, returnStock, getWarehouses,
} from "@/utils/api";
import { queryKeys } from "@/lib/queryKeys";
import { useToast } from "@/components/ui/use-toast";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { GenericTable } from "@/components/common/GenericTable";
import { useLanguage } from "@/contexts/LanguageContext";

const REASON_VALUES = ["recount", "damage", "theft", "expiry", "write_off", "return", "correction"];

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
  createdAt: string;
  productId: string;
  quantityOnHand: number;
  reorderLevel: number;
  location?: string | null;
  lowStock: boolean;
  product?: { _id: string; name: string; type?: string | null } | null;
  warehouse?: { _id: string; name: string; code: string } | null;
}

const PAGE_SIZE = 50;

export function Inventory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { tr } = useLanguage();
  const inv = tr.inventory;
  // Reason options rebuild on language change (labels from `tr`), memoized so
  // unrelated renders don't reallocate.
  const adjustmentReasons = useMemo(
    () => REASON_VALUES.map((value) => ({ value, label: inv.reasons[value] })),
    [inv],
  );

  const [adjustItem, setAdjustItem]     = useState<StockItem | null>(null);
  const [qty, setQty]                   = useState("");
  const [note, setNote]                 = useState("");
  const [reason, setReason]             = useState("");
  const [reorder, setReorder]           = useState("");
  const [location, setLocation]         = useState("");
  const [saving, setSaving]             = useState(false);
  const [movementsFor, setMovementsFor] = useState<StockItem | null>(null);
  const [movePage, setMovePage]         = useState(0);
  const [returnMv, setReturnMv]         = useState<any | null>(null);

  const { data: whData } = useQuery({ queryKey: queryKeys.warehouses.all, queryFn: () => getWarehouses(), staleTime: 60000 });
  const warehouseFilter = [{
    field: "warehouseId",
    label: inv.warehouse,
    type: "select" as const,
    options: (whData?.data ?? []).map((w: { _id: string; name: string }) => ({ value: w._id, label: w.name })),
  }];

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

      toast({ title: inv.updated });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setAdjustItem(null);
    } catch (err: any) {
      toast({ title: err?.response?.data?.message ?? inv.updateFailed, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleReturn = async (m: any) => {
    try {
      await returnStock({ movementId: m._id, qty: Math.abs(m.qty) });
      toast({ title: inv.returned });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-movements", movementsFor?.productId] });
    } catch (err: any) {
      toast({ title: err?.response?.data?.message ?? inv.returnFailed, variant: "destructive" });
    }
  };

  return (
    <>
      <GenericTable<StockItem>
        queryKey="inventory"
        fetchData={({ page, limit, q, filters }) => getInventory({ page, limit, q, ...filters })}
        filterConfigs={warehouseFilter}
        headers={inv.headers}
        title={inv.title}
        description={inv.description}
        emptyMessage={inv.empty}
        renderRow={(it) => (
          <TableRow key={it._id}>
            <TableCell dir="auto" className="font-medium">{it.product?.name ?? it.productId}</TableCell>
            <TableCell dir="auto" className="text-sm">{it.warehouse?.name ?? "—"}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{it.location ?? "—"}</TableCell>
            <TableCell className="text-right font-mono">{it.quantityOnHand}</TableCell>
            <TableCell className="text-right font-mono">{it.reorderLevel}</TableCell>
            <TableCell>
              {it.lowStock
                ? <Badge variant="destructive">{inv.lowStock}</Badge>
                : <Badge variant="outline">{inv.ok}</Badge>}
            </TableCell>
            <TableCell onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" title={inv.adjust} onClick={() => openAdjust(it)}>
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" title={inv.movements} onClick={() => { setMovementsFor(it); setMovePage(0); }}>
                  <History className="h-3.5 w-3.5" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        )}
      />

      {/* Adjust dialog */}
      <Dialog open={!!adjustItem} onOpenChange={(o) => !o && setAdjustItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{inv.adjustTitle(adjustItem?.product?.name ?? "")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{inv.qtyChange}</Label>
                <Input type="number" step="any" value={qty} onChange={(e) => setQty(e.target.value)} placeholder={inv.qtyPlaceholder} />
              </div>
              <div className="space-y-2">
                <Label>{inv.reason}</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger><SelectValue placeholder={inv.selectReason} /></SelectTrigger>
                  <SelectContent>
                    {adjustmentReasons.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{inv.note}</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={inv.optionalNote} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{inv.reorderLevel}</Label>
                <Input type="number" step="any" min="0" value={reorder} onChange={(e) => setReorder(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{inv.location}</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={inv.locationPlaceholder} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAdjustItem(null)}>{tr.common.cancel}</Button>
              <Button type="submit" disabled={saving}>{saving ? tr.common.loading : tr.common.save}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Movements dialog */}
      <Dialog open={!!movementsFor} onOpenChange={(o) => !o && setMovementsFor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{inv.movementsTitle(movementsFor?.product?.name ?? "")}</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto">
            {movements.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">{inv.noMovements}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{inv.date}</TableHead>
                    <TableHead>{inv.type}</TableHead>
                    <TableHead className="text-right">{inv.qty}</TableHead>
                    <TableHead>{inv.reasonRef}</TableHead>
                    <TableHead className="w-16"><span className="sr-only">{tr.common.actions}</span></TableHead>
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
                            {inv.reasons[m.adjustmentReason] ?? m.adjustmentReason}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{m.refType ?? m.note ?? "—"}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {m.qty < 0 && m.type === "out" && m.refType !== "return" && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" title={inv.returnToStock} onClick={() => setReturnMv(m)}>
                            <Undo2 className="h-3.5 w-3.5" />
                          </Button>
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
              <span>{inv.rangeInfo(movSkip + 1, Math.min(movSkip + PAGE_SIZE, movTotal), movTotal)}</span>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="h-7 text-xs" disabled={movePage === 0} onClick={() => setMovePage((p) => p - 1)}>{inv.prev}</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={movSkip + PAGE_SIZE >= movTotal} onClick={() => setMovePage((p) => p + 1)}>
                  {inv.next} <ChevronDown className="h-3 w-3 rotate-270" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={returnMv !== null}
        onConfirm={() => { const m = returnMv; setReturnMv(null); if (m) void handleReturn(m); }}
        onCancel={() => setReturnMv(null)}
        title={inv.returnToStock}
        description={returnMv ? inv.returnConfirm(Math.abs(returnMv.qty)) : undefined}
      />
    </>
  );
}

export default Inventory;
