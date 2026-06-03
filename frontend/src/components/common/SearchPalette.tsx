import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Command, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  LayoutDashboard, Users2, Handshake, KanbanSquare,
  Package, Banknote, WalletCards, Users, ScrollText, ShieldCheck, CalendarDays,
  FileText, ShoppingCart, Receipt, FolderKanban, CheckSquare, UserCheck,
  Loader2,
} from "lucide-react";
import { globalSearch } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";

const NAV_ITEMS = [
  { key: "dashboard"     as const, href: "/dashboard",                    icon: LayoutDashboard },
  { key: "contacts"      as const, href: "/customers",                    icon: Users2 },
  { key: "leads"         as const, href: "/leads",                        icon: UserCheck },
  { key: "deals"         as const, href: "/deals",                        icon: Handshake },
  { key: "pipeline"      as const, href: "/pipeline",                     icon: KanbanSquare },
  { key: "calendar"      as const, href: "/calendar",                     icon: CalendarDays },
  { key: "tasks"         as const, href: "/tasks",                        icon: CheckSquare },
  { key: "projects"      as const, href: "/projects",                     icon: FolderKanban },
  { key: "products"      as const, href: "/products",                     icon: Package },
  { key: "expenses"      as const, href: "/expenses",                     icon: Banknote },
  { key: "quotes"        as const, href: "/finance/quotes",               icon: FileText },
  { key: "invoices"      as const, href: "/finance/invoices",             icon: WalletCards },
  { key: "purchaseOrders"as const, href: "/procurement/purchase-orders",  icon: ShoppingCart },
  { key: "bills"         as const, href: "/procurement/bills",            icon: Receipt },
  { key: "reports"       as const, href: "/reports",                      icon: ScrollText },
  { key: "users"         as const, href: "/users",                        icon: Users },
  { key: "roles"         as const, href: "/roles",                        icon: ShieldCheck },
  { key: "logs"          as const, href: "/logs",                         icon: ScrollText },
];

