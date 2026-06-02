import { z } from "zod";

// Client-side validation schemas. These mirror the backend class-validator DTOs
// (CreateDealDto, CreateProductDto, …) so client and server rules stay aligned.
// Schemas use z.object (unknown keys are stripped), so a form's full state can
// be validated against the relevant subset of fields.

export const dealSchema = z.object({
  title: z.string().trim().min(1, "Deal title is required"),
  customer: z.string().trim().min(1, "Customer is required"),
  price: z.coerce.number({ invalid_type_error: "Valid amount is required" }).positive("Valid amount is required"),
});

export const productSchema = z.object({
  name: z.string().trim().min(1, "Product name is required"),
  type: z.string().trim().min(1, "Product type is required"),
});

export const expenseSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
});

/**
 * Validates `data` against a zod schema and returns a flat
 * { field: message } map (empty when valid) — the shape the existing forms'
 * error state already expects, so it drops in without a full RHF rewrite.
 */
export function zodFieldErrors(schema: z.ZodTypeAny, data: unknown): Record<string, string> {
  const result = schema.safeParse(data);
  if (result.success) return {};
  const errs: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !errs[key]) errs[key] = issue.message;
  }
  return errs;
}
