import React, { useState, useEffect, useRef, ChangeEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getProductById, updateProduct } from "@/utils/api";
import { useNavigate, useParams } from "react-router-dom";
import LoadingSpinner from "../common/spinner";
import DynamicFields from "@/components/common/DynamicFields";
import { EntityFormPage } from "@/components/common/EntityFormPage";
import { StickyFormBar } from "@/components/common/StickyFormBar";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import { useSaveMutation } from "@/hooks/useSaveMutation";
import { queryKeys } from "@/lib/queryKeys";

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
      const { _id, createdAt, updatedAt, deletedAt, ...fields } = data as any;
      const loaded = { ...fields, customFields: fields.customFields ?? {} };
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

  const saveMutation = useSaveMutation<ProductData>({
    save: (payload) => updateProduct(id!, payload),
    invalidate: id ? [queryKeys.products.all, queryKeys.products.detail(id)] : [queryKeys.products.all],
    successMessage: "Product updated",
    errorMessage: "Failed to update product",
    onSuccess: (res: any) => navigate(`/products/${res?.data?._id ?? id}`),
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData || !id) return;
    saveMutation.mutate(formData);
  };

  if (!formData) return <LoadingSpinner loading />;

  return (
    <EntityFormPage
      title={
        <span className="inline-flex items-center gap-2">
          Edit Product / Service
          {isDirty && (
            <Badge variant="outline" className="text-xs font-normal text-amber-600 border-amber-400 bg-amber-50 dark:bg-amber-900/20">
              Unsaved changes
            </Badge>
          )}
        </span>
      }
      backHref={`/products/${id}`}
      breadcrumb={[{ label: "Products", href: "/products" }, { label: "Edit" }]}
    >
      <LoadingSpinner loading={saveMutation.isPending} />
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
              <AutoTextarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                minRows={2}
              />
            </div>
            <DynamicFields
              module="products"
              values={formData.customFields}
              onChange={(k, v) => setFormData((prev) => ({ ...prev!, customFields: { ...prev!.customFields, [k]: v } }))}
            />

            <div className="col-span-2">
              <StickyFormBar
                isSubmitting={saveMutation.isPending}
                onCancel={() => navigate(`/products/${id}`)}
                submitLabel="Update Product"
              />
            </div>
          </form>
    </EntityFormPage>
  );
};

export default EditProduct;
