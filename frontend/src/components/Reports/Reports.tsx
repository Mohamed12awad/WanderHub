import React, { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend, ComposedChart,
} from "recharts";
import {
  getRevenueReport, getPipelineReport, getExpensesCategoryReport,
  getOutstandingReport, getCustomerAcquisitionReport,
  getBookingReport, getReport, getAccounts, getLeadsReport,
  getSalesLeaderboard, getConversionFunnel, getDealMetrics,
  getProfitLoss, getArAging, getTopCustomers, getExpenseTrend,
  getTopProducts, getInventoryValuation, getTaskStats,
} from "@/utils/api";
import { Landmark, Wallet, Lock } from "lucide-react";
import LoadingSpinner from "@/components/common/spinner";
import { useAuth } from "@/contexts/authContext";
import { useToast } from "@/components/ui/use-toast";
import { downloadCSV } from "@/utils/csv";
import { defaultPeriod, type PeriodPreset } from "@/components/common/PeriodSelector";
import { ReportsFilterBar, toReportFilters, type ReportsState } from "./ReportsFilterBar";
import { PageShell } from "@/components/common/PageShell";
import { PageHeader } from "@/components/common/PageHeader";
import { useLanguage } from "@/contexts/LanguageContext";

// ── helpers ───────────────────────────────────────────────────────────────────

