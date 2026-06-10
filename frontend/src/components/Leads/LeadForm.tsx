import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { EntityFormPage } from "@/components/common/EntityFormPage";
import { TextField, SelectField, TextareaField, FormActions } from "@/components/common/form";
import { AsyncSearchableSelect } from "@/components/common/combobox";
import { useLanguage } from "@/contexts/LanguageContext";
import DynamicFields from "@/components/common/DynamicFields";
import { useSaveMutation } from "@/hooks/useSaveMutation";
import { queryKeys } from "@/lib/queryKeys";
import { createLead, updateLead, getUsers } from "@/utils/api";

const LEAD_SOURCES = [
  "Website", "Referral", "Cold Call", "Email",
  "Social Media", "Exhibition", "Walk-in", "Partner", "Other",
];
const CURRENCIES = ["EGP", "USD", "EUR", "GBP", "AED", "SAR"];

const schema = z.object({
  name:              z.string().min(1, "Name is required"),
  company:           z.string().optional(),
  jobTitle:          z.string().optional(),
  email:             z.string().email("Invalid email").optional().or(z.literal("")),
  phone:             z.string().optional(),
  mobile:            z.string().optional(),
  website:           z.string().optional(),
  city:              z.string().optional(),
  country:           z.string().optional(),
  source:            z.string().optional(),
  campaign:          z.string().optional(),
  status:            z.string().optional(),
  rating:            z.string().optional(),
  budget:            z.string().optional(),
  currency:          z.string().optional(),
  expectedCloseDate: z.string().optional(),
  lostReason:        z.string().optional(),
  notes:             z.string().optional(),
  owner:             z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface LeadFormProps {
  mode: "create" | "edit";
  id?: string;
  defaultValues?: Partial<FormValues>;
  customFieldValues?: Record<string, string>;
  ownerLabel?: string;
}

export function LeadForm({ mode, id, defaultValues, customFieldValues, ownerLabel }: LeadFormProps) {
  const { tr } = useLanguage();
  const l = tr.leads;
  const navigate = useNavigate();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", company: "", jobTitle: "", email: "", phone: "", mobile: "",
      website: "", city: "", country: "", source: "", campaign: "",
      status: "new", rating: "", budget: "", currency: "EGP",
      expectedCloseDate: "", lostReason: "", notes: "", owner: "",
      ...defaultValues,
    },
  });

  const status = form.watch("status");
  const [customFields, setCustomFields] = useState<Record<string, string>>(customFieldValues ?? {});

  const backTo = mode === "create" ? "/leads" : `/leads/${id}`;

  const mutation = useSaveMutation<Record<string, unknown>>({
    save: (payload) =>
      mode === "create" ? createLead(payload) : updateLead(id!, payload),
    invalidate: [queryKeys.leads.all],
    successMessage: mode === "create" ? l.createdSuccess : l.updatedSuccess,
    errorMessage:   mode === "create" ? l.createFailed   : l.updateFailed,
    onSuccess: () => navigate(mode === "create" ? "/leads" : `/leads/${id}`),
  });

  const fetchUsers = useCallback(
    (q: string) =>
      getUsers({ page: 1, limit: 20, q }).then((r) =>
        ((r.data as any).data ?? []).map((u: { _id: string; name: string }) => ({
          value: u._id, label: u.name,
        }))
      ),
    [],
  );

  const onSubmit = (values: FormValues) => {
    const payload: Record<string, unknown> = { ...values };
    payload.rating            = values.rating || null;
    payload.budget            = values.budget ? Number(values.budget) : null;
    payload.expectedCloseDate = values.expectedCloseDate || null;
    payload.owner             = values.owner || null;
    payload.customFields      = customFields;
    if (!values.lostReason) delete payload.lostReason;
    mutation.mutate(payload);
  };

  const statusOptions   = Object.entries(l.statuses).map(([v, lbl]) => ({ value: v, label: lbl as string }));
  const ratingOptions   = Object.entries(l.ratings).map(([v, lbl]) => ({ value: v, label: lbl as string }));
  const sourceOptions   = LEAD_SOURCES.map((s) => ({ value: s, label: s }));
  const currencyOptions = CURRENCIES.map((c) => ({ value: c, label: c }));

  const title = mode === "create" ? l.add : `${l.edit} — ${defaultValues?.name ?? ""}`;

  return (
    <EntityFormPage title={title} backHref={backTo} breadcrumb={[{ label: l.title, href: "/leads" }, { label: mode === "create" ? "New" : "Edit" }]}>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0"
        >
          {/* ── Left: Contact ── */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 mt-2">
              {l.sections.contact}
            </h2>

            <TextField<FormValues> name="name" label={l.fields.fullName} required placeholder={l.placeholders.fullName} />

            <div className="grid grid-cols-2 gap-3">
              <TextField<FormValues> name="company"  label={l.fields.company} />
              <TextField<FormValues> name="jobTitle" label={l.fields.jobTitle} />
            </div>

            <TextField<FormValues> name="email"  label={l.fields.email}  type="email" />

            <div className="grid grid-cols-2 gap-3">
              <TextField<FormValues> name="phone"  label={l.fields.phone} />
              <TextField<FormValues> name="mobile" label={l.fields.mobile} />
            </div>

            <TextField<FormValues> name="website" label={l.fields.website} placeholder={l.placeholders.website} />

            <div className="grid grid-cols-2 gap-3">
              <TextField<FormValues> name="city"    label={l.fields.city} />
              <TextField<FormValues> name="country" label={l.fields.country} />
            </div>
          </div>

          {/* ── Right: Lead Details ── */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 mt-2">
              {l.sections.leadDetails}
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <SelectField<FormValues> name="status" label={l.fields.status} options={statusOptions} />
              <SelectField<FormValues> name="rating" label={l.fields.rating} options={ratingOptions} placeholder={l.placeholders.rating} />
            </div>

            <SelectField<FormValues> name="source" label={l.fields.source} options={sourceOptions} placeholder={l.placeholders.source} />

            <TextField<FormValues> name="campaign" label={l.fields.campaign} placeholder={l.placeholders.campaign} />

            {/* Owner — custom async combobox; keep FormField directly */}
            <FormField
              control={form.control}
              name="owner"
              render={({ field }) => (
                <FormItem className="mb-3">
                  <FormLabel>{l.fields.owner}</FormLabel>
                  <FormControl>
                    <AsyncSearchableSelect
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      fetchFn={fetchUsers}
                      selectedLabel={ownerLabel}
                      placeholder={l.placeholders.owner}
                      searchPlaceholder={tr.common.search + "…"}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <TextField<FormValues> name="expectedCloseDate" label={l.fields.expectedCloseDate} type="date" />

            {status === "unqualified" && (
              <TextField<FormValues> name="lostReason" label={l.fields.lostReason} placeholder={l.placeholders.lostReason} />
            )}

            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 mt-5">
              {l.sections.opportunity}
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <TextField<FormValues>   name="budget"   label={l.fields.budget}   type="number" placeholder={l.placeholders.budget} />
              <SelectField<FormValues> name="currency" label={l.fields.currency} options={currencyOptions} />
            </div>
          </div>

          {/* ── Notes (full width) ── */}
          <div className="col-span-1 md:col-span-2">
            <TextareaField<FormValues> name="notes" label={l.fields.notes} placeholder={l.placeholders.notes} />
          </div>

          <DynamicFields
            module="leads"
            values={customFields}
            onChange={(k, v) => setCustomFields((prev) => ({ ...prev, [k]: v }))}
          />

          <FormActions
            isSubmitting={mutation.isPending}
            onCancel={() => navigate(backTo)}
            submitLabel={mode === "create" ? l.add : tr.common.save}
          />
        </form>
      </Form>
    </EntityFormPage>
  );
}
