import { Activity, CreditCard, DollarSign, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSummery } from "@/utils/api";
import { useQuery } from "react-query";
import LoadingSpinner from "@/components/common/spinner";

function calculatePercentageChange(current: number, previous: number) {
  if (!previous || previous === 0) {
    return current ? 100 : 0; // if previous is zero but current is not, return 100%
  }
  return ((current - previous) / previous) * 100;
}

export function Dashboard() {
  const { data, isLoading, error } = useQuery("summery", () =>
    getSummery("month")
  );
  console.log(data?.data);
  if (error) {
    return (
      <div className="flex justify-center items-start h-full w-full">
        Error loading data
      </div>
    );
  }

  const currentData = data?.data?.currentPeriod || {};
  const previousData = data?.data?.previousPeriod || {};

  const revenue = currentData.revenue?.EGP || 0;
  const previousRevenue = previousData.revenue?.EGP || 0;
  const revenueChange = calculatePercentageChange(revenue, previousRevenue);

  const newCustomers = currentData.newCustomers || 0;
  const previousCustomers = previousData.newCustomers || 0;
  const customersChange = calculatePercentageChange(
    newCustomers,
    previousCustomers
  );

  const underCollection = currentData.underCollection?.EGP || 0;
  const previousUnderCollection = previousData.underCollection?.EGP || 0;
  const underCollectionChange = calculatePercentageChange(
    underCollection,
    previousUnderCollection
  );

  const expenses = currentData.expenses?.total || 0;
  const previousExpenses = previousData.expenses?.total || 0;
  const expensesChange = calculatePercentageChange(expenses, previousExpenses);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <LoadingSpinner loading={isLoading} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Number(revenue).toLocaleString()} L.E{" "}
                {revenueChange >= 0 ? (
                  <span className="text-emerald-600 text-xs">
                    +{revenueChange.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-red-600 text-xs">
                    {revenueChange.toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Last month : {Number(previousRevenue).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {newCustomers}{" "}
                {customersChange >= 0 ? (
                  <span className="text-emerald-600 text-xs">
                    +{customersChange.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-red-600 text-xs">
                    {customersChange.toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                last month : {previousCustomers}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Under Collection
              </CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Number(underCollection).toLocaleString()} L.E{" "}
                {underCollectionChange >= 0 ? (
                  <span className="text-emerald-600 text-xs">
                    +{underCollectionChange.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-red-600 text-xs">
                    {underCollectionChange.toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                last month : {Number(previousUnderCollection).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expenses</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Number(expenses).toLocaleString()} L.E{" "}
                {expensesChange >= 0 ? (
                  <span className="text-emerald-600 text-xs">
                    +{expensesChange.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-red-600 text-xs">
                    {expensesChange.toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                last month : {Number(previousExpenses).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
