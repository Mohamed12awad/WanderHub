import { useCallback, useEffect, useState } from "react";
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
import { createSalesOrder, updateSalesOrder, getSalesOrderById, getCustomers, getDeals, getProjects } from "@/utils/api";
import { toCustomFieldValues } from "@/utils/customFields";

const asOptions = (r: any, labelKey: string) =>
  ((Array.isArray(r?.data) ? r.data : r?.data?.data ?? []) as any[]).map((x) => ({
    value: x._id,
    label: x[labelKey],
  }));

const CURRENCIES = ["EGP", "USD", "EUR", "GBP", "AED", "SAR"];

const SO_STATUSES = [
  { value: "draft",     label: "Draft" },
  { value: "confirmed", label: "Confirmed" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "invoiced",  label: "Invoiced" },
  { value: "cancelled", label: "Cancelled" },
];

const schema = z.object({
  title:        z.string().min(1, "Title is required"),
  customerId:   z.string().min(1, "Customer is required"),
  dealId:       z.string().optional(),
  projectId:    z.string().optional(),
  status:       z.string().min(1),
  currency:     z.string().min(1),
  expectedDate: z.string().optional(),
  notes:        z.string().optional(),
  terms:        z.string().optional(),
  taxRate:      z.coerce.number().min(0).max(100),
});

type FormValues = z.infer<typeof schema>;

