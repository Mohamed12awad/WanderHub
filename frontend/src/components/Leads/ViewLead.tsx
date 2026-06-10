import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getLeadById, convertLead, deleteLead } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/authContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoadingSpinner from "@/components/common/spinner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ArrowRightCircle, Edit, Trash2, Copy, Flame, Thermometer, Snowflake } from "lucide-react";
import { DetailPageLayout } from "@/components/common/DetailPageLayout";
import { DetailHeader, DetailMenuItem } from "@/components/common/DetailHeader";
import { RecordContextPanel } from "@/components/common/RecordContextPanel";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { CustomFieldsView } from "@/components/common/CustomFieldsView";
import { EmailsPanel } from "@/components/common/EmailsPanel";
import { AiInsights } from "@/components/common/AiInsights";
import { InfoRow } from "@/components/common/InfoRow";

const STATUS_COLORS: Record<string, string> = {
  new:         "bg-sky-500     text-white border-sky-500     dark:bg-sky-600     dark:border-sky-600",
  contacted:   "bg-violet-500  text-white border-violet-500  dark:bg-violet-600  dark:border-violet-600",
  nurturing:   "bg-blue-500    text-white border-blue-500    dark:bg-blue-600    dark:border-blue-600",
  qualified:   "bg-emerald-500 text-white border-emerald-500 dark:bg-emerald-600 dark:border-emerald-600",
  unqualified: "bg-slate-400   text-white border-slate-400   dark:bg-slate-600   dark:border-slate-600",
  converted:   "bg-amber-500   text-white border-amber-500   dark:bg-amber-600   dark:border-amber-600",
};

const RATING_BADGE: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  cold: { label: "Cold", className: "bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300",       icon: <Snowflake className="h-3 w-3" /> },
  warm: { label: "Warm", className: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300", icon: <Thermometer className="h-3 w-3" /> },
  hot:  { label: "Hot",  className: "bg-red-100 text-red-600 border-red-300 dark:bg-red-950/40 dark:text-red-300",       icon: <Flame className="h-3 w-3" /> },
};

