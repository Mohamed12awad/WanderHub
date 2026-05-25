import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Users, DollarSign, CreditCard, Activity, PlusCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSummery, getDeals } from "@/utils/api";
import { useQuery } from "react-query";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

function pct(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

const STATUS_COLORS: Record<string, string> = {
  lead: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  qualified: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
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

function StatCard({
  title, value, sub, change, icon: Icon, loading,
}: {
  title: string; value: string; sub: string; change: number; icon: React.ElementType; loading: boolean;
}) {
  const up = change >= 0;
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="rounded-lg bg-primary/10 p-1.5">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <>
            <Skeleton className="h-7 w-32 mb-1" />
            <Skeleton className="h-4 w-40" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold flex items-center gap-2 flex-wrap">
              {value}
              <span className={`text-xs flex items-center gap-0.5 ${up ? "text-emerald-600" : "text-red-500"}`}>
                {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {up ? "+" : ""}{change.toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const { tr } = useLanguage();
  const d = tr.dashboard;

  const { data: summeryData, isLoading: summeryLoading } = useQuery("summery", () => getSummery("month"));
  const { data: dealsData, isLoading: dealsLoading } = useQuery("deals", getDeals);

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

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Quick Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">{d.title}</h1>
        </div>
        <div className="flex gap-2">
          <Link to="/customers/add">
            <Button variant="outline" size="sm" className="gap-1.5 bg-white dark:bg-transparent">
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{d.addContact}</span>
            </Button>
          </Link>
          <Link to="/deals/add">
            <Button size="sm" className="gap-1.5">
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{d.addDeal}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title={d.revenue} value={`${revenue.toLocaleString()} ${primaryCurrency}`} sub={`${d.lastPeriod}: ${prevRevenue.toLocaleString()} ${primaryCurrency}`} change={pct(revenue, prevRevenue)} icon={DollarSign} loading={summeryLoading} />
        <StatCard title={d.newContacts} value={String(newCustomers)} sub={`${d.lastPeriod}: ${prevCustomers}`} change={pct(newCustomers, prevCustomers)} icon={Users} loading={summeryLoading} />
        <StatCard title={d.outstanding} value={`${underCollection.toLocaleString()} ${primaryCurrency}`} sub={`${d.lastPeriod}: ${prevUnder.toLocaleString()} ${primaryCurrency}`} change={pct(underCollection, prevUnder)} icon={CreditCard} loading={summeryLoading} />
        <StatCard title={d.expenses} value={expenses.toLocaleString()} sub={`${d.lastPeriod}: ${prevExpenses.toLocaleString()}`} change={pct(expenses, prevExpenses)} icon={Activity} loading={summeryLoading} />
      </div>

      {/* Charts + Recent Deals */}
      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle>{d.revenueComparison}</CardTitle>
            <CardDescription>{d.revenueDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            {summeryLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : revenueChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-16">{d.noRevenue}</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={revenueChartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="currency" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => v.toLocaleString()} />
                  <Tooltip formatter={(v) => (typeof v === "number" ? v.toLocaleString() : "")} />
                  <Legend />
                  <Bar dataKey={d.recentDeals} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={d.lastPeriod} fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} opacity={0.4} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 shadow-sm">
          <CardHeader>
            <CardTitle>{d.recentDeals}</CardTitle>
            <CardDescription>{d.recentDealsDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            {dealsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : recentDeals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">{d.noDeals}</p>
            ) : (
              <ul className="space-y-3">
                {recentDeals.map((deal) => (
                  <li key={deal._id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <Link to={`/deals/${deal._id}`} className="text-sm font-medium hover:underline truncate block">
                        {deal.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {deal.customer?.name} · {format(new Date(deal.createdAt), "dd MMM")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={`text-xs capitalize ${STATUS_COLORS[deal.status] ?? ""}`}>
                        {deal.status}
                      </Badge>
                      <span className="text-xs font-medium whitespace-nowrap">
                        {deal.price?.toLocaleString()} {deal.currency}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/deals" className="mt-4 block text-xs text-center text-muted-foreground hover:underline">
              {d.viewAllDeals}
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Expense Breakdown */}
      {!summeryLoading && Object.keys(cur.expenses?.categories ?? {}).length > 0 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>{d.expenseBreakdown}</CardTitle>
            <CardDescription>{d.expenseBreakdownDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                layout="vertical"
                data={Object.entries(cur.expenses.categories).map(([cat, amount]) => ({ category: cat, amount }))}
                margin={{ top: 0, right: 16, bottom: 0, left: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(v) => v.toLocaleString()} />
                <YAxis type="category" dataKey="category" axisLine={false} tickLine={false} width={60} />
                <Tooltip formatter={(v) => (typeof v === "number" ? v.toLocaleString() : "")} />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
