import React, { ChangeEvent, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AsyncSearchableSelect } from "@/components/common/combobox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createDeal, getCustomers, getUsers } from "@/utils/api";
import { dealSchema, zodFieldErrors } from "@/validations/schemas";
import { CURRENCIES } from "@/utils/constants";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { CircleArrowLeft } from "lucide-react";
import { AxiosError } from "axios";
import { ErrorResponse } from "@/types/types";
import LoadingSpinner from "../common/spinner";
import DynamicFields from "@/components/common/DynamicFields";
import { useToast } from "@/components/ui/use-toast";

const DEAL_STATUSES = ["lead", "qualified", "proposal", "negotiation", "won", "lost", "cancelled"];
const DEAL_SOURCES = ["Website", "Referral", "Cold Call", "Email", "Social Media", "Walk-in", "Exhibition", "Partner", "Other"];
const DEAL_TYPES = ["new_business", "renewal", "upsell", "cross_sell"];
const DEAL_TYPE_LABELS: Record<string, string> = {
  new_business: "New Business", renewal: "Renewal",
  upsell: "Upsell", cross_sell: "Cross-sell",
};
const DEAL_CATEGORIES = ["Software", "Hardware", "Services", "Consulting", "Maintenance", "Licensing", "Support", "Training", "Marketing", "Other"];
const PRIORITIES = ["low", "medium", "high"];
const STATUS_PROBABILITY: Record<string, number> = {
  lead: 10, qualified: 30, proposal: 50, negotiation: 75, won: 100, lost: 0, cancelled: 0,
};

function oneWeekFromNow() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
}

const initialFormData = {
  title: "",
  customer: "",
  category: "",
  owner: "",
  dealType: "",
  price: "",
  currency: "EGP",
  status: "lead",
  priority: "medium",
  probability: "10",
  source: "",
  expectedCloseDate: oneWeekFromNow(),
  lostReason: "",
  notes: "",
  customFields: {} as Record<string, string>,
};

interface FormErrors { title?: string; customer?: string; price?: string; }

