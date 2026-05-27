import { useState } from "react";
import { useQuery } from "react-query";
import { getLogs } from "@/utils/api";
import { LogEntry } from "@/types/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

const METHOD_COLORS: Record<string, string> = {
  GET:    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  POST:   "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  PUT:    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  PATCH:  "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function Logs() {
  const { tr } = useLanguage();
  const l = tr.logs;
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data, isLoading, error } = useQuery(
    ["logs", startDate, endDate],
    () => getLogs({ startDate: startDate || undefined, endDate: endDate || undefined }),
    { keepPreviousData: true }
  );

  const logs: LogEntry[] = Array.isArray(data?.data) ? data.data : [];

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>{l.title}</CardTitle>
          <CardDescription>{l.description}</CardDescription>
          <div className="flex gap-4 pt-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Label htmlFor="start" className="text-sm whitespace-nowrap">{l.from}</Label>
              <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 w-36" />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="end" className="text-sm whitespace-nowrap">{l.to}</Label>
              <Input id="end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 w-36" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!!error && <p className="px-6 pb-4 text-sm text-destructive">{l.errorLoading}</p>}

          {isLoading && (
            <div className="px-6 pb-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          )}

          {!isLoading && logs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-10">{l.noLogs}</p>
          )}

          {!isLoading && logs.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{l.user}</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{l.action}</TableHead>
                  <TableHead className="hidden md:table-cell text-xs font-semibold uppercase tracking-wide text-muted-foreground">{l.method}</TableHead>
                  <TableHead className="hidden lg:table-cell text-xs font-semibold uppercase tracking-wide text-muted-foreground">{l.endpoint}</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{l.timestamp}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log._id}>
                    <TableCell className="text-sm font-medium">
                      {log.userId?.name ?? (
                        <span className="text-muted-foreground italic">{l.deletedUser}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm capitalize">{log.action}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className={`text-xs ${METHOD_COLORS[log.method] ?? ""}`}>
                        {log.method}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground font-mono">
                      {log.endpoint}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(log.timestamp), "dd MMM yyyy, HH:mm")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
