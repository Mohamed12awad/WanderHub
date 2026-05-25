import React, { ChangeEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getDealById, updateDeal, getCustomers, getProducts } from "@/utils/api";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "react-query";
import { CircleArrowLeft } from "lucide-react";
import LoadingSpinner from "../common/spinner";
import { Customer, Product } from "@/types/types";

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
}

const EditDeal = () => {
  const { id: dealId } = useParams<{ id: string }>();
  const [formData, setFormData] = useState<DealFormData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { data: customers } = useQuery("customers", getCustomers);
  const { data: products } = useQuery("products", getProducts);
  const navigate = useNavigate();

  useEffect(() => {
    if (!dealId) return;
    getDealById(dealId).then(({ data }) => {
      const d = data.deal;
      setFormData({
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
      });
    }).catch(console.error);
  }, [dealId]);

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
          <CardTitle className="flex">
            <Link to="/deals"><CircleArrowLeft className="me-3" /></Link>
            Edit Deal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <h2 className="text-lg font-semibold mb-2">Deal Information</h2>

              <div className="flex flex-col">
                <Label className="my-3" htmlFor="title">Title</Label>
                <Input id="title" name="title" value={formData.title} onChange={handleChange} required />
              </div>

              <div className="flex flex-col">
                <Label className="my-3">Customer</Label>
                <Select value={formData.customer} onValueChange={(v) => handleSelect("customer", v)}>
                  <SelectTrigger><SelectValue placeholder="Select Customer" /></SelectTrigger>
                  <SelectContent className="overflow-y-auto max-h-[12rem]">
                    {customers?.data.map((c: Customer) => (
                      <SelectItem key={c._id} value={c._id!}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col">
                <Label className="my-3">Product / Service</Label>
                <Select value={formData.product} onValueChange={(v) => handleSelect("product", v)}>
                  <SelectTrigger><SelectValue placeholder="Select Product (optional)" /></SelectTrigger>
                  <SelectContent className="overflow-y-auto max-h-[12rem]">
                    {products?.data.map((p: Product) => (
                      <SelectItem key={p._id} value={p._id!}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <h2 className="text-lg font-semibold mb-2">Other Information</h2>

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

            <div className="col-span-2">
              <Button type="submit" disabled={isLoading}>
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
