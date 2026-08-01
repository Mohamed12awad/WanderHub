import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from "recharts";
import {
  TrendingUp, TrendingDown, Users, DollarSign, CreditCard,
  Activity, Landmark, Wallet, Lock,
  Clock, CheckCircle2, FileText, Receipt,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getSummary, getDeals, getAccounts, getLowStock,
  getPendingApprovals, getOutstandingReport, getLeadsReport, getPipelineReport,
} from "@/utils/api";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/authContext";
import { Account } from "@/types/types";
import { PeriodSelector, defaultPeriod, type PeriodValue } from "@/components/common/PeriodSelector";
import { PageShell } from "@/components/common/PageShell";
import { PageHeader } from "@/components/common/PageHeader";
import { QuickActions } from "@/components/common/QuickActions";
import { GettingStartedCard } from "@/components/common/GettingStartedCard";

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
  const { tr, formatCurrency, formatDate, formatNumber } = useLanguage();
  const d = tr.dashboard;

  const [period, setPeriod] = useState<PeriodValue>(() => defaultPeriod("month"));
  const { data: summaryData, isPending: summaryLoading } = useQuery({
    queryKey: ["summary", period.preset, period.startDate, period.endDate],
    queryFn: () =>
      period.preset === "custom"
        ? getSummary(undefined, { startDate: period.startDate, endDate: period.endDate })
        : getSummary(period.preset),
  });
  const { data: dealsData, isPending: dealsLoading } = useQuery({
    queryKey: ["deals"],
    queryFn: () => getDeals()
  });
  // Cash/bank balances are gated by `settings:view`; only fetch them when the
  // user can, so the dashboard never 403s for finance-less roles (the widgets
  // below already hide when there are no accounts).
  const { user } = useAuth();
  const canViewAccounts =
    (user?.permissions ?? []).some((p) => p === "*" || p === "settings:view");
  const { data: accountsData } = useQuery({
    queryKey: ["accounts"],
    queryFn: getAccounts,
    staleTime: 60000,
    enabled: canViewAccounts,
  });
  const canViewReports = (user?.permissions ?? []).some((p) => p === "*" || p === "reports:view");
  const canViewInvoices = (user?.permissions ?? []).some((p) => p === "*" || p === "invoices:view" || p.startsWith("invoices:view:"));
  const canViewLeads = (user?.permissions ?? []).some((p) => p === "*" || p === "leads:view" || p.startsWith("leads:view:"));
  const canViewDeals = (user?.permissions ?? []).some((p) => p === "*" || p === "deals:view" || p.startsWith("deals:view:"));
  const { data: lowStockData } = useQuery({ queryKey: ["low-stock"], queryFn: getLowStock, staleTime: 30000, enabled: canViewReports });
  const { data: pendingData } = useQuery({
    queryKey: ["pending-approvals"],
    queryFn: getPendingApprovals,
    staleTime: 30000,
    enabled: canViewInvoices,
  });
  const { data: outstandingData } = useQuery({
    queryKey: ["outstanding"],
    queryFn: () => getOutstandingReport(),
    staleTime: 60000,
    enabled: canViewInvoices,
  });
  const { data: leadsData } = useQuery({
    queryKey: ["leads-report"],
    queryFn: () => getLeadsReport(),
    staleTime: 60000,
    enabled: canViewLeads,
  });
  const { data: pipelineData } = useQuery({
    queryKey: ["pipeline-report"],
    queryFn: () => getPipelineReport(),
    staleTime: 60000,
    enabled: canViewDeals,
  });
  const accounts: Account[] = accountsData?.data ?? [];
  const lowStock: any[] = lowStockData?.data ?? [];
  const pending = pendingData?.data ?? { total: 0, quotes: [], invoices: [], expenses: [] };
  const outstanding: { _id: string; invoiceNumber: string; dealTitle: string; total: number; totalPaid: number; currency: string; dueDate: string; status: string }[] = outstandingData?.data ?? [];
  const leadStats: { status: string; count: number }[] = leadsData?.data ? Object.entries(leadsData.data).map(([status, count]) => ({ status, count: count as number })) : [];
  const pipeline: { stage: string; count: number; value: number }[] = pipelineData?.data ?? [];

  const cur = summaryData?.data?.currentPeriod ?? {};
  const prev = summaryData?.data?.previousPeriod ?? {};

  const allCurrencies = Array.from(
    new Set([...Object.keys(cur.revenue ?? {}), ...Object.keys(prev.revenue ?? {})])
  );

  const revenueChartData = allCurrencies.map((currency) => ({
    currency,
    [d.recentDeals]: cur.revenue?.[currency] ?? 0,
    [d.lastPeriod]: prev.revenue?.[currency] ?? 0,
  }));

  // Prefer the base-currency consolidated totals (multi-currency normalized);
  // fall back to the first currency's figure if the backend didn't supply them.
  const baseCurrency: string = summaryData?.data?.baseCurrency ?? allCurrencies[0] ?? "USD";
  const primaryCurrency = baseCurrency;
  const revenue = cur.revenueBase ?? cur.revenue?.[primaryCurrency] ?? 0;
  const prevRevenue = prev.revenueBase ?? prev.revenue?.[primaryCurrency] ?? 0;
  const underCollection = cur.underCollectionBase ?? cur.underCollection?.[primaryCurrency] ?? 0;
  const prevUnder = prev.underCollectionBase ?? prev.underCollection?.[primaryCurrency] ?? 0;
  const newCustomers = cur.newCustomers ?? 0;
  const prevCustomers = prev.newCustomers ?? 0;
  const expenses = cur.expenses?.total ?? 0;
  const prevExpenses = prev.expenses?.total ?? 0;

  const recentDeals: Deal[] = Array.isArray(dealsData?.data)
    ? (dealsData.data as Deal[]).slice(0, 5)
    : [];

  const isOnboarding = !summaryLoading && !dealsLoading && newCustomers === 0 && recentDeals.length === 0;

  return (
    <PageShell width="default">
      {/* Page header */}
      <PageHeader
        title={d.title}
        description={formatDate(new Date(), { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        primaryAction={
          <div className="flex flex-wrap items-center gap-2">
            <PeriodSelector value={period} onChange={setPeriod} />
            <QuickActions />
          </div>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList className="h-9">
          <TabsTrigger value="overview" className="text-xs">{d.tabOverview}</TabsTrigger>
          <TabsTrigger value="sales" className="text-xs">{d.tabSales}</TabsTrigger>
          <TabsTrigger value="finance" className="text-xs">{d.tabFinance}</TabsTrigger>
        </TabsList>

        {/* ── Finance tab ── */}
        <TabsContent value="finance" className="mt-5 space-y-5">
          {/* Pending approvals */}
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  {d.pendingApprovals}
                  {pending.total > 0 && (
                    <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
                      {pending.total}
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">{d.pendingApprovalsDesc}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {pending.total === 0 ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  {d.allCaughtUp}
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
                        <span className="text-xs text-muted-foreground shrink-0">{formatDate(item.createdAt, { day: "2-digit", month: "short" })}</span>
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
                <CardTitle className="text-base">{d.accountBalances}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {accounts.map((acc) => {
                    const Icon = acc.type === "bank" ? Landmark : acc.type === "safe" ? Lock : Wallet;
                    return (
                      <Link key={acc._id} to={`/settings/accounts/${acc._id}`} className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-3 hover:bg-muted/60 transition-colors">
                        <div className="rounded-lg bg-primary/10 p-2 shrink-0"><Icon className="h-3.5 w-3.5 text-primary" /></div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{acc.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{acc.type}</p>
                        </div>
                        <p className="text-sm font-bold tabular-nums">{formatCurrency(acc.balance, acc.currency)}</p>
                      </Link>
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
                  <CardTitle className="text-base">{d.outstandingInvoices}</CardTitle>
                  <CardDescription className="text-xs">{d.invoicesAwaiting(outstanding.length)}</CardDescription>
                </div>
                <Link to="/finance/invoices"><Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">{d.viewAll}</Button></Link>
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
                          {isOverdue && <Badge variant="outline" className="text-[10px] border-red-300 text-red-600 h-4 px-1.5">{d.overdue}</Badge>}
                          <span className="text-sm font-bold tabular-nums text-destructive">{formatCurrency(owed, inv.currency)}</span>
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
                <CardTitle className="text-base">{d.leadsByStatus}</CardTitle>
                <CardDescription className="text-xs">{d.leadsByStatusDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                {leadStats.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">{d.noLeadData}</p>
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
                <CardTitle className="text-base">{d.pipelineStages}</CardTitle>
                <CardDescription className="text-xs">{d.pipelineStagesDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                {pipeline.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">{d.noPipelineData}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={pipeline} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="stage" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip
                        contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }}
                      />
                      <Bar dataKey="count" name={d.deals} radius={[4, 4, 0, 0]}>
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
            return (
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { label: d.winRate, value: `${rate}%`, sub: d.winRateSub(won, total) },
                  { label: d.wonValue, value: formatCurrency(wonValue, baseCurrency), sub: d.wonValueSub },
                  { label: d.activeDeals, value: String(pipeline.filter((s) => !["won", "lost", "cancelled"].includes(s.stage)).reduce((a, s) => a + s.count, 0)), sub: d.activeDealsSub },
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
      {isOnboarding && <GettingStartedCard />}

      {/* KPI stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={d.revenue}
          value={formatCurrency(revenue, primaryCurrency)}
          sub={`vs ${formatCurrency(prevRevenue, primaryCurrency)} last period`}
          change={pct(revenue, prevRevenue)}
          icon={DollarSign}
          loading={summaryLoading}
          colorIdx={0}
        />
        <StatCard
          title={d.newContacts}
          value={String(newCustomers)}
          sub={`vs ${prevCustomers} last period`}
          change={pct(newCustomers, prevCustomers)}
          icon={Users}
          loading={summaryLoading}
          colorIdx={1}
        />
        <StatCard
          title={d.outstanding}
          value={formatCurrency(underCollection, primaryCurrency)}
          sub={`vs ${formatCurrency(prevUnder, primaryCurrency)} last period`}
          change={pct(underCollection, prevUnder)}
          icon={CreditCard}
          loading={summaryLoading}
          colorIdx={2}
        />
        <StatCard
          title={d.expenses}
          value={formatNumber(expenses)}
          sub={`vs ${formatNumber(prevExpenses)} last period`}
          change={pct(expenses, prevExpenses)}
          icon={Activity}
          loading={summaryLoading}
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
            {summaryLoading ? (
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
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => formatNumber(v)} />
                  <Tooltip
                    contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))", fontSize: 12 }}
                    formatter={(v) => (typeof v === "number" ? formatNumber(v) : "")}
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
                        {deal.customer?.name} · {formatDate(deal.createdAt, { day: "2-digit", month: "short" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={`text-xs capitalize border-0 font-medium ${STATUS_COLORS[deal.status] ?? ""}`}>
                        {deal.status}
                      </Badge>
                      <span className="text-xs font-semibold whitespace-nowrap tabular-nums text-muted-foreground">
                        {deal.price != null ? formatCurrency(deal.price, deal.currency) : "—"}
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
              <CardTitle className="text-base">{d.accounts}</CardTitle>
              <CardDescription className="text-xs">{d.balancePerAccount}</CardDescription>
            </div>
            <Link to="/settings/accounts">
              <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground hover:text-foreground">{d.manage}</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {accounts.map((acc) => {
                const Icon = acc.type === "bank" ? Landmark : acc.type === "safe" ? Lock : Wallet;
                return (
                  <Link key={acc._id} to={`/settings/accounts/${acc._id}`} className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-3 hover:bg-muted/60 transition-colors">
                    <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                      <Icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{acc.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{acc.type}</p>
                    </div>
                    <p className="ms-auto text-sm font-semibold whitespace-nowrap tabular-nums">
                      {formatCurrency(acc.balance, acc.currency)}
                    </p>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expense Breakdown */}
      {!summaryLoading && Object.keys(cur.expenses?.categories ?? {}).length > 0 && (
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
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => formatNumber(v)} />
                <YAxis type="category" dataKey="category" axisLine={false} tickLine={false} width={60} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }}
                  formatter={(v) => (typeof v === "number" ? formatNumber(v) : "")}
                />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Low stock */}
      {lowStock.length > 0 && (
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{d.lowStock}</CardTitle>
            <CardDescription className="text-xs">{d.lowStockDesc(lowStock.length)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStock.slice(0, 6).map((s) => (
                <div key={s._id ?? s.productId} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{s.productName ?? s.product?.name ?? s.productId}</span>
                  <span className="font-mono text-muted-foreground">
                    {s.quantityOnHand} / {s.reorderLevel}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
