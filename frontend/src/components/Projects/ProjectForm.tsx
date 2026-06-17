import { useCallback, useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Form } from "@/components/ui/form";
import { AsyncSearchableSelect } from "@/components/common/combobox";
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { EntityFormPage } from "@/components/common/EntityFormPage";
import { TextField, TextareaField, SelectField, FormActions } from "@/components/common/form";
import DynamicFields from "@/components/common/DynamicFields";
import { useSaveMutation } from "@/hooks/useSaveMutation";
import { useUnsavedChangesSnapshot } from "@/hooks/useUnsavedChangesGuard";
import { queryKeys } from "@/lib/queryKeys";
import { createProject, updateProject, getProjectById, getCustomers, getDeals, getUsers } from "@/utils/api";
import { toCustomFieldValues } from "@/utils/customFields";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";

const CURRENCIES = ["EGP", "USD", "EUR", "GBP", "AED", "SAR"];

const asOptions = (r: any, labelKey: string) =>
  ((Array.isArray(r?.data) ? r.data : r?.data?.data ?? []) as any[]).map((x) => ({
    value: x._id,
    label: x[labelKey],
  }));

const STATUS_OPTIONS = [
  { value: "planning",  label: "Planning" },
  { value: "active",    label: "Active" },
  { value: "on_hold",   label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];
const PRIORITY_OPTIONS = [
  { value: "low",    label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high",   label: "High" },
  { value: "urgent", label: "Urgent" },
];
const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c, label: c }));

