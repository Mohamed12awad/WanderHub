import React, { useCallback, useEffect, useState } from "react";
import { createUser, updateUser, getUserById, getRoles, getUsers } from "@/utils/api";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useAuth } from "@/contexts/authContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AsyncSearchableSelect } from "@/components/common/combobox";
import { toast } from "@/components/ui/use-toast";
import { Users } from "lucide-react";
import { AxiosResponse } from "axios";

interface Role { _id: string; name: string }
interface DirectReport { _id: string; name: string; role: { name: string } }
interface UserDetail {
  _id: string;
  email: string;
  name: string;
  phone: string;
  role: Role;
  active: boolean;
  reportsTo?: { _id: string; name: string } | null;
  directReports?: DirectReport[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  editId?: string | null;
}

const UserDialog: React.FC<Props> = ({ open, onClose, editId }) => {
  const isEdit = Boolean(editId);
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [reportsTo, setReportsTo] = useState("");
  const [reportsToLabel, setReportsToLabel] = useState("");
  const [changePassword, setChangePassword] = useState(false);

  const { data: rolesData, isLoading: rolesLoading } = useQuery("roles", getRoles);
  const { data: userData, isLoading: userLoading } = useQuery(
    ["user", editId],
    () => getUserById(editId!),
    { enabled: !!editId }
  );

  const userDetail: UserDetail | null = userData ? (userData as AxiosResponse<UserDetail>).data : null;

  // Reset form when dialog opens/closes or editId changes
  useEffect(() => {
    if (!open) return;
    if (editId && userDetail) {
      setName(userDetail.name);
      setEmail(userDetail.email);
      setPhone(userDetail.phone);
      setRole(userDetail.role._id);
      setReportsTo(userDetail.reportsTo?._id ?? "");
      setReportsToLabel(userDetail.reportsTo?.name ?? "");
      setPassword("");
    } else if (!editId) {
      setName(""); setEmail(""); setPhone(""); setPassword("");
      setRole(""); setReportsTo(""); setReportsToLabel("");
    }
    setChangePassword(false);
  }, [open, editId, userDetail]);

  const fetchUsers = useCallback(
    (q: string) =>
      getUsers({ page: 1, limit: 20, q }).then((r) =>
        ((r.data as any).data ?? r.data)
          .filter((u: { _id: string }) => u._id !== editId)
          .map((u: { _id: string; name: string }) => ({ value: u._id, label: u.name }))
      ),
    [editId]
  );

  const invalidate = () => {
    queryClient.invalidateQueries("users");
    if (editId) queryClient.invalidateQueries(["user", editId]);
  };

  const createMutation = useMutation(
    () => createUser({ name, email, phone, password, role, ...(reportsTo ? { reportsTo } : {}) }),
    {
      onSuccess: () => { invalidate(); toast({ title: "User created." }); onClose(); },
      onError: () => { toast({ title: "Failed to create user.", variant: "destructive" }); },
    }
  );

  const updateMutation = useMutation(
    () => updateUser(editId!, { name, email, phone, role, ...(changePassword && password ? { password } : {}), reportsTo: reportsTo || null }),
    {
      onSuccess: () => { invalidate(); toast({ title: "User updated." }); onClose(); },
      onError: () => { toast({ title: "Failed to update user.", variant: "destructive" }); },
    }
  );

  const isLoading = rolesLoading || (isEdit && userLoading);
  const isSaving = createMutation.isLoading || updateMutation.isLoading;
  const directReports = userDetail?.directReports ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    isEdit ? updateMutation.mutate() : createMutation.mutate();
  };

  if (!currentUser || !["admin", "super admin"].includes(currentUser.role)) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? (
              <>
                <span className="truncate">{userDetail?.name ?? "Edit User"}</span>
                {userDetail && (
                  <Badge variant="outline" className={
                    userDetail.active
                      ? "bg-emerald-500 text-white border-emerald-500 text-xs"
                      : "bg-slate-400 text-white border-slate-400 text-xs"
                  }>
                    {userDetail.active ? "Active" : "Inactive"}
                  </Badge>
                )}
              </>
            ) : "Add User"}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <Tabs defaultValue="details">
            <TabsList className="w-full">
              <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
              {isEdit && (
                <TabsTrigger value="reportees" className="flex-1">
                  Direct Reports
                  {directReports.length > 0 && (
                    <span className="ms-1.5 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-semibold leading-none">
                      {directReports.length}
                    </span>
                  )}
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="details">
              <form className="space-y-4 pt-2" onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="u-name">Name</Label>
                    <Input id="u-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="John Doe" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="u-phone">Phone</Label>
                    <Input
                      id="u-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").substring(0, 11))}
                      placeholder="01234567890"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="u-email">Email</Label>
                  <Input id="u-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="john@example.com" />
                </div>

                {isEdit ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => { setChangePassword((v) => !v); setPassword(""); }}
                      className="text-xs text-primary underline-offset-2 hover:underline"
                    >
                      {changePassword ? "Cancel password change" : "Change password"}
                    </button>
                    {changePassword && (
                      <Input
                        id="u-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="New password"
                        autoComplete="new-password"
                        autoFocus
                      />
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="u-password">Password</Label>
                    <Input
                      id="u-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Role</Label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger>
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

                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving…" : isEdit ? "Save Changes" : "Create User"}
                  </Button>
                </div>
              </form>
            </TabsContent>

            {isEdit && (
              <TabsContent value="reportees">
                <div className="pt-2">
                  {directReports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Users className="h-8 w-8 text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">No direct reports</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {directReports.map((dr) => (
                        <div key={dr._id} className="flex items-center justify-between rounded-lg px-3 py-2.5 bg-muted/40 hover:bg-muted/70 transition-colors">
                          <div>
                            <p className="text-sm font-medium">{dr.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{dr.role?.name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            )}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserDialog;
