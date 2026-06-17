import React, { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { updateUser, getUserById, getRoles, getUsers } from "@/utils/api";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/authContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AsyncSearchableSelect } from "@/components/common/combobox";
import { AppBreadcrumb } from "@/components/common/AppBreadcrumb";
import { CircleArrowLeft } from "lucide-react";
import { AxiosResponse } from "axios";
import { useSaveMutation } from "@/hooks/useSaveMutation";
import { useUnsavedChangesSnapshot } from "@/hooks/useUnsavedChangesGuard";
import { queryKeys } from "@/lib/queryKeys";

interface Role { _id: string; name: string }
interface UserDetail { email: string; name: string; phone: string; role: Role; active: boolean; reportsTo?: { _id: string; name: string } | null }

const schema = z.object({
  name:     z.string().min(1, "Name is required"),
  phone:    z.string().min(1, "Phone is required"),
  email:    z.string().email("Invalid email"),
  password: z.string().optional(),
  role:     z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const EditUser: React.FC = () => {
  const { id: userId } = useParams<{ id: string }>();
  const navigate       = useNavigate();
  const { tr }         = useLanguage();
  const { user: currentUser } = useAuth();

  const [reportsTo, setReportsTo]         = useState("");
  const [reportsToLabel, setReportsToLabel] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", phone: "", email: "", password: "", role: "" },
  });
  const values = form.watch();

  const { data: rolesData, isPending: rolesLoading } = useQuery({ queryKey: queryKeys.roles.all, queryFn: getRoles });
  const { data: userData, isPending: userLoading } = useQuery({
    queryKey: queryKeys.users.detail(userId!),
    queryFn: () => getUserById(userId!),
    enabled: !!userId,
  });

  useEffect(() => {
    if (!userData) return;
    const u = (userData as AxiosResponse<UserDetail>).data;
    form.reset({ name: u.name, email: u.email, phone: u.phone, role: u.role._id, password: "" });
    setReportsTo(u.reportsTo?._id ?? "");
    setReportsToLabel(u.reportsTo?.name ?? "");
  }, [userData, form]);

  const fetchUsers = useCallback(
    (q: string) =>
      getUsers({ page: 1, limit: 20, q }).then((r) =>
        ((r.data as any).data ?? r.data)
          .filter((u: { _id: string }) => u._id !== userId)
          .map((u: { _id: string; name: string }) => ({ value: u._id, label: u.name }))
      ),
    [userId],
  );

  const isPending = rolesLoading || userLoading;
  const { allowNavigation, resetSnapshot } = useUnsavedChangesSnapshot(
    { values, reportsTo },
    { enabled: !isPending && !!userData },
  );

  const mutation = useSaveMutation<Record<string, unknown>>({
    save: (payload) => updateUser(userId!, payload as any),
    invalidate: [queryKeys.users.all, queryKeys.users.detail(userId!)],
    successMessage: "User updated",
    errorMessage:   "Failed to update user",
    onSuccess: () => {
      allowNavigation();
      resetSnapshot();
      navigate("/settings/users");
    },
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate({
      name: values.name, email: values.email, phone: values.phone, role: values.role,
      ...(values.password ? { password: values.password } : {}),
      reportsTo: reportsTo || null,
    });
  };

  if (!currentUser || !(currentUser.permissions ?? []).some((p) => p === "*" || p === "users:create")) {
    return <p className="p-8 text-center font-semibold">You do not have permission to edit users.</p>;
  }

  const userDetail = userData ? (userData as AxiosResponse<UserDetail>).data : null;
  const name = form.watch("name");

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
          {isPending ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <Form {...form}>
              <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="01234567890" {...field}
                          onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").substring(0, 11))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" placeholder="john@example.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="role" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <FormControl>
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {rolesData?.data.map((r: Role) => (
                                <SelectItem key={r._id} value={r._id}>{r.name}</SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )} />
                  <div className="space-y-1.5">
                    <FormLabel>Reports To</FormLabel>
                    <AsyncSearchableSelect
                      value={reportsTo} onChange={(val) => { setReportsTo(val); if (!val) setReportsToLabel(""); }}
                      onSelectItem={(item) => setReportsToLabel(item.label)}
                      fetchFn={fetchUsers} selectedLabel={reportsToLabel} placeholder="Search users…"
                    />
                  </div>
                </div>

                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      New Password
                      <span className="text-muted-foreground font-normal text-xs ms-1">(leave blank to keep current)</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => navigate("/settings/users")}>{tr.common.cancel}</Button>
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? tr.common.loading : tr.common.save}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default EditUser;
