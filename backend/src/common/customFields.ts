/**
 * Builds Prisma JSON path conditions for custom field filters.
 * Query params prefixed with `cf_` are treated as custom field filters.
 * e.g. cf_loyalty_tier=Gold  →  customFields->>'loyalty_tier' ILIKE '%Gold%'
 */
export function buildCfConditions(query: Record<string, string>): any[] {
  const conditions: any[] = [];
  for (const [key, value] of Object.entries(query)) {
    if (key.startsWith('cf_') && value) {
      const fieldId = key.slice(3);
      conditions.push({
        customFields: { path: [fieldId], string_contains: value },
      });
    }
  }
  return conditions;
}
