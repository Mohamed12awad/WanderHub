import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Trash2, Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  getUsers, getSavedViews, createSavedView, deleteSavedView, type ReportFilters, type SavedView,
} from "@/utils/api";
import { PeriodSelector, type PeriodPreset } from "@/components/common/PeriodSelector";

export interface ReportsState extends Required<Pick<ReportFilters, "groupBy">> {
  preset: PeriodPreset;
  startDate: string;
  endDate: string;
  ownerId?: string;
  status?: string;
  currency?: string;
}

/** Convert the bar's state into the API filter params for a report call. */
export function toReportFilters(s: ReportsState): ReportFilters {
  return {
    startDate: s.startDate,
    endDate: s.endDate,
    groupBy: s.groupBy,
    ownerId: s.ownerId,
    status: s.status,
    currency: s.currency,
  };
}

const ALL = "all";
const SAVED_MODULE = "reports";

interface Props {
  value: ReportsState;
  onChange: (next: ReportsState) => void;
  /** Status/stage options relevant to the active tab; hidden when omitted. */
  statusOptions?: { value: string; label: string }[];
  currencyOptions?: string[];
  /** Export the active tab's data to CSV. Disabled when omitted. */
  onExport?: () => void;
  /** Clear all filters back to defaults (current month). */
  onReset?: () => void;
  /** Serialize the full page state (incl. active tab) for a saved view. */
  serializeState: () => string;
  /** Apply a previously-saved serialized state. */
  applyState: (serialized: string) => void;
}

export function ReportsFilterBar({
  value, onChange, statusOptions, currencyOptions, onExport, onReset, serializeState, applyState,
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: usersData } = useQuery({ queryKey: ["users-all"], queryFn: () => getUsers() });
  const users: { _id: string; name: string }[] = usersData?.data?.data ?? usersData?.data ?? [];

  const { data: viewsData } = useQuery({ queryKey: ["saved-views", SAVED_MODULE], queryFn: () => getSavedViews(SAVED_MODULE) });
  const views: SavedView[] = viewsData?.data ?? [];

  const saveMut = useMutation({
    mutationFn: (name: string) => createSavedView({ module: SAVED_MODULE, name, query: serializeState() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["saved-views", SAVED_MODULE] }); toast({ title: "View saved." }); },
    onError: () => toast({ title: "Could not save view.", variant: "destructive" }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteSavedView(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["saved-views", SAVED_MODULE] }); toast({ title: "View deleted." }); },
  });

  const set = (patch: Partial<ReportsState>) => onChange({ ...value, ...patch });

  const handleSave = () => {
    const name = window.prompt("Name this view");
    if (name?.trim()) saveMut.mutate(name.trim());
  };

  return (
    <div className="flex flex-wrap items-end gap-2 mb-5 print:hidden">
      <PeriodSelector
        value={{ preset: value.preset, startDate: value.startDate, endDate: value.endDate }}
        onChange={(p) => set({ preset: p.preset, startDate: p.startDate, endDate: p.endDate })}
      />

      {/* Group-by */}
      <Select value={value.groupBy} onValueChange={(v) => set({ groupBy: v as ReportsState["groupBy"] })}>
        <SelectTrigger className="h-8 w-28 text-sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="month">Monthly</SelectItem>
          <SelectItem value="quarter">Quarterly</SelectItem>
          <SelectItem value="year">Yearly</SelectItem>
        </SelectContent>
      </Select>

      {/* Owner */}
      <Select value={value.ownerId ?? ALL} onValueChange={(v) => set({ ownerId: v === ALL ? undefined : v })}>
        <SelectTrigger className="h-8 w-40 text-sm"><SelectValue placeholder="All owners" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All owners</SelectItem>
          {users.map((u) => <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>)}
        </SelectContent>
      </Select>

      {/* Currency */}
      {currencyOptions && currencyOptions.length > 0 && (
        <Select value={value.currency ?? ALL} onValueChange={(v) => set({ currency: v === ALL ? undefined : v })}>
          <SelectTrigger className="h-8 w-28 text-sm"><SelectValue placeholder="All currencies" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All currencies</SelectItem>
            {currencyOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      {/* Status / stage (tab-specific) */}
      {statusOptions && statusOptions.length > 0 && (
        <Select value={value.status ?? ALL} onValueChange={(v) => set({ status: v === ALL ? undefined : v })}>
          <SelectTrigger className="h-8 w-36 text-sm"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {statusOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      <div className="flex items-center gap-2 ms-auto">
        {/* Saved views */}
        {views.length > 0 && (
          <Select value="" onValueChange={(id) => { const v = views.find((x) => x.id === id); if (v) applyState(v.query); }}>
            <SelectTrigger className="h-8 w-40 text-sm"><SelectValue placeholder="Saved views" /></SelectTrigger>
            <SelectContent>
              {views.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  <span className="flex items-center justify-between gap-2 w-full">
                    <span className="truncate">{v.name}</span>
                    <Trash2
                      className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteMut.mutate(v.id); }}
                    />
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button variant="outline" size="sm" className="h-8 gap-1" onClick={handleSave}>
          <Save className="h-3.5 w-3.5" />Save view
        </Button>
        {onReset && (
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground" onClick={onReset}>
            <RotateCcw className="h-3.5 w-3.5" />Reset
          </Button>
        )}
        <Button variant="outline" size="sm" className="h-8 gap-1" onClick={onExport} disabled={!onExport}>
          <Download className="h-3.5 w-3.5" />Export CSV
        </Button>
      </div>
    </div>
  );
}
