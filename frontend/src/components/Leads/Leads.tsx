import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GenericTable } from "@/components/common/GenericTable";
import { ViewSwitch } from "@/components/common/ViewSwitch";
import LeadsBoard from "./LeadsBoard";
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
  const [view, setView] = useState<"list" | "board">("list");
  const switcher = <ViewSwitch active={view} onChange={setView} />;
  const boardHeader = (
    <div className="flex items-center gap-2">
      <Link to="/leads/add"><Button size="sm" className="h-8 gap-1.5"><PlusCircle className="h-3.5 w-3.5" />{l.add}</Button></Link>
      {switcher}
    </div>
  );

  const LEAD_FILTERS = useMemo<FilterConfig[]>(() => [
    { label: l.fields.source, field: "source", type: "text" },
    { label: l.fields.rating, field: "rating", type: "text" },
    { label: tr.contacts.filters.createdDate, field: "createdAt", type: "date-range" },
  ], [l, tr]);

  if (view === "board") return <LeadsBoard headerExtra={boardHeader} />;

  return (
    <GenericTable<Lead>
      queryKey="leads"
      headerExtra={switcher}
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
      exportConfig={{ entity: "leads", filename: "leads" }}
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
