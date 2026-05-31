export const CURRENCIES = ['EGP', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'Other'] as const;

export type Currency = (typeof CURRENCIES)[number];
