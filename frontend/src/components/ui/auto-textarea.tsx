import * as React from "react";
import { cn } from "@/lib/utils";

export interface AutoTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Initial / minimum number of visible rows. */
  minRows?: number;
  /** Optional cap; the textarea scrolls internally past this many rows. */
  maxRows?: number;
}

/**
 * Textarea that grows with its content from a low default height instead of
 * shipping a tall fixed box. Plays nicely with react-hook-form: it forwards the
 * ref and re-measures whenever `value` changes or the user types.
 */
const AutoTextarea = React.forwardRef<HTMLTextAreaElement, AutoTextareaProps>(
  ({ className, minRows = 2, maxRows, onChange, value, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

    const setRefs = (node: HTMLTextAreaElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref)
        (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
    };

    const resize = React.useCallback(() => {
      const el = innerRef.current;
      if (!el) return;
      el.style.height = "auto";
      let next = el.scrollHeight;
      if (maxRows) {
        const style = window.getComputedStyle(el);
        const lineHeight = parseFloat(style.lineHeight) || 20;
        const paddingY =
          parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
        const borderY =
          parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
        const max = lineHeight * maxRows + paddingY + borderY;
        el.style.overflowY = next > max ? "auto" : "hidden";
        next = Math.min(next, max);
      } else {
        el.style.overflowY = "hidden";
      }
      el.style.height = `${next}px`;
    }, [maxRows]);

    React.useLayoutEffect(() => {
      resize();
    }, [resize, value]);

    return (
      <textarea
        ref={setRefs}
        rows={minRows}
        value={value}
        onChange={(e) => {
          onChange?.(e);
          resize();
        }}
        className={cn(
          "flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
AutoTextarea.displayName = "AutoTextarea";

export { AutoTextarea };
