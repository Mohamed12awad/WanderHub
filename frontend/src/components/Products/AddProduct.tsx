import React, { useState, ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createProduct, getProductCategories } from "@/utils/api";
import { productSchema, zodFieldErrors } from "@/validations/schemas";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import LoadingSpinner from "../common/spinner";
import DynamicFields from "@/components/common/DynamicFields";
import { EntityFormPage } from "@/components/common/EntityFormPage";
import { StickyFormBar } from "@/components/common/StickyFormBar";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import { useSaveMutation } from "@/hooks/useSaveMutation";
import { useUnsavedChangesSnapshot } from "@/hooks/useUnsavedChangesGuard";
import { queryKeys } from "@/lib/queryKeys";

const DEFAULT_TYPES = ["service", "physical", "digital", "subscription"];

const initialFormData = {
  name: "",
  type: "",
  capacity: "",
  location: "",
  notes: "",
  categoryId: "",
  tracksInventory: true,
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
  const navigate = useNavigate();
  const { getFieldsForModule } = useWorkspaceSettings();
  const { data: catData } = useQuery({ queryKey: queryKeys.productCategories.all, queryFn: () => getProductCategories(), staleTime: 60000 });
  const categories: { _id: string; name: string }[] = catData?.data ?? [];
  const typeOptions = getFieldsForModule("products")
    .find((f) => f.isSystem && f.name === "type")
    ?.options?.split(",").map((o) => o.trim()).filter(Boolean)
    ?? DEFAULT_TYPES;
  const { allowNavigation, resetSnapshot } = useUnsavedChangesSnapshot(formData);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = (): FormErrors => zodFieldErrors(productSchema, formData);

  const saveMutation = useSaveMutation<any>({
    save: createProduct,
    invalidate: [queryKeys.products.all],
    successMessage: "Product created",
    errorMessage: "Failed to create product",
    onSuccess: () => {
      allowNavigation();
      resetSnapshot();
      navigate("/products");
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    saveMutation.mutate({ ...formData, capacity: Number(formData.capacity), categoryId: formData.categoryId || undefined });
  };

  return (
    <EntityFormPage
      title="Add Product / Service"
      backHref="/products"
      breadcrumb={[{ label: "Products", href: "/products" }, { label: "New" }]}
    >
      <LoadingSpinner loading={saveMutation.isPending} />
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
            <div className="flex flex-col col-span-2 md:col-span-1">
              <Label className="my-3" htmlFor="category">Category</Label>
              <Select value={formData.categoryId || "none"} onValueChange={(v) => setFormData((prev: any) => ({ ...prev, categoryId: v === "none" ? "" : v }))}>
                <SelectTrigger id="category"><SelectValue placeholder="Uncategorized" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Uncategorized</SelectItem>
                  {categories.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 col-span-2 md:col-span-1 md:mt-9">
              <input id="tracksInventory" type="checkbox" checked={formData.tracksInventory} onChange={(e) => setFormData((prev: any) => ({ ...prev, tracksInventory: e.target.checked }))} />
              <Label htmlFor="tracksInventory" className="cursor-pointer">Tracks inventory (stock + COGS)</Label>
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
              onChange={(k, v) => setFormData((prev: any) => ({ ...prev, customFields: { ...prev.customFields, [k]: v } }))}
            />

            <div className="col-span-2">
              <StickyFormBar
                isSubmitting={saveMutation.isPending}
                onCancel={() => navigate("/products")}
                submitLabel="Add Product"
              />
            </div>
          </form>
    </EntityFormPage>
  );
};

export default AddProduct;
