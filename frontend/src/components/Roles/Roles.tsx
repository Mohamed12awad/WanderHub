import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRoles, createRole, updateRole, deleteRole } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { PERMISSION_REGISTRY, Resource, ALL_ACTIONS } from "@/config/permissions";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { ShieldCheck, PlusCircle, Pencil, Trash2, Check } from "lucide-react";

interface Role { _id: string; name: string; permissions: string[] }

const LOCKED_ROLES = ["super admin", "admin"];

// Keyed by Resource, so adding a grantable resource to PERMISSION_REGISTRY
// without a label here is a compile error rather than a blank row in the matrix.
const RESOURCE_LABELS: Record<Resource, string> = {
  contacts: "Contacts", leads: "Leads", deals: "Deals", products: "Products",
  expenses: "Expenses", tasks: "Tasks", activities: "Activities",
  notes: "Notes", emails: "Emails",
  quotes: "Quotes", invoices: "Invoices",
  "sales-orders": "Sales Orders",
  reports: "Reports", users: "Users", roles: "Roles",
  settings: "Settings", accounting: "Accounting", logs: "Logs",
  suppliers: "Suppliers", "purchase-orders": "Purchase Orders", "vendor-bills": "Vendor Bills",
  warehouses: "Warehouses", "product-categories": "Product Categories",
  projects: "Projects",
};

const ACTION_LABELS: Record<string, string> = {
  view: "View", create: "Create", edit: "Edit",
  delete: "Delete", export: "Export", approve: "Approve", manage: "Manage",
  send: "Send", pay: "Record Payment",
};

