import { useMemo } from "react";
import type { ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosResponse } from "axios";
import { useToast } from "@/components/ui/use-toast";
import { GenericKanban, type KanbanColumn } from "@/components/common/GenericKanban";

interface BoardItem { _id: string; status?: string | null }

interface KanbanBoardPageProps<T extends BoardItem> {
  title: string;
  description?: string;
  queryKey: string;
  columns: KanbanColumn[];
  fetchAll: () => Promise<AxiosResponse>;
  updateStatus: (id: string, status: string) => Promise<unknown>;
  renderCard: (item: T) => ReactNode;
  emptyColumnLabel?: string;
  /** Compact controls rendered in the header (e.g. the list/board switch). */
  headerExtra?: ReactNode;
}

/**
 * Generic in-place Kanban board: header + drag-to-update-status board. Rendered
 * directly inside a list page (no navigation); the page owns the table/board
 * view state and passes the switch as `headerExtra`.
 */
export function KanbanBoardPage<T extends BoardItem>({
  title, description, queryKey, columns, fetchAll, updateStatus, renderCard, emptyColumnLabel, headerExtra,
}: KanbanBoardPageProps<T>) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isPending } = useQuery({ queryKey: [`${queryKey}-board`], queryFn: fetchAll });
  const items: T[] = useMemo(() => data?.data?.data ?? data?.data ?? [], [data]);

  const moveMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${queryKey}-board`] });
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
    onError: () => toast({ title: "Failed to move card.", variant: "destructive" }),
  });

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b bg-card shrink-0">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight truncate">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-0.5 truncate">{description}</p>}
        </div>
        {headerExtra && <div className="flex items-center gap-2 shrink-0">{headerExtra}</div>}
      </div>
      <div className="flex-1 min-h-0 p-4 md:p-6">
        <GenericKanban<T>
          items={items}
          columns={columns}
          groupBy={(i) => i.status ?? ""}
          getId={(i) => i._id}
          isLoading={isPending}
          onMove={(id, status) => moveMut.mutate({ id, status })}
          renderCard={renderCard}
          emptyColumnLabel={emptyColumnLabel}
        />
      </div>
    </div>
  );
}