const schema = z.object({
  name:        z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  status:      z.string().min(1),
  priority:    z.string().min(1),
  budget:      z.coerce.number().min(0).optional().or(z.literal("")),
  currency:    z.string().min(1),
  startDate:   z.string().optional(),
  endDate:     z.string().optional(),
  customer:    z.string().optional(),
  deal:        z.string().optional(),
  manager:     z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function ProjectForm({ mode }: { mode: "add" | "edit" }) {
  const navigate = useNavigate();
  const { id }   = useParams();
  const [searchParams] = useSearchParams();
  const location       = useLocation();
  const cloneData = mode === "add" ? (location.state as any)?.clone : undefined;
  const { tr }  = useLanguage();

  const [customFields, setCustomFields] = useState<Record<string, string>>(
    cloneData?.customFields ? toCustomFieldValues(cloneData.customFields) : {},
  );
  const [customerLabel, setCustomerLabel] = useState(cloneData?.customerLabel ?? "");
  const [dealLabel, setDealLabel]         = useState(cloneData?.dealLabel ?? "");
  const [managerLabel, setManagerLabel]   = useState(cloneData?.managerLabel ?? "");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      name: cloneData?.name ?? "", description: cloneData?.description ?? "",
      status: "planning", priority: cloneData?.priority ?? "medium",
      budget: cloneData?.budget ?? "", currency: cloneData?.currency ?? "EGP",
      startDate: "", endDate: "",
      customer: cloneData?.customer ?? "", deal: cloneData?.deal ?? searchParams.get("deal") ?? "",
      manager: cloneData?.manager ?? "",
    },
  });
  const values = form.watch();

  // Reference data — server-side searched lookups
  const fetchCustomers = useCallback((q: string) => getCustomers({ page: 1, limit: 20, q }).then((r) => asOptions(r, "name")), []);
  const fetchDeals     = useCallback((q: string) => getDeals({ page: 1, limit: 20, q }).then((r) => asOptions(r, "title")), []);
  const fetchUsers     = useCallback((q: string) => getUsers({ page: 1, limit: 20, q }).then((r) => asOptions(r, "name")), []);

  // Load existing project
  const { data: projectData } = useQuery({
    queryKey: queryKeys.projects.detail(id!),
    queryFn: () => getProjectById(id!),
    enabled: mode === "edit" && !!id,
  });
  useEffect(() => {
    if (!projectData?.data) return;
    const p = projectData.data;
    form.reset({
      name: p.name ?? "", description: p.description ?? "", status: p.status ?? "planning",
      priority: p.priority ?? "medium", budget: p.budget?.toString() ?? "", currency: p.currency ?? "EGP",
      startDate: p.startDate ? p.startDate.split("T")[0] : "", endDate: p.endDate ? p.endDate.split("T")[0] : "",
      customer: p.customer?._id ?? "", deal: p.deal?._id ?? "", manager: p.manager?._id ?? "",
    });
    setCustomFields(toCustomFieldValues(p.customFields));
    setCustomerLabel(p.customer?.name ?? "");
    setDealLabel(p.deal?.title ?? "");
    setManagerLabel(p.manager?.name ?? "");
  }, [projectData, form]);

  const backHref = mode === "edit" ? `/projects/${id}` : "/projects";
  const { allowNavigation, resetSnapshot } = useUnsavedChangesSnapshot(
    { values, customFields },
    { enabled: mode === "add" || !!projectData?.data },
  );

  const mutation = useSaveMutation<Record<string, unknown>>({
    save: (payload) => mode === "edit" ? updateProject(id!, payload) : createProject(payload),
    invalidate: [queryKeys.projects.all],
    successMessage: mode === "edit" ? "Project updated" : "Project created",
    errorMessage:   mode === "edit" ? "Failed to update project" : "Failed to create project",
    onSuccess: (res: any) => {
      allowNavigation();
      resetSnapshot();
      const newId = res?.data?._id ?? id;
      navigate(newId ? `/projects/${newId}` : "/projects");
    },
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate({
      name: values.name, description: values.description, status: values.status, priority: values.priority,
      currency: values.currency,
      budget: values.budget ? Number(values.budget) : undefined,
      startDate: values.startDate || undefined, endDate: values.endDate || undefined,
      customer: values.customer || undefined, deal: values.deal || undefined, manager: values.manager || undefined,
      customFields,
    });
  };

  const title = mode === "edit"
    ? ((tr as any).projects?.edit ?? "Edit Project")
    : ((tr as any).projects?.add ?? "New Project");

  return (
    <EntityFormPage title={title} backHref={backHref} breadcrumb={[{ label: "Projects", href: "/projects" }, { label: mode === "edit" ? "Edit" : "New" }]}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <TextField<FormValues> name="name" label="Name" required />
          <TextareaField<FormValues> name="description" label="Description" placeholder="Project description…" />

          <div className="grid sm:grid-cols-3 gap-4">
            <SelectField<FormValues> name="status"   label="Status"   options={STATUS_OPTIONS} />
            <SelectField<FormValues> name="priority" label="Priority" options={PRIORITY_OPTIONS} />

            {/* Manager — searchable user lookup */}
            <FormField control={form.control} name="manager" render={({ field }) => (
              <FormItem>
                <FormLabel>Manager</FormLabel>
                <FormControl>
                  <AsyncSearchableSelect value={field.value ?? ""} onChange={field.onChange}
                    fetchFn={fetchUsers} selectedLabel={managerLabel}
                    placeholder="Unassigned" searchPlaceholder="Search users…"
                    onSelectItem={(item) => setManagerLabel(item.label)} />
                </FormControl>
              </FormItem>
            )} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <FormField control={form.control} name="customer" render={({ field }) => (
              <FormItem>
                <FormLabel>Customer</FormLabel>
                <FormControl>
                  <AsyncSearchableSelect value={field.value ?? ""} onChange={field.onChange}
                    fetchFn={fetchCustomers} selectedLabel={customerLabel}
                    placeholder="None" searchPlaceholder="Search customers…"
                    onSelectItem={(item) => setCustomerLabel(item.label)} />
                </FormControl>
              </FormItem>
            )} />

            <FormField control={form.control} name="deal" render={({ field }) => (
              <FormItem>
                <FormLabel>Linked Deal</FormLabel>
                <FormControl>
                  <AsyncSearchableSelect value={field.value ?? ""} onChange={field.onChange}
                    fetchFn={fetchDeals} selectedLabel={dealLabel}
                    placeholder="None" searchPlaceholder="Search deals…"
                    onSelectItem={(item) => setDealLabel(item.label)} />
                </FormControl>
              </FormItem>
            )} />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <TextField<FormValues>   name="budget"   label="Budget"   type="number" />
            <SelectField<FormValues> name="currency" label="Currency" options={CURRENCY_OPTIONS} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <TextField<FormValues> name="startDate" label="Start Date" type="date" />
            <TextField<FormValues> name="endDate"   label="End Date"   type="date" />
          </div>

          <DynamicFields module="projects" values={customFields} onChange={(k, v) => setCustomFields((prev) => ({ ...prev, [k]: v }))} />

          <FormActions
            isSubmitting={mutation.isPending}
            onCancel={() => navigate(backHref)}
            submitLabel={mode === "edit" ? tr.common.save : ((tr as any).projects?.add ?? "Create Project")}
          />
        </form>
      </Form>
    </EntityFormPage>
  );
}
