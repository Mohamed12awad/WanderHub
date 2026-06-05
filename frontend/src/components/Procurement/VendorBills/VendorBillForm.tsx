import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createVendorBill, updateVendorBill, getVendorBillById,
  getSuppliers, getPurchaseOrders, getPurchaseOrderById,
} from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LineItemsTable, { LineItemRow, computeTotals } from "@/components/Finance/LineItemsTable";
import DynamicFields from "@/components/common/DynamicFields";
import { toCustomFieldValues } from "@/utils/customFields";

const CURRENCIES = ["EGP", "USD", "EUR", "GBP", "AED", "SAR"];

export default function VendorBillForm({ mode }: { mode: "add" | "edit" }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const cloneData = mode === "add" ? (location.state as any)?.clone : undefined;
  const poParam = searchParams.get("po");
  const { tr } = useLanguage();
  const { toast } = useToast();

  const [title, setTitle] = useState(cloneData?.title ?? "");
  const [supplier, setSupplier] = useState(cloneData?.supplier ?? "");
  const [purchaseOrder, setPurchaseOrder] = useState("");
  const [currency, setCurrency] = useState(cloneData?.currency ?? "EGP");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [taxRate, setTaxRate] = useState<number>(cloneData?.taxRate ?? 0);
  const [notes, setNotes] = useState(cloneData?.notes ?? "");
  const [items, setItems] = useState<LineItemRow[]>(
    cloneData?.items?.length ? cloneData.items : [{ description: "", quantity: 1, unitPrice: 0, discount: 0 }]
  );
  const [customFields, setCustomFields] = useState<Record<string, string>>(
    cloneData?.customFields ? toCustomFieldValues(cloneData.customFields) : {},
  );

  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers-all"],
    queryFn: () => getSuppliers()
  });
  const suppliers = suppliersData?.data ?? [];
  const { data: posData } = useQuery({
    queryKey: ["pos-all"],
    queryFn: () => getPurchaseOrders()
  });
  const pos = posData?.data ?? [];

  const { data } = useQuery({
    queryKey: ["vendor-bill", id],
    queryFn: () => getVendorBillById(id!),
    enabled: mode === "edit" && !!id
  });

  // Prefill from a PO when arriving via ?po=
  const { data: poData } = useQuery({
    queryKey: ["po-prefill", poParam],
    queryFn: () => getPurchaseOrderById(poParam!),
    enabled: mode === "add" && !!poParam
  });
  useEffect(() => {
    if (poData?.data && mode === "add") {
      const po = poData.data;
      setTitle(`Bill for ${po.poNumber}`);
      setSupplier(typeof po.supplier === "object" ? po.supplier?._id : po.supplier);
      setPurchaseOrder(po._id);
      setCurrency(po.currency ?? "EGP");
      setTaxRate(po.taxRate ?? 0);
      if (po.items?.length) setItems(po.items.map((i: any) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, discount: i.discount ?? 0 })));
    }
  }, [poData, mode]);

  useEffect(() => {
    if (data?.data) {
      const b = data.data;
      setTitle(b.title ?? "");
      setSupplier(typeof b.supplier === "object" ? b.supplier?._id : b.supplier);
      setPurchaseOrder(b.purchaseOrder?._id ?? "");
      setCurrency(b.currency ?? "EGP");
      setIssueDate(b.issueDate ? b.issueDate.split("T")[0] : "");
      setDueDate(b.dueDate ? b.dueDate.split("T")[0] : "");
      setTaxRate(b.taxRate ?? 0);
      setNotes(b.notes ?? "");
      setItems(b.items?.length ? b.items.map((i: any) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, discount: i.discount ?? 0 })) : [{ description: "", quantity: 1, unitPrice: 0, discount: 0 }]);
      setCustomFields(toCustomFieldValues(b.customFields));
    }
  }, [data]);

  const { subtotal, tax, total } = computeTotals(items, taxRate);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { title, supplier, purchaseOrder: purchaseOrder || undefined, currency, issueDate, dueDate: dueDate || undefined, taxRate, notes, items, customFields };
      return mode === "edit" ? updateVendorBill(id!, payload) : createVendorBill(payload);
    },

    onSuccess: () => { toast({ title: mode === "edit" ? "Bill updated" : "Bill created" }); navigate("/procurement/bills"); },
    onError: (e: any) => { toast({ title: e?.response?.data?.message ?? "Failed to save", variant: "destructive" }); }
  });

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader><CardTitle>{mode === "edit" ? ((tr as any).vendorBills?.edit ?? "Edit Bill") : ((tr as any).vendorBills?.add ?? "New Bill")}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); if (!supplier) { toast({ title: "Select a supplier", variant: "destructive" }); return; } mutation.mutate(); }} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>Supplier</Label>
                <select className="border rounded-md h-10 px-3 text-sm bg-background" value={supplier} onChange={(e) => setSupplier(e.target.value)} required>
                  <option value="">Select…</option>
                  {suppliers.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Linked Purchase Order (optional)</Label>
                <select className="border rounded-md h-10 px-3 text-sm bg-background" value={purchaseOrder} onChange={(e) => setPurchaseOrder(e.target.value)}>
                  <option value="">None</option>
                  {pos.map((po: any) => <option key={po._id} value={po._id}>{po.poNumber} — {po.title}</option>)}
                </select>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="grid gap-1.5">
                <Label>Currency</Label>
                <select className="border rounded-md h-10 px-3 text-sm bg-background" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Issue Date</Label>
                <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Due Date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Items</Label>
              <LineItemsTable items={items} currency={currency} onChange={setItems} />
            </div>

            <div className="grid sm:grid-cols-2 gap-4 items-end">
              <div className="grid gap-1.5 max-w-[120px]">
                <Label>Tax Rate (%)</Label>
                <Input type="number" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />
              </div>
              <div className="text-sm space-y-1 sm:text-right">
                <div className="text-muted-foreground">Subtotal: <span className="tabular-nums text-foreground">{subtotal.toLocaleString()} {currency}</span></div>
                <div className="text-muted-foreground">Tax: <span className="tabular-nums text-foreground">{tax.toLocaleString()} {currency}</span></div>
                <div className="font-semibold">Total: <span className="tabular-nums">{total.toLocaleString()} {currency}</span></div>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Notes</Label>
              <textarea className="border rounded-md p-2 text-sm min-h-[70px] bg-background" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <DynamicFields module="vendorBills" values={customFields} onChange={(k, v) => setCustomFields((prev) => ({ ...prev, [k]: v }))} />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate("/procurement/bills")}>{tr.common.cancel}</Button>
              <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? tr.common.loading : tr.common.save}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
