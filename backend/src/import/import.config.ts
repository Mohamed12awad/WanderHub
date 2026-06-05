export type ImportFieldType = 'string' | 'number' | 'enum' | 'date';

export interface ImportField {
  /** Target key passed to the entity's create() service. */
  key: string;
  label: string;
  required?: boolean;
  /** Defaults to 'string'. */
  type?: ImportFieldType;
  /** Allowed values for `enum` fields (matched case-insensitively). */
  enumValues?: string[];
  /** Short helper shown in the mapping UI. */
  hint?: string;
}

export interface ImportEntityConfig {
  /** Permission required to import this entity — same base as create. */
  permission: string;
  /** When a row doesn't map an owner, default it to the importing user. */
  defaultOwner?: boolean;
  /**
   * WorkspaceConfig fieldGroups key whose custom fields are importable into this
   * entity's `customFields` JSON. Set on entities that have a `customFields`
   * column (customers, leads, deals, …).
   */
  customFieldsModule?: string;
  fields: ImportField[];
}

/**
 * Registry of entities that support CSV import. Each new row is fed through the
 * entity's existing create() service, so imports inherit the same validation,
 * dedup, timeline logging and notifications as manual creation.
 */
export const IMPORT_ENTITIES: Record<string, ImportEntityConfig> = {
  customers: {
    permission: 'contacts:create',
    defaultOwner: true,
    customFieldsModule: 'customers',
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'phone', label: 'Phone', required: true, hint: 'Must be unique' },
      { key: 'email', label: 'Email', hint: 'Must be unique' },
      { key: 'mobile', label: 'Mobile' },
      { key: 'gender', label: 'Gender' },
      { key: 'location', label: 'Location' },
      { key: 'source', label: 'Source' },
      { key: 'status', label: 'Status' },
      { key: 'notes', label: 'Notes' },
    ],
  },
  leads: {
    permission: 'leads:create',
    defaultOwner: true,
    customFieldsModule: 'leads',
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'company', label: 'Company' },
      { key: 'jobTitle', label: 'Job Title' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'mobile', label: 'Mobile' },
      { key: 'website', label: 'Website' },
      { key: 'city', label: 'City' },
      { key: 'country', label: 'Country' },
      { key: 'source', label: 'Source' },
      { key: 'campaign', label: 'Campaign' },
      {
        key: 'status',
        label: 'Status',
        type: 'enum',
        enumValues: ['new', 'contacted', 'nurturing', 'qualified', 'unqualified', 'converted'],
      },
      { key: 'rating', label: 'Rating', type: 'enum', enumValues: ['cold', 'warm', 'hot'] },
      { key: 'budget', label: 'Budget', type: 'number' },
      { key: 'currency', label: 'Currency' },
      { key: 'notes', label: 'Notes' },
    ],
  },
  deals: {
    permission: 'deals:create',
    defaultOwner: true,
    customFieldsModule: 'deals',
    fields: [
      { key: 'title', label: 'Title', required: true },
      {
        key: 'customerRef',
        label: 'Customer',
        required: true,
        hint: 'Matches an existing contact by phone, email, or name',
      },
      { key: 'price', label: 'Amount', required: true, type: 'number' },
      { key: 'currency', label: 'Currency' },
      {
        key: 'status',
        label: 'Status',
        type: 'enum',
        enumValues: ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'cancelled'],
      },
      { key: 'priority', label: 'Priority' },
      { key: 'source', label: 'Source' },
      { key: 'notes', label: 'Notes' },
    ],
  },
};

export type ImportEntity = keyof typeof IMPORT_ENTITIES;
