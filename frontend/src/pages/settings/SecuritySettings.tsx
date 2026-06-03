import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSessions, revokeSession, getLoginHistory, changePassword } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, Monitor, History, Laptop, Smartphone, Globe, CheckCircle, XCircle } from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseDevice(ua: string | null | undefined): { label: string; icon: typeof Laptop } {
  if (!ua) return { label: "Unknown device", icon: Globe };
  const s = ua.toLowerCase();
  if (s.includes("mobile") || s.includes("android") || s.includes("iphone"))
    return { label: "Mobile", icon: Smartphone };
  if (s.includes("windows") || s.includes("mac") || s.includes("linux"))
    return { label: "Desktop", icon: Laptop };
  return { label: "Browser", icon: Globe };
}

function parseBrowser(ua: string | null | undefined): string {
  if (!ua) return "";
  if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Edg")) return "Edge";
  return "";
}

function formatTs(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// ── Change Password card ───────────────────────────────────────────────────────

function ChangePasswordCard() {
  const { toast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const mutation = useMutation({
    mutationFn: () => changePassword(current, next),
    onSuccess: () => {
      setCurrent(""); setNext(""); setConfirm("");
      toast({ title: "Password updated." });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? "Failed to update password.";
      toast({ title: msg, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!current || !next) return;
    if (next !== confirm) {
      toast({ title: "Passwords do not match.", variant: "destructive" });
      return;
    }
    if (next.length < 6) {
      toast({ title: "New password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    mutation.mutate();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">Change Password</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Enter your current password to set a new one.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={!current || !next || !confirm || mutation.isPending}
            >
              {mutation.isPending ? "Updating…" : "Update Password"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Active Sessions card ───────────────────────────────────────────────────────

interface Session {
  id: string;
  createdAt: string;
  expiresAt: string;
  userAgent?: string;
  ipAddress?: string;
}

function ActiveSessionsCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<Session[]>({
    queryKey: ["me-sessions"],
    queryFn: () => getSessions().then((r) => r.data),
  });

  const revokeMutation = useMutation({
    mutationFn: (sessionId: string) => revokeSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me-sessions"] });
      toast({ title: "Session revoked." });
    },
    onError: () => toast({ title: "Failed to revoke session.", variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">Active Sessions</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Devices currently signed in to your account. Revoke any you don't recognise.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && (
          <div className="px-4 pb-4 space-y-2">
            {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
          </div>
        )}
        {!isLoading && (!data || data.length === 0) && (
          <div className="px-4 pb-4">
            <p className="text-sm text-muted-foreground text-center py-6">No active sessions found.</p>
          </div>
        )}
        {!isLoading && data && data.length > 0 && (
          <div className="divide-y">
            {data.map((session) => {
              const { label, icon: Icon } = parseDevice(session.userAgent);
              const browser = parseBrowser(session.userAgent);
              return (
                <div key={session.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {label}{browser ? ` · ${browser}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {session.ipAddress ? `${session.ipAddress} · ` : ""}
                      Signed in {formatTs(session.createdAt)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs shrink-0"
                    disabled={revokeMutation.isPending}
                    onClick={() => revokeMutation.mutate(session.id)}
                  >
                    Revoke
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Login History card ─────────────────────────────────────────────────────────

interface LogEntry {
  id: string;
  action: string;
  timestamp: string;
  success: boolean;
}

function LoginHistoryCard() {
  const { data, isLoading } = useQuery<LogEntry[]>({
    queryKey: ["me-login-history"],
    queryFn: () => getLoginHistory().then((r) => r.data),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">Login History</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Your last 30 authentication events.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && (
          <div className="px-4 pb-4 space-y-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
          </div>
        )}
        {!isLoading && (!data || data.length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-6 px-4">
            No login history yet.
          </p>
        )}
        {!isLoading && data && data.length > 0 && (
          <div className="divide-y">
            {data.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
                {entry.success
                  ? <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                  : <XCircle className="h-4 w-4 text-destructive shrink-0" />
                }
                <span className="flex-1 text-sm">{entry.action}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatTs(entry.timestamp)}
                </span>
                {!entry.success && (
                  <Badge variant="destructive" className="text-[10px] h-4 px-1.5">Failed</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SecuritySettings() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Security</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your password, active sessions, and login history.
        </p>
      </div>

      <ChangePasswordCard />
      <ActiveSessionsCard />
      <LoginHistoryCard />
    </div>
  );
}
