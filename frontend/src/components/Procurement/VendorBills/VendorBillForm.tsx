import { useCallback, useState, useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AsyncSearchableSelect } from "@/components/common/combobox";
import { TextField, TextareaField } from "@/components/common/form";
import { TaxRateSelect } from "@/components/common/TaxRateSelect";
import { EntityFormPage } from "@/components/common/EntityFormPage";
import { StickyFormBar } from "@/components/common/StickyFormBar";
import LineItemsTable, { LineItemRow, computeTotals } from "@/components/Finance/LineItemsTable";
import DynamicFields from "@/components/common/DynamicFields";
import { useSaveMutation } from "@/hooks/useSaveMutation";
import { queryKeys } from "@/lib/queryKeys";
import {
  createVendorBill, updateVendorBill, getVendorBillById,
  getSuppliers, getPurchaseOrders, getPurchaseOrderById,
} from "@/utils/api";
import { toCustomFieldValues } from "@/utils/customFields";
import { useLanguage } from "@/contexts/LanguageContext";

const CURRENCIES = ["EGP", "USD", "EUR", "GBP", "AED", "SAR"];

const asOptions = (r: any, toLabel: (x: any) => string) =>
  ((Array.isArray(r?.data) ? r.data : r?.data?.data ?? []) as any[]).map((x) => ({
    value: x._id,
    label: toLabel(x),
  }));

