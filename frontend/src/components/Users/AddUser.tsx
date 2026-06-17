import React, { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createUser, getRoles, getUsers } from "@/utils/api";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/authContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AsyncSearchableSelect } from "@/components/common/combobox";
import { AppBreadcrumb } from "@/components/common/AppBreadcrumb";
import { CircleArrowLeft } from "lucide-react";
import { useSaveMutation } from "@/hooks/useSaveMutation";
import { useUnsavedChangesSnapshot } from "@/hooks/useUnsavedChangesGuard";
import { queryKeys } from "@/lib/queryKeys";
import { useState } from "react";

interface Role { _id: string; name: string }

const schema = z.object({
  name:     z.string().min(1, "Name is required"),
  phone:    z.string().min(1, "Phone is required"),
  email:    z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role:     z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const AddUser: React.FC = () => {
  const navigate     = useNavigate();
  const { tr }       = useLanguage();
  const { user: currentUser } = useAuth();

  const [reportsTo, setReportsTo]         = useState("");
  const [reportsToLabel, setReportsToLabel] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", phone: "", email: "", password: "", role: "" },
  });
  const values = form.watch();
  const { allowNavigation, resetSnapshot } = useUnsavedChangesSnapshot({ values, reportsTo });

  const { data: rolesData, isPending: rolesLoading } = useQuery({
    queryKey: queryKeys.roles.all,
    queryFn: getRoles,
  });

  const fetchUsers = useCallback(
    (q: string) =>
      getUsers({ page: 1, limit: 20, q }).then((r) =>
        ((r.data as any).data ?? r.data).map((u: { _id: string; name: string }) => ({ value: u._id, label: u.name }))
      ),
    [],
  );

  const mutation = useSaveMutation<Record<string, unknown>>({
    save: (payload) => createUser(payload as any),
    invalidate: [queryKeys.users.all],
    successMessage: "User created",
    errorMessage:   "Failed to create user",
    onSuccess: () => {
      allowNavigation();
      resetSnapshot();
      navigate("/settings/users");
    },
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate({ ...values, ...(reportsTo ? { reportsTo } : {}) });
  };

  if (!currentUser || !(currentUser.permissions ?? []).some((p) => p === "*" || p === "users:create")) {
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

              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <FormControl>
                      <Select value={field.value ?? ""} onValueChange={field.onChange} disabled={rolesLoading}>
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

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => navigate("/settings/users")}>{tr.common.cancel}</Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? tr.common.loading : "Create User"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
};

export default AddUser;
