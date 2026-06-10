import { FieldPath, FieldValues, useFormContext } from "react-hook-form";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface TextareaFieldProps<T extends FieldValues> {
  name: FieldPath<T>;
  label: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  /** Initial visible rows; the field auto-expands past this as content grows. */
  rows?: number;
  disabled?: boolean;
}

export function TextareaField<T extends FieldValues>({
  name,
  label,
  required,
  placeholder,
  className,
  rows = 2,
  disabled,
}: TextareaFieldProps<T>) {
  const { control } = useFormContext<T>();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className ?? "mb-3"}>
          <FormLabel>
            {label}
            {required && <span className="text-destructive ms-1">*</span>}
          </FormLabel>
          <FormControl>
            <AutoTextarea
              placeholder={placeholder}
              disabled={disabled}
              minRows={rows}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
