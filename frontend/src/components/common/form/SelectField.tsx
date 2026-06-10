import { FieldPath, FieldValues, useFormContext } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps<T extends FieldValues> {
  name: FieldPath<T>;
  label: string;
  options: SelectOption[];
  required?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function SelectField<T extends FieldValues>({
  name,
  label,
  options,
  required,
  placeholder,
  className,
  disabled,
}: SelectFieldProps<T>) {
  const { control } = useFormContext<T>();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        // A controlled Radix Select renders blank when its value matches no
        // <SelectItem>. When loading a saved record whose stored value isn't in
        // the predefined list (e.g. a status missing from the options, or a
        // deal stage that was since removed from the pipeline), inject it so the
        // value still shows instead of an empty trigger.
        const value = field.value ?? "";
        const visibleOptions =
          value && !options.some((opt) => opt.value === value)
            ? [...options, { value, label: String(value) }]
            : options;
        return (
        <FormItem className={className ?? "mb-3"}>
          <FormLabel>
            {label}
            {required && <span className="text-destructive ms-1">*</span>}
          </FormLabel>
          {/* key={value} forces Radix to repaint the trigger when the value is
              set programmatically (e.g. form.reset on edit). Without it the
              trigger can keep showing the initial/default value. */}
          <Select
            key={value}
            value={value}
            onValueChange={field.onChange}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent className="max-h-48 overflow-y-auto">
              {visibleOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
        );
      }}
    />
  );
}
