import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck } from "lucide-react";
import { getPasswordPolicy, updatePasswordPolicy } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";

interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireNumber: boolean;
  requireSymbol: boolean;
}

const DEFAULT_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: false,
  requireNumber: false,
  requireSymbol: false,
};

export default function PasswordPolicySettings() {
  const { toast } = useToast();
  const [policy, setPolicy] = useState<PasswordPolicy>(DEFAULT_POLICY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPasswordPolicy()
      .then((res) => {
        if (res.data && Object.keys(res.data).length) {
          setPolicy({ ...DEFAULT_POLICY, ...res.data });
        }
      })
      .catch(() => toast({ title: "Failed to load policy.", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  const patch = (field: keyof PasswordPolicy, value: boolean | number) =>
    setPolicy((p) => ({ ...p, [field]: value }));

  const save = async () => {
    setSaving(true);
    try {
      await updatePasswordPolicy(policy);
      toast({ title: "Password policy saved." });
    } catch {
      toast({ title: "Failed to save.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const requirements: string[] = [];
  if (policy.minLength > 0) requirements.push(`at least ${policy.minLength} characters`);
  if (policy.requireUppercase) requirements.push("one uppercase letter");
  if (policy.requireNumber) requirements.push("one number");
  if (policy.requireSymbol) requirements.push("one symbol");

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-5">
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Password Policy</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Set minimum requirements for all user passwords in your workspace.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Requirements</CardTitle>
          </div>
          <CardDescription className="text-xs">
            These rules apply when a user sets or changes their password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-1.5 max-w-xs">
            <Label htmlFor="min-length">Minimum Length</Label>
            <Input
              id="min-length"
              type="number"
              min={4}
              max={64}
              value={policy.minLength}
              onChange={(e) => patch("minLength", Math.max(4, parseInt(e.target.value) || 8))}
            />
          </div>

          {(
            [
              { field: "requireUppercase" as const, label: "Require at least one uppercase letter (A–Z)" },
              { field: "requireNumber"    as const, label: "Require at least one number (0–9)" },
              { field: "requireSymbol"    as const, label: "Require at least one symbol (!@#$…)" },
            ] as { field: keyof PasswordPolicy; label: string }[]
          ).map(({ field, label }) => (
            <div key={field} className="flex items-center gap-3">
              <Switch
                id={field}
                checked={policy[field] as boolean}
                onCheckedChange={(v) => patch(field, v)}
              />
              <Label htmlFor={field} className="cursor-pointer text-sm">{label}</Label>
            </div>
          ))}

          {requirements.length > 0 && (
            <div className="rounded-lg bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Current policy: </span>
              Passwords must contain {requirements.join(", ")}.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save Policy"}
        </Button>
      </div>
    </div>
  );
}
