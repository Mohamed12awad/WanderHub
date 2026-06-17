import { useCallback, useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { EntityFormPage } from "@/components/common/EntityFormPage";
import { TextField, SelectField, TextareaField, FormActions } from "@/components/common/form";
import { AsyncSearchableSelect } from "@/components/common/combobox";
import DynamicFields from "@/components/common/DynamicFields";
import { useSaveMutation } from "@/hooks/useSaveMutation";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { queryKeys } from "@/lib/queryKeys";
import { createDeal, updateDeal, getDealById, getCustomers, getUsers } from "@/utils/api";
import { CURRENCIES } from "@/utils/constants";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";

const DEAL_STATUSES = ["lead", "qualified", "proposal", "negotiation", "won", "lost", "cancelled"];
const DEAL_SOURCES  = ["Website", "Referral", "Cold Call", "Email", "Social Media", "Walk-in", "Exhibition", "Partner", "Other"];
const DEAL_TYPES    = ["new_business", "renewal", "upsell", "cross_sell"];
const DEAL_TYPE_LABELS: Record<string, string> = { new_business: "New Business", renewal: "Renewal", upsell: "Upsell", cross_sell: "Cross-sell" };
const DEAL_CATEGORIES = ["Software", "Hardware", "Services", "Consulting", "Maintenance", "Licensing", "Support", "Training", "Marketing", "Other"];
const PRIORITIES = ["low", "medium", "high"];
const STATUS_PROBABILITY: Record<string, number> = { lead: 10, qualified: 30, proposal: 50, negotiation: 75, won: 100, lost: 0, cancelled: 0 };

function oneWeekFromNow() {
  const d = new Date(); d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
}

const schema = z.object({
  title:             z.string().min(1, "Title is required"),
  customer:          z.string().min(1, "Customer is required"),
  category:          z.string().optional(),
  owner:             z.string().optional(),
  dealType:          z.string().optional(),
  price:             z.coerce.number().min(0, "Amount must be ≥ 0"),
  currency:          z.string().min(1),
  status:            z.string().min(1),
  priority:          z.string().min(1),
  probability:       z.coerce.number().min(0).max(100),
  source:            z.string().optional(),
  expectedCloseDate: z.string().optional(),
  lostReason:        z.string().optional(),
  notes:             z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface DealFormProps {
  mode: "create" | "edit";
  id?: string;
  defaultValues?: Partial<FormValues> & { customFields?: Record<string, string>; customerLabel?: string; ownerLabel?: string };
}

export function DealForm({ mode, id, defaultValues }: DealFormProps) {
  const navigate = useNavigate();
  const { data: wsData } = useWorkspaceSettings();
  const rawStages = (wsData as any)?.pipelineStages as { key: string; label: string }[] | undefined;
  const dealStages: { key: string; label: string }[] =
    rawStages?.length ? rawStages : DEAL_STATUSES.map((s) => ({ key: s, label: s }));

  const [customFields, setCustomFields] = useState<Record<string, string>>(defaultValues?.customFields ?? {});
  const [customerLabel, setCustomerLabel] = useState(defaultValues?.customerLabel ?? "");
  const [ownerLabel, setOwnerLabel] = useState(defaultValues?.ownerLabel ?? "");
  const [isDirty, setIsDirty] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      title: "", customer: "", category: "", owner: "", dealType: "",
      price: 0, currency: "EGP", status: "lead", priority: "medium",
      probability: 10, source: "", expectedCloseDate: oneWeekFromNow(),
      lostReason: "", notes: "",
      ...defaultValues,
    },
  });

  const status = form.watch("status");

  // Load existing deal for edit mode
  useEffect(() => {
    if (mode !== "edit" || !id) return;
    getDealById(id).then(({ data }) => {
      const d = data.deal;
      form.reset({
        title: d.title ?? "", customer: d.customer?._id ?? "", category: d.category ?? "",
        owner: d.owner?._id ?? "", dealType: d.dealType ?? "", price: Number(d.price),
        currency: d.currency ?? "EGP", status: d.status ?? "lead", priority: d.priority ?? "medium",
        probability: Number(d.probability ?? STATUS_PROBABILITY[d.status ?? "lead"] ?? 10),
        source: d.source ?? "",
        expectedCloseDate: d.expectedCloseDate ? new Date(d.expectedCloseDate).toISOString().split("T")[0] : "",
        lostReason: d.lostReason ?? "", notes: d.notes ?? "",
      });
      setCustomFields(d.customFields ?? {});
      setCustomerLabel(d.customer?.name ?? "");
      setOwnerLabel(d.owner?.name ?? "");
    });
  }, [id, mode, form]);

  // Unsaved-changes guard — blocks SPA navigation + hard unload while dirty.
  useEffect(() => {
    const sub = form.watch(() => setIsDirty(true));
    return () => sub.unsubscribe();
  }, [form]);
  const { allowNavigation } = useUnsavedChangesGuard(isDirty);

  const backTo = mode === "create" ? "/deals" : `/deals/${id}`;

  const mutation = useSaveMutation<Record<string, unknown>>({
    save: (payload) => mode === "create" ? createDeal(payload as any) : updateDeal(id!, payload as any),
    invalidate: [queryKeys.deals.all],
    successMessage: mode === "create" ? "Deal created" : "Deal updated",
    errorMessage:   mode === "create" ? "Failed to create deal" : "Failed to update deal",
    onSuccess: () => {
      allowNavigation();
      setIsDirty(false);
      navigate(mode === "create" ? "/deals" : `/deals/${id}`);
    },
  });

  const fetchCustomers = useCallback(
    (q: string) => getCustomers({ page: 1, limit: 20, q }).then((r) =>
      (r.data as any).data.map((c: { _id: string; name: string }) => ({ value: c._id, label: c.name }))
    ), [],
  );
  const fetchUsers = useCallback(
    (q: string) => getUsers({ page: 1, limit: 20, q }).then((r) =>
      (r.data as any).data.map((u: { _id: string; name: string }) => ({ value: u._id, label: u.name }))
    ), [],
  );

  const onSubmit = (values: FormValues) => {
    mutation.mutate({
      ...values,
      owner: values.owner || null,
      expectedCloseDate: values.expectedCloseDate ? new Date(values.expectedCloseDate) : new Date(),
      customFields,
    });
  };

  const stageOptions    = dealStages.map((s) => ({ value: s.key, label: s.label }));
  const priorityOptions = PRIORITIES.map((p) => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }));
  const sourceOptions   = DEAL_SOURCES.map((s) => ({ value: s, label: s }));
  const categoryOptions = DEAL_CATEGORIES.map((c) => ({ value: c, label: c }));
  const typeOptions     = DEAL_TYPES.map((t) => ({ value: t, label: DEAL_TYPE_LABELS[t] }));
  const currencyOptions = CURRENCIES.map((c) => ({ value: c, label: c }));

  const title = mode === "create" ? "Add Deal" : (
    <span className="flex items-center gap-2">
      Edit Deal
      {isDirty && (
        <Badge variant="outline" className="text-xs font-normal text-amber-600 border-amber-400 bg-amber-50 dark:bg-amber-900/20">
          Unsaved changes
        </Badge>
      )}
    </span>
  );

  return (
    <EntityFormPage title={title} backHref={backTo} breadcrumb={[{ label: "Deals", href: "/deals" }, { label: mode === "create" ? "New" : "Edit" }]}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">

          {/* ── Left: Deal Details ── */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 mt-2">Deal Details</h2>

            <TextField<FormValues> name="title" label="Title" required placeholder="e.g. Website Redesign for Acme" />

            {/* Customer — async combobox */}
            <FormField control={form.control} name="customer" render={({ field }) => (
              <FormItem className="mb-3">
                <FormLabel>Customer <span className="text-destructive ms-1">*</span></FormLabel>
                <FormControl>
                  <AsyncSearchableSelect value={field.value ?? ""} onChange={(v) => { field.onChange(v); }}
                    fetchFn={fetchCustomers} selectedLabel={customerLabel}
                    placeholder="Select Contact" searchPlaceholder="Search contacts…"
                    onSelectItem={(item) => setCustomerLabel(item.label)} />
                </FormControl>
              </FormItem>
            )} />

            <SelectField<FormValues> name="category" label="Category" options={categoryOptions} placeholder="Select category (optional)" />

            {/* Owner — async combobox */}
            <FormField control={form.control} name="owner" render={({ field }) => (
              <FormItem className="mb-3">
                <FormLabel>Deal Owner</FormLabel>
                <FormControl>
                  <AsyncSearchableSelect value={field.value ?? ""} onChange={field.onChange}
                    fetchFn={fetchUsers} selectedLabel={ownerLabel}
                    placeholder="Assign to a user (optional)" searchPlaceholder="Search users…"
                    onSelectItem={(item) => setOwnerLabel(item.label)} />
                </FormControl>
              </FormItem>
            )} />

            <SelectField<FormValues> name="dealType" label="Deal Type" options={typeOptions} placeholder="Select type" />

            <TextareaField<FormValues> name="notes" label="Notes" placeholder="Internal notes about this deal…" />
          </div>

          {/* ── Right: Sales & Financial ── */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 mt-2">Sales Information</h2>

            <div className="grid grid-cols-2 gap-3">
              <SelectField<FormValues> name="status"   label="Stage"    options={stageOptions} />
              <SelectField<FormValues> name="priority" label="Priority" options={priorityOptions} />
            </div>

            <SelectField<FormValues> name="source" label="Source" options={sourceOptions} placeholder="How did they find you?" />

            <div className="grid grid-cols-2 gap-3">
              <TextField<FormValues> name="expectedCloseDate" label="Expected Close" type="date" />
              <TextField<FormValues> name="probability"       label="Win Probability %" type="number" />
            </div>

            {status === "lost" && (
              <TextField<FormValues> name="lostReason" label="Lost Reason" placeholder="Why was this deal lost?" />
            )}

            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 mt-5">Financial</h2>

            <div className="grid grid-cols-2 gap-3">
              <TextField<FormValues>   name="price"    label="Amount"   required type="number" placeholder="0" />
              <SelectField<FormValues> name="currency" label="Currency" options={currencyOptions} />
            </div>
          </div>

          <DynamicFields
            module="deals"
            values={customFields}
            onChange={(k, v) => setCustomFields((prev) => ({ ...prev, [k]: v }))}
          />

          <FormActions
            isSubmitting={mutation.isPending}
            onCancel={() => navigate(backTo)}
            submitLabel={mode === "create" ? "Add Deal" : "Update Deal"}
          />
        </form>
      </Form>
    </EntityFormPage>
  );
}
