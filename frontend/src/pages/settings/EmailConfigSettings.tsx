import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import { getEmailConfig, updateEmailConfig, testEmailConfig } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";

const MASKED = "••••••••";

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  fromName: string;
  fromEmail: string;
}

const EMPTY: SmtpConfig = { host: "", port: 587, user: "", password: "", fromName: "", fromEmail: "" };

export default function EmailConfigSettings() {
  const { toast } = useToast();
  const [form, setForm] = useState<SmtpConfig>(EMPTY);
  const [showPass, setShowPass] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    getEmailConfig()
      .then((res) => {
        if (res.data?.host) {
          setIsConfigured(true);
          setForm({ ...EMPTY, ...res.data, password: MASKED });
        }
      })
      .catch(() => toast({ title: "Failed to load email config.", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [toast]);

  const patch = (field: keyof SmtpConfig, value: string | number) =>
    setForm((p) => ({ ...p, [field]: value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload: Partial<SmtpConfig> = { ...form };
    // Don't send the masked placeholder back — backend will preserve existing password
    if (payload.password === MASKED) delete payload.password;
    try {
      await updateEmailConfig(payload);
      setIsConfigured(true);
      toast({ title: "Email configuration saved." });
    } catch {
      toast({ title: "Failed to save.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await testEmailConfig();
      toast({ title: "Test email sent! Check your inbox." });
    } catch {
      toast({ title: "Test failed. Check your SMTP settings.", variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-w-narrow page-pad page-gap">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="page-w-narrow page-pad page-gap">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Email Configuration</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            SMTP settings for outbound emails (notifications, invoices, etc.).
          </p>
        </div>
        {isConfigured ? (
          <Badge variant="secondary" className="gap-1 text-emerald-700 bg-emerald-50 border-emerald-200">
            <CheckCircle className="h-3 w-3" />Configured
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <XCircle className="h-3 w-3" />Not configured
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">SMTP Settings</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Credentials are stored encrypted. The password is never returned in plaintext after saving.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="host">SMTP Host</Label>
                <Input
                  id="host"
                  value={form.host}
                  onChange={(e) => patch("host", e.target.value)}
                  placeholder="smtp.example.com"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="smtp-user">Username</Label>
                <Input
                  id="smtp-user"
                  value={form.user}
                  onChange={(e) => patch("user", e.target.value)}
                  placeholder="noreply@example.com"
                  autoComplete="off"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="smtp-port">Port</Label>
                <Input
                  id="smtp-port"
                  type="number"
                  value={form.port}
                  onChange={(e) => patch("port", parseInt(e.target.value) || 587)}
                  placeholder="587"
                />
              </div>

              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="smtp-pass">Password</Label>
                <div className="relative">
                  <Input
                    id="smtp-pass"
                    type={showPass ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => patch("password", e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    aria-label={showPass ? "Hide SMTP password" : "Show SMTP password"}
                    onClick={() => setShowPass((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="from-name">From Name</Label>
                <Input
                  id="from-name"
                  value={form.fromName}
                  onChange={(e) => patch("fromName", e.target.value)}
                  placeholder="NawaHub"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="from-email">From Email</Label>
                <Input
                  id="from-email"
                  type="email"
                  value={form.fromEmail}
                  onChange={(e) => patch("fromEmail", e.target.value)}
                  placeholder="noreply@example.com"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              {isConfigured && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={testing}
                  onClick={handleTest}
                >
                  {testing ? "Sending…" : "Send Test Email"}
                </Button>
              )}
              <Button type="submit" size="sm" disabled={saving || !form.host}>
                {saving ? "Saving…" : "Save Configuration"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
