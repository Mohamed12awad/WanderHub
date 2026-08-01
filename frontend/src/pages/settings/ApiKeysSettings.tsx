import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Trash2, Loader2, Plus, KeyRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { getApiKeys, createApiKey, revokeApiKey } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ApiKeysSettings() {
  const { tr, formatDate } = useLanguage();
  const tk = tr.tools.apiKeys;
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["api-keys"], queryFn: getApiKeys });
  const keys = data?.data ?? [];

  const [name, setName] = useState("");
  const [revealKey, setRevealKey] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => createApiKey({ name: name.trim() }),
    onSuccess: (resp) => {
      setRevealKey(resp.data.key);
      setName("");
      qc.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (e: any) =>
      toast({ title: tk.createFailed, description: e?.response?.data?.message ?? "", variant: "destructive" }),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => revokeApiKey(id),
    onSuccess: () => { toast({ title: tk.keyRevoked }); qc.invalidateQueries({ queryKey: ["api-keys"] }); },
    onError: () => toast({ title: tk.revokeFailed, variant: "destructive" }),
  });

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: tk.copied });
  };

  return (
    <div className="page-w-narrow page-pad page-gap">
      <div>
        <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <KeyRound className="h-5 w-5" /> {tk.title}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{tk.desc}</p>
      </div>

      {/* Create */}
      <Card>
        <CardContent className="flex items-end gap-3 p-4">
          <div className="flex-1 space-y-1.5">
            <label className="text-sm font-medium">{tk.keyName}</label>
            <Input
              placeholder={tk.namePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) create.mutate(); }}
            />
          </div>
          <Button disabled={!name.trim() || create.isPending} onClick={() => create.mutate()} className="gap-1.5">
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {tk.create}
          </Button>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardContent className="p-0 divide-y divide-border">
          {keys.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">{tk.none}</div>
          )}
          {keys.map((k) => (
            <div key={k.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{k.name}</span>
                  {k.revokedAt && (
                    <span className="text-[10px] uppercase tracking-wide rounded bg-destructive/10 text-destructive px-1.5 py-0.5">
                      {tk.revoked}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  <code>{k.prefix}…</code> · {k.user?.name}
                  {" · "}{k.lastUsedAt ? tk.lastUsed(formatDate(k.lastUsedAt)) : tk.neverUsed}
                </div>
              </div>
              {!k.revokedAt && (
                <Button
                  variant="ghost" size="sm"
                  className="text-destructive hover:text-destructive gap-1.5"
                  onClick={() => revoke.mutate(k.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> {tk.revoke}
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Reveal-once dialog */}
      <Dialog open={!!revealKey} onOpenChange={(o) => { if (!o) setRevealKey(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tk.newKeyTitle}</DialogTitle>
            <DialogDescription>{tk.newKeyDesc}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-2">
            <code className="text-xs break-all flex-1">{revealKey}</code>
            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" aria-label="Copy API key" onClick={() => revealKey && copy(revealKey)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setRevealKey(null)}>{tk.done}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
