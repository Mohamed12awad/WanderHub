import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getSupplierById, getPurchaseOrders, getNotes, getActivities } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Mail, Phone, MapPin, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { RecordTimeline } from "@/components/common/RecordTimeline";
import { NotesPanel } from "@/components/common/NotesPanel";
import { AttachmentsPanel } from "@/components/common/AttachmentsPanel";
import { ActivityList } from "@/components/Activities/ActivityList";

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
  const { data: notesData }      = useQuery({
    queryKey: ["notes", id, "Supplier"],
    queryFn: () => getNotes({ linkedTo: id!, linkedModel: "Supplier" }),
    enabled: !!id
  });
  const { data: activitiesData } = useQuery({
    queryKey: ["activities", id],
    queryFn: () => getActivities(id!, "Supplier"),
    enabled: !!id
  });
  const notesCount      = ((notesData?.data)      as any[])?.length ?? 0;
  const activitiesCount = ((activitiesData?.data) as any[])?.length ?? 0;

  if (isPending) return <div className="p-6">Loading...</div>;
  if (!supplier) return <div className="p-6">Supplier not found</div>;

  const addressStr = [
    supplier.address?.street,
    supplier.address?.city,
    supplier.address?.state,
    supplier.address?.country,
  ].filter(Boolean).join(", ");

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/procurement/suppliers")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              {supplier.name}
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                supplier.status === "active" ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" : "bg-gray-100 text-gray-700"
              }`}>
                {supplier.status === "active" ? "Active" : "Inactive"}
              </span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Supplier since {format(new Date(supplier.createdAt), "MMMM yyyy")}
            </p>
          </div>
        </div>
        <Button onClick={() => navigate(`/procurement/suppliers/${id}/edit`)}>
          <Edit className="w-4 h-4 mr-2" />
          {tr.common.edit}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {supplier.contactName && (
                <div>
                  <p className="text-sm text-muted-foreground">Contact Person</p>
                  <p className="font-medium">{supplier.contactName}</p>
                </div>
              )}
              {supplier.email && (
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{supplier.email}</p>
                  </div>
                </div>
              )}
              {supplier.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{supplier.phone}</p>
                  </div>
                </div>
              )}
              {addressStr && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{addressStr}</p>
                  </div>
                </div>
              )}
              {supplier.taxId && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Tax ID</p>
                  <p className="font-medium">{supplier.taxId}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {supplier.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{supplier.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="md:col-span-2 space-y-6">
          {/* Recent Purchase Orders Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Purchase Orders</CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate("/procurement/purchase-orders/new")}>
                New PO
              </Button>
            </CardHeader>
            <CardContent>
              {/* For MVP we just show a placeholder or filter the data we have. */}
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
        </div>
      </div>
      {id && (
        <Card>
          <CardContent className="py-5">
            <Tabs defaultValue="timeline">
              <TabsList className="mb-4 flex-wrap h-auto">
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="notes">Notes{notesCount > 0 && ` (${notesCount})`}</TabsTrigger>
                <TabsTrigger value="activities">Activities{activitiesCount > 0 && ` (${activitiesCount})`}</TabsTrigger>
                <TabsTrigger value="attachments">Attachments</TabsTrigger>
              </TabsList>
              <TabsContent value="timeline">
                <RecordTimeline linkedTo={id} linkedModel="Supplier" />
              </TabsContent>
              <TabsContent value="notes">
                <NotesPanel linkedTo={id} linkedModel="Supplier" />
              </TabsContent>
              <TabsContent value="activities">
                <ActivityList linkedTo={id} linkedModel="Supplier" />
              </TabsContent>
              <TabsContent value="attachments">
                <AttachmentsPanel linkedModel="Supplier" linkedToId={id!} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
