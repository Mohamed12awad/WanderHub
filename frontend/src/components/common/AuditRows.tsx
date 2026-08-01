import { InfoRow } from "@/components/common/InfoRow";
import { MetaField } from "@/components/common/MetaGrid";
import { useLanguage } from "@/contexts/LanguageContext";

interface UserRef {
  _id?: string;
  name?: string;
}

export interface AuditFields {
  /** Creator relation. Accepts `createdBy` or an entity-specific owner field. */
  createdBy?: UserRef | string | null;
  createdAt?: string | null;
  /** Auto-stamped last editor (Prisma `updatedBy` relation). */
  updatedBy?: UserRef | string | null;
  updatedAt?: string | null;
}

const name = (u: AuditFields["createdBy"]): string | null =>
  u && typeof u === "object" ? u.name ?? null : null;

/**
 * Shared "Created by / Created at / Modified by / Last updated" rows for any
 * detail view. Modified-by is auto-populated by the backend `updatedBy` stamping
 * extension. Pass the record; each row hides itself when its data is missing.
 *
 *   <AuditRows record={formData} createdByField={formData.userId} />
 */
export function AuditRows({
  record,
  createdByField,
  variant = "rows",
}: {
  record: AuditFields;
  /** Override the creator source when the entity names it differently (e.g. `userId`, `owner`). */
  createdByField?: UserRef | string | null;
  /** "rows" → InfoRow (160px label grid); "meta" → MetaField (for MetaGrid layouts). */
  variant?: "rows" | "meta";
}) {
  const { formatDate } = useLanguage();
  const dt = (v?: string | null) => v ? formatDate(v, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : null;
  const creator = name(createdByField ?? record.createdBy);
  const editor = name(record.updatedBy);
  const Row = variant === "meta" ? MetaField : InfoRow;

  return (
    <>
      {creator && <Row label="Created by" value={creator} />}
      {record.createdAt && <Row label="Created At" value={dt(record.createdAt)} />}
      {editor && <Row label="Modified by" value={editor} />}
      {record.updatedAt && <Row label="Last updated" value={dt(record.updatedAt)} />}
    </>
  );
}
