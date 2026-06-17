/**
 * Serialization helpers to keep the API response shape identical to the
 * legacy Express + Mongoose backend that the React frontend depends on.
 *
 * Prisma returns `id`; the frontend expects `_id`. Prisma stores the
 * polymorphic link as `linkedToId`; the frontend expects `linkedTo`.
 * These helpers recursively rename those keys on any nested object/array.
 */

import { Prisma } from '@prisma/client';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !Buffer.isBuffer(value)
  );
}

/**
 * How Prisma `Decimal` money columns are rendered to the client:
 *  - `number` — plain JS number (legacy finance UI rounds to 2dp). Default.
 *  - `string` — canonical decimal string (e.g. "14.99") for new GL/accounting/
 *    valuation endpoints where exact precision and audit fidelity matter.
 */
export type DecimalMode = 'number' | 'string';

/**
 * Recursively converts Prisma documents into Mongoose-style documents:
 *  - `id`          -> `_id`
 *  - `linkedToId`  -> `linkedTo`
 *  - Decimal       -> number | string (per `mode`)
 * Applies to nested objects and arrays as well.
 */
export function serializeResponse<T>(input: T, mode: DecimalMode = 'number'): T {
  if (Array.isArray(input)) {
    return input.map((item) => serializeResponse(item, mode)) as unknown as T;
  }
  // Money columns are Prisma Decimal; convert here (before isPlainObject) so a
  // Decimal isn't recursed into as a generic object, which would corrupt it.
  if (Prisma.Decimal.isDecimal(input)) {
    const d = input as unknown as Prisma.Decimal;
    return (mode === 'string' ? d.toString() : d.toNumber()) as unknown as T;
  }
  if (isPlainObject(input)) {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      let outKey = key;
      if (key === 'id') outKey = '_id';
      else if (key === 'linkedToId') outKey = 'linkedTo';
      out[outKey] = serializeResponse(value, mode);
    }
    return out as unknown as T;
  }
  return input;
}

/** Convenience: legacy number-mode serialization (used directly by services). */
export function toClient<T>(input: T): T {
  return serializeResponse(input, 'number');
}
