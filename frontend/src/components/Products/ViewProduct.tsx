import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { getProductById } from "@/utils/api";
import { Link, useParams } from "react-router-dom";
import { CircleArrowLeft, Edit } from "lucide-react";
import { Button } from "../ui/button";
import LoadingSpinner from "../common/spinner";
import { NotesPanel } from "@/components/common/NotesPanel";

type ProductData = {
  name: string;
  type: string;
  capacity: number;
  location: string;
  notes: string;
};

const InfoItem: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="mb-3 grid grid-cols-2">
    <Label className="block text-sm font-medium">{label}</Label>
    <p className="mt-1 text-base">{value}</p>
  </div>
);

const ViewProduct: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductData | null>(null);

  useEffect(() => {
    if (!id) return;
    getProductById(id).then(({ data }) => setProduct(data)).catch(console.error);
  }, [id]);

  if (!product) return <LoadingSpinner loading />;

  return (
    <main className="p-4">
      <Card>
        <CardHeader className="flex flex-row justify-between">
          <CardTitle className="flex items-center gap-3">
            <Link to="/products"><CircleArrowLeft /></Link>
            Product Details
          </CardTitle>
          <Link to={`/products/${id}/edit`}>
            <Button size="sm" className="h-8 gap-1 px-5">
              <Edit className="h-3.5 w-3.5 me-1" />Edit
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <section>
              <h2 className="text-lg font-semibold mb-3">Product Information</h2>
              <InfoItem label="Name" value={product.name} />
              <InfoItem label="Type" value={product.type} />
              <InfoItem label="Capacity / Quantity" value={product.capacity} />
              <InfoItem label="Location" value={product.location} />
              <InfoItem label="Notes" value={product.notes} />
            </section>
          </div>

          {id && (
            <Tabs defaultValue="notes">
              <TabsList className="mb-4">
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>
              <TabsContent value="notes">
                <NotesPanel linkedTo={id} linkedModel="Product" />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default ViewProduct;
