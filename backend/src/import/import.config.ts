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
  products: {
    permission: 'products:create',
    customFieldsModule: 'products',
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'type', label: 'Type', type: 'enum', enumValues: ['service', 'physical', 'digital', 'subscription'] },
      { key: 'capacity', label: 'Capacity', type: 'number' },
      { key: 'location', label: 'Location' },
      { key: 'description', label: 'Description' },
      { key: 'notes', label: 'Notes' },
    ],
  },
  suppliers: {
    permission: 'suppliers:create',
    customFieldsModule: 'suppliers',
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'taxId', label: 'Tax ID' },
      { key: 'currency', label: 'Currency' },
      { key: 'status', label: 'Status', type: 'enum', enumValues: ['active', 'inactive'] },
      { key: 'notes', label: 'Notes' },
    ],
  },
  projects: {
    permission: 'projects:create',
    customFieldsModule: 'projects',
    fields: [
      { key: 'name', label: 'Name', required: true },
      {
        key: 'status',
        label: 'Status',
        type: 'enum',
        enumValues: ['planning', 'active', 'on_hold', 'completed', 'cancelled'],
      },
      { key: 'priority', label: 'Priority', type: 'enum', enumValues: ['low', 'medium', 'high', 'urgent'] },
      { key: 'budget', label: 'Budget', type: 'number' },
      { key: 'currency', label: 'Currency' },
      { key: 'startDate', label: 'Start Date', type: 'date' },
      { key: 'endDate', label: 'End Date', type: 'date' },
      { key: 'description', label: 'Description' },
    ],
  },
  tasks: {
    permission: 'tasks:create',
    customFieldsModule: 'tasks',
    fields: [
      { key: 'title', label: 'Title', required: true },
      { key: 'status', label: 'Status', type: 'enum', enumValues: ['todo', 'in_progress', 'done', 'cancelled'] },
      { key: 'priority', label: 'Priority', type: 'enum', enumValues: ['low', 'medium', 'high', 'urgent'] },
      { key: 'dueDate', label: 'Due Date', type: 'date' },
      { key: 'estimatedCost', label: 'Estimated Cost', type: 'number' },
      { key: 'description', label: 'Description' },
    ],
  },
  // Chart of Accounts. `normalBalance` is derived from `type` by the service, so
  // it isn't an importable column. `parentCode` is resolved to a parent id.
  'chart-of-accounts': {
    permission: 'accounting:edit',
    fields: [
      { key: 'code', label: 'Code', required: true, hint: 'Must be unique' },
      { key: 'name', label: 'Name', required: true },
      {
        key: 'type',
        label: 'Type',
        required: true,
        type: 'enum',
        enumValues: ['asset', 'liability', 'equity', 'income', 'expense'],
      },
      { key: 'currency', label: 'Currency' },
      { key: 'parentCode', label: 'Parent Code', hint: 'Code of an existing parent account' },
      { key: 'isActive', label: 'Active', type: 'enum', enumValues: ['true', 'false'] },
    ],
  },
};

export type ImportEntity = keyof typeof IMPORT_ENTITIES;
