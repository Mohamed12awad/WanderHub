import React, { ChangeEvent, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AsyncSearchableSelect } from "@/components/common/combobox";
import { Label } from "@/components/ui/label";
import { createDeal, getCustomers, getProducts } from "@/utils/api";
import { Link, useNavigate } from "react-router-dom";
import { CircleArrowLeft } from "lucide-react";
import { AxiosError } from "axios";
import { ErrorResponse } from "@/types/types";
import LoadingSpinner from "../common/spinner";
import DynamicFields from "@/components/common/DynamicFields";
import { useToast } from "@/components/ui/use-toast";

const DEAL_STATUSES = ["lead", "qualified", "proposal", "negotiation", "won", "lost", "cancelled"];
const DEAL_SOURCES = ["Website", "Referral", "Cold Call", "Email", "Social Media", "Walk-in", "Other"];
const CURRENCIES = ["USD", "EUR", "GBP", "EGP", "AED", "SAR", "Other"];

const initialFormData = {
  title: "",
  customer: "",
  product: "",
  price: "",
  currency: "USD",
  totalPaid: "0",
  status: "lead",
  quantity: "1",
  source: "",
  expectedCloseDate: "",
  notes: "",
  customFields: {} as Record<string, string>,
};

interface FormErrors {
  title?: string;
  customer?: string;
  price?: string;
}

const AddDeal = () => {
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSelect = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = (): FormErrors => {
    const errs: FormErrors = {};
    if (!formData.title) errs.title = "Deal title is required";
    if (!formData.customer) errs.customer = "Customer is required";
    if (!formData.price || Number(formData.price) <= 0) errs.price = "Valid price is required";
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    try {
      setIsLoading(true);
      await createDeal({
        ...formData,
        price: Number(formData.price),
        totalPaid: Number(formData.totalPaid),
        quantity: Number(formData.quantity),
        expectedCloseDate: formData.expectedCloseDate ? new Date(formData.expectedCloseDate) : new Date(),
        startDate: new Date(),
        endDate: new Date(),
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
          <CardTitle className="flex">
            <Link to="/deals"><CircleArrowLeft className="me-3" /></Link>
            Add Deal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Deal Information</h2>

              <div className="flex flex-col">
                <Label className="my-3" htmlFor="title">Title <span className="text-red-700">*</span></Label>
                <Input id="title" name="title" value={formData.title} onChange={handleChange} />
                {errors.title && <span className="text-red-500 text-sm">{errors.title}</span>}
              </div>

              <div className="flex flex-col">
                <Label className="my-3">Customer <span className="text-red-700">*</span></Label>
                <AsyncSearchableSelect
                  value={formData.customer}
                  onChange={(v) => handleSelect("customer", v)}
                  fetchFn={fetchCustomers}
                  placeholder="Select Customer"
                  searchPlaceholder="Search customers..."
                />
                {errors.customer && <span className="text-red-500 text-sm">{errors.customer}</span>}
              </div>

              <div className="flex flex-col">
                <Label className="my-3">Product / Service</Label>
                <AsyncSearchableSelect
                  value={formData.product}
                  onChange={(v) => handleSelect("product", v)}
                  fetchFn={fetchProducts}
                  placeholder="Select Product (optional)"
                  searchPlaceholder="Search products..."
                />
              </div>

              <div className="flex flex-col">
                <Label className="my-3" htmlFor="price">Price <span className="text-red-700">*</span></Label>
                <Input id="price" name="price" type="number" value={formData.price} onChange={handleChange} />
                {errors.price && <span className="text-red-500 text-sm">{errors.price}</span>}
              </div>

              <div className="flex flex-col">
                <Label className="my-3" htmlFor="totalPaid">Initial Payment</Label>
                <Input id="totalPaid" name="totalPaid" type="number" value={formData.totalPaid} onChange={handleChange} />
              </div>

              <div className="flex flex-col">
                <Label className="my-3" htmlFor="quantity">Quantity</Label>
                <Input id="quantity" name="quantity" type="number" value={formData.quantity} onChange={handleChange} />
              </div>
            </div>

            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Other Information</h2>

              <div className="flex flex-col">
                <Label className="my-3">Status</Label>
                <Select defaultValue="lead" onValueChange={(v) => handleSelect("status", v)}>
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
                <Select defaultValue="USD" onValueChange={(v) => handleSelect("currency", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col">
                <Label className="my-3">Source</Label>
                <Select onValueChange={(v) => handleSelect("source", v)}>
                  <SelectTrigger><SelectValue placeholder="How did they find you?" /></SelectTrigger>
                  <SelectContent>
                    {DEAL_SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
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
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleChange(e)}
                  className="border border-input rounded-lg p-2 min-h-[80px]"
                />
              </div>
            </div>

            <DynamicFields
              module="deals"
              values={formData.customFields}
              onChange={(k, v) => setFormData((prev) => ({ ...prev, customFields: { ...prev.customFields, [k]: v } }))}
            />

            <div className="col-span-2">
              <Button type="submit" disabled={isLoading}>
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
