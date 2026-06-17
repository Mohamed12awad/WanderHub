import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Form } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { EntityFormPage } from "@/components/common/EntityFormPage";
import { TextField, TextareaField, FormActions } from "@/components/common/form";
import DynamicFields from "@/components/common/DynamicFields";
import { useSaveMutation } from "@/hooks/useSaveMutation";
import { useUnsavedChangesSnapshot } from "@/hooks/useUnsavedChangesGuard";
import { queryKeys } from "@/lib/queryKeys";
import { createSupplier, updateSupplier, getSupplierById } from "@/utils/api";
import { toCustomFieldValues } from "@/utils/customFields";
import { useLanguage } from "@/contexts/LanguageContext";

const makeSchema = (validation: { nameRequired: string; invalidEmail: string }) => z.object({
  name:        z.string().min(1, validation.nameRequired),
  contactName: z.string().optional(),
  email:       z.string().email(validation.invalidEmail).optional().or(z.literal("")),
  phone:       z.string().optional(),
  status:      z.string().min(1),
  taxId:       z.string().optional(),
  street:      z.string().optional(),
  city:        z.string().optional(),
  state:       z.string().optional(),
  zip:         z.string().optional(),
  country:     z.string().optional(),
  notes:       z.string().optional(),
});

type FormValues = z.infer<ReturnType<typeof makeSchema>>;

export default function SupplierForm({ mode }: { mode: "add" | "edit" }) {
  const navigate = useNavigate();
  const { id }   = useParams();
  const { tr }   = useLanguage();
  const s        = tr.suppliers;
  const schema   = useMemo(() => makeSchema(s.validation), [s.validation]);

  const [customFields, setCustomFields] = useState<Record<string, string>>({});

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", contactName: "", email: "", phone: "", status: "active",
      taxId: "", street: "", city: "", state: "", zip: "", country: "", notes: "",
    },
  });
  const values = form.watch();

  const { data: supplierData, isPending: isFetching } = useQuery({
    queryKey: queryKeys.suppliers.detail(id!),
    queryFn: () => getSupplierById(id!),
    enabled: mode === "edit" && !!id,
  });
  useEffect(() => {
    if (!supplierData) return;
    const d = supplierData.data;
    form.reset({
      name: d.name ?? "", contactName: d.contactName ?? "", email: d.email ?? "",
      phone: d.phone ?? "", status: d.status ?? "active", taxId: d.taxId ?? "",
      street: d.address?.street ?? "", city: d.address?.city ?? "",
      state: d.address?.state ?? "", zip: d.address?.zip ?? "", country: d.address?.country ?? "",
      notes: d.notes ?? "",
    });
    setCustomFields(toCustomFieldValues(d.customFields));
  }, [supplierData, form]);

  const backHref = "/procurement/suppliers";
  const { allowNavigation, resetSnapshot } = useUnsavedChangesSnapshot(
    { values, customFields },
    { enabled: mode === "add" || !!supplierData?.data },
  );

  const mutation = useSaveMutation<Record<string, unknown>>({
    save: (payload) => mode === "add" ? createSupplier(payload as any) : updateSupplier(id!, payload as any),
    invalidate: [queryKeys.suppliers.all],
    successMessage: s.saved,
    errorMessage:   s.saveFailed,
    onSuccess: (res: any) => {
      allowNavigation();
      resetSnapshot();
      const newId = res?.data?._id ?? id;
      navigate(newId ? `/procurement/suppliers/${newId}` : backHref);
    },
  });

  const onSubmit = (values: FormValues) => {
    const { street, city, state, zip, country, ...rest } = values;
    mutation.mutate({
      ...rest,
      address: { street, city, state, zip, country },
      customFields,
    });
  };

  if (isFetching) return <div className="p-6">{tr.common.loading}</div>;

  const title = mode === "add" ? s.add : s.edit;

  return (
    <EntityFormPage title={title} backHref={backHref} breadcrumb={[{ label: s.title, href: "/procurement/suppliers" }, { label: mode === "add" ? tr.common.new : tr.common.edit }]}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField<FormValues> name="name"        label={s.fields.supplierName} required />
            <TextField<FormValues> name="contactName" label={s.fields.contactName} />
            <TextField<FormValues> name="email"       label={tr.common.email} type="email" />
            <TextField<FormValues> name="phone"       label={tr.common.phone} />
            <TextField<FormValues> name="taxId"       label={s.fields.taxId} />

            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>{tr.common.status}</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{s.active}</SelectItem>
                      <SelectItem value="inactive">{s.inactive}</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
              </FormItem>
            )} />
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-base font-medium mb-4">{tr.common.address}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <TextField<FormValues> name="street" label={s.fields.street} />
              </div>
              <TextField<FormValues> name="city"    label={s.fields.city} />
              <TextField<FormValues> name="state"   label={s.fields.state} />
              <TextField<FormValues> name="zip"     label={s.fields.zip} />
              <TextField<FormValues> name="country" label={s.fields.country} />
            </div>
          </div>

          <div className="pt-4 border-t">
            <TextareaField<FormValues> name="notes" label={tr.finance.notes} rows={4} />
          </div>

          <div className="pt-2 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
            <DynamicFields module="suppliers" values={customFields} onChange={(k, v) => setCustomFields((prev) => ({ ...prev, [k]: v }))} />
          </div>

          <FormActions
            isSubmitting={mutation.isPending}
            onCancel={() => navigate(backHref)}
            submitLabel={tr.common.save}
          />
        </form>
      </Form>
    </EntityFormPage>
  );
}
