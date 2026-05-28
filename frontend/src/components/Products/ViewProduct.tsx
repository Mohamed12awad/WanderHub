import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getProductById, deleteProduct, getNotes } from "@/utils/api";
import { Link, useParams, useNavigate } from "react-router-dom";
import { CircleArrowLeft, Edit, MoreHorizontal, Trash2, Copy } from "lucide-react";
import { Button } from "../ui/button";
import { NotesPanel } from "@/components/common/NotesPanel";
import { RecordTimeline } from "@/components/common/RecordTimeline";
import { AppBreadcrumb } from "@/components/common/AppBreadcrumb";
import { useQuery } from "react-query";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import { useAuth } from "@/contexts/authContext";
import { useToast } from "@/components/ui/use-toast";

const InfoItem: React.FC<{ label: string; value?: string | number | null }> = ({ label, value }) => (
  <div className="mb-2 grid grid-cols-[160px_1fr] items-start gap-2">
    <Label className="text-sm font-medium text-foreground/60 pt-0.5">{label}</Label>
    <p className="text-sm text-foreground">{value ?? "—"}</p>
  </div>
);

const ViewProduct: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const canDelete = ["admin", "super admin"].includes(user!.role);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: response, isLoading, error } = useQuery(
    ["product", id],
    () => getProductById(id!),
    { enabled: !!id }
  );
  const { data: notesData } = useQuery(["notes", id, "Product"], () => getNotes({ linkedTo: id!, linkedModel: "Product" }), { enabled: !!id });
  const notesCount = ((notesData?.data) as any[])?.length ?? 0;

  const { getFieldsForModule } = useWorkspaceSettings();
  const _prodFields = getFieldsForModule("products");
  const fieldLabels = Object.fromEntries([
    ..._prodFields.map((f) => [f.id, f.label]),
    ..._prodFields.map((f) => [f.name, f.label]),
  ]);

  const product = response?.data ?? null;

  const handleClone = () => {
    if (!product) return;
    const { _id, id: _, createdAt, updatedAt, ...rest } = product as any;
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

  if (isLoading) {
    return (
      <main className="p-4">
        <Card>
          <CardHeader className="flex flex-row justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-6 w-40" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-8" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-w-sm">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (error || !product) {
    return <div className="p-4 text-sm text-destructive">Could not load product.</div>;
  }

  const customFields = product.customFields as Record<string, string> | null;
  const hasCustomFields = customFields && Object.keys(customFields).length > 0;

  return (
    <main className="p-4 space-y-5">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <AppBreadcrumb crumbs={[{ label: "Products", href: "/products" }, { label: product.name }]} />
            <CardTitle className="flex items-center gap-3 mt-1">
              <Link to="/products"><CircleArrowLeft /></Link>
              <span className="truncate">{product.name}</span>
            </CardTitle>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link to={`/products/${id}/edit`}>
              <Button size="sm" className="h-8 gap-1 px-4">
                <Edit className="h-3.5 w-3.5 me-1" />Edit
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">More actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleClone}>
                  <Copy className="h-3.5 w-3.5 me-2" />Clone
                </DropdownMenuItem>
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setConfirmOpen(true)} className="text-destructive focus:text-destructive">
                      <Trash2 className="h-3.5 w-3.5 me-2" />Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
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

      {id && (
        <Card>
          <CardContent className="py-5">
            <Tabs defaultValue="timeline">
              <TabsList className="mb-4">
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="notes">
                  Notes
                  {notesCount > 0 && (
                    <span className="ms-1.5 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-semibold leading-none">{notesCount}</span>
                  )}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="timeline">
                <RecordTimeline linkedTo={id} linkedModel="Product" />
              </TabsContent>
              <TabsContent value="notes">
                <NotesPanel linkedTo={id} linkedModel="Product" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onConfirm={() => { setConfirmOpen(false); handleDelete(); }}
        onCancel={() => setConfirmOpen(false)}
        title="Delete Product"
        description="Delete this product? This action cannot be undone."
      />
    </main>
  );
};

export default ViewProduct;
