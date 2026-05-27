import React, { useState, useEffect, useRef, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getProductById, updateProduct } from "@/utils/api";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CircleArrowLeft } from "lucide-react";
import LoadingSpinner from "../common/spinner";
import DynamicFields from "@/components/common/DynamicFields";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";

const DEFAULT_TYPES = ["service", "physical", "digital", "subscription"];

interface ProductData {
  name: string;
  type: string;
  capacity: number;
  location: string;
  notes: string;
  customFields: Record<string, string>;
}

const EditProduct = () => {
  const { id } = useParams<{ id: string }>();
  const [formData, setFormData] = useState<ProductData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const originalRef = useRef<string | null>(null);
  const navigate = useNavigate();
  const { getFieldsForModule } = useWorkspaceSettings();
  const typeOptions = getFieldsForModule("products")
    .find((f) => f.isSystem && f.name === "type")
    ?.options?.split(",").map((o) => o.trim()).filter(Boolean)
    ?? DEFAULT_TYPES;

  useEffect(() => {
    if (!id) return;
    getProductById(id).then(({ data }) => {
      const loaded = { ...data, customFields: data.customFields ?? {} };
      setFormData(loaded);
      originalRef.current = JSON.stringify(loaded);
    }).catch(console.error);
  }, [id]);

  const isDirty = originalRef.current !== null && JSON.stringify(formData) !== originalRef.current;

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev!, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await updateProduct(id!, formData!);
      navigate("/products");
    } catch (error) {
      console.error("Error updating product:", error);
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
            <Link to={`/products/${id}`}><CircleArrowLeft className="me-3" /></Link>
            Edit Product / Service
            {isDirty && (
              <Badge variant="outline" className="text-xs font-normal text-amber-600 border-amber-400 bg-amber-50 dark:bg-amber-900/20">
                Unsaved changes
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col col-span-2 md:col-span-1">
              <Label className="my-3" htmlFor="name">Name</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="flex flex-col col-span-2 md:col-span-1">
              <Label className="my-3" htmlFor="type">Type</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData((prev) => ({ ...prev!, type: v }))}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type…" />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((opt) => (
                    <SelectItem key={opt} value={opt} className="capitalize">{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              onChange={(k, v) => setFormData((prev) => ({ ...prev!, customFields: { ...prev!.customFields, [k]: v } }))}
            />

            <div className="col-span-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Updating..." : "Update Product"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default EditProduct;