function PermissionMatrix({
  role, onSave, saving,
}: {
  role: Role;
  onSave: (permissions: string[]) => void;
  saving: boolean;
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set(role.permissions));
  const isLocked = LOCKED_ROLES.includes(role.name);

  const toggle = (perm: string) => {
    if (isLocked) return;
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(perm) ? next.delete(perm) : next.add(perm);
      return next;
    });
  };

  const toggleRow = (resource: Resource) => {
    if (isLocked) return;
    const actions = PERMISSION_REGISTRY[resource] as readonly string[];
    const rowPerms = actions.map((a) => `${resource}:${a}`);
    const allOn = rowPerms.every((p) => checked.has(p));
    setChecked((prev) => {
      const next = new Set(prev);
      rowPerms.forEach((p) => allOn ? next.delete(p) : next.add(p));
      return next;
    });
  };

  const resources = Object.keys(PERMISSION_REGISTRY) as Resource[];

  return (
    <div className="space-y-4">
      {isLocked && (
        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
          This role's permissions are managed by the system and cannot be modified.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-start px-3 py-2.5 font-semibold w-28">Resource</th>
              {ALL_ACTIONS.map((action) => (
                <th key={action} className="px-2 py-2.5 font-semibold text-center min-w-[58px]">
                  {ACTION_LABELS[action]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {resources.map((resource) => {
              const actions = PERMISSION_REGISTRY[resource] as readonly string[];
              const rowPerms = actions.map((a) => `${resource}:${a}`);
              const allOn = rowPerms.every((p) => checked.has(p));
              const someOn = !allOn && rowPerms.some((p) => checked.has(p));

              return (
                <tr key={resource} className="hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => toggleRow(resource)}
                      disabled={isLocked}
                      className="flex items-center gap-1.5 font-medium capitalize disabled:cursor-default"
                    >
                      <span className={cn(
                        "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors",
                        allOn ? "bg-primary border-primary" :
                        someOn ? "bg-primary/30 border-primary/50" :
                        "border-border"
                      )}>
                        {allOn && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                      </span>
                      {RESOURCE_LABELS[resource]}
                    </button>
                  </td>
                  {ALL_ACTIONS.map((action) => {
                    const perm = `${resource}:${action}`;
                    const available = (actions as string[]).includes(action);
                    const on = checked.has(perm);

                    return (
                      <td key={action} className="px-2 py-2.5 text-center">
                        {available ? (
                          <button
                            type="button"
                            aria-label={`${on ? "Remove" : "Grant"} ${action} for ${RESOURCE_LABELS[resource]}`}
                            onClick={() => toggle(perm)}
                            disabled={isLocked}
                            className={cn(
                              "mx-auto flex h-4 w-4 items-center justify-center rounded border transition-colors disabled:cursor-default",
                              on ? "bg-primary border-primary" : "border-border hover:border-primary/60"
                            )}
                          >
                            {on && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                          </button>
                        ) : (
                          <span className="block h-4 w-4 mx-auto rounded bg-muted/40" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!isLocked && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">{checked.size} permission{checked.size !== 1 ? "s" : ""} selected</p>
          <Button size="sm" onClick={() => onSave([...checked])} disabled={saving}>
            {saving ? "Saving…" : "Save Permissions"}
          </Button>
        </div>
      )}
    </div>
  );
}

export function Roles() {
  const queryClient = useQueryClient();
  const { tr } = useLanguage();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [newName, setNewName] = useState("");

  const { data, isPending } = useQuery({
    queryKey: ["roles"],
    queryFn: getRoles
  });
  const roles: Role[] = Array.isArray(data?.data) ? data.data : [];

  const createMutation = useMutation({
    mutationFn: (name: string) => createRole({ name, permissions: [] }),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setCreateOpen(false);
      setNewName("");
      toast({ title: "Role created." });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) => updateRole(id, permissions),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setEditRole(null);
      toast({ title: "Permissions saved." });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRole(id),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast({ title: "Role deleted." });
    }
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">{tr.roles.title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{tr.roles.description}</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
          <PlusCircle className="h-3.5 w-3.5" />
          {tr.roles.addRole}
        </Button>
      </div>
      {isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => {
            const locked = LOCKED_ROLES.includes(role.name);
            return (
              <Card key={role._id} className="shadow-sm">
                <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={cn("h-4 w-4", locked ? "text-amber-500" : "text-primary")} />
                    <CardTitle className="text-sm font-semibold capitalize">{role.name}</CardTitle>
                  </div>
                  <div className="flex gap-0.5">
                    <Button variant="ghost" size="icon" className="h-6 w-6" aria-label={`Edit ${role.name}`} onClick={() => setEditRole(role)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    {!locked && (
                      <Button
                        variant="ghost" size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        aria-label={`Delete ${role.name}`}
                        onClick={() => deleteMutation.mutate(role._id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-2">
                    {role.permissions.includes("*")
                      ? "Full access — all permissions"
                      : `${role.permissions.length} permission${role.permissions.length !== 1 ? "s" : ""}`}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.includes("*") ? (
                      <Badge variant="secondary" className="text-xs">wildcard *</Badge>
                    ) : (
                      <>
                        {role.permissions.slice(0, 6).map((p) => (
                          <Badge key={p} variant="secondary" className="text-xs font-mono">{p}</Badge>
                        ))}
                        {role.permissions.length > 6 && (
                          <Badge variant="outline" className="text-xs">+{role.permissions.length - 6} more</Badge>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {/* Create role dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Create Role</DialogTitle></DialogHeader>
          <div className="grid gap-1.5 py-2">
            <Label htmlFor="role-name">Role name</Label>
            <Input
              id="role-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. sales-rep"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">Configure permissions after creating.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{tr.common.cancel}</Button>
            <Button
              disabled={!newName.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate(newName.trim().toLowerCase())}
            >
              {createMutation.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Permission matrix dialog */}
      <Dialog open={!!editRole} onOpenChange={(o) => !o && setEditRole(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="capitalize flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              {editRole?.name} — Permissions
            </DialogTitle>
          </DialogHeader>
          {editRole && (
            <PermissionMatrix
              role={editRole}
              saving={updateMutation.isPending}
              onSave={(permissions) => updateMutation.mutate({ id: editRole._id, permissions })}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
