import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Circle, Pencil, Trash2, ExternalLink, X, Save } from "lucide-react";
import { updateActivity, deleteActivity, getUsers } from "@/utils/api";
import { Activity, ActivityType } from "@/types/types";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useLanguage } from "@/contexts/LanguageContext";

const TYPE_EMOJIS: Record<ActivityType, string> = {
  call: "📞", meeting: "🤝", task: "✅", note: "📝", email: "📧",
};

const TYPE_BG: Record<ActivityType, string> = {
  call:    "bg-blue-50   border-blue-200   dark:bg-blue-950/30",
  meeting: "bg-purple-50 border-purple-200 dark:bg-purple-950/30",
  task:    "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30",
  note:    "bg-slate-50  border-slate-200  dark:bg-slate-900/30",
  email:   "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30",
};

const ENTITY_ROUTES: Record<string, string> = {
  Customer: "/customers", Deal: "/deals", Project: "/projects",
  Lead: "/leads", Supplier: "/procurement/suppliers",
  PurchaseOrder: "/procurement/purchase-orders",
  Invoice: "/finance/invoices", Quote: "/finance/quotes",
};

// Human-readable module names for the linked-record chip.
const MODULE_LABEL: Record<string, string> = {
  Customer: "Customer", Deal: "Deal", Project: "Project", Lead: "Lead",
  Supplier: "Supplier", PurchaseOrder: "Purchase Order",
  Invoice: "Invoice", Quote: "Quote",
};

function linkedEntityPath(a: Activity): { module: string; label: string; href: string } | null {
  if (a.customer) return { module: "Customer", label: a.customer.name, href: `/customers/${a.customer._id}` };
  if (a.deal)     return { module: "Deal",     label: a.deal.title,    href: `/deals/${a.deal._id}` };
  if (a.project)  return { module: "Project",  label: a.project.name,  href: `/projects/${a.project._id}` };
  const base = ENTITY_ROUTES[a.linkedModel];
  if (base && a.linkedTo) {
    return { module: MODULE_LABEL[a.linkedModel] ?? a.linkedModel, label: a.linkedName ?? "", href: `${base}/${a.linkedTo}` };
  }
  return null;
}

interface Props {
  activity: Activity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Query key(s) to invalidate after mutations — pass the calendar key or entity key */
  invalidateKeys?: string[];
}

