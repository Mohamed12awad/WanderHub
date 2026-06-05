import { useMemo } from "react";
import { GenericTable } from "@/components/common/GenericTable";
import LeadRow from "./leadRow";
import { deleteLead, getLeads } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";
import type { FilterConfig } from "@/components/common/GenericTable";

type Lead = {
  _id: string;
  name: string;
  company?: string;
  status: string;
  rating?: string;
  phone?: string;
  source?: string;
  owner?: { _id: string; name: string } | null;
  createdAt: string;
};

export function Leads() {
  const { tr } = useLanguage();
  const l = tr.leads;

  const LEAD_FILTERS = useMemo<FilterConfig[]>(() => [
    { label: l.fields.source, field: "source", type: "text" },
    { label: l.fields.rating, field: "rating", type: "text" },
    { label: tr.contacts.filters.createdDate, field: "createdAt", type: "date-range" },
  ], [l, tr]);

  return (
    <GenericTable<Lead>
      queryKey="leads"
      fetchData={({ page, limit, q, filters, sort, dir }) =>
        getLeads({ page, limit, q, ...(sort ? { sort, dir } : {}), ...filters })
      }
      deleteData={deleteLead}
      headers={l.headers}
      sortableHeaders={["Name", "Created"]}
      quickStatusFilter={{
        field: "status",
        options: Object.entries(l.statuses).map(([value, label]) => ({ value, label })),
      }}
      renderRow={(item, handleDelete, selectionCell) => (
        <LeadRow key={item._id} item={item} handleDelete={handleDelete} selectionCell={selectionCell} />
      )}
      title={l.title}
      description={l.description}
      addLink="/leads/add"
      addLabel={l.add}
      importConfig={{ entity: "leads", title: "Leads" }}
      dedupConfig={{ entity: "leads", title: "Leads" }}
      bulkConfig={{
        entity: "leads",
        statusOptions: Object.entries(l.statuses).map(([value, label]) => ({ value, label: label as string })),
      }}
      module="leads"
      filterConfigs={LEAD_FILTERS}
    />
  );
}
