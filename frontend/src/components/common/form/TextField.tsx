import { FieldPath, FieldValues, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface TextFieldProps<T extends FieldValues> {
  name: FieldPath<T>;
  label: string;
  required?: boolean;
  type?: React.HTMLInputTypeAttribute;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  transform?: (value: string) => string;
}

/**
 * Single-line text input wired to RHF + accessible out of the box.
 * FormControl sets aria-invalid and aria-describedby automatically,
 * and FormMessage renders the Zod error below the field.
 */
export function TextField<T extends FieldValues>({
  name,
  label,
  required,
  type = "text",
  placeholder,
  className,
  disabled,
  inputMode,
  maxLength,
  transform,
}: TextFieldProps<T>) {
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
            <Input
              type={type}
              placeholder={placeholder}
              disabled={disabled}
              inputMode={inputMode}
              maxLength={maxLength}
              {...field}
              onChange={(e) => field.onChange(transform ? transform(e.target.value) : e.target.value)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
