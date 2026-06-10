import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { getProductById, deleteProduct } from "@/utils/api";
import { useParams, useNavigate } from "react-router-dom";
import { Edit, Trash2, Copy } from "lucide-react";
import { Button } from "../ui/button";
import { DetailPageLayout } from "@/components/common/DetailPageLayout";
import { DetailHeader, DetailMenuItem } from "@/components/common/DetailHeader";
import { RecordContextPanel } from "@/components/common/RecordContextPanel";
import LoadingSpinner from "@/components/common/spinner";
import { useQuery } from "@tanstack/react-query";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import { useAuth } from "@/contexts/authContext";
import { useToast } from "@/components/ui/use-toast";
import { InfoRow as InfoItem } from "@/components/common/InfoRow";

const ViewProduct: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const canDelete = (user?.permissions ?? []).some((p) => p === '*' || p === 'products:delete');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: response, isPending, error } = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProductById(id!),
    enabled: !!id
  });

  const { getFieldsForModule } = useWorkspaceSettings();
  const _prodFields = getFieldsForModule("products");
  const fieldLabels = Object.fromEntries([
    ..._prodFields.map((f) => [f.id, f.label]),
    ..._prodFields.map((f) => [f.name, f.label]),
  ]);

  const product = response?.data ?? null;

  const handleClone = () => {
    if (!product) return;
    const { _id, id: _, createdAt: _createdAt, updatedAt: _updatedAt, deletedAt: _deletedAt, ...rest } = product as any;
    navigate("/products/add", { state: { clone: { ...rest, name: `Copy of ${product.name}` } } });
  };

  const handleDelete = async () => {
    try {
      await deleteProduct(id!);
      navigate("/products");
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  if (isPending) return <LoadingSpinner loading />;

  if (error || !product) {
    return <div className="p-4 text-sm text-destructive">Could not load product.</div>;
  }

  const customFields = product.customFields as Record<string, string> | null;
  const hasCustomFields = customFields && Object.keys(customFields).length > 0;

  const menuItems: DetailMenuItem[] = [
    { label: "Clone", icon: <Copy className="h-3.5 w-3.5 me-2" />, onClick: handleClone },
  ];
  if (canDelete) {
    menuItems.push({ label: "Delete", icon: <Trash2 className="h-3.5 w-3.5 me-2" />, onClick: () => setConfirmOpen(true), destructive: true, separatorBefore: true });
  }

  const header = (
    <DetailHeader
      crumbs={[{ label: "Products", href: "/products" }, { label: product.name }]}
      title={product.name}
      primaryAction={
        <Button size="sm" className="gap-1" onClick={() => navigate(`/products/${id}/edit`)}>
          <Edit className="h-3.5 w-3.5" />Edit
        </Button>
      }
      menuItems={menuItems}
    />
  );

  const contextPanel = id ? (
    <RecordContextPanel linkedTo={id} linkedModel="Product" showActivities={false} />
  ) : undefined;

  return (
    <DetailPageLayout header={header} contextPanel={contextPanel}>
      <Card>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Product Information</h2>
              <InfoItem label="Name" value={product.name} />
              <InfoItem label="Type" value={product.type} />
              <InfoItem label="Capacity / Quantity" value={product.capacity} />
              <InfoItem label="Location" value={product.location} />
              <InfoItem label="Price" value={product.price} />
              <InfoItem label="Notes" value={product.notes} />
            </section>

            {hasCustomFields && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Custom Fields</h2>
                {Object.entries(customFields).map(([k, v]) => (
                  <InfoItem key={k} label={fieldLabels[k] ?? k} value={String(v)} />
                ))}
              </section>
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onConfirm={() => { setConfirmOpen(false); handleDelete(); }}
        onCancel={() => setConfirmOpen(false)}
        title="Delete Product"
        description="Delete this product? This action cannot be undone."
      />
    </DetailPageLayout>
  );
};

export default ViewProduct;
