import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { PlusCircle, Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { toast } from "@/components/ui/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { downloadCSV } from "@/utils/csv";

type DataItem = { _id: string; createdAt: string };

type GenericTableProps<T extends DataItem> = {
  queryKey: string;
  fetchData: () => Promise<{ data: T[] }>;
  deleteData: (id: string) => Promise<void>;
  headers: string[];
  renderRow: (item: T, handleDelete: (id: string) => void) => JSX.Element;
  title: string;
  description: string;
  addLink: string;
  addLabel: string;
  emptyMessage?: string;
  noSearchMessage?: (q: string) => string;
  exportConfig?: {
    filename: string;
    getRow: (item: T) => Record<string, unknown>;
  };
};

export function GenericTable<T extends DataItem>({
  queryKey,
  fetchData,
  deleteData,
  headers,
  renderRow,
  title,
  description,
  addLink,
  addLabel,
  emptyMessage,
  noSearchMessage,
  exportConfig,
}: GenericTableProps<T>) {
  const { tr } = useLanguage();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery(queryKey, fetchData);

  const mutation = useMutation(deleteData, {
    onSuccess: () => {
      queryClient.invalidateQueries(queryKey);
      toast({ title: tr.common.deleted });
    },
    onError: () => {
      toast({ title: tr.common.deleteFailed, variant: "destructive" });
    },
  });

  const handleDelete = (id: string) => setPendingDeleteId(id);
  const confirmDelete = () => {
    if (pendingDeleteId) {
      mutation.mutate(pendingDeleteId);
      setPendingDeleteId(null);
    }
  };

  if (error) {
    return (
      <div className="p-4 text-destructive text-sm">
        Error loading {title.toLowerCase()}.
      </div>
    );
  }

  const dataList: T[] = Array.isArray(data?.data) ? data.data : [];

  const filtered = search
    ? dataList.filter((item) =>
        Object.values(item).some(
          (v) => typeof v === "string" && v.toLowerCase().includes(search.toLowerCase())
        )
      )
    : dataList;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <ConfirmDialog
        open={!!pendingDeleteId}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={`${tr.common.search} ${title.toLowerCase()}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-8 h-9 bg-white dark:bg-muted/30"
          />
        </div>

        <div className="ms-auto flex items-center gap-2">
          {exportConfig && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 bg-white dark:bg-transparent"
              onClick={() =>
                downloadCSV(filtered.map(exportConfig.getRow), exportConfig.filename)
              }
              disabled={filtered.length === 0}
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tr.common.exportCsv}</span>
            </Button>
          )}
          <Link to={addLink}>
            <Button size="sm" className="h-9 gap-1.5">
              <PlusCircle className="h-3.5 w-3.5" />
              {addLabel}
            </Button>
          </Link>
        </div>
      </div>

      {/* Table card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {headers.map((header, i) => (
                  <TableHead
                    key={header}
                    className={[
                      "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                      i > 1 ? "hidden md:table-cell" : "",
                    ].join(" ")}
                  >
                    {header}
                  </TableHead>
                ))}
                <TableHead>
                  <span className="sr-only">{tr.common.actions}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {headers.map((h, hi) => (
                      <TableCell key={h} className={hi > 1 ? "hidden md:table-cell" : ""}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                    <TableCell>
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </TableCell>
                  </TableRow>
                ))}

              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={headers.length + 1}
                    className="text-center py-16 text-muted-foreground text-sm"
                  >
                    {search
                      ? (noSearchMessage ? noSearchMessage(search) : `${tr.common.noResults} "${search}"`)
                      : (emptyMessage ?? `No ${title.toLowerCase()} yet.`)}
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && filtered.map((item) => renderRow(item, handleDelete))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
