import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getUserById, updateUser } from "@/utils/api";
import { useAuth } from "@/contexts/authContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileSettings() {
  const { user, updateCurrentUser } = useAuth();
  const { tr } = useLanguage();
  const s = tr.settings;
  const { toast } = useToast();

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { data: userData, isPending } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: () => getUserById(user!.id),
    enabled: !!user?.id
  });

  useEffect(() => {
    if (userData?.data) {
      setName(userData.data.name ?? "");
      setPhone(userData.data.phone ?? "");
    }
  }, [userData]);

  const mutation = useMutation({
    mutationFn: (payload: { name: string; phone: string; email: string; role: string; password?: string }) =>
      updateUser(user!.id, payload as any),

    onSuccess: () => {
      updateCurrentUser({ name });
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: s.saved });
    },

    onError: () => {
      toast({ title: s.saveFailed, variant: "destructive" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match.", variant: "destructive" });
      return;
    }
    const roleId = userData?.data?.role?._id ?? userData?.data?.role ?? "";
    const payload: any = { name, phone, email: user!.email, role: roleId };
    if (newPassword) payload.password = newPassword;
    mutation.mutate(payload);
  };

  const initials = name
    ? name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
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

          {/* ── Change password ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Change Password</CardTitle>
              <CardDescription className="text-xs">Leave blank to keep your current password.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
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
    </div>
  );
}
