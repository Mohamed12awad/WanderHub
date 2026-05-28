import React, { useCallback, useEffect, useState } from "react";
import { updateUser, getUserById, getRoles, getUsers } from "@/utils/api";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/authContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AsyncSearchableSelect } from "@/components/common/combobox";
import { AppBreadcrumb } from "@/components/common/AppBreadcrumb";
import { CircleArrowLeft } from "lucide-react";
import { AxiosResponse } from "axios";
import { toast } from "@/components/ui/use-toast";

interface Role { _id: string; name: string }
interface UserDetail {
  email: string;
  name: string;
  phone: string;
  role: Role;
  active: boolean;
  reportsTo?: { _id: string; name: string } | null;
}

const EditUser: React.FC = () => {
  const { id: userId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [reportsTo, setReportsTo] = useState("");
  const [reportsToLabel, setReportsToLabel] = useState("");

  const { data: rolesData, isLoading: rolesLoading } = useQuery("roles", getRoles);
  const { data: userData, isLoading: userLoading } = useQuery(
    ["user", userId],
    () => getUserById(userId!),
    { enabled: !!userId }
  );

  useEffect(() => {
    if (!userData) return;
    const u = (userData as AxiosResponse<UserDetail>).data;
    setName(u.name);
    setEmail(u.email);
    setPhone(u.phone);
    setRole(u.role._id);
    setReportsTo(u.reportsTo?._id ?? "");
    setReportsToLabel(u.reportsTo?.name ?? "");
  }, [userData]);

  const fetchUsers = useCallback(
    (q: string) =>
      getUsers({ page: 1, limit: 20, q }).then((r) =>
        ((r.data as any).data ?? r.data)
          .filter((u: { _id: string }) => u._id !== userId)
          .map((u: { _id: string; name: string }) => ({ value: u._id, label: u.name }))
      ),
    [userId]
  );

  const mutation = useMutation(
    () => updateUser(userId!, { name, email, phone, role, ...(password ? { password } : {}), reportsTo: reportsTo || null }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries("users");
        queryClient.invalidateQueries(["user", userId]);
        toast({ title: "User updated." });
        navigate("/settings/users");
      },
      onError: () => { toast({ title: "Failed to update user.", variant: "destructive" }); },
    }
  );

  if (!currentUser || !["admin", "super admin"].includes(currentUser.role)) {
    return <p className="p-8 text-center font-semibold">You do not have permission to edit users.</p>;
  }

  const isLoading = rolesLoading || userLoading;
  const userDetail = userData ? (userData as AxiosResponse<UserDetail>).data : null;

  return (
    <main className="p-4 max-w-2xl space-y-5">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <AppBreadcrumb crumbs={[{ label: "Users", href: "/settings/users" }, { label: name || "Edit User" }]} />
            <CardTitle className="flex items-center gap-3 mt-1">
              <Link to="/settings/users"><CircleArrowLeft /></Link>
              <span className="truncate">{name || "Edit User"}</span>
              {userDetail && (
                <Badge variant="outline" className={
                  userDetail.active
                    ? "bg-emerald-500 text-white border-emerald-500"
                    : "bg-slate-400 text-white border-slate-400"
                }>
                  {userDetail.active ? "Active" : "Inactive"}
                </Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <form
              className="space-y-5"
              onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="John Doe" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").substring(0, 11))}
                    placeholder="01234567890"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="john@example.com" />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="role">Role</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {rolesData?.data.map((r: Role) => (
                          <SelectItem key={r._id} value={r._id}>{r.name}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Reports To</Label>
                  <AsyncSearchableSelect
                    value={reportsTo}
                    onChange={(val) => { setReportsTo(val); if (!val) setReportsToLabel(""); }}
                    onSelectItem={(item) => setReportsToLabel(item.label)}
                    fetchFn={fetchUsers}
                    selectedLabel={reportsToLabel}
                    placeholder="Search users…"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">
                  New Password
                  <span className="text-muted-foreground font-normal text-xs ms-1">(leave blank to keep current)</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => navigate("/settings/users")}>Cancel</Button>
                <Button type="submit" disabled={mutation.isLoading}>
                  {mutation.isLoading ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default EditUser;
