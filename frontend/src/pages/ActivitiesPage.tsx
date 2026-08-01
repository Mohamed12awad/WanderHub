import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getAllActivities, updateActivity, deleteActivity } from "@/utils/api";
import { Activity, ActivityType } from "@/types/types";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { CheckCircle2, Circle, ExternalLink, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { GenericTable } from "@/components/common/GenericTable";
import { ActivityDetailDialog } from "@/components/Activities/ActivityDetailDialog";
import { useToast } from "@/components/ui/use-toast";

const TYPE_EMOJIS: Record<ActivityType, string> = {
  call: "📞",
  meeting: "🤝",
  task: "✅",
  note: "📝",
  email: "📧",
};

const ENTITY_ROUTES: Record<string, string> = {
  Customer: "/customers",
  Deal: "/deals",
  Project: "/projects",
  Lead: "/leads",
  Supplier: "/procurement/suppliers",
  PurchaseOrder: "/procurement/purchase-orders",
  Invoice: "/finance/invoices",
  Quote: "/finance/quotes",
};

const ACTIVITY_HEADERS = ["Type", "Activity", "Linked To", "Date", "Status"];

const ACTIVITY_TYPE_FILTER = [
  {
    label: "Type",
    field: "type",
    type: "select" as const,
    options: (["call", "meeting", "task", "note", "email"] as ActivityType[]).map((t) => ({
      label: `${TYPE_EMOJIS[t]} ${t}`,
      value: t,
    })),
  },
];

function entityLink(a: Activity): { label: string; href: string } | null {
  if (a.customer) return { label: a.customer.name, href: `/customers/${a.customer._id}` };
  if (a.deal) return { label: a.deal.title, href: `/deals/${a.deal._id}` };
  if (a.project) return { label: a.project.name, href: `/projects/${a.project._id}` };
  if (a.linkedName) {
    const base = ENTITY_ROUTES[a.linkedModel];
    return { label: a.linkedName, href: base && a.linkedTo ? `${base}/${a.linkedTo}` : "#" };
  }
  const base = ENTITY_ROUTES[a.linkedModel];
  if (base && a.linkedTo) return { label: a.linkedModel, href: `${base}/${a.linkedTo}` };
  return null;
}

export function ActivitiesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [detail, setDetail] = useState<Activity | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["activities-all"] });

  const toggleMut = useMutation({
    mutationFn: (a: Activity) =>
      updateActivity(a._id, {
        status: a.status === "completed" ? "pending" : "completed",
      }),
    onSuccess: invalidate,
    onError: () => toast({ title: "Failed to update.", variant: "destructive" }),
  });

  return (
    <>
      <GenericTable<Activity>
        queryKey="activities-all"
        fetchData={({ page, limit, q, filters }) => getAllActivities({ page, limit, q, ...filters })}
        deleteData={deleteActivity}
        headers={ACTIVITY_HEADERS}
        title="Activities"
        description="Calls, meetings, emails and notes logged across the workspace."
        emptyMessage="No activities found."
        module="activities"
        filterConfigs={ACTIVITY_TYPE_FILTER}
        quickStatusFilter={{
          field: "status",
          options: [
            { value: "pending", label: "Pending" },
            { value: "completed", label: "Completed" },
          ],
        }}
        renderRow={(a, handleDelete) => {
          const entity = entityLink(a);
          const done = a.status === "completed";
          return (
            <TableRow
              key={a._id}
              className={cn("cursor-pointer hover:bg-muted/40", done && "opacity-70")}
              onClick={() => { setDetail(a); setDetailOpen(true); }}
            >
              <TableCell>
                <span className="inline-flex items-center gap-1.5 capitalize text-sm">
                  <span className="text-base">{TYPE_EMOJIS[a.type]}</span>
                  {a.type}
                </span>
              </TableCell>
              <TableCell dir="auto" className="max-w-[22rem]">
                <span className={cn("font-medium", done && "line-through text-muted-foreground")}>
                  {a.title}
                </span>
                {a.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{a.description}</p>
                )}
              </TableCell>
              <TableCell dir="auto">
                {entity ? (
                  <Link
                    to={entity.href}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    {entity.label}
                    <ExternalLink className="h-2.5 w-2.5" />
                  </Link>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground text-xs tabular-nums whitespace-nowrap">
                {format(new Date(a.date), "dd MMM yyyy")}
                {a.createdBy && <span className="block text-[10px]">by {a.createdBy.name}</span>}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] capitalize",
                    done ? "border-emerald-500 text-emerald-600" : "border-amber-500 text-amber-600",
                  )}
                >
                  {a.status}
                </Badge>
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-0.5">
                  <Button
                    size="icon"
                    variant="ghost"
                    className={cn("h-7 w-7", done && "text-emerald-600")}
                    title={done ? "Mark pending" : "Mark done"}
                    onClick={() => toggleMut.mutate(a)}
                    disabled={toggleMut.isPending}
                  >
                    {done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    title="Delete"
                    onClick={() => handleDelete(a._id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        }}
      />

      <ActivityDetailDialog
        activity={detail}
        open={detailOpen}
        onOpenChange={(v) => {
          setDetailOpen(v);
          if (!v) setDetail(null);
        }}
        invalidateKeys={["activities-all"]}
      />
    </>
  );
}

export default ActivitiesPage;
