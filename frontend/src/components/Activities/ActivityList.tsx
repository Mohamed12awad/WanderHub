import React from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { getActivities, updateActivity, deleteActivity } from "@/utils/api";
import { Activity, ActivityType } from "@/types/types";
import { format } from "date-fns";
import { Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActivityDialog } from "./ActivityDialog";

interface ActivityListProps {
  linkedTo: string;
  linkedModel: "Customer" | "Deal";
}

const TYPE_ICONS: Record<ActivityType, string> = {
  call: "📞",
  meeting: "🤝",
  task: "✅",
  note: "📝",
  email: "📧",
};

const TYPE_COLORS: Record<ActivityType, string> = {
  call: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  meeting: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  task: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  note: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  email: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

export const ActivityList: React.FC<ActivityListProps> = ({
  linkedTo,
  linkedModel,
}) => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(
    ["activities", linkedTo],
    () => getActivities(linkedTo, linkedModel),
    { enabled: !!linkedTo }
  );

  const toggleMutation = useMutation(
    (activity: Activity) =>
      updateActivity(activity._id, {
        status: activity.status === "completed" ? "pending" : "completed",
      }),
    { onSuccess: () => queryClient.invalidateQueries(["activities", linkedTo]) }
  );

  const deleteMutation = useMutation(deleteActivity, {
    onSuccess: () => queryClient.invalidateQueries(["activities", linkedTo]),
  });

  const activities: Activity[] = data?.data ?? [];

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Activities</h2>
        <ActivityDialog linkedTo={linkedTo} linkedModel={linkedModel} />
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading activities...</p>
      )}

      {!isLoading && activities.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
          No activities yet. Log a call, meeting, or task to get started.
        </p>
      )}

      <ul className="space-y-2">
        {activities.map((activity) => (
          <li
            key={activity._id}
            className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
              activity.status === "completed"
                ? "bg-muted/50 opacity-70"
                : "bg-background"
            }`}
          >
            <span className="text-xl mt-0.5 flex-shrink-0">
              {TYPE_ICONS[activity.type]}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`font-medium text-sm ${
                    activity.status === "completed" ? "line-through text-muted-foreground" : ""
                  }`}
                >
                  {activity.title}
                </span>
                <Badge
                  variant="outline"
                  className={`text-xs capitalize ${TYPE_COLORS[activity.type]}`}
                >
                  {activity.type}
                </Badge>
              </div>
              {activity.description && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {activity.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(new Date(activity.date), "dd MMM yyyy")}
                {activity.createdBy && ` · by ${activity.createdBy.name}`}
              </p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                title={
                  activity.status === "completed"
                    ? "Mark as pending"
                    : "Mark as done"
                }
                onClick={() => toggleMutation.mutate(activity)}
              >
                <Check
                  className={`h-4 w-4 ${
                    activity.status === "completed"
                      ? "text-green-500"
                      : "text-muted-foreground"
                  }`}
                />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => deleteMutation.mutate(activity._id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