const PIE_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6"];
const STAGE_COLORS: Record<string, string> = {
  lead: "#3b82f6", qualified: "#8b5cf6", proposal: "#eab308",
  negotiation: "#f97316", won: "#22c55e", lost: "#ef4444", cancelled: "#9ca3af",
};
const LEAD_COLORS: Record<string, string> = {
  new: "#3b82f6", contacted: "#8b5cf6", qualified: "#22c55e", unqualified: "#94a3b8", converted: "#f59e0b",
};
const STATUS_BADGE: Record<string, string> = {
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  partially_paid: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const ChartEmpty: React.FC = () => (
  <div className="flex items-center justify-center h-52 text-sm text-muted-foreground">
    No data for the selected period.
  </div>
);

const OUTSTANDING_STATUS = [
  { value: "sent", label: "Sent" },
  { value: "partially_paid", label: "Partially paid" },
  { value: "overdue", label: "Overdue" },
];

// ── main component ────────────────────────────────────────────────────────────

const Reports: React.FC = () => {
  const { formatCurrency, formatDate, formatNumber } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = (user?.permissions ?? []).some((p) => p === "*" || p === "reports:view");

  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") || "revenue";

  // Default filter set: the current month (no extra filters).
  const dflt = defaultPeriod("month");
  const state: ReportsState = {
    preset: (sp.get("preset") as PeriodPreset) || dflt.preset,
    startDate: sp.get("start") || dflt.startDate,
    endDate: sp.get("end") || dflt.endDate,
    groupBy: (sp.get("group") as ReportsState["groupBy"]) || "month",
    ownerId: sp.get("owner") || undefined,
    status: sp.get("status") || undefined,
    currency: sp.get("currency") || undefined,
  };

  const setState = (next: ReportsState) => {
    const p = new URLSearchParams(sp);
    p.set("preset", next.preset); p.set("start", next.startDate); p.set("end", next.endDate); p.set("group", next.groupBy);
    next.ownerId ? p.set("owner", next.ownerId) : p.delete("owner");
    next.status ? p.set("status", next.status) : p.delete("status");
    next.currency ? p.set("currency", next.currency) : p.delete("currency");
    setSp(p, { replace: true });
  };
  const setTab = (t: string) => {
    const p = new URLSearchParams(sp);
    p.set("tab", t);
    p.delete("status"); // status is tab-specific
    setSp(p, { replace: true });
  };
  // Reset clears every filter (keeping the tab) so defaults — the current month — apply.
  const resetFilters = () => setSp(new URLSearchParams({ tab }), { replace: true });

  const filters = useMemo(() => toReportFilters(state), [state]);
  const enabledFor = (t: string) => tab === t;

  // ── Queries ─────────────────────────────────────────────────────────────
  const { data: revenueData, isFetching: fetchingRev } = useQuery({ queryKey: ["report-revenue", filters], queryFn: () => getRevenueReport(filters), placeholderData: keepPreviousData });
  const { data: pipelineData, isFetching: fetchingPipe } = useQuery({ queryKey: ["report-pipeline", filters], queryFn: () => getPipelineReport(filters), placeholderData: keepPreviousData });
  const { data: expCatData, isFetching: fetchingExp } = useQuery({ queryKey: ["report-expenses-cat", filters], queryFn: () => getExpensesCategoryReport(filters), placeholderData: keepPreviousData });
  const { data: outstandingData, isFetching: fetchingOut } = useQuery({ queryKey: ["report-outstanding", filters], queryFn: () => getOutstandingReport(filters), placeholderData: keepPreviousData });
  const { data: custData, isFetching: fetchingCust } = useQuery({ queryKey: ["report-customers", filters], queryFn: () => getCustomerAcquisitionReport(filters), placeholderData: keepPreviousData });
  const { data: accountsData } = useQuery({ queryKey: ["accounts"], queryFn: getAccounts, staleTime: 60000 });
  const { data: leadsReportData } = useQuery({ queryKey: ["leads-report", filters], queryFn: () => getLeadsReport(filters), staleTime: 60000 });

  // New analytics (fetched only when their tab is active)
  const { data: leaderboardData } = useQuery({ queryKey: ["report-leaderboard", filters], queryFn: () => getSalesLeaderboard(filters), enabled: enabledFor("performance"), placeholderData: keepPreviousData });
  const { data: funnelData } = useQuery({ queryKey: ["report-funnel", filters], queryFn: () => getConversionFunnel(filters), enabled: enabledFor("performance"), placeholderData: keepPreviousData });
  const { data: dealMetricsData } = useQuery({ queryKey: ["report-deal-metrics", filters], queryFn: () => getDealMetrics(filters), enabled: enabledFor("performance"), placeholderData: keepPreviousData });
  const { data: pnlData, isFetching: fetchingPnl } = useQuery({ queryKey: ["report-pnl", filters], queryFn: () => getProfitLoss(filters), enabled: enabledFor("pnl"), placeholderData: keepPreviousData });
  const { data: agingData, isFetching: fetchingAging } = useQuery({ queryKey: ["report-aging", filters], queryFn: () => getArAging(filters), enabled: enabledFor("aging"), placeholderData: keepPreviousData });
  const { data: topCustData } = useQuery({ queryKey: ["report-top-customers", filters], queryFn: () => getTopCustomers(filters), enabled: enabledFor("top"), placeholderData: keepPreviousData });
  const { data: topProdData } = useQuery({ queryKey: ["report-top-products", filters], queryFn: () => getTopProducts(filters), enabled: enabledFor("top"), placeholderData: keepPreviousData });
  const { data: expTrendData, isFetching: fetchingTrend } = useQuery({ queryKey: ["report-expense-trend", filters], queryFn: () => getExpenseTrend(filters), enabled: enabledFor("expenses"), placeholderData: keepPreviousData });
  const { data: inventoryData } = useQuery({ queryKey: ["report-inventory"], queryFn: getInventoryValuation, enabled: enabledFor("inventory") });
  const { data: taskStatsData, isFetching: fetchingTasks } = useQuery({ queryKey: ["report-tasks", filters], queryFn: () => getTaskStats(filters), enabled: enabledFor("tasks"), placeholderData: keepPreviousData });

  // ── Derived data ────────────────────────────────────────────────────────
  const revenue: { month: string; revenue: number; count: number }[] = revenueData?.data ?? [];
  const pipeline: { stage: string; count: number; value: number }[] = pipelineData?.data ?? [];
  const expCat: { category: string; total: number; count: number }[] = expCatData?.data ?? [];
  const outstanding: { _id: string; invoiceNumber: string; title: string; customer: { _id: string; name: string } | null; deal?: { _id: string; title: string } | null; total: number; totalPaid: number; outstanding: number; dueDate?: string; status: string; currency: string }[] = outstandingData?.data ?? [];
  const customers: { month: string; customers: number }[] = custData?.data ?? [];
  const accounts: { _id: string; name: string; type: string; balance: number; currency: string }[] = accountsData?.data ?? [];
  const leadStats: { status: string; count: number }[] = leadsReportData?.data ? Object.entries(leadsReportData.data).map(([status, count]) => ({ status, count: count as number })) : [];
  const leaderboard: { ownerId: string; name: string; count: number; value: number }[] = leaderboardData?.data ?? [];
  const funnel: { stage: string; count: number; conversion: number }[] = funnelData?.data ?? [];
  const dealMetrics: { totalDeals: number; wonCount: number; avgDealSize: number; avgSalesCycleDays: number; winRate: number } | undefined = dealMetricsData?.data;
  const pnl: { period: string; revenue: number; expenses: number; profit: number }[] = pnlData?.data ?? [];
  const aging: { bucket: string; total: number; count: number }[] = agingData?.data ?? [];
  const topCustomers: { customerId: string; name: string; revenue: number }[] = topCustData?.data ?? [];
  const topProducts: { productId: string | null; name: string; qty: number; revenue: number }[] = topProdData?.data ?? [];
  const expTrend: { period: string; total: number }[] = expTrendData?.data ?? [];
  const inventory: { totalProducts: number; lowStock: number; products: { productId: string; name: string; quantityOnHand: number; reorderLevel: number; location?: string; lowStock: boolean }[] } | undefined = inventoryData?.data;
  const taskStats: { period: string; created: number; completed: number; overdue: number }[] = taskStatsData?.data ?? [];

  const currencyOptions = useMemo(() => [...new Set(accounts.map((a) => a.currency).filter(Boolean))], [accounts]);
  const statusOptions = tab === "outstanding" ? OUTSTANDING_STATUS : undefined;

  // ── CSV export (per active tab) ───────────────────────────────────────────
  const exportRows = (): Record<string, unknown>[] => {
    switch (tab) {
      case "revenue": return revenue;
      case "pipeline": case "sales": return pipeline;
      case "expenses": return expCat;
      case "outstanding": return outstanding.map((o) => ({ invoice: o.invoiceNumber, customer: o.customer?.name ?? "", total: o.total, paid: o.totalPaid, outstanding: o.outstanding, dueDate: o.dueDate ?? "", status: o.status, currency: o.currency }));
      case "customers": return customers;
      case "performance": return leaderboard;
      case "pnl": return pnl;
      case "aging": return aging;
      case "top": return topCustomers;
      case "inventory": return inventory?.products ?? [];
      case "tasks": return taskStats;
      default: return [];
    }
  };
  const handleExport = () => {
    const rows = exportRows();
    if (!rows.length) { toast({ title: "Nothing to export for this tab." }); return; }
    downloadCSV(rows, `${tab}-${state.startDate}_${state.endDate}.csv`);
  };

  return (
    <PageShell width="default">
      <PageHeader
        className="print:hidden"
        title="Reports & Analytics"
        primaryAction={
          <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => print()}>
            <Printer className="h-3.5 w-3.5" />Print
          </Button>
        }
      />

      <ReportsFilterBar
        value={state}
        onChange={setState}
        statusOptions={statusOptions}
        currencyOptions={currencyOptions}
        onExport={handleExport}
        onReset={resetFilters}
        serializeState={() => sp.toString()}
        applyState={(q) => setSp(new URLSearchParams(q), { replace: true })}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-0.5 print:hidden">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="pnl">P&amp;L</TabsTrigger>
          <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
          <TabsTrigger value="aging">AR Aging</TabsTrigger>
          <TabsTrigger value="top">Top</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="deals">Deals Report</TabsTrigger>
          {isAdmin && <TabsTrigger value="full">Full Report</TabsTrigger>}
        </TabsList>

        {/* ── Revenue ── */}
        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Revenue by {state.groupBy}</CardTitle>
              <CardDescription className="text-xs">Total payments collected per period across all invoices.</CardDescription>
            </CardHeader>
            <CardContent>
              {fetchingRev ? <LoadingSpinner loading /> : revenue.length === 0 ? <ChartEmpty /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={revenue} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatNumber(v)} />
                    <Tooltip formatter={(v) => formatNumber(Number(v))} />
                    <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Sales (leads + pipeline + win rate) ── */}
        <TabsContent value="sales" className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm">Leads by Status</CardTitle><CardDescription className="text-xs">Current lead funnel snapshot</CardDescription></CardHeader>
              <CardContent>
                {leadStats.length === 0 ? <ChartEmpty /> : (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={leadStats} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} innerRadius={45} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                          {leadStats.map((entry) => <Cell key={entry.status} fill={LEAD_COLORS[entry.status] ?? "#94a3b8"} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2.5 shrink-0">
                      {leadStats.map((s) => (
                        <div key={s.status} className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: LEAD_COLORS[s.status] ?? "#94a3b8" }} />
                          <span className="text-xs capitalize text-muted-foreground w-20">{s.status}</span>
                          <span className="text-xs font-bold">{s.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Deal Pipeline</CardTitle><CardDescription className="text-xs">Deals count and value by stage</CardDescription></CardHeader>
              <CardContent>
                {fetchingPipe ? <LoadingSpinner loading /> : pipeline.length === 0 ? <ChartEmpty /> : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={pipeline} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="stage" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Deals" radius={[4, 4, 0, 0]}>
                        {pipeline.map((entry) => <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage] ?? "#94a3b8"} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Pipeline ── */}
        <TabsContent value="pipeline">
          <Card>
            <CardHeader><CardTitle className="text-sm">Pipeline by Stage</CardTitle><CardDescription className="text-xs">Number of deals at each stage with total deal value.</CardDescription></CardHeader>
            <CardContent>
              {fetchingPipe ? <LoadingSpinner loading /> : pipeline.every((d) => d.count === 0) ? <ChartEmpty /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={pipeline} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v, name) => [formatNumber(Number(v)), String(name)]} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="count" name="Deals" radius={[4, 4, 0, 0]}>
                      {pipeline.map((entry) => <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage] ?? "#6366f1"} />)}
                    </Bar>
                    <Bar yAxisId="right" dataKey="value" name="Value" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Performance (leaderboard + conversion + metrics) ── */}
        <TabsContent value="performance" className="space-y-5">
          {dealMetrics && (
            <div className="grid sm:grid-cols-4 gap-4">
              {[
                { label: "Win Rate", value: `${dealMetrics.winRate}%` },
                { label: "Won Deals", value: String(dealMetrics.wonCount) },
                { label: "Avg Deal Size", value: formatNumber(dealMetrics.avgDealSize) },
                { label: "Avg Sales Cycle", value: `${dealMetrics.avgSalesCycleDays}d` },
              ].map((m) => (
                <Card key={m.label}><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">{m.label}</p><p className="text-xl font-bold mt-1">{m.value}</p></CardContent></Card>
              ))}
            </div>
          )}
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm">Sales Leaderboard</CardTitle><CardDescription className="text-xs">Won deals by owner (base currency).</CardDescription></CardHeader>
              <CardContent>
                {leaderboard.length === 0 ? <ChartEmpty /> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Owner</TableHead><TableHead className="text-right">Won</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {leaderboard.map((o) => (
                        <TableRow key={o.ownerId}><TableCell dir="auto">{o.name}</TableCell><TableCell className="text-right">{o.count}</TableCell><TableCell className="text-right font-medium">{formatNumber(o.value)}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Conversion Funnel</CardTitle><CardDescription className="text-xs">Leads → deals → won, with conversion vs leads.</CardDescription></CardHeader>
              <CardContent>
                {funnel.length === 0 ? <ChartEmpty /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={funnel} layout="vertical" margin={{ top: 4, right: 32, left: 16, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} width={60} />
                      <Tooltip formatter={(v, n) => [formatNumber(Number(v)), String(n)]} />
                      <Bar dataKey="count" name="Count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Expenses (category + trend) ── */}
        <TabsContent value="expenses" className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Expenses by Category</CardTitle><CardDescription className="text-xs">Breakdown of approved expense line items.</CardDescription></CardHeader>
              <CardContent>
                {fetchingExp ? <LoadingSpinner loading /> : expCat.length === 0 ? <ChartEmpty /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={expCat} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                        {expCat.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatNumber(Number(v))} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Expense Trend</CardTitle><CardDescription className="text-xs">Approved expenses per period.</CardDescription></CardHeader>
              <CardContent>
                {fetchingTrend ? <LoadingSpinner loading /> : expTrend.length === 0 ? <ChartEmpty /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={expTrend} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatNumber(v)} />
                      <Tooltip formatter={(v) => formatNumber(Number(v))} />
                      <Line type="monotone" dataKey="total" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Expenses" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── P&L ── */}
        <TabsContent value="pnl">
          <Card>
            <CardHeader><CardTitle className="text-sm">Profit &amp; Loss</CardTitle><CardDescription className="text-xs">Collected revenue vs approved expenses per period (base currency).</CardDescription></CardHeader>
            <CardContent>
              {fetchingPnl ? <LoadingSpinner loading /> : pnl.length === 0 ? <ChartEmpty /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={pnl} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatNumber(v)} />
                    <Tooltip formatter={(v, n) => [formatNumber(Number(v)), String(n)]} />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="profit" name="Profit" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Outstanding ── */}
        <TabsContent value="outstanding">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Outstanding Invoices</CardTitle>
              <CardDescription className="text-xs">
                Sent, partially paid, and overdue invoices. Total outstanding:{" "}
                <span className="font-semibold text-red-600">{formatNumber(outstanding.reduce((s, i) => s + i.outstanding, 0))}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {fetchingOut ? <LoadingSpinner loading /> : outstanding.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">All invoices are paid. 🎉</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Customer</TableHead><TableHead>Deal</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Paid</TableHead><TableHead className="text-right">Outstanding</TableHead><TableHead>Due Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {outstanding.map((inv) => (
                        <TableRow key={inv._id}>
                          <TableCell><Link to={`/finance/invoices/${inv._id}`} className="font-mono text-sm text-blue-500 hover:underline">{inv.invoiceNumber}</Link></TableCell>
                          <TableCell dir="auto">{inv.customer ? <Link to={`/customers/${inv.customer._id}`} className="text-blue-500 hover:underline">{inv.customer.name}</Link> : "—"}</TableCell>
                          <TableCell dir="auto" className="text-sm text-muted-foreground">{inv.deal ? <Link to={`/deals/${inv.deal._id}`} className="text-blue-500 hover:underline">{inv.deal.title}</Link> : "—"}</TableCell>
                          <TableCell className="text-right">{formatCurrency(inv.total, inv.currency)}</TableCell>
                          <TableCell className="text-right text-green-600">{formatNumber(inv.totalPaid)}</TableCell>
                          <TableCell className="text-right font-semibold text-red-600">{formatCurrency(inv.outstanding, inv.currency)}</TableCell>
                          <TableCell className={`text-sm ${inv.status === "overdue" ? "text-red-500" : "text-muted-foreground"}`}>{inv.dueDate ? formatDate(inv.dueDate) : "—"}</TableCell>
                          <TableCell><Badge variant="outline" className={STATUS_BADGE[inv.status] ?? ""}>{inv.status.replace("_", " ")}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── AR Aging ── */}
        <TabsContent value="aging">
          <Card>
            <CardHeader><CardTitle className="text-sm">Accounts Receivable Aging</CardTitle><CardDescription className="text-xs">Outstanding balances bucketed by days overdue (base currency).</CardDescription></CardHeader>
            <CardContent>
              {fetchingAging ? <LoadingSpinner loading /> : aging.every((b) => b.total === 0) ? <ChartEmpty /> : (
                <div className="grid md:grid-cols-2 gap-5 items-center">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={aging} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatNumber(v)} />
                      <Tooltip formatter={(v) => formatNumber(Number(v))} />
                      <Bar dataKey="total" name="Outstanding" radius={[4, 4, 0, 0]}>
                        {aging.map((_, i) => <Cell key={i} fill={["#22c55e", "#eab308", "#f97316", "#ef4444", "#b91c1c"][i % 5]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <Table>
                    <TableHeader><TableRow><TableHead>Bucket</TableHead><TableHead className="text-right">Invoices</TableHead><TableHead className="text-right">Outstanding</TableHead></TableRow></TableHeader>
                    <TableBody>{aging.map((b) => <TableRow key={b.bucket}><TableCell>{b.bucket}</TableCell><TableCell className="text-right">{b.count}</TableCell><TableCell className="text-right font-medium">{formatNumber(b.total)}</TableCell></TableRow>)}</TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Top (customers + products) ── */}
        <TabsContent value="top" className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Top Customers</CardTitle><CardDescription className="text-xs">By collected revenue (base currency).</CardDescription></CardHeader>
            <CardContent>
              {topCustomers.length === 0 ? <ChartEmpty /> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
                  <TableBody>{topCustomers.map((c) => <TableRow key={c.customerId}><TableCell dir="auto"><Link to={`/customers/${c.customerId}`} className="text-blue-500 hover:underline">{c.name}</Link></TableCell><TableCell className="text-right font-medium">{formatNumber(c.revenue)}</TableCell></TableRow>)}</TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Top Products</CardTitle><CardDescription className="text-xs">By invoiced revenue (base currency).</CardDescription></CardHeader>
            <CardContent>
              {topProducts.length === 0 ? <ChartEmpty /> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
                  <TableBody>{topProducts.map((p) => <TableRow key={p.productId ?? p.name}><TableCell dir="auto">{p.name}</TableCell><TableCell className="text-right">{formatNumber(p.qty)}</TableCell><TableCell className="text-right font-medium">{formatNumber(p.revenue)}</TableCell></TableRow>)}</TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Accounts ── */}
        <TabsContent value="accounts" className="space-y-5">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((acc) => {
              const Icon = acc.type === "bank" ? Landmark : acc.type === "safe" ? Lock : Wallet;
              return (
                <Link key={acc._id} to={`/settings/accounts/${acc._id}`} className="block">
                  <Card className="hover:border-primary/40 hover:shadow-sm transition-colors">
                    <CardContent className="pt-5 pb-4">
                      <div className="flex items-center gap-3 mb-3"><div className="rounded-lg bg-primary/10 p-2"><Icon className="h-4 w-4 text-primary" /></div><div><p className="text-sm font-semibold">{acc.name}</p><p className="text-xs text-muted-foreground capitalize">{acc.type}</p></div></div>
                      <p className="text-2xl font-bold tabular-nums">{formatNumber(acc.balance)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{acc.currency}</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
          {accounts.length === 0 && (
            <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">No accounts configured. <Link to="/settings/accounts" className="text-primary hover:underline">Add an account</Link></CardContent></Card>
          )}
        </TabsContent>

        {/* ── Customers ── */}
        <TabsContent value="customers">
          <Card>
            <CardHeader><CardTitle className="text-sm">Customer Acquisition</CardTitle><CardDescription className="text-xs">New customers added per period.</CardDescription></CardHeader>
            <CardContent>
              {fetchingCust ? <LoadingSpinner loading /> : customers.length === 0 ? <ChartEmpty /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={customers} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="customers" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name="New Customers" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Inventory ── */}
        <TabsContent value="inventory" className="space-y-5">
          {inventory && (
            <div className="grid sm:grid-cols-2 gap-4">
              <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Tracked Products</p><p className="text-xl font-bold mt-1">{inventory.totalProducts}</p></CardContent></Card>
              <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Low Stock</p><p className="text-xl font-bold mt-1 text-amber-600">{inventory.lowStock}</p></CardContent></Card>
            </div>
          )}
          <Card>
            <CardHeader><CardTitle className="text-sm">Stock Levels</CardTitle></CardHeader>
            <CardContent>
              {!inventory || inventory.products.length === 0 ? <ChartEmpty /> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Location</TableHead><TableHead className="text-right">On Hand</TableHead><TableHead className="text-right">Reorder</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>{inventory.products.map((p) => (
                    <TableRow key={p.productId}><TableCell dir="auto">{p.name}</TableCell><TableCell dir="auto" className="text-muted-foreground">{p.location ?? "—"}</TableCell><TableCell className="text-right">{p.quantityOnHand}</TableCell><TableCell className="text-right">{p.reorderLevel}</TableCell><TableCell>{p.lowStock ? <Badge variant="outline" className="border-amber-300 text-amber-600">Low</Badge> : <Badge variant="outline" className="border-green-300 text-green-600">OK</Badge>}</TableCell></TableRow>
                  ))}</TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tasks ── */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader><CardTitle className="text-sm">Task Throughput</CardTitle><CardDescription className="text-xs">Created, completed, and overdue tasks per period.</CardDescription></CardHeader>
            <CardContent>
              {fetchingTasks ? <LoadingSpinner loading /> : taskStats.length === 0 ? <ChartEmpty /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={taskStats} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="created" name="Created" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" name="Completed" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="overdue" name="Overdue" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Deals Report (date-range list of deals) ── */}
        <TabsContent value="deals">
          <DealsReportTab startDate={state.startDate} endDate={state.endDate} enabled={enabledFor("deals")} />
        </TabsContent>

        {/* ── Full Report (accounting snapshot) ── */}
        {isAdmin && (
          <TabsContent value="full">
            <FullReportTab startDate={state.startDate} endDate={state.endDate} enabled={enabledFor("full")} />
          </TabsContent>
        )}
      </Tabs>
    </PageShell>
  );
};

// ── Deals Report: every deal created in the selected range ──────────────────
interface DealRow {
  _id: string;
  title: string;
  customer?: { name?: string } | null;
  status: string;
  category?: string | null;
  price: number | string;
  currency: string;
  expectedCloseDate?: string | null;
  createdAt?: string;
}

function DealsReportTab({ startDate, endDate, enabled }: { startDate: string; endDate: string; enabled: boolean }) {
  const { formatCurrency, formatDate, formatNumber } = useLanguage();
  const { data, isFetching } = useQuery({
    queryKey: ["report-deals-list", startDate, endDate],
    queryFn: () => getBookingReport({ startDate, endDate, location: "" }),
    enabled,
    placeholderData: keepPreviousData,
  });
  const deals: DealRow[] = data?.data ?? [];
  const total = deals.reduce((s, d) => s + Number(d.price || 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Deals Report</CardTitle>
        <CardDescription className="text-xs">
          {deals.length} deal{deals.length !== 1 ? "s" : ""} created in range · total value {formatNumber(total)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isFetching ? <LoadingSpinner loading /> : deals.length === 0 ? <ChartEmpty /> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Deal</TableHead><TableHead>Customer</TableHead><TableHead>Category</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Value</TableHead><TableHead>Expected Close</TableHead></TableRow></TableHeader>
              <TableBody>
                {deals.map((d) => (
                  <TableRow key={d._id}>
                    <TableCell dir="auto"><Link to={`/deals/${d._id}`} className="text-blue-500 hover:underline">{d.title}</Link></TableCell>
                    <TableCell dir="auto" className="text-muted-foreground">{d.customer?.name ?? "—"}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">{d.category?.replace(/_/g, " ") ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{d.status}</Badge></TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(Number(d.price || 0), d.currency)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d.expectedCloseDate ? formatDate(d.expectedCloseDate) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Full Report: accounting snapshot { deals, purchase orders, expense reports } ─
interface FullReport {
  bookings: DealRow[];
  purchases: { _id: string; poNumber?: string; title?: string; total: number | string; currency?: string; status: string }[];
  expenses: { _id: string; title: string; approvalStatus: string; expenses?: { amount: number | string }[] }[];
}

function FullReportTab({ startDate, endDate, enabled }: { startDate: string; endDate: string; enabled: boolean }) {
  const { formatCurrency, formatNumber } = useLanguage();
  const { data, isFetching } = useQuery({
    queryKey: ["report-full", startDate, endDate],
    queryFn: () => getReport({ startDate, endDate, location: "" }),
    enabled,
    placeholderData: keepPreviousData,
  });
  const report: FullReport = data?.data ?? { bookings: [], purchases: [], expenses: [] };
  const empty = !report.bookings.length && !report.purchases.length && !report.expenses.length;

  if (isFetching) return <LoadingSpinner loading />;
  if (empty) return <ChartEmpty />;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader><CardTitle className="text-sm">Deals ({report.bookings.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Deal</TableHead><TableHead>Customer</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader>
            <TableBody>{report.bookings.map((d) => (
              <TableRow key={d._id}><TableCell dir="auto"><Link to={`/deals/${d._id}`} className="text-blue-500 hover:underline">{d.title}</Link></TableCell><TableCell dir="auto" className="text-muted-foreground">{d.customer?.name ?? "—"}</TableCell><TableCell className="capitalize">{d.status}</TableCell><TableCell dir="auto" className="text-right">{formatCurrency(Number(d.price || 0), d.currency)}</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Purchase Orders ({report.purchases.length})</CardTitle></CardHeader>
        <CardContent>
          {report.purchases.length === 0 ? <p className="text-sm text-muted-foreground py-2">None in range.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>PO</TableHead><TableHead>Title</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
              <TableBody>{report.purchases.map((p) => (
                <TableRow key={p._id}><TableCell dir="auto" className="font-mono text-sm">{p.poNumber ?? "—"}</TableCell><TableCell dir="auto" className="text-muted-foreground">{p.title ?? "—"}</TableCell><TableCell className="capitalize">{p.status}</TableCell><TableCell dir="auto" className="text-right">{p.currency ? formatCurrency(Number(p.total || 0), p.currency) : formatNumber(Number(p.total || 0))}</TableCell></TableRow>
              ))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Expense Reports ({report.expenses.length})</CardTitle></CardHeader>
        <CardContent>
          {report.expenses.length === 0 ? <p className="text-sm text-muted-foreground py-2">None in range.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Report</TableHead><TableHead>Approval</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
              <TableBody>{report.expenses.map((er) => {
                const sum = (er.expenses ?? []).reduce((s, x) => s + Number(x.amount || 0), 0);
                return <TableRow key={er._id}><TableCell dir="auto">{er.title}</TableCell><TableCell className="capitalize">{er.approvalStatus}</TableCell><TableCell className="text-right">{formatNumber(sum)}</TableCell></TableRow>;
              })}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default Reports;
