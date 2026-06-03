import React, { useCallback, useState } from "react";
import { createUser, getRoles, getUsers } from "@/utils/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/authContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AsyncSearchableSelect } from "@/components/common/combobox";
import { AppBreadcrumb } from "@/components/common/AppBreadcrumb";
import { CircleArrowLeft } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface Role { _id: string; name: string }

const AddUser: React.FC = () => {
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

  const { data: rolesData, isPending: rolesLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: getRoles
  });

  const fetchUsers = useCallback(
    (q: string) =>
      getUsers({ page: 1, limit: 20, q }).then((r) =>
        ((r.data as any).data ?? r.data).map((u: { _id: string; name: string }) => ({
          value: u._id,
          label: u.name,
        }))
      ),
    []
  );

  const mutation = useMutation({
    mutationFn: () => createUser({ name, email, phone, password, role, ...(reportsTo ? { reportsTo } : {}) }),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "User created." });
      navigate("/settings/users");
    },

    onError: () => { toast({ title: "Failed to create user.", variant: "destructive" }); }
  });

  if (!currentUser || !["admin", "super admin"].includes(currentUser.role)) {
    return <p className="p-8 text-center font-semibold">You do not have permission to add users.</p>;
  }

  return (
    <main className="p-4 max-w-2xl space-y-5">
      <Card>
        <CardHeader>
          <AppBreadcrumb crumbs={[{ label: "Users", href: "/settings/users" }, { label: "Add User" }]} />
          <CardTitle className="flex items-center gap-3 mt-1">
            <Link to="/settings/users"><CircleArrowLeft /></Link>
            Add User
          </CardTitle>
        </CardHeader>

        <CardContent>
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

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={setRole} disabled={rolesLoading}>
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

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate("/settings/users")}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Creating…" : "Create User"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default AddUser;
