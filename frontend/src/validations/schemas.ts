import { z } from "zod";

// Client-side validation schemas. These mirror the backend class-validator DTOs
// (CreateDealDto, CreateProductDto, …) so client and server rules stay aligned.
// Schemas use z.object (unknown keys are stripped), so a form's full state can
// be validated against the relevant subset of fields.

export const dealSchema = z.object({
  title: z.string().trim().min(1, "Deal title is required"),
  customer: z.string().trim().min(1, "Customer is required"),
  price: z.coerce.number().positive("Valid amount is required"),
});

export const productSchema = z.object({
  name: z.string().trim().min(1, "Product name is required"),
  type: z.string().trim().min(1, "Product type is required"),
});

export const expenseSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
});

const optionalEmail = z.string().trim().email("Invalid email").optional().or(z.literal(""));
const optionalUrl = z.string().trim().url("Invalid website URL").optional().or(z.literal(""));

export const customerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  // Contact type + optional structured identity fields. These are supplementary —
  // `name` stays the canonical required field. `.nullish()` so the API's `null`
  // for an empty column never trips validation on the edit form.
  type: z.enum(["individual", "company"]).optional(),
  firstName: z.string().nullish(),
  lastName: z.string().nullish(),
  companyName: z.string().nullish(),
  taxId: z.string().nullish(),
  phone: z.string().trim().min(1, "Phone is required"),
  mobile: z.string().optional(),
  email: optionalEmail,
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  website: optionalUrl,
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  }),
  identification: z.object({
    passportNumber: z.string().optional(),
    nationalId: z.string().optional(),
  }),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  preferredContactMethod: z.string().optional(),
  paymentInformation: z.object({
    cardType: z.string().optional(),
    cardNumber: z.string().optional(),
    expirationDate: z.string().optional(),
  }),
  loyaltyProgram: z.object({
    memberId: z.string().optional(),
    points: z.string().optional(),
  }),
  emergencyContact: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    relationship: z.string().optional(),
  }),
  location: z.string().optional(),
  source: z.string().optional(),
  status: z.string().optional(),
  owner: z.string().trim().min(1, "Owner is required"),
  notes: z.string().optional(),
}).superRefine((val, ctx) => {
  if (val.type === "company") {
    if (!val.companyName?.trim())
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["companyName"], message: "Company name is required" });
  } else {
    // individual (the default when type is omitted)
    if (!val.firstName?.trim())
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["firstName"], message: "First name is required" });
    if (!val.lastName?.trim())
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["lastName"], message: "Last name is required" });
  }
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
