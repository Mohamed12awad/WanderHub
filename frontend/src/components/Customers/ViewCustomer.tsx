import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCustomerById, deleteCustomer } from "@/utils/api";
import { Link, useParams, useNavigate } from "react-router-dom";
import { CircleArrowLeft, Edit, MoreHorizontal, Trash2 } from "lucide-react";
import { Customer } from "@/types/types";
import { Button } from "../ui/button";
import { ActivityList } from "@/components/Activities/ActivityList";
import { RecordTimeline } from "@/components/common/RecordTimeline";
import { NotesPanel } from "@/components/common/NotesPanel";
import FinanceTab from "@/components/Finance/FinanceTab";
import { AppBreadcrumb } from "@/components/common/AppBreadcrumb";
import { useQuery } from "react-query";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import { useAuth } from "@/contexts/authContext";
import { useToast } from "@/components/ui/use-toast";

const ViewCustomer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const canDelete = ["admin", "super admin"].includes(user!.role);

  const { data: response, isLoading, error } = useQuery(
    ["customer", id],
    () => getCustomerById(id!),
    { enabled: !!id }
  );
  const { getFieldsForModule } = useWorkspaceSettings();
  const fieldLabels = Object.fromEntries(getFieldsForModule("customers").map((f) => [f.id, f.label]));

  const customerData: Customer | null = response?.data ?? null;

  const handleDelete = async () => {
    if (!confirm("Delete this customer? This action cannot be undone.")) return;
    try {
      await deleteCustomer(id!);
      navigate("/customers");
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
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-40" />
            </div>
            <Skeleton className="h-8 w-20" />
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, s) => (
                <div key={s} className="space-y-3">
                  <Skeleton className="h-4 w-32 mb-3" />
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="grid grid-cols-2 gap-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (error || !customerData) {
    return <div className="p-4 text-sm text-destructive">Could not load customer.</div>;
  }

  return (
    <main className="p-4 space-y-5">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <AppBreadcrumb crumbs={[{ label: "Customers", href: "/customers" }, { label: customerData.name }]} />
            <CardTitle className="flex items-center gap-3 mt-1">
              <Link to="/customers"><CircleArrowLeft /></Link>
              <span className="truncate">{customerData.name}</span>
            </CardTitle>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link to={`/customers/${id}/edit`}>
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
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
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
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Personal Information</h2>
              <InfoItem label="Name" value={customerData.name} />
              <InfoItem label="Phone" value={customerData.phone} />
              <InfoItem label="Mobile" value={customerData.mobile} />
              <InfoItem label="Email" value={customerData.email} />
            </section>

            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Work Related</h2>
              <InfoItem label="Location" value={customerData.location} />
              <InfoItem
                label="Owner"
                value={
                  typeof customerData.owner !== "string" && customerData.owner !== null
                    ? customerData.owner.name
                    : "N/A"
                }
              />
              <InfoItem label="Status" value={customerData.status} />
              <InfoItem label="Notes" value={customerData.notes} />
            </section>

            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Address Information</h2>
              <InfoItem label="Street" value={customerData.address?.street} />
              <InfoItem label="City" value={customerData.address?.city} />
              <InfoItem label="State" value={customerData.address?.state} />
              <InfoItem label="ZIP Code" value={customerData.address?.zip} />
              <InfoItem label="Country" value={customerData.address?.country} />
            </section>

            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Identification</h2>
              <InfoItem label="Passport Number" value={customerData.identification?.passportNumber} />
              <InfoItem label="National ID" value={customerData.identification?.nationalId} />
              <InfoItem label="Date of Birth" value={customerData.dateOfBirth} />
              <InfoItem label="Gender" value={customerData.gender} />
            </section>

            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Emergency Contact</h2>
              <InfoItem label="Name" value={customerData.emergencyContact?.name} />
              <InfoItem label="Phone" value={customerData.emergencyContact?.phone} />
              <InfoItem label="Relationship" value={customerData.emergencyContact?.relationship} />
            </section>

            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Loyalty Program</h2>
              <InfoItem label="Member ID" value={customerData.loyaltyProgram?.memberId} />
              <InfoItem label="Points" value={customerData.loyaltyProgram?.points} />
            </section>

            {customerData.customFields && Object.keys(customerData.customFields as Record<string, unknown>).length > 0 && (
              <section className="md:col-span-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Custom Fields</h2>
                <div className="grid md:grid-cols-2 gap-x-6">
                  {Object.entries(customerData.customFields as Record<string, string>).map(([k, v]) => (
                    <InfoItem key={k} label={fieldLabels[k] ?? k} value={String(v)} />
                  ))}
                </div>
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
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="activities">Activities</TabsTrigger>
                <TabsTrigger value="finance">Finance</TabsTrigger>
              </TabsList>
              <TabsContent value="timeline">
                <RecordTimeline linkedTo={id} linkedModel="Customer" />
              </TabsContent>
              <TabsContent value="notes">
                <NotesPanel linkedTo={id} linkedModel="Customer" />
              </TabsContent>
              <TabsContent value="activities">
                <ActivityList linkedTo={id} linkedModel="Customer" />
              </TabsContent>
              <TabsContent value="finance">
                <FinanceTab linkedModel="Customer" linkedId={id} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </main>
  );
};

const InfoItem: React.FC<{ label: string; value?: string | number | null }> = ({ label, value }) => (
  <div className="mb-2 grid grid-cols-[160px_1fr] items-start gap-2">
    <Label className="text-sm font-medium text-foreground/60 pt-0.5">{label}</Label>
    <p className="text-sm text-foreground">{value ?? "—"}</p>
  </div>
);

export default ViewCustomer;