const schema = z.object({
  title:         z.string().min(1, "Title is required"),
  supplierId:    z.string().min(1, "Supplier is required"),
  purchaseOrder: z.string().optional(),
  currency:      z.string().min(1),
  issueDate:     z.string().optional(),
  dueDate:       z.string().optional(),
  taxRate:       z.coerce.number().min(0).max(100),
  notes:         z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function VendorBillForm({ mode }: { mode: "add" | "edit" }) {
  const navigate        = useNavigate();
  const { id }          = useParams();
  const [searchParams]  = useSearchParams();
  const location        = useLocation();
  const cloneData       = mode === "add" ? (location.state as any)?.clone : undefined;
  const poParam         = searchParams.get("po");
  const { tr }          = useLanguage();

  const [items, setItems]               = useState<LineItemRow[]>(
    cloneData?.items?.length ? cloneData.items : [{ description: "", quantity: 1, unitPrice: 0, discount: 0 }],
  );
  const [customFields, setCustomFields] = useState<Record<string, string>>(
    cloneData?.customFields ? toCustomFieldValues(cloneData.customFields) : {},
  );
  const [supplierLabel, setSupplierLabel] = useState(cloneData?.supplierLabel ?? "");
  const [poLabel, setPoLabel]             = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      title: cloneData?.title ?? "", supplierId: cloneData?.supplier ?? "",
      purchaseOrder: "", currency: cloneData?.currency ?? "EGP",
      issueDate: new Date().toISOString().split("T")[0], dueDate: "",
      taxRate: cloneData?.taxRate ?? 0, notes: cloneData?.notes ?? "",
    },
  });

  // Reference data — server-side searched lookups
  const fetchSuppliers = useCallback((q: string) => getSuppliers({ page: 1, limit: 20, q }).then((r) => asOptions(r, (s) => s.name)), []);
  const fetchPurchaseOrders = useCallback((q: string) => getPurchaseOrders({ page: 1, limit: 20, q }).then((r) => asOptions(r, (po) => `${po.poNumber} — ${po.title}`)), []);

  // Prefill from ?po= param
  const { data: poData } = useQuery({
    queryKey: ["po-prefill", poParam],
    queryFn: () => getPurchaseOrderById(poParam!),
    enabled: mode === "add" && !!poParam,
  });
  useEffect(() => {
    if (!poData?.data || mode !== "add") return;
    const po = poData.data;
    form.setValue("title", `Bill for ${po.poNumber}`);
    form.setValue("supplierId", typeof po.supplier === "object" ? po.supplier?._id : po.supplier);
    form.setValue("purchaseOrder", po._id);
    form.setValue("currency", po.currency ?? "EGP");
    form.setValue("taxRate", po.taxRate ?? 0);
    setSupplierLabel(typeof po.supplier === "object" ? po.supplier?.name ?? "" : "");
    setPoLabel(`${po.poNumber} — ${po.title}`);
    if (po.items?.length) {
      setItems(po.items.map((i: any) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, discount: i.discount ?? 0 })));
    }
  }, [poData, mode, form]);

  // Load existing bill for edit mode
  const { data: billData } = useQuery({
    queryKey: queryKeys.vendorBills.detail(id!),
    queryFn: () => getVendorBillById(id!),
    enabled: mode === "edit" && !!id,
  });
  useEffect(() => {
    if (!billData?.data) return;
    const b = billData.data;
    form.reset({
      title: b.title ?? "",
      supplierId: typeof b.supplier === "object" ? b.supplier?._id : b.supplier ?? "",
      purchaseOrder: b.purchaseOrder?._id ?? "",
      currency: b.currency ?? "EGP",
      issueDate: b.issueDate ? b.issueDate.split("T")[0] : "",
      dueDate: b.dueDate ? b.dueDate.split("T")[0] : "",
      taxRate: b.taxRate ?? 0, notes: b.notes ?? "",
    });
    setItems(
      b.items?.length
        ? b.items.map((i: any) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, discount: i.discount ?? 0 }))
        : [{ description: "", quantity: 1, unitPrice: 0, discount: 0 }],
    );
    setCustomFields(toCustomFieldValues(b.customFields));
    setSupplierLabel(typeof b.supplier === "object" ? b.supplier?.name ?? "" : "");
    setPoLabel(b.purchaseOrder ? `${b.purchaseOrder.poNumber} — ${b.purchaseOrder.title}` : "");
  }, [billData, form]);

  const taxRate = form.watch("taxRate") ?? 0;
  const currency = form.watch("currency");
  const { subtotal, tax, total } = computeTotals(items, taxRate);

  const backHref = "/procurement/bills";

  const mutation = useSaveMutation<Record<string, unknown>>({
    save: (payload) => mode === "edit" ? updateVendorBill(id!, payload as any) : createVendorBill(payload as any),
    invalidate: [queryKeys.vendorBills.all],
    successMessage: mode === "edit" ? "Bill updated" : "Bill created",
    errorMessage:   "Failed to save vendor bill",
    onSuccess: (res: any) => {
      const newId = res?.data?._id ?? id;
      navigate(newId ? `/procurement/bills/${newId}` : backHref);
    },
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate({
      title: values.title, supplier: values.supplierId,
      purchaseOrder: values.purchaseOrder || undefined,
      currency: values.currency,
      issueDate: values.issueDate || undefined,
      dueDate: values.dueDate || undefined,
      taxRate: values.taxRate, notes: values.notes, items, customFields,
    });
  };

  const title = mode === "edit"
    ? ((tr as any).vendorBills?.edit ?? "Edit Bill")
    : ((tr as any).vendorBills?.add ?? "New Bill");

  return (
    <EntityFormPage
      title={title}
      backHref={backHref}
      breadcrumb={[
        { label: "Vendor Bills", href: backHref },
        { label: mode === "edit" ? "Edit" : "New" },
      ]}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <TextField<FormValues> name="title" label="Title" required />

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Supplier */}
            <FormField control={form.control} name="supplierId" render={({ field }) => (
              <FormItem>
                <FormLabel>Supplier <span className="text-destructive ms-1">*</span></FormLabel>
                <FormControl>
                  <AsyncSearchableSelect value={field.value ?? ""} onChange={field.onChange}
                    fetchFn={fetchSuppliers} selectedLabel={supplierLabel}
                    placeholder="Select…" searchPlaceholder="Search suppliers…"
                    onSelectItem={(item) => setSupplierLabel(item.label)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Linked PO */}
            <FormField control={form.control} name="purchaseOrder" render={({ field }) => (
              <FormItem>
                <FormLabel>Linked Purchase Order (optional)</FormLabel>
                <FormControl>
                  <AsyncSearchableSelect value={field.value ?? ""} onChange={field.onChange}
                    fetchFn={fetchPurchaseOrders} selectedLabel={poLabel}
                    placeholder="None" searchPlaceholder="Search purchase orders…"
                    onSelectItem={(item) => setPoLabel(item.label)} />
                </FormControl>
              </FormItem>
            )} />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {/* Currency */}
            <FormField control={form.control} name="currency" render={({ field }) => (
              <FormItem>
                <FormLabel>Currency</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormControl>
              </FormItem>
            )} />

            <TextField<FormValues> name="issueDate" label="Issue Date" type="date" />
            <TextField<FormValues> name="dueDate"   label="Due Date"   type="date" />
          </div>

          <div className="grid gap-1.5">
            <FormLabel>Items</FormLabel>
            <LineItemsTable items={items} currency={currency} onChange={setItems} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4 items-end">
            <div>
              <FormField control={form.control} name="taxRate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax Rate</FormLabel>
                  <FormControl>
                    <TaxRateSelect value={field.value ?? 0} onChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )} />
            </div>
            <div className="ms-auto w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums text-foreground">{subtotal.toLocaleString()} {currency}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span>
                <span className="tabular-nums text-foreground">{tax.toLocaleString()} {currency}</span>
              </div>
              <div className="flex items-baseline justify-between border-t pt-2">
                <span className="text-sm font-medium">Total</span>
                <span className="text-xl font-bold tabular-nums">{total.toLocaleString()} {currency}</span>
              </div>
            </div>
          </div>

          <TextareaField<FormValues> name="notes" label="Notes" />

          <DynamicFields module="vendorBills" values={customFields} onChange={(k, v) => setCustomFields((prev) => ({ ...prev, [k]: v }))} />

          <StickyFormBar isSubmitting={mutation.isPending} onCancel={() => navigate(backHref)} />
        </form>
      </Form>
    </EntityFormPage>
  );
}