export function ActivityDetailDialog({ activity, open, onOpenChange, invalidateKeys = [] }: Props) {
  const { formatDate } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: usersData } = useQuery({ queryKey: ["users-all"], queryFn: () => getUsers() });
  const users: { _id: string; name: string }[] = usersData?.data?.data ?? usersData?.data ?? [];

  // edit form state
  const [title,       setTitle]       = useState("");
  const [date,        setDate]        = useState("");
  const [type,        setType]        = useState<ActivityType>("call");
  const [status,      setStatus]      = useState<"pending" | "completed">("pending");
  const [assignedTo,  setAssignedTo]  = useState<string>("");
  const [deleteOpen,  setDeleteOpen]  = useState(false);

  const invalidate = () => {
    // Invalidate the passed keys (e.g. "activities-calendar" invalidates the array key starting with that string)
    invalidateKeys.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
    // Always re-fetch the entity's own activities list too
    if (activity) queryClient.invalidateQueries({
      queryKey: ["activities", activity.linkedTo]
    });
  };

  const toggleMut = useMutation({
    mutationFn: (a: Activity) => updateActivity(a._id, {
      status: a.status === "completed" ? "pending" : "completed",
    } as any),

    onSuccess: () => {
      invalidate();
      toast({ title: "Activity updated." });
      onOpenChange(false);
    },

    onError: () => { toast({ title: "Failed to update.", variant: "destructive" }); }
  });

  const saveMut = useMutation({
    mutationFn: () => updateActivity(activity!._id, {
      title, date, type, status, ...(assignedTo ? { assignedTo } : {}),
    } as any),

    onSuccess: () => {
      invalidate();
      setEditing(false);
      toast({ title: "Activity saved." });
    },

    onError: () => { toast({ title: "Failed to save.", variant: "destructive" }); }
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteActivity(activity!._id),

    onSuccess: () => {
      invalidate();
      onOpenChange(false);
      toast({ title: "Activity deleted." });
    },

    onError: () => { toast({ title: "Failed to delete.", variant: "destructive" }); }
  });

  if (!activity) return null;

  const startEdit = () => {
    setTitle(activity.title);
    setDate(activity.date.slice(0, 10));
    setType(activity.type);
    setStatus(activity.status as "pending" | "completed");
    setAssignedTo(activity.assignedTo?._id ?? "");
    setEditing(true);
  };

  const entity = linkedEntityPath(activity);
  const isDone = activity.status === "completed";

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => { if (!v) setEditing(false); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden">
        {/* Coloured header strip */}
        <div className={cn("px-5 pt-5 pb-4 border-b", TYPE_BG[activity.type] ?? "bg-muted/20")}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <span className="text-xl">{TYPE_EMOJIS[activity.type]}</span>
              {editing ? (
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-7 text-sm font-semibold bg-white/70 dark:bg-black/20"
                  autoFocus
                />
              ) : (
                <span className={cn("leading-tight", isDone && "line-through text-muted-foreground")}>
                  {activity.title}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="outline" className="capitalize text-[11px]">{activity.type}</Badge>
            <Badge
              variant="outline"
              className={cn("text-[11px] capitalize", isDone
                ? "border-emerald-500 text-emerald-600"
                : "border-amber-500 text-amber-600")}
            >
              {activity.status}
            </Badge>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Related record — module · name (clickable) */}
          {entity && (
            <div className="grid grid-cols-[80px_1fr] items-center gap-2">
              <Label className="text-xs text-muted-foreground">Related</Label>
              <div className="flex items-center gap-1.5 text-sm min-w-0">
                <span className="text-muted-foreground shrink-0">{entity.module}</span>
                <span className="text-muted-foreground/50 shrink-0">·</span>
                <Link
                  to={entity.href}
                  onClick={() => onOpenChange(false)}
                  className="inline-flex items-center gap-1 text-primary hover:underline font-medium truncate"
                >
                  <span className="truncate">{entity.label || "Open record"}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </Link>
              </div>
            </div>
          )}

          {/* Date */}
          <div className="grid grid-cols-[80px_1fr] items-center gap-2">
            <Label className="text-xs text-muted-foreground">Date</Label>
            {editing ? (
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-7 text-sm" />
            ) : (
              <span className="text-sm">{formatDate(activity.date, { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}</span>
            )}
          </div>

          {/* Type (edit only) */}
          {editing && (
            <div className="grid grid-cols-[80px_1fr] items-center gap-2">
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as ActivityType)}>
                <SelectTrigger className="h-7 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["call", "meeting", "task", "note", "email"] as ActivityType[]).map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {TYPE_EMOJIS[t]} {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Status (edit only) */}
          {editing && (
            <div className="grid grid-cols-[80px_1fr] items-center gap-2">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select key={status} value={status} onValueChange={(v) => setStatus(v as "pending" | "completed")}>
                <SelectTrigger className="h-7 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Assigned to (edit only) */}
          {editing && (
            <div className="grid grid-cols-[80px_1fr] items-center gap-2">
              <Label className="text-xs text-muted-foreground">Assigned</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="h-7 text-sm">
                  <SelectValue placeholder="Select a user…" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Created / assigned */}
          {(activity.createdBy || activity.assignedTo) && (
            <div className="grid grid-cols-[80px_1fr] items-start gap-2">
              <Label className="text-xs text-muted-foreground">People</Label>
              <div className="text-xs text-muted-foreground space-y-0.5">
                {activity.createdBy  && <div>Created by {activity.createdBy.name}</div>}
                {activity.assignedTo && <div>Assigned to {activity.assignedTo.name}</div>}
              </div>
            </div>
          )}
        </div>

        {/* Action footer */}
        <div className="px-5 pb-5 flex items-center justify-between gap-2 border-t pt-4">
          <div className="flex items-center gap-2">
            {!isDone && (
              <Button
                size="sm" variant="outline"
                className="gap-1.5 h-8"
                onClick={() => toggleMut.mutate(activity)}
                disabled={toggleMut.isPending}
              >
                <Circle className="h-3.5 w-3.5" />
                Mark done
              </Button>
            )}

            {!editing && (
              <Button size="sm" variant="ghost" className="gap-1.5 h-8" onClick={startEdit}>
                <Pencil className="h-3.5 w-3.5" />Edit
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Button size="sm" variant="ghost" className="h-8 gap-1" onClick={() => setEditing(false)}>
                  <X className="h-3.5 w-3.5" />Cancel
                </Button>
                <Button size="sm" className="h-8 gap-1" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                  <Save className="h-3.5 w-3.5" />{saveMut.isPending ? "Saving…" : "Save"}
                </Button>
              </>
            ) : (
              <Button
                size="sm" variant="ghost"
                className="h-8 gap-1 text-destructive hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
                disabled={deleteMut.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />Delete
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
    <ConfirmDialog
      open={deleteOpen}
      onConfirm={() => {
        setDeleteOpen(false);
        deleteMut.mutate();
      }}
      onCancel={() => setDeleteOpen(false)}
      title="Delete Activity"
      description="Delete this activity? This action cannot be undone."
    />
    </>
  );
}
