import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getStockValuation, getWarehouses } from "@/utils/api";
import { PageShell } from "@/components/common/PageShell";
import { PageHeader } from "@/components/common/PageHeader";

interface Row { productId: string; product: string; category: string | null; warehouse: string | null; quantityOnHand: number; avgCost: string; totalValue: string }
interface Val { data: Row[]; total: number; page: number; pages: number; grandTotal: string }
interface Warehouse { _id: string; name: string }

const num = (v: string | number) => (typeof v === "number" ? v : parseFloat(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

export default function Valuation() {
  const [warehouseId, setWarehouseId] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const { data: whData } = useQuery({ queryKey: queryKeys.warehouses.all, queryFn: () => getWarehouses(), staleTime: 60000 });
  const warehouses: Warehouse[] = whData?.data ?? [];

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.inventoryValuation(`${warehouseId}|${q}|${page}`),
    queryFn: () => getStockValuation({ warehouseId: warehouseId || undefined, q: q || undefined, page, limit: 25 }),
    staleTime: 15000,
    placeholderData: keepPreviousData,
  });
  const v: Val | undefined = data?.data;

  const onFilter = (fn: () => void) => { fn(); setPage(1); };

  return (
    <PageShell width="narrow">
      <PageHeader
        title="Inventory Valuation"
        primaryAction={
          <div className="flex items-end gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input className="h-9 w-48 ps-7" placeholder="Search product…" value={q} onChange={(e) => onFilter(() => setQ(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Warehouse</Label>
              <Select value={warehouseId || "all"} onValueChange={(x) => onFilter(() => setWarehouseId(x === "all" ? "" : x))}>
                <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All warehouses</SelectItem>
                  {warehouses.map((w) => <SelectItem key={w._id} value={w._id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading || !v ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
          ) : v.data.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No valued stock.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-right">On hand</TableHead>
                  <TableHead className="text-right">Avg cost</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {v.data.map((r) => (
                  <TableRow key={r.productId + (r.warehouse ?? "")}>
                    <TableCell className="font-medium">{r.product}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.category ?? "—"}</TableCell>
                    <TableCell className="text-sm">{r.warehouse ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono">{r.quantityOnHand}</TableCell>
                    <TableCell className="text-right font-mono">{num(r.avgCost)}</TableCell>
                    <TableCell className="text-right font-mono">{num(r.totalValue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={5} className="font-semibold">Total inventory value ({v.total} items)</TableCell>
                  <TableCell className="text-right font-mono font-bold">{num(v.grandTotal)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>

      {v && v.pages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Page {v.page} of {v.pages} · {v.total} items</span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" className="h-7" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Prev</Button>
            <Button size="sm" variant="outline" className="h-7" disabled={page >= v.pages} onClick={() => setPage((x) => x + 1)}>Next</Button>
          </div>
        </div>
      )}
    </PageShell>
  );
}
