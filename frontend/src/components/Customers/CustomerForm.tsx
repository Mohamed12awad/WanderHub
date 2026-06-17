import { Fragment, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@/components/ui/badge";
import { Form } from "@/components/ui/form";
import { EntityFormPage } from "@/components/common/EntityFormPage";
import DynamicFields from "@/components/common/DynamicFields";
import { FormActions, SelectField, TextField } from "@/components/common/form";
import { useModuleFieldLayout, type ResolvedField } from "@/hooks/useModuleFieldLayout";
import { SYSTEM_DEFAULTS, DEFAULT_SECTIONS } from "@/config/fieldDefaults";
import { useSaveMutation } from "@/hooks/useSaveMutation";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { queryKeys } from "@/lib/queryKeys";
import { createCustomer, getUsers, updateCustomer } from "@/utils/api";
import { customerSchema } from "@/validations/schemas";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const LEAD_SOURCES = ["Website", "Referral", "Cold Call", "Email", "Social Media", "Walk-in", "Other"];
const LOCATIONS = ["Alex", "Cairo"];
const STATUSES = ["Draft", "Called", "In Progress", "Offer Sent", "Deal Closed", "Deal Lost"];
const GENDERS = ["Male", "Female"];

type CustomerFormValues = z.infer<typeof customerSchema>;

type UserOption = {
  _id: string;
  name: string;
};

type CustomerFormProps = {
  mode: "create" | "edit";
  id?: string;
  initialValues?: Partial<CustomerFormValues>;
  initialCustomFields?: Record<string, string>;
};

const EMPTY_CUSTOMER: CustomerFormValues = {
  name: "",
  type: "individual",
  firstName: "",
  lastName: "",
  companyName: "",
  taxId: "",
  phone: "",
  mobile: "",
  email: "",
  company: "",
  jobTitle: "",
  website: "",
  address: {
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "",
  },
  identification: {
    passportNumber: "",
    nationalId: "",
  },
  dateOfBirth: "",
  gender: "",
  preferredContactMethod: "",
  paymentInformation: {
    cardType: "",
    cardNumber: "",
    expirationDate: "",
  },
  loyaltyProgram: {
    memberId: "",
    points: "",
  },
  emergencyContact: {
    name: "",
    phone: "",
    relationship: "",
  },
  location: "",
  source: "",
  status: "Draft",
  owner: "",
  notes: "",
};

const digitsOnlyPhone = (value: string) => value.replace(/\D/g, "").slice(0, 11);
const options = (items: string[]) => items.map((value) => ({ value, label: value }));

// name/phone/owner are mandated by the backend, so they always render even if an
// admin marks them hidden in the field config — otherwise the form can't submit.
const FORCE_VISIBLE = new Set(["name", "phone", "owner"]);

const getPath = (obj: any, path: string): unknown =>
  path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);

// The English system-default label per field name. When a field's configured
// label still equals this, it hasn't been admin-renamed, so we fall back to the
// localized translation; once renamed, the admin's label wins.
const SYS_DEFAULT_LABEL = new Map(SYSTEM_DEFAULTS.customers.map((d) => [d.name, d.label]));

// Maps each (possibly nested) field name to its `tr.customers.fields` key.
const LOCALE_FIELD_KEY: Record<string, string> = {
  name: "name", phone: "phone", mobile: "mobile", email: "email", company: "company",
  jobTitle: "jobTitle", website: "website", dateOfBirth: "dateOfBirth", gender: "gender",
  location: "location", owner: "owner", status: "status", source: "source", notes: "notes",
  "address.street": "street", "address.city": "city", "address.state": "state",
  "address.zip": "zip", "address.country": "country",
  "identification.passportNumber": "passportNumber", "identification.nationalId": "nationalId",
  "emergencyContact.name": "name", "emergencyContact.phone": "phone", "emergencyContact.relationship": "relationship",
  "paymentInformation.cardType": "cardType", "paymentInformation.cardNumber": "cardNumber",
  "paymentInformation.expirationDate": "expirationDate",
  "loyaltyProgram.memberId": "memberId", "loyaltyProgram.points": "points",
};

const SEC_DEFAULT_LABEL = new Map(DEFAULT_SECTIONS.customers.map((s) => [s.id, s.label]));

