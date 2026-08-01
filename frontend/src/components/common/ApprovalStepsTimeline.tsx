import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { getApprovalSteps } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";

interface Step {
  _id: string;
  sequence: number;
  approverRoles: string[];
  status: "pending" | "approved" | "rejected";
  actedAt?: string | null;
  comment?: string | null;
}

const ICON = {
  approved: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
  rejected: <XCircle className="h-4 w-4 text-destructive" />,
  pending: <Clock className="h-4 w-4 text-amber-500" />,
};

/**
 * Renders an entity's multi-step approval chain. Returns nothing when no chain
 * is configured (single-approver documents), so it's safe to drop into any
 * detail view.
 */
/** Final approval outcome for documents that use simple (non-chain) approval. */
export interface ApprovalOutcome {
  status: "pending" | "approved" | "rejected";
  actorName?: string | null;
  actedAt?: string | null;
  reason?: string | null;
}

export function ApprovalStepsTimeline({
  entityType,
  entityId,
  embedded = false,
  outcome,
}: {
  entityType: string;
  entityId: string;
  /** When true, render the bare step list (no Card) for use inside a panel/tab. */
  embedded?: boolean;
  /**
   * Fallback shown when no multi-step chain exists. Lets simple approve/reject
   * documents still surface their outcome here instead of a dead-end message.
   */
  outcome?: ApprovalOutcome;
}) {
  const { formatDate } = useLanguage();
  const { data } = useQuery({
    queryKey: ["approval-steps", entityType, entityId],
    queryFn: () => getApprovalSteps(entityType, entityId),
    enabled: !!entityId,
  });
  const steps: Step[] = data?.data ?? [];
  if (steps.length === 0) {
    const fallback = outcome ? (
      <div className="flex items-start gap-3 px-1 py-2">
        <span className="mt-0.5">{ICON[outcome.status]}</span>
        <div className="flex-1">
          <p className="text-sm font-medium capitalize">{outcome.status}</p>
          {outcome.status !== "pending" && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {outcome.status === "rejected" ? "Rejected" : "Approved"}
              {outcome.actorName ? ` by ${outcome.actorName}` : ""}
              {outcome.actedAt ? ` · ${formatDate(outcome.actedAt, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""}
            </p>
          )}
          {outcome.status === "pending" && (
            <p className="text-xs text-muted-foreground mt-0.5">Awaiting approval.</p>
          )}
          {outcome.reason && <p className="text-xs text-muted-foreground mt-0.5">{outcome.reason}</p>}
        </div>
      </div>
    ) : (
      <p className="px-1 py-2 text-sm text-muted-foreground">No approval chain configured.</p>
    );
    return embedded ? fallback : null;
  }

  const list = (
    <ol className="space-y-3">
          {steps.map((s) => (
            <li key={s._id} className="flex items-start gap-3">
              <span className="mt-0.5">{ICON[s.status]}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">Step {s.sequence + 1}</span>
                  <Badge variant="outline" className="capitalize text-xs">{s.status}</Badge>
                  {s.approverRoles?.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {s.approverRoles.join(", ")}
                    </span>
                  )}
                </div>
                {s.comment && <p className="text-xs text-muted-foreground mt-0.5">{s.comment}</p>}
                {s.actedAt && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {formatDate(s.actedAt, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </p>
                )}
              </div>
            </li>
          ))}
    </ol>
  );

  if (embedded) return list;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Approval chain</CardTitle>
      </CardHeader>
      <CardContent>{list}</CardContent>
    </Card>
  );
}

export default ApprovalStepsTimeline;