const AddDeal = () => {
  const location = useLocation();
  const cloneData = (location.state as any)?.clone;
  const [formData, setFormData] = useState(cloneData ? { ...initialFormData, ...cloneData } : initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: typeof initialFormData) => ({ ...prev, [name]: value }));
    setErrors((prev: FormErrors) => ({ ...prev, [name]: "" }));
  };

  const handleSelect = (name: string, value: string) => {
    if (name === "status") {
      const prob = STATUS_PROBABILITY[value] ?? formData.probability;
      setFormData((prev: typeof initialFormData) => ({ ...prev, status: value, probability: String(prob) }));
    } else {
      setFormData((prev: typeof initialFormData) => ({ ...prev, [name]: value }));
    }
    setErrors((prev: FormErrors) => ({ ...prev, [name]: "" }));
  };

  const validate = (): FormErrors => zodFieldErrors(dealSchema, formData);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    try {
      setIsLoading(true);
      await createDeal({
        ...formData,
        price: Number(formData.price),
        probability: Number(formData.probability),
        expectedCloseDate: formData.expectedCloseDate ? new Date(formData.expectedCloseDate) : new Date(),
        owner: formData.owner || null,
      } as any);
      navigate("/deals");
    } catch (error) {
      const axiosError = error as AxiosError<ErrorResponse>;
      toast({ title: axiosError.response?.data?.message ?? "Error creating deal", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="p-4">
      <LoadingSpinner loading={isLoading} />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Link to="/deals"><CircleArrowLeft /></Link>
            Add Deal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">

            {/* ── Left: Deal details ── */}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 mt-2">Deal Details</h2>

              <div className="flex flex-col">
                <Label className="my-3" htmlFor="title">Title <span className="text-destructive">*</span></Label>
                <Input id="title" name="title" value={formData.title} onChange={handleChange} placeholder="e.g. Website Redesign for Acme" />
                {errors.title && <span className="text-destructive text-sm mt-1">{errors.title}</span>}
              </div>

              <div className="flex flex-col">
                <Label className="my-3">Customer <span className="text-destructive">*</span></Label>
                <AsyncSearchableSelect value={formData.customer} onChange={(v) => handleSelect("customer", v)}
                  fetchFn={fetchCustomers} placeholder="Select Contact" searchPlaceholder="Search contacts..." />
                {errors.customer && <span className="text-destructive text-sm mt-1">{errors.customer}</span>}
              </div>

              <div className="flex flex-col">
                <Label className="my-3">Category</Label>
                <Select value={formData.category} onValueChange={(v) => handleSelect("category", v)}>
                  <SelectTrigger><SelectValue placeholder="Select category (optional)" /></SelectTrigger>
                  <SelectContent>
                    {DEAL_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col">
                <Label className="my-3">Deal Owner</Label>
                <AsyncSearchableSelect value={formData.owner} onChange={(v) => handleSelect("owner", v)}
                  fetchFn={fetchUsers} placeholder="Assign to a user (optional)" searchPlaceholder="Search users..." />
              </div>

              <div className="flex flex-col">
                <Label className="my-3">Deal Type</Label>
                <Select value={formData.dealType} onValueChange={(v) => handleSelect("dealType", v)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {DEAL_TYPES.map((t) => <SelectItem key={t} value={t}>{DEAL_TYPE_LABELS[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col">
                <Label className="my-3" htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" value={formData.notes}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleChange(e)}
                  placeholder="Internal notes about this deal..." className="min-h-[80px]" />
              </div>
            </div>

            {/* ── Right: Sales & financial ── */}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 mt-2">Sales Information</h2>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <Label className="my-3">Stage</Label>
                  <Select value={formData.status} onValueChange={(v) => handleSelect("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DEAL_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col">
                  <Label className="my-3">Priority</Label>
                  <Select value={formData.priority} onValueChange={(v) => handleSelect("priority", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col">
                <Label className="my-3">Source</Label>
                <Select value={formData.source} onValueChange={(v) => handleSelect("source", v)}>
                  <SelectTrigger><SelectValue placeholder="How did they find you?" /></SelectTrigger>
                  <SelectContent>
                    {DEAL_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <Label className="my-3" htmlFor="expectedCloseDate">Expected Close</Label>
                  <Input id="expectedCloseDate" name="expectedCloseDate" type="date" value={formData.expectedCloseDate} onChange={handleChange} />
                </div>
                <div className="flex flex-col">
                  <Label className="my-3" htmlFor="probability">Win Probability %</Label>
                  <Input id="probability" name="probability" type="number" min="0" max="100" value={formData.probability} onChange={handleChange} />
                </div>
              </div>

              {formData.status === "lost" && (
                <div className="flex flex-col">
                  <Label className="my-3" htmlFor="lostReason">Lost Reason</Label>
                  <Input id="lostReason" name="lostReason" value={formData.lostReason} onChange={handleChange} placeholder="Why was this deal lost?" />
                </div>
              )}

              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 mt-5">Financial</h2>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <Label className="my-3" htmlFor="price">Amount <span className="text-destructive">*</span></Label>
                  <Input id="price" name="price" type="number" value={formData.price} onChange={handleChange} placeholder="0" />
                  {errors.price && <span className="text-destructive text-sm mt-1">{errors.price}</span>}
                </div>
                <div className="flex flex-col">
                  <Label className="my-3">Currency</Label>
                  <Select value={formData.currency} onValueChange={(v) => handleSelect("currency", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

            </div>

            <DynamicFields
              module="deals"
              values={formData.customFields}
              onChange={(k, v) => setFormData((prev: typeof initialFormData) => ({ ...prev, customFields: { ...prev.customFields, [k]: v } }))}
            />

            <div className="col-span-2 flex justify-end border-t pt-4 mt-2">
              <Button type="submit" disabled={isLoading} className="px-8">
                {isLoading ? "Adding..." : "Add Deal"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default AddDeal;
