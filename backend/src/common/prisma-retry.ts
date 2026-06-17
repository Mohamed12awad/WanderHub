import { Prisma } from '@prisma/client';

// Errors worth retrying for a Serializable transaction:
//  - P2034: transaction failed due to a write conflict / deadlock (the engine
//    aborted one of two conflicting transactions to preserve serializability).
//  - P2028: transaction API timeout.
// Prisma does NOT retry these automatically, so without a wrapper concurrent
// financial writes surface as 500s to the user.
const RETRYABLE_CODES = new Set(['P2034', 'P2028']);

/**
 * Runs `fn` (typically a `prisma.$transaction(..., { isolationLevel: Serializable })`)
 * retrying on transient serialization conflicts with exponential backoff + jitter.
 * Non-retryable errors (validation, not-found, etc.) propagate immediately.
 */
export async function withSerializableRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const retryable =
        e instanceof Prisma.PrismaClientKnownRequestError &&
        RETRYABLE_CODES.has(e.code);
      if (!retryable || attempt === maxAttempts) throw e;
      lastError = e;
      const backoff = Math.min(50 * 2 ** (attempt - 1), 500) + Math.random() * 25;
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }
  // Unreachable (loop either returns or throws), but satisfies the type checker.
  throw lastError;
}
