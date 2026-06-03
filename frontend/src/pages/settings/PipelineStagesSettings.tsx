import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getWorkspaceSettings, updateWorkspaceSettings } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export interface PipelineStage {
  key: string;
  label: string;
  color: string;
  isWin: boolean;
  isLoss: boolean;
}

const DEFAULT_STAGES: PipelineStage[] = [
  { key: "lead",        label: "Lead",        color: "#3b82f6", isWin: false, isLoss: false },
  { key: "qualified",   label: "Qualified",   color: "#8b5cf6", isWin: false, isLoss: false },
  { key: "proposal",    label: "Proposal",    color: "#f59e0b", isWin: false, isLoss: false },
  { key: "negotiation", label: "Negotiation", color: "#f97316", isWin: false, isLoss: false },
  { key: "won",         label: "Won",         color: "#10b981", isWin: true,  isLoss: false },
  { key: "lost",        label: "Lost",        color: "#ef4444", isWin: false, isLoss: true  },
  { key: "cancelled",   label: "Cancelled",   color: "#94a3b8", isWin: false, isLoss: true  },
];

function StageRow({
  stage,
  onChange,
}: {
  stage: PipelineStage;
  onChange: (patch: Partial<PipelineStage>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b last:border-0">
      {/* Color swatch */}
      <div className="relative shrink-0">
        <div
          className="h-6 w-6 rounded-full border-2 border-white shadow cursor-pointer ring-1 ring-border"
          style={{ background: stage.color }}
          onClick={() => inputRef.current?.click()}
          title="Click to change color"
        />
        <input
          ref={inputRef}
          type="color"
          value={stage.color}
          onChange={(e) => onChange({ color: e.target.value })}
          className="absolute inset-0 opacity-0 w-0 h-0 pointer-events-none"
        />
      </div>

      {/* Key badge */}
      <Badge variant="outline" className="text-[10px] font-mono shrink-0 capitalize">{stage.key}</Badge>

      {/* Editable label */}
      {editing ? (
        <input
          autoFocus
          className="flex-1 min-w-0 text-sm font-medium bg-transparent border-b border-primary outline-none py-0.5"
          value={stage.label}
          onChange={(e) => onChange({ label: e.target.value })}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEditing(false); }}
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="flex-1 min-w-0 text-sm font-medium text-start hover:text-primary transition-colors truncate"
          title="Click to rename"
        >
          {stage.label}
        </button>
      )}

      {/* Win / Loss toggles */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1.5">
          <Switch
            checked={stage.isWin}
            onCheckedChange={(v) => onChange({ isWin: v, isLoss: v ? false : stage.isLoss })}
            className="scale-75 origin-right"
          />
          <Label className="text-xs text-muted-foreground cursor-pointer">Win</Label>
        </div>
        <div className="flex items-center gap-1.5">
          <Switch
            checked={stage.isLoss}
            onCheckedChange={(v) => onChange({ isLoss: v, isWin: v ? false : stage.isWin })}
            className="scale-75 origin-right"
          />
          <Label className="text-xs text-muted-foreground cursor-pointer">Loss</Label>
        </div>
      </div>
    </div>
  );
}

export default function PipelineStagesSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [stages, setStages] = useState<PipelineStage[]>(DEFAULT_STAGES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getWorkspaceSettings()
      .then((res) => {
        const saved: PipelineStage[] = res.data?.pipelineStages ?? [];
        if (saved.length) {
          // Merge saved labels/colors with defaults to ensure all 7 stages are present
          const merged = DEFAULT_STAGES.map((d) => {
            const s = saved.find((x) => x.key === d.key);
            return s ? { ...d, ...s } : d;
          });
          setStages(merged);
        }
      })
      .catch(() => toast({ title: "Failed to load stages.", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await updateWorkspaceSettings({ pipelineStages: stages } as any);
      queryClient.invalidateQueries({ queryKey: ["workspaceSettings"] });
      toast({ title: "Pipeline stages saved." });
    } catch {
      toast({ title: "Failed to save.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateStage = (key: string, patch: Partial<PipelineStage>) => {
    setStages((prev) => prev.map((s) => s.key === key ? { ...s, ...patch } : s));
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Pipeline Stages</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Rename stages and assign colors. Mark which stages represent a Win or Loss outcome.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-semibold">Deal Stages</CardTitle>
          <CardDescription className="text-xs">
            Click on a label to rename it. Click the color dot to pick a new color.
            Stage keys are fixed and map to your existing deal records.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 mt-3">
          {stages.map((stage) => (
            <StageRow
              key={stage.key}
              stage={stage}
              onChange={(patch) => updateStage(stage.key, patch)}
            />
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save Stages"}
        </Button>
      </div>
    </div>
  );
}
