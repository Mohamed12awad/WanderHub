import { SetMetadata } from '@nestjs/common';

/**
 * Marks a controller or route handler so the global DecimalSerializeInterceptor
 * renders Prisma `Decimal` money columns as canonical decimal *strings*
 * (e.g. "14.99") instead of JS numbers. Use on new GL / accounting / inventory
 * valuation endpoints where exact precision and audit fidelity matter.
 *
 * Legacy finance endpoints omit this and keep `number` (the default).
 */
export const MONEY_AS_STRING = 'money_as_string';

export const MoneyAsString = () => SetMetadata(MONEY_AS_STRING, true);
