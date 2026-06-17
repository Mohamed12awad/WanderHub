import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getUserById, updateUser, updateLandingPage } from "@/utils/api";
import { useAuth } from "@/contexts/authContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { permittedLandingOptions } from "@/lib/resolveHomeRoute";

const AUTO_LANDING = "__auto__";

export default function ProfileSettings() {
  const { user, updateCurrentUser } = useAuth();
  const { tr } = useLanguage();
  const s = tr.settings;
  const { toast } = useToast();

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState("");

  const { data: userData, isPending } = useQuery({
    queryKey: ["user-profile", user?._id],
    queryFn: () => getUserById(user!._id),
    enabled: !!user?._id
  });

  useEffect(() => {
    if (userData?.data) {
      setName(userData.data.name ?? "");
      setPhone(userData.data.phone ?? "");
    }
  }, [userData]);

  const mutation = useMutation({
    mutationFn: (payload: { name: string; phone: string; email: string; role: string; password?: string }) =>
      updateUser(user!._id, payload as any),

    onSuccess: () => {
      updateCurrentUser({ name });
      toast({ title: s.saved });
    },

    onError: () => {
      toast({ title: s.saveFailed, variant: "destructive" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const roleId = userData?.data?.role?._id ?? userData?.data?.role ?? "";
    const payload: any = { name, phone, email: user!.email, role: roleId };
    mutation.mutate(payload);
  };

  const landingOptions = permittedLandingOptions(user?.permissions ?? []);
  const landingValue = user?.defaultLandingPage ?? AUTO_LANDING;
  const landingMutation = useMutation({
    mutationFn: (path: string | null) => updateLandingPage(path),
    onSuccess: (_res, path) => {
      updateCurrentUser({ defaultLandingPage: path });
      toast({ title: s.saved });
    },
    onError: () => toast({ title: s.saveFailed, variant: "destructive" }),
  });

  const initials = name
    ? name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <div className="page-w-narrow page-pad page-gap">
      {/* ── Profile hero card ── */}
      <Card className="overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-primary/25 via-primary/15 to-primary/5" />
        <CardContent className="pt-0 pb-5 px-6">
          <div className="flex items-end gap-4 -mt-9">
            <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold ring-4 ring-background shrink-0 select-none">
              {isPending ? "…" : initials}
            </div>
            <div className="pb-1 min-w-0">
              <p className="font-semibold text-base leading-tight truncate">{name || "—"}</p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{user?.email}</p>
              <Badge variant="outline" className="capitalize text-xs mt-1.5">{user?.role}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
      {isPending ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── Account information ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Account Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="name">{s.fullName}</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="phone">{s.phone}</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").substring(0, 15))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="email">{s.email}</Label>
                  <Input id="email" value={user?.email ?? ""} disabled className="opacity-60 cursor-not-allowed" />
                </div>
                <div className="grid gap-1.5">
                  <Label>{s.role}</Label>
                  <div className="flex items-center h-10">
                    <Badge variant="outline" className="capitalize">{user?.role}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={mutation.isPending} className="px-8">
              {mutation.isPending ? tr.common.loading : s.saveChanges}
            </Button>
          </div>
        </form>
      )}

      {/* ── Preferences ── */}
      {!isPending && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-1.5 max-w-sm">
              <Label>Default landing page</Label>
              <Select
                value={landingValue}
                onValueChange={(v) => landingMutation.mutate(v === AUTO_LANDING ? null : v)}
                disabled={landingMutation.isPending}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={AUTO_LANDING}>Automatic (first available)</SelectItem>
                  {landingOptions.map((o) => (
                    <SelectItem key={o.path} value={o.path}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The page you land on after signing in.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
