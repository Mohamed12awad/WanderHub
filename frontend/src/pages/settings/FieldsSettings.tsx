import { useState } from "react";
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
import { Lock, Trash2, Plus, Info } from "lucide-react";

type FieldType = "text" | "number" | "date" | "select" | "email" | "phone" | "url";
type FieldModule = "customers" | "deals" | "products" | "expenses";

interface SystemField { name: string; type: FieldType; required?: boolean }
interface CustomField { id: string; name: string; type: FieldType; required: boolean; options?: string }

const FIELD_MODULES: FieldModule[] = ["customers", "deals", "products", "expenses"];

const SYSTEM_FIELDS: Record<FieldModule, SystemField[]> = {
  customers: [
    { name: "Name", type: "text", required: true },
    { name: "Email", type: "email" },
    { name: "Phone", type: "phone" },
    { name: "Status", type: "select" },
    { name: "Location", type: "text" },
    { name: "Notes", type: "text" },
  ],
  deals: [
    { name: "Title", type: "text", required: true },
    { name: "Contact", type: "text" },
    { name: "Stage", type: "select", required: true },
    { name: "Value", type: "number" },
    { name: "Currency", type: "text" },
    { name: "Description", type: "text" },
  ],
  products: [
    { name: "Name", type: "text", required: true },
    { name: "Type", type: "text" },
    { name: "Capacity", type: "number" },
    { name: "Location", type: "text" },
    { name: "Price", type: "number" },
    { name: "Description", type: "text" },
  ],
  expenses: [
    { name: "Report Name", type: "text", required: true },
    { name: "Total", type: "number" },
    { name: "Status", type: "select" },
    { name: "Category", type: "select" },
    { name: "Owner", type: "text" },
  ],
};

const STORAGE_KEY = "crm-custom-fields";

function loadCustomFields(): Record<FieldModule, CustomField[]> {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : { customers: [], deals: [], products: [], expenses: [] };
  } catch {
    return { customers: [], deals: [], products: [], expenses: [] };
  }
}

function saveCustomFields(data: Record<FieldModule, CustomField[]>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

const MODULE_LABELS: Record<FieldModule, string> = {
  customers: "Contacts",
  deals: "Deals",
  products: "Products",
  expenses: "Expenses",
};

const FIELD_TYPE_COLORS: Record<FieldType, string> = {
  text: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  number: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  date: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  select: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  email: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  phone: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  url: "bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
};

export default function FieldsSettings() {
  const { tr } = useLanguage();
  const s = tr.settings;

  const [activeModule, setActiveModule] = useState<FieldModule>("customers");
  const [customFields, setCustomFields] = useState<Record<FieldModule, CustomField[]>>(loadCustomFields);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<FieldType>("text");
  const [newRequired, setNewRequired] = useState(false);
  const [newOptions, setNewOptions] = useState("");

  const fields = customFields[activeModule];

  const addField = () => {
    if (!newName.trim()) return;
    const newField: CustomField = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      type: newType,
      required: newRequired,
      options: newType === "select" ? newOptions : undefined,
    };
    const updated = { ...customFields, [activeModule]: [...fields, newField] };
    setCustomFields(updated);
    saveCustomFields(updated);
    setDialogOpen(false);
    setNewName("");
    setNewType("text");
    setNewRequired(false);
    setNewOptions("");
  };

  const deleteField = (id: string) => {
    const updated = { ...customFields, [activeModule]: fields.filter((f) => f.id !== id) };
    setCustomFields(updated);
    saveCustomFields(updated);
  };

  const fieldTypeLabel = (type: FieldType) => s.fieldTypes[type] ?? type;

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{s.fields}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Define and manage fields for each module.</p>
      </div>

      {/* Module tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        {FIELD_MODULES.map((mod) => (
          <button
            key={mod}
            onClick={() => setActiveModule(mod)}
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
          <h3 className="text-sm font-semibold">{s.systemFields}</h3>
          <Lock className="h-3 w-3 text-muted-foreground" />
        </div>
        <div className="rounded-xl border overflow-hidden divide-y">
          {SYSTEM_FIELDS[activeModule].map((field) => (
            <div key={field.name} className="flex items-center gap-3 px-4 py-2.5 bg-muted/20">
              <p className="flex-1 text-sm font-medium">{field.name}</p>
              <Badge variant="outline" className={cn("text-xs capitalize", FIELD_TYPE_COLORS[field.type])}>
                {fieldTypeLabel(field.type)}
              </Badge>
              {field.required && (
                <Badge variant="outline" className="text-xs text-muted-foreground">Required</Badge>
              )}
              <Lock className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            </div>
          ))}
        </div>
      </section>

      {/* Custom fields */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{s.customFields}</h3>
          <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)} className="gap-1.5 h-7 text-xs">
            <Plus className="h-3.5 w-3.5" />
            {s.addField}
          </Button>
        </div>

        {fields.length === 0 ? (
          <div className="rounded-xl border border-dashed px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">{s.noCustomFields}</p>
            <Button size="sm" variant="ghost" className="mt-2 gap-1.5 text-xs" onClick={() => setDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              {s.addField}
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden divide-y">
            {fields.map((field) => (
              <div key={field.id} className="flex items-center gap-3 px-4 py-2.5">
                <p className="flex-1 text-sm font-medium">{field.name}</p>
                <Badge variant="outline" className={cn("text-xs capitalize", FIELD_TYPE_COLORS[field.type])}>
                  {fieldTypeLabel(field.type)}
                </Badge>
                {field.required && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">Required</Badge>
                )}
                <button
                  onClick={() => deleteField(field.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Info banner */}
      <div className="flex gap-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 px-3 py-2.5 text-xs text-blue-700 dark:text-blue-400">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <p>Custom fields are stored locally. Form integration to display and save custom field values is coming in a future update.</p>
      </div>

      {/* Add field dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{s.addField}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="field-name">{s.fieldName}</Label>
              <Input
                id="field-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. LinkedIn URL"
                autoFocus
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="field-type">{s.fieldType}</Label>
              <Select value={newType} onValueChange={(v) => setNewType(v as FieldType)}>
                <SelectTrigger id="field-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(s.fieldTypes) as FieldType[]).map((type) => (
                    <SelectItem key={type} value={type}>{s.fieldTypes[type]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newType === "select" && (
              <div className="grid gap-1.5">
                <Label htmlFor="field-options">{s.fieldOptions}</Label>
                <Input
                  id="field-options"
                  value={newOptions}
                  onChange={(e) => setNewOptions(e.target.value)}
                  placeholder="Option A, Option B, Option C"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                role="switch"
                aria-checked={newRequired}
                onClick={() => setNewRequired((r) => !r)}
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
                  newRequired ? "bg-primary" : "bg-muted-foreground/30"
                )}
              >
                <span className={cn(
                  "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                  newRequired ? "translate-x-4" : "translate-x-0.5"
                )} />
              </button>
              <Label className="cursor-pointer" onClick={() => setNewRequired((r) => !r)}>
                {s.fieldRequired}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{tr.common.cancel}</Button>
            <Button onClick={addField} disabled={!newName.trim()}>{s.addField}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
