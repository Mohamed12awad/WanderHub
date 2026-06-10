import { ReactNode, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RecordTimeline } from "@/components/common/RecordTimeline";
import { NotesPanel } from "@/components/common/NotesPanel";
import { AttachmentsPanel } from "@/components/common/AttachmentsPanel";
import { ActivityList } from "@/components/Activities/ActivityList";
import { ActivityDialog } from "@/components/Activities/ActivityDialog";
import { getNotes } from "@/utils/api";

export interface ContextTab {
  value: string;
  label: string;
  content: ReactNode;
}

interface RecordContextPanelProps {
  linkedTo: string;
  linkedModel: string;
  /** Override the model used for attachments when it differs (e.g. "ExpenseReport"). */
  filesModel?: string;
  /** Approval chain — folded into the History tab as a filter, not a top-level tab. */
  approvalsContent?: ReactNode;
  /** Genuinely distinct entity sections (e.g. Quotes, Invoices, Emails, AI). */
  extraTabs?: ContextTab[];
  defaultTab?: string;
  showHistory?: boolean;
  showActivities?: boolean;
  showNotes?: boolean;
  showFiles?: boolean;
}

/**
 * Persistent right-side context panel shared by every detail page.
 *
 * Information architecture (not horizontal scrolling) keeps the tab row short:
 * the timestamped feeds — system Timeline, logged Activities and the Approval
 * chain — are merged into one **History** tab with internal pill filters.
 * **Notes** (manual collaboration) and **Files** stay separate, followed by any
 * entity-specific tabs passed in via `extraTabs`.
 */
export function RecordContextPanel({
  linkedTo,
  linkedModel,
  filesModel,
  approvalsContent,
  extraTabs = [],
  defaultTab = "history",
  showHistory = true,
  showActivities = true,
  showNotes = true,
  showFiles = true,
}: RecordContextPanelProps) {
  const model = linkedModel as any;

  const { data: notesData } = useQuery({
    queryKey: ["notes", linkedTo, linkedModel],
    queryFn: () => getNotes({ linkedTo, linkedModel }),
    enabled: !!linkedTo && showNotes,
  });
  const notesCount = (notesData?.data as any[])?.length ?? 0;

  // History sub-feed filter — All (timeline), Activities, Approvals.
  const feeds: { key: string; label: string }[] = [
    { key: "timeline", label: "All" },
    ...(showActivities ? [{ key: "activities", label: "Activities" }] : []),
    ...(approvalsContent ? [{ key: "approvals", label: "Approvals" }] : []),
  ];
  const [feed, setFeed] = useState(feeds[0]?.key ?? "timeline");

  return (
    <Card>
      <CardContent className="p-3">
        <Tabs defaultValue={defaultTab}>
          <TabsList className="mb-3 flex h-auto w-full justify-start gap-1 [&>button]:flex-1">
            {showHistory && <TabsTrigger value="history">History</TabsTrigger>}
            {showNotes && (
              <TabsTrigger value="notes">
                Notes{notesCount > 0 && ` (${notesCount})`}
              </TabsTrigger>
            )}
            {showFiles && <TabsTrigger value="files">Files</TabsTrigger>}
            {extraTabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {showHistory && (
            <TabsContent value="history">
              <div className="mb-3 flex items-center justify-between gap-2">
                {feeds.length > 1 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {feeds.map((opt) => (
                      <Button
                        key={opt.key}
                        type="button"
                        size="sm"
                        variant={feed === opt.key ? "secondary" : "ghost"}
                        className="h-7 rounded-full px-3 text-xs"
                        onClick={() => setFeed(opt.key)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                ) : <span />}
                {showActivities && <ActivityDialog linkedTo={linkedTo} linkedModel={model} />}
              </div>
              {feed === "timeline" && <RecordTimeline linkedTo={linkedTo} linkedModel={model} />}
              {feed === "activities" && <ActivityList linkedTo={linkedTo} linkedModel={model} hideHeader />}
              {feed === "approvals" && approvalsContent}
            </TabsContent>
          )}
          {showNotes && (
            <TabsContent value="notes">
              <NotesPanel linkedTo={linkedTo} linkedModel={model} />
            </TabsContent>
          )}
          {showFiles && (
            <TabsContent value="files">
              <AttachmentsPanel linkedModel={filesModel ?? linkedModel} linkedToId={linkedTo} />
            </TabsContent>
          )}
          {extraTabs.map((t) => (
            <TabsContent key={t.value} value={t.value}>
              {t.content}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
