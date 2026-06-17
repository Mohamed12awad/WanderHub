import { useMemo } from "react";
import { Link } from "react-router-dom";
import { PlusCircle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/authContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { hasPermission } from "@/lib/resolveHomeRoute";

interface QuickAction {
  label: string;
  to: string;
  permission: string;
}

/**
 * Role-filtered "create" cluster: one primary button + the rest in a ⋮-style
 * dropdown. Only shows actions the user actually has permission for. Reused in
 * the dashboard header and available for a global "+" affordance.
 */
export function QuickActions() {
  const { user } = useAuth();
  const { tr } = useLanguage();
  // Rebuilt on language change so labels stay localized; memoized so unrelated
  // renders don't reallocate the array.
  const actions = useMemo<QuickAction[]>(() => [
    { label: tr.quickActions.addContact, to: "/customers/add", permission: "contacts:create" },
    { label: tr.quickActions.addDeal, to: "/deals/add", permission: "deals:create" },
    { label: tr.quickActions.addLead, to: "/leads/add", permission: "leads:create" },
    { label: tr.quickActions.newQuote, to: "/finance/quotes/new", permission: "quotes:create" },
    { label: tr.quickActions.newInvoice, to: "/finance/invoices/new", permission: "invoices:create" },
    { label: tr.quickActions.newSalesOrder, to: "/sales-orders/new", permission: "sales-orders:create" },
    { label: tr.quickActions.newPurchaseOrder, to: "/procurement/purchase-orders/new", permission: "purchase-orders:create" },
    { label: tr.quickActions.addExpense, to: "/expenses/add", permission: "expenses:create" },
  ], [tr]);
  const perms = user?.permissions ?? [];
  const allowed = actions.filter((a) => hasPermission(perms, a.permission));
  if (allowed.length === 0) return null;

  const [primary, ...rest] = allowed;
  return (
    <div className="flex items-center gap-2">
      <Link to={primary.to}>
        <Button size="sm" className="gap-1.5 h-9">
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{primary.label}</span>
        </Button>
      </Link>
      {rest.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1 px-2.5">
              <span className="hidden sm:inline text-xs">{tr.quickActions.more}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {rest.map((a) => (
              <DropdownMenuItem key={a.to} asChild>
                <Link to={a.to} className="gap-2 cursor-pointer">
                  <PlusCircle className="h-3.5 w-3.5" />
                  {a.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
