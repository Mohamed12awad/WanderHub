import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";

interface Props {
  module: string;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export const DynamicFields: React.FC<Props> = ({ module, values, onChange }) => {
  const { getFieldsForModule } = useWorkspaceSettings();
  const fields = getFieldsForModule(module).filter((f) => !f.isSystem);

  if (fields.length === 0) return null;

  return (
    <div className="col-span-2">
      <h2 className="text-lg font-semibold mb-2 mt-4">Custom Fields</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((field) => {
          const val = values[field.id] ?? "";
          const inputId = `cf-${field.id}`;

          if (field.type === "select" && field.options) {
            const opts = field.options.split(",").map((o) => o.trim()).filter(Boolean);
            return (
              <div key={field.id} className="flex flex-col">
                <Label className="my-3" htmlFor={inputId}>
                  {field.label}
                  {field.required && <span className="text-red-700 font-bold ms-1">*</span>}
                </Label>
                <Select value={val} onValueChange={(v) => onChange(field.id, v)}>
                  <SelectTrigger id={inputId}>
                    <SelectValue placeholder={`Select ${field.label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {opts.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          }

          if (field.type === "boolean") {
            return (
              <div key={field.id} className="flex items-center gap-3 mt-4">
                <Switch
                  id={inputId}
                  checked={val === "true"}
                  onCheckedChange={(checked) => onChange(field.id, String(checked))}
                />
                <Label htmlFor={inputId} className="cursor-pointer">
                  {field.label}
                </Label>
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
            <div key={field.id} className="flex flex-col">
              <Label className="my-3" htmlFor={inputId}>
                {field.label}
                {field.required && <span className="text-red-700 font-bold ms-1">*</span>}
              </Label>
              <Input
                id={inputId}
                type={inputType}
                value={val}
                onChange={(e) => onChange(field.id, e.target.value)}
                required={field.required}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DynamicFields;
