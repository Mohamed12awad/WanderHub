import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getDealById, deleteDeal, getNotes, getActivities, getQuotes, getInvoices } from "@/utils/api";
import { Link, useParams, useNavigate } from "react-router-dom";
import { CircleArrowLeft, Edit, FileText, ArrowRight, MoreHorizontal, Trash2, Copy } from "lucide-react";
import { useQuery } from "react-query";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import { useAuth } from "@/contexts/authContext";
import { Button } from "../ui/button";
import { ActivityList } from "@/components/Activities/ActivityList";
import { RecordTimeline } from "@/components/common/RecordTimeline";
import { NotesPanel } from "@/components/common/NotesPanel";
import FinanceTab from "@/components/Finance/FinanceTab";
import { AppBreadcrumb } from "@/components/common/AppBreadcrumb";
import { useToast } from "@/components/ui/use-toast";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

function oneWeekFromNow() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
}

const STATUS_COLORS: Record<string, string> = {
  lead:        "bg-sky-500     text-white border-sky-500     dark:bg-sky-600     dark:border-sky-600",
  qualified:   "bg-violet-500  text-white border-violet-500  dark:bg-violet-600  dark:border-violet-600",
  proposal:    "bg-amber-500   text-white border-amber-500   dark:bg-amber-600   dark:border-amber-600",
  negotiation: "bg-orange-500  text-white border-orange-500  dark:bg-orange-600  dark:border-orange-600",
  won:         "bg-emerald-500 text-white border-emerald-500 dark:bg-emerald-600 dark:border-emerald-600",
  lost:        "bg-rose-500    text-white border-rose-500    dark:bg-rose-600    dark:border-rose-600",
  cancelled:   "bg-slate-400   text-white border-slate-400   dark:bg-slate-600   dark:border-slate-600",
};

const NEXT_STEPS: Record<string, { label: string; href?: (dealId: string, customerId: string) => string }> = {
  lead: { label: "Qualify this deal" },
  qualified: { label: "Create a Proposal" },
  proposal: { label: "Create a Quote", href: (id, cid) => `/finance/quotes/new?deal=${id}&customer=${cid}` },
  negotiation: { label: "Close or mark lost" },
  won: { label: "Send Invoice", href: (id) => `/finance/invoices/new?deal=${id}` },
};

interface DealData {
  _id: string;
  title: string;
  customerID: string;
  customer: string;
  customerPhone: string;
  category: string;
  owner: string;
  ownerID: string;
  dealType: string;
  price: number;
  currency: string;
  status: string;
  priority: string;
  probability: number;
  source: string;
  expectedCloseDate: Date | null;
  lostReason: string;
  notes: string;
  createdAt: string;
  customFields?: Record<string, string>;
}

