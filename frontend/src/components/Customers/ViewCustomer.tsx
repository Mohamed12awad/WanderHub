import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCustomerById, deleteCustomer, createDeal, getDeals, getNotes, getActivities, getQuotes, getInvoices } from "@/utils/api";
import { Link, useParams, useNavigate } from "react-router-dom";
import { CircleArrowLeft, Edit, MoreHorizontal, Trash2, Handshake, TrendingUp, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

const ViewCustomer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const canDelete = ["admin", "super admin"].includes(user!.role);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [dealForm, setDealForm] = useState({ title: "", price: "", currency: "EGP", status: "lead", source: "", expectedCloseDate: "", notes: "" });
  const [dealLoading, setDealLoading] = useState(false);
  const [dealErrors, setDealErrors] = useState<{ title?: string; price?: string }>({});

  const { data: response, isLoading, error } = useQuery(
    ["customer", id],
    () => getCustomerById(id!),
    { enabled: !!id }
  );
  const { getFieldsForModule } = useWorkspaceSettings();
  const _custFields = getFieldsForModule("customers");
  const fieldLabels = Object.fromEntries([
    ..._custFields.map((f) => [f.id, f.label]),
    ..._custFields.map((f) => [f.name, f.label]),
  ]);

  const customerData: Customer | null = response?.data ?? null;

  const { data: notesData }      = useQuery(["notes", id, "Customer"],       () => getNotes({ linkedTo: id!, linkedModel: "Customer" }),   { enabled: !!id });
  const { data: activitiesData } = useQuery(["activities", id],               () => getActivities(id!, "Customer"),                        { enabled: !!id });
  const { data: quotesData }     = useQuery(["quotes",    { customer: id }],  () => getQuotes({ customer: id }),                           { enabled: !!id });
  const { data: invoicesData }   = useQuery(["invoices",  { customer: id }],  () => getInvoices({ customer: id }),                         { enabled: !!id });
  const { data: dealsData }      = useQuery(["customer-deals", id],           () => getDeals({ customerId: id, page: 1, limit: 50 }),       { enabled: !!id });

  const notesCount      = ((notesData?.data)      as any[])?.length ?? 0;
  const activitiesCount = ((activitiesData?.data) as any[])?.length ?? 0;
  const quotesCount     = ((quotesData?.data)     as any[])?.length ?? 0;
  const invoicesCount   = ((invoicesData?.data)   as any[])?.length ?? 0;
  const dealsCount      = ((dealsData?.data as any)?.data as any[])?.length ?? 0;

  const handleClone = () => {
    if (!customerData) return;
    const { phone: _p, email: _e, _id, deals: _d, createdAt: _c, updatedAt: _u, owner, ...rest } = customerData as any;
    navigate("/customers/add", {
      state: {
        clone: {
          ...rest,
          name: `Copy of ${customerData.name}`,
          owner: typeof owner === "object" ? owner?._id : owner,
        },
      },
    });
  };

  const handleConvertToDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: { title?: string; price?: string } = {};
    if (!dealForm.title.trim()) errs.title = "Title is required";
    if (!dealForm.price || Number(dealForm.price) <= 0) errs.price = "Valid amount is required";
    if (Object.keys(errs).length) { setDealErrors(errs); return; }
    try {
      setDealLoading(true);
      const { data } = await createDeal({
        title: dealForm.title,
        customer: id!,
        product: "",
        price: Number(dealForm.price),
        currency: dealForm.currency,
        totalPaid: 0,
        status: dealForm.status,
        source: dealForm.source,
        quantity: 1,
        expectedCloseDate: dealForm.expectedCloseDate ? new Date(dealForm.expectedCloseDate) : new Date(),
        startDate: new Date(),
        endDate: new Date(),
        notes: dealForm.notes,
      } as any);
      navigate(`/deals/${data._id ?? data.id}`);
    } catch {
      toast({ title: "Failed to create deal", variant: "destructive" });
    } finally {
      setDealLoading(false);
    }
  };

  const handleDelete = async () => {
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
                <DropdownMenuItem onClick={handleClone}>
                  <Copy className="h-3.5 w-3.5 me-2" />Clone
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  const d = new Date(); d.setDate(d.getDate() + 7);
                  setDealForm({ title: "", price: "", currency: "EGP", status: "lead", source: customerData?.source ?? "", expectedCloseDate: d.toISOString().split("T")[0], notes: "" });
                  setDealErrors({});
                  setDealDialogOpen(true);
                }}>
                  <Handshake className="h-3.5 w-3.5 me-2" />Convert to Deal
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
              <InfoItem label="Lead Source" value={customerData.source} />
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
              <TabsList className="mb-4 flex-wrap h-auto">
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="deals">Deals<Cnt n={dealsCount} /></TabsTrigger>
                <TabsTrigger value="quotes">Quotes<Cnt n={quotesCount} /></TabsTrigger>
                <TabsTrigger value="invoices">Invoices<Cnt n={invoicesCount} /></TabsTrigger>
                <TabsTrigger value="notes">Notes<Cnt n={notesCount} /></TabsTrigger>
                <TabsTrigger value="activities">Activities<Cnt n={activitiesCount} /></TabsTrigger>
              </TabsList>
              <TabsContent value="timeline">
                <RecordTimeline linkedTo={id} linkedModel="Customer" />
              </TabsContent>
              <TabsContent value="deals">
                <CustomerDealsTab customerId={id!} />
              </TabsContent>
              <TabsContent value="quotes">
                <FinanceTab linkedModel="Customer" linkedId={id!} view="quotes" />
              </TabsContent>
              <TabsContent value="invoices">
                <FinanceTab linkedModel="Customer" linkedId={id!} view="invoices" />
              </TabsContent>
              <TabsContent value="notes">
                <NotesPanel linkedTo={id} linkedModel="Customer" />
              </TabsContent>
              <TabsContent value="activities">
                <ActivityList linkedTo={id} linkedModel="Customer" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
      <Dialog open={dealDialogOpen} onOpenChange={(v) => { setDealDialogOpen(v); if (!v) setDealErrors({}); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Handshake className="h-5 w-5" />
              Convert to Deal
            </DialogTitle>
          </DialogHeader>
          <form id="convert-deal-form" onSubmit={handleConvertToDeal} className="space-y-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deal-title">Title <span className="text-destructive">*</span></Label>
              <Input
                id="deal-title"
                placeholder="e.g. Summer Package for Mohamed Awad"
                value={dealForm.title}
                onChange={(e) => { setDealForm((p) => ({ ...p, title: e.target.value })); setDealErrors((p) => ({ ...p, title: "" })); }}
              />
              {dealErrors.title && <span className="text-destructive text-xs">{dealErrors.title}</span>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="deal-price">Amount <span className="text-destructive">*</span></Label>
                <Input
                  id="deal-price"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={dealForm.price}
                  onChange={(e) => { setDealForm((p) => ({ ...p, price: e.target.value })); setDealErrors((p) => ({ ...p, price: "" })); }}
                />
                {dealErrors.price && <span className="text-destructive text-xs">{dealErrors.price}</span>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Currency</Label>
                <Select value={dealForm.currency} onValueChange={(v) => setDealForm((p) => ({ ...p, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["EGP", "USD", "EUR", "GBP", "AED", "SAR"].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Status</Label>
                <Select value={dealForm.status} onValueChange={(v) => setDealForm((p) => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["lead", "qualified", "proposal", "negotiation", "won", "lost"].map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Source</Label>
                <Select value={dealForm.source} onValueChange={(v) => setDealForm((p) => ({ ...p, source: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>
                    {["Website", "Referral", "Cold Call", "Email", "Social Media", "Walk-in", "Other"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deal-close-date">Expected Close Date</Label>
              <Input
                id="deal-close-date"
                type="date"
                value={dealForm.expectedCloseDate}
                onChange={(e) => setDealForm((p) => ({ ...p, expectedCloseDate: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deal-notes">Notes</Label>
              <Input
                id="deal-notes"
                placeholder="Optional notes"
                value={dealForm.notes}
                onChange={(e) => setDealForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDealDialogOpen(false)}>Cancel</Button>
            <Button type="submit" form="convert-deal-form" disabled={dealLoading}>
              {dealLoading ? "Creating..." : "Create Deal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onConfirm={() => { setConfirmOpen(false); handleDelete(); }}
        onCancel={() => setConfirmOpen(false)}
        title="Delete Customer"
        description="Delete this customer? This action cannot be undone."
      />
    </main>
  );
};

const Cnt: React.FC<{ n: number }> = ({ n }) =>
  n > 0 ? <span className="ms-1.5 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-semibold leading-none">{n}</span> : null;

const STATUS_COLORS: Record<string, string> = {
  lead:        "bg-sky-500     text-white border-sky-500",
  qualified:   "bg-violet-500  text-white border-violet-500",
  proposal:    "bg-amber-500   text-white border-amber-500",
  negotiation: "bg-orange-500  text-white border-orange-500",
  won:         "bg-emerald-500 text-white border-emerald-500",
  lost:        "bg-rose-500    text-white border-rose-500",
  cancelled:   "bg-slate-400   text-white border-slate-400",
};

const CustomerDealsTab: React.FC<{ customerId: string }> = ({ customerId }) => {
  const { data, isLoading } = useQuery(
    ["customer-deals", customerId],
    () => getDeals({ customerId, page: 1, limit: 50 }),
  );
  const deals: any[] = (data?.data as any)?.data ?? [];

  if (isLoading) return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
    </div>
  );

  if (!deals.length) return (
    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
      <TrendingUp className="h-8 w-8 opacity-30" />
      <p className="text-sm">No deals yet</p>
    </div>
  );

  return (
    <div className="space-y-2">
      {deals.map((deal) => (
        <Link key={deal._id} to={`/deals/${deal._id}`} className="flex items-center justify-between rounded-lg border px-4 py-3 hover:bg-muted/50 transition-colors">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{deal.title}</p>
            <p className="text-xs text-muted-foreground">
              {deal.price?.toLocaleString()} {deal.currency}
              {deal.expectedCloseDate && ` · Close ${new Date(deal.expectedCloseDate).toLocaleDateString()}`}
            </p>
          </div>
          <Badge className={`${STATUS_COLORS[deal.status] ?? ""} capitalize shrink-0 ml-3`} variant="outline">
            {deal.status}
          </Badge>
        </Link>
      ))}
    </div>
  );
};

const InfoItem: React.FC<{ label: string; value?: string | number | null }> = ({ label, value }) => (
  <div className="mb-2 grid grid-cols-[160px_1fr] items-start gap-2">
    <Label className="text-sm font-medium text-foreground/60 pt-0.5">{label}</Label>
    <p className="text-sm text-foreground">{value ?? "—"}</p>
  </div>
);

export default ViewCustomer;