export function ViewLead() {
  const { tr } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canDelete = (user?.permissions ?? []).some((p) => p === '*' || p === 'leads:delete');
  const [converting, setConverting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);

  const { data, isPending, isError } = useQuery({
    queryKey: ["lead", id],
    queryFn: () => getLeadById(id!),
    enabled: !!id
  });
  const lead = data?.data;

  const handleConvert = async (createDeal: boolean) => {
    if (!id) return;
    setConverting(true);
    try {
      const res = await convertLead(id, { createDeal });
      toast({ title: createDeal ? "Lead converted to contact + deal" : "Lead converted to contact" });
      setConvertOpen(false);
      queryClient.invalidateQueries({
        queryKey: ["lead", id]
      });
      navigate(`/customers/${res.data._id}`);
    } catch (err: any) {
      toast({ title: err?.response?.data?.message ?? "Failed to convert lead", variant: "destructive" });
    } finally {
      setConverting(false);
    }
  };

  const handleClone = () => {
    if (!lead) return;
    navigate("/leads/add", {
      state: {
        clone: {
          name: `Copy of ${lead.name}`,
          company: lead.company,
          jobTitle: lead.jobTitle,
          website: lead.website,
          city: lead.city,
          country: lead.country,
          source: lead.source,
          campaign: lead.campaign,
          rating: lead.rating,
          budget: lead.budget?.toString() ?? "",
          currency: lead.currency,
          notes: lead.notes,
          owner: typeof lead.owner === "object" ? lead.owner?._id : lead.owner,
          status: "new",
        },
      },
    });
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteLead(id);
      toast({ title: tr.common.deleted });
      navigate("/leads");
    } catch {
      toast({ title: tr.common.deleteFailed, variant: "destructive" });
    }
  };

  if (isPending) return <LoadingSpinner loading />;

  if (isError || !lead) return <div className="p-4 text-destructive">{tr.common.errorLoading}</div>;

  const isConverted = lead.status === "converted";
  const rating = lead.rating ? RATING_BADGE[lead.rating] : null;
  const website = lead.website
    ? (lead.website.startsWith("http") ? lead.website : `https://${lead.website}`)
    : null;

  const primaryAction = !isConverted ? (
    <Button size="sm" className="gap-1" onClick={() => setConvertOpen(true)} disabled={converting}>
      <ArrowRightCircle className="h-3.5 w-3.5" />
      {converting ? tr.common.loading : tr.leads.convertToCustomer}
    </Button>
  ) : (
    <Button size="sm" className="gap-1" onClick={() => navigate(`/leads/${id}/edit`)}>
      <Edit className="h-3.5 w-3.5" />{tr.common.edit}
    </Button>
  );

  const menuItems: DetailMenuItem[] = [];
  if (!isConverted) {
    menuItems.push({ label: tr.common.edit, icon: <Edit className="h-3.5 w-3.5 me-2" />, onClick: () => navigate(`/leads/${id}/edit`) });
  }
  menuItems.push({ label: "Clone", icon: <Copy className="h-3.5 w-3.5 me-2" />, onClick: handleClone });
  if (canDelete) {
    menuItems.push({ label: tr.common.delete, icon: <Trash2 className="h-3.5 w-3.5 me-2" />, onClick: () => setConfirmOpen(true), destructive: true, separatorBefore: true });
  }

  const header = (
    <div>
      <DetailHeader
        crumbs={[{ label: tr.leads.title, href: "/leads" }, { label: lead.name }]}
        title={lead.name}
        badges={
          <>
            <Badge className={`${STATUS_COLORS[lead.status] ?? ""} w-fit capitalize`} variant="outline">
              {tr.leads.statuses[lead.status] ?? lead.status}
            </Badge>
            {rating && (
              <Badge variant="outline" className={`flex items-center gap-1 ${rating.className}`}>
                {rating.icon}{rating.label}
              </Badge>
            )}
          </>
        }
        primaryAction={primaryAction}
        menuItems={menuItems}
      />
      {(lead.jobTitle || lead.company) && (
        <p className="text-sm text-muted-foreground mt-1">
          {[lead.jobTitle, lead.company].filter(Boolean).join(" · ")}
        </p>
      )}
    </div>
  );

  const contextPanel = id ? (
    <RecordContextPanel linkedTo={id} linkedModel="Lead" />
  ) : undefined;

  return (
    <DetailPageLayout header={header} contextPanel={contextPanel}>
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact */}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Contact</h2>
              <InfoRow label="Phone" value={lead.phone} />
              <InfoRow label="Mobile" value={lead.mobile} />
              <InfoRow label="Email">
                {lead.email ? <a href={`mailto:${lead.email}`} className="text-sm text-blue-500 hover:underline">{lead.email}</a> : undefined}
              </InfoRow>
              <InfoRow label="Website">
                {website ? <a href={website} target="_blank" rel="noreferrer" className="text-sm text-blue-500 hover:underline">{lead.website}</a> : undefined}
              </InfoRow>
              <InfoRow label="Location" value={[lead.city, lead.country].filter(Boolean).join(", ")} />
            </div>

            {/* Lead details */}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Lead Details</h2>
              <InfoRow label="Source" value={lead.source} />
              <InfoRow label="Campaign" value={lead.campaign} />
              <InfoRow label="Owner" value={lead.owner?.name} />
              <InfoRow label="Created By" value={lead.createdBy?.name} />
              <InfoRow label="Expected Close" value={lead.expectedCloseDate ? new Date(lead.expectedCloseDate).toLocaleDateString() : undefined} />
              <InfoRow label="Budget" value={lead.budget != null ? `${lead.budget.toLocaleString()} ${lead.currency ?? ""}`.trim() : undefined} />
              <InfoRow label="Created" value={new Date(lead.createdAt).toLocaleDateString()} />
              {lead.updatedBy?.name && <InfoRow label="Modified by" value={lead.updatedBy.name} />}
              {lead.updatedAt && <InfoRow label="Last updated" value={new Date(lead.updatedAt).toLocaleString()} />}
              {isConverted && (
                <InfoRow label="Converted" value={lead.convertedAt ? new Date(lead.convertedAt).toLocaleDateString() : undefined} />
              )}
              {isConverted && lead.convertedTo && (
                <InfoRow label="Contact">
                  <Link to={`/customers/${lead.convertedTo._id}`} className="text-sm text-blue-500 hover:underline">{lead.convertedTo.name}</Link>
                </InfoRow>
              )}
            </div>

            {/* Notes / lost reason full-width */}
            {(lead.lostReason || lead.notes) && (
              <div className="md:col-span-2 border-t pt-4 space-y-4">
                {lead.lostReason && (
                  <div>
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Lost Reason</h2>
                    <p className="text-sm text-destructive/80">{lead.lostReason}</p>
                  </div>
                )}
                {lead.notes && (
                  <div>
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Notes</h2>
                    <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
                  </div>
                )}
              </div>
            )}

            <CustomFieldsView module="leads" values={lead.customFields} className="md:col-span-2 border-t pt-4" />
          </div>
        </CardContent>
      </Card>

      {id && (
        <Card>
          <CardContent className="py-5">
            <Tabs defaultValue="emails">
              <TabsList className="mb-4 flex h-auto w-full justify-start gap-1 [&>button]:flex-1">
                <TabsTrigger value="emails">Emails</TabsTrigger>
                <TabsTrigger value="ai">AI</TabsTrigger>
              </TabsList>
              <TabsContent value="emails">
                <EmailsPanel linkedTo={id} linkedModel="Lead" />
              </TabsContent>
              <TabsContent value="ai">
                <AiInsights entity="leads" id={id} canScore />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onConfirm={() => { setConfirmOpen(false); handleDelete(); }}
        onCancel={() => setConfirmOpen(false)}
        title="Delete Lead"
        description="Delete this lead? This action cannot be undone."
      />

      <Dialog open={convertOpen} onOpenChange={(o) => !converting && setConvertOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convert lead</DialogTitle>
            <DialogDescription>
              A contact will be created from this lead. Do you also want to start a deal in the pipeline?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" disabled={converting} onClick={() => handleConvert(false)}>
              Contact only
            </Button>
            <Button disabled={converting} onClick={() => handleConvert(true)}>
              Contact + Deal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DetailPageLayout>
  );
}
