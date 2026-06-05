import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getActivities, updateActivity, deleteActivity } from "@/utils/api";
import { Activity, ActivityType } from "@/types/types";
import { format } from "date-fns";
import { CheckCircle2, Circle, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActivityDialog } from "./ActivityDialog";
import { ActivityDetailDialog } from "./ActivityDetailDialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface ActivityListProps {
  linkedTo: string;
  linkedModel: "Customer" | "Deal" | "Lead" | "Project" | "Supplier" | "PurchaseOrder" | "Invoice" | "Quote" | "SalesOrder";
}

const TYPE_ICONS: Record<ActivityType, string> = {
  call: "📞", meeting: "🤝", task: "✅", note: "📝", email: "📧",
};

const TYPE_BORDER: Record<ActivityType, string> = {
  call:    "border-l-blue-400",
  meeting: "border-l-purple-400",
  task:    "border-l-yellow-400",
  note:    "border-l-slate-300",
  email:   "border-l-emerald-400",
};

export const ActivityList: React.FC<ActivityListProps> = ({ linkedTo, linkedModel }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [detail, setDetail]     = useState<Activity | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data, isPending } = useQuery({
    queryKey: ["activities", linkedTo],
    queryFn: () => getActivities(linkedTo, linkedModel),
    enabled: !!linkedTo
  });

  const toggleMutation = useMutation({
    mutationFn: (activity: Activity) => updateActivity(activity._id, {
      status: activity.status === "completed" ? "pending" : "completed",
    } as any),

    onSuccess: () => queryClient.invalidateQueries({
      queryKey: ["activities", linkedTo]
    }),

    onError:   () => { toast({ title: "Failed to update.", variant: "destructive" }); }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteActivity,

    onSuccess: () => queryClient.invalidateQueries({
      queryKey: ["activities", linkedTo]
    }),

    onError:   () => { toast({ title: "Failed to delete.", variant: "destructive" }); }
  });

  const activities: Activity[] = data?.data ?? [];

  const openDetail = (a: Activity) => { setDetail(a); setDetailOpen(true); };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Activities</h2>
        <ActivityDialog linkedTo={linkedTo} linkedModel={linkedModel} />
      </div>
      {isPending && <p className="text-sm text-muted-foreground">Loading activities…</p>}
      {!isPending && activities.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
          No activities yet. Log a call, meeting, or task to get started.
        </p>
      )}
      <ul className="space-y-2">
        {activities.map((activity) => (
          <li
            key={activity._id}
            className={cn(
              "flex items-start gap-0 border-l-4 rounded-r-lg border rounded-lg transition-colors cursor-pointer hover:bg-muted/30",
              TYPE_BORDER[activity.type] ?? "border-l-slate-300",
              activity.status === "completed" && "opacity-70",
            )}
            onClick={() => openDetail(activity)}
            title="Click to view / edit"
          >
            <div className="flex-1 min-w-0 p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl shrink-0">{TYPE_ICONS[activity.type]}</span>
                <span className={cn(
                  "font-medium text-sm",
                  activity.status === "completed" && "line-through text-muted-foreground",
                )}>
                  {activity.title}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] capitalize",
                    activity.status === "completed"
                      ? "border-emerald-500 text-emerald-600"
                      : "border-amber-500 text-amber-600",
                  )}
                >
                  {activity.status}
                </Badge>
              </div>
              {activity.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{activity.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(new Date(activity.date), "dd MMM yyyy")}
                {activity.createdBy && ` · by ${activity.createdBy.name}`}
              </p>
            </div>

            {/* Quick-action column */}
            <div className="flex flex-col gap-0.5 p-2 shrink-0" onClick={(e) => e.stopPropagation()}>
              <Button
                size="icon" variant="ghost" className={cn("h-7 w-7", activity.status === "completed" && "text-emerald-600")}
                title={activity.status === "completed" ? "Mark as pending" : "Mark as done"}
                onClick={() => toggleMutation.mutate(activity)}
              >
                {activity.status === "completed"
                  ? <CheckCircle2 className="h-4 w-4" />
                  : <Circle className="h-4 w-4 text-muted-foreground" />}
              </Button>
              <Button
                size="icon" variant="ghost" className="h-7 w-7"
                title="Edit"
                onClick={() => openDetail(activity)}
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
              <Button
                size="icon" variant="ghost"
                className="h-7 w-7 text-destructive hover:text-destructive"
                title="Delete"
                onClick={() => { if (confirm("Delete this activity?")) deleteMutation.mutate(activity._id); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <ActivityDetailDialog
        activity={detail}
        open={detailOpen}
        onOpenChange={(v) => { setDetailOpen(v); if (!v) setDetail(null); }}
        invalidateKeys={[`activities-${linkedTo}`]}
      />
    </div>
  );
};

// needed for TSX without explicit import
import React from "react";
