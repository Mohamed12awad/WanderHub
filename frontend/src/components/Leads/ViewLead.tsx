import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "react-query";
import { getLeadById, convertLead, deleteLead } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CircleArrowLeft, ArrowRightCircle, Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

const STATUS_COLORS: Record<string, string> = {
  new:         "bg-sky-500     text-white border-sky-500",
  contacted:   "bg-violet-500  text-white border-violet-500",
  qualified:   "bg-emerald-500 text-white border-emerald-500",
  unqualified: "bg-slate-400   text-white border-slate-400",
  converted:   "bg-amber-500   text-white border-amber-500",
};

export function ViewLead() {
  const { tr } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [converting, setConverting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data, isLoading, isError } = useQuery(["lead", id], () => getLeadById(id!), { enabled: !!id });
  const lead = data?.data;

  const handleConvert = async () => {
    if (!id) return;
    setConverting(true);
    try {
      const res = await convertLead(id);
      toast({ title: "Lead converted to customer successfully" });
      queryClient.invalidateQueries(["lead", id]);
      navigate(`/customers/${res.data._id}`);
    } catch (err: any) {
      toast({ title: err?.response?.data?.message ?? "Failed to convert lead", variant: "destructive" });
    } finally {
      setConverting(false);
    }
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

  if (isLoading) return <div className="p-6 text-muted-foreground">{tr.common.loading}</div>;
  if (isError || !lead) return <div className="p-6 text-destructive">{tr.common.errorLoading}</div>;

  const isConverted = lead.status === "converted";

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/leads" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <CircleArrowLeft className="h-4 w-4" />
          {tr.leads.title}
        </Link>
        <div className="flex gap-2">
          {!isConverted && (
            <Button size="sm" variant="outline" onClick={handleConvert} disabled={converting}>
              <ArrowRightCircle className="h-4 w-4 mr-1" />
              {converting ? tr.common.loading : tr.leads.convertToCustomer}
            </Button>
          )}
          {isConverted && (
            <Badge variant="outline" className="bg-amber-500 text-white border-amber-500">
              {tr.leads.alreadyConverted}
            </Badge>
          )}
          <Link to={`/leads/${id}/edit`}>
            <Button size="sm" variant="outline">
              <Pencil className="h-4 w-4 mr-1" />
              {tr.common.edit}
            </Button>
          </Link>
          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="h-4 w-4 mr-1" />
            {tr.common.delete}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{lead.name}</CardTitle>
            <Badge variant="outline" className={STATUS_COLORS[lead.status] ?? ""}>
              {tr.leads.statuses[lead.status] ?? lead.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {lead.phone && (
              <><dt className="text-muted-foreground">Phone</dt><dd>{lead.phone}</dd></>
            )}
            {lead.mobile && (
              <><dt className="text-muted-foreground">Mobile</dt><dd>{lead.mobile}</dd></>
            )}
            {lead.email && (
              <><dt className="text-muted-foreground">Email</dt><dd>{lead.email}</dd></>
            )}
            {lead.source && (
              <><dt className="text-muted-foreground">Source</dt><dd>{lead.source}</dd></>
            )}
            {lead.owner && (
              <><dt className="text-muted-foreground">Owner</dt><dd>{lead.owner.name}</dd></>
            )}
            {lead.createdBy && (
              <><dt className="text-muted-foreground">Created By</dt><dd>{lead.createdBy.name}</dd></>
            )}
            <dt className="text-muted-foreground">Created</dt>
            <dd>{new Date(lead.createdAt).toLocaleDateString()}</dd>
            {isConverted && lead.convertedAt && (
              <>
                <dt className="text-muted-foreground">Converted</dt>
                <dd>{new Date(lead.convertedAt).toLocaleDateString()}</dd>
              </>
            )}
            {isConverted && lead.convertedTo && (
              <>
                <dt className="text-muted-foreground">Customer</dt>
                <dd>
                  <Link to={`/customers/${lead.convertedTo._id}`} className="text-primary hover:underline">
                    {lead.convertedTo.name}
                  </Link>
                </dd>
              </>
            )}
          </dl>
          {lead.notes && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-1">Notes</p>
              <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={confirmOpen}
        onConfirm={() => { setConfirmOpen(false); handleDelete(); }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