export default function SalesOrderForm({ mode }: { mode: "add" | "edit" }) {
  const navigate = useNavigate();
  const { id }   = useParams();
  const location = useLocation();
  const clone    = mode === "add" ? (location.state as any)?.clone : undefined;

  const [items, setItems]             = useState<LineItemRow[]>(clone?.items ?? []);
  const [itemsError, setItemsError]   = useState("");
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [customerLabel, setCustomerLabel] = useState(clone?.customerLabel ?? "");
  const [dealLabel, setDealLabel]         = useState(clone?.dealLabel ?? "");
  const [projectLabel, setProjectLabel]   = useState(clone?.projectLabel ?? "");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      title: clone?.title ?? "", customerId: clone?.customerId ?? "",
      dealId: clone?.dealId ?? "", projectId: clone?.projectId ?? "",
      status: "draft", currency: clone?.currency ?? "EGP",
      expectedDate: "", notes: clone?.notes ?? "", terms: clone?.terms ?? "",
      taxRate: clone?.taxRate ?? 14,
    },
  });

  const fetchCustomers = useCallback((q: string) => getCustomers({ page: 1, limit: 20, q }).then((r) => asOptions(r, "name")), []);
  const fetchDeals     = useCallback((q: string) => getDeals({ page: 1, limit: 20, q }).then((r) => asOptions(r, "title")), []);
  const fetchProjects  = useCallback((q: string) => getProjects({ page: 1, limit: 20, q }).then((r) => asOptions(r, "name")), []);

  const { data: soData, isPending: isFetching } = useQuery({
    queryKey: queryKeys.salesOrders.detail(id!),
    queryFn: () => getSalesOrderById(id!),
    enabled: mode === "edit" && !!id,
  });
  useEffect(() => {
    if (!soData) return;
    const d = soData.data;
    form.reset({
      title: d.title ?? "", customerId: d.customer?._id ?? "", dealId: d.deal?._id ?? "",
      projectId: d.project?._id ?? "", status: d.status ?? "draft", currency: d.currency ?? "EGP",
      expectedDate: d.expectedDate ? new Date(d.expectedDate).toISOString().split("T")[0] : "",
      notes: d.notes ?? "", terms: d.terms ?? "", taxRate: d.taxRate ?? 14,
    });
    setItems(d.items ?? []);
    setCustomFields(toCustomFieldValues(d.customFields));
    setCustomerLabel(d.customer?.name ?? "");
    setDealLabel(d.deal?.title ?? "");
    setProjectLabel(d.project?.name ?? "");
  }, [soData, form]);

  const backHref = mode === "edit" ? `/sales-orders/${id}` : "/sales-orders";

  const mutation = useSaveMutation<Record<string, unknown>>({
    save: (payload) => mode === "add" ? createSalesOrder(payload as any) : updateSalesOrder(id!, payload as any),
    invalidate: mode === "edit"
      ? [queryKeys.salesOrders.all, queryKeys.salesOrders.detail(id!)]
      : [queryKeys.salesOrders.all],
    successMessage: "Sales order saved",
    errorMessage:   "Failed to save sales order",
    onSuccess: (res: any) => navigate(`/sales-orders/${res?.data?._id ?? ""}`),
  });

  const onSubmit = (values: FormValues) => {
    if (items.length === 0) { setItemsError("Please add at least one item"); return; }
    setItemsError("");
    mutation.mutate({
      title: values.title.trim(), customer: values.customerId,
      deal: values.dealId ?? "", project: values.projectId ?? "",
      status: values.status, currency: values.currency,
      ...(values.expectedDate ? { expectedDate: values.expectedDate } : {}),
      notes: values.notes, terms: values.terms,
      items: toLineItemPayload(items), taxRate: values.taxRate, customFields,
    });
  };

  if (mode === "edit" && isFetching) return <div className="p-6">Loading…</div>;

  return (
    <EntityFormPage
      title={mode === "add" ? "New Sales Order" : "Edit Sales Order"}
      backHref={backHref}
      breadcrumb={[
        { label: "Sales Orders", href: "/sales-orders" },
        { label: mode === "add" ? "New" : "Edit" },
      ]}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <TextField<FormValues> name="title" label="Title" required placeholder="e.g. Q3 hardware order" />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Customer */}
                  <FormField control={form.control} name="customerId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer <span className="text-destructive ms-1">*</span></FormLabel>
                      <FormControl>
                        <AsyncSearchableSelect value={field.value ?? ""} onChange={field.onChange}
                          fetchFn={fetchCustomers} selectedLabel={customerLabel}
                          placeholder="Select Customer" searchPlaceholder="Search customers…"
                          onSelectItem={(item) => setCustomerLabel(item.label)} />
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

                  {/* Deal */}
                  <FormField control={form.control} name="dealId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deal</FormLabel>
                      <FormControl>
                        <AsyncSearchableSelect value={field.value ?? ""} onChange={field.onChange}
                          fetchFn={fetchDeals} selectedLabel={dealLabel}
                          placeholder="None" searchPlaceholder="Search deals…"
                          onSelectItem={(item) => setDealLabel(item.label)} />
                      </FormControl>
                    </FormItem>
                  )} />

                  {/* Project */}
                  <FormField control={form.control} name="projectId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <FormControl>
                        <AsyncSearchableSelect value={field.value ?? ""} onChange={field.onChange}
                          fetchFn={fetchProjects} selectedLabel={projectLabel}
                          placeholder="None" searchPlaceholder="Search projects…"
                          onSelectItem={(item) => setProjectLabel(item.label)} />
                      </FormControl>
                    </FormItem>
                  )} />

                  {/* Expected Date */}
                  <TextField<FormValues> name="expectedDate" label="Expected Date" type="date" />

                  {/* Status */}
                  <FormField control={form.control} name="status" render={({ field }) => {
                    const value = field.value ?? "";
                    const opts = value && !SO_STATUSES.some((o) => o.value === value)
                      ? [...SO_STATUSES, { value, label: value }]
                      : SO_STATUSES;
                    return (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <Select key={value} value={value} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                          <SelectContent>
                            {opts.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                    );
                  }} />
                </div>

                <TextareaField<FormValues> name="notes" label="Notes" placeholder="Order notes…" />
                <TextareaField<FormValues> name="terms" label="Terms" placeholder="Terms & conditions…" />

                <DynamicFields module="salesOrders" values={customFields} onChange={(k, v) => setCustomFields((prev) => ({ ...prev, [k]: v }))} />
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
