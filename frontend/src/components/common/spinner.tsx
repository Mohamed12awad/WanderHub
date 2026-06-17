import React, { useEffect } from "react";

interface SpinnerProps {
  loading: boolean;
  /** Optional label shown under the spinner (e.g. "Loading…"). */
  label?: string;
}

/**
 * Full-area loading overlay. Renders absolutely over its nearest positioned
 * ancestor (a page region or the viewport), so it works both for full-page
 * waits and inline sections (e.g. a chart card). Theme-aware: it uses the
 * design tokens so it looks right in both light and dark mode and flips
 * correctly under RTL (no physical left/right offsets).
 */
const LoadingSpinner: React.FC<SpinnerProps> = ({ loading, label }) => {
  useEffect(() => {
    if (loading) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [loading]);

  if (!loading) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative h-11 w-11">
        {/* Track */}
        <div className="absolute inset-0 rounded-full border-[3px] border-muted" />
        {/* Spinning arc in the brand color */}
        <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-primary animate-spin" />
      </div>
      {label && <span className="text-sm font-medium text-muted-foreground">{label}</span>}
      <span className="sr-only">Loading</span>
    </div>
  );
};

export default LoadingSpinner;
