import React, { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TaxRateSelect } from "@/components/common/TaxRateSelect";
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
/**
 * Strips a line-item list down to the fields the API accepts (LineItemDto).
 * Items loaded from a saved document carry server-only fields (_id, total,
 * order, parent foreign keys) that the backend rejects under
 * `forbidNonWhitelisted`, so payloads must be cleaned before sending.
 */
export function toLineItemPayload(items: LineItemRow[]): LineItemRow[] {
  return items.map((i) => ({
    description: i.description,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    discount: i.discount,
    ...(i.taxRate !== undefined && i.taxRate !== null ? { taxRate: i.taxRate } : {}),
    ...(i.taxCode ? { taxCode: i.taxCode } : {}),
    ...(i.productId ? { productId: i.productId } : {}),
  }));
}

export function computeTotals(items: LineItemRow[], docTaxRate = 0, taxInclusive = false) {
  const perLine = items.some((i) => i.taxRate !== undefined && i.taxRate !== null);
  const round2 = (n: number) => Math.round(n * 100) / 100;
  let tax = 0;
  const subtotal = items.reduce((s, i) => {
    const lineAmount = round2(rowTotal(i));
    const rate = (perLine ? i.taxRate ?? 0 : docTaxRate) / 100;
    if (taxInclusive) {
      // Prices already include tax — back it out so subtotal stays net.
      const net = round2(lineAmount / (1 + rate));
      tax += lineAmount - net;
      return s + net;
    }
    tax += lineAmount * rate;
    return s + lineAmount;
  }, 0);
  return { subtotal: round2(subtotal), tax: round2(tax), total: round2(subtotal + tax) };
}

const LineItemsTable: React.FC<Props> = ({ items, onChange, currency = "USD" }) => {
  const { tr, formatCurrency } = useLanguage();
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
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="py-8 text-center">
                  <p className="mb-3 text-sm text-muted-foreground">{f.noItems}</p>
                  <Button type="button" size="sm" onClick={addRow}>
                    <Plus className="h-3.5 w-3.5 me-1" />
                    {f.addItem}
                  </Button>
                </TableCell>
              </TableRow>
            )}
            {items.map((item, idx) => (
              <TableRow key={idx} className="hover:bg-muted/50">
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
                  <TaxRateSelect
                    value={item.taxRate ?? 0}
                    onChange={(rate) => update(idx, "taxRate", rate)}
                    compact
                  />
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(rowTotal(item), currency, { maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    aria-label={`Remove line item ${idx + 1}`}
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
      {items.length > 0 && (
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={addRow}>
          <Plus className="h-3.5 w-3.5 me-1" />
          {f.addItem}
        </Button>
      )}
    </div>
  );
};

export default LineItemsTable;
