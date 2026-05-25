import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "react-query";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard, Users2, Handshake, KanbanSquare,
  Package, Banknote, WalletCards, Users, ScrollText, ShieldCheck, CalendarDays,
} from "lucide-react";
import { getCustomers, getDeals } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";

const NAV_ITEMS = [
  { key: "dashboard" as const, href: "/dashboard", icon: LayoutDashboard },
  { key: "contacts"  as const, href: "/customers", icon: Users2 },
  { key: "deals"     as const, href: "/deals",     icon: Handshake },
  { key: "pipeline"  as const, href: "/pipeline",  icon: KanbanSquare },
  { key: "calendar"  as const, href: "/calendar",  icon: CalendarDays },
  { key: "products"  as const, href: "/products",  icon: Package },
  { key: "expenses"  as const, href: "/expenses",  icon: Banknote },
  { key: "reports"   as const, href: "/reports",   icon: WalletCards },
  { key: "users"     as const, href: "/users",     icon: Users },
  { key: "roles"     as const, href: "/roles",     icon: ShieldCheck },
  { key: "logs"      as const, href: "/logs",      icon: ScrollText },
];

interface Customer { _id: string; name: string; email: string; status: string; }
interface Deal     { _id: string; title: string; customer?: { name: string }; status: string; }

export function SearchPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { tr } = useLanguage();
  const s = tr.search;

  const { data: customersData } = useQuery("customers", getCustomers, { enabled: open });
  const { data: dealsData }     = useQuery("deals",     getDeals,     { enabled: open });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const go = (href: string) => { setOpen(false); navigate(href); };

  const customers: Customer[] = Array.isArray(customersData?.data) ? customersData.data : [];
  const deals: Deal[]         = Array.isArray(dealsData?.data)     ? dealsData.data     : [];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={s.placeholder} />
      <CommandList>
        <CommandEmpty>{s.noResults}</CommandEmpty>

        <CommandGroup heading={s.navigation}>
          {NAV_ITEMS.map(({ key, href, icon: Icon }) => (
            <CommandItem key={href} value={`nav-${key}`} onSelect={() => go(href)}>
              <Icon className="me-2 h-4 w-4 text-muted-foreground" />
              {tr.nav[key]}
            </CommandItem>
          ))}
        </CommandGroup>

        {customers.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={s.contacts}>
              {customers.slice(0, 6).map((c) => (
                <CommandItem key={c._id} value={`customer-${c.name}-${c.email}`} onSelect={() => go(`/customers/${c._id}`)}>
                  <Users2 className="me-2 h-4 w-4 text-muted-foreground" />
                  <span>{c.name}</span>
                  {c.email && <span className="ms-2 text-xs text-muted-foreground">{c.email}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {deals.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={s.deals}>
              {deals.slice(0, 6).map((d) => (
                <CommandItem key={d._id} value={`deal-${d.title}-${d.customer?.name ?? ""}`} onSelect={() => go(`/deals/${d._id}`)}>
                  <Handshake className="me-2 h-4 w-4 text-muted-foreground" />
                  <span>{d.title}</span>
                  {d.customer?.name && <span className="ms-2 text-xs text-muted-foreground">{d.customer.name}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
