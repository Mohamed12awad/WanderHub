import { useCallback, useState, useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AsyncSearchableSelect } from "@/components/common/combobox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TextField, TextareaField } from "@/components/common/form";
import { EntityFormPage } from "@/components/common/EntityFormPage";
import { StickyFormBar } from "@/components/common/StickyFormBar";
import LineItemsTable, { LineItemRow, toLineItemPayload } from "@/components/Finance/LineItemsTable";
import DynamicFields from "@/components/common/DynamicFields";
import { useSaveMutation } from "@/hooks/useSaveMutation";
import { queryKeys } from "@/lib/queryKeys";
import { createPurchaseOrder, updatePurchaseOrder, getPurchaseOrderById, getSuppliers } from "@/utils/api";
import { toCustomFieldValues } from "@/utils/customFields";

const CURRENCIES = ["EGP", "USD", "EUR", "GBP", "AED", "SAR"];

const PO_STATUSES = [
  { value: "draft",     label: "Draft" },
  { value: "sent",      label: "Sent" },
  { value: "confirmed", label: "Confirmed" },
  { value: "received",  label: "Received" },
  { value: "cancelled", label: "Cancelled" },
];

const schema = z.object({
  title:        z.string().min(1, "Title is required"),
  supplierId:   z.string().min(1, "Supplier is required"),
  status:       z.string().min(1),
  currency:     z.string().min(1),
  expectedDate: z.string().optional(),
  notes:        z.string().optional(),
  taxRate:      z.coerce.number().min(0).max(100),
});

type FormValues = z.infer<typeof schema>;

export default function PurchaseOrderForm({ mode }: { mode: "add" | "edit" }) {
  const navigate   = useNavigate();
  const { id }     = useParams();
  const location   = useLocation();
  const cloneData  = mode === "add" ? (location.state as any)?.clone : undefined;

  const [items, setItems]               = useState<LineItemRow[]>(cloneData?.items ?? []);
  const [itemsError, setItemsError]     = useState("");
  const [customFields, setCustomFields] = useState<Record<string, string>>(
    cloneData?.customFields ? toCustomFieldValues(cloneData.customFields) : {},
  );
  const [supplierLabel, setSupplierLabel] = useState(cloneData?.supplierLabel ?? "");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      title: cloneData?.title ?? "", supplierId: cloneData?.supplierId ?? "", status: "draft",
      currency: cloneData?.currency ?? "EGP",
      expectedDate: "",
      notes: cloneData?.notes ?? "", taxRate: cloneData?.taxRate ?? 14,
    },
  });

  const fetchSuppliers = useCallback(
    (q: string) => getSuppliers({ page: 1, limit: 20, q }).then((r) =>
      ((Array.isArray(r?.data) ? r.data : (r as any)?.data?.data ?? []) as any[]).map((s) => ({ value: s._id, label: s.name }))
    ), [],
  );

  const { data: poData, isPending: isFetching } = useQuery({
    queryKey: queryKeys.purchaseOrders.detail(id!),
    queryFn: () => getPurchaseOrderById(id!),
    enabled: mode === "edit" && !!id,
  });
  useEffect(() => {
    if (!poData) return;
    const d = poData.data;
    form.reset({
      title: d.title ?? "", supplierId: d.supplier?._id ?? "", status: d.status ?? "draft",
      currency: d.currency ?? "EGP",
      expectedDate: d.expectedDate ? new Date(d.expectedDate).toISOString().split("T")[0] : "",
      notes: d.notes ?? "", taxRate: d.taxRate ?? 14,
    });
    setItems(d.items ?? []);
    setCustomFields(toCustomFieldValues(d.customFields));
    setSupplierLabel(d.supplier?.name ?? "");
  }, [poData, form]);

  const backHref = "/procurement/purchase-orders";

  const mutation = useSaveMutation<Record<string, unknown>>({
    save: (payload) => mode === "add" ? createPurchaseOrder(payload as any) : updatePurchaseOrder(id!, payload as any),
    invalidate: [queryKeys.purchaseOrders.all],
    successMessage: "Purchase order saved",
    errorMessage:   "Failed to save purchase order",
    onSuccess: (res: any) => {
      const newId = res?.data?._id ?? id;
      navigate(newId ? `/procurement/purchase-orders/${newId}` : backHref);
    },
  });

  const onSubmit = (values: FormValues) => {
    if (items.length === 0) { setItemsError("Please add at least one item"); return; }
    setItemsError("");
    mutation.mutate({
      title: values.title.trim(), supplier: values.supplierId, status: values.status, currency: values.currency,
      ...(values.expectedDate ? { expectedDate: values.expectedDate } : {}),
      notes: values.notes, items: toLineItemPayload(items), taxRate: values.taxRate, customFields,
    });
  };

  if (mode === "edit" && isFetching) return <div className="p-6">Loading…</div>;

  return (
    <EntityFormPage
      title={mode === "add" ? "New Purchase Order" : "Edit Purchase Order"}
      backHref={backHref}
      breadcrumb={[
        { label: "Purchase Orders", href: backHref },
        { label: mode === "add" ? "New" : "Edit" },
      ]}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <TextField<FormValues> name="title" label="Title" required placeholder="e.g. Q3 hardware restock" />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Supplier */}
                  <FormField control={form.control} name="supplierId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier <span className="text-destructive ms-1">*</span></FormLabel>
                      <FormControl>
                        <AsyncSearchableSelect value={field.value ?? ""} onChange={field.onChange}
                          fetchFn={fetchSuppliers} selectedLabel={supplierLabel}
                          placeholder="Select Supplier" searchPlaceholder="Search suppliers…"
                          onSelectItem={(item) => setSupplierLabel(item.label)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

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

                  <TextField<FormValues> name="expectedDate" label="Expected Date" type="date" />

                  {/* Status */}
                  <FormField control={form.control} name="status" render={({ field }) => {
                    const value = field.value ?? "";
                    const opts = value && !PO_STATUSES.some((s) => s.value === value)
                      ? [...PO_STATUSES, { value, label: value }]
                      : PO_STATUSES;
                    return (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <Select key={value} value={value} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                          <SelectContent>
                            {opts.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                    );
                  }} />
                </div>

                <TextareaField<FormValues> name="notes" label="Notes" placeholder="Terms, conditions, or shipping notes…" />

                <DynamicFields module="purchaseOrders" values={customFields} onChange={(k, v) => setCustomFields((prev) => ({ ...prev, [k]: v }))} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <LineItemsTable
                  items={items} currency={form.watch("currency")}
                  onChange={(next) => { setItems(next); setItemsError(""); }}
                />
                {itemsError && <p className="text-sm text-destructive px-4 pb-3">{itemsError}</p>}
              </CardContent>
            </Card>

          </div>

          <StickyFormBar isSubmitting={mutation.isPending} onCancel={() => navigate(backHref)} />
        </form>
      </Form>
    </EntityFormPage>
  );
}
