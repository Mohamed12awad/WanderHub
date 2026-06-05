/**
 * Normalises a record's stored `customFields` JSON (which may hold numbers,
 * booleans, or string arrays) into the `Record<string, string>` shape that the
 * DynamicFields form inputs expect. Multi-select arrays are joined with commas
 * to match the renderer's comma-string contract.
 */
export function toCustomFieldValues(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v === null || v === undefined) continue;
    out[k] = Array.isArray(v) ? v.map(String).join(",") : String(v);
  }
  return out;
}
