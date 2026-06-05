import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Users, CheckCircle2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { getDuplicates, mergeRecords, type DuplicateGroup } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";

type Props = {
  entity: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful merge to refresh the underlying list. */
  onDone?: () => void;
};

const groupKey = (g: DuplicateGroup) => `${g.field}:${g.value}`;

export function DedupDialog({ entity, title, open, onOpenChange, onDone }: Props) {
  const { tr } = useLanguage();
  const d = tr.tools.dedup;
  const queryClient = useQueryClient();
  const [survivors, setSurvivors] = useState<Record<string, string>>({});

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["duplicates", entity],
    queryFn: () => getDuplicates(entity),
    enabled: open,
  });
  const groups = useMemo(() => data?.data ?? [], [data]);

  const survivorFor = (g: DuplicateGroup) => survivors[groupKey(g)] ?? g.records[0].id;

  const merge = useMutation({
    mutationFn: ({ surviveId, mergeIds }: { surviveId: string; mergeIds: string[] }) =>
      mergeRecords(entity, surviveId, mergeIds),
    onSuccess: (resp) => {
      toast({ title: d.merged(resp.data.merged) });
      queryClient.invalidateQueries({ queryKey: [entity] });
      onDone?.();
      refetch();
    },
    onError: (e: any) =>
      toast({ title: d.mergeFailed, description: e?.response?.data?.message ?? "", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{d.title(title.toLowerCase())}</DialogTitle>
          <DialogDescription>{d.desc}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto space-y-3 pe-1">
          {isLoading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}

          {!isLoading && groups.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <p className="text-sm text-muted-foreground">{d.none}</p>
            </div>
          )}

          {groups.map((g) => {
            const key = groupKey(g);
            const surviveId = survivorFor(g);
            return (
              <div key={key} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                  <Users className="h-3.5 w-3.5" />
                  {d.same(g.field)} <span className="font-medium text-foreground">{g.value}</span>
                </div>
                <div className="space-y-1.5">
                  {g.records.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 text-sm cursor-pointer rounded-md px-2 py-1 hover:bg-muted/50">
                      <input
                        type="radio"
                        name={key}
                        checked={surviveId === r.id}
                        onChange={() => setSurvivors((s) => ({ ...s, [key]: r.id }))}
                      />
                      <span className="font-medium">{r.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {r.email ?? ""}{r.email && r.phone ? " · " : ""}{r.phone ?? ""}
                      </span>
                      <span className="ms-auto text-[11px] text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="flex justify-end mt-2">
                  <Button
                    size="sm"
                    disabled={merge.isPending}
                    onClick={() =>
                      merge.mutate({ surviveId, mergeIds: g.records.filter((r) => r.id !== surviveId).map((r) => r.id) })
                    }
                  >
                    {merge.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin me-1.5" />}
                    {d.keepMerge(g.records.length - 1)}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
