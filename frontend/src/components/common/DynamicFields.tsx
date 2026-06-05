import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useWorkspaceSettings, type FieldDef } from "@/hooks/useWorkspaceSettings";

interface Props {
  module: string;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

const splitOptions = (options?: string) =>
  (options ?? "").split(",").map((o) => o.trim()).filter(Boolean);

export const DynamicFields: React.FC<Props> = ({ module, values, onChange }) => {
  const { getFieldsForModule } = useWorkspaceSettings();
  const fields = getFieldsForModule(module)
    .filter((f) => !f.isSystem)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // Seed any empty fields that declare a default value (once, on mount/field change).
  React.useEffect(() => {
    for (const f of fields) {
      if ((values[f.id] === undefined || values[f.id] === "") && f.defaultValue) {
        onChange(f.id, f.defaultValue);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields.length]);

  if (fields.length === 0) return null;

  return (
    <div className="col-span-2">
      <h2 className="text-lg font-semibold mb-2 mt-4">Custom Fields</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((field) => (
          <FieldInput key={field.id} field={field} value={values[field.id] ?? ""} onChange={onChange} />
        ))}
      </div>
    </div>
  );
};

const FieldInput: React.FC<{
  field: FieldDef;
  value: string;
  onChange: (key: string, value: string) => void;
}> = ({ field, value, onChange }) => {
  const inputId = `cf-${field.id}`;
  const labelEl = (
    <Label className="my-3" htmlFor={inputId}>
      {field.label}
      {field.required && <span className="text-red-700 font-bold ms-1">*</span>}
    </Label>
  );
  const help = field.helpText ? (
    <p className="text-[11px] text-muted-foreground mt-1">{field.helpText}</p>
  ) : null;

  if (field.type === "select") {
    const opts = splitOptions(field.options);
    if (field.multiselect) {
      const selected = value ? value.split(",").map((v) => v.trim()).filter(Boolean) : [];
      const toggle = (opt: string) => {
        const next = selected.includes(opt)
          ? selected.filter((s) => s !== opt)
          : [...selected, opt];
        onChange(field.id, next.join(","));
      };
      return (
        <div className="flex flex-col">
          {labelEl}
          <div className="flex flex-wrap gap-3 rounded-md border p-3">
            {opts.map((opt) => (
              <label key={opt} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <Checkbox checked={selected.includes(opt)} onCheckedChange={() => toggle(opt)} />
                {opt}
              </label>
            ))}
          </div>
          {help}
        </div>
      );
    }
    return (
      <div className="flex flex-col">
        {labelEl}
        <Select value={value} onValueChange={(v) => onChange(field.id, v)}>
          <SelectTrigger id={inputId}>
            <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
          </SelectTrigger>
          <SelectContent>
            {opts.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {help}
      </div>
    );
  }

  if (field.type === "boolean") {
    return (
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-3 mt-4">
          <Switch
            id={inputId}
            checked={value === "true"}
            onCheckedChange={(checked) => onChange(field.id, String(checked))}
          />
          <Label htmlFor={inputId} className="cursor-pointer">{field.label}</Label>
        </div>
        {help}
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="flex flex-col md:col-span-2">
        {labelEl}
        <Textarea
          id={inputId}
          value={value}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          required={field.required}
          onChange={(e) => onChange(field.id, e.target.value)}
        />
        {help}
      </div>
    );
  }

  const inputType =
    field.type === "number" ? "number"
    : field.type === "date" ? "date"
    : field.type === "email" ? "email"
    : field.type === "phone" ? "tel"
    : field.type === "url" ? "url"
    : "text";

  return (
    <div className="flex flex-col">
      {labelEl}
      <Input
        id={inputId}
        type={inputType}
        value={value}
        placeholder={field.placeholder}
        required={field.required}
        min={field.type === "number" ? field.min : undefined}
        max={field.type === "number" ? field.max : undefined}
        maxLength={field.type === "text" ? field.maxLength : undefined}
        pattern={field.pattern}
        onChange={(e) => onChange(field.id, e.target.value)}
      />
      {help}
    </div>
  );
};

export default DynamicFields;
