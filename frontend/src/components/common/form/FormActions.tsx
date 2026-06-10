import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface FormActionsProps {
  isSubmitting: boolean;
  onCancel: () => void;
  submitLabel?: string;
  className?: string;
}

/**
 * Standard Save / Cancel button row.
 * Disable-on-submit and loading label are always applied — no double-clicks.
 */
export function FormActions({
  isSubmitting,
  onCancel,
  submitLabel,
  className,
}: FormActionsProps) {
  const { tr } = useLanguage();
  return (
    <div
      className={
        className ??
        "col-span-full flex justify-end gap-2 border-t pt-4 mt-2"
      }
    >
      <Button type="button" variant="outline" onClick={onCancel}>
        {tr.common.cancel}
      </Button>
      <Button type="submit" disabled={isSubmitting} className="px-8">
        {isSubmitting ? tr.common.loading : (submitLabel ?? tr.common.save)}
      </Button>
    </div>
  );
}
