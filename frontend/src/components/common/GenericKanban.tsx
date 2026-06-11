import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KanbanColumn {
  key: string;
  label: string;
  /** CSS color for the column header band (defaults to a neutral slate). */
  color?: string;
}

export interface GenericKanbanProps<T> {
  items: T[];
  columns: KanbanColumn[];
  /** Column key an item belongs to — usually its status field. */
  groupBy: (item: T) => string;
  getId: (item: T) => string;
  renderCard: (item: T) => ReactNode;
  /** Fired when a card is dropped onto a different column. */
  onMove: (id: string, toColumn: string) => void;
  isLoading?: boolean;
  /** Optional aggregate rendered on the right of a column header (e.g. total value). */
  columnHeaderExtra?: (items: T[], column: KanbanColumn) => ReactNode;
  /** Optional per-column "add" button. */
  onAddTo?: (columnKey: string) => void;
  addLabel?: string;
  /** Drag ghost; defaults to renderCard. */
  renderOverlay?: (item: T) => ReactNode;
  emptyColumnLabel?: string;
}

const DEFAULT_COLOR = "#64748b";

/** Synthetic column that surfaces items whose status matches no configured
 *  column, so they stay visible (and draggable out) instead of disappearing. */
const UNMATCHED_COLUMN_KEY = "__kanban_unmatched__";

// ── Draggable card wrapper ──────────────────────────────────────────────────
// The whole card is the drag source. Mouse drags start after a 6px move (so
// clicks on inner links/buttons still work); touch drags require a short
// press-hold (see sensors below), which leaves normal swipe-to-scroll intact —
// hence no `touch-none` here, which would otherwise swallow board scrolling.
function DraggableCard({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn("cursor-grab active:cursor-grabbing outline-none", isDragging && "opacity-40")}
    >
      {children}
    </div>
  );
}

// ── Droppable column ────────────────────────────────────────────────────────
interface ColumnProps {
  column: KanbanColumn;
  cards: { id: string; node: ReactNode }[];
  isLoading?: boolean;
  headerExtra?: ReactNode;
  onAdd?: () => void;
  addLabel?: string;
  emptyLabel?: string;
}

function KanbanColumnView({ column, cards, isLoading, headerExtra, onAdd, addLabel, emptyLabel }: ColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: column.key });
  const color = column.color || DEFAULT_COLOR;

  return (
    <div className="flex-shrink-0 w-72 flex flex-col">
      {/* Header band */}
      <div className="rounded-t-xl px-3 py-2.5 flex items-center justify-between" style={{ background: color }}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-white font-semibold text-sm truncate">{column.label}</span>
          <span className="bg-white/25 text-white text-xs font-medium rounded-full px-2 py-0.5 shrink-0">
            {isLoading ? "…" : cards.length}
          </span>
        </div>
        {headerExtra && <div className="text-white/85 text-[11px] font-medium tabular-nums shrink-0">{headerExtra}</div>}
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 rounded-b-xl p-2 min-h-[300px] space-y-2 transition-colors",
          isOver ? "bg-primary/8 ring-2 ring-primary/30 ring-inset" : "bg-muted/30 dark:bg-muted/15",
        )}
      >
        {isLoading && Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}

        {!isLoading && cards.map((c) => (
          <DraggableCard key={c.id} id={c.id}>{c.node}</DraggableCard>
        ))}

        {!isLoading && cards.length === 0 && (
          <div className="flex flex-col items-center justify-center h-24 gap-1">
            <div className="h-2 w-2 rounded-full opacity-40" style={{ background: color }} />
            <p className="text-[11px] text-muted-foreground/60">{emptyLabel ?? "Empty"}</p>
          </div>
        )}

        {onAdd && (
          <button
            onClick={onAdd}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/50 transition-colors border border-dashed border-border/40 hover:border-border mt-1"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            {addLabel ?? "Add"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Board ───────────────────────────────────────────────────────────────────
export function GenericKanban<T>({
  items,
  columns,
  groupBy,
  getId,
  renderCard,
  onMove,
  isLoading,
  columnHeaderExtra,
  onAddTo,
  addLabel,
  renderOverlay,
  emptyColumnLabel,
}: GenericKanbanProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const { grouped, unmatched } = useMemo(() => {
    const map: Record<string, T[]> = {};
    for (const col of columns) map[col.key] = [];
    const extra: T[] = [];
    for (const item of items) {
      const k = groupBy(item);
      if (map[k]) map[k].push(item);
      else extra.push(item); // status matches no configured column
    }
    return { grouped: map, unmatched: extra };
  }, [items, columns, groupBy]);

  // Surface unmatched items in a trailing read-only column so a renamed/legacy
  // status never silently hides records from the board.
  const displayColumns = useMemo<KanbanColumn[]>(
    () =>
      unmatched.length
        ? [...columns, { key: UNMATCHED_COLUMN_KEY, label: "Other", color: "#94a3b8" }]
        : columns,
    [columns, unmatched.length],
  );

  // Mouse: drag after a small move (clicks still work). Touch: drag only after a
  // brief press-hold, so a swipe scrolls the board instead of dragging a card.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  );

  const activeItem = activeId ? items.find((i) => getId(i) === activeId) ?? null : null;

  const handleDragStart = ({ active }: DragStartEvent) => setActiveId(String(active.id));

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) return;
    const item = items.find((i) => getId(i) === String(active.id));
    if (!item) return;
    const target = String(over.id);
    if (columns.some((c) => c.key === target) && groupBy(item) !== target) {
      onMove(String(active.id), target);
    }
  };

  return (
    <div className="overflow-x-auto pb-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 min-w-max">
          {displayColumns.map((col) => {
            const colItems = col.key === UNMATCHED_COLUMN_KEY ? unmatched : grouped[col.key] ?? [];
            return (
              <KanbanColumnView
                key={col.key}
                column={col}
                cards={colItems.map((item) => ({ id: getId(item), node: renderCard(item) }))}
                isLoading={isLoading}
                headerExtra={columnHeaderExtra?.(colItems, col)}
                onAdd={onAddTo && col.key !== UNMATCHED_COLUMN_KEY ? () => onAddTo(col.key) : undefined}
                addLabel={addLabel}
                emptyLabel={emptyColumnLabel}
              />
            );
          })}
        </div>

        <DragOverlay dropAnimation={{ duration: 150, easing: "ease" }}>
          {activeItem ? (renderOverlay ?? renderCard)(activeItem) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