interface SearchResults {
  customers:      { _id: string; name: string; email?: string; phone?: string }[];
  deals:          { _id: string; title: string; customer?: { name: string }; status: string }[];
  leads:          { _id: string; name: string; email?: string; phone?: string; company?: string; status: string }[];
  products:       { _id: string; name: string; type?: string }[];
  expenses:       { _id: string; title: string; approvalStatus: string }[];
  invoices:       { _id: string; invoiceNumber: string; title: string; status: string; customer?: { name: string } }[];
  quotes:         { _id: string; quoteNumber: string; title: string; status: string; customer?: { name: string } }[];
  purchaseOrders: { _id: string; poNumber: string; title: string; status: string; supplier?: { name: string } }[];
  vendorBills:    { _id: string; billNumber: string; title: string; status: string; supplier?: { name: string } }[];
  projects:       { _id: string; name: string; status: string; priority: string }[];
  tasks:          { _id: string; title: string; status: string; priority: string }[];
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

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 2) { setResults(null); return; }
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

  const totalHits = results
    ? results.customers.length + results.deals.length + results.leads.length +
      results.products.length + results.expenses.length + results.invoices.length +
      results.quotes.length + results.purchaseOrders.length + results.vendorBills.length +
      results.projects.length + results.tasks.length
    : 0;
  const hasResults = totalHits > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 shadow-lg">
        <Command
          shouldFilter={false}
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5"
        >
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
                    {(tr.nav as any)[key] ?? key}
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
                    <CommandItem key={c._id} value={c._id} onSelect={() => go(`/customers/${c._id}`)}>
                      <Users2 className="me-2 h-4 w-4 text-muted-foreground" />
                      <span>{c.name}</span>
                      {c.phone && <span className="ms-2 text-xs text-muted-foreground">{c.phone}</span>}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            ) : null}

            {results?.leads.length ? (
              <>
                <CommandSeparator />
                <CommandGroup heading={s.leads}>
                  {results.leads.map((l) => (
                    <CommandItem key={l._id} value={l._id} onSelect={() => go(`/leads/${l._id}`)}>
                      <UserCheck className="me-2 h-4 w-4 text-muted-foreground" />
                      <span>{l.name}</span>
                      {l.company && <span className="ms-2 text-xs text-muted-foreground">{l.company}</span>}
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
                    <CommandItem key={d._id} value={d._id} onSelect={() => go(`/deals/${d._id}`)}>
                      <Handshake className="me-2 h-4 w-4 text-muted-foreground" />
                      <span>{d.title}</span>
                      {d.customer?.name && <span className="ms-2 text-xs text-muted-foreground">{d.customer.name}</span>}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            ) : null}

            {results?.quotes.length ? (
              <>
                <CommandSeparator />
                <CommandGroup heading={s.quotes}>
                  {results.quotes.map((q) => (
                    <CommandItem key={q._id} value={q._id} onSelect={() => go(`/finance/quotes/${q._id}`)}>
                      <FileText className="me-2 h-4 w-4 text-muted-foreground" />
                      <span>{q.quoteNumber}</span>
                      <span className="ms-2 text-xs text-muted-foreground">{q.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            ) : null}

            {results?.invoices.length ? (
              <>
                <CommandSeparator />
                <CommandGroup heading={s.invoices}>
                  {results.invoices.map((inv) => (
                    <CommandItem key={inv._id} value={inv._id} onSelect={() => go(`/finance/invoices/${inv._id}`)}>
                      <WalletCards className="me-2 h-4 w-4 text-muted-foreground" />
                      <span>{inv.invoiceNumber}</span>
                      <span className="ms-2 text-xs text-muted-foreground">{inv.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            ) : null}

            {results?.purchaseOrders.length ? (
              <>
                <CommandSeparator />
                <CommandGroup heading={s.purchaseOrders}>
                  {results.purchaseOrders.map((po) => (
                    <CommandItem key={po._id} value={po._id} onSelect={() => go(`/procurement/purchase-orders/${po._id}`)}>
                      <ShoppingCart className="me-2 h-4 w-4 text-muted-foreground" />
                      <span>{po.poNumber}</span>
                      <span className="ms-2 text-xs text-muted-foreground">{po.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            ) : null}

            {results?.vendorBills.length ? (
              <>
                <CommandSeparator />
                <CommandGroup heading={s.vendorBills}>
                  {results.vendorBills.map((b) => (
                    <CommandItem key={b._id} value={b._id} onSelect={() => go(`/procurement/bills/${b._id}`)}>
                      <Receipt className="me-2 h-4 w-4 text-muted-foreground" />
                      <span>{b.billNumber}</span>
                      <span className="ms-2 text-xs text-muted-foreground">{b.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            ) : null}

            {results?.projects.length ? (
              <>
                <CommandSeparator />
                <CommandGroup heading={s.projects}>
                  {results.projects.map((p) => (
                    <CommandItem key={p._id} value={p._id} onSelect={() => go(`/projects/${p._id}`)}>
                      <FolderKanban className="me-2 h-4 w-4 text-muted-foreground" />
                      <span>{p.name}</span>
                      <span className="ms-2 text-xs text-muted-foreground capitalize">{p.status}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            ) : null}

            {results?.tasks.length ? (
              <>
                <CommandSeparator />
                <CommandGroup heading={s.tasks}>
                  {results.tasks.map((t) => (
                    <CommandItem key={t._id} value={t._id} onSelect={() => go(`/tasks`)}>
                      <CheckSquare className="me-2 h-4 w-4 text-muted-foreground" />
                      <span>{t.title}</span>
                      <span className="ms-2 text-xs text-muted-foreground capitalize">{t.status.replace("_", " ")}</span>
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
                    <CommandItem key={p._id} value={p._id} onSelect={() => go(`/products/${p._id}`)}>
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
                    <CommandItem key={e._id} value={e._id} onSelect={() => go(`/expenses/${e._id}`)}>
                      <Banknote className="me-2 h-4 w-4 text-muted-foreground" />
                      <span>{e.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
