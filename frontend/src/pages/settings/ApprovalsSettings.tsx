import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getApprovalSettings, updateApprovalSettings, getRoles } from "@/utils/api";
import { toast } from "@/components/ui/use-toast";

const MODULES = [
  { key: "expenses", label: "Expense Reports" },
  { key: "quotes", label: "Quotes" },
  { key: "invoices", label: "Invoices" },
];

interface ApprovalConfig {
  module: string;
  approverRoles: string[];
  enabled: boolean;
}

interface Role {
  _id: string;
  name: string;
}

export default function ApprovalsSettings() {
  const [configs, setConfigs] = useState<ApprovalConfig[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [cfgRes, rolesRes] = await Promise.all([getApprovalSettings(), getRoles()]);
        const cfgData: ApprovalConfig[] = cfgRes.data ?? [];
        setRoles(rolesRes.data ?? []);
        // Ensure all modules have an entry
        const merged = MODULES.map((m) => {
          const existing = cfgData.find((c) => c.module === m.key);
          return existing ?? { module: m.key, approverRoles: [], enabled: false };
        });
        setConfigs(merged);
      } catch {
        toast({ title: "Failed to load approval settings", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggleEnabled = (module: string, enabled: boolean) => {
    setConfigs((prev) =>
      prev.map((c) => (c.module !== module ? c : { ...c, enabled }))
    );
  };

  const toggleRole = (module: string, roleName: string, checked: boolean) => {
    setConfigs((prev) =>
      prev.map((c) =>
        c.module !== module
          ? c
          : {
              ...c,
              approverRoles: checked
                ? [...c.approverRoles, roleName]
                : c.approverRoles.filter((r) => r !== roleName),
            }
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateApprovalSettings(configs);
      toast({ title: "Approval settings saved." });
    } catch {
      toast({ title: "Failed to save settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {MODULES.map((m) => <Skeleton key={m.key} className="h-32 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <div>
        <h1 className="text-lg font-bold text-foreground">Approval Workflow</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Choose which roles can approve each module. Users with those roles will see Approve/Reject buttons.
        </p>
      </div>

      {MODULES.map((mod) => {
        const cfg = configs.find((c) => c.module === mod.key) ?? { module: mod.key, approverRoles: [] as string[], enabled: false };
        return (
          <Card key={mod.key} className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">{mod.label}</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {cfg.enabled
                      ? "Approval required — pending records are locked for editing."
                      : "Approval disabled — records can be freely edited."}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Require approval</Label>
                  <Switch
                    checked={cfg.enabled}
                    onCheckedChange={(checked) => toggleEnabled(mod.key, checked)}
                  />
                </div>
              </div>
            </CardHeader>
            {cfg.enabled && (
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">Roles that can approve or reject:</p>
                {roles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No roles found.</p>
                ) : (
                  <div className="flex flex-wrap gap-4">
                    {roles.map((role) => (
                      <div key={role._id} className="flex items-center gap-2">
                        <Checkbox
                          id={`${mod.key}-${role._id}`}
                          checked={cfg.approverRoles.includes(role.name)}
                          onCheckedChange={(checked: boolean | "indeterminate") => toggleRole(mod.key, role.name, checked === true)}
                        />
                        <Label htmlFor={`${mod.key}-${role._id}`} className="text-sm capitalize cursor-pointer">
                          {role.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : "Save Changes"}
      </Button>
    </div>
  );
}
