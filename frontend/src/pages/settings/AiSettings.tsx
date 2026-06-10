import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Check, Loader2, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/authContext";
import {
  getAiConfig, setAiConfig, setAiKey, removeAiKey, type AiProviderName,
} from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";

const PROVIDERS: { value: AiProviderName; label: string }[] = [
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "google", label: "Google (Gemini)" },
  { value: "openai", label: "OpenAI (ChatGPT)" },
];

export default function AiSettings() {
  const { tr } = useLanguage();
  const s = tr.tools.aiSettings;
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = (user?.permissions ?? []).some((p) => p === '*' || p === 'settings:manage');
  const { data } = useQuery({ queryKey: ["ai-config"], queryFn: getAiConfig });
  const cfg = data?.data;

  const [provider, setProvider] = useState<AiProviderName>("anthropic");
  const [model, setModel] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (cfg) { setProvider(cfg.provider); setModel(cfg.model); setEnabled(cfg.enabled); }
  }, [cfg]);

  const saveConfig = useMutation({
    mutationFn: () => setAiConfig({ provider, model, enabled }),
    onSuccess: () => { toast({ title: s.saved }); qc.invalidateQueries({ queryKey: ["ai-config"] }); },
    onError: (e: any) => toast({ title: s.saveFailed, description: e?.response?.data?.message ?? "", variant: "destructive" }),
  });

  const saveKey = useMutation({
    mutationFn: ({ p, scope }: { p: AiProviderName; scope: "workspace" | "user" }) =>
      setAiKey(p, keyInputs[`${scope}:${p}`] ?? "", scope),
    onSuccess: (_d, v) => {
      toast({ title: s.keySaved });
      setKeyInputs((k) => ({ ...k, [`${v.scope}:${v.p}`]: "" }));
      qc.invalidateQueries({ queryKey: ["ai-config"] });
    },
    onError: (e: any) => toast({ title: s.saveFailed, description: e?.response?.data?.message ?? "", variant: "destructive" }),
  });

  const delKey = useMutation({
    mutationFn: ({ p, scope }: { p: AiProviderName; scope: "workspace" | "user" }) => removeAiKey(p, scope),
    onSuccess: () => { toast({ title: s.keyRemoved }); qc.invalidateQueries({ queryKey: ["ai-config"] }); },
  });

  const keyRow = (p: AiProviderName, scope: "workspace" | "user") => {
    const configured = (scope === "workspace" ? cfg?.workspaceProviders : cfg?.userProviders)?.includes(p);
    const field = `${scope}:${p}`;
    return (
      <div className="flex items-center gap-2">
        <Input
          type="password" placeholder={configured ? s.keyPlaceholderSet : s.keyPlaceholder}
          value={keyInputs[field] ?? ""}
          onChange={(e) => setKeyInputs((k) => ({ ...k, [field]: e.target.value }))}
        />
        <Button size="sm" disabled={!keyInputs[field] || saveKey.isPending} onClick={() => saveKey.mutate({ p, scope })}>
          {s.save}
        </Button>
        {configured && (
          <Button size="icon" variant="ghost" className="h-9 w-9 text-destructive" onClick={() => delKey.mutate({ p, scope })}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <Sparkles className="h-5 w-5" /> {s.title}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{s.desc}</p>
      </div>

      {/* Active provider + model (admin) */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{s.activeProvider}</span>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={enabled} disabled={!isAdmin} onChange={(e) => setEnabled(e.target.checked)} />
              {s.enabled}
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
              value={provider} disabled={!isAdmin}
              onChange={(e) => setProvider(e.target.value as AiProviderName)}
            >
              {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <Input
              placeholder={cfg?.defaultModels?.[provider] ?? "model"} value={model}
              disabled={!isAdmin} onChange={(e) => setModel(e.target.value)}
            />
          </div>
          {isAdmin && (
            <Button onClick={() => saveConfig.mutate()} disabled={saveConfig.isPending} className="gap-1.5">
              {saveConfig.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {s.save}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Workspace keys (admin) */}
      {isAdmin && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <span className="text-sm font-medium">{s.workspaceKeys}</span>
            {PROVIDERS.map((p) => (
              <div key={p.value} className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {p.label}
                  {cfg?.workspaceProviders?.includes(p.value) && (
                    <span className="inline-flex items-center gap-0.5 text-emerald-600"><Check className="h-3 w-3" /> {s.set}</span>
                  )}
                </div>
                {keyRow(p.value, "workspace")}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Personal override (any user) */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <span className="text-sm font-medium">{s.personalTitle}</span>
          <p className="text-xs text-muted-foreground">{s.personalDesc(provider)}</p>
          {keyRow(provider, "user")}
        </CardContent>
      </Card>
    </div>
  );
}
