/**
 * Serialization helpers to keep the API response shape identical to the
 * legacy Express + Mongoose backend that the React frontend depends on.
 *
 * Prisma returns `id`; the frontend expects `_id`. Prisma stores the
 * polymorphic link as `linkedToId`; the frontend expects `linkedTo`.
 * These helpers recursively rename those keys on any nested object/array.
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  );
}

/**
 * Recursively converts Prisma documents into Mongoose-style documents:
 *  - `id`          -> `_id`
 *  - `linkedToId`  -> `linkedTo`
 * Applies to nested objects and arrays as well.
 */
export function toClient<T>(input: T): T {
  if (Array.isArray(input)) {
    return input.map((item) => toClient(item)) as unknown as T;
  }
  if (isPlainObject(input)) {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      let outKey = key;
      if (key === 'id') outKey = '_id';
      else if (key === 'linkedToId') outKey = 'linkedTo';
      out[outKey] = toClient(value);
    }
    return out as unknown as T;
  }
  return input;
}
