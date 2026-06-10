import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel,
} from "@/components/ui/select";
import {
  Lock, Trash2, Plus, GripVertical, Filter, ChevronDown, ChevronRight, FolderPlus,
  Users2, UserSearch, Handshake, Package, Briefcase, CheckSquare, CalendarDays,
  Banknote, Truck, FileText, Receipt, ClipboardCheck, ShoppingCart, ClipboardList, Users,
} from "lucide-react";
import { getWorkspaceSettings, updateWorkspaceSettings } from "@/utils/api";
import { toast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";
import type { FieldDef, FieldType, SectionDef } from "@/hooks/useWorkspaceSettings";
import { useQueryClient } from "@tanstack/react-query";
import {
  DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragOverEvent, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  FIELD_MODULES, MODULE_LABELS, SYSTEM_DEFAULTS, DEFAULT_SECTIONS,
  FIELD_TYPE_COLORS, FIELD_TYPES, primarySectionId, type FieldModule,
} from "@/config/fieldDefaults";

type FieldMap = Record<FieldModule, FieldDef[]>;
type SectionMap = Record<FieldModule, SectionDef[]>;

const MODULE_ICONS: Record<FieldModule, React.ElementType> = {
  customers: Users2, leads: UserSearch, deals: Handshake, products: Package,
  projects: Briefcase, tasks: CheckSquare, activities: CalendarDays, expenses: Banknote,
  suppliers: Truck, quotes: FileText, invoices: Receipt, salesOrders: ClipboardCheck,
  purchaseOrders: ShoppingCart, vendorBills: ClipboardList, users: Users,
};

// Modules grouped by domain for the rail/dropdown (covers all 15 in FIELD_MODULES).
const MODULE_GROUPS: { label: string; modules: FieldModule[] }[] = [
  { label: "CRM",          modules: ["customers", "leads", "deals", "activities"] },
  { label: "Operations",   modules: ["products", "projects", "tasks"] },
  { label: "Sales",        modules: ["quotes", "salesOrders", "invoices"] },
  { label: "Procurement",  modules: ["suppliers", "purchaseOrders", "vendorBills"] },
  { label: "Finance & Team", modules: ["expenses", "users"] },
];

const emptyMap = <T,>(val: () => T) =>
  Object.fromEntries(FIELD_MODULES.map((m) => [m, val()])) as unknown as Record<FieldModule, T>;

/**
 * Reorders fields so they are grouped contiguously by section (in section order)
 * and re-indexes `order`. Fields pointing at a missing section fall back to the
 * first section. Array sort is stable, so intra-section order is preserved.
 */
function normalizeFields(fields: FieldDef[], sections: SectionDef[]): FieldDef[] {
  const rank = new Map(sections.map((s, i) => [s.id, i]));
  const primary = sections[0]?.id;
  const fixed = fields.map((f) => ({
    ...f,
    section: f.section && rank.has(f.section) ? f.section : primary,
  }));
  return [...fixed]
    .sort((a, b) => (rank.get(a.section!) ?? 0) - (rank.get(b.section!) ?? 0))
    .map((f, i) => ({ ...f, order: i }));
}

export default function FieldsSettings() {
  const { tr } = useLanguage();
  const s = tr.settings;
  const queryClient = useQueryClient();

  const [activeModule, setActiveModule] = useState<FieldModule>("customers");
  const [fieldGroups, setFieldGroups] = useState<FieldMap>(() => emptyMap<FieldDef[]>(() => []));
  const [sectionGroups, setSectionGroups] = useState<SectionMap>(() => emptyMap<SectionDef[]>(() => []));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<FieldType>("text");
  const [newSection, setNewSection] = useState<string>("");
  const [newRequired, setNewRequired] = useState(false);
  const [newFilterable, setNewFilterable] = useState(true);
  const [newOptions, setNewOptions] = useState("");
  const [newMultiselect, setNewMultiselect] = useState(false);
  const [newDefault, setNewDefault] = useState("");
  const [newPlaceholder, setNewPlaceholder] = useState("");
  const [newHelp, setNewHelp] = useState("");
  const [newMin, setNewMin] = useState("");
  const [newMax, setNewMax] = useState("");
  const [newPattern, setNewPattern] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const editRef = useRef<HTMLInputElement>(null);

  // Drag working state (a clone mutated during drag; committed on drop).
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dndContainers, setDndContainers] = useState<string[] | null>(null);
  const [dndItems, setDndItems] = useState<Record<string, string[]> | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    getWorkspaceSettings()
      .then((res) => {
        const groups: { module: string; fields: FieldDef[]; sections?: SectionDef[] }[] =
          res.data?.fieldGroups ?? [];
        const fg = emptyMap<FieldDef[]>(() => []);
        const sg = emptyMap<SectionDef[]>(() => []);

        for (const mod of FIELD_MODULES) {
          const saved = groups.find((g) => g.module === mod);
          const defaults = DEFAULT_SECTIONS[mod];
          const defaultIds = new Set(defaults.map((s) => s.id));

          // Sections: start from current defaults, overlaid with saved label/order.
          // Keep saved sections only if they are a current default OR user-created
          // (`sec_…`) — this drops sections from older default layouts so a changed
          // default structure migrates cleanly instead of duplicating.
          const byId = new Map<string, SectionDef>(defaults.map((s) => [s.id, { ...s }]));
          (saved?.sections ?? []).forEach((sv) => {
            const isDefault = defaultIds.has(sv.id);
            const isCustom = sv.id.startsWith("sec_");
            if (!isDefault && !isCustom) return;
            const base = byId.get(sv.id);
            byId.set(sv.id, {
              id: sv.id,
              label: sv.label ?? base?.label ?? sv.id,
              order: sv.order ?? base?.order ?? byId.size,
            });
          });
          const sections = [...byId.values()]
            .sort((a, b) => a.order - b.order)
            .map((s, i) => ({ ...s, order: i }));
          const secIds = new Set(sections.map((s) => s.id));

          // Fields: inject any missing system defaults (so new system fields show up).
          const sysDefaults = SYSTEM_DEFAULTS[mod].map((d, i) => ({
            id: `sys_${mod}_${d.name}`, order: i, ...d,
          }));
          const defaultSectionById = new Map(sysDefaults.map((d) => [d.id, d.section]));
          const existing = saved?.fields ? [...saved.fields] : [];
          const existingIds = new Set(existing.map((f) => f.id));
          const missing = sysDefaults.filter((d) => !existingIds.has(d.id));
          const merged = [...missing, ...existing];

          // Resolve each field's section: honour the saved/assigned section when it
          // still exists; otherwise fall back to the field's canonical default
          // section (so fields land correctly after a default-layout change).
          const primary = sections[0]?.id;
          const resolved = merged.map((f) => {
            if (f.section && secIds.has(f.section)) return f;
            const def = defaultSectionById.get(f.id);
            return { ...f, section: def && secIds.has(def) ? def : primary };
          });

          fg[mod] = normalizeFields(resolved, sections);
          sg[mod] = sections;
        }
        setFieldGroups(fg);
        setSectionGroups(sg);
      })
      .catch(() => toast({ title: "Failed to load field settings", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  const persist = async (fields: FieldMap, sections: SectionMap) => {
    setSaving(true);
    try {
      await updateWorkspaceSettings({
        fieldGroups: FIELD_MODULES.map((m) => ({
          module: m,
          fields: normalizeFields(fields[m], sections[m]),
          sections: sections[m],
        })),
      });
      queryClient.invalidateQueries({ queryKey: ["workspaceSettings"] });
      toast({ title: "Saved." });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const commitLayout = async (fields: FieldDef[], sections: SectionDef[]) => {
    const normalized = normalizeFields(fields, sections);
    const nextFields = { ...fieldGroups, [activeModule]: normalized };
    const nextSections = { ...sectionGroups, [activeModule]: sections };
    setFieldGroups(nextFields);
    setSectionGroups(nextSections);
    await persist(nextFields, nextSections);
  };

  // ── Field-level edits ──────────────────────────────────────────────────────
  const updateField = (id: string, patch: Partial<FieldDef>) => {
    const updated = {
      ...fieldGroups,
      [activeModule]: fieldGroups[activeModule].map((f) => (f.id === id ? { ...f, ...patch } : f)),
    };
    setFieldGroups(updated);
    return updated;
  };

  const saveFieldPatch = async (id: string, patch: Partial<FieldDef>) => {
    await persist(updateField(id, patch), sectionGroups);
  };

  const deleteField = async (id: string) => {
    const updated = {
      ...fieldGroups,
      [activeModule]: fieldGroups[activeModule].filter((f) => f.id !== id),
    };
    setFieldGroups(updated);
    await persist(updated, sectionGroups);
  };

  // ── Section-level edits ────────────────────────────────────────────────────
  const sections = useMemo(() => sectionGroups[activeModule] ?? [], [activeModule, sectionGroups]);
  const fields = useMemo(() => fieldGroups[activeModule] ?? [], [activeModule, fieldGroups]);

  const addSection = async () => {
    const next: SectionDef = {
      id: `sec_${crypto.randomUUID().slice(0, 8)}`,
      label: "New Section",
      order: sections.length,
    };
    await commitLayout(fields, [...sections, next]);
  };

  const renameSection = async (id: string, label: string) => {
    setEditingSectionId(null);
    await commitLayout(fields, sections.map((s) => (s.id === id ? { ...s, label } : s)));
  };

  const deleteSection = async (id: string) => {
    if (sections.length <= 1) {
      toast({ title: "A module needs at least one section", variant: "destructive" });
      return;
    }
    const remaining = sections.filter((s) => s.id !== id);
    const fallback = remaining[0].id;
    const movedFields = fields.map((f) => (f.section === id ? { ...f, section: fallback } : f));
    await commitLayout(movedFields, remaining);
  };

  // ── Add custom field ───────────────────────────────────────────────────────
  const resetDialog = () => {
    setNewName(""); setNewType("text"); setNewRequired(false);
    setNewFilterable(true); setNewOptions(""); setNewMultiselect(false);
    setNewDefault(""); setNewPlaceholder(""); setNewHelp("");
    setNewMin(""); setNewMax(""); setNewPattern("");
    setNewSection(sections[0]?.id ?? "");
  };

  const openAddDialog = () => { setNewSection(sections[0]?.id ?? ""); setDialogOpen(true); };

  const addField = async () => {
    if (!newName.trim()) return;
    const field: FieldDef = {
      id: crypto.randomUUID(),
      name: newName.trim().toLowerCase().replace(/\s+/g, "_"),
      label: newName.trim(),
      type: newType,
      required: newRequired,
      filterable: newFilterable,
      isSystem: false,
      section: newSection || sections[0]?.id || primarySectionId(activeModule),
      options: newType === "select" ? newOptions : undefined,
      order: fields.length,
      ...(newType === "select" && newMultiselect ? { multiselect: true } : {}),
      ...(newDefault.trim() ? { defaultValue: newDefault.trim() } : {}),
      ...(newPlaceholder.trim() ? { placeholder: newPlaceholder.trim() } : {}),
      ...(newHelp.trim() ? { helpText: newHelp.trim() } : {}),
      ...(newType === "number" && newMin !== "" ? { min: Number(newMin) } : {}),
      ...(newType === "number" && newMax !== "" ? { max: Number(newMax) } : {}),
      ...((newType === "text" || newType === "textarea" || newType === "phone") && newPattern.trim()
        ? { pattern: newPattern.trim() } : {}),
    };
    setDialogOpen(false);
    resetDialog();
    await commitLayout([...fields, field], sections);
  };

  // ── Drag & drop (sections + fields, multi-container) ───────────────────────
  const byId = useMemo(() => new Map(fields.map((f) => [f.id, f])), [fields]);
  const sectionById = useMemo(() => new Map(sections.map((s) => [s.id, s])), [sections]);

  // Static (non-dragging) layout derived from state. These must be referentially
  // stable across renders — passing fresh arrays to dnd-kit's SortableContext on
  // every render triggers its measuring loop ("Maximum update depth exceeded").
  const staticContainers = useMemo(() => sections.map((s) => s.id), [sections]);
  const staticItems = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const sct of sections) map[sct.id] = [];
    for (const f of fields) {
      const sec = f.section && map[f.section] ? f.section : sections[0]?.id;
      if (sec) map[sec].push(f.id);
    }
    return map;
  }, [fields, sections]);

  const containers = useMemo(() => dndContainers ?? staticContainers, [dndContainers, staticContainers]);
  const items = useMemo(() => dndItems ?? staticItems, [dndItems, staticItems]);

  const findContainer = (id: string): string | undefined => {
    if (containers.includes(id)) return id;
    return containers.find((c) => items[c]?.includes(id));
  };

  const onDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
    setDndContainers(staticContainers);
    setDndItems(staticItems);
  };

  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over || active.data.current?.type === "container") return;
    const activeC = findContainer(String(active.id));
    const overC = findContainer(String(over.id));
    if (!activeC || !overC || activeC === overC) return;

    setDndItems((prev) => {
      if (!prev) return prev;
      const activeItems = prev[activeC];
      const overItems = prev[overC];
      const overIsContainer = containers.includes(String(over.id));
      const overIndex = overIsContainer ? overItems.length : overItems.indexOf(String(over.id));
      const insertAt = overIndex >= 0 ? overIndex : overItems.length;
      return {
        ...prev,
        [activeC]: activeItems.filter((id) => id !== String(active.id)),
        [overC]: [...overItems.slice(0, insertAt), String(active.id), ...overItems.slice(insertAt)],
      };
    });
  };

  const finishDrag = () => {
    setActiveId(null);
    setDndContainers(null);
    setDndItems(null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    const workingContainers = dndContainers ?? staticContainers;
    const workingItems = dndItems ?? staticItems;
    if (!over) { finishDrag(); return; }

    let finalContainers = workingContainers;
    let finalItems = workingItems;

    if (active.data.current?.type === "container") {
      const overC = findContainer(String(over.id));
      const from = workingContainers.indexOf(String(active.id));
      const to = overC ? workingContainers.indexOf(overC) : -1;
      if (from >= 0 && to >= 0 && from !== to) {
        finalContainers = arrayMove(workingContainers, from, to);
      }
    } else {
      const c = findContainer(String(active.id));
      const overC = findContainer(String(over.id));
      if (c && overC && c === overC) {
        const list = workingItems[c];
        const from = list.indexOf(String(active.id));
        const to = containers.includes(String(over.id))
          ? list.length - 1
          : list.indexOf(String(over.id));
        if (from >= 0 && to >= 0 && from !== to) {
          finalItems = { ...workingItems, [c]: arrayMove(list, from, to) };
        }
      }
    }

    // Rebuild flat field list + section order from working maps.
    const newSections = finalContainers
      .map((cid, i) => ({ ...(sectionById.get(cid) as SectionDef), order: i }))
      .filter(Boolean);
    const flat: FieldDef[] = [];
    finalContainers.forEach((cid) => {
      (finalItems[cid] ?? []).forEach((fid) => {
        const f = byId.get(fid);
        if (f) flat.push({ ...f, section: cid });
      });
    });
    finishDrag();
    void commitLayout(flat, newSections);
  };

  const activeField = activeId ? byId.get(activeId) : undefined;
  const activeSection = activeId ? sectionById.get(activeId) : undefined;

  const customCount = fields.filter((f) => !f.isSystem).length;

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  const selectModule = (mod: FieldModule) => {
    setActiveModule(mod);
    setEditingId(null);
    setEditingSectionId(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{s.fields}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Organize fields into sections, drag to reorder, and edit labels, options &amp; required
          status. Toggle{" "}
          <span className="inline-flex items-center gap-0.5 font-medium">
            <Filter className="h-3 w-3" /> Filter
          </span>{" "}
          to make a field searchable in list views.
        </p>
      </div>

      <div className="flex gap-6 items-start">
        {/* Module rail — grouped vertical list on desktop (mirrors the settings nav) */}
        <aside className="hidden sm:flex sm:flex-col w-48 shrink-0 gap-3 sticky top-6 self-start">
          {MODULE_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                {group.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.modules.map((mod) => {
                  const Icon = MODULE_ICONS[mod];
                  const active = activeModule === mod;
                  return (
                    <button
                      key={mod}
                      onClick={() => selectModule(mod)}
                      className={cn(
                        "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-start transition-colors",
                        active
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-foreground/65 hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {active && <span className="absolute left-0 inset-y-1.5 w-[3px] rounded-full bg-primary" />}
                      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-foreground/50")} />
                      {MODULE_LABELS[mod]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>

        {/* Editor column */}
        <div className="flex-1 min-w-0 max-w-2xl space-y-6">
          {/* Module picker — grouped dropdown on mobile */}
          <div className="sm:hidden">
            <Select value={activeModule} onValueChange={(v) => selectModule(v as FieldModule)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODULE_GROUPS.map((group) => (
                  <SelectGroup key={group.label}>
                    <SelectLabel>{group.label}</SelectLabel>
                    {group.modules.map((mod) => (
                      <SelectItem key={mod} value={mod}>{MODULE_LABELS[mod]}</SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {sections.length} section{sections.length === 1 ? "" : "s"} · {fields.length} fields
              {customCount > 0 && ` · ${customCount} custom`}
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={addSection}
                className="gap-1.5 h-7 text-xs" disabled={saving}>
                <FolderPlus className="h-3.5 w-3.5" />Add Section
              </Button>
              <Button size="sm" variant="outline" onClick={openAddDialog}
                className="gap-1.5 h-7 text-xs" disabled={saving}>
                <Plus className="h-3.5 w-3.5" />{s.addField}
              </Button>
            </div>
          </div>

      {/* Sections + fields */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={finishDrag}
      >
        <SortableContext items={containers} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {containers.map((cid) => {
              const section = sectionById.get(cid);
              if (!section) return null;
              const sectionFields = (items[cid] ?? [])
                .map((id) => byId.get(id))
                .filter((f): f is FieldDef => !!f);
              return (
                <SectionCard
                  key={cid}
                  section={section}
                  fieldIds={items[cid] ?? []}
                  collapsed={!!collapsed[cid]}
                  onToggleCollapse={() => setCollapsed((c) => ({ ...c, [cid]: !c[cid] }))}
                  isEditing={editingSectionId === cid}
                  onStartEdit={() => setEditingSectionId(cid)}
                  onRename={(label) => renameSection(cid, label)}
                  onDelete={() => deleteSection(cid)}
                  canDelete={sections.length > 1}
                  saving={saving}
                >
                  {sectionFields.map((field) => (
                    <SortableFieldRow
                      key={field.id}
                      field={field}
                      editingId={editingId}
                      editRef={editRef}
                      onStartEdit={() => setEditingId(field.id)}
                      onLabelChange={(label) => updateField(field.id, { label })}
                      onLabelSave={(label) => { setEditingId(null); saveFieldPatch(field.id, { label }); }}
                      onOptionsChange={(options) => saveFieldPatch(field.id, { options })}
                      onRequiredChange={(required) => saveFieldPatch(field.id, { required })}
                      onFilterableChange={(filterable) => saveFieldPatch(field.id, { filterable })}
                      onDelete={field.isSystem ? undefined : () => deleteField(field.id)}
                      saving={saving}
                    />
                  ))}
                  {sectionFields.length === 0 && (
                    <div className="px-4 py-6 text-center text-xs text-muted-foreground/70">
                      Drag fields here
                    </div>
                  )}
                </SectionCard>
              );
            })}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeField ? (
            <div className="rounded-lg border bg-card px-4 py-3 shadow-lg text-sm font-medium flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              {activeField.label}
            </div>
          ) : activeSection ? (
            <div className="rounded-xl border bg-card px-4 py-2.5 shadow-lg text-sm font-semibold">
              {activeSection.label}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
        </div>
      </div>

      {/* Add field dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetDialog(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{s.addField}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="fn">{s.fieldName}</Label>
              <Input id="fn" value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. LinkedIn URL" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="ft">{s.fieldType}</Label>
                <Select value={newType} onValueChange={(v) => setNewType(v as FieldType)}>
                  <SelectTrigger id="ft"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{s.fieldTypes?.[t] ?? t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fsec">Section</Label>
                <Select value={newSection} onValueChange={setNewSection}>
                  <SelectTrigger id="fsec"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sections.map((sct) => (
                      <SelectItem key={sct.id} value={sct.id}>{sct.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {newType === "select" && (
              <>
                <div className="grid gap-1.5">
                  <Label htmlFor="fo">{s.fieldOptions}</Label>
                  <Input id="fo" value={newOptions} onChange={(e) => setNewOptions(e.target.value)}
                    placeholder="Option A, Option B, Option C" />
                  <p className="text-[11px] text-muted-foreground">Comma-separated values</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={newMultiselect} onCheckedChange={setNewMultiselect} id="fms" />
                  <Label htmlFor="fms" className="cursor-pointer">Allow multiple selections</Label>
                </div>
              </>
            )}
            {newType === "number" && (
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="fmin">Min</Label>
                  <Input id="fmin" type="number" value={newMin} onChange={(e) => setNewMin(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="fmax">Max</Label>
                  <Input id="fmax" type="number" value={newMax} onChange={(e) => setNewMax(e.target.value)} />
                </div>
              </div>
            )}
            {(newType === "text" || newType === "textarea" || newType === "phone") && (
              <div className="grid gap-1.5">
                <Label htmlFor="fpat">Pattern (regex)</Label>
                <Input id="fpat" value={newPattern} onChange={(e) => setNewPattern(e.target.value)}
                  placeholder="e.g. ^[A-Z]{2}-\d+$" />
              </div>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="fdef">Default value</Label>
              <Input id="fdef" value={newDefault} onChange={(e) => setNewDefault(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="fph">Placeholder</Label>
              <Input id="fph" value={newPlaceholder} onChange={(e) => setNewPlaceholder(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="fhelp">Help text</Label>
              <Input id="fhelp" value={newHelp} onChange={(e) => setNewHelp(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={newRequired} onCheckedChange={setNewRequired} id="fr" />
              <Label htmlFor="fr" className="cursor-pointer">{s.fieldRequired}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={newFilterable} onCheckedChange={setNewFilterable} id="ff" />
              <Label htmlFor="ff" className="cursor-pointer flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                Show in filter panel
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetDialog(); }}>
              {tr.common.cancel}
            </Button>
            <Button onClick={addField} disabled={!newName.trim() || saving}>{s.addField}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Section card (sortable container) ───────────────────────────────────────────

interface SectionCardProps {
  section: SectionDef;
  fieldIds: string[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onRename: (label: string) => void;
  onDelete: () => void;
  canDelete: boolean;
  saving: boolean;
  children: React.ReactNode;
}

function SectionCard({
  section, fieldIds, collapsed, onToggleCollapse, isEditing,
  onStartEdit, onRename, onDelete, canDelete, saving, children,
}: SectionCardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id, data: { type: "container" } });
  const [draft, setDraft] = useState(section.label);
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-xl border bg-muted/20 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/40">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab active:cursor-grabbing touch-none text-muted-foreground/50 hover:text-muted-foreground"
          title="Drag to reorder section"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button type="button" onClick={onToggleCollapse}
          className="shrink-0 text-muted-foreground hover:text-foreground">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {isEditing ? (
          <input
            autoFocus
            className="flex-1 min-w-0 text-sm font-semibold bg-transparent border-b border-primary outline-none py-0.5"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => onRename(draft.trim() || section.label)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onRename(draft.trim() || section.label);
              if (e.key === "Escape") { setDraft(section.label); onRename(section.label); }
            }}
          />
        ) : (
          <button onClick={onStartEdit}
            className="flex-1 min-w-0 text-start text-sm font-semibold hover:text-primary transition-colors truncate"
            title="Click to rename section">
            {section.label}
          </button>
        )}

        <span className="text-[11px] text-muted-foreground shrink-0">{fieldIds.length}</span>
        {canDelete && (
          <button onClick={onDelete} disabled={saving} title="Delete section"
            className="shrink-0 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {!collapsed && (
        <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
          <div className="divide-y">{children}</div>
        </SortableContext>
      )}
    </div>
  );
}

// ── Field row ─────────────────────────────────────────────────────────────────

interface FieldRowProps {
  field: FieldDef;
  editingId: string | null;
  editRef: React.RefObject<HTMLInputElement | null>;
  onStartEdit: () => void;
  onLabelChange: (v: string) => void;
  onLabelSave: (v: string) => void;
  onOptionsChange: (v: string) => void;
  onRequiredChange: (v: boolean) => void;
  onFilterableChange: (v: boolean) => void;
  onDelete?: () => void;
  saving: boolean;
  dragListeners?: Record<string, unknown>;
  dragAttributes?: Record<string, unknown>;
  setActivatorNodeRef?: (el: HTMLElement | null) => void;
}

// Sortable wrapper for draggable field rows (system + custom).
function SortableFieldRow(props: Omit<FieldRowProps, "dragListeners" | "dragAttributes" | "setActivatorNodeRef">) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.field.id, data: { type: "item" } });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <FieldRow
        {...props}
        dragAttributes={attributes as unknown as Record<string, unknown>}
        dragListeners={listeners as unknown as Record<string, unknown>}
        setActivatorNodeRef={setActivatorNodeRef}
      />
    </div>
  );
}

function FieldRow({
  field, editingId, editRef,
  onStartEdit, onLabelChange, onLabelSave,
  onOptionsChange, onRequiredChange, onFilterableChange,
  onDelete, saving, dragListeners, dragAttributes, setActivatorNodeRef,
}: FieldRowProps) {
  const isEditing = editingId === field.id;
  const isSystem = !!field.isSystem;
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [optionsDraft, setOptionsDraft] = useState(field.options ?? "");

  return (
    <div className="px-4 py-3 bg-card">
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...(dragAttributes ?? {})}
          {...(dragListeners ?? {})}
          className="shrink-0 cursor-grab active:cursor-grabbing touch-none text-muted-foreground/40 hover:text-muted-foreground"
          title="Drag to reorder or move between sections"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Editable label */}
        {isEditing ? (
          <input
            ref={editRef}
            autoFocus
            className="flex-1 min-w-0 text-sm font-medium bg-transparent border-b border-primary outline-none py-0.5"
            value={field.label}
            onChange={(e) => onLabelChange(e.target.value)}
            onBlur={() => onLabelSave(field.label)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") onLabelSave(field.label);
            }}
          />
        ) : (
          <button
            onClick={onStartEdit}
            className="flex-1 min-w-0 text-sm font-medium text-start hover:text-primary transition-colors truncate"
            title="Click to rename"
          >
            {field.label}
          </button>
        )}

        {/* Right-side controls */}
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className={cn("text-xs", FIELD_TYPE_COLORS[field.type])}>
            {field.type}
          </Badge>

          <div className="flex items-center gap-1" title="Required">
            <Switch checked={!!field.required} onCheckedChange={onRequiredChange}
              disabled={saving} className="scale-[0.7] origin-right" />
            <span className="text-xs text-foreground/60">Req</span>
          </div>

          {/* Filterable — meaningful for custom fields (auto-generated list filters). */}
          {!isSystem && (
            <button
              onClick={() => onFilterableChange(!field.filterable)}
              disabled={saving}
              title="Show in filter panel"
              className={cn(
                "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-all",
                field.filterable
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input text-foreground/60 hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <Filter className="h-2.5 w-2.5" />
              Filter
            </button>
          )}

          {/* Options — always rendered so column width is stable; hidden for non-select */}
          <button
            onClick={() => { setOptionsDraft(field.options ?? ""); setOptionsOpen(true); }}
            className={cn(
              "text-[10px] rounded border px-1.5 py-0.5 transition-colors",
              field.type === "select"
                ? "text-foreground/70 border-border hover:bg-muted hover:text-foreground"
                : "invisible pointer-events-none"
            )}
          >
            Options
          </button>

          {isSystem
            ? <Lock className="h-3.5 w-3.5 text-muted-foreground/30" />
            : (
              <button onClick={onDelete} disabled={saving}
                className="text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )
          }
        </div>
      </div>

      {/* Inline options editor */}
      {optionsOpen && (
        <div className="mt-3 ms-7 flex items-center gap-2">
          <Input autoFocus className="h-7 text-xs flex-1" placeholder="A, B, C"
            value={optionsDraft} onChange={(e) => setOptionsDraft(e.target.value)} />
          <Button size="sm" className="h-7 text-xs px-3"
            onClick={() => { onOptionsChange(optionsDraft); setOptionsOpen(false); }}>
            Save
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs px-2"
            onClick={() => setOptionsOpen(false)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
