import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, GripVertical, Plus } from "lucide-react";
import { getWorkspaceSettings, updateWorkspaceSettings } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

const slugify = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

function StageRow({
  stage, onChange, onDelete,
}: {
  stage: PipelineStage;
  onChange: (patch: Partial<PipelineStage>) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: stage.key });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const [editing, setEditing] = useState(false);

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 px-4 py-3 border-b last:border-0 bg-card">
      {/* Drag handle */}
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab active:cursor-grabbing touch-none text-muted-foreground/40 hover:text-muted-foreground"
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Color swatch */}
      <label className="relative shrink-0 cursor-pointer" title="Click to change color">
        <div className="h-6 w-6 rounded-full border-2 border-white shadow ring-1 ring-border" style={{ background: stage.color || "#94a3b8" }} />
        <input
          type="color"
          value={stage.color}
          onChange={(e) => onChange({ color: e.target.value })}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </label>

      {/* Key badge */}
      <Badge variant="outline" className="text-[10px] font-mono shrink-0">{stage.key}</Badge>

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
        <button onClick={onDelete} className="p-1 rounded text-destructive opacity-60 hover:opacity-100 hover:bg-muted" title="Delete stage">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
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
  const [newLabel, setNewLabel] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    getWorkspaceSettings()
      .then((res) => {
        const saved: PipelineStage[] = res.data?.pipelineStages ?? [];
        if (saved.length) setStages(saved);
      })
      .catch(() => toast({ title: "Failed to load stages.", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [toast]);

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

  const updateStage = (key: string, patch: Partial<PipelineStage>) =>
    setStages((prev) => prev.map((s) => s.key === key ? { ...s, ...patch } : s));

  const deleteStage = (key: string) =>
    setStages((prev) => prev.filter((s) => s.key !== key));

  const addStage = () => {
    const label = newLabel.trim();
    if (!label) return;
    const base = slugify(label) || "stage";
    let key = base;
    let i = 2;
    while (stages.some((s) => s.key === key)) key = `${base}_${i++}`;
    setStages((prev) => [...prev, { key, label, color: "#64748b", isWin: false, isLoss: false }]);
    setNewLabel("");
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = stages.findIndex((s) => s.key === active.id);
    const newIdx = stages.findIndex((s) => s.key === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = [...stages];
    const [moved] = next.splice(oldIdx, 1);
    next.splice(newIdx, 0, moved);
    setStages(next);
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Pipeline Stages</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Drag to reorder, rename, recolor, add or remove stages. The order here is the column
          order on your deal pipeline board. Mark which stages count as a Win or Loss.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-semibold">Deal Stages</CardTitle>
          <CardDescription className="text-xs">
            Click a label to rename, the dot to recolor, and the grip to reorder. Deleting a stage
            does not delete deals — move them to another stage first so they stay visible on the board.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 mt-3">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={stages.map((s) => s.key)} strategy={verticalListSortingStrategy}>
              {stages.map((stage) => (
                <StageRow
                  key={stage.key}
                  stage={stage}
                  onChange={(patch) => updateStage(stage.key, patch)}
                  onDelete={() => deleteStage(stage.key)}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* Add stage */}
          <form
            className="flex gap-2 px-4 py-3 border-t"
            onSubmit={(e) => { e.preventDefault(); addStage(); }}
          >
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="New stage name…"
              className="h-8"
            />
            <Button type="submit" size="sm" className="h-8 gap-1" disabled={!newLabel.trim()}>
              <Plus className="h-3.5 w-3.5" />Add stage
            </Button>
          </form>
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
