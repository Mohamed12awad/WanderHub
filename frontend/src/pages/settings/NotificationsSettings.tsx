import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell } from "lucide-react";
import { getNotificationPreferences, updateNotificationPreferences } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";

type NotifKey =
  | "task_assigned" | "deal_assigned" | "lead_assigned"
  | "approval_requested" | "approval_approved" | "approval_rejected"
  | "invoice_overdue" | "bill_overdue";

type Prefs = Record<NotifKey, { inApp: boolean; email: boolean }>;

const NOTIFICATION_GROUPS: { label: string; events: { key: NotifKey; label: string }[] }[] = [
  {
    label: "Tasks & CRM",
    events: [
      { key: "task_assigned",  label: "Task assigned to you" },
      { key: "deal_assigned",  label: "Deal assigned to you" },
      { key: "lead_assigned",  label: "Lead assigned to you" },
    ],
  },
  {
    label: "Approvals",
    events: [
      { key: "approval_requested", label: "Approval requested from you" },
      { key: "approval_approved",  label: "Your request was approved" },
      { key: "approval_rejected",  label: "Your request was rejected" },
    ],
  },
  {
    label: "Finance",
    events: [
      { key: "invoice_overdue", label: "Invoice is overdue" },
      { key: "bill_overdue",    label: "Vendor bill is overdue" },
    ],
  },
];

const ALL_KEYS: NotifKey[] = NOTIFICATION_GROUPS.flatMap((g) => g.events.map((e) => e.key));

function defaultPrefs(): Prefs {
  return Object.fromEntries(ALL_KEYS.map((k) => [k, { inApp: true, email: true }])) as Prefs;
}

export default function NotificationsSettings() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getNotificationPreferences()
      .then((res) => {
        if (res.data) {
          setPrefs((p) => ({ ...p, ...res.data }));
        }
      })
      .catch(() => toast({ title: "Failed to load preferences.", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [toast]);

  const toggle = (key: NotifKey, channel: "inApp" | "email") => {
    setPrefs((p) => ({ ...p, [key]: { ...p[key], [channel]: !p[key][channel] } }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateNotificationPreferences(prefs);
      toast({ title: "Notification preferences saved." });
    } catch {
      toast({ title: "Failed to save.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-w-narrow page-pad page-gap">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  return (
    <div className="page-w-narrow page-pad page-gap">
      <div>
        <h2 className="text-lg font-semibold">Notifications</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Choose which events send in-app notifications or emails to you.
        </p>
      </div>

      {NOTIFICATION_GROUPS.map((group) => (
        <Card key={group.label}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">{group.label}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Column headers */}
            <div className="flex items-center px-4 pb-1.5 border-b">
              <span className="flex-1 text-xs text-muted-foreground">Event</span>
              <span className="w-20 text-center text-xs text-muted-foreground">In-App</span>
              <span className="w-20 text-center text-xs text-muted-foreground">Email</span>
            </div>
            {group.events.map((event) => (
              <div
                key={event.key}
                className="flex items-center px-4 py-2.5 border-b last:border-0"
              >
                <span className="flex-1 text-sm">{event.label}</span>
                <div className="w-20 flex justify-center">
                  <Switch
                    checked={prefs[event.key].inApp}
                    onCheckedChange={() => toggle(event.key, "inApp")}
                  />
                </div>
                <div className="w-20 flex justify-center">
                  <Switch
                    checked={prefs[event.key].email}
                    onCheckedChange={() => toggle(event.key, "email")}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end">
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save Preferences"}
        </Button>
      </div>
    </div>
  );
}
