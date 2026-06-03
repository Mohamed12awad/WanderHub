import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { getApprovalSteps } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
export function ApprovalStepsTimeline({ entityType, entityId }: { entityType: string; entityId: string }) {
  const { data } = useQuery({
    queryKey: ["approval-steps", entityType, entityId],
    queryFn: () => getApprovalSteps(entityType, entityId),
    enabled: !!entityId,
  });
  const steps: Step[] = data?.data ?? [];
  if (steps.length === 0) return null;

  return (
    <Card className="shadow-sm border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Approval chain</CardTitle>
      </CardHeader>
      <CardContent>
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
                    {new Date(s.actedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

export default ApprovalStepsTimeline;
