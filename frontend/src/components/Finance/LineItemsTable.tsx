import React, { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Trash2, Plus } from "lucide-react";
import { getProducts } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { AsyncSearchableSelect } from "@/components/common/combobox";

export interface LineItemRow {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate?: number;
  taxCode?: string;
  productId?: string;
}

interface Props {
  items: LineItemRow[];
  onChange: (items: LineItemRow[]) => void;
  currency?: string;
}

function rowTotal(item: LineItemRow) {
  return item.quantity * item.unitPrice * (1 - item.discount / 100);
}

/**
 * Document totals mirroring the backend calcTotals: per-line tax summed when any
 * line carries a taxRate, otherwise the document-level rate is applied to each
 * line. Keeps the form preview consistent with what the server stores.
 */
export function computeTotals(items: LineItemRow[], docTaxRate = 0) {
  const perLine = items.some((i) => i.taxRate !== undefined && i.taxRate !== null);
  let tax = 0;
  const subtotal = items.reduce((s, i) => {
    const net = rowTotal(i);
    tax += net * ((perLine ? i.taxRate ?? 0 : docTaxRate) / 100);
    return s + net;
  }, 0);
  const round2 = (n: number) => Math.round(n * 100) / 100;
  return { subtotal: round2(subtotal), tax: round2(tax), total: round2(subtotal + tax) };
}

const LineItemsTable: React.FC<Props> = ({ items, onChange, currency = "USD" }) => {
  const { tr } = useLanguage();
  const f = tr.finance;

  const fetchProducts = useCallback(
    (q: string) =>
      getProducts({ page: 1, limit: 20, q }).then((r) => {
        const list: any[] = (r.data as any).data ?? (Array.isArray(r.data) ? r.data : []);
        return list.map((p) => ({ value: p._id, label: p.name, price: p.price }));
      }),
    [],
  );

  const addRow = () =>
    onChange([...items, { description: "", quantity: 1, unitPrice: 0, discount: 0, taxRate: 0 }]);

  const removeRow = (idx: number) =>
    onChange(items.filter((_, i) => i !== idx));

  const update = (idx: number, field: keyof LineItemRow, value: string | number) => {
    onChange(
      items.map((item, i) =>
        i === idx ? { ...item, [field]: field === "description" ? value : Number(value) } : item
      )
    );
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-44">Product</TableHead>
              <TableHead className="min-w-[160px]">{f.description}</TableHead>
              <TableHead className="w-20 text-right">{f.quantity}</TableHead>
              <TableHead className="w-28 text-right">{f.unitPrice}</TableHead>
              <TableHead className="w-24 text-right">{f.discount}</TableHead>
              <TableHead className="w-20 text-right">Tax %</TableHead>
              <TableHead className="w-28 text-right">{f.itemTotal}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                  {f.noItems}
                </TableCell>
              </TableRow>
            )}
            {items.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  <AsyncSearchableSelect
                    value=""
                    onChange={() => {}}
                    onSelectItem={(p) => {
                      const product = p as any;
                      onChange(
                        items.map((row, i) =>
                          i === idx
                            ? { ...row, productId: product.value, description: p.label, unitPrice: product.price ?? row.unitPrice }
                            : row
                        )
                      );
                    }}
                    fetchFn={fetchProducts}
                    placeholder="Pick…"
                    searchPlaceholder="Search products…"
                    className="h-8 text-xs"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={item.description}
                    onChange={(e) => update(idx, "description", e.target.value)}
                    placeholder={f.description}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    value={item.quantity}
                    onChange={(e) => update(idx, "quantity", e.target.value)}
                    className="h-8 text-right"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => update(idx, "unitPrice", e.target.value)}
                    className="h-8 text-right"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={item.discount}
                    onChange={(e) => update(idx, "discount", e.target.value)}
                    className="h-8 text-right"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={item.taxRate ?? 0}
                    onChange={(e) => update(idx, "taxRate", e.target.value)}
                    className="h-8 text-right"
                  />
                </TableCell>
                <TableCell className="text-right font-medium">
                  {rowTotal(item).toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeRow(idx)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={addRow}>
        <Plus className="h-3.5 w-3.5 me-1" />
        {f.addItem}
      </Button>
    </div>
  );
};

export default LineItemsTable;
