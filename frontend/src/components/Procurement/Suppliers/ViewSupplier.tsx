import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getSupplierById, getPurchaseOrders } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Edit, Mail, Phone, MapPin, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { DetailPageLayout } from "@/components/common/DetailPageLayout";
import { DetailHeader } from "@/components/common/DetailHeader";
import { RecordContextPanel } from "@/components/common/RecordContextPanel";
import LoadingSpinner from "@/components/common/spinner";

export default function ViewSupplier() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tr } = useLanguage();

  const { data, isPending } = useQuery({
    queryKey: ["supplier", id],
    queryFn: () => getSupplierById(id!)
  });
  const supplier = data?.data;

  const { data: posData } = useQuery({
    queryKey: ["pos-by-supplier", id],
    queryFn: () => getPurchaseOrders({ limit: 5 }),
    enabled: !!id
  });

  if (isPending) return <LoadingSpinner loading />;
  if (!supplier) return <div className="p-6">Supplier not found</div>;

  const addressStr = [
    supplier.address?.street,
    supplier.address?.city,
    supplier.address?.state,
    supplier.address?.country,
  ].filter(Boolean).join(", ");

  const header = (
    <DetailHeader
      crumbs={[{ label: "Suppliers", href: "/procurement/suppliers" }, { label: supplier.name }]}
      title={supplier.name}
      badges={
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
          supplier.status === "active" ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" : "bg-gray-100 text-gray-700"
        }`}>
          {supplier.status === "active" ? "Active" : "Inactive"}
        </span>
      }
      primaryAction={
        <Button size="sm" className="gap-1" onClick={() => navigate(`/procurement/suppliers/${id}/edit`)}>
          <Edit className="h-3.5 w-3.5" />{tr.common.edit}
        </Button>
      }
    />
  );

  const contextPanel = id ? (
    <RecordContextPanel linkedTo={id} linkedModel="Supplier" />
  ) : undefined;

  return (
    <DetailPageLayout header={header} contextPanel={contextPanel}>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Contact Info</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {supplier.contactName && (
            <div>
              <p className="text-sm text-muted-foreground">Contact Person</p>
              <p className="font-medium">{supplier.contactName}</p>
            </div>
          )}
          {supplier.email && (
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <p className="text-sm font-medium">{supplier.email}</p>
            </div>
          )}
          {supplier.phone && (
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <p className="text-sm font-medium">{supplier.phone}</p>
            </div>
          )}
          {addressStr && (
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <p className="text-sm font-medium">{addressStr}</p>
            </div>
          )}
          {supplier.taxId && (
            <div>
              <p className="text-sm text-muted-foreground">Tax ID</p>
              <p className="font-medium">{supplier.taxId}</p>
            </div>
          )}
          {supplier.notes && (
            <div className="sm:col-span-2 border-t pt-4">
              <p className="text-sm text-muted-foreground mb-1">Notes</p>
              <p className="text-sm whitespace-pre-wrap">{supplier.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Recent Purchase Orders</CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate("/procurement/purchase-orders/new")}>
            New PO
          </Button>
        </CardHeader>
        <CardContent>
          {posData?.data?.data && posData.data.data.length > 0 ? (
            <div className="space-y-3">
              {posData.data.data.map((po: any) => (
                <div key={po._id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <Link to={`/procurement/purchase-orders/${po._id}`} className="font-medium hover:underline">
                        {po.poNumber}
                      </Link>
                      <p className="text-xs text-muted-foreground">{format(new Date(po.issueDate), "MMM d, yyyy")}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{po.total.toLocaleString()} {po.currency}</p>
                    <p className="text-xs capitalize text-muted-foreground">{po.status}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No purchase orders found for this supplier.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </DetailPageLayout>
  );
}
