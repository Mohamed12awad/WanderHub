import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GenericTable } from "@/components/common/GenericTable";
import { ViewSwitch } from "@/components/common/ViewSwitch";
import LeadsBoard from "./LeadsBoard";
import LeadActions from "./LeadActions";
import { deleteLead, getLeads } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";
import type { FilterConfig } from "@/components/common/GenericTable";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

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

const STATUS_COLORS: Record<string, string> = {
  new: "bg-sky-500 text-white border-sky-500",
  contacted: "bg-violet-500 text-white border-violet-500",
  qualified: "bg-emerald-500 text-white border-emerald-500",
  unqualified: "bg-slate-400 text-white border-slate-400",
  converted: "bg-amber-500 text-white border-amber-500",
};

const RATING_DOT: Record<string, string> = {
  cold: "bg-sky-400",
  warm: "bg-amber-400",
  hot: "bg-red-500",
};

export function Leads() {
  const { tr, formatDate } = useLanguage();
  const navigate = useNavigate();
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
      columns={[
        {
          id: "name",
          header: l.headers[0],
          kind: "text",
          hideable: false,
          cell: (item) => <div><div className="font-medium">{item.name}</div>{item.company && <div className="text-xs text-muted-foreground">{item.company}</div>}</div>,
        },
        { id: "status", header: l.headers[1], kind: "status", cell: (item) => <Badge variant="outline" className={`${STATUS_COLORS[item.status] ?? ""} capitalize w-fit`}>{l.statuses[item.status] ?? item.status}</Badge> },
        {
          id: "rating",
          header: l.headers[2],
          kind: "status",
          cell: (item) => item.rating ? <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground capitalize"><span className={`h-2 w-2 rounded-full ${RATING_DOT[item.rating] ?? "bg-muted"}`} />{l.ratings?.[item.rating] ?? item.rating}</span> : null,
        },
        { id: "phone", header: l.headers[3], kind: "text", cell: (item) => <span className="text-foreground/70">{item.phone}</span> },
        { id: "source", header: l.headers[4], kind: "text", cell: (item) => <span className="text-foreground/70 capitalize">{item.source}</span> },
        { id: "owner", header: l.headers[5], kind: "text", cell: (item) => <span className="text-foreground/70">{item.owner?.name}</span> },
        { id: "createdAt", header: l.headers[6], kind: "date", cell: (item) => <span className="text-muted-foreground text-xs tabular-nums">{formatDate(item.createdAt, { year: "numeric", month: "short", day: "numeric" })}</span> },
      ]}
      onRowClick={(item) => navigate(`/leads/${item._id}`)}
      renderActions={(item, handleDelete) => <LeadActions id={item._id} handleDelete={handleDelete} />}
      quickStatusFilter={{
        field: "status",
        options: Object.entries(l.statuses).map(([value, label]) => ({ value, label })),
      }}
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