// Maps each default section id to its localized title key on `tr.customers`.
const LOCALE_SECTION_KEY: Record<string, string> = {
  personal: "personalInformation", work: "workRelated", address: "addressInformation",
  identification: "identificationInformation", emergency: "emergencyContact",
  payment: "paymentInformation", loyalty: "loyaltyProgram",
};

function toDateInputValue(value: unknown): string {
  if (!value || typeof value !== "string") return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
}

// Recursively replaces any null (the API's representation of an empty optional
// column) with "", so text inputs stay controlled and the zod string schemas
// don't reject a loaded contact with "expected string, received null".
function nullToEmptyDeep<T>(value: T): T {
  if (value === null) return "" as unknown as T;
  if (Array.isArray(value)) return value.map((v) => nullToEmptyDeep(v)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = nullToEmptyDeep(v);
    return out as T;
  }
  return value;
}

function mergeCustomerValues(initial?: Partial<CustomerFormValues> | any): CustomerFormValues {
  const data = initial ?? {};
  const type: "individual" | "company" = data.type === "company" ? "company" : "individual";
  const merged = {
    ...EMPTY_CUSTOMER,
    ...data,
    type,
    firstName: data.firstName ?? "",
    lastName: data.lastName ?? "",
    companyName: data.companyName ?? "",
    taxId: data.taxId ?? "",
    address: { ...EMPTY_CUSTOMER.address, ...(data.address ?? {}) },
    identification: { ...EMPTY_CUSTOMER.identification, ...(data.identification ?? {}) },
    paymentInformation: { ...EMPTY_CUSTOMER.paymentInformation, ...(data.paymentInformation ?? {}) },
    loyaltyProgram: {
      ...EMPTY_CUSTOMER.loyaltyProgram,
      ...(data.loyaltyProgram ?? {}),
      points: data.loyaltyProgram?.points != null ? String(data.loyaltyProgram.points) : "",
    },
    emergencyContact: { ...EMPTY_CUSTOMER.emergencyContact, ...(data.emergencyContact ?? {}) },
    dateOfBirth: toDateInputValue(data.dateOfBirth) || data.dateOfBirth || "",
    owner: typeof data.owner === "object" ? data.owner?._id ?? "" : data.owner ?? "",
    customFields: undefined,
  };
  return nullToEmptyDeep(merged) as CustomerFormValues;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function CustomerForm({ mode, id, initialValues, initialCustomFields }: CustomerFormProps) {
  const navigate = useNavigate();
  const { tr } = useLanguage();
  const c = tr.customers;
  const layout = useModuleFieldLayout("customers");

  // Prefer the localized label until an admin renames the field/section.
  const labelFor = (f: ResolvedField): string => {
    const def = SYS_DEFAULT_LABEL.get(f.name);
    const localeKey = LOCALE_FIELD_KEY[f.name];
    if (def && f.label === def && localeKey) {
      return (c.fields as Record<string, string>)[localeKey] ?? f.label;
    }
    return f.label;
  };
  const sectionTitle = (s: { id: string; label: string }): string => {
    const def = SEC_DEFAULT_LABEL.get(s.id);
    const localeKey = LOCALE_SECTION_KEY[s.id];
    if (def && s.label === def && localeKey) {
      return (c as Record<string, any>)[localeKey] ?? s.label;
    }
    return s.label;
  };

  // Sections + their system fields in the admin-configured order, dropping hidden
  // ones (except the backend-mandatory name/phone/owner) and empty sections.
  const sectionsToRender = useMemo(() => {
    const bySection = new Map<string, ResolvedField[]>();
    for (const f of layout.allFields) {
      if (!f.isSystem) continue;
      if (f.hidden && !FORCE_VISIBLE.has(f.name)) continue;
      const arr = bySection.get(f.section) ?? [];
      arr.push(f);
      bySection.set(f.section, arr);
    }
    return layout.sections
      .map((s) => ({ id: s.id, label: s.label, fields: bySection.get(s.id) ?? [] }))
      .filter((s) => s.fields.length > 0);
  }, [layout]);

  // Option lists re-localize on language change (labels from `tr`), keyed by the
  // stored English value; memoized so unrelated renders don't reallocate.
  const genderOptions = useMemo(() => GENDERS.map((v) => ({ value: v, label: c.genders[v] ?? v })), [c]);
  const statusOptions = useMemo(() => STATUSES.map((v) => ({ value: v, label: c.statuses[v] ?? v })), [c]);
  const sourceOptions = useMemo(() => LEAD_SOURCES.map((v) => ({ value: v, label: c.sources[v] ?? v })), [c]);

  const defaultValues = useMemo(() => mergeCustomerValues(initialValues), [initialValues]);
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues,
  });
  const [customFields, setCustomFields] = useState<Record<string, string>>(initialCustomFields ?? {});
  const originalRef = useRef<string | null>(mode === "edit" ? JSON.stringify(defaultValues) : null);

  useEffect(() => {
    const next = mergeCustomerValues(initialValues);
    form.reset(next);
    setCustomFields(initialCustomFields ?? {});
    originalRef.current = mode === "edit" ? JSON.stringify(next) : null;
  }, [form, initialCustomFields, initialValues, mode]);

  const values = form.watch();
  const isDirty =
    mode === "edit" &&
    originalRef.current !== null &&
    JSON.stringify(values) !== originalRef.current;

  const { allowNavigation } = useUnsavedChangesGuard(isDirty);

  const usersQuery = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: () => getUsers(),
  });
  const usersRaw = usersQuery.data?.data;
  const users: UserOption[] = Array.isArray(usersRaw) ? usersRaw : usersRaw?.data ?? [];

  const mutation = useSaveMutation<Record<string, unknown>>({
    save: (payload) => mode === "edit" ? updateCustomer(id!, payload as any) : createCustomer(payload as any),
    invalidate: id
      ? [queryKeys.customers.all, queryKeys.customers.detail(id)]
      : [queryKeys.customers.all],
    successMessage: mode === "edit" ? c.updated : c.created,
    errorMessage: mode === "edit" ? c.saveFailed : c.createFailed,
    onSuccess: () => {
      allowNavigation();
      navigate(mode === "edit" ? `/customers/${id}` : "/customers");
    },
  });

  // Bespoke renderer per system field — keeps the rich widgets (owner/user select,
  // phone transforms, localized option lists) while order/section/required/visibility
  // come from the field config. Returns null for fields with no form input (e.g.
  // createdAt) so they're skipped.
  const renderField = (f: ResolvedField): ReactNode => {
    const req = !!f.required;
    const label = labelFor(f);
    switch (f.name) {
      case "name":
        return (
          <Fragment key="name">
            <TextField<CustomerFormValues> name="name" label={label} required={req} />
            <SelectField<CustomerFormValues>
              name="type"
              label="Contact Type"
              options={[
                { value: "individual", label: "Individual" },
                { value: "company", label: "Company" },
              ]}
            />
            {values.type === "company" ? (
              <Fragment>
                <TextField<CustomerFormValues> name="companyName" label="Company Name" />
                <TextField<CustomerFormValues> name="taxId" label="Tax ID" />
              </Fragment>
            ) : (
              <Fragment>
                <TextField<CustomerFormValues> name="firstName" label="First Name" />
                <TextField<CustomerFormValues> name="lastName" label="Last Name" />
              </Fragment>
            )}
          </Fragment>
        );
      case "phone":
        return <TextField<CustomerFormValues> key="phone" name="phone" label={label} required={req} inputMode="numeric" maxLength={11} transform={digitsOnlyPhone} />;
      case "mobile":
        return <TextField<CustomerFormValues> key="mobile" name="mobile" label={label} required={req} inputMode="numeric" maxLength={11} transform={digitsOnlyPhone} />;
      case "email":
        return <TextField<CustomerFormValues> key="email" name="email" label={label} required={req} type="email" />;
      case "company":
        return <TextField<CustomerFormValues> key="company" name="company" label={label} required={req} />;
      case "jobTitle":
        return <TextField<CustomerFormValues> key="jobTitle" name="jobTitle" label={label} required={req} />;
      case "website":
        return <TextField<CustomerFormValues> key="website" name="website" label={label} required={req} />;
      case "dateOfBirth":
        return <TextField<CustomerFormValues> key="dateOfBirth" name="dateOfBirth" label={label} required={req} type="date" />;
      case "gender":
        return <SelectField<CustomerFormValues> key="gender" name="gender" label={label} required={req} options={genderOptions} placeholder={c.placeholders.gender} />;
      case "location":
        return <SelectField<CustomerFormValues> key="location" name="location" label={label} required={req} options={options(LOCATIONS)} placeholder={c.placeholders.location} />;
      case "owner":
        return <SelectField<CustomerFormValues> key="owner" name="owner" label={label} required={req} options={users.map((u) => ({ value: u._id, label: u.name }))} placeholder={c.placeholders.owner} />;
      case "status":
        return <SelectField<CustomerFormValues> key="status" name="status" label={label} required={req} options={statusOptions} placeholder={c.placeholders.status} />;
      case "source":
        return <SelectField<CustomerFormValues> key="source" name="source" label={label} required={req} options={sourceOptions} placeholder={c.placeholders.source} />;
      case "notes":
        return <TextField<CustomerFormValues> key="notes" name="notes" label={label} required={req} />;
      case "address.street": case "address.city": case "address.state": case "address.zip": case "address.country":
      case "identification.passportNumber": case "identification.nationalId":
      case "emergencyContact.name": case "emergencyContact.relationship":
      case "paymentInformation.cardType": case "paymentInformation.cardNumber":
      case "loyaltyProgram.memberId":
        return <TextField<CustomerFormValues> key={f.name} name={f.name as never} label={label} required={req} />;
      case "emergencyContact.phone":
        return <TextField<CustomerFormValues> key={f.name} name="emergencyContact.phone" label={label} required={req} inputMode="numeric" maxLength={11} transform={digitsOnlyPhone} />;
      case "paymentInformation.expirationDate":
        return <TextField<CustomerFormValues> key={f.name} name="paymentInformation.expirationDate" label={label} required={req} type="date" />;
      case "loyaltyProgram.points":
        return <TextField<CustomerFormValues> key={f.name} name="loyaltyProgram.points" label={label} required={req} type="number" />;
      default:
        return null;
    }
  };

  const onSubmit = (data: CustomerFormValues) => {
    // Enforce admin-configured required flags beyond the schema's fixed core
    // (name/phone/owner). Visible required system fields must be non-empty.
    const missing = layout.allFields.filter(
      (f) => f.isSystem && f.required && !f.hidden && !FORCE_VISIBLE.has(f.name) && f.name !== "createdAt",
    );
    let blocked = false;
    for (const f of missing) {
      const v = getPath(data, f.name);
      if (v == null || String(v).trim() === "") {
        form.setError(f.name as never, { type: "required", message: `${f.label} is required` });
        blocked = true;
      }
    }
    if (blocked) return;

    const payload: Record<string, unknown> = {
      ...data,
      dateOfBirth: data.dateOfBirth || null,
      customFields,
    };
    mutation.mutate(payload);
  };

  return (
    <EntityFormPage
      title={
        <span className="inline-flex items-center gap-2">
          {mode === "edit" ? c.edit : c.add}
          {isDirty && (
            <Badge variant="outline" className="text-xs font-normal text-amber-600 border-amber-400 bg-amber-50 dark:bg-amber-900/20">
              {c.unsavedChanges}
            </Badge>
          )}
        </span>
      }
      backHref={mode === "edit" ? `/customers/${id}` : "/customers"}
      breadcrumb={[{ label: c.title, href: "/customers" }, { label: mode === "edit" ? tr.common.edit : tr.common.new }]}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sectionsToRender.map((s) => {
            const nodes = s.fields.map((f) => renderField(f)).filter(Boolean);
            if (nodes.length === 0) return null;
            return (
              <Section key={s.id} title={sectionTitle(s)}>
                {nodes}
              </Section>
            );
          })}

          <DynamicFields
            module="customers"
            values={customFields}
            onChange={(key, value) => setCustomFields((prev) => ({ ...prev, [key]: value }))}
          />

          <FormActions
            isSubmitting={mutation.isPending}
            onCancel={() => navigate(mode === "edit" ? `/customers/${id}` : "/customers")}
            submitLabel={mode === "edit" ? c.updateCustomer : c.add}
          />
        </form>
      </Form>
    </EntityFormPage>
  );
}

export default CustomerForm;
