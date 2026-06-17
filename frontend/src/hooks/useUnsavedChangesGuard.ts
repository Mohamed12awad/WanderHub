import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBlocker } from "react-router-dom";

/**
 * Warns before navigating away from a dirty form.
 *
 * - In-app (SPA) link clicks are intercepted with React Router's `useBlocker`
 *   (data-router only — enabled by the createBrowserRouter migration).
 * - Hard refresh / tab close is covered by the native `beforeunload` prompt.
 *
 * Pass `when = formState.isDirty` (RHF) or a local dirty flag. Replaces the
 * hand-rolled `beforeunload` + JSON-diff guards scattered across forms.
 */
export function useUnsavedChangesGuard(when: boolean, message?: string) {
  const text = message ?? "You have unsaved changes. Leave this page?";
  const shouldBlockRef = useRef(when);

  useEffect(() => {
    shouldBlockRef.current = when;
  }, [when]);

  const allowNavigation = useCallback(() => {
    shouldBlockRef.current = false;
  }, []);

  const confirmDiscard = useCallback(() => {
    if (!shouldBlockRef.current) return true;
    const confirmed = window.confirm(text);
    if (confirmed) shouldBlockRef.current = false;
    return confirmed;
  }, [text]);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      shouldBlockRef.current && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (window.confirm(text)) blocker.proceed();
    else blocker.reset();
  }, [blocker, text]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!shouldBlockRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  return { allowNavigation, confirmDiscard };
}

function serializeSnapshot(snapshot: unknown): string {
  return JSON.stringify(snapshot);
}

export function useUnsavedChangesSnapshot(
  snapshot: unknown,
  options: { enabled?: boolean; message?: string } = {},
) {
  const enabled = options.enabled ?? true;
  const serialized = useMemo(() => serializeSnapshot(snapshot), [snapshot]);
  const latestSerializedRef = useRef(serialized);
  const initialRef = useRef<string | null>(null);
  const [baseline, setBaseline] = useState<string | null>(null);

  useEffect(() => {
    latestSerializedRef.current = serialized;
  }, [serialized]);

  useEffect(() => {
    if (!enabled) {
      initialRef.current = null;
      setBaseline(null);
      return;
    }
    if (initialRef.current === null) {
      initialRef.current = serialized;
      setBaseline(serialized);
    }
  }, [enabled, serialized]);

  const resetSnapshot = useCallback((nextSnapshot?: unknown) => {
    const next = nextSnapshot === undefined
      ? latestSerializedRef.current
      : serializeSnapshot(nextSnapshot);
    initialRef.current = next;
    setBaseline(next);
  }, []);

  const isDirty = enabled && baseline !== null && serialized !== baseline;
  const { allowNavigation, confirmDiscard } = useUnsavedChangesGuard(isDirty, options.message);

  return { isDirty, resetSnapshot, allowNavigation, confirmDiscard };
}