const ViewDeal = () => {
  const { id: dealId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const canDelete = ["admin", "super admin"].includes(user!.role);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: dealData, isLoading, error } = useQuery(
    ["deals", dealId],
    () => getDealById(dealId!)
  );
  const { getFieldsForModule } = useWorkspaceSettings();
  const _dealFields = getFieldsForModule("deals");
  const fieldLabels = Object.fromEntries([
    ..._dealFields.map((f) => [f.id, f.label]),
    ..._dealFields.map((f) => [f.name, f.label]),
  ]);

  const [formData, setFormData] = useState<DealData | null>(null);

  useEffect(() => {
    if (!dealData?.data) return;
    const d = dealData.data.deal;
    setFormData({
      ...d,
      customerID: d.customer?._id,
      customer: d.customer?.name,
      customerPhone: d.customer?.phone ?? d.customer?.mobile,
      category: d.category ?? "",
      owner: d.owner?.name ?? "—",
      ownerID: d.owner?._id ?? "",
      dealType: d.dealType ?? "",
      price: Number(d.price),
      priority: d.priority ?? "medium",
      probability: Number(d.probability ?? 0),
      expectedCloseDate: d.expectedCloseDate ? new Date(d.expectedCloseDate) : null,
      lostReason: d.lostReason ?? "",
      customFields: d.customFields ?? {},
    });
  }, [dealData]);

  const { data: notesData }      = useQuery(["notes", dealId, "Deal"],      () => getNotes({ linkedTo: dealId!, linkedModel: "Deal" }),  { enabled: !!dealId });
  const { data: activitiesData } = useQuery(["activities", dealId],          () => getActivities(dealId!, "Deal"),                        { enabled: !!dealId });
  const { data: quotesData }     = useQuery(["quotes",   { deal: dealId }],  () => getQuotes({ deal: dealId }),                           { enabled: !!dealId });
  const { data: invoicesData }   = useQuery(["invoices", { deal: dealId }],  () => getInvoices({ deal: dealId }),                         { enabled: !!dealId });

  const notesCount      = ((notesData?.data)      as any[])?.length ?? 0;
  const activitiesCount = ((activitiesData?.data) as any[])?.length ?? 0;
  const quotesCount     = ((quotesData?.data)     as any[])?.length ?? 0;
  const invoicesCount   = ((invoicesData?.data)   as any[])?.length ?? 0;

  const invoicesList: any[] = ((invoicesData?.data) as any[]) ?? [];
  const invoicedTotal = invoicesList.reduce((s, inv) => s + (inv.total ?? 0), 0);
  const invoicesPaid  = invoicesList.reduce((s, inv) => s + (inv.totalPaid ?? 0), 0);
  const invoicesOutstanding = invoicedTotal - invoicesPaid;

  const handleClone = () => {
    if (!formData) return;
    navigate("/deals/add", {
      state: {
        clone: {
          title: `Copy of ${formData.title}`,
          customer: formData.customerID,
          category: formData.category,
          owner: formData.ownerID,
          dealType: formData.dealType,
          price: String(formData.price),
          currency: formData.currency,
          status: "lead",
          priority: formData.priority,
          probability: "10",
          source: formData.source,
          notes: formData.notes,
          expectedCloseDate: oneWeekFromNow(),
          customFields: formData.customFields ?? {},
        },
      },
    });
  };

  const handleDelete = async () => {
    try {
      await deleteDeal(dealId!);
      navigate("/deals");
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  if (isLoading || !formData) {
    return (
      <main className="p-4 space-y-4">
        <Card>
          <CardHeader className="flex flex-row justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-48" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-8" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[0, 1].map((col) => (
                <div key={col} className="space-y-3">
                  <Skeleton className="h-4 w-28 mb-4" />
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="grid grid-cols-2 gap-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-28" />
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

  if (error) return <div className="p-4">Error loading deal</div>;

  const nextStep = NEXT_STEPS[formData.status];

  return (
    <main className="p-4 space-y-5">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 flex-wrap print:hidden">
          <div className="min-w-0">
            <AppBreadcrumb crumbs={[{ label: "Deals", href: "/deals" }, { label: formData.title }]} />
            <CardTitle className="flex items-center gap-3 mt-1">
              <Link to="/deals"><CircleArrowLeft /></Link>
              <span className="truncate">{formData.title}</span>
            </CardTitle>
            {nextStep && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-foreground/50 font-medium">Next step:</span>
                {nextStep.href ? (
                  <Link to={nextStep.href(dealId!, formData.customerID)}>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 font-medium">
                      {nextStep.label}
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                ) : (
                  <span className="text-xs text-foreground/50 italic">{nextStep.label}</span>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-wrap shrink-0">
            <Link to={`/finance/quotes/new?deal=${dealId}&customer=${formData.customerID}`}>
              <Button size="sm" variant="outline" className="h-8 px-4">
                <FileText className="h-3.5 w-3.5 me-1" />New Quote
              </Button>
            </Link>
            <Link to={`/deals/${dealId}/edit`}>
              <Button size="sm" className="h-8 px-4">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Deal details */}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Deal Details</h2>
              <InfoRow label="Customer">
                <Link to={`/customers/${formData.customerID}`} className="text-sm text-blue-500 hover:underline">{formData.customer}</Link>
              </InfoRow>
              <InfoRow label="Phone" value={formData.customerPhone} />
              {formData.category && <InfoRow label="Category" value={formData.category} />}
              {formData.dealType && (
                <InfoRow label="Deal Type" value={
                  formData.dealType === "new_business" ? "New Business"
                  : formData.dealType === "cross_sell" ? "Cross-sell"
                  : formData.dealType.charAt(0).toUpperCase() + formData.dealType.slice(1)
                } />
              )}
              <InfoRow label="Owner" value={formData.owner !== "—" ? formData.owner : undefined} />
              {formData.notes && <InfoRow label="Notes" value={formData.notes} />}
            </div>

            {/* Sales info */}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Sales Information</h2>
              <InfoRow label="Stage">
                <Badge className={`${STATUS_COLORS[formData.status] ?? ""} w-fit capitalize`} variant="outline">{formData.status}</Badge>
              </InfoRow>
              <InfoRow label="Priority">
                <span className={`text-sm font-medium capitalize ${
                  formData.priority === "high" ? "text-red-600" :
                  formData.priority === "medium" ? "text-amber-600" :
                  "text-muted-foreground"
                }`}>{formData.priority || "—"}</span>
              </InfoRow>
              <InfoRow label="Win Probability" value={`${formData.probability}%`} />
              <InfoRow label="Source" value={formData.source} />
              <InfoRow label="Expected Close" value={formData.expectedCloseDate?.toISOString().split("T")[0] ?? "—"} />
              {formData.status === "lost" && formData.lostReason && (
                <InfoRow label="Lost Reason" value={formData.lostReason} />
              )}
            </div>

            {/* Financial summary */}
            <div className="md:col-span-2 border-t pt-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Financial Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Deal Value</p>
                  <p className="text-base font-semibold tabular-nums">{formData.price.toLocaleString()} <span className="text-xs font-normal">{formData.currency}</span></p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Invoiced</p>
                  <p className="text-base font-semibold tabular-nums text-foreground">{invoicedTotal.toLocaleString()} <span className="text-xs font-normal">{formData.currency}</span></p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Collected</p>
                  <p className="text-base font-semibold tabular-nums text-emerald-600">{invoicesPaid.toLocaleString()} <span className="text-xs font-normal">{formData.currency}</span></p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Outstanding</p>
                  <p className={`text-base font-semibold tabular-nums ${invoicesOutstanding > 0 ? "text-red-500" : "text-emerald-600"}`}>{invoicesOutstanding.toLocaleString()} <span className="text-xs font-normal">{formData.currency}</span></p>
                </div>
              </div>
            </div>

            {formData.customFields && Object.keys(formData.customFields).length > 0 && (
              <div className="col-span-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Custom Fields</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                  {Object.entries(formData.customFields).map(([k, v]) => (
                    <InfoRow key={k} label={fieldLabels[k] ?? k} value={String(v)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="print:hidden">
        <CardContent className="py-5">
          <Tabs defaultValue="timeline">
            <TabsList className="mb-4 flex-wrap h-auto">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="quotes">Quotes<Cnt n={quotesCount} /></TabsTrigger>
              <TabsTrigger value="invoices">Invoices<Cnt n={invoicesCount} /></TabsTrigger>
              <TabsTrigger value="notes">Notes<Cnt n={notesCount} /></TabsTrigger>
              <TabsTrigger value="activities">Activities<Cnt n={activitiesCount} /></TabsTrigger>
            </TabsList>
            <TabsContent value="timeline">
              <RecordTimeline linkedTo={dealId!} linkedModel="Deal" />
            </TabsContent>
            <TabsContent value="quotes">
              <FinanceTab linkedModel="Deal" linkedId={dealId!} customerId={formData.customerID} view="quotes" />
            </TabsContent>
            <TabsContent value="invoices">
              <FinanceTab linkedModel="Deal" linkedId={dealId!} customerId={formData.customerID} view="invoices" />
            </TabsContent>
            <TabsContent value="notes">
              <NotesPanel linkedTo={dealId!} linkedModel="Deal" />
            </TabsContent>
            <TabsContent value="activities">
              <ActivityList linkedTo={dealId!} linkedModel="Deal" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onConfirm={() => { setConfirmOpen(false); handleDelete(); }}
        onCancel={() => setConfirmOpen(false)}
        title="Delete Deal"
        description="Delete this deal? This action cannot be undone."
      />
    </main>
  );
};

const Cnt: React.FC<{ n: number }> = ({ n }) =>
  n > 0 ? <span className="ms-1.5 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-semibold leading-none">{n}</span> : null;

const InfoRow: React.FC<{ label: string; value?: string | number | null; children?: React.ReactNode }> = ({ label, value, children }) => (
  <div className="mb-2 grid grid-cols-[160px_1fr] items-start gap-2">
    <Label className="text-sm font-medium text-foreground/60 pt-0.5">{label}</Label>
    <div className="flex items-start">
      {children ?? <p className="text-sm text-foreground">{value ?? "—"}</p>}
    </div>
  </div>
);

export default ViewDeal;
