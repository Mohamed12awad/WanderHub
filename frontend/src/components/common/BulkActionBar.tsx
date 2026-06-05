import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, UserCog, CircleDot, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { toast } from "@/components/ui/use-toast";
import { bulkAction, getUsers } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";

type Props = {
  entity: string;
  ids: string[];
  /** Status choices for "Set status"; omit to hide that action. */
  statusOptions?: { value: string; label: string }[];
  /** React Query key of the list to invalidate after an action. */
  queryKey: string;
  onClear: () => void;
};

export function BulkActionBar({ entity, ids, statusOptions, queryKey, onClear }: Props) {
  const { tr } = useLanguage();
  const b = tr.tools.bulk;
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: usersResp } = useQuery({ queryKey: ["users-min"], queryFn: () => getUsers() });
  const usersRaw = (usersResp?.data?.data ?? usersResp?.data ?? []) as { _id?: string; id?: string; name: string }[];
  const users = usersRaw.map((u) => ({ id: u._id ?? u.id ?? "", name: u.name })).filter((u) => u.id);

  const run = useMutation({
    mutationFn: (payload: { action: "delete" | "assignOwner" | "setStatus"; value?: string }) =>
      bulkAction(entity, { ids, ...payload }),
    onSuccess: (resp) => {
      const { updated, failed } = resp.data;
      toast({
        title: failed.length ? b.updatedFailed(updated, failed.length) : b.updated(updated),
        variant: failed.length ? "destructive" : undefined,
      });
      qc.invalidateQueries({ queryKey: [queryKey] });
      onClear();
    },
    onError: (e: any) =>
      toast({ title: b.actionFailed, description: e?.response?.data?.message ?? "", variant: "destructive" }),
  });

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-sm">
      <ConfirmDialog
        open={confirmDelete}
        onConfirm={() => { setConfirmDelete(false); run.mutate({ action: "delete" }); }}
        onCancel={() => setConfirmDelete(false)}
      />
      <span className="text-sm font-medium">{b.selected(ids.length)}</span>
      {run.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}

      <div className="ms-auto flex items-center gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5">
              <UserCog className="h-3.5 w-3.5" /> {b.assignOwner}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
            <DropdownMenuLabel>{b.assignTo}</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => run.mutate({ action: "assignOwner", value: "" })}>
              {b.unassigned}
            </DropdownMenuItem>
            {users.map((u) => (
              <DropdownMenuItem key={u.id} onClick={() => run.mutate({ action: "assignOwner", value: u.id })}>
                {u.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {statusOptions && statusOptions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <CircleDot className="h-3.5 w-3.5" /> {b.setStatus}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
              {statusOptions.map((o) => (
                <DropdownMenuItem key={o.value} onClick={() => run.mutate({ action: "setStatus", value: o.value })}>
                  {o.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Button
          variant="outline" size="sm"
          className="h-8 gap-1.5 text-destructive hover:text-destructive"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="h-3.5 w-3.5" /> {b.delete}
        </Button>

        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClear}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
