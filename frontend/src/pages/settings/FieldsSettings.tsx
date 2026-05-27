import { useEffect, useRef, useState } from "react";
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Lock, Trash2, Plus, GripVertical, Filter } from "lucide-react";
import { getWorkspaceSettings, updateWorkspaceSettings } from "@/utils/api";
import { toast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";
import type { FieldDef, FieldType } from "@/hooks/useWorkspaceSettings";
import { useQueryClient } from "react-query";

type FieldModule = "customers" | "deals" | "products" | "expenses" | "users" | "tasks" | "activities";

const FIELD_MODULES: FieldModule[] = [
  "customers", "deals", "products", "expenses", "users", "tasks", "activities",
];

const MODULE_LABELS: Record<FieldModule, string> = {
  customers:  "Contacts",
  deals:      "Deals",
  products:   "Products",
  expenses:   "Expenses",
  users:      "Users",
  tasks:      "Tasks",
  activities: "Activities",
};

// All system defaults have filterable: true so every field is searchable out of the box
const SYSTEM_DEFAULTS: Record<FieldModule, Omit<FieldDef, "id" | "order">[]> = {
  customers: [
    { name: "name",   label: "Name",   type: "text",  required: true,  isSystem: true, filterable: true },
    { name: "email",  label: "Email",  type: "email", required: false, isSystem: true, filterable: true },
    { name: "phone",  label: "Phone",  type: "phone", required: false, isSystem: true, filterable: true },
    { name: "mobile", label: "Mobile", type: "phone", required: false, isSystem: true, filterable: true },
    { name: "status", label: "Status", type: "select", required: false, isSystem: true, filterable: true,
      options: "active,inactive,lead,prospect" },
    { name: "gender", label: "Gender", type: "select", required: false, isSystem: true, filterable: true,
      options: "male,female,other" },
    { name: "location", label: "Location", type: "text", required: false, isSystem: true, filterable: true },
    { name: "notes",    label: "Notes",    type: "text", required: false, isSystem: true, filterable: false },
  ],
  deals: [
    { name: "title",    label: "Title",    type: "text",   required: true,  isSystem: true, filterable: true },
    { name: "customer", label: "Contact",  type: "text",   required: true,  isSystem: true, filterable: true },
    { name: "status",   label: "Stage",    type: "select", required: true,  isSystem: true, filterable: true,
      options: "lead,qualified,proposal,negotiation,won,lost,cancelled" },
    { name: "price",    label: "Value",    type: "number", required: false, isSystem: true, filterable: true },
    { name: "currency", label: "Currency", type: "select", required: false, isSystem: true, filterable: true,
      options: "USD,EUR,GBP,EGP,AED,SAR" },
    { name: "source",   label: "Source",   type: "select", required: false, isSystem: true, filterable: true,
      options: "website,referral,cold_call,social_media,other" },
    { name: "expectedCloseDate", label: "Expected Close Date", type: "date", required: false, isSystem: true, filterable: true },
    { name: "createdAt", label: "Created Date", type: "date", required: false, isSystem: true, filterable: true },
    { name: "notes",    label: "Notes",    type: "text",   required: false, isSystem: true, filterable: false },
  ],
  products: [
    { name: "name",     label: "Name",     type: "text",   required: true,  isSystem: true, filterable: true },
    { name: "type",     label: "Type",     type: "select", required: false, isSystem: true, filterable: true,
      options: "service,physical,digital,subscription" },
    { name: "capacity", label: "Capacity", type: "number", required: false, isSystem: true, filterable: true },
    { name: "location", label: "Location", type: "text",   required: false, isSystem: true, filterable: true },
    { name: "createdAt", label: "Created Date", type: "date", required: false, isSystem: true, filterable: true },
    { name: "description", label: "Description", type: "text", required: false, isSystem: true, filterable: false },
  ],
  expenses: [
    { name: "title",    label: "Report Name", type: "text",   required: true,  isSystem: true, filterable: true },
    { name: "approved", label: "Status",      type: "select", required: false, isSystem: true, filterable: true,
      options: "true,false" },
    { name: "category", label: "Category",    type: "select", required: false, isSystem: true, filterable: false,
      options: "marketing,transportation,utilities,meals,lodging,travel,supplies,others" },
    { name: "createdAt", label: "Created Date", type: "date", required: false, isSystem: true, filterable: true },
  ],
  users: [
    { name: "name",   label: "Name",   type: "text",  required: true,  isSystem: true, filterable: true },
    { name: "email",  label: "Email",  type: "email", required: true,  isSystem: true, filterable: true },
    { name: "phone",  label: "Phone",  type: "phone", required: false, isSystem: true, filterable: true },
    { name: "active", label: "Status", type: "select", required: false, isSystem: true, filterable: true,
      options: "true,false" },
    { name: "role",   label: "Role",   type: "text",  required: true,  isSystem: true, filterable: false },
    { name: "createdAt", label: "Created Date", type: "date", required: false, isSystem: true, filterable: true },
  ],
  tasks: [
    { name: "title",    label: "Title",    type: "text",   required: true,  isSystem: true, filterable: true },
    { name: "status",   label: "Status",   type: "select", required: false, isSystem: true, filterable: true,
      options: "todo,in_progress,done,cancelled" },
    { name: "priority", label: "Priority", type: "select", required: false, isSystem: true, filterable: true,
      options: "low,medium,high,urgent" },
    { name: "dueDate",  label: "Due Date", type: "date",   required: false, isSystem: true, filterable: true },
    { name: "assignedTo", label: "Assigned To", type: "text", required: false, isSystem: true, filterable: true },
    { name: "createdAt", label: "Created Date", type: "date", required: false, isSystem: true, filterable: true },
    { name: "description", label: "Description", type: "text", required: false, isSystem: true, filterable: false },
  ],
  activities: [
    { name: "title",  label: "Title",  type: "text",   required: true,  isSystem: true, filterable: true },
    { name: "type",   label: "Type",   type: "select", required: true,  isSystem: true, filterable: true,
      options: "call,meeting,email,task,note,other" },
    { name: "status", label: "Status", type: "select", required: false, isSystem: true, filterable: true,
      options: "pending,completed,cancelled" },
    { name: "date",   label: "Date",   type: "date",   required: true,  isSystem: true, filterable: true },
    { name: "assignedTo", label: "Assigned To", type: "text", required: false, isSystem: true, filterable: true },
    { name: "createdAt", label: "Created Date", type: "date", required: false, isSystem: true, filterable: true },
    { name: "description", label: "Description", type: "text", required: false, isSystem: true, filterable: false },
  ],
};

const FIELD_TYPE_COLORS: Record<FieldType, string> = {
  text:    "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  number:  "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  date:    "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  select:  "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  email:   "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  phone:   "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  url:     "bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  boolean: "bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

const FIELD_TYPES: FieldType[] = ["text", "number", "date", "select", "email", "phone", "url", "boolean"];

export default function FieldsSettings() {
  const { tr } = useLanguage();
  const s = tr.settings;
  const queryClient = useQueryClient();

  const [activeModule, setActiveModule] = useState<FieldModule>("customers");
  const [fieldGroups, setFieldGroups] = useState<Record<FieldModule, FieldDef[]>>(
    Object.fromEntries(FIELD_MODULES.map((m) => [m, []])) as unknown as Record<FieldModule, FieldDef[]>
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<FieldType>("text");
  const [newRequired, setNewRequired] = useState(false);
  const [newFilterable, setNewFilterable] = useState(true);
  const [newOptions, setNewOptions] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getWorkspaceSettings()
      .then((res) => {
        const groups: { module: string; fields: FieldDef[] }[] = res.data?.fieldGroups ?? [];
        const parsed = Object.fromEntries(FIELD_MODULES.map((m) => [m, []])) as unknown as Record<FieldModule, FieldDef[]>;
        groups.forEach((g) => {
          if (FIELD_MODULES.includes(g.module as FieldModule)) {
            parsed[g.module as FieldModule] = g.fields;
          }
        });
        // Seed system fields for any module that hasn't been saved yet
        for (const mod of FIELD_MODULES) {
          if (!parsed[mod].some((f) => f.isSystem)) {
            parsed[mod] = [
              ...SYSTEM_DEFAULTS[mod].map((d, i) => ({ id: `sys_${mod}_${d.name}`, order: i, ...d })),
              ...parsed[mod],
            ];
          }
        }
        setFieldGroups(parsed);
      })
      .catch(() => toast({ title: "Failed to load field settings", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  const persist = async (updated: Record<FieldModule, FieldDef[]>) => {
    setSaving(true);
    try {
      await updateWorkspaceSettings({
        fieldGroups: FIELD_MODULES.map((m) => ({ module: m, fields: updated[m] })),
      });
      queryClient.invalidateQueries(["workspaceSettings"]);
      toast({ title: "Saved." });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (id: string, patch: Partial<FieldDef>) => {
    const updated = {
      ...fieldGroups,
      [activeModule]: fieldGroups[activeModule].map((f) => f.id === id ? { ...f, ...patch } : f),
    };
    setFieldGroups(updated);
    return updated;
  };

  const saveFieldPatch = async (id: string, patch: Partial<FieldDef>) => {
    await persist(updateField(id, patch));
  };

  const deleteField = async (id: string) => {
    const updated = {
      ...fieldGroups,
      [activeModule]: fieldGroups[activeModule].filter((f) => f.id !== id),
    };
    setFieldGroups(updated);
    await persist(updated);
  };

  const resetDialog = () => {
    setNewName(""); setNewType("text"); setNewRequired(false);
    setNewFilterable(true); setNewOptions("");
  };

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
      options: newType === "select" ? newOptions : undefined,
      order: fieldGroups[activeModule].length,
    };
    const updated = { ...fieldGroups, [activeModule]: [...fieldGroups[activeModule], field] };
    setFieldGroups(updated);
    setDialogOpen(false);
    resetDialog();
    await persist(updated);
  };

  const fields = fieldGroups[activeModule];
  const systemFields = fields.filter((f) => f.isSystem);
  const customFields = fields.filter((f) => !f.isSystem);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{s.fields}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Edit labels, options, and required status. Toggle{" "}
          <span className="inline-flex items-center gap-0.5 font-medium">
            <Filter className="h-3 w-3" /> Filter
          </span>{" "}
          to make a field searchable in list views.
        </p>
      </div>

      {/* Module tabs — two rows on small screens */}
      <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1 w-fit">
        {FIELD_MODULES.map((mod) => (
          <button
            key={mod}
            onClick={() => { setActiveModule(mod); setEditingId(null); }}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              activeModule === mod
                ? "bg-white dark:bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {MODULE_LABELS[mod]}
          </button>
        ))}
      </div>

      {/* System fields */}
      <section className="space-y-2">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold">System Fields</h3>
          <Lock className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-foreground/55">— rename, edit options &amp; toggle filter</span>
        </div>
        <div className="rounded-xl border overflow-hidden divide-y">
          {systemFields.map((field) => (
            <FieldRow
              key={field.id}
              field={field}
              isSystem
              editingId={editingId}
              editRef={editRef}
              onStartEdit={() => setEditingId(field.id)}
              onLabelChange={(label) => updateField(field.id, { label })}
              onLabelSave={(label) => { setEditingId(null); saveFieldPatch(field.id, { label }); }}
              onOptionsChange={(options) => saveFieldPatch(field.id, { options })}
              onRequiredChange={(required) => saveFieldPatch(field.id, { required })}
              onFilterableChange={(filterable) => saveFieldPatch(field.id, { filterable })}
              saving={saving}
            />
          ))}
        </div>
      </section>

      {/* Custom fields */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{s.customFields}</h3>
          <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}
            className="gap-1.5 h-7 text-xs" disabled={saving}>
            <Plus className="h-3.5 w-3.5" />{s.addField}
          </Button>
        </div>

        {customFields.length === 0 ? (
          <div className="rounded-xl border border-dashed px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">{s.noCustomFields}</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Use "+ Add Field" above to create custom fields for this module.</p>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden divide-y">
            {customFields.map((field) => (
              <FieldRow
                key={field.id}
                field={field}
                isSystem={false}
                editingId={editingId}
                editRef={editRef}
                onStartEdit={() => setEditingId(field.id)}
                onLabelChange={(label) => updateField(field.id, { label })}
                onLabelSave={(label) => { setEditingId(null); saveFieldPatch(field.id, { label }); }}
                onOptionsChange={(options) => saveFieldPatch(field.id, { options })}
                onRequiredChange={(required) => saveFieldPatch(field.id, { required })}
                onFilterableChange={(filterable) => saveFieldPatch(field.id, { filterable })}
                onDelete={() => deleteField(field.id)}
                saving={saving}
              />
            ))}
          </div>
        )}
      </section>

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
            {newType === "select" && (
              <div className="grid gap-1.5">
                <Label htmlFor="fo">{s.fieldOptions}</Label>
                <Input id="fo" value={newOptions} onChange={(e) => setNewOptions(e.target.value)}
                  placeholder="Option A, Option B, Option C" />
                <p className="text-[11px] text-muted-foreground">Comma-separated values</p>
              </div>
            )}
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

// ── Field row ─────────────────────────────────────────────────────────────────

interface FieldRowProps {
  field: FieldDef;
  isSystem: boolean;
  editingId: string | null;
  editRef: React.RefObject<HTMLInputElement>;
  onStartEdit: () => void;
  onLabelChange: (v: string) => void;
  onLabelSave: (v: string) => void;
  onOptionsChange: (v: string) => void;
  onRequiredChange: (v: boolean) => void;
  onFilterableChange: (v: boolean) => void;
  onDelete?: () => void;
  saving: boolean;
}

function FieldRow({
  field, isSystem, editingId, editRef,
  onStartEdit, onLabelChange, onLabelSave,
  onOptionsChange, onRequiredChange, onFilterableChange,
  onDelete, saving,
}: FieldRowProps) {
  const isEditing = editingId === field.id;
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [optionsDraft, setOptionsDraft] = useState(field.options ?? "");

  return (
    <div className="px-4 py-3 bg-card">
      <div className="flex items-center gap-2 min-w-0">
        <GripVertical className="h-4 w-4 text-muted-foreground/30 shrink-0" />

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

        {/* Right-side controls — always consistent layout across rows */}
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className={cn("text-xs", FIELD_TYPE_COLORS[field.type])}>
            {field.type}
          </Badge>

          {/* Required */}
          <div className="flex items-center gap-1" title="Required">
            <Switch checked={!!field.required} onCheckedChange={onRequiredChange}
              disabled={saving} className="scale-[0.7] origin-right" />
            <span className="text-xs text-foreground/60">Req</span>
          </div>

          {/* Filterable */}
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
