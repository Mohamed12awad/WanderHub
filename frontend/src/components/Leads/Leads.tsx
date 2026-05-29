import { GenericTable } from "@/components/common/GenericTable";
import LeadRow from "./leadRow";
import { deleteLead, getLeads } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";

type Lead = {
  _id: string;
  name: string;
  status: string;
  phone?: string;
  source?: string;
  owner?: { _id: string; name: string } | null;
  createdAt: string;
};

import type { FilterConfig } from "@/components/common/GenericTable";

const LEAD_FILTERS: FilterConfig[] = [
  { label: "Source", field: "source", type: "text" },
  { label: "Created Date", field: "createdAt", type: "date-range" },
];

export function Leads() {
  const { tr } = useLanguage();
  const l = tr.leads;

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
        options: [
          { value: "new",         label: tr.leads.statuses.new },
          { value: "contacted",   label: tr.leads.statuses.contacted },
          { value: "qualified",   label: tr.leads.statuses.qualified },
          { value: "unqualified", label: tr.leads.statuses.unqualified },
          { value: "converted",   label: tr.leads.statuses.converted },
        ],
      }}
      renderRow={(item, handleDelete) => (
        <LeadRow
          key={item._id}
          id={item._id}
          name={item.name}
          status={item.status}
          phone={item.phone}
          source={item.source}
          owner={item.owner}
          date={new Date(item.createdAt).toLocaleString(undefined, {
            year: "numeric", month: "short", day: "numeric",
          })}
          handleDelete={handleDelete}
        />
      )}
      title={l.title}
      description={l.description}
      addLink="/leads/add"
      addLabel={l.add}
      filterConfigs={LEAD_FILTERS}
    />
  );
}
