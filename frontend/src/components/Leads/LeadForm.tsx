import { ReactNode, useCallback, useMemo, useState } from "react";
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
import { useUnsavedChangesSnapshot } from "@/hooks/useUnsavedChangesGuard";
import { useModuleFieldLayout, type ResolvedField } from "@/hooks/useModuleFieldLayout";
import { groupConfiguredSections, collectMissingRequired, moduleLabelResolvers } from "@/lib/configuredForm";
import { queryKeys } from "@/lib/queryKeys";
import { createLead, updateLead, getUsers } from "@/utils/api";

const LEAD_SOURCES = [
  "Website", "Referral", "Cold Call", "Email",
  "Social Media", "Exhibition", "Walk-in", "Partner", "Other",
];
const CURRENCIES = ["EGP", "USD", "EUR", "GBP", "AED", "SAR"];

// name is required by the backend, so it always renders even if hidden.
const FORCE_VISIBLE = new Set(["name"]);

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

const resolvers = moduleLabelResolvers("leads");

export function LeadForm({ mode, id, defaultValues, customFieldValues, ownerLabel }: LeadFormProps) {
  const { tr } = useLanguage();
  const l = tr.leads;
  const navigate = useNavigate();
  const layout = useModuleFieldLayout("leads");

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
  const values = form.watch();
  const [customFields, setCustomFields] = useState<Record<string, string>>(customFieldValues ?? {});
  const { allowNavigation, resetSnapshot } = useUnsavedChangesSnapshot({ values, customFields });

  const backTo = mode === "create" ? "/leads" : `/leads/${id}`;

  const mutation = useSaveMutation<Record<string, unknown>>({
    save: (payload) =>
      mode === "create" ? createLead(payload) : updateLead(id!, payload),
    invalidate: [queryKeys.leads.all],
    successMessage: mode === "create" ? l.createdSuccess : l.updatedSuccess,
    errorMessage:   mode === "create" ? l.createFailed   : l.updateFailed,
    onSuccess: () => {
      allowNavigation();
      resetSnapshot();
      navigate(mode === "create" ? "/leads" : `/leads/${id}`);
    },
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

  const statusOptions   = Object.entries(l.statuses).map(([v, lbl]) => ({ value: v, label: lbl as string }));
  const ratingOptions   = Object.entries(l.ratings).map(([v, lbl]) => ({ value: v, label: lbl as string }));
  const sourceOptions   = LEAD_SOURCES.map((s) => ({ value: s, label: s }));
  const currencyOptions = CURRENCIES.map((c) => ({ value: c, label: c }));

  // Localized labels — used until an admin renames the field/section.
  const lf = l.fields as Record<string, string>;
  const localeFields: Record<string, string | undefined> = {
    name: lf.fullName, company: lf.company, jobTitle: lf.jobTitle, email: lf.email, phone: lf.phone,
    mobile: lf.mobile, website: lf.website, city: lf.city, country: lf.country, status: lf.status,
    rating: lf.rating, source: lf.source, campaign: lf.campaign, owner: lf.owner,
    expectedCloseDate: lf.expectedCloseDate, lostReason: lf.lostReason, notes: lf.notes,
    budget: lf.budget, currency: lf.currency,
  };
  const ls = l.sections as Record<string, string>;
  const localeSections: Record<string, string | undefined> = {
    contact: ls.contact, details: ls.leadDetails, opportunity: ls.opportunity,
  };

  const sectionsToRender = useMemo(() => groupConfiguredSections(layout, FORCE_VISIBLE), [layout]);

  const renderField = (f: ResolvedField): ReactNode => {
    const req = !!f.required;
    const label = resolvers.label(f, localeFields);
    switch (f.name) {
      case "name":     return <TextField<FormValues> key="name" name="name" label={label} required={req} placeholder={l.placeholders.fullName} />;
      case "company":  return <TextField<FormValues> key="company" name="company" label={label} required={req} />;
      case "jobTitle": return <TextField<FormValues> key="jobTitle" name="jobTitle" label={label} required={req} />;
      case "email":    return <TextField<FormValues> key="email" name="email" label={label} required={req} type="email" />;
      case "phone":    return <TextField<FormValues> key="phone" name="phone" label={label} required={req} />;
      case "mobile":   return <TextField<FormValues> key="mobile" name="mobile" label={label} required={req} />;
      case "website":  return <TextField<FormValues> key="website" name="website" label={label} required={req} placeholder={l.placeholders.website} />;
      case "city":     return <TextField<FormValues> key="city" name="city" label={label} required={req} />;
      case "country":  return <TextField<FormValues> key="country" name="country" label={label} required={req} />;
      case "status":   return <SelectField<FormValues> key="status" name="status" label={label} required={req} options={statusOptions} />;
      case "rating":   return <SelectField<FormValues> key="rating" name="rating" label={label} required={req} options={ratingOptions} placeholder={l.placeholders.rating} />;
      case "source":   return <SelectField<FormValues> key="source" name="source" label={label} required={req} options={sourceOptions} placeholder={l.placeholders.source} />;
      case "campaign": return <TextField<FormValues> key="campaign" name="campaign" label={label} required={req} placeholder={l.placeholders.campaign} />;
      case "owner":
        return (
          <FormField key="owner" control={form.control} name="owner" render={({ field }) => (
            <FormItem className="mb-3">
              <FormLabel>{label}</FormLabel>
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
          )} />
        );
      case "expectedCloseDate": return <TextField<FormValues> key="expectedCloseDate" name="expectedCloseDate" label={label} required={req} type="date" />;
      case "lostReason":
        return status === "unqualified"
          ? <TextField<FormValues> key="lostReason" name="lostReason" label={label} required={req} placeholder={l.placeholders.lostReason} />
          : null;
      case "notes":    return <TextareaField<FormValues> key="notes" name="notes" label={label} required={req} placeholder={l.placeholders.notes} />;
      case "budget":   return <TextField<FormValues> key="budget" name="budget" label={label} required={req} type="number" placeholder={l.placeholders.budget} />;
      case "currency": return <SelectField<FormValues> key="currency" name="currency" label={label} required={req} options={currencyOptions} />;
      default: return null;
    }
  };

  const onSubmit = (values: FormValues) => {
    const missing = collectMissingRequired(layout, values, FORCE_VISIBLE, ["name"]);
    if (missing.length) {
      missing.forEach((f) => form.setError(f.name as never, { type: "required", message: `${resolvers.label(f, localeFields)} is required` }));
      return;
    }
    const payload: Record<string, unknown> = { ...values };
    payload.rating            = values.rating || null;
    payload.budget            = values.budget ? Number(values.budget) : null;
    payload.expectedCloseDate = values.expectedCloseDate || null;
    payload.owner             = values.owner || null;
    payload.customFields      = customFields;
    if (!values.lostReason) delete payload.lostReason;
    mutation.mutate(payload);
  };

  const title = mode === "create" ? l.add : `${l.edit} — ${defaultValues?.name ?? ""}`;

  return (
    <EntityFormPage title={title} backHref={backTo} breadcrumb={[{ label: l.title, href: "/leads" }, { label: mode === "create" ? "New" : "Edit" }]}>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0"
        >
          {sectionsToRender.map((s) => {
            const nodes = s.fields.map((f) => renderField(f)).filter(Boolean);
            if (nodes.length === 0) return null;
            return (
              <div key={s.id}>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 mt-2">
                  {resolvers.sectionTitle(s, localeSections)}
                </h2>
                {nodes}
              </div>
            );
          })}

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
