import { useState } from "react";
import { useQuery } from "react-query";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, isToday,
  addMonths, subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAllActivities } from "@/utils/api";
import { Activity } from "@/types/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

const TYPE_COLORS: Record<string, string> = {
  call: "bg-blue-500",
  meeting: "bg-purple-500",
  task: "bg-yellow-500",
  note: "bg-slate-400",
  email: "bg-emerald-500",
};

const TYPE_EMOJIS: Record<string, string> = {
  call: "📞",
  meeting: "🤝",
  task: "✅",
  note: "📝",
  email: "📧",
};

export function ActivityCalendar() {
  const { tr } = useLanguage();
  const c = tr.calendar;

  const [current, setCurrent] = useState(new Date());
  const [selected, setSelected] = useState<Date | null>(null);

  const { data, isLoading } = useQuery(
    ["activities-calendar", current.getFullYear(), current.getMonth()],
    () => getAllActivities({ month: current.getMonth() + 1, year: current.getFullYear() }),
    { keepPreviousData: true }
  );

  const activities: Activity[] = Array.isArray(data?.data) ? data.data : [];

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const getActivitiesForDay = (day: Date) =>
    activities.filter((a) => isSameDay(new Date(a.date), day));

  const selectedActivities = selected ? getActivitiesForDay(selected) : [];

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">{c.title}</h1>
          <p className="text-sm text-muted-foreground">{format(current, "MMMM yyyy")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrent(subMonths(current, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrent(new Date())}>
            {c.today}
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrent(addMonths(current, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        {/* Calendar Grid */}
        <div className="rounded-xl border bg-white dark:bg-card overflow-hidden shadow-sm">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b bg-muted/30">
            {c.weekdays.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const dayActivities = isLoading ? [] : getActivitiesForDay(day);
              const isSelected = selected ? isSameDay(day, selected) : false;
              const inMonth = isSameMonth(day, current);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelected(isSelected ? null : day)}
                  className={cn(
                    "min-h-[68px] p-1.5 text-left border-b border-e transition-colors hover:bg-muted/40",
                    !inMonth && "bg-muted/10",
                    isSelected && "bg-primary/5 ring-2 ring-inset ring-primary"
                  )}
                >
                  <span className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                    isToday(day) && "bg-primary text-primary-foreground",
                    !inMonth && "text-muted-foreground/50"
                  )}>
                    {format(day, "d")}
                  </span>
                  <div className="mt-1 flex flex-col gap-0.5">
                    {dayActivities.slice(0, 2).map((a) => (
                      <div key={a._id} className={cn("truncate rounded px-1 py-0.5 text-[10px] text-white leading-tight", TYPE_COLORS[a.type] ?? "bg-slate-400")}>
                        {TYPE_EMOJIS[a.type]} {a.title}
                      </div>
                    ))}
                    {dayActivities.length > 2 && (
                      <span className="text-[10px] text-muted-foreground ps-1">
                        +{dayActivities.length - 2}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <div className="rounded-xl border bg-white dark:bg-card p-4 shadow-sm h-fit">
          {selected ? (
            <>
              <h2 className="font-semibold mb-3 text-sm">{format(selected, "EEEE, MMMM d")}</h2>
              {selectedActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground">{c.noActivities}</p>
              ) : (
                <ul className="space-y-2">
                  {selectedActivities.map((a) => (
                    <li key={a._id} className="border rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium leading-tight">
                          {TYPE_EMOJIS[a.type]} {a.title}
                        </span>
                        <Badge variant="outline" className={cn("text-[10px] capitalize shrink-0", a.status === "completed" ? "border-emerald-500 text-emerald-600" : "border-yellow-500 text-yellow-600")}>
                          {a.status}
                        </Badge>
                      </div>
                      {a.description && (
                        <p className="text-xs text-muted-foreground">{a.description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">{c.clickDay}</p>
          )}

          {/* Legend */}
          <div className="mt-6 pt-4 border-t space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground mb-2">{c.legend}</p>
            {Object.keys(TYPE_COLORS).map((type) => (
              <div key={type} className="flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", TYPE_COLORS[type])} />
                <span className="text-xs">{TYPE_EMOJIS[type]} {c.types[type] ?? type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
