import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard, Users2, Handshake, KanbanSquare,
  Package, Banknote, WalletCards, Users, ScrollText, ShieldCheck, CalendarDays,
  Loader2,
} from "lucide-react";
import { globalSearch } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";

const NAV_ITEMS = [
  { key: "dashboard" as const, href: "/dashboard",  icon: LayoutDashboard },
  { key: "contacts"  as const, href: "/customers",  icon: Users2 },
  { key: "deals"     as const, href: "/deals",      icon: Handshake },
  { key: "pipeline"  as const, href: "/pipeline",   icon: KanbanSquare },
  { key: "calendar"  as const, href: "/calendar",   icon: CalendarDays },
  { key: "products"  as const, href: "/products",   icon: Package },
  { key: "expenses"  as const, href: "/expenses",   icon: Banknote },
  { key: "reports"   as const, href: "/reports",    icon: WalletCards },
  { key: "users"     as const, href: "/users",      icon: Users },
  { key: "roles"     as const, href: "/roles",      icon: ShieldCheck },
  { key: "logs"      as const, href: "/logs",       icon: ScrollText },
];

interface SearchResults {
  customers: { _id: string; name: string; email?: string; phone?: string }[];
  deals:     { _id: string; title: string; customer?: { name: string }; status: string }[];
  products:  { _id: string; name: string; type?: string }[];
  expenses:  { _id: string; title: string; approved: boolean }[];
  invoices:  { _id: string; invoiceNumber: string; title: string; status: string }[];
}

export function SearchPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const { tr } = useLanguage();
  const s = tr.search;

  // Keyboard shortcut to open
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

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await globalSearch(query);
        setResults(res.data);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    setResults(null);
    navigate(href);
  };

  const hasResults = results && (
    results.customers.length + results.deals.length + results.products.length +
    results.expenses.length + results.invoices.length > 0
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder={s.placeholder}
        value={query}
        onValueChange={setQuery}
      />
      {loading && (
        <div className="flex justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
      <CommandList>
        {!query && (
          <CommandGroup heading={s.navigation}>
            {NAV_ITEMS.map(({ key, href, icon: Icon }) => (
              <CommandItem key={href} value={`nav-${key}`} onSelect={() => go(href)}>
                <Icon className="me-2 h-4 w-4 text-muted-foreground" />
                {tr.nav[key]}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {query && !loading && !hasResults && (
          <CommandEmpty>{s.noResults}</CommandEmpty>
        )}

        {results?.customers.length ? (
          <>
            <CommandSeparator />
            <CommandGroup heading={s.contacts}>
              {results.customers.map((c) => (
                <CommandItem key={c._id} value={`customer-${c.name}-${c.email}`} onSelect={() => go(`/customers/${c._id}`)}>
                  <Users2 className="me-2 h-4 w-4 text-muted-foreground" />
                  <span>{c.name}</span>
                  {c.email && <span className="ms-2 text-xs text-muted-foreground">{c.email}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}

        {results?.deals.length ? (
          <>
            <CommandSeparator />
            <CommandGroup heading={s.deals}>
              {results.deals.map((d) => (
                <CommandItem key={d._id} value={`deal-${d.title}-${d.customer?.name ?? ""}`} onSelect={() => go(`/deals/${d._id}`)}>
                  <Handshake className="me-2 h-4 w-4 text-muted-foreground" />
                  <span>{d.title}</span>
                  {d.customer?.name && <span className="ms-2 text-xs text-muted-foreground">{d.customer.name}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}

        {results?.products.length ? (
          <>
            <CommandSeparator />
            <CommandGroup heading={tr.nav.products}>
              {results.products.map((p) => (
                <CommandItem key={p._id} value={`product-${p.name}`} onSelect={() => go(`/products/${p._id}`)}>
                  <Package className="me-2 h-4 w-4 text-muted-foreground" />
                  <span>{p.name}</span>
                  {p.type && <span className="ms-2 text-xs text-muted-foreground">{p.type}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}

        {results?.expenses.length ? (
          <>
            <CommandSeparator />
            <CommandGroup heading={tr.nav.expenses}>
              {results.expenses.map((e) => (
                <CommandItem key={e._id} value={`expense-${e.title}`} onSelect={() => go(`/expenses/${e._id}`)}>
                  <Banknote className="me-2 h-4 w-4 text-muted-foreground" />
                  <span>{e.title}</span>
                  <span className="ms-2 text-xs text-muted-foreground">{e.approved ? "Approved" : "Pending"}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}

        {results?.invoices.length ? (
          <>
            <CommandSeparator />
            <CommandGroup heading={tr.nav.finance ?? "Finance"}>
              {results.invoices.map((inv) => (
                <CommandItem key={inv._id} value={`invoice-${inv.invoiceNumber}-${inv.title}`} onSelect={() => go(`/finance/invoices/${inv._id}`)}>
                  <WalletCards className="me-2 h-4 w-4 text-muted-foreground" />
                  <span>{inv.invoiceNumber}</span>
                  <span className="ms-2 text-xs text-muted-foreground">{inv.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}
