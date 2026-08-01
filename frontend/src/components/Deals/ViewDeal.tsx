import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { getDealById, deleteDeal, getQuotes, getInvoices } from "@/utils/api";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Edit, FileText, ArrowRight, Trash2, Copy, FolderKanban } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import { useAuth } from "@/contexts/authContext";
import { Button } from "../ui/button";
import { EmailsPanel } from "@/components/common/EmailsPanel";
import { AiInsights } from "@/components/common/AiInsights";
import FinanceTab from "@/components/Finance/FinanceTab";
import { DetailPageLayout } from "@/components/common/DetailPageLayout";
import { DetailHeader, DetailMenuItem } from "@/components/common/DetailHeader";
import { RecordContextPanel } from "@/components/common/RecordContextPanel";
import LoadingSpinner from "@/components/common/spinner";
import { useToast } from "@/components/ui/use-toast";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { InfoRow } from "@/components/common/InfoRow";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { formatCurrency } = useLanguage();
  const { id: dealId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const canDelete = (user?.permissions ?? []).some((p) => p === '*' || p === 'deals:delete');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: dealData, isPending, error } = useQuery({
    queryKey: ["deals", dealId],
    queryFn: () => getDealById(dealId!)
  });
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

  const { data: quotesData }     = useQuery({
    queryKey: ["quotes",   { deal: dealId }],
    queryFn: () => getQuotes({ deal: dealId }),
    enabled: !!dealId
  });
  const { data: invoicesData }   = useQuery({
    queryKey: ["invoices", { deal: dealId }],
    queryFn: () => getInvoices({ deal: dealId }),
    enabled: !!dealId
  });

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

  const handleCreateProject = () => {
    if (!formData) return;
    navigate("/projects/new", {
      state: {
        clone: {
          name: formData.title,
          description: formData.notes ?? "",
          customer: formData.customerID,
          deal: dealId,
          budget: String(formData.price),
          currency: formData.currency,
          priority: formData.priority,
        },
      },
    });
  };

  if (isPending || !formData) return <LoadingSpinner loading />;

  if (error) return <div className="p-4">Error loading deal</div>;

  const nextStep = NEXT_STEPS[formData.status];
  const linkedProject = dealData?.data?.deal?.project;

  const menuItems: DetailMenuItem[] = [
    { label: "New Quote", icon: <FileText className="h-3.5 w-3.5 me-2" />, onClick: () => navigate(`/finance/quotes/new?deal=${dealId}&customer=${formData.customerID}`) },
    { label: "Clone", icon: <Copy className="h-3.5 w-3.5 me-2" />, onClick: handleClone },
    linkedProject
      ? { label: "View Project", icon: <FolderKanban className="h-3.5 w-3.5 me-2" />, onClick: () => navigate(`/projects/${linkedProject._id}`) }
      : { label: "Create Project", icon: <FolderKanban className="h-3.5 w-3.5 me-2" />, onClick: handleCreateProject },
  ];
  if (canDelete) {
    menuItems.push({ label: "Delete", icon: <Trash2 className="h-3.5 w-3.5 me-2" />, onClick: () => setConfirmOpen(true), destructive: true, separatorBefore: true });
  }

  const header = (
    <div className="print:hidden">
      <DetailHeader
        crumbs={[{ label: "Deals", href: "/deals" }, { label: formData.title }]}
        title={formData.title}
        badges={
          <Badge className={`${STATUS_COLORS[formData.status] ?? ""} w-fit capitalize`} variant="outline">
            {formData.status}
          </Badge>
        }
        primaryAction={
          <Button size="sm" className="gap-1" onClick={() => navigate(`/deals/${dealId}/edit`)}>
            <Edit className="h-3.5 w-3.5" />Edit
          </Button>
        }
        menuItems={menuItems}
      />
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
  );

  const contextPanel = (
    <RecordContextPanel linkedTo={dealId!} linkedModel="Deal" />
  );

  return (
    <DetailPageLayout header={header} contextPanel={contextPanel}>
      <Card>
        <CardContent className="pt-6">
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
                  <p className="text-base font-semibold tabular-nums">{formatCurrency(formData.price, formData.currency)}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Invoiced</p>
                  <p className="text-base font-semibold tabular-nums text-foreground">{formatCurrency(invoicedTotal, formData.currency)}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Collected</p>
                  <p className="text-base font-semibold tabular-nums text-emerald-600">{formatCurrency(invoicesPaid, formData.currency)}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Outstanding</p>
                  <p className={`text-base font-semibold tabular-nums ${invoicesOutstanding > 0 ? "text-red-500" : "text-emerald-600"}`}>{formatCurrency(invoicesOutstanding, formData.currency)}</p>
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

      <Card>
        <CardContent className="py-5">
          <Tabs defaultValue="quotes">
            <TabsList className="mb-4 flex h-auto w-full justify-start gap-1 overflow-x-auto [&>button]:shrink-0">
              <TabsTrigger value="quotes">Quotes{quotesCount > 0 && ` (${quotesCount})`}</TabsTrigger>
              <TabsTrigger value="invoices">Invoices{invoicesCount > 0 && ` (${invoicesCount})`}</TabsTrigger>
              <TabsTrigger value="emails">Emails</TabsTrigger>
              <TabsTrigger value="ai">AI</TabsTrigger>
            </TabsList>
            <TabsContent value="quotes">
              <FinanceTab linkedModel="Deal" linkedId={dealId!} customerId={formData.customerID} view="quotes" />
            </TabsContent>
            <TabsContent value="invoices">
              <FinanceTab linkedModel="Deal" linkedId={dealId!} customerId={formData.customerID} view="invoices" />
            </TabsContent>
            <TabsContent value="emails">
              <EmailsPanel linkedTo={dealId!} linkedModel="Deal" />
            </TabsContent>
            <TabsContent value="ai">
              <AiInsights entity="deals" id={dealId!} canScore />
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
    </DetailPageLayout>
  );
};

export default ViewDeal;
