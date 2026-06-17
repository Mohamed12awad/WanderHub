import type React from "react";
import { Link } from "react-router-dom";
import { KanbanBoardPage } from "@/components/common/KanbanBoardPage";
import type { KanbanColumn } from "@/components/common/GenericKanban";
import { getLeads, updateLead } from "@/utils/api";

interface Lead { _id: string; name: string; status: string; company?: string | null; rating?: string | null; owner?: { name: string } | null }

const COLUMNS: KanbanColumn[] = [
  { key: "new", label: "New", color: "#94a3b8" },
  { key: "contacted", label: "Contacted", color: "#3b82f6" },
  { key: "qualified", label: "Qualified", color: "#6366f1" },
  { key: "unqualified", label: "Unqualified", color: "#f59e0b" },
  { key: "converted", label: "Converted", color: "#10b981" },
];

function Card({ lead }: { lead: Lead }) {
  return (
    <div className="bg-card border border-border/60 rounded-xl p-3 shadow-sm hover:shadow-md transition-all">
      <Link to={`/leads/${lead._id}`} onClick={(e) => e.stopPropagation()} className="block text-sm font-semibold hover:text-primary truncate">{lead.name}</Link>
      {lead.company && <p className="text-xs text-muted-foreground truncate mt-0.5">{lead.company}</p>}
      <div className="flex items-center justify-between gap-2 mt-2.5 pt-2.5 border-t border-border/40 text-[10px] text-muted-foreground">
        <span className="capitalize">{lead.rating ?? ""}</span>
        {lead.owner?.name && <span className="truncate">{lead.owner.name}</span>}
      </div>
    </div>
  );
}

export default function LeadsBoard({ headerExtra }: { headerExtra?: React.ReactNode }) {
  return (
    <KanbanBoardPage<Lead>
      title="Leads" description="Drag a lead between stages to update its status."
      queryKey="leads" columns={COLUMNS} fetchAll={() => getLeads({ limit: 200 })}
      updateStatus={(id, status) => updateLead(id, { status })}
      renderCard={(lead) => <Card lead={lead} />} emptyColumnLabel="No leads"
      headerExtra={headerExtra}
    />
  );
}
