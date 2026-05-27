import { useLanguage } from "@/contexts/LanguageContext";
import { useModules, ModuleKey } from "@/contexts/ModulesContext";
import { cn } from "@/lib/utils";
import {
  Users2, Handshake, KanbanSquare, CalendarDays,
  CheckSquare, Package, Banknote, WalletCards, Receipt,
} from "lucide-react";

interface ModuleInfo {
  icon: React.ElementType;
  label: (tr: any) => string;
  description: string;
}

const MODULE_INFO: Record<ModuleKey, ModuleInfo> = {
  customers: {
    icon: Users2,
    label: (tr) => tr.nav.contacts,
    description: "Track your contacts, relationships and interaction history.",
  },
  deals: {
    icon: Handshake,
    label: (tr) => tr.nav.deals,
    description: "Manage sales opportunities and move them through stages.",
  },
  pipeline: {
    icon: KanbanSquare,
    label: (tr) => tr.nav.pipeline,
    description: "Kanban board view of all deals organised by stage.",
  },
  calendar: {
    icon: CalendarDays,
    label: (tr) => tr.nav.calendar,
    description: "Monthly calendar showing all scheduled activities.",
  },
  tasks: {
    icon: CheckSquare,
    label: (tr) => tr.nav.tasks,
    description: "Create, assign and track tasks in list or kanban view.",
  },
  products: {
    icon: Package,
    label: (tr) => tr.nav.products,
    description: "Catalogue your products and services with pricing.",
  },
  expenses: {
    icon: Banknote,
    label: (tr) => tr.nav.expenses,
    description: "Track expense reports, approvals and reimbursements.",
  },
  finance: {
    icon: Receipt,
    label: (tr) => tr.nav.finance,
    description: "Create and manage quotes and invoices with line items.",
  },
  reports: {
    icon: WalletCards,
    label: (tr) => tr.nav.reports,
    description: "Financial and sales reports with date range filters.",
  },
};

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        checked ? "bg-primary" : "bg-muted-foreground/30"
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

export default function ModulesSettings() {
  const { tr } = useLanguage();
  const { modules, setModule } = useModules();
  const s = tr.settings;

  const moduleKeys = Object.keys(MODULE_INFO) as ModuleKey[];

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{s.modules}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{s.modulesDesc}</p>
      </div>

      <div className="rounded-xl border overflow-hidden divide-y">
        {moduleKeys.map((key) => {
          const { icon: Icon, label, description } = MODULE_INFO[key];
          const enabled = modules[key];
          return (
            <div
              key={key}
              className={cn(
                "flex items-center gap-4 px-4 py-3.5 transition-colors",
                !enabled && "opacity-60 bg-muted/30"
              )}
            >
              <div className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-none">{label(tr)}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
              </div>
              <Toggle
                checked={enabled}
                onChange={(v) => setModule(key, v)}
              />
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Disabled modules are hidden from the navigation but their data is preserved.
      </p>
    </div>
  );
}
