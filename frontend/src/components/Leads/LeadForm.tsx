import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { CircleArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AsyncSearchableSelect } from "@/components/common/combobox";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import LoadingSpinner from "@/components/common/spinner";
import DynamicFields from "@/components/common/DynamicFields";
import { createLead, updateLead, getUsers } from "@/utils/api";

const LEAD_SOURCES = [
  "Website", "Referral", "Cold Call", "Email",
  "Social Media", "Exhibition", "Walk-in", "Partner", "Other",
];
const CURRENCIES = ["EGP", "USD", "EUR", "GBP", "AED", "SAR"];

const schema = z.object({
  name:              z.string().min(1),
  company:           z.string().optional(),
  jobTitle:          z.string().optional(),
  email:             z.string().email().optional().or(z.literal("")),
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
  const { toast } = useToast();

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

  const { formState: { isSubmitting } } = form;
  const status = form.watch("status");
  const [customFields, setCustomFields] = useState<Record<string, string>>(customFieldValues ?? {});

  const fetchUsers = useCallback(
    (q: string) =>
      getUsers({ page: 1, limit: 20, q }).then((r) =>
        ((r.data as any).data ?? []).map((u: { _id: string; name: string }) => ({
          value: u._id, label: u.name,
        }))
      ),
    [],
  );

  const onSubmit = async (values: FormValues) => {
    const payload: Record<string, unknown> = { ...values };
    payload.rating            = values.rating || null;
    payload.budget            = values.budget ? Number(values.budget) : null;
    payload.expectedCloseDate = values.expectedCloseDate || null;
    payload.owner             = values.owner || null;
    payload.customFields      = customFields;
    if (!values.lostReason) delete payload.lostReason;

    try {
      if (mode === "create") {
        await createLead(payload);
        toast({ title: l.createdSuccess });
        navigate("/leads");
      } else {
        await updateLead(id!, payload);
        toast({ title: l.updatedSuccess });
        navigate(`/leads/${id}`);
      }
    } catch (err: any) {
      toast({
        title: err?.response?.data?.message ?? (mode === "create" ? l.createFailed : l.updateFailed),
        variant: "destructive",
      });
    }
  };

  const backTo = mode === "create" ? "/leads" : `/leads/${id}`;
  const title  = mode === "create" ? l.add : `${l.edit} — ${defaultValues?.name ?? ""}`;

  return (
    <main className="p-4">
      <LoadingSpinner loading={isSubmitting} />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Link to={backTo}><CircleArrowLeft /></Link>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">

              {/* ── Left: Contact ── */}
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 mt-2">
                  {l.sections.contact}
                </h2>

                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem className="mb-3">
                    <FormLabel>{l.fields.fullName} <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input {...field} placeholder={l.placeholders.fullName} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="company" render={({ field }) => (
                    <FormItem className="mb-3">
                      <FormLabel>{l.fields.company}</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="jobTitle" render={({ field }) => (
                    <FormItem className="mb-3">
                      <FormLabel>{l.fields.jobTitle}</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem className="mb-3">
                    <FormLabel>{l.fields.email}</FormLabel>
                    <FormControl><Input type="email" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem className="mb-3">
                      <FormLabel>{l.fields.phone}</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="mobile" render={({ field }) => (
                    <FormItem className="mb-3">
                      <FormLabel>{l.fields.mobile}</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="website" render={({ field }) => (
                  <FormItem className="mb-3">
                    <FormLabel>{l.fields.website}</FormLabel>
                    <FormControl><Input {...field} placeholder={l.placeholders.website} /></FormControl>
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem className="mb-3">
                      <FormLabel>{l.fields.city}</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="country" render={({ field }) => (
                    <FormItem className="mb-3">
                      <FormLabel>{l.fields.country}</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* ── Right: Lead Details ── */}
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 mt-2">
                  {l.sections.leadDetails}
                </h2>

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem className="mb-3">
                      <FormLabel>{l.fields.status}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {Object.entries(l.statuses).map(([val, label]) => (
                            <SelectItem key={val} value={val}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="rating" render={({ field }) => (
                    <FormItem className="mb-3">
                      <FormLabel>{l.fields.rating}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder={l.placeholders.rating} /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(l.ratings).map(([val, label]) => (
                            <SelectItem key={val} value={val}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="source" render={({ field }) => (
                  <FormItem className="mb-3">
                    <FormLabel>{l.fields.source}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder={l.placeholders.source} /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LEAD_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />

                <FormField control={form.control} name="campaign" render={({ field }) => (
                  <FormItem className="mb-3">
                    <FormLabel>{l.fields.campaign}</FormLabel>
                    <FormControl><Input {...field} placeholder={l.placeholders.campaign} /></FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="owner" render={({ field }) => (
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
                )} />

                <FormField control={form.control} name="expectedCloseDate" render={({ field }) => (
                  <FormItem className="mb-3">
                    <FormLabel>{l.fields.expectedCloseDate}</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                  </FormItem>
                )} />

                {status === "unqualified" && (
                  <FormField control={form.control} name="lostReason" render={({ field }) => (
                    <FormItem className="mb-3">
                      <FormLabel>{l.fields.lostReason}</FormLabel>
                      <FormControl><Input {...field} placeholder={l.placeholders.lostReason} /></FormControl>
                    </FormItem>
                  )} />
                )}

                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 mt-5">
                  {l.sections.opportunity}
                </h2>

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="budget" render={({ field }) => (
                    <FormItem className="mb-3">
                      <FormLabel>{l.fields.budget}</FormLabel>
                      <FormControl><Input type="number" min="0" {...field} placeholder={l.placeholders.budget} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="currency" render={({ field }) => (
                    <FormItem className="mb-3">
                      <FormLabel>{l.fields.currency}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* ── Notes (full width) ── */}
              <div className="col-span-1 md:col-span-2">
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem className="mb-3">
                    <FormLabel>{l.fields.notes}</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder={l.placeholders.notes} className="min-h-[80px]" />
                    </FormControl>
                  </FormItem>
                )} />
              </div>

              <DynamicFields module="leads" values={customFields} onChange={(k, v) => setCustomFields((prev) => ({ ...prev, [k]: v }))} />

              <div className="col-span-1 md:col-span-2 flex justify-end border-t pt-4 mt-2">
                <Button type="submit" disabled={isSubmitting} className="px-8">
                  {isSubmitting ? tr.common.loading : (mode === "create" ? l.add : tr.common.save)}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}
