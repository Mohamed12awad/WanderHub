import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@/components/ui/badge";
import { Form } from "@/components/ui/form";
import { EntityFormPage } from "@/components/common/EntityFormPage";
import DynamicFields from "@/components/common/DynamicFields";
import { FormActions, SelectField, TextField } from "@/components/common/form";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import { useSaveMutation } from "@/hooks/useSaveMutation";
import { queryKeys } from "@/lib/queryKeys";
import { createCustomer, getUsers, updateCustomer } from "@/utils/api";
import { customerSchema } from "@/validations/schemas";
import { useNavigate } from "react-router-dom";

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

function toDateInputValue(value: unknown): string {
  if (!value || typeof value !== "string") return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
}

function mergeCustomerValues(initial?: Partial<CustomerFormValues> | any): CustomerFormValues {
  const data = initial ?? {};
  return {
    ...EMPTY_CUSTOMER,
    ...data,
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
  } as CustomerFormValues;
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
  const { getSystemFieldLabel } = useWorkspaceSettings();
  const lbl = useCallback(
    (name: string, fallback: string) => getSystemFieldLabel("customers", name) ?? fallback,
    [getSystemFieldLabel],
  );

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

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

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
    successMessage: mode === "edit" ? "Customer updated" : "Customer created",
    errorMessage: mode === "edit" ? "Could not save changes" : "Error creating customer",
    onSuccess: () => navigate(mode === "edit" ? `/customers/${id}` : "/customers"),
  });

  const onSubmit = (data: CustomerFormValues) => {
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
          {mode === "edit" ? "Edit Customer" : "Add Customer"}
          {isDirty && (
            <Badge variant="outline" className="text-xs font-normal text-amber-600 border-amber-400 bg-amber-50 dark:bg-amber-900/20">
              Unsaved changes
            </Badge>
          )}
        </span>
      }
      backHref={mode === "edit" ? `/customers/${id}` : "/customers"}
      breadcrumb={[{ label: "Customers", href: "/customers" }, { label: mode === "edit" ? "Edit" : "New" }]}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Section title="Personal Information">
            <TextField<CustomerFormValues> name="name" label={lbl("name", "Name")} required />
            <TextField<CustomerFormValues> name="phone" label={lbl("phone", "Phone")} required inputMode="numeric" maxLength={11} transform={digitsOnlyPhone} />
            <TextField<CustomerFormValues> name="mobile" label={lbl("mobile", "Mobile")} inputMode="numeric" maxLength={11} transform={digitsOnlyPhone} />
            <TextField<CustomerFormValues> name="email" label={lbl("email", "Email")} type="email" />
            <TextField<CustomerFormValues> name="company" label={lbl("company", "Company")} />
            <TextField<CustomerFormValues> name="jobTitle" label={lbl("jobTitle", "Job Title")} />
            <TextField<CustomerFormValues> name="website" label={lbl("website", "Website")} />
            <TextField<CustomerFormValues> name="dateOfBirth" label={lbl("dateOfBirth", "Date of Birth")} type="date" />
            <SelectField<CustomerFormValues> name="gender" label={lbl("gender", "Gender")} options={options(GENDERS)} placeholder="Gender" />
          </Section>

          <Section title="Work Related">
            <SelectField<CustomerFormValues> name="location" label={lbl("location", "Location")} options={options(LOCATIONS)} placeholder="Location" />
            <SelectField<CustomerFormValues>
              name="owner"
              label={lbl("owner", "Owner")}
              required
              options={users.map((user) => ({ value: user._id, label: user.name }))}
              placeholder="Owner"
            />
            <SelectField<CustomerFormValues> name="status" label={lbl("status", "Status")} options={options(STATUSES)} placeholder="Status" />
            <SelectField<CustomerFormValues> name="source" label={lbl("source", "Lead Source")} options={options(LEAD_SOURCES)} placeholder="How did they find you?" />
            <TextField<CustomerFormValues> name="notes" label={lbl("notes", "Notes")} />
          </Section>

          <Section title="Address Information">
            <TextField<CustomerFormValues> name="address.street" label="Street" />
            <TextField<CustomerFormValues> name="address.city" label="City" />
            <TextField<CustomerFormValues> name="address.state" label="State" />
            <TextField<CustomerFormValues> name="address.zip" label="ZIP Code" />
            <TextField<CustomerFormValues> name="address.country" label="Country" />
          </Section>

          <Section title="Identification Information">
            <TextField<CustomerFormValues> name="identification.passportNumber" label="Passport Number" />
            <TextField<CustomerFormValues> name="identification.nationalId" label="National ID" />
          </Section>

          <Section title="Emergency Contact">
            <TextField<CustomerFormValues> name="emergencyContact.name" label="Name" />
            <TextField<CustomerFormValues> name="emergencyContact.phone" label="Phone" inputMode="numeric" maxLength={11} transform={digitsOnlyPhone} />
            <TextField<CustomerFormValues> name="emergencyContact.relationship" label="Relationship" />
          </Section>

          <Section title="Payment Information">
            <TextField<CustomerFormValues> name="paymentInformation.cardType" label="Card Type" />
            <TextField<CustomerFormValues> name="paymentInformation.cardNumber" label="Card Number" />
            <TextField<CustomerFormValues> name="paymentInformation.expirationDate" label="Expiration Date" type="date" />
          </Section>

          <Section title="Loyalty Program">
            <TextField<CustomerFormValues> name="loyaltyProgram.memberId" label="Member ID" />
            <TextField<CustomerFormValues> name="loyaltyProgram.points" label="Points" type="number" />
          </Section>

          <DynamicFields
            module="customers"
            values={customFields}
            onChange={(key, value) => setCustomFields((prev) => ({ ...prev, [key]: value }))}
          />

          <FormActions
            isSubmitting={mutation.isPending}
            onCancel={() => navigate(mode === "edit" ? `/customers/${id}` : "/customers")}
            submitLabel={mode === "edit" ? "Update Customer" : "Add Customer"}
          />
        </form>
      </Form>
    </EntityFormPage>
  );
}

export default CustomerForm;
