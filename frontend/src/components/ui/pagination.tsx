import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  limit?: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}

export function Pagination({ page, pages, total, limit, onPageChange, onLimitChange }: PaginationProps) {
  const { tr } = useLanguage();

  if (pages <= 1 && !onLimitChange) return null;

  const getPageNumbers = () => {
    const delta = 2;
    const range: (number | "ellipsis")[] = [];
    const left = Math.max(2, page - delta);
    const right = Math.min(pages - 1, page + delta);

    range.push(1);
    if (left > 2) range.push("ellipsis");
    for (let i = left; i <= right; i++) range.push(i);
    if (right < pages - 1) range.push("ellipsis");
    if (pages > 1) range.push(pages);

    return range;
  };

  return (
    <div className="flex items-center justify-between px-2 py-3 border-t flex-wrap gap-2">
      <div className="flex items-center gap-3">
        <p className="text-xs text-muted-foreground">
          {tr.table.pageInfo(total, page, pages)}
        </p>
        {onLimitChange && limit !== undefined && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{tr.table.rows}</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="h-7 rounded border border-input bg-background px-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {getPageNumbers().map((p, i) =>
          p === "ellipsis" ? (
            <span key={`e-${i}`} className="px-1">
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="icon"
              className="h-8 w-8 text-xs"
              onClick={() => onPageChange(p as number)}
            >
              {p}
            </Button>
          )
        )}

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(page + 1)}
          disabled={page === pages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
