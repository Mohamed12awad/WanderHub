import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getLeadById, convertLead, deleteLead, getNotes, getActivities } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/authContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { CircleArrowLeft, ArrowRightCircle, Edit, MoreHorizontal, Trash2, Copy, Flame, Thermometer, Snowflake } from "lucide-react";
import { AppBreadcrumb } from "@/components/common/AppBreadcrumb";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { RecordTimeline } from "@/components/common/RecordTimeline";
import { CustomFieldsView } from "@/components/common/CustomFieldsView";
import { NotesPanel } from "@/components/common/NotesPanel";
import { AttachmentsPanel } from "@/components/common/AttachmentsPanel";
import { EmailsPanel } from "@/components/common/EmailsPanel";
import { AiInsights } from "@/components/common/AiInsights";
import { ActivityList } from "@/components/Activities/ActivityList";

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

const InfoRow: React.FC<{ label: string; value?: React.ReactNode; children?: React.ReactNode }> = ({ label, value, children }) => {
  if (children == null && (value == null || value === "")) return null;
  return (
    <div className="mb-2 grid grid-cols-[150px_1fr] items-start gap-2">
      <Label className="text-sm font-medium text-foreground/60 pt-0.5">{label}</Label>
      <div className="flex items-start">
        {children ?? <p className="text-sm text-foreground">{value}</p>}
      </div>
    </div>
  );
};

export function ViewLead() {
  const { tr } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canDelete = ["admin", "super admin"].includes(user?.role ?? "");
  const [converting, setConverting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);

  const { data, isPending, isError } = useQuery({
    queryKey: ["lead", id],
    queryFn: () => getLeadById(id!),
    enabled: !!id
  });
  const lead = data?.data;

  const { data: notesData }      = useQuery({
    queryKey: ["notes", id, "Lead"],
    queryFn: () => getNotes({ linkedTo: id!, linkedModel: "Lead" }),
    enabled: !!id
  });
  const { data: activitiesData } = useQuery({
    queryKey: ["activities", id],
    queryFn: () => getActivities(id!, "Lead"),
    enabled: !!id
  });
  const notesCount      = ((notesData?.data)      as any[])?.length ?? 0;
  const activitiesCount = ((activitiesData?.data) as any[])?.length ?? 0;

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

  if (isPending) {
    return (
      <main className="p-4 space-y-4">
        <Card>
          <CardHeader className="flex flex-row justify-between">
            <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-6 w-48" /></div>
            <div className="flex gap-2"><Skeleton className="h-8 w-24" /><Skeleton className="h-8 w-20" /><Skeleton className="h-8 w-8" /></div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[0, 1].map((col) => (
                <div key={col} className="space-y-3">
                  <Skeleton className="h-4 w-28 mb-4" />
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="grid grid-cols-2 gap-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-28" /></div>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (isError || !lead) return <div className="p-4 text-destructive">{tr.common.errorLoading}</div>;

  const isConverted = lead.status === "converted";
  const rating = lead.rating ? RATING_BADGE[lead.rating] : null;
  const website = lead.website
    ? (lead.website.startsWith("http") ? lead.website : `https://${lead.website}`)
    : null;

  return (
    <main className="p-4 space-y-5">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <AppBreadcrumb crumbs={[{ label: tr.leads.title, href: "/leads" }, { label: lead.name }]} />
            <CardTitle className="flex items-center gap-3 mt-1 flex-wrap">
              <Link to="/leads"><CircleArrowLeft /></Link>
              <span className="truncate">{lead.name}</span>
              <Badge className={`${STATUS_COLORS[lead.status] ?? ""} w-fit capitalize`} variant="outline">
                {tr.leads.statuses[lead.status] ?? lead.status}
              </Badge>
              {rating && (
                <Badge variant="outline" className={`flex items-center gap-1 ${rating.className}`}>
                  {rating.icon}{rating.label}
                </Badge>
              )}
            </CardTitle>
            {(lead.jobTitle || lead.company) && (
              <p className="text-sm text-muted-foreground mt-1">
                {[lead.jobTitle, lead.company].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap shrink-0">
            {!isConverted && (
              <Button size="sm" variant="outline" className="h-8 px-4" onClick={() => setConvertOpen(true)} disabled={converting}>
                <ArrowRightCircle className="h-3.5 w-3.5 me-1" />
                {converting ? tr.common.loading : tr.leads.convertToCustomer}
              </Button>
            )}
            <Link to={`/leads/${id}/edit`}>
              <Button size="sm" className="h-8 px-4"><Edit className="h-3.5 w-3.5 me-1" />{tr.common.edit}</Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" /><span className="sr-only">More actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleClone}>
                  <Copy className="h-3.5 w-3.5 me-2" />Clone
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {canDelete ? (
                  <DropdownMenuItem onClick={() => setConfirmOpen(true)} className="text-destructive focus:text-destructive">
                    <Trash2 className="h-3.5 w-3.5 me-2" />{tr.common.delete}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem disabled>{tr.common.delete}</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
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
            <Tabs defaultValue="timeline">
              <TabsList className="mb-4 flex-wrap h-auto">
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="notes">Notes{notesCount > 0 && ` (${notesCount})`}</TabsTrigger>
                <TabsTrigger value="activities">Activities{activitiesCount > 0 && ` (${activitiesCount})`}</TabsTrigger>
                <TabsTrigger value="attachments">Attachments</TabsTrigger>
                <TabsTrigger value="emails">Emails</TabsTrigger>
                <TabsTrigger value="ai">AI</TabsTrigger>
              </TabsList>
              <TabsContent value="timeline">
                <RecordTimeline linkedTo={id} linkedModel="Lead" />
              </TabsContent>
              <TabsContent value="notes">
                <NotesPanel linkedTo={id} linkedModel="Lead" />
              </TabsContent>
              <TabsContent value="activities">
                <ActivityList linkedTo={id} linkedModel="Lead" />
              </TabsContent>
              <TabsContent value="attachments">
                <AttachmentsPanel linkedModel="Lead" linkedToId={id!} />
              </TabsContent>
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
    </main>
  );
}
