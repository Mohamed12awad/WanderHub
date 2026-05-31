export interface CleanOptions {
  /** Additional relation/echo-back keys to strip (besides _id, id, createdAt, updatedAt). */
  relations?: string[];
  /** Fields where '' should become null (e.g. DateTime columns). */
  emptyToNull?: string[];
  /** Fields where '' becomes null and any other string becomes Number(). */
  numeric?: string[];
}

const ALWAYS_STRIP = ['_id', 'id', 'createdAt', 'updatedAt'];

/**
 * Strips read-only / virtual fields that the frontend may echo back on writes,
 * and normalises the owner field (string | { _id } object → ownerId string).
 *
 * Handles the Mongoose-shape legacy where the frontend sends `owner` as either
 * a string id or a `{ _id }` object, and Prisma expects `ownerId`.
 */
export function cleanData(body: Record<string, any>, opts: CleanOptions = {}): Record<string, any> {
  const { owner, ...rest } = body;

  for (const k of [...ALWAYS_STRIP, ...(opts.relations ?? [])]) {
    delete rest[k];
  }

  if (owner !== undefined) {
    rest.ownerId = !owner ? null : typeof owner === 'object' ? (owner._id ?? owner.id) : owner;
  }

  for (const f of opts.emptyToNull ?? []) {
    if (rest[f] === '') rest[f] = null;
  }

  for (const f of opts.numeric ?? []) {
    if (f in rest) rest[f] = rest[f] === '' ? null : Number(rest[f]);
  }

  return rest;
}
