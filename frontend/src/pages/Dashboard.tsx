import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from "recharts";
import {
  TrendingUp, TrendingDown, Users, DollarSign, CreditCard,
  Activity, PlusCircle, Rocket, Landmark, Wallet, Lock,
  Clock, CheckCircle2, FileText, Receipt,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getSummery, getDeals, getAccounts,
  getPendingApprovals, getOutstandingReport, getLeadsReport, getPipelineReport,
} from "@/utils/api";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { Account } from "@/types/types";

const LEAD_COLORS: Record<string, string> = {
  new: "#3b82f6", contacted: "#8b5cf6", qualified: "#22c55e",
  unqualified: "#94a3b8", converted: "#f59e0b",
};
const STAGE_COLORS: Record<string, string> = {
  lead: "#3b82f6", qualified: "#8b5cf6", proposal: "#eab308",
  negotiation: "#f97316", won: "#22c55e", lost: "#ef4444", cancelled: "#9ca3af",
};

function pct(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

const STATUS_COLORS: Record<string, string> = {
  lead: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  qualified: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  proposal: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  negotiation: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  won: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  lost: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

interface Deal {
  _id: string;
  title: string;
  customer: { name: string };
  status: string;
  price: number;
  currency: string;
  createdAt: string;
}

const STAT_COLORS = [
  "from-blue-500/15 to-blue-500/5 text-blue-600 dark:from-blue-500/20 dark:to-blue-500/5 dark:text-blue-400",
  "from-violet-500/15 to-violet-500/5 text-violet-600 dark:from-violet-500/20 dark:to-violet-500/5 dark:text-violet-400",
  "from-rose-500/15 to-rose-500/5 text-rose-600 dark:from-rose-500/20 dark:to-rose-500/5 dark:text-rose-400",
  "from-amber-500/15 to-amber-500/5 text-amber-600 dark:from-amber-500/20 dark:to-amber-500/5 dark:text-amber-400",
];

function StatCard({
  title, value, sub, change, icon: Icon, loading, colorIdx = 0,
}: {
  title: string; value: string; sub: string; change: number; icon: React.ElementType; loading: boolean; colorIdx?: number;
}) {
  const up = change >= 0;
  const color = STAT_COLORS[colorIdx % STAT_COLORS.length];
  return (
    <Card className="shadow-sm border-border/60">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className={`rounded-xl bg-gradient-to-br p-2.5 ${color}`}>
            <Icon className="h-4 w-4" />
          </div>
          {!loading && (
            <span className={`text-xs flex items-center gap-0.5 font-medium tabular-nums ${up ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
              {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {up ? "+" : ""}{change.toFixed(1)}%
            </span>
          )}
        </div>
        {loading ? (
          <>
            <Skeleton className="h-7 w-28 mb-1.5" />
            <Skeleton className="h-3.5 w-36" />
          </>
        ) : (
          <>
            <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{title}</p>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">{sub}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const { tr } = useLanguage();
  const d = tr.dashboard;

  const { data: summeryData, isPending: summeryLoading } = useQuery({
    queryKey: ["summery"],
    queryFn: () => getSummery("month")
  });
  const { data: dealsData, isPending: dealsLoading } = useQuery({
    queryKey: ["deals"],
    queryFn: () => getDeals()
  });
  const { data: accountsData } = useQuery({
    queryKey: ["accounts"],
    queryFn: getAccounts,
    staleTime: 60000
  });
  const { data: pendingData } = useQuery({
    queryKey: ["pending-approvals"],
    queryFn: getPendingApprovals,
    staleTime: 30000
  });
  const { data: outstandingData } = useQuery({
    queryKey: ["outstanding"],
    queryFn: getOutstandingReport,
    staleTime: 60000
  });
  const { data: leadsData } = useQuery({
    queryKey: ["leads-report"],
    queryFn: getLeadsReport,
    staleTime: 60000
  });
  const { data: pipelineData } = useQuery({
    queryKey: ["pipeline-report"],
    queryFn: getPipelineReport,
    staleTime: 60000
  });
  const accounts: Account[] = accountsData?.data ?? [];
  const pending = pendingData?.data ?? { total: 0, quotes: [], invoices: [], expenses: [] };
  const outstanding: { _id: string; invoiceNumber: string; dealTitle: string; total: number; totalPaid: number; currency: string; dueDate: string; status: string }[] = outstandingData?.data ?? [];
  const leadStats: { status: string; count: number }[] = leadsData?.data ? Object.entries(leadsData.data).map(([status, count]) => ({ status, count: count as number })) : [];
  const pipeline: { stage: string; count: number; value: number }[] = pipelineData?.data ?? [];

  const cur = summeryData?.data?.currentPeriod ?? {};
  const prev = summeryData?.data?.previousPeriod ?? {};

  const allCurrencies = Array.from(
    new Set([...Object.keys(cur.revenue ?? {}), ...Object.keys(prev.revenue ?? {})])
  );

  const revenueChartData = allCurrencies.map((currency) => ({
    currency,
    [d.recentDeals]: cur.revenue?.[currency] ?? 0,
    [d.lastPeriod]: prev.revenue?.[currency] ?? 0,
  }));

  const primaryCurrency = allCurrencies[0] ?? "USD";
  const revenue = cur.revenue?.[primaryCurrency] ?? 0;
  const prevRevenue = prev.revenue?.[primaryCurrency] ?? 0;
  const underCollection = cur.underCollection?.[primaryCurrency] ?? 0;
  const prevUnder = prev.underCollection?.[primaryCurrency] ?? 0;
  const newCustomers = cur.newCustomers ?? 0;
  const prevCustomers = prev.newCustomers ?? 0;
  const expenses = cur.expenses?.total ?? 0;
  const prevExpenses = prev.expenses?.total ?? 0;

  const recentDeals: Deal[] = Array.isArray(dealsData?.data)
    ? (dealsData.data as Deal[]).slice(0, 5)
    : [];

  const isOnboarding = !summeryLoading && !dealsLoading && newCustomers === 0 && recentDeals.length === 0;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">{d.title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {format(new Date(), "EEEE, d MMMM yyyy")}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/customers/add">
            <Button variant="outline" size="sm" className="gap-1.5 h-9">
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{d.addContact}</span>
            </Button>
          </Link>
          <Link to="/deals/add">
            <Button size="sm" className="gap-1.5 h-9">
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{d.addDeal}</span>
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="h-9">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="sales" className="text-xs">Sales</TabsTrigger>
          <TabsTrigger value="finance" className="text-xs">Finance</TabsTrigger>
        </TabsList>

        {/* ── Finance tab ── */}
        <TabsContent value="finance" className="mt-5 space-y-5">
          {/* Pending approvals */}
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Pending Approvals
                  {pending.total > 0 && (
                    <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
                      {pending.total}
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">Items waiting for your review</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {pending.total === 0 ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  All caught up — no pending approvals.
                </div>
              ) : (
                <div className="space-y-3">
                  {[
                    ...pending.quotes.map((q: any) => ({ ...q, href: `/finance/quotes/${q.id}`, icon: FileText, color: "text-blue-600" })),
                    ...pending.invoices.map((i: any) => ({ ...i, href: `/finance/invoices/${i.id}`, icon: Receipt, color: "text-violet-600" })),
                    ...pending.expenses.map((e: any) => ({ ...e, href: `/expenses/${e.id}`, icon: CreditCard, color: "text-amber-600" })),
                  ].map((item: any) => {
                    const Icon = item.icon;
                    return (
                      <Link key={item.id} to={item.href} className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2.5 hover:bg-muted/40 transition-colors group">
                        <Icon className={`h-4 w-4 shrink-0 ${item.color}`} />
                        <span className="text-sm font-medium flex-1 truncate group-hover:text-primary transition-colors">{item.label}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{format(new Date(item.createdAt), "dd MMM")}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Accounts */}
          {accounts.length > 0 && (
            <Card className="shadow-sm border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Account Balances</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {accounts.map((acc) => {
                    const Icon = acc.type === "bank" ? Landmark : acc.type === "safe" ? Lock : Wallet;
                    return (
                      <div key={acc._id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
                        <div className="rounded-lg bg-primary/10 p-2 shrink-0"><Icon className="h-3.5 w-3.5 text-primary" /></div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{acc.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{acc.type}</p>
                        </div>
                        <p className="text-sm font-bold tabular-nums">{acc.balance.toLocaleString()} {acc.currency}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Outstanding invoices */}
          {outstanding.length > 0 && (
            <Card className="shadow-sm border-border/60">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Outstanding Invoices</CardTitle>
                  <CardDescription className="text-xs">{outstanding.length} invoice{outstanding.length !== 1 ? "s" : ""} awaiting payment</CardDescription>
                </div>
                <Link to="/finance/invoices"><Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">View all</Button></Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {outstanding.slice(0, 8).map((inv) => {
                    const owed = inv.total - inv.totalPaid;
                    const isOverdue = inv.status === "overdue";
                    return (
                      <Link key={inv._id} to={`/finance/invoices/${inv._id}`} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-muted/40 border border-border/40 transition-colors">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold">{inv.invoiceNumber}</p>
                          <p className="text-xs text-muted-foreground truncate">{inv.dealTitle}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isOverdue && <Badge variant="outline" className="text-[10px] border-red-300 text-red-600 h-4 px-1.5">Overdue</Badge>}
                          <span className="text-sm font-bold tabular-nums text-destructive">{owed.toLocaleString()} {inv.currency}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Sales tab ── */}
        <TabsContent value="sales" className="mt-5 space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Leads by status */}
            <Card className="shadow-sm border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Leads by Status</CardTitle>
                <CardDescription className="text-xs">Current lead pipeline breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {leadStats.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No lead data available.</p>
                ) : (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={leadStats} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                          {leadStats.map((entry) => (
                            <Cell key={entry.status} fill={LEAD_COLORS[entry.status] ?? "#94a3b8"} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 shrink-0">
                      {leadStats.map((s) => (
                        <div key={s.status} className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: LEAD_COLORS[s.status] ?? "#94a3b8" }} />
                          <span className="text-xs capitalize text-muted-foreground">{s.status}</span>
                          <span className="text-xs font-semibold ms-auto ps-3">{s.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pipeline by stage */}
            <Card className="shadow-sm border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Pipeline Stages</CardTitle>
                <CardDescription className="text-xs">Deal count and value per stage</CardDescription>
              </CardHeader>
              <CardContent>
                {pipeline.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No pipeline data available.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={pipeline} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="stage" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip
                        contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }}
                      />
                      <Bar dataKey="count" name="Deals" radius={[4, 4, 0, 0]}>
                        {pipeline.map((entry) => (
                          <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage] ?? "#94a3b8"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Win rate */}
          {pipeline.length > 0 && (() => {
            const won = pipeline.find((s) => s.stage === "won")?.count ?? 0;
            const total = pipeline.filter((s) => !["lead"].includes(s.stage)).reduce((a, s) => a + s.count, 0);
            const rate = total ? Math.round((won / total) * 100) : 0;
            const wonValue = pipeline.find((s) => s.stage === "won")?.value ?? 0;
            const currency = "EGP";
            return (
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { label: "Win Rate", value: `${rate}%`, sub: `${won} won of ${total} qualified` },
                  { label: "Won Value", value: `${wonValue.toLocaleString()} ${currency}`, sub: "Total closed revenue" },
                  { label: "Active Deals", value: String(pipeline.filter((s) => !["won", "lost", "cancelled"].includes(s.stage)).reduce((a, s) => a + s.count, 0)), sub: "In pipeline right now" },
                ].map(({ label, value, sub }) => (
                  <Card key={label} className="shadow-sm border-border/60">
                    <CardContent className="pt-5 pb-4">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-2xl font-bold mt-1">{value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })()}
        </TabsContent>

        {/* ── Overview tab ── */}
        <TabsContent value="overview" className="mt-5 space-y-5">

      {/* Onboarding guide */}
      {isOnboarding && (
        <Card className="border-dashed border-2 shadow-none bg-muted/20">
          <CardContent className="py-10">
            <div className="flex flex-col items-center text-center gap-5 max-w-md mx-auto">
              <div className="rounded-2xl bg-primary/10 p-4">
                <Rocket className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-1.5">Get started with your workspace</h2>
                <p className="text-sm text-muted-foreground">Complete these steps to set up your CRM.</p>
              </div>
              <div className="w-full space-y-2.5 text-left">
                {[
                  { step: 1, label: "Add your first contact", href: "/customers/add", cta: "Add Contact" },
                  { step: 2, label: "Create a deal", href: "/deals/add", cta: "Create Deal" },
                  { step: 3, label: "Send a quote or invoice", href: "/finance/quotes/new", cta: "New Quote" },
                ].map(({ step, label, href, cta }) => (
                  <div key={step} className="flex items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                        {step}
                      </span>
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                    <Link to={href}>
                      <Button size="sm" variant="outline" className="h-7 text-xs px-3 shrink-0">{cta}</Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={d.revenue}
          value={`${revenue.toLocaleString()} ${primaryCurrency}`}
          sub={`vs ${prevRevenue.toLocaleString()} ${primaryCurrency} last period`}
          change={pct(revenue, prevRevenue)}
          icon={DollarSign}
          loading={summeryLoading}
          colorIdx={0}
        />
        <StatCard
          title={d.newContacts}
          value={String(newCustomers)}
          sub={`vs ${prevCustomers} last period`}
          change={pct(newCustomers, prevCustomers)}
          icon={Users}
          loading={summeryLoading}
          colorIdx={1}
        />
        <StatCard
          title={d.outstanding}
          value={`${underCollection.toLocaleString()} ${primaryCurrency}`}
          sub={`vs ${prevUnder.toLocaleString()} ${primaryCurrency} last period`}
          change={pct(underCollection, prevUnder)}
          icon={CreditCard}
          loading={summeryLoading}
          colorIdx={2}
        />
        <StatCard
          title={d.expenses}
          value={expenses.toLocaleString()}
          sub={`vs ${prevExpenses.toLocaleString()} last period`}
          change={pct(expenses, prevExpenses)}
          icon={Activity}
          loading={summeryLoading}
          colorIdx={3}
        />
      </div>

      {/* Charts + Recent Deals */}
      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4 shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{d.revenueComparison}</CardTitle>
            <CardDescription className="text-xs">{d.revenueDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            {summeryLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : revenueChartData.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center">
                <p className="text-sm text-muted-foreground">{d.noRevenue}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={revenueChartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="currency" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => v.toLocaleString()} />
                  <Tooltip
                    contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))", fontSize: 12 }}
                    formatter={(v) => (typeof v === "number" ? v.toLocaleString() : "")}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey={d.recentDeals} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={d.lastPeriod} fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} opacity={0.35} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{d.recentDeals}</CardTitle>
            <CardDescription className="text-xs">{d.recentDealsDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            {dealsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 flex-1" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            ) : recentDeals.length === 0 ? (
              <div className="flex items-center justify-center h-[160px]">
                <p className="text-sm text-muted-foreground">{d.noDeals}</p>
              </div>
            ) : (
              <ul className="divide-y divide-border/50">
                {recentDeals.map((deal) => (
                  <li key={deal._id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <Link to={`/deals/${deal._id}`} className="text-sm font-medium hover:text-primary transition-colors truncate block">
                        {deal.title}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {deal.customer?.name} · {format(new Date(deal.createdAt), "dd MMM")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={`text-xs capitalize border-0 font-medium ${STATUS_COLORS[deal.status] ?? ""}`}>
                        {deal.status}
                      </Badge>
                      <span className="text-xs font-semibold whitespace-nowrap tabular-nums text-muted-foreground">
                        {deal.price?.toLocaleString()} {deal.currency}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/deals" className="mt-4 block text-xs text-center text-muted-foreground hover:text-foreground hover:underline transition-colors">
              {d.viewAllDeals} →
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Overview */}
      {accounts.length > 0 && (
        <Card className="shadow-sm border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Accounts</CardTitle>
              <CardDescription className="text-xs">Balance per account</CardDescription>
            </div>
            <Link to="/settings/accounts">
              <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground hover:text-foreground">Manage</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {accounts.map((acc) => {
                const Icon = acc.type === "bank" ? Landmark : acc.type === "safe" ? Lock : Wallet;
                return (
                  <div key={acc._id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
                    <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                      <Icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{acc.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{acc.type}</p>
                    </div>
                    <p className="ms-auto text-sm font-semibold whitespace-nowrap tabular-nums">
                      {acc.balance.toLocaleString()} {acc.currency}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expense Breakdown */}
      {!summeryLoading && Object.keys(cur.expenses?.categories ?? {}).length > 0 && (
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{d.expenseBreakdown}</CardTitle>
            <CardDescription className="text-xs">{d.expenseBreakdownDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                layout="vertical"
                data={Object.entries(cur.expenses.categories).map(([cat, amount]) => ({ category: cat, amount }))}
                margin={{ top: 0, right: 16, bottom: 0, left: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => v.toLocaleString()} />
                <YAxis type="category" dataKey="category" axisLine={false} tickLine={false} width={60} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }}
                  formatter={(v) => (typeof v === "number" ? v.toLocaleString() : "")}
                />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
