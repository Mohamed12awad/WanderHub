import React, { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getDealById, updateDeal, getCustomers, getProducts } from "@/utils/api";
import { Link, useNavigate, useParams } from "react-router-dom";
import DynamicFields from "@/components/common/DynamicFields";
import { AsyncSearchableSelect } from "@/components/common/combobox";
import { CircleArrowLeft } from "lucide-react";
import LoadingSpinner from "../common/spinner";

const DEAL_STATUSES = ["lead", "qualified", "proposal", "negotiation", "won", "lost", "cancelled"];
const DEAL_SOURCES = ["Website", "Referral", "Cold Call", "Email", "Social Media", "Walk-in", "Other"];
const CURRENCIES = ["USD", "EUR", "GBP", "EGP", "AED", "SAR", "Other"];

interface DealFormData {
  title: string;
  customer: string;
  product: string;
  price: number;
  currency: string;
  totalPaid: number;
  status: string;
  quantity: number;
  source: string;
  expectedCloseDate: string;
  notes: string;
  customFields: Record<string, string>;
}

const EditDeal = () => {
  const { id: dealId } = useParams<{ id: string }>();
  const [formData, setFormData] = useState<DealFormData | null>(null);
  const [customerLabel, setCustomerLabel] = useState("");
  const [productLabel, setProductLabel] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const originalRef = useRef<string | null>(null);
  const navigate = useNavigate();

  const fetchCustomers = useCallback(
    (q: string) =>
      getCustomers({ page: 1, limit: 20, q }).then((r) =>
        (r.data as any).data.map((c: { _id: string; name: string }) => ({ value: c._id, label: c.name }))
      ),
    [],
  );

  const fetchProducts = useCallback(
    (q: string) =>
      getProducts({ page: 1, limit: 20, q }).then((r) =>
        (r.data as any).data.map((p: { _id: string; name: string }) => ({ value: p._id, label: p.name }))
      ),
    [],
  );

  useEffect(() => {
    if (!dealId) return;
    getDealById(dealId).then(({ data }) => {
      const d = data.deal;
      const loaded: DealFormData = {
        title: d.title ?? "",
        customer: d.customer?._id ?? "",
        product: d.product?._id ?? "",
        price: Number(d.price),
        currency: d.currency ?? "USD",
        totalPaid: Number(d.totalPaid),
        status: d.status ?? "lead",
        quantity: Number(d.quantity),
        source: d.source ?? "",
        expectedCloseDate: d.expectedCloseDate
          ? new Date(d.expectedCloseDate).toISOString().split("T")[0]
          : "",
        notes: d.notes ?? "",
        customFields: d.customFields ?? {},
      };
      setFormData(loaded);
      setCustomerLabel(d.customer?.name ?? "");
      setProductLabel(d.product?.name ?? "");
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
    setFormData((prev) => ({ ...prev!, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await updateDeal(dealId!, {
        ...formData!,
        price: Number(formData!.price),
        totalPaid: Number(formData!.totalPaid),
        quantity: Number(formData!.quantity),
        expectedCloseDate: formData!.expectedCloseDate ? new Date(formData!.expectedCloseDate) : new Date(),
        startDate: new Date(),
        endDate: new Date(),
      } as any);
      navigate("/deals");
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
            <Link to={`/deals/${dealId}`}><CircleArrowLeft className="me-3" /></Link>
            Edit Deal
            {isDirty && (
              <Badge variant="outline" className="text-xs font-normal text-amber-600 border-amber-400 bg-amber-50 dark:bg-amber-900/20">
                Unsaved changes
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Deal Information</h2>

              <div className="flex flex-col">
                <Label className="my-3" htmlFor="title">Title</Label>
                <Input id="title" name="title" value={formData.title} onChange={handleChange} required />
              </div>

              <div className="flex flex-col">
                <Label className="my-3">Customer</Label>
                <AsyncSearchableSelect
                  value={formData.customer}
                  onChange={(v) => handleSelect("customer", v)}
                  fetchFn={fetchCustomers}
                  selectedLabel={customerLabel}
                  placeholder="Select Customer"
                  searchPlaceholder="Search customers..."
                />
              </div>

              <div className="flex flex-col">
                <Label className="my-3">Product / Service</Label>
                <AsyncSearchableSelect
                  value={formData.product}
                  onChange={(v) => handleSelect("product", v)}
                  fetchFn={fetchProducts}
                  selectedLabel={productLabel}
                  placeholder="Select Product (optional)"
                  searchPlaceholder="Search products..."
                />
              </div>

              <div className="flex flex-col">
                <Label className="my-3" htmlFor="price">Price</Label>
                <Input id="price" name="price" type="number" value={formData.price} onChange={handleChange} required />
              </div>

              <div className="flex flex-col">
                <Label className="my-3" htmlFor="quantity">Quantity</Label>
                <Input id="quantity" name="quantity" type="number" value={formData.quantity} onChange={handleChange} />
              </div>

              <div className="flex flex-col">
                <Label className="my-3" htmlFor="totalPaid">Total Paid (read-only)</Label>
                <Input id="totalPaid" name="totalPaid" value={formData.totalPaid} disabled />
              </div>
            </div>

            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Other Information</h2>

              <div className="flex flex-col">
                <Label className="my-3">Status</Label>
                <Select value={formData.status} onValueChange={(v) => handleSelect("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEAL_STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col">
                <Label className="my-3">Currency</Label>
                <Select value={formData.currency} onValueChange={(v) => handleSelect("currency", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col">
                <Label className="my-3">Source</Label>
                <Select value={formData.source} onValueChange={(v) => handleSelect("source", v)}>
                  <SelectTrigger><SelectValue placeholder="Select Source" /></SelectTrigger>
                  <SelectContent>
                    {DEAL_SOURCES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col">
                <Label className="my-3" htmlFor="expectedCloseDate">Expected Close Date</Label>
                <Input id="expectedCloseDate" name="expectedCloseDate" type="date" value={formData.expectedCloseDate} onChange={handleChange} />
              </div>

              <div className="flex flex-col">
                <Label className="my-3" htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFormData((prev) => ({ ...prev!, notes: e.target.value }))}
                  className="border border-input rounded-lg p-2 min-h-[80px]"
                />
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
