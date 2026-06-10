import { useEffect, useState } from "react";
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
import { queryKeys } from "@/lib/queryKeys";
import { createSupplier, updateSupplier, getSupplierById } from "@/utils/api";
import { toCustomFieldValues } from "@/utils/customFields";
import { useLanguage } from "@/contexts/LanguageContext";

const schema = z.object({
  name:        z.string().min(1, "Supplier name is required"),
  contactName: z.string().optional(),
  email:       z.string().email("Invalid email").optional().or(z.literal("")),
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

type FormValues = z.infer<typeof schema>;

export default function SupplierForm({ mode }: { mode: "add" | "edit" }) {
  const navigate = useNavigate();
  const { id }   = useParams();
  const { tr }   = useLanguage();
  const s        = (tr as any).suppliers || {};

  const [customFields, setCustomFields] = useState<Record<string, string>>({});

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", contactName: "", email: "", phone: "", status: "active",
      taxId: "", street: "", city: "", state: "", zip: "", country: "", notes: "",
    },
  });

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

  const mutation = useSaveMutation<Record<string, unknown>>({
    save: (payload) => mode === "add" ? createSupplier(payload as any) : updateSupplier(id!, payload as any),
    invalidate: [queryKeys.suppliers.all],
    successMessage: "Supplier saved",
    errorMessage:   "Failed to save supplier",
    onSuccess: (res: any) => {
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

  if (isFetching) return <div className="p-6">Loading…</div>;

  const title = mode === "add" ? (s.add ?? "Add Supplier") : "Edit Supplier";

  return (
    <EntityFormPage title={title} backHref={backHref} breadcrumb={[{ label: "Suppliers", href: "/procurement/suppliers" }, { label: mode === "add" ? "New" : "Edit" }]}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField<FormValues> name="name"        label="Supplier Name" required />
            <TextField<FormValues> name="contactName" label="Contact Name" />
            <TextField<FormValues> name="email"       label="Email" type="email" />
            <TextField<FormValues> name="phone"       label="Phone" />
            <TextField<FormValues> name="taxId"       label="Tax ID" />

            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
              </FormItem>
            )} />
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-base font-medium mb-4">Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <TextField<FormValues> name="street" label="Street" />
              </div>
              <TextField<FormValues> name="city"    label="City" />
              <TextField<FormValues> name="state"   label="State / Province" />
              <TextField<FormValues> name="zip"     label="ZIP / Postal Code" />
              <TextField<FormValues> name="country" label="Country" />
            </div>
          </div>

          <div className="pt-4 border-t">
            <TextareaField<FormValues> name="notes" label="Notes" rows={4} />
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
