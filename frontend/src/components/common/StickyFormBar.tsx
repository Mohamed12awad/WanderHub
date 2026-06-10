import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface StickyFormBarProps {
  isSubmitting: boolean;
  onCancel: () => void;
  submitLabel?: string;
  /** Optional left-aligned content (e.g. a status summary). */
  children?: ReactNode;
}

/**
 * Save / Cancel bar pinned to the bottom of the viewport so the primary form
 * actions stay reachable no matter how long the form scrolls. The submit button
 * targets the enclosing <form> via type="submit".
 */
export function StickyFormBar({
  isSubmitting,
  onCancel,
  submitLabel,
  children,
}: StickyFormBarProps) {
  const { tr } = useLanguage();
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-2 flex items-center gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:-mx-6 md:px-6">
      <div className="min-w-0 flex-1">{children}</div>
      <Button type="button" variant="outline" onClick={onCancel}>
        {tr.common.cancel}
      </Button>
      <Button type="submit" disabled={isSubmitting} className="px-8">
        {isSubmitting ? tr.common.loading : (submitLabel ?? tr.common.save)}
      </Button>
    </div>
  );
}
