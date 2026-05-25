import React, { useState, useEffect, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getProductById, updateProduct } from "@/utils/api";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CircleArrowLeft } from "lucide-react";
import LoadingSpinner from "../common/spinner";

interface ProductData {
  name: string;
  type: string;
  capacity: number;
  location: string;
  notes: string;
}

const EditProduct = () => {
  const { id } = useParams<{ id: string }>();
  const [formData, setFormData] = useState<ProductData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    getProductById(id).then(({ data }) => setFormData(data)).catch(console.error);
  }, [id]);

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
          <CardTitle className="flex">
            <Link to="/products"><CircleArrowLeft className="me-3" /></Link>
            Edit Product / Service
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
              <Input id="type" name="type" value={formData.type} onChange={handleChange} />
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
