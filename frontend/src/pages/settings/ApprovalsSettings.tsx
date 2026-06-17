import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2 } from "lucide-react";
import { getApprovalSettings, updateApprovalSettings, getRoles } from "@/utils/api";
import { toast } from "@/components/ui/use-toast";

const MODULES = [
  { key: "expenses", label: "Expense Reports" },
  { key: "quotes", label: "Quotes" },
  { key: "salesOrders", label: "Sales Orders" },
  { key: "invoices", label: "Invoices" },
  { key: "purchase_orders", label: "Purchase Orders" },
  { key: "vendor_bills", label: "Vendor Bills" },
];

interface Step { approverRoles: string[]; minAmount?: number }
interface ApprovalConfig {
  module: string;
  approverRoles: string[];
  enabled: boolean;
  steps?: Step[];
}

interface Role { _id: string; name: string }

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

  const patch = (module: string, fn: (c: ApprovalConfig) => ApprovalConfig) =>
    setConfigs((prev) => prev.map((c) => (c.module !== module ? c : fn(c))));

  const toggleEnabled = (m: string, enabled: boolean) => patch(m, (c) => ({ ...c, enabled }));

  const toggleTiered = (m: string, tiered: boolean) =>
    patch(m, (c) => ({ ...c, steps: tiered ? (c.steps?.length ? c.steps : [{ approverRoles: [], minAmount: 0 }]) : undefined }));

  const toggleRole = (m: string, roleName: string, checked: boolean) =>
    patch(m, (c) => ({
      ...c,
      approverRoles: checked ? [...c.approverRoles, roleName] : c.approverRoles.filter((r) => r !== roleName),
    }));

  const addStep = (m: string) => patch(m, (c) => ({ ...c, steps: [...(c.steps ?? []), { approverRoles: [], minAmount: 0 }] }));
  const removeStep = (m: string, idx: number) => patch(m, (c) => ({ ...c, steps: (c.steps ?? []).filter((_, i) => i !== idx) }));
  const setStepAmount = (m: string, idx: number, amount: number) =>
    patch(m, (c) => ({ ...c, steps: (c.steps ?? []).map((s, i) => (i === idx ? { ...s, minAmount: amount } : s)) }));
  const toggleStepRole = (m: string, idx: number, roleName: string, checked: boolean) =>
    patch(m, (c) => ({
      ...c,
      steps: (c.steps ?? []).map((s, i) =>
        i !== idx ? s : { ...s, approverRoles: checked ? [...s.approverRoles, roleName] : s.approverRoles.filter((r) => r !== roleName) },
      ),
    }));

  const handleSave = async () => {
    setSaving(true);
    try {
      // Send steps when tiered; otherwise the single approverRoles list.
      const payload = configs.map((c) =>
        c.steps?.length ? { module: c.module, enabled: c.enabled, steps: c.steps } : { module: c.module, enabled: c.enabled, approverRoles: c.approverRoles },
      );
      await updateApprovalSettings(payload as any);
      toast({ title: "Approval settings saved." });
    } catch {
      toast({ title: "Failed to save settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-w-narrow page-pad page-gap">
        {MODULES.map((m) => <Skeleton key={m.key} className="h-32 w-full rounded-xl" />)}
      </div>
    );
  }

  const RoleChecks = ({ selected, onToggle, idPrefix }: { selected: string[]; onToggle: (role: string, c: boolean) => void; idPrefix: string }) => (
    <div className="flex flex-wrap gap-4">
      {roles.map((role) => (
        <div key={role._id} className="flex items-center gap-2">
          <Checkbox
            id={`${idPrefix}-${role._id}`}
            checked={selected.includes(role.name)}
            onCheckedChange={(c: boolean | "indeterminate") => onToggle(role.name, c === true)}
          />
          <Label htmlFor={`${idPrefix}-${role._id}`} className="text-sm capitalize cursor-pointer">{role.name}</Label>
        </div>
      ))}
    </div>
  );

  return (
    <div className="page-w-narrow page-pad page-gap">
      <div>
        <h1 className="text-lg font-bold text-foreground">Approval Workflow</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Choose which roles approve each module. Enable multi-step for tiered approval with amount thresholds —
          a document is approved only when every step approves.
        </p>
      </div>

      {MODULES.map((mod) => {
        const cfg = configs.find((c) => c.module === mod.key) ?? { module: mod.key, approverRoles: [] as string[], enabled: false };
        const tiered = !!cfg.steps?.length;
        return (
          <Card key={mod.key} className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">{mod.label}</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {cfg.enabled ? "Approval required — pending records are locked for editing." : "Approval disabled."}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Require approval</Label>
                  <Switch checked={cfg.enabled} onCheckedChange={(c) => toggleEnabled(mod.key, c)} />
                </div>
              </div>
            </CardHeader>
            {cfg.enabled && (
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Switch id={`${mod.key}-tiered`} checked={tiered} onCheckedChange={(c) => toggleTiered(mod.key, c)} />
                  <Label htmlFor={`${mod.key}-tiered`} className="text-xs text-muted-foreground">Multi-step (tiered) approval</Label>
                </div>

                {!tiered ? (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Roles that can approve or reject:</p>
                    <RoleChecks selected={cfg.approverRoles} onToggle={(r, c) => toggleRole(mod.key, r, c)} idPrefix={mod.key} />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(cfg.steps ?? []).map((step, idx) => (
                      <div key={idx} className="rounded-lg border p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">Step {idx + 1}</span>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeStep(mod.key, idx)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">Applies when amount ≥</Label>
                          <Input
                            type="number" min="0" className="h-8 w-32"
                            value={step.minAmount ?? 0}
                            onChange={(e) => setStepAmount(mod.key, idx, Number(e.target.value))}
                          />
                        </div>
                        <RoleChecks selected={step.approverRoles} onToggle={(r, c) => toggleStepRole(mod.key, idx, r, c)} idPrefix={`${mod.key}-${idx}`} />
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => addStep(mod.key)}>
                      <Plus className="h-3.5 w-3.5 me-1" />Add step
                    </Button>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}

      <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
    </div>
  );
}
