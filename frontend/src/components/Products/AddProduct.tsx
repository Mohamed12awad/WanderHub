import React, { useState, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createProduct } from "@/utils/api";
import { productSchema, zodFieldErrors } from "@/validations/schemas";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { CircleArrowLeft } from "lucide-react";
import LoadingSpinner from "../common/spinner";
import DynamicFields from "@/components/common/DynamicFields";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";

const DEFAULT_TYPES = ["service", "physical", "digital", "subscription"];

const initialFormData = {
  name: "",
  type: "",
  capacity: "",
  location: "",
  notes: "",
  customFields: {} as Record<string, string>,
};

interface FormErrors {
  name?: string;
  type?: string;
}

const AddProduct = () => {
  const location = useLocation();
  const cloneData = (location.state as any)?.clone;
  const [formData, setFormData] = useState<typeof initialFormData>(cloneData ? { ...initialFormData, ...cloneData } : initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { getFieldsForModule } = useWorkspaceSettings();
  const typeOptions = getFieldsForModule("products")
    .find((f) => f.isSystem && f.name === "type")
    ?.options?.split(",").map((o) => o.trim()).filter(Boolean)
    ?? DEFAULT_TYPES;

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = (): FormErrors => zodFieldErrors(productSchema, formData);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    try {
      setIsLoading(true);
      await createProduct({ ...formData, capacity: Number(formData.capacity) });
      navigate("/products");
    } catch (error) {
      console.error("Error adding product:", error);
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
            <Link to="/products"><CircleArrowLeft className="me-3" /></Link>
            Add Product / Service
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col col-span-2 md:col-span-1">
              <Label className="my-3" htmlFor="name">Name</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
              {errors.name && <span className="text-red-500 text-sm">{errors.name}</span>}
            </div>
            <div className="flex flex-col col-span-2 md:col-span-1">
              <Label className="my-3" htmlFor="type">Type</Label>
              <Select value={formData.type} onValueChange={(v) => { setFormData((prev: any) => ({ ...prev, type: v })); setErrors((prev) => ({ ...prev, type: "" })); }}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type…" />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((opt) => (
                    <SelectItem key={opt} value={opt} className="capitalize">{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && <span className="text-red-500 text-sm">{errors.type}</span>}
            </div>
            <div className="flex flex-col col-span-2 md:col-span-1">
              <Label className="my-3" htmlFor="capacity">Quantity / Capacity</Label>
              <Input id="capacity" name="capacity" type="number" value={formData.capacity} onChange={handleChange} />
            </div>
            <div className="flex flex-col col-span-2 md:col-span-1">
              <Label className="my-3" htmlFor="location">Location</Label>
              <Input id="location" name="location" value={formData.location} onChange={handleChange} />
            </div>
            <div className="flex flex-col col-span-2">
              <Label className="my-3" htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="border border-input rounded-lg p-2 min-h-[80px]"
              />
            </div>
            <DynamicFields
              module="products"
              values={formData.customFields}
              onChange={(k, v) => setFormData((prev: any) => ({ ...prev, customFields: { ...prev.customFields, [k]: v } }))}
            />

            <div className="col-span-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Adding..." : "Add Product"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default AddProduct;
