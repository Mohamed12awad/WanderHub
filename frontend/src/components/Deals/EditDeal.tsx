import React, { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getDealById, updateDeal, getCustomers, getUsers } from "@/utils/api";
import { Link, useNavigate, useParams } from "react-router-dom";
import DynamicFields from "@/components/common/DynamicFields";
import { AsyncSearchableSelect } from "@/components/common/combobox";
import { CircleArrowLeft } from "lucide-react";
import LoadingSpinner from "../common/spinner";

const DEAL_STATUSES = ["lead", "qualified", "proposal", "negotiation", "won", "lost", "cancelled"];
const DEAL_SOURCES = ["Website", "Referral", "Cold Call", "Email", "Social Media", "Walk-in", "Exhibition", "Partner", "Other"];
const DEAL_TYPES = ["new_business", "renewal", "upsell", "cross_sell"];
const DEAL_TYPE_LABELS: Record<string, string> = {
  new_business: "New Business", renewal: "Renewal",
  upsell: "Upsell", cross_sell: "Cross-sell",
};
const DEAL_CATEGORIES = ["Software", "Hardware", "Services", "Consulting", "Maintenance", "Licensing", "Support", "Training", "Marketing", "Other"];
const CURRENCIES = ["EGP", "USD", "EUR", "GBP", "AED", "SAR", "Other"];
const PRIORITIES = ["low", "medium", "high"];
const STATUS_PROBABILITY: Record<string, number> = {
  lead: 10, qualified: 30, proposal: 50, negotiation: 75, won: 100, lost: 0, cancelled: 0,
};

interface DealFormData {
  title: string;
  customer: string;
  category: string;
  owner: string;
  dealType: string;
  price: number;
  currency: string;
  status: string;
  priority: string;
  probability: number;
  source: string;
  expectedCloseDate: string;
  lostReason: string;
  notes: string;
  customFields: Record<string, string>;
}

const EditDeal = () => {
  const { id: dealId } = useParams<{ id: string }>();
  const [formData, setFormData] = useState<DealFormData | null>(null);
  const [customerLabel, setCustomerLabel] = useState("");
  const [ownerLabel, setOwnerLabel] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const originalRef = useRef<string | null>(null);
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

  useEffect(() => {
    if (!dealId) return;
    getDealById(dealId).then(({ data }) => {
      const d = data.deal;
      const loaded: DealFormData = {
        title: d.title ?? "",
        customer: d.customer?._id ?? "",
        category: d.category ?? "",
        owner: d.owner?._id ?? "",
        dealType: d.dealType ?? "",
        price: Number(d.price),
        currency: d.currency ?? "EGP",
        status: d.status ?? "lead",
        priority: d.priority ?? "medium",
        probability: Number(d.probability ?? STATUS_PROBABILITY[d.status ?? "lead"] ?? 10),
        source: d.source ?? "",
        expectedCloseDate: d.expectedCloseDate
          ? new Date(d.expectedCloseDate).toISOString().split("T")[0]
          : "",
        lostReason: d.lostReason ?? "",
        notes: d.notes ?? "",
        customFields: d.customFields ?? {},
      };
      setFormData(loaded);
      setCustomerLabel(d.customer?.name ?? "");
      setOwnerLabel(d.owner?.name ?? "");
      originalRef.current = JSON.stringify(loaded);
    }).catch(console.error);
  }, [dealId]);

  const isDirty = formData !== null && originalRef.current !== null && JSON.stringify(formData) !== originalRef.current;

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev!, [name]: value }));
  };

  const handleSelect = (name: string, value: string) => {
    if (name === "status") {
      const prob = STATUS_PROBABILITY[value];
      setFormData((prev) => ({
        ...prev!,
        status: value,
        probability: prob !== undefined ? prob : prev!.probability,
      }));
    } else {
      setFormData((prev) => ({ ...prev!, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await updateDeal(dealId!, {
        ...formData!,
        price: Number(formData!.price),
        probability: Number(formData!.probability),
        expectedCloseDate: formData!.expectedCloseDate ? new Date(formData!.expectedCloseDate) : new Date(),
        owner: formData!.owner || null,
      } as any);
      navigate(`/deals/${dealId}`);
    } catch (error) {
      console.error("Error updating deal:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!formData) return <LoadingSpinner loading />;

  return (
    <main className="p-4">
      <LoadingSpinner loading={isLoading} />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Link to={`/deals/${dealId}`}><CircleArrowLeft /></Link>
            Edit Deal
            {isDirty && (
              <Badge variant="outline" className="text-xs font-normal text-amber-600 border-amber-400 bg-amber-50 dark:bg-amber-900/20">
                Unsaved changes
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">

            {/* ── Left ── */}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 mt-2">Deal Details</h2>

              <div className="flex flex-col">
                <Label className="my-3" htmlFor="title">Title</Label>
                <Input id="title" name="title" value={formData.title} onChange={handleChange} required />
              </div>

              <div className="flex flex-col">
                <Label className="my-3">Customer</Label>
                <AsyncSearchableSelect value={formData.customer} onChange={(v) => handleSelect("customer", v)}
                  fetchFn={fetchCustomers} selectedLabel={customerLabel}
                  placeholder="Select Contact" searchPlaceholder="Search contacts..." />
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
                  fetchFn={fetchUsers} selectedLabel={ownerLabel}
                  placeholder="Assign to a user (optional)" searchPlaceholder="Search users..." />
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
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFormData((prev) => ({ ...prev!, notes: e.target.value }))}
                  className="min-h-[80px]" />
              </div>
            </div>

            {/* ── Right ── */}
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
                  <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
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
                  <Label className="my-3" htmlFor="price">Amount</Label>
                  <Input id="price" name="price" type="number" value={formData.price} onChange={handleChange} required />
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
              onChange={(k, v) => setFormData((prev) => ({ ...prev!, customFields: { ...prev!.customFields, [k]: v } }))}
            />

            <div className="col-span-2 flex justify-end border-t pt-4 mt-2">
              <Button type="submit" disabled={isLoading} className="px-8">
                {isLoading ? "Updating..." : "Update Deal"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default EditDeal;
