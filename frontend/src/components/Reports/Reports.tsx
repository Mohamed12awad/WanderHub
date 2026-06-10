import React, { useState, Suspense } from "react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Printer } from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  getRevenueReport, getPipelineReport, getExpensesCategoryReport,
  getOutstandingReport, getCustomerAcquisitionReport,
  getBookingReport, getReport, getAccounts, getLeadsReport,
} from "@/utils/api";
import { Landmark, Wallet, Lock } from "lucide-react";
import LoadingSpinner from "@/components/common/spinner";
import { useAuth } from "@/contexts/authContext";
import DateForm from "./DateForm";

const ReportComponent = React.lazy(() => import("./ReportComponent"));
const BookingReportComponent = React.lazy(() => import("./BookingsReport"));

// ── helpers ───────────────────────────────────────────────────────────────────

function defaultStart() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().split("T")[0];
}
function defaultEnd() { return new Date().toISOString().split("T")[0]; }

const PIE_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6"];

const STAGE_COLORS: Record<string, string> = {
  lead: "#3b82f6", qualified: "#8b5cf6", proposal: "#eab308",
  negotiation: "#f97316", won: "#22c55e", lost: "#ef4444", cancelled: "#9ca3af",
};

const STATUS_BADGE: Record<string, string> = {
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  partially_paid: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

// ── date range bar ────────────────────────────────────────────────────────────

interface DateRange { start: string; end: string }

const DateRangeBar: React.FC<{
  value: DateRange;
  onChange: (r: DateRange) => void;
}> = ({ value, onChange }) => {
  const [draft, setDraft] = useState(value);
  return (
    <div className="flex flex-wrap items-end gap-3 mb-6 print:hidden">
      <div className="space-y-1">
        <Label className="text-xs">From</Label>
        <Input type="date" className="h-8 text-sm w-36" value={draft.start}
          onChange={(e) => setDraft((p) => ({ ...p, start: e.target.value }))} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">To</Label>
        <Input type="date" className="h-8 text-sm w-36" value={draft.end}
          onChange={(e) => setDraft((p) => ({ ...p, end: e.target.value }))} />
      </div>
      <Button size="sm" className="h-8" onClick={() => onChange(draft)}>Apply</Button>
    </div>
  );
};

// ── empty / loading helpers ───────────────────────────────────────────────────

const ChartEmpty: React.FC = () => (
  <div className="flex items-center justify-center h-52 text-sm text-muted-foreground">
    No data for the selected period.
  </div>
);

// ── main component ────────────────────────────────────────────────────────────

const Reports: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = (user?.permissions ?? []).some((p) => p === '*' || p === 'reports:view');

  const [dateRange, setDateRange] = useState<DateRange>({ start: defaultStart(), end: defaultEnd() });

  // Analytics queries
  const { data: revenueData, isFetching: fetchingRev } = useQuery({
    queryKey: ["report-revenue", dateRange],
    queryFn: () => getRevenueReport({ startDate: dateRange.start, endDate: dateRange.end }),
    placeholderData: keepPreviousData
  });
  const { data: pipelineData, isFetching: fetchingPipe } = useQuery({
    queryKey: ["report-pipeline"],
    queryFn: getPipelineReport,
    placeholderData: keepPreviousData
  });
  const { data: expCatData, isFetching: fetchingExp } = useQuery({
    queryKey: ["report-expenses-cat", dateRange],
    queryFn: () => getExpensesCategoryReport({ startDate: dateRange.start, endDate: dateRange.end }),
    placeholderData: keepPreviousData
  });
  const { data: outstandingData, isFetching: fetchingOut } = useQuery({
    queryKey: ["report-outstanding"],
    queryFn: getOutstandingReport,
    placeholderData: keepPreviousData
  });
  const { data: custData, isFetching: fetchingCust } = useQuery({
    queryKey: ["report-customers", dateRange],
    queryFn: () => getCustomerAcquisitionReport({ startDate: dateRange.start, endDate: dateRange.end }),
    placeholderData: keepPreviousData
  });
  const { data: accountsData } = useQuery({
    queryKey: ["accounts"],
    queryFn: getAccounts,
    staleTime: 60000
  });
  const { data: leadsReportData } = useQuery({
    queryKey: ["leads-report"],
    queryFn: getLeadsReport,
    staleTime: 60000
  });

  const revenue: { month: string; revenue: number; count: number }[] = revenueData?.data ?? [];
  const pipeline: { stage: string; count: number; value: number }[] = pipelineData?.data ?? [];
  const expCat: { category: string; total: number; count: number }[] = expCatData?.data ?? [];
  const outstanding: {
    _id: string; invoiceNumber: string; title: string;
    customer: { _id: string; name: string }; deal?: { _id: string; title: string };
    total: number; totalPaid: number; outstanding: number;
    dueDate?: string; status: string; currency: string;
  }[] = outstandingData?.data ?? [];
  const customers: { month: string; customers: number }[] = custData?.data ?? [];
  const accounts: any[] = accountsData?.data ?? [];
  const leadStats: { status: string; count: number }[] = leadsReportData?.data
    ? Object.entries(leadsReportData.data).map(([status, count]) => ({ status, count: count as number }))
    : [];
  const LEAD_COLORS: Record<string, string> = {
    new: "#3b82f6", contacted: "#8b5cf6", qualified: "#22c55e", unqualified: "#94a3b8", converted: "#f59e0b",
  };
  const STAGE_PIE_COLORS: Record<string, string> = {
    lead: "#3b82f6", qualified: "#8b5cf6", proposal: "#eab308",
    negotiation: "#f97316", won: "#22c55e", lost: "#ef4444", cancelled: "#9ca3af",
  };

  // Legacy report state
  const [reportData, setReportData] = useState(null);
  const [bookingReportData, setBookingReportData] = useState(null);
  const [legacyLoading, setLegacyLoading] = useState(false);

  const fetchBookingReport = async (s: string, e: string, loc: string) => {
    setLegacyLoading(true);
    try { const r = await getBookingReport({ startDate: s, endDate: e, location: loc }); setBookingReportData(r.data); }
    catch { /* silently */ } finally { setLegacyLoading(false); }
  };
  const fetchFullReport = async (s: string, e: string) => {
    setLegacyLoading(true);
    try { const r = await getReport({ startDate: s, endDate: e, location: "" }); setReportData(r.data); }
    catch { /* silently */ } finally { setLegacyLoading(false); }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center print:hidden">
        <h1 className="text-lg font-bold">Reports & Analytics</h1>
        <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => print()}>
          <Printer className="h-3.5 w-3.5" />Print
        </Button>
      </div>

      <Tabs defaultValue="revenue">
        <TabsList className="flex-wrap h-auto gap-0.5 print:hidden">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="deals">Deals Report</TabsTrigger>
          {isAdmin && <TabsTrigger value="full">Full Report</TabsTrigger>}
        </TabsList>

        {/* ── Revenue ──────────────────────────────────────────────────── */}
        {/* ── Sales tab ─────────────────────────────────── */}
        <TabsContent value="sales" className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Leads by Status</CardTitle>
                <CardDescription className="text-xs">Current lead funnel snapshot</CardDescription>
              </CardHeader>
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
              <CardHeader>
                <CardTitle className="text-sm">Deal Pipeline</CardTitle>
                <CardDescription className="text-xs">Deals count and value by stage</CardDescription>
              </CardHeader>
              <CardContent>
                {fetchingPipe ? <LoadingSpinner loading /> : pipeline.length === 0 ? <ChartEmpty /> : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={pipeline} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="stage" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Deals" radius={[4, 4, 0, 0]}>
                        {pipeline.map((entry) => <Cell key={entry.stage} fill={STAGE_PIE_COLORS[entry.stage] ?? "#94a3b8"} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Win rate summary */}
          {pipeline.length > 0 && (() => {
            const won = pipeline.find((s) => s.stage === "won")?.count ?? 0;
            const total = pipeline.filter((s) => !["lead"].includes(s.stage)).reduce((a, s) => a + s.count, 0);
            const rate = total ? Math.round((won / total) * 100) : 0;
            const wonVal = pipeline.find((s) => s.stage === "won")?.value ?? 0;
            const lostVal = pipeline.find((s) => s.stage === "lost")?.value ?? 0;
            return (
              <div className="grid sm:grid-cols-4 gap-4">
                {[
                  { label: "Win Rate", value: `${rate}%`, color: "text-emerald-600" },
                  { label: "Won Deals", value: String(won), color: "" },
                  { label: "Won Value", value: wonVal.toLocaleString(), color: "text-emerald-600" },
                  { label: "Lost Value", value: lostVal.toLocaleString(), color: "text-destructive" },
                ].map(({ label, value, color }) => (
                  <Card key={label}>
                    <CardContent className="pt-4 pb-3">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })()}
        </TabsContent>

        {/* ── Accounts tab ──────────────────────────────── */}
        <TabsContent value="accounts" className="space-y-5">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((acc) => {
              const Icon = acc.type === "bank" ? Landmark : acc.type === "safe" ? Lock : Wallet;
              return (
                <Card key={acc._id}>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="rounded-lg bg-primary/10 p-2"><Icon className="h-4 w-4 text-primary" /></div>
                      <div>
                        <p className="text-sm font-semibold">{acc.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{acc.type}</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold tabular-nums">{acc.balance.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{acc.currency}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {accounts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Balance Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={accounts} dataKey="balance" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50}
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                      {accounts.map((_: any, i: number) => (
                        <Cell key={i} fill={["#3b82f6", "#8b5cf6", "#22c55e", "#f97316", "#eab308"][i % 5]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => (Number(v)).toLocaleString()} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {accounts.length === 0 && (
            <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">
              No accounts configured. <Link to="/settings/accounts" className="text-primary hover:underline">Add an account</Link>
            </CardContent></Card>
          )}
        </TabsContent>

        {/* ── Revenue tab ───────────────────────────────── */}
        <TabsContent value="revenue">
          <DateRangeBar value={dateRange} onChange={setDateRange} />
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Revenue by Month</CardTitle>
              <CardDescription className="text-xs">Total payments collected per month across all invoices.</CardDescription>
            </CardHeader>
            <CardContent>
              {fetchingRev ? <LoadingSpinner loading /> : revenue.length === 0 ? <ChartEmpty /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={revenue} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v.toLocaleString()} />
                    <Tooltip formatter={(v) => (Number(v)).toLocaleString()} />
                    <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Pipeline ─────────────────────────────────────────────────── */}
        <TabsContent value="pipeline">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Pipeline by Stage</CardTitle>
              <CardDescription className="text-xs">Number of deals at each stage with total deal value.</CardDescription>
            </CardHeader>
            <CardContent>
              {fetchingPipe ? <LoadingSpinner loading /> : pipeline.every((d) => d.count === 0) ? <ChartEmpty /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={pipeline} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v, name) => [(Number(v)).toLocaleString(), String(name)]} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="count" name="Deals" radius={[4, 4, 0, 0]}>
                      {pipeline.map((entry) => (
                        <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage] ?? "#6366f1"} />
                      ))}
                    </Bar>
                    <Bar yAxisId="right" dataKey="value" name="Value" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Expenses ─────────────────────────────────────────────────── */}
        <TabsContent value="expenses">
          <DateRangeBar value={dateRange} onChange={setDateRange} />
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Expenses by Category</CardTitle>
                <CardDescription className="text-xs">Breakdown of approved expense line items.</CardDescription>
              </CardHeader>
              <CardContent>
                {fetchingExp ? <LoadingSpinner loading /> : expCat.length === 0 ? <ChartEmpty /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={expCat} dataKey="total" nameKey="category" cx="50%" cy="50%"
                        outerRadius={90} label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        labelLine={false}>
                        {expCat.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => (Number(v)).toLocaleString()} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Category Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {expCat.length === 0 ? <ChartEmpty /> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Items</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expCat.map((row, i) => (
                        <TableRow key={row.category}>
                          <TableCell className="flex items-center gap-2">
                            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="capitalize">{row.category}</span>
                          </TableCell>
                          <TableCell className="text-right font-medium">{row.total.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{row.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Outstanding Invoices ──────────────────────────────────────── */}
        <TabsContent value="outstanding">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Outstanding Invoices</CardTitle>
              <CardDescription className="text-xs">
                Sent, partially paid, and overdue invoices. Total outstanding:{" "}
                <span className="font-semibold text-red-600">
                  {outstanding.reduce((s, i) => s + i.outstanding, 0).toLocaleString()}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {fetchingOut ? <LoadingSpinner loading /> : outstanding.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">All invoices are paid. 🎉</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead className="">Deal</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Outstanding</TableHead>
                        <TableHead className="">Due Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {outstanding.map((inv) => (
                        <TableRow key={inv._id}>
                          <TableCell>
                            <Link to={`/finance/invoices/${inv._id}`} className="font-mono text-sm text-blue-500 hover:underline">
                              {inv.invoiceNumber}
                            </Link>
                          </TableCell>
                          <TableCell>
                            {inv.customer ? (
                              <Link to={`/customers/${inv.customer._id}`} className="text-blue-500 hover:underline">
                                {inv.customer.name}
                              </Link>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {inv.deal ? (
                              <Link to={`/deals/${inv.deal._id}`} className="text-blue-500 hover:underline">
                                {inv.deal.title}
                              </Link>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-right">{inv.total.toLocaleString()} {inv.currency}</TableCell>
                          <TableCell className="text-right text-green-600">{inv.totalPaid.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-semibold text-red-600">
                            {inv.outstanding.toLocaleString()} {inv.currency}
                          </TableCell>
                          <TableCell className={`text-sm ${inv.status === "overdue" ? "text-red-500" : "text-muted-foreground"}`}>
                            {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={STATUS_BADGE[inv.status] ?? ""}>
                              {inv.status.replace("_", " ")}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Customer Acquisition ─────────────────────────────────────── */}
        <TabsContent value="customers">
          <DateRangeBar value={dateRange} onChange={setDateRange} />
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Customer Acquisition</CardTitle>
              <CardDescription className="text-xs">New customers added per month.</CardDescription>
            </CardHeader>
            <CardContent>
              {fetchingCust ? <LoadingSpinner loading /> : customers.length === 0 ? <ChartEmpty /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={customers} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="customers" stroke="#6366f1" strokeWidth={2}
                      dot={{ r: 4 }} activeDot={{ r: 6 }} name="New Customers" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Legacy: Deals Report ──────────────────────────────────────── */}
        <TabsContent value="deals">
          <LoadingSpinner loading={legacyLoading} />
          <DateForm onSubmit={fetchBookingReport} searchByLocation />
          <Suspense fallback={<div className="p-4 text-sm">Loading…</div>}>
            {bookingReportData && <BookingReportComponent bookings={bookingReportData} />}
          </Suspense>
        </TabsContent>

        {/* ── Legacy: Full Report ───────────────────────────────────────── */}
        {isAdmin && (
          <TabsContent value="full">
            <LoadingSpinner loading={legacyLoading} />
            <DateForm onSubmit={fetchFullReport} searchByLocation={false} />
            <Suspense fallback={<div className="p-4 text-sm">Loading…</div>}>
              {reportData && <ReportComponent reportData={reportData} />}
            </Suspense>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Reports;
